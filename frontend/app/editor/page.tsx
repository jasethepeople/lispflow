"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ASTNode } from "@/types";
import { createNode, astToLisp, lispToAst } from "@/lib/ast";
import { PrimitivePalette } from "@/components/ast-editor/PrimitivePalette";
import { ExpressionCanvas } from "@/components/ast-editor/ExpressionCanvas";
import { LispPreview } from "@/components/ast-editor/LispPreview";
import { LiveEvaluator } from "@/components/ast-editor/LiveEvaluator";
import { API } from "@/lib/api";
import { Code2, Save, RotateCcw, ArrowLeft, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EditorPage() {
  const [root, setRoot] = useState<ASTNode | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [planName, setPlanName] = useState("");
  const [customerId, setCustomerId] = useState("cust-42");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [validationStatus, setValidationStatus] = useState<{ valid: boolean; error?: string } | null>(null);

  const handleSelectPrimitive = useCallback((primitive: string) => {
    const newNode = createNode(primitive);
    if (!root) {
      setRoot(newNode);
    } else if (selectedId) {
      const addChild = (node: ASTNode): ASTNode => {
        if (node.id === selectedId) {
          return { ...node, children: [...node.children, newNode] };
        }
        return { ...node, children: node.children.map(addChild) };
      };
      setRoot((prev) => (prev ? addChild(prev) : null));
    }
    setSelectedId(newNode.id);
  }, [root, selectedId]);

  const handleValidate = async () => {
    if (!root) return;
    const expr = astToLisp(root);
    try {
      const result = await API.validate(expr);
      setValidationStatus({ valid: result.valid });
    } catch (err) {
      setValidationStatus({ valid: false, error: err instanceof Error ? err.message : "Validation failed" });
    }
  };

  const handleSave = async () => {
    if (!root || !planName) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      const expr = astToLisp(root);
      await API.createPlan(customerId, expr, { name: planName });
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setRoot(null);
    setSelectedId(null);
    setValidationStatus(null);
    setSaveStatus("idle");
  };

  const handleLoadExample = () => {
    const example = `(+ (tiered (usage "compute_units") '((0 100 0.05) (100 500 0.04) (500 nil 0.03))) (overage (usage "storage_gb") 1000 0.02) (volume (usage "egress_gb") 0.12))`;
    const parsed = lispToAst(example);
    setRoot(parsed);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <header className="bg-white dark:bg-slate-900 border-b h-14 flex items-center px-4 shrink-0">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mr-6">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Dashboard</span>
        </Link>
        <div className="flex items-center gap-2 mr-auto">
          <Code2 className="w-5 h-5 text-lisp-600" />
          <h1 className="font-semibold">Plan Editor</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleLoadExample} className="px-3 py-1.5 text-sm rounded-md border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Load Example
          </button>
          <button onClick={handleReset} className="px-3 py-1.5 text-sm rounded-md border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button onClick={handleValidate} disabled={!root} className="px-3 py-1.5 text-sm rounded-md border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
            Validate
          </button>
          <button onClick={handleSave} disabled={!root || !planName || saving}
            className={cn("px-4 py-1.5 text-sm rounded-md font-medium transition-all flex items-center gap-1.5",
              saveStatus === "success" ? "bg-lisp-600 text-white" : "bg-lisp-600 text-white hover:bg-lisp-700 disabled:opacity-50")}>
            {saving ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : saveStatus === "success" ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saveStatus === "success" ? "Saved!" : saving ? "Saving..." : "Save Plan"}
          </button>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-900 border-b px-4 py-2 flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">Customer</label>
          <input type="text" value={customerId} onChange={(e) => setCustomerId(e.target.value)}
            className="px-2 py-1 text-sm rounded border w-32 dark:bg-slate-800 dark:border-slate-700" placeholder="cust-42" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">Plan Name</label>
          <input type="text" value={planName} onChange={(e) => setPlanName(e.target.value)}
            className="px-2 py-1 text-sm rounded border w-48 dark:bg-slate-800 dark:border-slate-700" placeholder="Pro Tier v2.0" />
        </div>
        {validationStatus && (
          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
            validationStatus.valid ? "bg-lisp-100 text-lisp-800 dark:bg-lisp-900 dark:text-lisp-300" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300")}>
            {validationStatus.valid ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {validationStatus.valid ? "Valid" : validationStatus.error || "Invalid"}
          </span>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <PrimitivePalette onSelect={handleSelectPrimitive} />
        <div className="flex-1 flex flex-col min-w-0">
          <ExpressionCanvas root={root} onChange={setRoot} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="w-96 bg-white dark:bg-slate-900 border-l overflow-y-auto">
          <div className="p-4 space-y-4">
            <LispPreview root={root} isValid={validationStatus?.valid} validationError={validationStatus?.error} />
            <LiveEvaluator root={root} customerId={customerId} />
          </div>
        </div>
      </div>
    </div>
  );
}
