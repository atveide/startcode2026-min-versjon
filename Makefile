.PHONY: install dev backend frontend test summaries videos scrape adressa-login news

install:
	cd backend && uv sync --group scraper
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

# The week's student-relevant Adressa articles into backend/cache/adressa, read with your own
# Adressa login. Does nothing while backend/cache/adressa/PAUSED exists. Options: ARGS="--limit 10"
scrape:
	cd backend && uv run --group scraper python -m app.scraper $(ARGS)

# Log in to Adressa in the scraper's own browser profile (when the import says LOGIN_REQUIRED).
adressa-login:
	cd backend && uv run --group scraper python -m app.scraper.login

# The whole weekly news update: scrape, then the question pool and week.json, then the
# summaries. Stops at the scrape while it is paused. Commit backend/app/data/ afterwards.
news: scrape
	cd backend && uv run python -m app.generate_questions
	$(MAKE) summaries
