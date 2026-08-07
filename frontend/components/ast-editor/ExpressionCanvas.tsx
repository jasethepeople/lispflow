"use client";

import { useState } from "react";
import { ASTNode, BillingPrimitive } from "@/types";
import { BILLING_PRIMITIVES, createNode, createLiteralNode, createUsageRefNode } from "@/lib/ast";
import { cn, generateId } from "@/lib/utils";
import { Trash2, Plus, GripVertical, ChevronDown, ChevronRight } from "lucide-react";

interface ExpressionCanvasProps {
  root: ASTNode | null;
  onChange: (node: ASTNode | null) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function ExpressionCanvas({ root, onChange, selectedId, onSelect }: ExpressionCanvasProps) {
  if (!root) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">Select a primitive from the sidebar to start building</p>
          <p className="text-xs text-muted-foreground mt-1">Your pricing expression will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <NodeRenderer 
          node={root} 
          depth={0} 
          selectedId={selectedId} 
          onSelect={onSelect}
          onUpdate={(updated) => onChange(updated)}
          parent={null}
          index={0}
        />
      </div>
    </div>
  );
}

interface NodeRendererProps {
  node: ASTNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (node: ASTNode) => void;
  parent: ASTNode | null;
  index: number;
}

function NodeRenderer({ node, depth, selectedId, onSelect, onUpdate, parent, index }: NodeRendererProps) {
  const [expanded, setExpanded] = useState(true);
  const isSelected = node.id === selectedId;
  const primitive = BILLING_PRIMITIVES.find((p) => p.name === node.primitive);

  const handleDelete = () => {
    if (!parent) {
      // Can't delete root without replacement
      return;
    }
    const newChildren = [...parent.children];
    newChildren.splice(index, 1);
    const updatedParent = { ...parent, children: newChildren };
    // This is a simplified delete - in full implementation, bubble up to root
  };

  const handleAddChild = () => {
    const newChild = createLiteralNode(0);
    onUpdate({ ...node, children: [...node.children, newChild] });
  };

  const handleUpdateConfig = (key: string, value: unknown) => {
    onUpdate({
      ...node,
      config: { ...(node.config || {}), [key]: value },
    });
  };

  return (
    <div className={cn("relative", depth > 0 && "ml-6 mt-2")}>
      {/* Connector line */}
      {depth > 0 && (
        <div className="absolute -left-4 top-4 w-4 h-px bg-slate-300 dark:bg-slate-700" />
      )}

      <div
        className={cn(
          "relative rounded-lg border-2 p-3 transition-all cursor-pointer",
          isSelected 
            ? "border-lisp-500 bg-lisp-50 dark:bg-lisp-950/30 shadow-sm" 
            : "border-slate-200 dark:border-slate-700 hover:border-lisp-300 dark:hover:border-lisp-700"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(isSelected ? null : node.id);
        }}
      >
        {/* Node Header */}
        <div className="flex items-center gap-2">
          {node.children.length > 0 && (
            <button 
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="text-muted-foreground hover:text-foreground"
            >
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}

          <div className={cn(
            "w-6 h-6 rounded flex items-center justify-center text-xs font-bold",
            node.type === "primitive" && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
            node.type === "operator" && "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
            node.type === "literal" && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
            node.type === "usage-ref" && "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
          )}>
            {node.type === "primitive" && "P"}
            {node.type === "operator" && node.operator}
            {node.type === "literal" && "#"}
            {node.type === "usage-ref" && "U"}
          </div>

          <div className="flex-1 min-w-0">
            {node.type === "primitive" && primitive && (
              <div>
                <span className="font-semibold text-sm">{primitive.displayName}</span>
                <span className="text-xs text-muted-foreground ml-2 font-mono">({primitive.name})</span>
              </div>
            )}
            {node.type === "operator" && (
              <span className="font-semibold text-sm font-mono">Operator: {node.operator}</span>
            )}
            {node.type === "literal" && (
              <span className="font-mono text-sm">{typeof node.value === "string" ? `"${node.value}"` : node.value}</span>
            )}
            {node.type === "usage-ref" && (
              <span className="font-mono text-sm text-purple-600 dark:text-purple-400">usage("{node.usageKey}")</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); handleAddChild(); }}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-muted-foreground"
              title="Add child"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            {parent && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-muted-foreground hover:text-red-600"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Config Panel (when selected) */}
        {isSelected && node.type === "primitive" && primitive && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
            {primitive.params.map((param) => (
              <div key={param.name} className="flex items-center gap-2">
                <label className="text-xs font-medium w-24 shrink-0">{param.name}</label>
                {param.type === "number" && (
                  <input
                    type="number"
                    step="0.01"
                    value={(node.config?.[param.name] as number) ?? (param.default as number) ?? ""}
                    onChange={(e) => handleUpdateConfig(param.name, parseFloat(e.target.value))}
                    className="flex-1 min-w-0 px-2 py-1 text-sm rounded border bg-white dark:bg-slate-800 dark:border-slate-600"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                {param.type === "string" && (
                  <input
                    type="text"
                    value={(node.config?.[param.name] as string) ?? (param.default as string) ?? ""}
                    onChange={(e) => handleUpdateConfig(param.name, e.target.value)}
                    className="flex-1 min-w-0 px-2 py-1 text-sm rounded border bg-white dark:bg-slate-800 dark:border-slate-600"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && node.children.length > 0 && (
        <div className="relative">
          <div className="absolute left-3 top-0 bottom-4 w-px bg-slate-200 dark:bg-slate-700" />
          {node.children.map((child, i) => (
            <NodeRenderer
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onUpdate={(updated) => {
                const newChildren = [...node.children];
                newChildren[i] = updated;
                onUpdate({ ...node, children: newChildren });
              }}
              parent={node}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
