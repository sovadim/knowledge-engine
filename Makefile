.PHONY: demo up down backend frontend

demo: up
	cd demo && uv sync
	cd demo && uv run python main.py

backend:
	cd backend && uv sync

up: backend
	cd backend && uv run uvicorn main:app --reload &
	@echo "Backend started"

down:
	@pkill -f "uvicorn main:app" || true
	@echo "Backend stopped"

frontend:
	cd frontend && npm install
	cd frontend && npm run dev

check:
	cd backend && uv run ruff check
	cd demo && uv run ruff check
