# startcode2026 – min versjon

Augusts egen kopi av `lekegrind`-branchen fra [gerhardadler/startcode2026ny](https://github.com/gerhardadler/startcode2026ny), for å prøve meg frem. Live: https://startcode-august-demo.netlify.app

Monorepo with a FastAPI backend and a React (Vite + TypeScript) frontend.

```
backend/                FastAPI app (Python, managed with uv)
frontend/               React app (Vite + TypeScript)
adressa-hackathon-kit/  Adressa design system + reference news app
```

## Opplyst

Opplyst fra Adressa makes one news story at a time easy to understand, for students. A daily quiz is the way in: it rewards people who follow the news and sends everyone else to the stories.

1. **Start** (`/`, the Quiz tab): a short invitation to today's quiz on a photo of Bakklandet. Not started, in progress or finished, it says so; the first visit with a new quiz opens here, later visits the same day go back to where you were.
2. **Dagens quiz** (`/quiz`): three sentences from this week's news, each with one word missing (Oslo time decides the day). Every guess gets a **closeness score 0–100** from Claude, shown as Kaldt / Lunkent / Varmt with your earlier guesses; only the backend's verdict solves a question. Points are separate: 10 for a first-try answer, minus 1 per extra guess and per letter hint, 0 for skipping (which shows the answer). Reading the story is free and comes back to the same question, with your draft, guesses and hints kept.
3. **Result** (`/quiz/svar`): how it went, question by question, with a button into each story.
4. **Nyheter** (`/nyheter`): one full-screen item per swipe, mixing photo stories and Adressa's own vertical videos in a stable order. Photo stories show Opplyst's bullet-point short version; videos play only while on screen (muted until you turn sound on), with their subtitles left uncovered. The end of the feed links to adressa.no for more stories.
5. **Lagret** (`/lagret`): saved stories and videos, on this device.

The look is the dark mode of the (unofficial) Adressa hackathon kit v2: black surfaces, white text, `#83C9ED` actions, Bitter headlines and Inter text. Progress, saved items and the reading position live in the browser's localStorage.

| Where | What |
| --- | --- |
| `backend/app/data/week.json` | The week's stories: public facts only (title, link, section, time, lead) |
| `backend/app/headlines.py` | Loads the week's question pool and picks today's three |
| `backend/app/generate_questions.py` | Makes the question pool from the local Adressa import with Claude |
| `backend/app/stories.py` | Merges `week.json` with the local Adressa import, if there is one |
| `backend/app/summaries.py` | Opplyst's short versions, written by Claude Sonnet and cached |
| `backend/app/videos.py`, `data/videos.json` | The video manifest, media delivery and the mixed feed order |
| `backend/app/import_videos.py` | Imports a zip of Adressa videos: checks, web copies, posters, manifest |
| `frontend/src/components/` | Pages: `StartPage`, `QuizPage`, `FeedPage`, `StoryPage`, `SavedPage` |
| `frontend/src/styles.css` | All styling, on top of the Adressa tokens in `tokens.css` |

### Opplyst's short versions

Each imported story gets two or three short bullet points written by Claude Sonnet (`SUMMARY_MODEL`, default `claude-sonnet-5-5`) from the article text, labelled «Oppsummert av Opplyst med KI» with Adresseavisen as the source. Adressa's own «Kort oppsummert» stays as it is, in the story. They are made by a command, never while the app is used, and cached in the local database by story id, a hash of the text, prompt version and model:

```sh
make summaries                                   # or: cd backend && uv run python -m app.summaries
cd backend && uv run python -m app.summaries --check   # report only, no model calls
```

It checks the model with the Models API first and stops rather than switch models, then reports how many were made, reused, skipped and failed. A story without a short version (no key, no article text, a refusal or an answer in the wrong form) shows its lead, labelled as Adressa's.

### Videos

`make videos ZIP=/path/to/archive.zip` (or `cd backend && uv run python -m app.import_videos <zip>`) checks every archive member, keeps the originals in `backend/media/videos/original/`, makes H.264/AAC web copies with faststart and a poster from a real frame (needs `ffmpeg`), and writes `backend/app/data/videos.json` with the source facts from the archive's `LES_MEG.txt`. The media folder is git-ignored; the backend serves the files with byte ranges from `/api/media/video/…`, and a clip whose files are missing is simply left out of the feed. `articleId` stays `null` until a clip is documented to belong to a story in the import; titles corrected by hand in the manifest are kept on the next import.

### Adressa content

The stories are real articles from Adresseavisen (Polaris Media), picked for students by the local import in the feed project (`npm run import:adressa`, which reads them with your own subscription). Article text, Adressa's «Kort oppsummert» and press photos are not ours to publish, so they never go into git and reach the hosted app only encrypted, for the readers given a link:

- **Locally**, set `ADRESSA_CACHE_DIR` in `backend/.env` to the import's `data/adressa` folder. Stories then show Adressa's summary (with its AI and editorial disclosure), the article text and the photos, served from `/api/media/adressa/…`.
- **Without the cache** (Render, or a teammate's machine) the game works the same, and every story shows its title, lead and a button to read it on adressa.no.
- **With an unlock link** the hosted app shows the full stories too, with Opplyst's bullet points. `frontend/scripts/encrypt-stories.mjs` encrypts them from the local cache into `frontend/public/private/stories.enc.json`, with one personal key per reader. The key travels in the link's `#nokkel=…`, which never reaches a server; the app keeps it on the device and decrypts there. Keys, links and the package are git-ignored, so only the deployed app carries the ciphertext.

  ```sh
  npm --prefix frontend run encrypt -- --testers 10   # or --add Kari Ola; links land in frontend/.reader-links.txt
  npm --prefix frontend run encrypt -- --remove Ola   # takes Ola's access away
  npm --prefix frontend run encrypt                   # after each import, same links
  ```

  Then build and deploy the frontend. A reader who added the app to the Home Screen pastes the link under the menu's «Lås opp hele sakene».

**A new week:** run the import, then make the public list and the questions in one go:

```sh
cd backend
uv run python -m app.generate_questions
```

It reads the stories from `ADRESSA_CACHE_DIR`, writes `data/week.json` and asks Claude for two fill-in-the-blank questions per story into `data/questions.json` (just the sentence, the answer and the story id). Then run `make summaries` for the new stories' short versions. Suggestions whose answer isn't in the story, or that the title or the sentence gives away, or that copy the article, are thrown out. `app.export_week` still writes only `week.json`. The tests check the pool too; the answer check needs the local cache.

### Deploy

Neither host builds from GitHub on its own.

- **Backend (Render, `startcode-august-api`)** builds from the public repo `atveide/startcode2026-min-versjon`: push `main` there, then start the deploy with `render deploys create srv-db8hm88473hc73f07bb0`. It has no Adressa cache and no video files; the stories show their public facts, and the videos point to the copies on Netlify (`VIDEO_PUBLIC_URL`).
- **Frontend (Netlify, `startcode-august-demo`)** is deployed from a local build, since it carries git-ignored files:

  ```sh
  make summaries                          # Opplyst's bullet points for the current import
  npm --prefix frontend run videos        # web copies and posters into public/media/video/
  npm --prefix frontend run encrypt       # full stories and bullet points, for readers with a key
  npm --prefix frontend run build
  netlify deploy --prod --site a2aca2f5-f955-4c0f-acc4-baa54e0a03ec --dir frontend/dist
  ```

  The videos are served publicly from `/media/video/`; the stories and Opplyst's bullet points stay encrypted for readers with an unlock link.

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
