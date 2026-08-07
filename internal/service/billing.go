package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/your-org/lispflow/internal/repository"
	"github.com/your-org/lispflow/internal/webhook"
	"github.com/your-org/lispflow/pkg/billing"
	"go.uber.org/zap"
)

var (
	billingCounter = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "lispflow_billing_events_total",
		Help: "Total billing events processed",
	}, []string{"status"})

	billingLatency = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "lispflow_billing_latency_seconds",
		Help:    "Billing processing latency",
		Buckets: prometheus.ExponentialBuckets(0.001, 2, 15),
	})
)

// BillingService orchestrates pricing evaluation and ledger recording.
type BillingService struct {
	engine      *billing.BillingEngine
	pool        *pgxpool.Pool
	planRepo    *repository.PlanRepository
	ledgerRepo  *repository.LedgerRepository
	webhookSvc  *webhook.Service
	logger      *zap.Logger
}

// NewBillingService creates a new billing service.
func NewBillingService(
	engine *billing.BillingEngine,
	pool *pgxpool.Pool,
	planRepo *repository.PlanRepository,
	ledgerRepo *repository.LedgerRepository,
	webhookSvc *webhook.Service,
	logger *zap.Logger,
) *BillingService {
	return &BillingService{
		engine:     engine,
		pool:       pool,
		planRepo:   planRepo,
		ledgerRepo: ledgerRepo,
		webhookSvc: webhookSvc,
		logger:     logger,
	}
}

// EvaluateAndRecord atomically evaluates pricing and records to ledger.
func (s *BillingService) EvaluateAndRecord(ctx context.Context, customerID string, usage map[string]float64, periodStart, periodEnd time.Time) (*billing.LedgerEntry, error) {
	start := time.Now()
	defer billingLatency.Observe(time.Since(start).Seconds())

	// Get active plan from DB
	plan, err := s.planRepo.GetActivePlan(ctx, customerID)
	if err != nil {
		billingCounter.WithLabelValues("plan_not_found").Inc()
		return nil, fmt.Errorf("no active plan for customer %s: %w", customerID, err)
	}

	// Ensure plan is loaded in engine
	s.engine.LoadPlan(customerID, plan.PlanExpr)

	// Evaluate pricing
	evalStart := time.Now()
	cost, currency, err := s.engine.EvaluatePricing(ctx, customerID, usage)
	if err != nil {
		billingCounter.WithLabelValues("eval_error").Inc()
		return nil, fmt.Errorf("pricing evaluation failed: %w", err)
	}
	evalDuration := time.Since(evalStart).Milliseconds()

	// Record in transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	entry := &billing.LedgerEntry{
		ID:          uuid.New(),
		CustomerID:  customerID,
		PlanID:      plan.ID,
		PlanExpr:    plan.PlanExpr,
		UsageData:   usage,
		Cost:        cost,
		Currency:    currency,
		PeriodStart: periodStart,
		PeriodEnd:   periodEnd,
		CreatedAt:   time.Now().UTC(),
		EvaluatedAt: time.Now().UTC(),
		EvalDurationMs: evalDuration,
	}

	if err := s.ledgerRepo.CreateEntry(ctx, tx, entry); err != nil {
		return nil, fmt.Errorf("ledger insert failed: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("transaction commit failed: %w", err)
	}

	billingCounter.WithLabelValues("success").Inc()

	// Async webhook notification
	if s.webhookSvc != nil {
		s.webhookSvc.Enqueue(&billing.WebhookPayload{
			EventType:  "billing.evaluated",
			CustomerID: customerID,
			Timestamp:  time.Now().UTC(),
			Data:       entry,
		})
	}

	s.logger.Info("billing evaluated and recorded",
		zap.String("customer_id", customerID),
		zap.Float64("cost", cost),
		zap.String("currency", currency),
		zap.Int64("eval_ms", evalDuration),
	)

	return entry, nil
}

// ProcessBatch evaluates and records multiple usage events.
func (s *BillingService) ProcessBatch(ctx context.Context, events []billing.UsageEvent, periodStart, periodEnd time.Time) ([]*billing.LedgerEntry, error) {
	entries := make([]*billing.LedgerEntry, 0, len(events))

	for _, event := range events {
		entry, err := s.EvaluateAndRecord(ctx, event.CustomerID, event.Dimensions, periodStart, periodEnd)
		if err != nil {
			s.logger.Error("batch processing error",
				zap.String("customer_id", event.CustomerID),
				zap.Error(err),
			)
			continue
		}
		entries = append(entries, entry)
	}

	return entries, nil
}

// SimulatePlan runs a simulation and returns detailed results.
func (s *BillingService) SimulatePlan(ctx context.Context, customerID string, proposedPlan string, history []map[string]float64) (*billing.SimulationResult, error) {
	// Validate plan first
	if err := s.engine.ValidatePlan(proposedPlan); err != nil {
		return nil, fmt.Errorf("invalid plan: %w", err)
	}

	result, err := s.engine.SimulatePlan(ctx, proposedPlan, history)
	if err != nil {
		return nil, fmt.Errorf("simulation failed: %w", err)
	}

	s.logger.Info("simulation completed",
		zap.String("customer_id", customerID),
		zap.Int("periods", result.Periods),
		zap.Float64("total_cost", result.TotalCost),
		zap.Int64("duration_ms", result.DurationMs),
	)

	return result, nil
}

// GetCustomerHistory retrieves billing history with pagination.
func (s *BillingService) GetCustomerHistory(ctx context.Context, customerID string, limit, offset int) ([]billing.LedgerEntry, error) {
	return s.ledgerRepo.GetCustomerHistory(ctx, customerID, limit, offset)
}

// GetCustomerPlanHistory retrieves plan history.
func (s *BillingService) GetCustomerPlanHistory(ctx context.Context, customerID string) ([]billing.Plan, error) {
	return s.planRepo.GetPlanHistory(ctx, customerID)
}

// ActivatePlan creates and activates a new plan for a customer.
func (s *BillingService) ActivatePlan(ctx context.Context, customerID string, planExpr string, metadata map[string]string) (*billing.Plan, error) {
	// Validate before storing
	if err := s.engine.ValidatePlan(planExpr); err != nil {
		return nil, fmt.Errorf("invalid plan expression: %w", err)
	}

	plan, err := s.planRepo.ActivatePlan(ctx, customerID, planExpr, metadata)
	if err != nil {
		return nil, fmt.Errorf("failed to activate plan: %w", err)
	}

	// Load into engine memory
	s.engine.LoadPlan(customerID, planExpr)

	s.logger.Info("plan activated",
		zap.String("customer_id", customerID),
		zap.String("plan_id", plan.ID.String()),
	)

	return plan, nil
}
