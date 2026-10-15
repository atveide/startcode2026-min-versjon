.PHONY: install dev backend frontend test

install:
	cd backend && uv sync
	cd frontend && npm install

backend:
	cd backend && uv run fastapi dev app/main.py

frontend:
	cd frontend && npm run dev

dev:
	$(MAKE) -j2 backend frontend

test:
	cd backend && uv run pytest
	cd frontend && npm run typecheck
