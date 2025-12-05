.PHONY: demo frontend-init backend-init backend frontend start stop

demo: start
	cd demo && uv sync
	cd demo && uv run python main.py

frontend-init:
	cd frontend && npm install

frontend: frontend-init
	cd frontend && npm run dev &
	@echo "Frontend started"

backend-init:
	cd backend && uv sync

backend:
	cd backend && uv run uvicorn main:app --reload &
	@echo "Backend started"

start: backend frontend

stop:
	@pkill -f "uvicorn main:app" || true
	@pkill -f "npm run dev" || true
	@echo "Backend and frontend stopped"

check:
	cd backend && uv run ruff check
	cd demo && uv run ruff check
