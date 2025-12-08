.PHONY: demo up down backend frontend all

demo: up
	@echo "Waiting for backend to start..."
	@sleep 2
	cd demo && uv sync
	cd demo && uv run python main.py
	@echo "Demo data loaded. Starting frontend..."
	@echo "Frontend will be available at http://localhost:5173/graph"
	cd frontend && npm run dev

frontend-init:
	@cd frontend && npm install

frontend: frontend-init
	@echo "Starting frontend..."
	@cd frontend && npm run dev &
	@echo "Frontend started http://localhost:5173"

backend-init:
	@cd backend && uv sync

up: backend
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
