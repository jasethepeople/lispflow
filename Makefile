.PHONY: build test migrate run docker clean lint fmt deps integration           terraform-init terraform-plan terraform-apply terraform-destroy           helm-install helm-upgrade helm-uninstall helm-template

BINARY_API=api
BINARY_WORKER=worker
BINARY_MIGRATE=migrate

# ── Go Commands ──────────────────────────────────────────────────────────

build:
	CGO_ENABLED=0 go build -ldflags="-w -s" -o bin/$(BINARY_API) ./cmd/api
	CGO_ENABLED=0 go build -ldflags="-w -s" -o bin/$(BINARY_WORKER) ./cmd/worker
	CGO_ENABLED=0 go build -ldflags="-w -s" -o bin/$(BINARY_MIGRATE) ./cmd/migrate

test:
	go test -v -race -coverprofile=coverage.out ./...

integration:
	go test -v -tags=integration ./tests/integration/...

migrate:
	go run ./cmd/migrate

run:
	go run ./cmd/api

# ── Code Quality ─────────────────────────────────────────────────────────

lint:
	golangci-lint run ./...

fmt:
	go fmt ./...

deps:
	go mod download
	go mod tidy

# ── Docker ────────────────────────────────────────────────────────────────

docker:
	docker build -f docker/Dockerfile -t lispflow:latest .

docker-compose-up:
	docker compose up --build

docker-compose-down:
	docker compose down -v

# ── Terraform ────────────────────────────────────────────────────────────

terraform-init:
	cd terraform/environments/staging && terraform init
	cd terraform/environments/prod && terraform init

terraform-plan:
	cd terraform/environments/staging && terraform plan

terraform-apply:
	cd terraform/environments/staging && terraform apply

terraform-destroy:
	cd terraform/environments/staging && terraform destroy

# ── Helm ─────────────────────────────────────────────────────────────────

helm-template:
	helm template lispflow ./helm/lispflow

helm-install:
	helm install lispflow ./helm/lispflow

helm-upgrade:
	helm upgrade lispflow ./helm/lispflow

helm-uninstall:
	helm uninstall lispflow

# ── OpenAPI ──────────────────────────────────────────────────────────────

openapi-validate:
	swagger-cli validate openapi/openapi.yaml

openapi-docs:
	redoc-cli build openapi/openapi.yaml -o docs/api.html

# ── Cleanup ──────────────────────────────────────────────────────────────

clean:
	rm -rf bin/ coverage.out docs/api.html

# ── All-in-one ───────────────────────────────────────────────────────────

all: deps fmt lint test build
