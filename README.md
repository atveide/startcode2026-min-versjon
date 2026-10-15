# startcode2026 – min versjon

Augusts egen kopi av `lekegrind`-branchen fra [gerhardadler/startcode2026ny](https://github.com/gerhardadler/startcode2026ny), for å prøve meg frem. Live: https://startcode-august-demo.netlify.app

Monorepo with a FastAPI backend and a React (Vite + TypeScript) frontend.

```
backend/                FastAPI app (Python, managed with uv)
frontend/               React app (Vite + TypeScript)
adressa-hackathon-kit/  Adressa design system + reference news app
```

## Opplyst

Opplyst makes it fun to keep up with the news: a weekly news quiz rewards people who have been paying attention, and sends everyone else to the stories they need to read.

1. **Front page** (`/`): the week's three biggest stories and a button that starts the week's quiz.
2. **Quiz** (`/quiz`): fill in the missing word in five headlines from this week's stories. Claude judges each guess by meaning, so close guesses score high. Hints cost a point; giving up scores zero.
3. **Stuck? Read the story.** After a wrong guess, the quiz points to the story that holds the answer (`/sak/<id>?fra=quiz`). The story keeps the question on screen and has one button back to it.
4. **Results**, then the **feed**: a vertical feed of full-bleed story cards with short summaries, search, categories, saved stories and a "go deeper" view per story.

The design is ported from the Adressa feed prototype (dark only). Quiz progress, saved stories and the reading log live in the browser's localStorage.

| Where | What |
| --- | --- |
| `backend/app/data/stories.json` | The week's stories (summary, developments, background, Q&A, sources) |
| `backend/app/headlines.py` | The quiz: one headline per story, the hidden word, and the quiz id/week |
| `frontend/src/components/` | Pages: `HomePage`, `QuizPage`, `StoryPage`, `SavedPage` |
| `frontend/src/styles.css` | All styling, on top of the Adressa tokens in `tokens.css` |

A new week means new stories in `stories.json`, new headlines in `headlines.py` and a new `QUIZ_ID`, which starts everyone on a fresh round. A test checks that every answer appears in its story.

**Content:** the five stories are a saved selection from VG (15 October 2026) standing in for Polaris Media journalism. The press photos are not in git because we don't have the right to publish them; see `frontend/public/assets/photos/README.md`. Without them the app shows a graphic panel instead.

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
