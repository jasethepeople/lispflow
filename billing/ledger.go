package billing

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// LedgerEntry represents a single billing transaction recorded in the database.
type LedgerEntry struct {
	ID         string    `json:"id"`
	CustomerID string    `json:"customer_id"`
	PlanExpr   string    `json:"plan_expr"`
	UsageData  map[string]float64 `json:"usage_data"`
	Cost       float64   `json:"cost"`
	Currency   string    `json:"currency"`
	PeriodStart time.Time `json:"period_start"`
	PeriodEnd   time.Time `json:"period_end"`
	CreatedAt   time.Time `json:"created_at"`
}

// Ledger handles atomic recording of billing computations.
type Ledger struct {
	pool *pgxpool.Pool
}

// NewLedger creates a new ledger backed by PostgreSQL.
func NewLedger(pool *pgxpool.Pool) *Ledger {
	return &Ledger{pool: pool}
}

// RecordBilling atomically evaluates pricing and writes to the ledger within a transaction.
func (l *Ledger) RecordBilling(ctx context.Context, engine *BillingEngine, entry *LedgerEntry) error {
	return l.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable}).
		CommitInChain(func(tx pgx.Tx) error {
			// 1. Evaluate pricing inside the transaction
			cost, err := engine.EvaluatePricing(entry.CustomerID, entry.UsageData)
			if err != nil {
				return fmt.Errorf("pricing evaluation failed: %w", err)
			}
			entry.Cost = cost
			entry.CreatedAt = time.Now().UTC()

			// 2. Insert into ledger table
			_, err = tx.Exec(ctx, `
				INSERT INTO billing_ledger 
				(id, customer_id, plan_expr, usage_data, cost, currency, period_start, period_end, created_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			`, entry.ID, entry.CustomerID, entry.PlanExpr, entry.UsageData,
				entry.Cost, entry.Currency, entry.PeriodStart, entry.PeriodEnd, entry.CreatedAt)
			if err != nil {
				return fmt.Errorf("ledger insert failed: %w", err)
			}
			return nil
		})
}

// GetCustomerHistory retrieves all ledger entries for a customer.
func (l *Ledger) GetCustomerHistory(ctx context.Context, customerID string) ([]LedgerEntry, error) {
	rows, err := l.pool.Query(ctx, `
		SELECT id, customer_id, plan_expr, usage_data, cost, currency, period_start, period_end, created_at
		FROM billing_ledger
		WHERE customer_id = $1
		ORDER BY created_at DESC
	`, customerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []LedgerEntry
	for rows.Next() {
		var e LedgerEntry
		err := rows.Scan(&e.ID, &e.CustomerID, &e.PlanExpr, &e.UsageData, &e.Cost, &e.Currency,
			&e.PeriodStart, &e.PeriodEnd, &e.CreatedAt)
		if err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}
