.PHONY: demo frontend-init backend-init backend frontend start stop

all: demo

demo: start
	@echo "Loading demo..."
	@cd demo && uv sync
	@cd demo && uv run python main.py
	@echo "Demo data loaded"

frontend-init:
	@cd frontend && npm install

frontend: frontend-init
	@echo "Starting frontend..."
	@cd frontend && npm run dev &
	@echo "Frontend started http://localhost:5173"

backend-init:
	@cd backend && uv sync

backend:
	@echo "Starting backend..."
	@cd backend && uv run uvicorn main:app --reload &
	@echo "Backend started on http://localhost:8000"

start: backend frontend

stop:
	@echo "Stopping backend and frontend..."
	@pkill -f "uvicorn main:app" || true
	@pkill -f "npm run dev" || true
	@echo "Backend and frontend stopped"

check:
	cd backend && uv run ruff check
	cd demo && uv run ruff check
