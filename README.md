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

## Tests

```sh
make test
```
