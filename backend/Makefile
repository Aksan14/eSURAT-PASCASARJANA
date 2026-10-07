.PHONY: help dev run build migrate-up migrate-down migrate-status migrate-seed migrate-fresh db-up db-down test tidy

help:
	@echo "Perintah:"
	@echo "  make db-up           Jalankan PostgreSQL + MinIO via Docker Compose"
	@echo "  make db-down         Hentikan container"
	@echo "  make migrate-up      Jalankan migrasi GORM yang belum diterapkan"
	@echo "  make migrate-down    Rollback migrasi terakhir"
	@echo "  make migrate-status  Status migrasi"
	@echo "  make migrate-seed    Seed admin + data demo"
	@echo "  make migrate-fresh   Drop semua tabel → migrasi ulang → seed (dev)"
	@echo "  make run             Jalankan server"
	@echo "  make build           Build binary ke ./bin"

db-up:
	docker compose up -d postgres minio

db-down:
	docker compose down

migrate-up:
	go run ./cmd/migrate up

migrate-down:
	go run ./cmd/migrate rollback

migrate-status:
	go run ./cmd/migrate status

migrate-seed:
	go run ./cmd/migrate seed

migrate-fresh:
	go run ./cmd/migrate fresh

run:
	go run ./cmd/server

build:
	mkdir -p bin
	go build -o bin/server ./cmd/server
	go build -o bin/migrate ./cmd/migrate

test:
	go test ./...

tidy:
	go mod tidy
