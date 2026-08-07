package billing

import (
	"fmt"
	"sync"

	"github.com/glycerine/zygomys/zygo"
)

// BillingEngine holds a pool of interpreters for thread-safe evaluation.
// The prototype environment contains all registered billing primitives.
type BillingEngine struct {
	mu      sync.RWMutex
	env     *zygo.Glisp          // prototype environment with billing primitives
	plans   map[string]string    // customerID -> Lisp pricing expression
	sandbox bool
}

// NewBillingEngine initialises the interpreter sandbox and registers all billing functions.
func NewBillingEngine() *BillingEngine {
	env := zygo.NewGlisp()
	env.StandardSetup()          // load base Lisp
	disableDangerous(env)        // remove I/O, exec, etc.

	// Register Go functions as Lisp primitives
	registerBillingFunctions(env)

	return &BillingEngine{
		env:     env,
		plans:   make(map[string]string),
		sandbox: true,
	}
}

// LoadPlan stores a new Lisp pricing expression for a customer.
// Hot-reloads in memory; no database migrations, no code redeploy.
func (be *BillingEngine) LoadPlan(customerID, planSexp string) {
	be.mu.Lock()
	defer be.mu.Unlock()
	be.plans[customerID] = planSexp
}

// GetPlan retrieves the current pricing expression for a customer.
func (be *BillingEngine) GetPlan(customerID string) (string, bool) {
	be.mu.RLock()
	defer be.mu.RUnlock()
	plan, ok := be.plans[customerID]
	return plan, ok
}

// EvaluatePricing takes a usage map and returns the total cost.
// This can be called inside a pgx transaction to atomically write the ledger.
func (be *BillingEngine) EvaluatePricing(customerID string, usage map[string]float64) (float64, error) {
	be.mu.RLock()
	plan, ok := be.plans[customerID]
	be.mu.RUnlock()
	if !ok {
		return 0, fmt.Errorf("no plan for customer %s", customerID)
	}

	// Fresh interpreter copy to ensure no state leaks between evaluations.
	env := be.env.Duplicate()

	// Build a Lisp hash from the usage map and bind it to *usage*
	usageHash := zygo.NewSexpHash()
	for k, v := range usage {
		usageHash.HashSet(k, zygo.NewSexpFloat(v))
	}
	env.SetGlobal("*usage*", usageHash)

	// Parse and evaluate the plan expression
	expr, err := env.Parse(plan)
	if err != nil {
		return 0, fmt.Errorf("plan parse error: %w", err)
	}
	res, err := env.Eval(expr)
	if err != nil {
		return 0, fmt.Errorf("plan eval error: %w", err)
	}

	cost, err := zygo.DecodeFloat64(res)
	if err != nil {
		return 0, fmt.Errorf("plan did not return a number: %v", res)
	}
	return cost, nil
}

// SimulatePlan runs historical usage data through a proposed plan without affecting live pricing.
func (be *BillingEngine) SimulatePlan(proposedPlan string, history []map[string]float64) ([]float64, error) {
	be.mu.Lock()
	// temporarily override plan for a dummy customer
	be.plans["__sim__"] = proposedPlan
	be.mu.Unlock()
	defer func() {
		be.mu.Lock()
		delete(be.plans, "__sim__")
		be.mu.Unlock()
	}()

	costs := make([]float64, len(history))
	for i, usage := range history {
		c, err := be.EvaluatePricing("__sim__", usage)
		if err != nil {
			return nil, fmt.Errorf("simulation at point %d: %w", i, err)
		}
		costs[i] = c
	}
	return costs, nil
}
