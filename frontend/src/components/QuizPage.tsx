import {
  CSSProperties,
  FormEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Headline } from "../api";
import { Icon } from "../icons";
import { formatDay, normalize } from "../logic";
import {
  BLANK,
  Guess,
  heat,
  HEAT_LABEL,
  isComplete,
  isDone,
  MAX_POINTS,
  pointsFor,
  QuestionState,
  shareText,
  totalPoints,
  verdict,
} from "../quiz";
import { Link, navigate } from "../router";
import { useApp } from "../state";
import BottomNav from "./BottomNav";
import { Brand, PanelImage, Thumb } from "./bits";

/** `/quiz` plays today's quiz; `/quiz/svar` and a finished quiz show the overview. */
export default function QuizPage({ answers = false }: { answers?: boolean }) {
  const { progress } = useApp();
  if (answers || progress.finished) return <AnswersView />;
  return <QuestionView />;
}

type Pending = "guess" | "giveUp" | null;

const GAP_PLACEHOLDER = "skriv her";

function QuestionView() {
  const { quiz, progress, storiesById, start, guess, giveUp, setDraft, next } =
    useApp();
  const index = progress.index;
  const headline = quiz.headlines[index];
  const q = progress.questions[index];
  const story = storiesById.get(headline.story_id);
  const done = isDone(q);
  const isLast = index === quiz.headlines.length - 1;

  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const blurTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    start();
    document.title = "Dagens quiz · Opplyst";
  }, [start]);

  useEffect(() => {
    setError(null);
    setTyping(false);
    window.scrollTo({ top: 0 });
  }, [index]);

  useEffect(() => {
    if (done) nextRef.current?.focus({ preventScroll: true });
  }, [done]);

  async function run(kind: Pending, action: () => Promise<void>) {
    setPending(kind);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(null);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const word = q.draft.trim();
    if (!word) {
      inputRef.current?.focus();
      return;
    }
    if (pending || done) return;
    if (q.guesses.some((g) => normalize(g.word) === normalize(word))) {
      setError(`Du har allerede prøvd «${word}».`);
      return;
    }
    run("guess", async () => {
      await guess(word);
      // A wrong word stays in the headline, selected, so typing replaces it.
      const field = inputRef.current;
      if (field && document.activeElement === field)
        requestAnimationFrame(() => field.select());
    });
  }

  function onNext() {
    next();
    // After the last question the same page shows the overview.
    if (isLast) window.scrollTo({ top: 0 });
  }

  const latest: Guess | undefined = q.guesses[q.guesses.length - 1];
  const stuck = !done && q.guesses.length > 0;
  // On a phone with the keyboard up, the photo steps aside so the question and the input fit.
  const compact = typing && !done && matchMedia("(pointer: coarse)").matches;

  return (
    <main
      id="main"
      className={`quiz ${compact ? "compact" : ""}`}
      tabIndex={-1}
    >
      <QuizHeader position={index + 1} />
      {story && (
        <figure className="quiz-photo">
          <PanelImage image={story.image} priority />
          {story.image?.credit && (
            <figcaption>Foto: {story.image.credit}</figcaption>
          )}
        </figure>
      )}
      <section className="quiz-body" aria-labelledby="quiz-sentence">
        {done ? (
          <>
            <p className="kicker">{q.gaveUp ? "Svaret var" : "Riktig svar"}</p>
            <Sentence
              id="quiz-sentence"
              headline={headline}
              answer={q.answer}
            />
            <Outcome q={q} />
            <button
              className="btn btn-primary btn-wide"
              ref={nextRef}
              onClick={onNext}
            >
              {isLast ? "Se resultatet" : "Neste spørsmål"}{" "}
              <Icon name="next" size={22} />
            </button>
            {story && (
              <Link
                className="btn btn-text btn-wide"
                to={`/sak/${story.id}?fra=quiz`}
              >
                Les saken bak spørsmålet
              </Link>
            )}
          </>
        ) : (
          <>
            <form className="guess-form" onSubmit={onSubmit}>
              <label className="kicker" htmlFor="guess-input">
                Hvilket ord mangler?
              </label>
              {/* The word is typed straight into the gap in the headline. */}
              <Sentence id="quiz-sentence" headline={headline} answer={null}>
                <span className={`gap ${q.draft ? "filled" : ""}`}>
                  {/* Sizes the gap: the typed word, or the placeholder while it's empty. */}
                  <span className="gap-text" aria-hidden="true">
                    {q.draft || GAP_PLACEHOLDER}
                  </span>
                  <input
                    id="guess-input"
                    ref={inputRef}
                    autoFocus={matchMedia("(pointer: fine)").matches}
                    value={q.draft}
                    placeholder={GAP_PLACEHOLDER}
                    readOnly={pending !== null}
                    onChange={(e) => setDraft(e.target.value)}
                    onFocus={(e) => {
                      window.clearTimeout(blurTimer.current);
                      setTyping(true);
                      // A word already tried is there to be replaced, so the next letter starts a new one.
                      if (
                        latest &&
                        normalize(q.draft) === normalize(latest.word)
                      ) {
                        const field = e.currentTarget;
                        requestAnimationFrame(() => field.select());
                      }
                    }}
                    // Wait a moment, so a tap on a button below lands before the layout moves back.
                    onBlur={() =>
                      (blurTimer.current = window.setTimeout(
                        () => setTyping(false),
                        300,
                      ))
                    }
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="send"
                    aria-describedby={
                      latest ? "gap-help closeness" : "gap-help"
                    }
                  />
                </span>
              </Sentence>
              <p className="gap-help" id="gap-help">
                {q.draft
                  ? "Trykk på ordet for å endre"
                  : "Skriv ordet rett i setningen"}
              </p>
              <button
                className={`btn btn-wide ${stuck ? "btn-outline" : "btn-primary"}`}
                type="submit"
                disabled={pending !== null}
                // Keeps the keyboard up, ready for the next guess.
                onMouseDown={(e) => e.preventDefault()}
              >
                {pending === "guess" ? (
                  "Sjekker …"
                ) : (
                  <>
                    Svar <Icon name="next" size={22} />
                  </>
                )}
              </button>
            </form>
            {error && (
              <p className="quiz-error" role="alert">
                {error}
              </p>
            )}
            {latest && <Guesses guesses={q.guesses} />}

            {story && (
              <div className="help">
                <Link
                  className={`btn btn-wide ${stuck ? "btn-primary" : "btn-outline"}`}
                  to={`/sak/${story.id}?fra=quiz`}
                >
                  <Icon name="bulb" size={24} />
                  Hint: Les saken <Icon name="next" size={22} />
                </Link>
              </div>
            )}
            <ul className="quiz-options">
              <li>
                <button
                  onClick={() => run("giveUp", giveUp)}
                  disabled={pending !== null}
                >
                  <Icon name="skip" size={24} />
                  <span>
                    <b>Hopp over</b>
                    <small>Viser svaret · 0 poeng</small>
                  </span>
                  <Icon name="chevron" size={22} />
                </button>
              </li>
            </ul>
          </>
        )}
      </section>
    </main>
  );
}

function QuizHeader({ position }: { position: number }) {
  const { quiz, progress } = useApp();
  const count = quiz.headlines.length;
  const points = totalPoints(progress);
  return (
    <header className="quiz-head">
      <div className="quiz-top">
        <Link
          to="/"
          className="brand-link"
          aria-label="Opplyst fra Adressa – til dagens quiz"
        >
          <Brand />
        </Link>
        <Link
          className="icon-button"
          to="/"
          aria-label="Lukk quizen. Fremdriften er lagret."
        >
          <Icon name="close" size={28} />
        </Link>
      </div>
      <div className="quiz-meta">
        <span>Dagens quiz</span>
        <span>
          {position} av {count}
        </span>
        <span>{points} poeng</span>
      </div>
      <div
        className="quiz-steps"
        role="progressbar"
        aria-label="Fremdrift i dagens quiz"
        aria-valuemin={0}
        aria-valuemax={count}
        aria-valuenow={progress.questions.filter(isDone).length}
      >
        {progress.questions.map((q, i) => (
          <span
            key={i}
            className={
              isDone(q) ? "done" : i === progress.index ? "current" : ""
            }
          />
        ))}
      </div>
    </header>
  );
}

/** The headline with the answer marked in it, or with `children` (the answer field) in the gap. */
function Sentence({
  id,
  headline,
  answer,
  children,
}: {
  id?: string;
  headline: Headline;
  answer: string | null;
  children?: ReactNode;
}) {
  const [before, after] = headline.text.split(BLANK);
  return (
    <h1
      id={id}
      className={`quiz-sentence ${headline.text.length > 110 ? "long" : ""}`}
    >
      {before}
      {answer ? <mark className="answer">{answer}</mark> : children}
      {after}
    </h1>
  );
}

/**
 * The warm/cold signal: every guess so far, closest first, each row filled as far as its
 * meaning is close to the missing word, 0-100. Not points. A dot marks the latest guess.
 */
function Guesses({ guesses }: { guesses: Guess[] }) {
  const latest = guesses[guesses.length - 1];
  const latestHeat = heat(latest.score);
  const sorted = [...guesses].sort((a, b) => b.score - a.score);
  return (
    <section
      id="closeness"
      className="closeness"
      aria-labelledby="closeness-title"
    >
      <h2 id="closeness-title" className="closeness-label">
        Nærhet til ordet
      </h2>
      <p className="sr-only" aria-live="polite">
        {latest.word}: {latest.score} av 100,{" "}
        {HEAT_LABEL[latestHeat].toLowerCase()}
      </p>
      <ol
        className="guesses"
        aria-label={`${guesses.length} forsøk, nærmest først`}
      >
        {sorted.map((g) => {
          const h = heat(g.score);
          const isLatest = g === latest;
          return (
            <li
              key={g.word}
              className={`guess heat-${h} ${isLatest ? "latest" : ""}`}
              style={{ "--fill": `${Math.max(2, g.score)}%` } as CSSProperties}
            >
              <span className="guess-dot" aria-hidden="true" />
              <span className="guess-word">
                {g.word}
                {isLatest && <span className="sr-only"> (siste forsøk)</span>}
              </span>
              <span className="guess-score">
                <b>{g.score}</b> ·{" "}
                <span className="heat-word">{HEAT_LABEL[h]}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <details className="explain">
        <summary>Hva betyr tallet?</summary>
        <p>
          Nærheten viser hvor nær betydningen av gjetningen din er ordet som
          mangler, fra 0 til 100.
        </p>
      </details>
    </section>
  );
}

function Outcome({ q }: { q: QuestionState }) {
  const points = pointsFor(q);
  const extra = Math.max(0, q.guesses.length - 1);
  const costs = extra ? `${extra} ekstra forsøk` : "";
  return (
    <div className={`outcome ${q.gaveUp ? "skipped" : ""}`} aria-live="polite">
      <span className="outcome-icon">
        <Icon name={q.gaveUp ? "skip" : "check"} size={22} />
      </span>
      <span>
        <strong>
          {q.gaveUp ? "Hoppet over · 0 poeng" : `Riktig! +${points} poeng`}
        </strong>
      </span>
    </div>
  );
}

/** The end of the quiz: how it went, question by question, with a way into each story. */
function AnswersView() {
  const { quiz, progress, storiesById, restart, toast } = useApp();
  const points = totalPoints(progress);
  const max = quiz.headlines.length * MAX_POINTS;
  const complete = isComplete(progress);
  const right = progress.questions.filter((q) => isDone(q) && !q.gaveUp).length;
  const skipped = progress.questions.filter((q) => q.gaveUp).length;

  useEffect(() => {
    document.title = "Resultatet ditt · Opplyst";
  }, []);

  async function share() {
    // "18. okt", without the trailing full stop the Norwegian date format adds.
    const text = shareText(progress, formatDay(quiz.date).replace(/\.$/, ""));
    // A phone opens its own share sheet; on a computer the text goes to the clipboard.
    const mobile = matchMedia("(pointer: coarse)").matches;
    try {
      if (mobile && navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        toast("Resultatet er kopiert. Lim det inn der du vil dele det.");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError")
        toast("Vi fikk ikke delt resultatet.");
    }
  }

  return (
    <>
      <main
        id="main"
        className="answers"
        tabIndex={-1}
        aria-labelledby="answers-title"
      >
        <header className="page-top">
          <Link
            to="/"
            className="brand-link"
            aria-label="Opplyst fra Adressa – til dagens quiz"
          >
            <Brand />
          </Link>
        </header>
        <p className="kicker">
          Dagens quiz · {formatDay(quiz.date)} ·{" "}
          {complete ? "Ferdig" : "Ikke ferdig"}
        </p>
        <h1 id="answers-title">
          {complete ? verdict(points, max) : "Resultatet så langt"}
        </h1>
        <p className="answers-score">
          <strong>{points}</strong> av {max} poeng
        </p>
        <p className="answers-sum">
          {right} riktig{right === 1 ? "" : "e"}
          {skipped > 0 && ` · ${skipped} hoppet over`}
          {!complete && ` · ${quiz.headlines.length - right - skipped} igjen`}
        </p>
        {complete && (
          <button
            className="btn btn-outline btn-wide answers-share"
            onClick={share}
          >
            <Icon name="share" size={22} /> Del resultatet
          </button>
        )}
        <ol className="result-list">
          {quiz.headlines.map((h, i) => {
            const q = progress.questions[i];
            const story = storiesById.get(h.story_id);
            const [before, after] = h.text.split(BLANK);
            const p = pointsFor(q);
            const facts = [
              q.guesses.length > 0 && `${q.guesses.length} forsøk`,
              q.readStory && "saken åpnet",
            ].filter(Boolean);
            return (
              <li
                key={h.id}
                className={`result-item ${q.gaveUp ? "skipped" : ""}`}
              >
                <p className="result-head">
                  <span>Spørsmål {i + 1}</span>
                  <span className={`result-points ${p === 0 ? "zero" : ""}`}>
                    {!isDone(q)
                      ? "Ikke besvart"
                      : q.gaveUp
                        ? "Hoppet over · 0 poeng"
                        : `Riktig · +${p} poeng`}
                  </span>
                </p>
                <p className="result-sentence">
                  {before}
                  <b>{q.answer ?? BLANK}</b>
                  {after}
                </p>
                {facts.length > 0 && (
                  <p className="result-facts">{facts.join(" · ")}</p>
                )}
                {story && (
                  <Link
                    className="result-story"
                    to={`/sak/${story.id}?fra=quiz`}
                  >
                    <Thumb src={story.image?.src ?? null} />
                    <span>
                      <small>Les saken</small>
                      <strong>{story.title}</strong>
                    </span>
                    <Icon name="chevron" size={22} />
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
        {complete ? (
          <Link className="btn btn-primary btn-wide" to="/nyheter">
            Se nyhetene <Icon name="next" size={22} />
          </Link>
        ) : (
          <Link className="btn btn-primary btn-wide" to="/quiz">
            Fortsett quizen <Icon name="next" size={22} />
          </Link>
        )}
        <p className="answers-note">
          10 poeng for riktig svar på første forsøk, minus 1 for hvert ekstra
          forsøk. Hopper du over, får du se svaret og 0 poeng. Lesing er gratis,
          og nærheten underveis er ikke poeng.
        </p>
        {complete && (
          <button
            className="btn btn-text"
            onClick={() => {
              restart();
              navigate("/quiz");
            }}
          >
            Ta dagens quiz på nytt
          </button>
        )}
      </main>
      <BottomNav current="quiz" />
    </>
  );
}
