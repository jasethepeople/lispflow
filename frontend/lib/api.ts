import { Plan, LedgerEntry, SimulationResult, Customer } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const API = {
  // Plans
  getPlans: (customerId: string) =>
    fetchAPI<{ plans: Plan[] }>(`/customers/${customerId}/plans`),

  getActivePlan: (customerId: string) =>
    fetchAPI<Plan>(`/customers/${customerId}/plans/active`),

  createPlan: (customerId: string, planExpr: string, metadata?: Record<string, string>) =>
    fetchAPI<Plan>(`/customers/${customerId}/plans`, {
      method: "POST",
      body: JSON.stringify({ plan_expr: planExpr, metadata }),
    }),

  // Billing
  evaluate: (customerId: string, usage: Record<string, number>) =>
    fetchAPI<LedgerEntry>(`/customers/${customerId}/evaluate`, {
      method: "POST",
      body: JSON.stringify({ usage }),
    }),

  getHistory: (customerId: string, limit = 50, offset = 0) =>
    fetchAPI<{ entries: LedgerEntry[] }>(`/customers/${customerId}/history?limit=${limit}&offset=${offset}`),

  // Simulation
  simulate: (customerId: string, proposedPlan: string, history: Record<string, number>[]) =>
    fetchAPI<SimulationResult>(`/simulate`, {
      method: "POST",
      body: JSON.stringify({ customer_id: customerId, proposed_plan: proposedPlan, history }),
    }),

  validate: (planExpr: string) =>
    fetchAPI<{ valid: boolean }>(`/validate`, {
      method: "POST",
      body: JSON.stringify({ plan_expr: planExpr }),
    }),
};
