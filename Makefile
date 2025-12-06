<<<<<<< Updated upstream
.PHONY: demo frontend-init backend-init backend frontend start stop

demo: start
=======
.PHONY: demo up down backend frontend all

demo: up
	@echo "Waiting for backend to start..."
	@sleep 2
>>>>>>> Stashed changes
	cd demo && uv sync
	cd demo && uv run python main.py
	@echo "Demo data loaded. Starting frontend..."
	@echo "Frontend will be available at http://localhost:5173/graph"
	cd frontend && npm run dev

frontend-init:
	cd frontend && npm install

frontend: frontend-init
	cd frontend && npm run dev &
	@echo "Frontend started"

backend-init:
	cd backend && uv sync

backend:
	cd backend && uv run uvicorn main:app --reload &
	@echo "Backend started on http://localhost:8000"

<<<<<<< Updated upstream
start: backend frontend
=======
down:
	@pkill -f "uvicorn main:app" || true
	@pkill -f "vite" || true
	@echo "Backend and frontend stopped"
>>>>>>> Stashed changes

stop:
	@pkill -f "uvicorn main:app" || true
	@pkill -f "npm run dev" || true
	@echo "Backend and frontend stopped"

all: up
	@echo "Waiting for backend to start..."
	@sleep 2
	@echo "Starting frontend..."
	@cd frontend && npm run dev

check:
	cd backend && uv run ruff check
	cd demo && uv run ruff check
