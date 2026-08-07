"use client";

import { useState } from "react";
import Link from "next/link";
import { API } from "@/lib/api";
import { SimulationResult } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, TrendingUp, Play, Loader2, AlertCircle, BarChart3, Table2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const SAMPLE_HISTORY = [
  { compute_units: 80, storage_gb: 500, egress_gb: 20 },
  { compute_units: 250, storage_gb: 1500, egress_gb: 80 },
  { compute_units: 120, storage_gb: 900, egress_gb: 45 },
  { compute_units: 600, storage_gb: 3000, egress_gb: 200 },
  { compute_units: 30, storage_gb: 200, egress_gb: 10 },
  { compute_units: 180, storage_gb: 1100, egress_gb: 65 },
  { compute_units: 420, storage_gb: 2200, egress_gb: 150 },
  { compute_units: 90, storage_gb: 600, egress_gb: 30 },
  { compute_units: 310, storage_gb: 1800, egress_gb: 95 },
  { compute_units: 550, storage_gb: 2800, egress_gb: 180 },
];

const CURRENT_PLAN = `(+ (tiered (usage "compute_units") '((0 100 0.05) (100 500 0.04) (500 nil 0.03))) (overage (usage "storage_gb") 1000 0.02) (volume (usage "egress_gb") 0.12))`;
const PROPOSED_PLAN = `(+ (tiered (usage "compute_units") '((0 100 0.04) (100 500 0.03) (500 nil 0.02))) (overage (usage "storage_gb") 1500 0.015) (volume (usage "egress_gb") 0.10))`;

export default function SimulatePage() {
  const [customerId, setCustomerId] = useState("cust-42");
  const [currentPlan, setCurrentPlan] = useState(CURRENT_PLAN);
  const [proposedPlan, setProposedPlan] = useState(PROPOSED_PLAN);
  const [history, setHistory] = useState(JSON.stringify(SAMPLE_HISTORY, null, 2));
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    try {
      const historyData = JSON.parse(history);
      const res = await API.simulate(customerId, proposedPlan, historyData);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  const chartData = result?.cost_breakdown.map((item) => ({
    period: `P${item.period}`,
    cost: item.cost,
    ...item.usage,
  })) || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mr-6">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-lisp-600" />
            <h1 className="font-semibold">Time-Travel Simulation</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm">
            <div className="px-4 py-3 border-b">
              <h2 className="font-semibold text-sm">Current Plan</h2>
            </div>
            <div className="p-4">
              <textarea value={currentPlan} onChange={(e) => setCurrentPlan(e.target.value)}
                className="w-full h-32 px-3 py-2 text-sm font-mono rounded-lg border bg-slate-950 text-slate-300 dark:border-slate-700 resize-none" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm">
            <div className="px-4 py-3 border-b">
              <h2 className="font-semibold text-sm">Proposed Plan</h2>
            </div>
            <div className="p-4">
              <textarea value={proposedPlan} onChange={(e) => setProposedPlan(e.target.value)}
                className="w-full h-32 px-3 py-2 text-sm font-mono rounded-lg border bg-slate-950 text-slate-300 dark:border-slate-700 resize-none" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm mb-6">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm">Historical Usage Data</h2>
            <span className="text-xs text-muted-foreground">JSON array of usage objects</span>
          </div>
          <div className="p-4">
            <textarea value={history} onChange={(e) => setHistory(e.target.value)}
              className="w-full h-40 px-3 py-2 text-sm font-mono rounded-lg border bg-slate-950 text-slate-300 dark:border-slate-700 resize-none" />
          </div>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <button onClick={handleSimulate} disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-lisp-600 text-white font-medium hover:bg-lisp-700 disabled:opacity-50 transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {loading ? "Running Simulation..." : "Run Simulation"}
          </button>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Customer:</label>
            <input type="text" value={customerId} onChange={(e) => setCustomerId(e.target.value)}
              className="px-2 py-1 text-sm rounded border w-32 dark:bg-slate-800 dark:border-slate-700" />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700 dark:text-red-400">{error}</span>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SummaryCard label="Total Cost" value={formatCurrency(result.total_cost)} />
              <SummaryCard label="Average" value={formatCurrency(result.average_cost)} />
              <SummaryCard label="Minimum" value={formatCurrency(result.min_cost)} />
              <SummaryCard label="Maximum" value={formatCurrency(result.max_cost)} />
            </div>

            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setViewMode("chart")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "chart" ? "bg-lisp-100 text-lisp-800 dark:bg-lisp-900 dark:text-lisp-300" : "text-muted-foreground hover:bg-slate-100"
                }`}>
                <BarChart3 className="w-4 h-4" /> Chart
              </button>
              <button onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "table" ? "bg-lisp-100 text-lisp-800 dark:bg-lisp-900 dark:text-lisp-300" : "text-muted-foreground hover:bg-slate-100"
                }`}>
                <Table2 className="w-4 h-4" /> Table
              </button>
            </div>

            {viewMode === "chart" ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-6">
                <h3 className="font-semibold mb-4">Cost Breakdown</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                    <Bar dataKey="cost" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Period</th>
                      <th className="px-4 py-2 text-right font-medium">Cost</th>
                      {Object.keys(result.cost_breakdown[0]?.usage || {}).map((key) => (
                        <th key={key} className="px-4 py-2 text-right font-medium">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {result.cost_breakdown.map((item) => (
                      <tr key={item.period} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-2 font-medium">{item.period}</td>
                        <td className="px-4 py-2 text-right font-mono text-lisp-700 dark:text-lisp-400">{formatCurrency(item.cost)}</td>
                        {Object.entries(item.usage).map(([key, value]) => (
                          <td key={key} className="px-4 py-2 text-right font-mono text-muted-foreground">{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
