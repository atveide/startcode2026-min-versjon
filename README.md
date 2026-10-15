# startcode2026 – min versjon

Augusts egen kopi av `lekegrind`-branchen fra [gerhardadler/startcode2026ny](https://github.com/gerhardadler/startcode2026ny), for å prøve meg frem. Live: https://startcode-august-demo.netlify.app

Monorepo with a FastAPI backend and a React (Vite + TypeScript) frontend.

```
backend/                FastAPI app (Python, managed with uv)
frontend/               React app (Vite + TypeScript)
adressa-hackathon-kit/  Adressa design system + reference news app
```

## Opplyst

Opplyst makes it fun to keep up with the news. Every day there is a new game built on the week's news from Adresseavisen: it rewards people who have been paying attention, and sends everyone else to the stories they need to read.

1. **Front page** (`/`): the week's three biggest stories and a button that starts today's game.
2. **Dagens spill** (`/quiz`): fill in the missing word in five sentences from this week's stories. Claude judges each guess by meaning, so close guesses score high. Hints cost a point; skipping scores zero. A new game every day (Oslo time), so you come back daily to see how informed you are.
3. **Stuck? Read the story.** Under each question is the story behind it; after a wrong guess it turns into a clear nudge (`/sak/<id>?fra=quiz`). The story keeps the question on screen and has one button back to it.
4. **Results**, then the **feed**: full-bleed story cards with Adressa's own short summary, search, categories, saved stories and the full story.

The design is ported from the Adressa feed prototype (dark only). Game progress, saved stories and the reading log live in the browser's localStorage.

| Where | What |
| --- | --- |
| `backend/app/data/week.json` | The week's stories: public facts only (title, link, section, time, lead) |
| `backend/app/headlines.py` | The week's question pool and how today's five are picked |
| `backend/app/stories.py` | Merges `week.json` with the local Adressa import, if there is one |
| `frontend/src/components/` | Pages: `HomePage`, `QuizPage`, `StoryPage`, `SavedPage` |
| `frontend/src/styles.css` | All styling, on top of the Adressa tokens in `tokens.css` |

### Adressa content

The stories are real articles from Adresseavisen (Polaris Media), picked for students by the local import in the feed project (`npm run import:adressa`, which reads them with your own subscription). Article text, Adressa's «Kort oppsummert» and press photos are not ours to publish, so they never go into git and never reach the hosted app:

- **Locally**, set `ADRESSA_CACHE_DIR` in `backend/.env` to the import's `data/adressa` folder. Stories then show Adressa's summary (with its AI and editorial disclosure), the article text and the photos, served from `/api/media/adressa/…`.
- **Without the cache** (Render, or a teammate's machine) the game works the same, and every story shows its title, lead and a button to read it on adressa.no.

**A new week:** run the import, then write the public list and new questions:

```sh
cd backend
uv run python -m app.export_week /path/to/vgx-local/data/adressa/articles.json
```

Then replace the pool in `headlines.py` with questions about the new stories. Every answer must be in its story but not in its title (the game shows the title). The tests check both; the first needs the local cache.

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

## Tests

```sh
make test
```
