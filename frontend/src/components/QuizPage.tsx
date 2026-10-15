import { FormEvent, useEffect, useRef, useState } from "react";
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

type Pending = "guess" | "hint" | "giveUp" | null;

function QuestionView() {
  const { quiz, progress, storiesById, start, guess, hint, giveUp, setDraft, next } = useApp();
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
    run("guess", () => guess(word));
  }

  function onNext() {
    next();
    // After the last question the same page shows the overview.
    if (isLast) window.scrollTo({ top: 0 });
  }

  const latest: Guess | undefined = q.guesses[q.guesses.length - 1];
  const stuck = !done && q.guesses.length > 0;
  const hintsLeft = quiz.max_hints - q.hints;
  // On a phone with the keyboard up, the photo steps aside so the question and the input fit.
  const compact = typing && !done && matchMedia("(pointer: coarse)").matches;

  return (
    <main id="main" className={`quiz ${compact ? "compact" : ""}`} tabIndex={-1}>
      <QuizHeader position={index + 1} />
      {story && (
        <figure className="quiz-photo">
          <PanelImage image={story.image} priority />
          {story.image?.credit && <figcaption>Foto: {story.image.credit}</figcaption>}
        </figure>
      )}
      <section className="quiz-body" aria-labelledby="quiz-sentence">
        {done ? (
          <>
            <p className="kicker">{q.gaveUp ? "Svaret var" : "Riktig svar"}</p>
            <Sentence id="quiz-sentence" headline={headline} answer={q.answer} />
            <Outcome q={q} />
            <button className="btn btn-primary btn-wide" ref={nextRef} onClick={onNext}>
              {isLast ? "Se resultatet" : "Neste spørsmål"} <Icon name="next" size={22} />
            </button>
            {story && (
              <Link className="btn btn-text btn-wide" to={`/sak/${story.id}?fra=quiz`}>
                Les saken bak spørsmålet
              </Link>
            )}
          </>
        ) : (
          <>
            <label className="kicker" htmlFor="guess-input">
              Hvilket ord mangler?
            </label>
            <Sentence id="quiz-sentence" headline={headline} answer={null} />
            {q.hint && (
              <p className="hint-line">
                Bokstavhint:{" "}
                <span className="hint-letters" aria-label={`${q.hint.replace(/ /g, "")}, ${q.hint.split(" ").length} bokstaver`}>
                  {q.hint}
                </span>
              </p>
            )}
            <form className="guess-form" onSubmit={onSubmit}>
              <input
                id="guess-input"
                ref={inputRef}
                autoFocus={matchMedia("(pointer: fine)").matches}
                value={q.draft}
                readOnly={pending !== null}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={() => {
                  window.clearTimeout(blurTimer.current);
                  setTyping(true);
                }}
                // Wait a moment, so a tap on a button below lands before the layout moves back.
                onBlur={() => (blurTimer.current = window.setTimeout(() => setTyping(false), 300))}
                placeholder="Skriv ordet"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="send"
                aria-describedby={latest ? "closeness" : undefined}
              />
              <button
                className={`btn ${stuck ? "btn-outline" : "btn-primary"}`}
                type="submit"
                disabled={pending !== null}
                // Keeps the keyboard up, ready for the next guess.
                onMouseDown={(e) => e.preventDefault()}
              >
                {pending === "guess" ? "Sjekker …" : "Svar"}
              </button>
            </form>
            {error && (
              <p className="quiz-error" role="alert">
                {error}
              </p>
            )}
            {latest && <Closeness guess={latest} />}
            {q.guesses.length > 1 && <EarlierGuesses guesses={q.guesses.slice(0, -1)} />}

            {story && (
              <div className="help">
                <Link className={`btn btn-wide ${stuck ? "btn-primary" : "btn-outline"}`} to={`/sak/${story.id}?fra=quiz`}>
                  Finn svaret i saken <Icon name="next" size={22} />
                </Link>
                <p className="help-note">
                  Lesing koster ingen poeng.{q.readStory && " Du har åpnet saken."}
                </p>
              </div>
            )}
            <ul className="quiz-options">
              <li>
                <button onClick={() => run("hint", hint)} disabled={pending !== null || hintsLeft <= 0}>
                  <Icon name="bulb" size={26} />
                  <span>
                    <b>Bokstavhint</b> · −1 poeng
                    <small>
                      {hintsLeft > 0 ? `${q.hints} av ${quiz.max_hints} brukt` : "Ingen bokstavhint igjen"}
                    </small>
                  </span>
                  <Icon name="chevron" size={22} />
                </button>
              </li>
              <li>
                <button onClick={() => run("giveUp", giveUp)} disabled={pending !== null}>
                  <Icon name="skip" size={24} />
                  <span>
                    <b>Hopp over</b>
                    <small>Viser svaret · 0 poeng</small>
                  </span>
                  <Icon name="chevron" size={22} />
                </button>
              </li>
            </ul>
            {story && <p className="quiz-foot">Fra saken kommer du tilbake til samme spørsmål.</p>}
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
        <Link to="/" className="brand-link" aria-label="Opplyst fra Adressa – til dagens quiz">
          <Brand />
        </Link>
        <Link className="icon-button" to="/" aria-label="Lukk quizen. Fremdriften er lagret.">
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
          <span key={i} className={isDone(q) ? "done" : i === progress.index ? "current" : ""} />
        ))}
      </div>
    </header>
  );
}

function Sentence({ id, headline, answer }: { id?: string; headline: Headline; answer: string | null }) {
  const [before, after] = headline.text.split(BLANK);
  return (
    <h1 id={id} className={`quiz-sentence ${headline.text.length > 110 ? "long" : ""}`}>
      {before}
      {answer ? (
        <mark className="answer">{answer}</mark>
      ) : (
        <span className="blank" role="img" aria-label="ordet som mangler" />
      )}
      {after}
    </h1>
  );
}

/** The warm/cold signal: how close the meaning of the last guess is, 0-100. Not points. */
function Closeness({ guess }: { guess: Guess }) {
  const h = heat(guess.score);
  return (
    <section id="closeness" className={`closeness heat-${h}`} aria-live="polite" aria-label="Nærhet til ordet">
      <p className="closeness-label">Nærhet til ordet</p>
      <p className="closeness-row">
        <strong className="closeness-word">{guess.word}</strong>
        <span className="closeness-score">
          <b>{guess.score}</b>/100 <span aria-hidden="true">·</span> <span className="heat-word">{HEAT_LABEL[h]}</span>
        </span>
      </p>
      <div
        className="closeness-bar"
        role="meter"
        aria-label="Nærhet"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={guess.score}
        aria-valuetext={`${guess.score} av 100, ${HEAT_LABEL[h].toLowerCase()}`}
      >
        <span style={{ width: `${Math.max(2, guess.score)}%` }} />
      </div>
      <p className="closeness-scale" aria-hidden="true">
        <span>Kaldt</span>
        <span>Varmt</span>
      </p>
      <details className="explain">
        <summary>Hva betyr tallet?</summary>
        <p>
          Nærheten viser hvor nær betydningen av gjetningen din er ordet som mangler, fra 0 til 100. Det er ikke
          poeng og ikke sjansen for at du har rett: bare riktig ord gir poeng.
        </p>
      </details>
    </section>
  );
}

function EarlierGuesses({ guesses }: { guesses: Guess[] }) {
  const best = Math.max(...guesses.map((g) => g.score));
  return (
    <details className="tries">
      <summary>
        Tidligere forsøk ({guesses.length}) · beste nærhet {best}
      </summary>
      <ol aria-label="Tidligere forsøk, nærmest først">
        {[...guesses]
          .sort((a, b) => b.score - a.score)
          .map((g) => {
            const h = heat(g.score);
            return (
              <li key={g.word} className={`heat-${h}`}>
                <span className="try-word">{g.word}</span>
                <span className="try-bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(2, g.score)}%` }} />
                </span>
                <span className="try-score">
                  {g.score} · {HEAT_LABEL[h]}
                </span>
              </li>
            );
          })}
      </ol>
    </details>
  );
}

function Outcome({ q }: { q: QuestionState }) {
  const points = pointsFor(q);
  const extra = Math.max(0, q.guesses.length - 1);
  const costs = [extra && `${extra} ekstra forsøk`, q.hints && `${q.hints} bokstavhint`].filter(Boolean).join(" og ");
  return (
    <div className={`outcome ${q.gaveUp ? "skipped" : ""}`} aria-live="polite">
      <span className="outcome-icon">
        <Icon name={q.gaveUp ? "skip" : "check"} size={22} />
      </span>
      <span>
        <strong>{q.gaveUp ? "Hoppet over · 0 poeng" : `Riktig! +${points} poeng`}</strong>
        <span>
          {q.gaveUp
            ? "Hopp over gir ingen poeng, men nå vet du det."
            : `${q.readStory ? "Du fant svaret i saken." : "Du husket nyheten."}${
                costs ? ` ${MAX_POINTS} poeng minus ${costs}.` : ""
              }`}
        </span>
      </span>
    </div>
  );
}

/** The end of the quiz: how it went, question by question, with a way into each story. */
function AnswersView() {
  const { quiz, progress, storiesById, restart } = useApp();
  const points = totalPoints(progress);
  const max = quiz.headlines.length * MAX_POINTS;
  const complete = isComplete(progress);
  const right = progress.questions.filter((q) => isDone(q) && !q.gaveUp).length;
  const skipped = progress.questions.filter((q) => q.gaveUp).length;

  useEffect(() => {
    document.title = "Resultatet ditt · Opplyst";
  }, []);

  return (
    <>
      <main id="main" className="answers" tabIndex={-1} aria-labelledby="answers-title">
        <header className="page-top">
          <Link to="/" className="brand-link" aria-label="Opplyst fra Adressa – til dagens quiz">
            <Brand />
          </Link>
        </header>
        <p className="kicker">
          Dagens quiz · {formatDay(quiz.date)} · {complete ? "Ferdig" : "Ikke ferdig"}
        </p>
        <h1 id="answers-title">{complete ? verdict(points, max) : "Resultatet så langt"}</h1>
        <p className="answers-score">
          <strong>{points}</strong> av {max} poeng
        </p>
        <p className="answers-sum">
          {right} riktig{right === 1 ? "" : "e"}
          {skipped > 0 && ` · ${skipped} hoppet over`}
          {!complete && ` · ${quiz.headlines.length - right - skipped} igjen`}
        </p>
        <ol className="result-list">
          {quiz.headlines.map((h, i) => {
            const q = progress.questions[i];
            const story = storiesById.get(h.story_id);
            const [before, after] = h.text.split(BLANK);
            const p = pointsFor(q);
            const facts = [
              q.guesses.length > 0 && `${q.guesses.length} forsøk`,
              q.hints > 0 && `${q.hints} bokstavhint`,
              q.readStory && "saken åpnet",
            ].filter(Boolean);
            return (
              <li key={h.id} className={`result-item ${q.gaveUp ? "skipped" : ""}`}>
                <p className="result-head">
                  <span>Spørsmål {i + 1}</span>
                  <span className={`result-points ${p === 0 ? "zero" : ""}`}>
                    {!isDone(q) ? "Ikke besvart" : q.gaveUp ? "Hoppet over · 0 poeng" : `Riktig · +${p} poeng`}
                  </span>
                </p>
                <p className="result-sentence">
                  {before}
                  <b>{q.answer ?? BLANK}</b>
                  {after}
                </p>
                {facts.length > 0 && <p className="result-facts">{facts.join(" · ")}</p>}
                {story && (
                  <Link className="result-story" to={`/sak/${story.id}?fra=quiz`}>
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
          10 poeng for riktig svar på første forsøk, minus 1 for hvert ekstra forsøk og hvert bokstavhint. Hopper du
          over, får du se svaret og 0 poeng. Lesing er gratis, og nærheten underveis er ikke poeng.
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
