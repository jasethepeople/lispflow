#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           LISPFLOW — Repository Initialization               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "ERROR: git is not installed"
    echo "Install it:"
    echo "  Ubuntu:  sudo apt-get install git"
    echo "  macOS:   brew install git"
    exit 1
fi

# Initialize git
echo "→ Initializing git repository..."
git init
git branch -M main

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    echo "→ Creating .gitignore..."
    cat > .gitignore << 'EOF'
# Binaries
bin/
*.exe
*.dll
*.so
*.dylib
*.test
*.out

# Go
vendor/
go.sum

# IDE
.idea/
.vscode/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Config with secrets
config.local.yaml
.env
.env.local
*.env

# Test coverage
coverage.out
coverage.html

# Docker
docker-compose.override.yml

# K8s secrets
*.secret.yaml
secrets/

# Node.js / Frontend
frontend/node_modules/
frontend/.next/
frontend/out/
frontend/dist/
frontend/.env.local
frontend/npm-debug.log*
frontend/yarn-debug.log*
frontend/yarn-error.log*

# Terraform
terraform/**/.terraform/
terraform/**/*.tfstate
terraform/**/*.tfstate.*
terraform/**/*.tfvars
terraform/**/.terraform.lock.hcl

# Helm
helm/**/*.tgz
helm/**/charts/*.tgz
EOF
fi

# Add all files
echo "→ Staging files..."
git add -A

# Count files
FILE_COUNT=$(git diff --cached --numstat | wc -l | tr -d ' ')
echo "→ $FILE_COUNT files staged"

# Commit
echo "→ Creating initial commit..."
git commit -m "feat: initial LispFlow billing engine — complete production stack

This commit includes the entire LispFlow platform:

BACKEND (Go):
• Sandboxed zygomys Lisp interpreter
• 12 billing primitives (tiered, volume, overage, discount, etc.)
• Transactional PostgreSQL ledger with pgx
• Time-travel simulation engine
• Event ingestion with batching
• Webhook delivery with HMAC-SHA256
• Plan versioning with atomic activation
• Prometheus metrics + health probes
• Graceful shutdown

FRONTEND (Next.js 14):
• Visual AST editor (drag-and-drop)
• Live Lisp expression preview
• Real-time plan evaluation
• Time-travel simulation with charts
• Customer dashboard
• Dark mode support

INFRASTRUCTURE:
• Terraform: AWS VPC, EKS, RDS, ElastiCache, ALB
• Helm chart with HPA, ingress, migration hooks
• Docker multi-stage distroless builds
• GitHub Actions CI/CD

TESTING:
• 15 integration tests
• Concurrency tests (100 parallel evals)
• Plan validation tests

DOCUMENTATION:
• OpenAPI 3.0 spec
• Complete README
• Deployment guides"

echo ""
echo "✓ Repository initialized successfully!"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "NEXT STEPS:"
echo ""
echo "1. Create GitHub repository:"
echo "   https://github.com/new"
echo "   Name: lispflow"
echo "   Do NOT initialize with README"
echo ""
echo "2. Add remote and push:"
echo "   SSH:   git remote add origin git@github.com:YOUR_USER/lispflow.git"
echo "   HTTPS: git remote add origin https://github.com/YOUR_USER/lispflow.git"
echo "   git push -u origin main"
echo ""
echo "OR run the automated script:"
echo "   ./push-to-github.sh"
echo ""
echo "═══════════════════════════════════════════════════════════════"
