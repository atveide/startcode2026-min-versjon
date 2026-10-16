.PHONY: install dev backend frontend test summaries videos

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

# Opplyst's short versions of the imported stories (Claude Sonnet, cached).
summaries:
	cd backend && uv run python -m app.summaries

# Import a zip of Adressa videos: make videos ZIP=/path/to/archive.zip
videos:
	cd backend && uv run python -m app.import_videos "$(ZIP)"
