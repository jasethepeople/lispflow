#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# LISPFLOW — Complete GitHub Push Script
# Run this from the lispflow/ directory
# ═══════════════════════════════════════════════════════════════════

set -e  # Exit on any error

REPO_NAME="lispflow"
GITHUB_USER=""
USE_SSH=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "go.mod" ] || [ ! -d "frontend" ]; then
    print_error "Not in the lispflow directory. Please cd to the project root."
    exit 1
fi

# Get GitHub username
if [ -z "$GITHUB_USER" ]; then
    echo ""
    read -p "Enter your GitHub username: " GITHUB_USER
    if [ -z "$GITHUB_USER" ]; then
        print_error "GitHub username is required"
        exit 1
    fi
fi

# Check if git is installed
if ! command -v git &> /dev/null; then
    print_error "git is not installed. Install it first:"
    echo "  Ubuntu/Debian: sudo apt-get install git"
    echo "  macOS: brew install git"
    exit 1
fi

# Check if git is configured
if [ -z "$(git config user.email 2>/dev/null)" ]; then
    print_warning "Git user email not configured"
    read -p "Enter your git email: " GIT_EMAIL
    git config --global user.email "$GIT_EMAIL"
    print_success "Git email set to $GIT_EMAIL"
fi

if [ -z "$(git config user.name 2>/dev/null)" ]; then
    print_warning "Git user name not configured"
    read -p "Enter your git name: " GIT_NAME
    git config --global user.name "$GIT_NAME"
    print_success "Git name set to $GIT_NAME"
fi

print_header "STEP 1: Initializing Git Repository"

if [ -d ".git" ]; then
    print_warning "Git repository already exists"
else
    git init
    git branch -M main
    print_success "Git repository initialized"
fi

print_header "STEP 2: Creating .gitignore"

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

print_success ".gitignore created"

print_header "STEP 3: Staging All Files"

git add -A

# Check what we're about to commit
FILE_COUNT=$(git diff --cached --numstat | wc -l | tr -d ' ')
print_success "$FILE_COUNT files staged for commit"

print_header "STEP 4: Creating Commit"

git commit -m "feat: initial LispFlow billing engine — complete production stack

Backend (Go):
- Sandboxed zygomys Lisp interpreter with 12 billing primitives
- Transactional pgx ledger with atomic evaluation
- Time-travel simulation for revenue forecasting
- Event ingestion pipeline with batching
- Webhook delivery with HMAC-SHA256 signing
- Plan versioning with atomic activation
- Prometheus metrics and health probes
- Graceful shutdown with context cancellation

Frontend (Next.js 14):
- Visual AST editor with drag-and-drop primitives
- Live Lisp expression preview with syntax highlighting
- Real-time plan evaluation against usage data
- Time-travel simulation with Recharts visualization
- Customer dashboard with billing history
- Dark mode support throughout

Infrastructure:
- Terraform: VPC, EKS, RDS, ElastiCache, ALB, Route53
- Helm chart with HPA, ingress, migration jobs
- Docker multi-stage distroless builds
- GitHub Actions CI/CD pipeline

Testing:
- 15 integration tests covering all pricing primitives
- Concurrency tests with 100 parallel evaluations
- Plan validation and size limit tests

Documentation:
- OpenAPI 3.0 specification
- Complete README with API examples
- Terraform and Helm deployment guides

Co-authored-by: LispFlow Team <dev@lispflow.io>"

print_success "Commit created with full project"

print_header "STEP 5: Setting Up Remote"

REMOTE_URL=""
if [ "$USE_SSH" = true ]; then
    REMOTE_URL="git@github.com:${GITHUB_USER}/${REPO_NAME}.git"
    echo "Using SSH authentication"
    echo ""
    echo "Make sure you have SSH keys set up:"
    echo "  1. Generate: ssh-keygen -t ed25519 -C 'your@email.com'"
    echo "  2. Add to GitHub: https://github.com/settings/keys"
    echo "  3. Test: ssh -T git@github.com"
    echo ""
else
    REMOTE_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
    echo "Using HTTPS authentication"
fi

# Check if remote already exists
if git remote | grep -q "origin"; then
    git remote set-url origin "$REMOTE_URL"
    print_success "Remote 'origin' updated to $REMOTE_URL"
else
    git remote add origin "$REMOTE_URL"
    print_success "Remote 'origin' added: $REMOTE_URL"
fi

print_header "STEP 6: Pushing to GitHub"

echo ""
echo "Before pushing, make sure:"
echo "  1. You created the repo at: https://github.com/new"
echo "  2. Repository name: $REPO_NAME"
echo "  3. Do NOT initialize with README (we have one)"
echo ""
read -p "Have you created the GitHub repository? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo ""
    echo "Please create the repository first:"
    echo "  https://github.com/new"
    echo ""
    echo "Then run this script again."
    exit 0
fi

echo ""
echo "Pushing to GitHub..."
git push -u origin main

print_success "Successfully pushed to GitHub!"

print_header "DONE — What's Next?"

echo ""
echo -e "${GREEN}Repository URL:${NC}"
echo "  https://github.com/$GITHUB_USER/$REPO_NAME"
echo ""
echo -e "${GREEN}Clone URL (for others):${NC}"
if [ "$USE_SSH" = true ]; then
    echo "  git@github.com:$GITHUB_USER/$REPO_NAME.git"
else
    echo "  https://github.com/$GITHUB_USER/$REPO_NAME.git"
fi
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Enable GitHub Actions: https://github.com/$GITHUB_USER/$REPO_NAME/actions"
echo "  2. Add repository secrets for CI/CD"
echo "  3. Set up branch protection rules"
echo "  4. Configure Terraform backend bucket"
echo "  5. Deploy to your Kubernetes cluster"
echo ""
echo -e "${BLUE}Run locally:${NC}"
echo "  make all              # Build everything"
echo "  make test             # Run tests"
echo "  make integration      # Run integration tests"
echo "  cd frontend && npm run dev  # Start frontend"
echo ""
