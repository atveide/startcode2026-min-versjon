# startcode2026

Monorepo with a FastAPI backend and a React (Vite + TypeScript) frontend.

```
backend/                FastAPI app (Python, managed with uv)
frontend/               React app (Vite + TypeScript)
adressa-hackathon-kit/  Adressa design system + reference news app
```

## Design system

`adressa-hackathon-kit/` holds the (unofficial) Adressa design system: tokens, logos, fonts, images, React components and a working reference app. Start with its [README](adressa-hackathon-kit/README.md).

- Quick look without installing anything: open `adressa-hackathon-kit/DESIGN_PREVIEW.html` in a browser.
- Tokens: `adressa-hackathon-kit/design-system/` (`tokens.json` is the source, `tokens.css` / `tokens.ts` are generated).
- Assets: `adressa-hackathon-kit/public/assets/` (brand, fonts, images).
- Design rules: `adressa-hackathon-kit/docs/DESIGN_SYSTEM.md`.
- Run the reference app (needs Node 22.12+): `cd adressa-hackathon-kit && npm ci && npm run dev`.

## Setup

Requires [uv](https://docs.astral.sh/uv/) and Node 20.19+.

```sh
make install
```

The quiz needs an Anthropic API key to judge guesses. Put it in `backend/.env` (copy `backend/.env.example`):

```sh
ANTHROPIC_API_KEY=sk-ant-...
```

## Development

```sh
make dev        # runs both servers
make backend    # http://localhost:8000  (docs at /docs)
make frontend   # http://localhost:5173  (proxies /api -> backend)
```

A second setup can run next to it: start the backend with `--port 8010` and the frontend with `API_TARGET=http://localhost:8010` (see `.claude/launch.json`).

## News from Adressa (the scraper)

The feed and the quiz are built on the week's student-relevant stories from Adresseavisen. The scraper in `backend/app/scraper/` reads them with your own Adressa subscription:

```sh
make adressa-login   # once, and again when the scraper says LOGIN_REQUIRED
make scrape          # the week's stories into backend/cache/adressa
make news            # scrape, then new questions and week.json, then the summaries
```

It reads `adressa.no/rss` and picks the up to 8 news stories from the last week that matter most to students: topics in the title or lead count fully, Adressa's own tags count half, and opinion, ads and video are left out. Each story is opened in a hidden Chrome with the saved login, and only text the logged-in page shows is kept. A story behind a paywall is skipped, and a failed run keeps the last import.

The cache (`backend/cache/adressa/`: `articles.json`, the photos and `import-status.json`) is subscription content. It is git-ignored and stays on this machine. The hosted backend only gets the public facts in `backend/app/data/week.json` and the questions, so commit `backend/app/data/` after `make news`.

**Pause:** while `backend/cache/adressa/PAUSED` exists, the scraper fetches nothing and the app keeps the last import. Delete the file to fetch new stories again.

Settings in `backend/.env`: `ADRESSA_CACHE_DIR` (`cache/adressa`), `ADRESSA_PROFILE_DIR` (the browser profile with the login, which must be outside the repo) and `ADRESSA_BROWSER` (`chrome` or `chromium`).

## Photos and videos

The backend owns the media and serves it under `/api/media/`. None of the files are in git.

- **Story photos:** the scraper saves them in `backend/cache/adressa/images/`, served at `/api/media/adressa/<file>`. The hosted backend has no copy, so `npm run build` puts them in `frontend/dist/private/images/` with the full stories (see below).
- **Videos:** `make videos ZIP=/path/to/archive.zip` puts the clips in `backend/media/videos/`, served at `/api/media/video/<file>`. The manifest, `backend/app/data/videos.json`, is in git. The hosted backend has no copy, so `npm run build` copies the clips into `frontend/dist/media/video/` and the backend points there (`VIDEO_PUBLIC_URL`). The hosted frontend is therefore deployed from a local build.

## Hosting

- **Backend (Render, `startcode-august-api`)** builds the `demo` branch of `atveide/startcode2026-min-versjon` on every push. It has no Adressa cache and no videos, so `/api/stories` gives only the public facts. The free plan sleeps after 15 quiet minutes and takes about a minute to wake; the app waits for it.
- **Frontend (Netlify, `startcode-august-demo`)** is deployed from a local build, since the build carries what isn't in git: Acta and Stag, the videos, and the full stories. `npm run build` writes Adressa's summary, the article text, the photos and Oppdatert's bullet points from the local import to `dist/private/`, and the app adds them to the public stories.
- **Password:** the whole hosted site, `/private/` and `/api` included, is behind one password (`frontend/netlify/edge-functions/password.ts`). It lives in Netlify's `SITE_PASSWORD`; a reader who gives it gets a cookie for 30 days, and a new password logs everyone out. Without `SITE_PASSWORD` the site doesn't open.

```sh
make summaries                                          # Oppdatert's bullet points for the current import
npm --prefix frontend run build
netlify deploy --prod --no-build --site a2aca2f5-f955-4c0f-acc4-baa54e0a03ec --dir frontend/dist
NETLIFY_SITE_ID=a2aca2f5-f955-4c0f-acc4-baa54e0a03ec netlify env:set SITE_PASSWORD '<nytt passord>'   # change it, then deploy again
```

## Tests

```sh
make test
```
