"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Code2, History, TrendingUp, Zap, DollarSign, Calendar } from "lucide-react";

// Mock data
const MOCK_CUSTOMER = {
  id: "cust-42",
  name: "Acme Corp",
  email: "billing@acme.com",
  total_billed: 15420.50,
  currency: "USD",
  created_at: "2024-01-15T00:00:00Z",
};

const MOCK_PLANS = [
  { id: "plan-1", plan_expr: `(volume (usage "requests") 0.01)`, is_active: false, created_at: "2024-01-15T00:00:00Z", activated_at: "2024-01-15T00:00:00Z", metadata: { name: "Starter" } },
  { id: "plan-2", plan_expr: `(+ (tiered (usage "compute_units") '((0 100 0.05) (100 500 0.04))) (volume (usage "storage_gb") 0.02))`, is_active: false, created_at: "2024-06-01T00:00:00Z", activated_at: "2024-06-01T00:00:00Z", metadata: { name: "Growth" } },
  { id: "plan-3", plan_expr: `(+ (tiered (usage "compute_units") '((0 100 0.05) (100 500 0.04) (500 nil 0.03))) (overage (usage "storage_gb") 1000 0.02) (volume (usage "egress_gb") 0.12))`, is_active: true, created_at: "2024-07-01T00:00:00Z", activated_at: "2024-07-01T00:00:00Z", metadata: { name: "Pro Tier" } },
];

const MOCK_HISTORY = [
  { id: "entry-1", cost: 127.50, currency: "USD", usage_data: { compute_units: 3200, storage_gb: 4500, egress_gb: 180 }, created_at: "2026-07-28T14:30:00Z", eval_duration_ms: 3 },
  { id: "entry-2", cost: 89.20, currency: "USD", usage_data: { compute_units: 2100, storage_gb: 2800, egress_gb: 120 }, created_at: "2026-07-27T14:30:00Z", eval_duration_ms: 2 },
  { id: "entry-3", cost: 156.80, currency: "USD", usage_data: { compute_units: 4100, storage_gb: 5200, egress_gb: 240 }, created_at: "2026-07-26T14:30:00Z", eval_duration_ms: 4 },
  { id: "entry-4", cost: 45.00, currency: "USD", usage_data: { compute_units: 800, storage_gb: 1200, egress_gb: 45 }, created_at: "2026-07-25T14:30:00Z", eval_duration_ms: 2 },
];

export default function CustomerPage() {
  const params = useParams();
  const customerId = params.id as string;
  const [activeTab, setActiveTab] = useState<"overview" | "plans" | "history">("overview");

  const activePlan = MOCK_PLANS.find((p) => p.is_active);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mr-6">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-lisp-100 dark:bg-lisp-900 flex items-center justify-center text-lisp-700 dark:text-lisp-300 font-bold text-sm">
              {MOCK_CUSTOMER.name.charAt(0)}
            </div>
            <div>
              <h1 className="font-semibold">{MOCK_CUSTOMER.name}</h1>
              <p className="text-xs text-muted-foreground">{customerId}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Total Billed</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(MOCK_CUSTOMER.total_billed)}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Code2 className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Active Plan</span>
            </div>
            <p className="text-lg font-bold">{activePlan?.metadata?.name || "None"}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Evaluations</span>
            </div>
            <p className="text-2xl font-bold">1,245</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Member Since</span>
            </div>
            <p className="text-lg font-bold">{formatDate(MOCK_CUSTOMER.created_at)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b">
          {(["overview", "plans", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-lisp-500 text-lisp-700 dark:text-lisp-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-lisp-600" />
                Active Plan
              </h3>
              {activePlan ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Name</span>
                    <span className="font-medium">{activePlan.metadata?.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Activated</span>
                    <span className="text-sm">{formatDate(activePlan.activated_at || "")}</span>
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">{activePlan.plan_expr}</pre>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Link href={`/editor?customer=${customerId}`}
                      className="px-3 py-1.5 text-sm rounded-md bg-lisp-600 text-white hover:bg-lisp-700 transition-colors">
                      Edit Plan
                    </Link>
                    <Link href={`/simulate?customer=${customerId}`}
                      className="px-3 py-1.5 text-sm rounded-md border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      Simulate
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No active plan</p>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-lisp-600" />
                Recent Activity
              </h3>
              <div className="space-y-3">
                {MOCK_HISTORY.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{formatCurrency(entry.cost)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</p>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">{entry.eval_duration_ms}ms</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "plans" && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Plan History</h3>
              <Link href={`/editor?customer=${customerId}`}
                className="px-3 py-1.5 text-sm rounded-md bg-lisp-600 text-white hover:bg-lisp-700 transition-colors">
                + New Plan
              </Link>
            </div>
            <div className="divide-y">
              {MOCK_PLANS.map((plan) => (
                <div key={plan.id} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{plan.metadata?.name || "Unnamed Plan"}</span>
                      {plan.is_active && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-lisp-100 text-lisp-800 dark:bg-lisp-900 dark:text-lisp-300">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(plan.created_at)}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">{plan.plan_expr}</pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Date</th>
                  <th className="px-6 py-3 text-right font-medium">Cost</th>
                  <th className="px-6 py-3 text-left font-medium">Usage</th>
                  <th className="px-6 py-3 text-right font-medium">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {MOCK_HISTORY.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-3">{formatDate(entry.created_at)}</td>
                    <td className="px-6 py-3 text-right font-mono font-medium text-lisp-700 dark:text-lisp-400">
                      {formatCurrency(entry.cost, entry.currency)}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(entry.usage_data).map(([k, v]) => (
                          <span key={k} className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-muted-foreground">
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right text-muted-foreground font-mono">{entry.eval_duration_ms}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
