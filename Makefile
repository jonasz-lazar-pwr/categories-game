# === Makefile ===

COMPOSE_DEV  = docker compose -f infra/docker-compose.dev.yml
COMPOSE_PROD = docker compose -f infra/docker-compose.yml

.PHONY: \
	install format lint test check \
	dev dev-down dev-rebuild dev-logs \
	dev-shell-backend dev-shell-frontend dev-shell-db \
	prod prod-down prod-rebuild prod-logs \
	migrate db-studio db-reset \
	clean clean-docker clean-docker-volumes help

.DEFAULT_GOAL := help

# ===========================
# Local
# ===========================

install:
	npm install --prefix backend
	npm install --prefix frontend

format:
	npm run format --prefix frontend
	npm run format --prefix backend

lint:
	npm run lint --prefix frontend
	npm run lint --prefix backend

test:
	npm run test --prefix backend
	npm run test --prefix frontend

check: format lint test
	npm run type-check --prefix backend
	npm run type-check --prefix frontend

# ===========================
# Docker — dev
# ===========================

dev:
	$(COMPOSE_DEV) up -d --build

dev-down:
	$(COMPOSE_DEV) down

dev-rebuild:
	$(COMPOSE_DEV) down
	$(COMPOSE_DEV) up -d --build

dev-logs:
	$(COMPOSE_DEV) logs -f

dev-shell-backend:
	$(COMPOSE_DEV) exec backend sh

dev-shell-frontend:
	$(COMPOSE_DEV) exec frontend sh

dev-shell-db:
	$(COMPOSE_DEV) exec postgres psql -U $${POSTGRES_USER} -d $${POSTGRES_DB}

# ===========================
# Docker — prod
# ===========================

prod:
	$(COMPOSE_PROD) up -d --build

prod-down:
	$(COMPOSE_PROD) down

prod-rebuild:
	$(COMPOSE_PROD) down
	$(COMPOSE_PROD) up -d --build

prod-logs:
	$(COMPOSE_PROD) logs -f

# ===========================
# Database
# ===========================

migrate:
	$(COMPOSE_DEV) exec backend npx prisma migrate dev

db-studio:
	$(COMPOSE_DEV) exec backend npx prisma studio

db-reset:
	@echo "WARNING: This will delete all data in the dev database."
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ]
	$(COMPOSE_DEV) exec backend npx prisma migrate reset --force

# ===========================
# Clean
# ===========================

clean:
	rm -rf backend/dist backend/coverage
	rm -rf frontend/dist frontend/coverage

clean-docker:
	docker image rm categories-game-backend:latest categories-game-frontend:latest 2>/dev/null || true

clean-docker-volumes:
	@echo "WARNING: This will delete all Docker volumes including the database."
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ]
	$(COMPOSE_DEV) down -v
	$(COMPOSE_PROD) down -v

# ===========================
# Help
# ===========================

help:
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Local"
	@echo "  install              Install dependencies in backend and frontend"
	@echo "  format               Format code with Prettier"
	@echo "  lint                 Lint code with ESLint"
	@echo "  test                 Run tests"
	@echo "  check                Format + lint + type-check + test"
	@echo ""
	@echo "Docker — dev"
	@echo "  dev                  Start dev containers"
	@echo "  dev-down             Stop and remove dev containers"
	@echo "  dev-rebuild          Rebuild and restart dev containers"
	@echo "  dev-logs             Stream logs from all dev containers"
	@echo "  dev-shell-backend    Open shell in backend container"
	@echo "  dev-shell-frontend   Open shell in frontend container"
	@echo "  dev-shell-db         Open psql in postgres container"
	@echo ""
	@echo "Docker — prod"
	@echo "  prod                 Start prod containers"
	@echo "  prod-down            Stop and remove prod containers"
	@echo "  prod-rebuild         Rebuild and restart prod containers"
	@echo "  prod-logs            Stream logs from all prod containers"
	@echo ""
	@echo "Database"
	@echo "  migrate              Create and apply new migration (interactive)"
	@echo "  db-studio            Open Prisma Studio"
	@echo "  db-reset             Reset dev database (WARNING: deletes all data)"
	@echo ""
	@echo "Clean"
	@echo "  clean                Remove build artifacts and coverage"
	@echo "  clean-docker         Remove project Docker images"
	@echo "  clean-docker-volumes Remove volumes including database (WARNING)"
	@echo ""
