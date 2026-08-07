package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/your-org/lispflow/pkg/billing"
)

// PlanRepository handles plan persistence.
type PlanRepository struct {
	pool *pgxpool.Pool
}

// NewPlanRepository creates a new plan repository.
func NewPlanRepository(pool *pgxpool.Pool) *PlanRepository {
	return &PlanRepository{pool: pool}
}

// CreatePlan inserts a new pricing plan.
func (r *PlanRepository) CreatePlan(ctx context.Context, plan *billing.Plan) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO pricing_plans (id, customer_id, plan_expr, is_active, created_at, activated_at, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, plan.ID, plan.CustomerID, plan.PlanExpr, plan.IsActive, plan.CreatedAt, plan.ActivatedAt, plan.Metadata)
	return err
}

// GetActivePlan retrieves the active plan for a customer.
func (r *PlanRepository) GetActivePlan(ctx context.Context, customerID string) (*billing.Plan, error) {
	var plan billing.Plan
	err := r.pool.QueryRow(ctx, `
		SELECT id, customer_id, plan_expr, is_active, created_at, activated_at, metadata
		FROM pricing_plans
		WHERE customer_id = $1 AND is_active = true
		ORDER BY activated_at DESC
		LIMIT 1
	`, customerID).Scan(&plan.ID, &plan.CustomerID, &plan.PlanExpr, &plan.IsActive, &plan.CreatedAt, &plan.ActivatedAt, &plan.Metadata)
	if err != nil {
		return nil, err
	}
	return &plan, nil
}

// GetPlanHistory retrieves all plans for a customer.
func (r *PlanRepository) GetPlanHistory(ctx context.Context, customerID string) ([]billing.Plan, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, customer_id, plan_expr, is_active, created_at, activated_at, metadata
		FROM pricing_plans
		WHERE customer_id = $1
		ORDER BY created_at DESC
	`, customerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []billing.Plan
	for rows.Next() {
		var p billing.Plan
		err := rows.Scan(&p.ID, &p.CustomerID, &p.PlanExpr, &p.IsActive, &p.CreatedAt, &p.ActivatedAt, &p.Metadata)
		if err != nil {
			return nil, err
		}
		plans = append(plans, p)
	}
	return plans, nil
}

// ActivatePlan atomically deactivates old plan and activates new one.
func (r *PlanRepository) ActivatePlan(ctx context.Context, customerID string, planExpr string, metadata map[string]string) (*billing.Plan, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Deactivate current plan
	_, err = tx.Exec(ctx, `
		UPDATE pricing_plans SET is_active = false 
		WHERE customer_id = $1 AND is_active = true
	`, customerID)
	if err != nil {
		return nil, err
	}

	// Insert new plan
	now := time.Now().UTC()
	plan := &billing.Plan{
		ID:          uuid.New(),
		CustomerID:  customerID,
		PlanExpr:    planExpr,
		IsActive:    true,
		CreatedAt:   now,
		ActivatedAt: &now,
		Metadata:    metadata,
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO pricing_plans (id, customer_id, plan_expr, is_active, created_at, activated_at, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, plan.ID, plan.CustomerID, plan.PlanExpr, plan.IsActive, plan.CreatedAt, plan.ActivatedAt, plan.Metadata)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return plan, nil
}

// LedgerRepository handles ledger persistence.
type LedgerRepository struct {
	pool *pgxpool.Pool
}

// NewLedgerRepository creates a new ledger repository.
func NewLedgerRepository(pool *pgxpool.Pool) *LedgerRepository {
	return &LedgerRepository{pool: pool}
}

// CreateEntry inserts a ledger entry within a transaction.
func (r *LedgerRepository) CreateEntry(ctx context.Context, tx pgx.Tx, entry *billing.LedgerEntry) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO billing_ledger 
		(id, customer_id, plan_id, plan_expr, usage_data, cost, currency, period_start, period_end, created_at, evaluated_at, eval_duration_ms)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`, entry.ID, entry.CustomerID, entry.PlanID, entry.PlanExpr, entry.UsageData,
		entry.Cost, entry.Currency, entry.PeriodStart, entry.PeriodEnd, entry.CreatedAt, entry.EvaluatedAt, entry.EvalDurationMs)
	return err
}

// GetCustomerHistory retrieves all ledger entries for a customer.
func (r *LedgerRepository) GetCustomerHistory(ctx context.Context, customerID string, limit, offset int) ([]billing.LedgerEntry, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, customer_id, plan_id, plan_expr, usage_data, cost, currency, period_start, period_end, created_at, evaluated_at, eval_duration_ms
		FROM billing_ledger
		WHERE customer_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, customerID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []billing.LedgerEntry
	for rows.Next() {
		var e billing.LedgerEntry
		err := rows.Scan(&e.ID, &e.CustomerID, &e.PlanID, &e.PlanExpr, &e.UsageData, &e.Cost, &e.Currency,
			&e.PeriodStart, &e.PeriodEnd, &e.CreatedAt, &e.EvaluatedAt, &e.EvalDurationMs)
		if err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}

// GetPeriodSummary aggregates costs for a billing period.
func (r *LedgerRepository) GetPeriodSummary(ctx context.Context, customerID string, start, end time.Time) (*billing.BillingPeriod, error) {
	var period billing.BillingPeriod
	var totalCost float64

	err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(cost), 0)
		FROM billing_ledger
		WHERE customer_id = $1 AND period_start >= $2 AND period_end <= $3
	`, customerID, start, end).Scan(&totalCost)
	if err != nil {
		return nil, err
	}

	period.CustomerID = customerID
	period.Start = start
	period.End = end
	period.ComputedCost = totalCost
	period.Status = "closed"

	return &period, nil
}
