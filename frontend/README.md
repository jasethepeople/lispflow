# LispFlow Frontend

Next.js 14 application with App Router, TypeScript, and Tailwind CSS.

## Features

- **Visual AST Editor** — Drag-and-drop interface for building Lisp pricing expressions
- **Live Evaluation** — Test plans against real usage data with instant feedback
- **Time-Travel Simulation** — Compare current vs proposed plans with charts and tables
- **Customer Dashboard** — View billing history, plan versions, and usage analytics
- **Dark Mode** — Full dark mode support

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard with stats, customers, recent evaluations |
| `/editor` | Visual AST editor for building pricing plans |
| `/simulate` | Time-travel simulation with charts |
| `/customers/[id]` | Customer detail with plans and history |

## Architecture

```
app/
  page.tsx           # Dashboard
  layout.tsx         # Root layout with fonts
  globals.css        # Tailwind + custom styles
  editor/
    page.tsx         # Plan editor
  simulate/
    page.tsx         # Simulation runner
  customers/
    [id]/
      page.tsx       # Customer detail
components/
  ast-editor/
    PrimitivePalette.tsx   # Draggable primitives sidebar
    ExpressionCanvas.tsx   # Drop zone / tree renderer
    LispPreview.tsx        # Live S-expression preview
    LiveEvaluator.tsx      # Test evaluation panel
lib/
  api.ts             # API client
  ast.ts             # AST manipulation + primitives
  utils.ts           # Formatting utilities
types/
  index.ts           # TypeScript interfaces
```
