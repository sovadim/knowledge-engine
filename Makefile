.PHONY: up down backend

backend:
	cd backend && uv sync

up: backend
	cd backend && uv run uvicorn main:app --reload &
	@echo "Backend started"

down:
	@pkill -f "uvicorn main:app" || true
	@echo "Backend stopped"
