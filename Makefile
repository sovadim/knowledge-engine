.PHONY: demo up down backend

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

check:
	cd backend && uv run ruff check
	cd demo && uv run ruff check
