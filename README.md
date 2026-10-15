# startcode2026ny

Monorepo with a FastAPI backend and a React (Vite + TypeScript) frontend.

```
backend/   FastAPI app (Python, managed with uv)
frontend/  React app (Vite + TypeScript)
```

## Setup

Requires [uv](https://docs.astral.sh/uv/) and Node 20.19+.

```sh
make install
```

## Development

```sh
make dev        # runs both servers
make backend    # http://localhost:8000  (docs at /docs)
make frontend   # http://localhost:5173  (proxies /api -> backend)
```

## Tests

```sh
make test
```
