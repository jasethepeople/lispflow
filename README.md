# LispFlow

https://youtube.com/shorts/iJPKgSgk06k?si=sqj1Zjvee0LOho2T

> **A Programmable, Homoiconic Usage-Based Billing Engine for SaaS Platforms**
>
> *Sandboxed Lisp Evaluation · Transactional Ledger · Time-Travel Simulation · Visual AST Editor*

---

## Abstract

LispFlow is a production-grade, programmable billing engine that replaces rigid rate-card database tables with **homomorphic Lisp S-expressions** as pricing contracts. By embedding a sandboxed `zygomys` interpreter within a Go backend, pricing plans become first-class data — versionable, hot-reloadable, and simulatable against historical usage without code redeployment. The system features atomic PostgreSQL ledger recording, batched event ingestion, HMAC-signed webhook delivery, and a Next.js visual AST editor that enables non-technical stakeholders to construct pricing logic through drag-and-drop primitives.

---

## Table of Contents

1. [What is LispFlow?](#what-is-lispflow)
2. [Architecture Overview](#architecture-overview)
3. [Key Features](#key-features)
4. [Technology Stack](#technology-stack)
5. [Prerequisites](#prerequisites)
6. [Installation](#installation)
7. [Quick Start](#quick-start)
8. [API Reference](#api-reference)
9. [Billing Primitives](#billing-primitives)
10. [Visual AST Editor](#visual-ast-editor)
11. [Time-Travel Simulation](#time-travel-simulation)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [Monitoring & Observability](#monitoring--observability)
15. [Security](#security)
16. [Contributing](#contributing)
17. [License](#license)

---

## What is LispFlow?

Traditional SaaS billing systems encode pricing logic in database tables, stored procedures, or hardcoded conditionals. Changing a pricing tier requires:
- Database migrations
- Code redeployment
- Regression testing
- Coordinated rollout

**LispFlow eliminates this friction.**

Because Lisp is **homoiconic** (code is data), pricing plans are stored as raw S-expressions in the database:

```lisp
(+ (tiered (usage "compute_units")
           '((0 100 0.05) (100 500 0.04) (500 nil 0.03)))
   (overage (usage "storage_gb") 1000 0.02)
   (volume (usage "egress_gb") 0.12))
```

This single expression encodes:
- Tiered compute pricing (0–100 @ $0.05, 100–500 @ $0.04, 500+ @ $0.03)
- Storage overage above 1000 GB @ $0.02/GB
- Network egress at $0.12/GB

**No migrations. No redeploys. Instant activation.**

### Why Lisp?

| Property | Benefit |
|----------|---------|
| Homoiconicity | Plans are data — versionable, diffable, inspectable |
| Expressiveness | Single expression replaces 50+ lines of imperative code |
| Sandboxing | Strip I/O functions; plans cannot access filesystem or network |
| Evaluability | Evaluate in milliseconds with timeout guards |
| Composability | Nest primitives arbitrarily: `(max-cap (min-charge (+ ...)) 500)` |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │  Next.js 14   │  │  React AST   │  │  Recharts / Tailwind │    │
│  │  Visual Editor │  │  Drag-Drop   │  │  Charts & Dashboard  │    │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘    │
└─────────┼─────────────────┼─────────────────────┼─────────────────┘
          │                 │                     │
          ▼                 ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API LAYER (Gin)                             │
│  POST /api/v1/customers/:id/plans    → Activate pricing plan        │
│  POST /api/v1/customers/:id/evaluate → Evaluate usage + record      │
│  POST /api/v1/simulate              → Time-travel simulation      │
│  POST /api/v1/validate              → Plan syntax validation        │
│  GET  /api/v1/customers/:id/history → Paginated ledger entries      │
│  GET  /health /ready /metrics       → Probes & Prometheus           │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐    │
│  │ BillingService │  │ Ingestion      │  │ WebhookService     │    │
│  │ (orchestration)│  │ (batching)     │  │ (HMAC + retry)     │    │
│  └──────┬─────────┘  └──────┬─────────┘  └────────┬───────────┘    │
└─────────┼───────────────────┼─────────────────────┼─────────────────┘
          │                   │                     │
          ▼                   ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      ENGINE LAYER (zygomys)                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Sandboxed Lisp Interpreter (per-evaluation duplication)      │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │   │
│  │  │  usage  │ │ tiered  │ │ volume  │ │ overage │ ...       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │   │
│  │  │min-charge│ │ max-cap │ │discount │ │when-usage│          │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PERSISTENCE LAYER                                │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐      │
│  │ PostgreSQL 15  │  │ Redis 7        │  │ Secrets Manager    │      │
│  │ (pgx, atomic)  │  │ (plan cache)   │  │ (AWS/GCP/Azure)    │      │
│  │                │  │                │  │                    │      │
│  │ pricing_plans  │  │ plan:*         │  │ DB_PASSWORD        │      │
│  │ billing_ledger │  │ sim:*          │  │ JWT_SECRET         │      │
│  │ usage_events   │  │                │  │ WEBHOOK_SECRET     │      │
│  └────────────────┘  └────────────────┘  └────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. Sandboxed Lisp Evaluation
- Embedded `zygomys` interpreter with all I/O stripped
- Fresh interpreter duplication per evaluation (zero state leakage)
- Configurable timeout guards (default 100ms)
- Plan size limits (default 64KB)

### 2. Transactional Ledger
- `EvaluatePricing` called within `pgx` `Serializable` transaction
- Usage event + computed cost atomically recorded
- Immutable ledger entries with evaluation timing metadata

### 3. Time-Travel Simulation
- Replay historical usage through proposed plans in milliseconds
- Revenue impact analysis with min/max/average cost breakdown
- No effect on live billing data

### 4. Plan Versioning
- Atomic activation: new plan activates, old deactives in one transaction
- Full plan history retained for audit/compliance
- Hot-reload: no code redeployment required

### 5. Event Ingestion Pipeline
- Batched by customer with configurable flush intervals
- Dimension aggregation before evaluation
- Async webhook notifications on completion

### 6. Visual AST Editor (Next.js 14)
- Drag-and-drop primitive palette (10 billing functions)
- Interactive tree view with inline parameter editing
- Live Lisp expression preview with syntax highlighting
- Real-time evaluation against test usage data
- Dark mode support

### 7. Production Infrastructure
- **Terraform**: VPC, EKS, RDS, ElastiCache, ALB, Route53
- **Helm**: HPA, ingress, migration jobs, pod anti-affinity
- **Docker**: Multi-stage distroless builds
- **K8s**: Health probes, graceful shutdown, horizontal scaling

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | Go | 1.22 |
| Database | PostgreSQL | 15+ |
| Cache | Redis | 7+ |
| Interpreter | zygomys | 1.2.4 |
| HTTP Framework | Gin | 1.9.1 |
| Database Driver | pgx | 5.5.5 |
| Frontend | Next.js | 14.2.0 |
| Frontend | React | 18.2.0 |
| Frontend | TypeScript | 5.4.0 |
| Frontend | Tailwind CSS | 3.4.0 |
| Charts | Recharts | 2.12.0 |
| State | Zustand | 4.5.0 |
| Infrastructure | Terraform | 1.5.0+ |
| Orchestration | Kubernetes | 1.29+ |
| Packaging | Helm | 3.0+ |
| CI/CD | GitHub Actions | — |
| Monitoring | Prometheus | — |

---

## Prerequisites

### Required
- **Go 1.22+** — [https://go.dev/dl](https://go.dev/dl)
- **PostgreSQL 15+** — [https://postgresql.org/download](https://postgresql.org/download)
- **Node.js 20+** — [https://nodejs.org](https://nodejs.org) (for frontend)

### Optional
- **Redis 7+** — For plan caching and simulation memoization
- **Docker** — [https://docker.com](https://docker.com) (for containerized deployment)
- **Terraform 1.5+** — [https://terraform.io](https://terraform.io) (for AWS infrastructure)
- **Helm 3+** — [https://helm.sh](https://helm.sh) (for Kubernetes deployment)
- **kubectl** — [https://kubernetes.io/docs/tasks/tools](https://kubernetes.io/docs/tasks/tools)

---

## Installation

### Option 1: Local Development (Full Stack)

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/lispflow.git
cd lispflow

# 2. Install Go dependencies
make deps

# 3. Install frontend dependencies
cd frontend && npm install && cd ..

# 4. Configure database
cp config.yaml config.local.yaml
# Edit config.local.yaml with your PostgreSQL credentials

# 5. Run database migrations
make migrate

# 6. Start the backend
make run
# Server starts on http://localhost:8080

# 7. In a new terminal, start the frontend
cd frontend && npm run dev
# Frontend starts on http://localhost:3000
```

### Option 2: Docker Compose (Recommended for Quick Testing)

```bash
# Start the entire stack
docker compose up --build

# Services:
#   API:      http://localhost:8080
#   Frontend: http://localhost:3000
#   Postgres: localhost:5432
#   Redis:    localhost:6379

# Stop and clean up
docker compose down -v
```

### Option 3: Kubernetes (Production)

```bash
# Build and push Docker image
make docker
docker tag lispflow:latest your-registry/lispflow:v1.0.0
docker push your-registry/lispflow:v1.0.0

# Deploy with Helm
helm install lispflow ./helm/lispflow   --set image.repository=your-registry/lispflow   --set image.tag=v1.0.0   --set ingress.hosts[0].host=api.yourdomain.com
```

---

## Quick Start

### 1. Activate a Pricing Plan

```bash
curl -X POST http://localhost:8080/api/v1/customers/cust-42/plans \
  -H "Content-Type: application/json" \
  -d '{
    "plan_expr": "(+ (tiered (usage \"compute_units\") '((0 100 0.05) (100 500 0.04) (500 nil 0.03))) (overage (usage \"storage_gb\") 1000 0.02) (volume (usage \"egress_gb\") 0.12))",
    "metadata": { "name": "Pro Tier", "version": "1.0" }
  }'
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "customer_id": "cust-42",
  "plan_expr": "(+ (tiered (usage \"compute_units\") ...",
  "is_active": true,
  "created_at": "2026-08-07T00:00:00Z",
  "activated_at": "2026-08-07T00:00:00Z"
}
```

### 2. Evaluate Usage

```bash
curl -X POST http://localhost:8080/api/v1/customers/cust-42/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "usage": {
      "compute_units": 150,
      "storage_gb": 1200,
      "egress_gb": 50
    }
  }'
```

**Response:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "customer_id": "cust-42",
  "cost": 17.00,
  "currency": "USD",
  "eval_duration_ms": 3,
  "created_at": "2026-08-07T00:00:00Z"
}
```

**Cost Breakdown:**
| Component | Calculation | Cost |
|-----------|-------------|------|
| Compute (tiered) | 100×$0.05 + 50×$0.04 | $7.00 |
| Storage (overage) | (1200−1000)×$0.02 | $4.00 |
| Egress (volume) | 50×$0.12 | $6.00 |
| **Total** | | **$17.00** |

### 3. Time-Travel Simulation

```bash
curl -X POST http://localhost:8080/api/v1/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "cust-42",
    "proposed_plan": "(+ (tiered (usage \"compute_units\") '((0 100 0.04) (100 500 0.03) (500 nil 0.02))) (overage (usage \"storage_gb\") 1500 0.015) (volume (usage \"egress_gb\") 0.10))",
    "history": [
      {"compute_units": 80, "storage_gb": 500, "egress_gb": 20},
      {"compute_units": 250, "storage_gb": 1500, "egress_gb": 80},
      {"compute_units": 120, "storage_gb": 900, "egress_gb": 45}
    ]
  }'
```

**Response:**
```json
{
  "plan_expr": "(+ (tiered ...",
  "periods": 3,
  "total_cost": 45.30,
  "average_cost": 15.10,
  "min_cost": 8.00,
  "max_cost": 22.50,
  "duration_ms": 12
}
```

---

## API Reference

Full OpenAPI 3.0 specification available at `openapi/openapi.yaml`.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Liveness probe |
| `/ready` | GET | Readiness probe |
| `/metrics` | GET | Prometheus metrics |
| `/api/v1/customers/:id/plans` | POST | Activate new pricing plan |
| `/api/v1/customers/:id/plans` | GET | Get plan history |
| `/api/v1/customers/:id/plans/active` | GET | Get active plan |
| `/api/v1/customers/:id/evaluate` | POST | Evaluate usage + record |
| `/api/v1/customers/:id/batch` | POST | Batch evaluate events |
| `/api/v1/customers/:id/history` | GET | Paginated ledger entries |
| `/api/v1/simulate` | POST | Time-travel simulation |
| `/api/v1/validate` | POST | Plan syntax validation |

---

## Billing Primitives

| Primitive | Signature | Purpose | Example |
|-----------|-----------|---------|---------|
| `usage` | `(usage "key")` | Retrieve dimension value | `(usage "compute_units")` |
| `tiered` | `(tiered usage tiers)` | Progressive bracket pricing | `(tiered 150 '((0 100 0.05) ...))` |
| `volume` | `(volume usage rate)` | Linear per-unit pricing | `(volume 50 0.12)` |
| `overage` | `(overage usage included rate)` | Charge above threshold | `(overage 1200 1000 0.02)` |
| `min-charge` | `(min-charge amount floor)` | Enforce minimum bill | `(min-charge amount 10.0)` |
| `max-cap` | `(max-cap amount ceiling)` | Enforce maximum bill | `(max-cap amount 500.0)` |
| `discount` | `(discount amount percent)` | Apply % discount | `(discount amount 10)` |
| `when-usage` | `(when-usage condition then else)` | Conditional logic | `(when-usage (> usage 200) discount 0)` |
| `bundle` | `(bundle included unit-price usage)` | Prepaid unit blocks | `(bundle 1000 0.01 800)` |
| `per-unit` | `(per-unit usage price)` | Ceiling + per-unit | `(per-unit 3.7 5.0)` |
| `round2` | `(round2 value)` | Round to 2 decimals | `(round2 17.333)` |
| `tax` | `(tax amount rate)` | Apply tax rate | `(tax 100.0 8.5)` |

---

## Visual AST Editor

The Next.js frontend provides a visual interface for building pricing plans without writing Lisp code.

### Features
- **Primitive Palette**: 10 billing functions organized by category (Pricing, Logic, Math, Utility)
- **Expression Canvas**: Interactive tree view — click nodes to select, configure parameters inline
- **Lisp Preview**: Real-time S-expression generation with syntax highlighting
- **Live Evaluator**: Test plans against real usage data with instant cost feedback
- **Simulation Runner**: Compare current vs proposed plans with charts and tables

### Access
```
http://localhost:3000          → Dashboard
http://localhost:3000/editor   → Plan Editor
http://localhost:3000/simulate → Simulation Runner
```

---

## Time-Travel Simulation

The simulation engine allows business analysts to:

1. **Propose a new plan** — Modify rates, tiers, or add conditions
2. **Select historical usage data** — Any period from the ledger
3. **Run the simulation** — Evaluate both old and new plans against the same data
4. **Analyze impact** — See total cost delta, per-period breakdown, min/max/average

**Use cases:**
- Revenue forecasting before plan changes
- A/B testing pricing strategies
- Customer migration impact analysis
- Compliance audit trails

---

## Testing

### Unit Tests
```bash
make test
```

### Integration Tests (requires PostgreSQL + Redis)
```bash
make integration
```

### Coverage Report
```bash
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html
```

### Test Suite Coverage
- Plan activation & versioning (atomic deactivation)
- Tiered, volume, overage, min/max, conditional pricing
- Missing usage key defaults to zero
- Time-travel simulation with revenue impact
- Batch processing of multiple events
- Ledger immutability & pagination
- 100 concurrent evaluations (race condition test)
- Plan validation & size limits

---

## Deployment

### Terraform (AWS)

```bash
# One-time: create S3 backend bucket
cd terraform/backend-bootstrap
terraform init && terraform apply

# Deploy staging
cd ../environments/staging
terraform init
terraform plan
terraform apply

# Deploy production
cd ../prod
terraform init
terraform plan
terraform apply
```

**Resources provisioned:**
- VPC with 3 AZs, public/private subnets, NAT gateway
- EKS cluster (Kubernetes 1.29) with managed node groups
- RDS PostgreSQL 15 (Multi-AZ in production, encrypted)
- ElastiCache Redis 7 (cluster mode, encrypted)
- Application Load Balancer with ACM TLS
- Route53 DNS records
- Secrets Manager for credentials
- CloudWatch log groups

### Helm (Kubernetes)

```bash
# Template (dry run)
make helm-template

# Install
make helm-install

# Upgrade
make helm-upgrade

# With custom values
helm install lispflow ./helm/lispflow \
  --set image.repository=myregistry/lispflow \
  --set image.tag=v1.0.0 \
  --set ingress.hosts[0].host=api.yourdomain.com \
  --set autoscaling.minReplicas=5
```

**Chart includes:**
- API deployment (3 replicas, security contexts, probes)
- Worker deployment (background processing)
- Migration job (pre-install Helm hook)
- HorizontalPodAutoscaler (CPU 70%, Memory 80%)
- NGINX ingress with cert-manager TLS
- Pod anti-affinity for high availability
- ConfigMap and Secret management

---

## Monitoring & Observability

### Prometheus Metrics (`/metrics`)

| Metric | Type | Description |
|--------|------|-------------|
| `lispflow_evaluations_total` | Counter | Evaluation count by status |
| `lispflow_evaluation_duration_seconds` | Histogram | Evaluation latency |
| `lispflow_plan_size_bytes` | Histogram | Plan size distribution |
| `lispflow_billing_events_total` | Counter | Billing events processed |
| `lispflow_billing_latency_seconds` | Histogram | End-to-end latency |
| `lispflow_http_requests_total` | Counter | HTTP request count |
| `lispflow_http_request_duration_seconds` | Histogram | HTTP request latency |

### Health Endpoints

| Endpoint | Purpose | Success | Failure |
|----------|---------|---------|---------|
| `GET /health` | Liveness | HTTP 200 | HTTP 500 |
| `GET /ready` | Readiness | HTTP 200 | HTTP 503 |

### Logging
- Structured JSON logging via `zap`
- Request ID propagation via middleware
- Per-request latency and status logging

---

## Security

| Feature | Implementation |
|---------|---------------|
| **Sandboxing** | All I/O functions stripped from zygomys interpreter |
| **Timeout Guards** | Evaluations abort after configurable timeout (default 100ms) |
| **Plan Size Limits** | Maximum plan size enforced (default 64KB) |
| **Transaction Safety** | `pgx` `Serializable` isolation for ledger writes |
| **Webhook Signing** | HMAC-SHA256 signatures on all webhook payloads |
| **Secrets Management** | Credentials stored in environment variables / Secrets Manager |
| **Container Security** | Distroless non-root images, read-only root filesystem |
| **Network Security** | Private subnets for databases, TLS termination at ALB |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- All tests pass (`make test`)
- Code is formatted (`make fmt`)
- Linting passes (`make lint`)
- Integration tests pass (`make integration`)

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Citation

If you use LispFlow in academic work, please cite:

```bibtex
@software{lispflow2026,
  title = {LispFlow: A Programmable, Homoiconic Usage-Based Billing Engine},
  author = {LispFlow Contributors},
  year = {2026},
  url = {https://github.com/YOUR_USERNAME/lispflow}
}
```

---

## Acknowledgments

- **zygomys** — The embedded Lisp interpreter that makes this possible
- **pgx** — PostgreSQL driver with excellent Go integration
- **Gin** — Fast, minimalist HTTP framework
- **Next.js** — React framework for the visual editor
- **Tailwind CSS** — Utility-first CSS framework

---

<div align="center">

**Built with ❤️ and a lot of parentheses.**

</div>
