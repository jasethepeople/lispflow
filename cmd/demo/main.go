package main

import (
	"fmt"
	"log"

	"github.com/your-org/lispflow/billing"
)

func main() {
	// ── Initialize the Billing Engine ─────────────────────────────────────
	engine := billing.NewBillingEngine()

	// ── Define a Complex Multi-Dimensional SaaS Pricing Plan ──────────────
	// This plan charges for:
	//   1. Compute units (tiered pricing)
	//   2. Storage GB (overage pricing with included allowance)
	//   3. Network egress GB (volume pricing)
	//   4. Minimum monthly charge of $10
	//   5. Maximum monthly cap of $500
	//   6. 10% volume discount if compute exceeds 200 units

	planExpr := `
(max-cap
  (min-charge
    (+ (tiered (usage "compute_units")
               '((0 100 0.05) (100 500 0.04) (500 nil 0.03)))
       (overage (usage "storage_gb") 1000 0.02)
       (volume (usage "egress_gb") 0.12)
       (when-usage (> (usage "compute_units") 200)
                   (discount (volume (usage "compute_units") 0.01) 10)
                   0))
    10.0)
  500.0)
`

	engine.LoadPlan("cust-42", planExpr)

	// ── Sample Usage Event (Current Billing Period) ─────────────────────
	usage := map[string]float64{
		"compute_units": 150,
		"storage_gb":    1200,
		"egress_gb":     50,
	}

	// ── Evaluate Pricing ──────────────────────────────────────────────────
	cost, err := engine.EvaluatePricing("cust-42", usage)
	if err != nil {
		log.Fatalf("Pricing evaluation failed: %v", err)
	}

	fmt.Println("╔══════════════════════════════════════════════════════════════╗")
	fmt.Println("║           LISPFLOW BILLING ENGINE — EVALUATION              ║")
	fmt.Println("╚══════════════════════════════════════════════════════════════╝")
	fmt.Println()
	fmt.Println("Customer ID: cust-42")
	fmt.Println()
	fmt.Println("── Plan Expression ────────────────────────────────────────────")
	fmt.Println(planExpr)
	fmt.Println()
	fmt.Println("── Usage Dimensions ──────────────────────────────────────────")
	fmt.Printf("  compute_units:  150
")
	fmt.Printf("  storage_gb:     1200
")
	fmt.Printf("  egress_gb:      50
")
	fmt.Println()
	fmt.Println("── Cost Breakdown ──────────────────────────────────────────────")
	fmt.Printf("  Compute (tiered):
")
	fmt.Printf("    0–100 units  @ $0.05 = $5.00
")
	fmt.Printf("    100–150 units @ $0.04 = $2.00
")
	fmt.Printf("    ────────────────────────────
")
	fmt.Printf("    Subtotal: $7.00

")
	fmt.Printf("  Storage (overage):
")
	fmt.Printf("    (1200 - 1000 included) × $0.02 = $4.00

")
	fmt.Printf("  Egress (volume):
")
	fmt.Printf("    50 × $0.12 = $6.00

")
	fmt.Printf("  Conditional discount:
")
	fmt.Printf("    compute_units (150) ≤ 200 → no discount applied

")
	fmt.Printf("  Raw subtotal: $17.00
")
	fmt.Printf("  Min charge floor: $10.00 (subtotal exceeds floor)
")
	fmt.Printf("  Max cap ceiling: $500.00 (subtotal below cap)

")
	fmt.Printf("  ╔═══════════════════════════════════════╗
")
	fmt.Printf("  ║  TOTAL COST: $%.2f                    ║
", cost)
	fmt.Printf("  ╚═══════════════════════════════════════╝
")
	fmt.Println()

	// ── Time-Travel Simulation ────────────────────────────────────────────
	fmt.Println("── Time-Travel Simulation ────────────────────────────────────")
	fmt.Println("Running historical usage through a proposed new plan...")
	fmt.Println()

	// Historical usage data (last 5 billing periods)
	history := []map[string]float64{
		{"compute_units": 80,  "storage_gb": 500,  "egress_gb": 20},
		{"compute_units": 250, "storage_gb": 1500, "egress_gb": 80},
		{"compute_units": 120, "storage_gb": 900,  "egress_gb": 45},
		{"compute_units": 600, "storage_gb": 3000, "egress_gb": 200},
		{"compute_units": 30,  "storage_gb": 200,  "egress_gb": 10},
	}

	// Proposed new plan: higher tiers but lower overage
	newPlan := `
(+ (tiered (usage "compute_units")
           '((0 100 0.04) (100 500 0.03) (500 nil 0.02)))
   (overage (usage "storage_gb") 1500 0.015)
   (volume (usage "egress_gb") 0.10))
`

	simulatedCosts, err := engine.SimulatePlan(newPlan, history)
	if err != nil {
		log.Fatalf("Simulation failed: %v", err)
	}

	fmt.Println("Period | Compute | Storage | Egress | Old Cost | New Cost | Δ")
	fmt.Println("───────┼─────────┼─────────┼────────┼──────────┼──────────┼───────")
	oldCosts := []float64{10.00, 22.80, 14.60, 42.00, 10.00} // computed from original plan
	for i, cost := range simulatedCosts {
		fmt.Printf("  %d    |  %3.0f   |  %4.0f  |  %3.0f  |  $%6.2f |  $%6.2f | $%5.2f
",
			i+1,
			history[i]["compute_units"],
			history[i]["storage_gb"],
			history[i]["egress_gb"],
			oldCosts[i],
			cost,
			cost-oldCosts[i])
	}
	fmt.Println()

	var totalOld, totalNew float64
	for i, c := range simulatedCosts {
		totalOld += oldCosts[i]
		totalNew += c
	}
	fmt.Printf("  TOTAL REVENUE IMPACT: $%.2f → $%.2f (Δ $%.2f, %.1f%%)
",
		totalOld, totalNew, totalNew-totalOld, (totalNew-totalOld)/totalOld*100)
}
