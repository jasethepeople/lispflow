"use client";

import { BILLING_PRIMITIVES } from "@/lib/ast";
import { Database, Layers, TrendingUp, AlertTriangle, ArrowDown, ArrowUp, Percent, GitBranch, Package, Plus, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ReactNode> = {
  Database: <Database className="w-4 h-4" />,
  Layers: <Layers className="w-4 h-4" />,
  TrendingUp: <TrendingUp className="w-4 h-4" />,
  AlertTriangle: <AlertTriangle className="w-4 h-4" />,
  ArrowDown: <ArrowDown className="w-4 h-4" />,
  ArrowUp: <ArrowUp className="w-4 h-4" />,
  Percent: <Percent className="w-4 h-4" />,
  GitBranch: <GitBranch className="w-4 h-4" />,
  Package: <Package className="w-4 h-4" />,
  Plus: <Plus className="w-4 h-4" />,
  Calculator: <Calculator className="w-4 h-4" />,
};

const categoryColors: Record<string, string> = {
  pricing: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  logic: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
  math: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  utility: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

const categoryLabels: Record<string, string> = {
  pricing: "Pricing",
  logic: "Logic",
  math: "Math",
  utility: "Utility",
};

interface PrimitivePaletteProps {
  onSelect: (primitive: string) => void;
}

export function PrimitivePalette({ onSelect }: PrimitivePaletteProps) {
  const grouped = BILLING_PRIMITIVES.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, typeof BILLING_PRIMITIVES>);

  return (
    <div className="w-72 bg-white dark:bg-slate-900 border-r h-full overflow-y-auto">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Primitives</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Click to add to expression</p>
      </div>
      <div className="p-3 space-y-4">
        {Object.entries(grouped).map(([category, primitives]) => (
          <div key={category}>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              {categoryLabels[category]}
            </h4>
            <div className="space-y-1">
              {primitives.map((p) => (
                <button
                  key={p.name}
                  onClick={() => onSelect(p.name)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg border text-sm transition-all hover:shadow-sm",
                    "flex items-center gap-2.5",
                    categoryColors[p.category]
                  )}
                  title={p.description}
                >
                  {iconMap[p.icon]}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.displayName}</p>
                    <p className="text-xs opacity-70 truncate">{p.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
