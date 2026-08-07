export interface Plan {
  id: string;
  customer_id: string;
  plan_expr: string;
  is_active: boolean;
  created_at: string;
  activated_at?: string;
  metadata?: Record<string, string>;
}

export interface LedgerEntry {
  id: string;
  customer_id: string;
  plan_id: string;
  plan_expr: string;
  usage_data: Record<string, number>;
  cost: number;
  currency: string;
  period_start: string;
  period_end: string;
  created_at: string;
  evaluated_at: string;
  eval_duration_ms: number;
}

export interface SimulationResult {
  plan_expr: string;
  periods: number;
  total_cost: number;
  average_cost: number;
  min_cost: number;
  max_cost: number;
  cost_breakdown: PeriodCost[];
  duration_ms: number;
}

export interface PeriodCost {
  period: number;
  usage: Record<string, number>;
  cost: number;
  timestamp: string;
}

export interface UsageEvent {
  customer_id: string;
  dimensions: Record<string, number>;
  timestamp: string;
  source: string;
}

export interface ASTNode {
  id: string;
  type: 'primitive' | 'operator' | 'literal' | 'usage-ref';
  primitive?: string;
  operator?: '+' | '-' | '*' | '/' | '>' | '<' | '=';
  value?: number | string;
  usageKey?: string;
  children: ASTNode[];
  config?: Record<string, unknown>;
}

export interface BillingPrimitive {
  name: string;
  displayName: string;
  description: string;
  category: 'pricing' | 'logic' | 'math' | 'utility';
  icon: string;
  params: PrimitiveParam[];
  example: string;
}

export interface PrimitiveParam {
  name: string;
  type: 'number' | 'string' | 'array' | 'expression';
  required: boolean;
  default?: unknown;
  description: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  active_plan?: Plan;
  total_billed: number;
  currency: string;
  created_at: string;
}
