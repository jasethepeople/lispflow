package fixtures

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/your-org/lispflow/internal/repository"
	"github.com/your-org/lispflow/pkg/billing"
)

// TestDB wraps a test database instance.
type TestDB struct {
	Pool *pgxpool.Pool
	DSN  string
}

// NewTestDB creates a test database connection.
func NewTestDB(dsn string) (*TestDB, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to test DB: %w", err)
	}

	// Verify connection
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping test DB: %w", err)
	}

	return &TestDB{Pool: pool, DSN: dsn}, nil
}

// Cleanup truncates all tables.
func (db *TestDB) Cleanup(ctx context.Context) error {
	_, err := db.Pool.Exec(ctx, `
		TRUNCATE TABLE billing_ledger, pricing_plans, usage_events, webhook_deliveries RESTART IDENTITY CASCADE
	`)
	return err
}

// Close closes the pool.
func (db *TestDB) Close() {
	db.Pool.Close()
}

// SamplePlans returns test pricing plans.
func SamplePlans() map[string]string {
	return map[string]string{
		"simple_volume": `(volume (usage "requests") 0.01)`,

		"tiered_compute": `(tiered (usage "compute_units") '((0 100 0.05) (100 500 0.04) (500 nil 0.03)))`,

		"multi_dimension": `(+ (tiered (usage "compute_units") '((0 100 0.05) (100 500 0.04) (500 nil 0.03))) (overage (usage "storage_gb") 1000 0.02) (volume (usage "egress_gb") 0.12))`,

		"with_min_max": `(max-cap (min-charge (+ (volume (usage "requests") 0.01)) 10.0) 500.0)`,

		"conditional_discount": `(+ (volume (usage "compute_units") 0.05) (when-usage (> (usage "compute_units") 200) (discount (volume (usage "compute_units") 0.05) 10) 0))`,

		"complex_saas": `(max-cap (min-charge (+ (tiered (usage "compute_units") '((0 100 0.05) (100 500 0.04) (500 nil 0.03))) (overage (usage "storage_gb") 1000 0.02) (volume (usage "egress_gb") 0.12) (when-usage (> (usage "compute_units") 200) (discount (volume (usage "compute_units") 0.01) 10) 0)) 10.0) 500.0)`,
	}
}

// SampleUsage returns test usage events.
func SampleUsage() map[string]map[string]float64 {
	return map[string]map[string]float64{
		"low": {
			"compute_units": 50,
			"storage_gb":    500,
			"egress_gb":     20,
			"requests":      1000,
		},
		"medium": {
			"compute_units": 250,
			"storage_gb":    1500,
			"egress_gb":     80,
			"requests":      50000,
		},
		"high": {
			"compute_units": 600,
			"storage_gb":    3000,
			"egress_gb":     200,
			"requests":      200000,
		},
		"edge_missing_key": {
			"compute_units": 150,
			// storage_gb missing — should default to 0
			"egress_gb": 50,
		},
	}
}

// ExpectedCosts returns expected costs for validation.
func ExpectedCosts() map[string]map[string]float64 {
	return map[string]map[string]float64{
		"simple_volume": {
			"low":    10.0,   // 1000 * 0.01
			"medium": 500.0,  // 50000 * 0.01
			"high":   2000.0, // 200000 * 0.01
		},
		"tiered_compute": {
			"low":    2.5,   // 50 * 0.05
			"medium": 11.0,  // 100*0.05 + 150*0.04
			"high":   23.0,  // 100*0.05 + 400*0.04 + 100*0.03
		},
		"multi_dimension": {
			"low":    10.9,  // 2.5 + 0 + 2.4
			"medium": 27.6,  // 11 + 10 + 9.6
			"high":   59.0,  // 23 + 40 + 24
		},
	}
}

// CreateTestPlan creates a plan in the database for testing.
func CreateTestPlan(ctx context.Context, repo *repository.PlanRepository, customerID, planExpr string) (*billing.Plan, error) {
	plan, err := repo.ActivatePlan(ctx, customerID, planExpr, map[string]string{"test": "true"})
	if err != nil {
		return nil, err
	}
	return plan, nil
}
