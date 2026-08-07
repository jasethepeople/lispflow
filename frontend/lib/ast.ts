import { ASTNode, BillingPrimitive } from "@/types";
import { generateId } from "./utils";

export const BILLING_PRIMITIVES: BillingPrimitive[] = [
  {
    name: "usage",
    displayName: "Usage Dimension",
    description: "Retrieve a usage dimension value",
    category: "pricing",
    icon: "Database",
    params: [
      { name: "key", type: "string", required: true, description: "Dimension key (e.g., 'compute_units')" },
    ],
    example: '(usage "compute_units")',
  },
  {
    name: "tiered",
    displayName: "Tiered Pricing",
    description: "Progressive bracket pricing",
    category: "pricing",
    icon: "Layers",
    params: [
      { name: "usage", type: "expression", required: true, description: "Usage expression" },
      { name: "tiers", type: "array", required: true, description: "List of (low high price) tuples" },
    ],
    example: '(tiered (usage "compute_units") '((0 100 0.05) (100 500 0.04) (500 nil 0.03)))',
  },
  {
    name: "volume",
    displayName: "Volume Pricing",
    description: "Simple linear pricing",
    category: "pricing",
    icon: "TrendingUp",
    params: [
      { name: "usage", type: "expression", required: true, description: "Usage amount" },
      { name: "rate", type: "number", required: true, description: "Price per unit" },
    ],
    example: '(volume (usage "requests") 0.01)',
  },
  {
    name: "overage",
    displayName: "Overage Pricing",
    description: "Charge only above included threshold",
    category: "pricing",
    icon: "AlertTriangle",
    params: [
      { name: "usage", type: "expression", required: true, description: "Usage amount" },
      { name: "included", type: "number", required: true, description: "Included units" },
      { name: "rate", type: "number", required: true, description: "Overage rate" },
    ],
    example: '(overage (usage "storage_gb") 1000 0.02)',
  },
  {
    name: "min-charge",
    displayName: "Minimum Charge",
    description: "Enforce minimum bill amount",
    category: "utility",
    icon: "ArrowDown",
    params: [
      { name: "amount", type: "expression", required: true, description: "Amount to floor" },
      { name: "floor", type: "number", required: true, description: "Minimum value" },
    ],
    example: '(min-charge (volume (usage "requests") 0.01) 10.0)',
  },
  {
    name: "max-cap",
    displayName: "Maximum Cap",
    description: "Enforce maximum bill amount",
    category: "utility",
    icon: "ArrowUp",
    params: [
      { name: "amount", type: "expression", required: true, description: "Amount to cap" },
      { name: "ceiling", type: "number", required: true, description: "Maximum value" },
    ],
    example: '(max-cap (volume (usage "requests") 0.01) 500.0)',
  },
  {
    name: "discount",
    displayName: "Discount",
    description: "Apply percentage discount",
    category: "utility",
    icon: "Percent",
    params: [
      { name: "amount", type: "expression", required: true, description: "Amount to discount" },
      { name: "percent", type: "number", required: true, description: "Discount percentage" },
    ],
    example: '(discount (volume (usage "requests") 0.01) 10)',
  },
  {
    name: "when-usage",
    displayName: "Conditional",
    description: "Conditional pricing logic",
    category: "logic",
    icon: "GitBranch",
    params: [
      { name: "condition", type: "expression", required: true, description: "Condition expression" },
      { name: "true_expr", type: "expression", required: true, description: "Expression when true" },
      { name: "false_expr", type: "expression", required: true, description: "Expression when false" },
    ],
    example: '(when-usage (> (usage "compute_units") 200) (discount amount 10) 0)',
  },
  {
    name: "bundle",
    displayName: "Bundle Pricing",
    description: "Prepaid unit blocks",
    category: "pricing",
    icon: "Package",
    params: [
      { name: "included", type: "number", required: true, description: "Included units" },
      { name: "unit_price", type: "number", required: true, description: "Price per unit" },
      { name: "usage", type: "expression", required: true, description: "Usage amount" },
    ],
    example: '(bundle 1000 0.01 800)',
  },
  {
    name: "+",
    displayName: "Add",
    description: "Sum multiple expressions",
    category: "math",
    icon: "Plus",
    params: [
      { name: "expressions", type: "expression", required: true, description: "Expressions to sum" },
    ],
    example: '(+ (volume (usage "a") 0.01) (volume (usage "b") 0.02))',
  },
];

export function createNode(primitive: string, config?: Record<string, unknown>): ASTNode {
  return {
    id: generateId(),
    type: "primitive",
    primitive,
    children: [],
    config: config || {},
  };
}

export function createOperatorNode(operator: string, children: ASTNode[] = []): ASTNode {
  return {
    id: generateId(),
    type: "operator",
    operator: operator as ASTNode["operator"],
    children,
  };
}

export function createLiteralNode(value: number | string): ASTNode {
  return {
    id: generateId(),
    type: "literal",
    value,
    children: [],
  };
}

export function createUsageRefNode(key: string): ASTNode {
  return {
    id: generateId(),
    type: "usage-ref",
    usageKey: key,
    children: [],
  };
}

export function astToLisp(node: ASTNode | null): string {
  if (!node) return "";

  switch (node.type) {
    case "literal":
      return typeof node.value === "string" ? `"${node.value}"` : String(node.value);
    case "usage-ref":
      return `(usage "${node.usageKey}")`;
    case "operator":
      const opChildren = node.children.map(astToLisp).join(" ");
      return `(${node.operator} ${opChildren})`;
    case "primitive":
      const prim = BILLING_PRIMITIVES.find((p) => p.name === node.primitive);
      if (!prim) return "";

      const args: string[] = [];
      if (node.primitive === "usage" && node.config?.key) {
        args.push(`"${node.config.key}"`);
      } else if (node.primitive === "tiered") {
        const usageExpr = node.children[0] ? astToLisp(node.children[0]) : "(usage "compute_units")";
        const tiers = node.config?.tiers as Array<[number, number | null, number]> || [[0, 100, 0.05]];
        const tierStr = tiers.map((t) => `(${t[0]} ${t[1] ?? "nil"} ${t[2]})`).join(" ");
        args.push(usageExpr, `'(${tierStr})`);
      } else if (node.primitive === "volume") {
        const usageExpr = node.children[0] ? astToLisp(node.children[0]) : "(usage "requests")";
        args.push(usageExpr, String(node.config?.rate ?? 0.01));
      } else if (node.primitive === "overage") {
        const usageExpr = node.children[0] ? astToLisp(node.children[0]) : "(usage "storage_gb")";
        args.push(usageExpr, String(node.config?.included ?? 1000), String(node.config?.rate ?? 0.02));
      } else if (node.primitive === "min-charge" || node.primitive === "max-cap") {
        const amountExpr = node.children[0] ? astToLisp(node.children[0]) : "0";
        const limit = node.primitive === "min-charge" ? (node.config?.floor ?? 10) : (node.config?.ceiling ?? 500);
        args.push(amountExpr, String(limit));
      } else if (node.primitive === "discount") {
        const amountExpr = node.children[0] ? astToLisp(node.children[0]) : "0";
        args.push(amountExpr, String(node.config?.percent ?? 10));
      } else if (node.primitive === "when-usage") {
        const condition = node.children[0] ? astToLisp(node.children[0]) : "0";
        const trueExpr = node.children[1] ? astToLisp(node.children[1]) : "0";
        const falseExpr = node.children[2] ? astToLisp(node.children[2]) : "0";
        args.push(condition, trueExpr, falseExpr);
      } else if (node.primitive === "bundle") {
        args.push(String(node.config?.included ?? 1000), String(node.config?.unit_price ?? 0.01));
        const usageExpr = node.children[0] ? astToLisp(node.children[0]) : "(usage "requests")";
        args.push(usageExpr);
      }

      return `(${node.primitive} ${args.join(" ")})`;
    default:
      return "";
  }
}

export function lispToAst(expr: string): ASTNode | null {
  // Simplified parser - in production, use a proper S-expression parser
  // This is a basic implementation for demo purposes
  try {
    expr = expr.trim();
    if (!expr.startsWith("(")) {
      // Literal
      const num = parseFloat(expr);
      if (!isNaN(num)) return createLiteralNode(num);
      if (expr.startsWith('"') && expr.endsWith('"')) {
        return createLiteralNode(expr.slice(1, -1));
      }
      return null;
    }

    // Remove outer parens
    expr = expr.slice(1, -1).trim();
    const tokens = tokenize(expr);
    if (tokens.length === 0) return null;

    const head = tokens[0];

    if (["+", "-", "*", "/", ">", "<", "="].includes(head)) {
      const children = tokens.slice(1).map((t) => lispToAst(t)).filter(Boolean) as ASTNode[];
      return createOperatorNode(head, children);
    }

    if (BILLING_PRIMITIVES.some((p) => p.name === head)) {
      const node = createNode(head);
      // Parse config from tokens - simplified
      if (head === "usage" && tokens[1]) {
        const key = tokens[1].replace(/"/g, "");
        node.config = { key };
      }
      return node;
    }

    return null;
  } catch {
    return null;
  }
}

function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let depth = 0;
  let inString = false;

  for (const char of expr) {
    if (char === '"' && (current.length === 0 || current[current.length - 1] !== "\")) {
      inString = !inString;
      current += char;
      continue;
    }

    if (inString) {
      current += char;
      continue;
    }

    if (char === "(") {
      depth++;
      if (depth === 1 && current.trim()) {
        tokens.push(current.trim());
        current = "";
      }
      current += char;
    } else if (char === ")") {
      depth--;
      current += char;
      if (depth === 0) {
        tokens.push(current.trim());
        current = "";
      }
    } else if (char === " " && depth === 0) {
      if (current.trim()) {
        tokens.push(current.trim());
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    tokens.push(current.trim());
  }

  return tokens;
}
