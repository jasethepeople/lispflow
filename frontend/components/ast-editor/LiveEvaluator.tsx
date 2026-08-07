"use client";

import { useState } from "react";
import { ASTNode } from "@/types";
import { astToLisp } from "@/lib/ast";
import { API } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Play, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface LiveEvaluatorProps {
  root: ASTNode | null;
  customerId?: string;
}

export function LiveEvaluator({ root, customerId = "cust-42" }: LiveEvaluatorProps) {
  const [usage, setUsage] = useState<Record<string, number>>({
    compute_units: 150,
    storage_gb: 1200,
    egress_gb: 50,
    requests: 5000,
  });
  const [result, setResult] = useState<{ cost: number; currency: string; duration_ms: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEvaluate = async () => {
    if (!root) return;
    setLoading(true);
    setError(null);
    try {
      const planExpr = astToLisp(root);
      // First activate the plan, then evaluate
      await API.createPlan(customerId, planExpr);
      const entry = await API.evaluate(customerId, usage);
      setResult({ cost: entry.cost, currency: entry.currency, duration_ms: entry.eval_duration_ms });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUsageChange = (key: string, value: string) => {
    setUsage((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm">
      <div className="px-4 py-3 border-b">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Play className="w-4 h-4 text-lisp-600" />
          Live Evaluation
        </h3>
      </div>
      <div className="p-4 space-y-4">
        {/* Usage Inputs */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Test Usage Data</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(usage).map(([key, value]) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground">{key}</label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => handleUsageChange(key, e.target.value)}
                  className="w-full px-2 py-1.5 text-sm rounded border bg-white dark:bg-slate-800 dark:border-slate-600"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Evaluate Button */}
        <button
          onClick={handleEvaluate}
          disabled={!root || loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-lisp-600 text-white text-sm font-medium hover:bg-lisp-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {loading ? "Evaluating..." : "Evaluate Plan"}
        </button>

        {/* Result */}
        {result && (
          <div className="p-3 rounded-lg bg-lisp-50 dark:bg-lisp-950/30 border border-lisp-200 dark:border-lisp-800">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-lisp-600" />
              <span className="text-sm font-medium text-lisp-800 dark:text-lisp-300">Evaluation Complete</span>
            </div>
            <p className="text-2xl font-bold text-lisp-700 dark:text-lisp-400">{formatCurrency(result.cost, result.currency)}</p>
            <p className="text-xs text-muted-foreground">Computed in {result.duration_ms}ms</p>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
