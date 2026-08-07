"use client";

import { ASTNode } from "@/types";
import { astToLisp } from "@/lib/ast";
import { cn } from "@/lib/utils";
import { Check, Copy, AlertCircle } from "lucide-react";
import { useState } from "react";

interface LispPreviewProps {
  root: ASTNode | null;
  isValid?: boolean;
  validationError?: string;
}

export function LispPreview({ root, isValid, validationError }: LispPreviewProps) {
  const [copied, setCopied] = useState(false);
  const lisp = astToLisp(root);

  const handleCopy = () => {
    navigator.clipboard.writeText(lisp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lisp Expression</span>
          {isValid !== undefined && (
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              isValid 
                ? "bg-lisp-900/50 text-lisp-400 border border-lisp-800" 
                : "bg-red-900/50 text-red-400 border border-red-800"
            )}>
              {isValid ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {isValid ? "Valid" : "Invalid"}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="p-4">
        {lisp ? (
          <pre className="lisp-expr text-slate-300 overflow-x-auto whitespace-pre-wrap break-all">
            <code>{highlightLisp(lisp)}</code>
          </pre>
        ) : (
          <p className="text-slate-500 text-sm italic">Start building your expression to see the generated Lisp code...</p>
        )}
        {validationError && (
          <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {validationError}
          </p>
        )}
      </div>
    </div>
  );
}

function highlightLisp(expr: string): JSX.Element {
  // Simple syntax highlighting
  const tokens = expr.split(/(\s+|\(|\)|"[^"]*"|\d+\.?\d*)/g).filter(Boolean);

  return (
    <>
      {tokens.map((token, i) => {
        if (token === "(" || token === ")") {
          return <span key={i} className="lisp-paren">{token}</span>;
        }
        if (token.startsWith('"') && token.endsWith('"')) {
          return <span key={i} className="lisp-string">{token}</span>;
        }
        if (/^\d+\.?\d*$/.test(token)) {
          return <span key={i} className="lisp-number">{token}</span>;
        }
        if (["usage", "tiered", "volume", "overage", "min-charge", "max-cap", "discount", "when-usage", "bundle"].includes(token)) {
          return <span key={i} className="lisp-keyword">{token}</span>;
        }
        return <span key={i}>{token}</span>;
      })}
    </>
  );
}
