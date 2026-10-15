import { FormEvent, ReactNode, RefObject, useEffect, useRef, useState } from "react";
import type { Story } from "../api";
import { Icon } from "../icons";
import { normalize } from "../logic";
import { BLANK, heat, isDone, MAX_POINTS, pointsFor, QuestionState, totalPoints, verdict } from "../quiz";
import { Link } from "../router";
import { useApp } from "../state";
import { accent, NewsGraphic, PanelImage, Tag } from "./bits";

export default function QuizPage() {
  const { progress } = useApp();
  useEffect(() => {
    document.title = "Ukens nyhetsquiz · Opplyst";
  }, []);
  return progress.finished ? <ResultView /> : <QuestionView />;
}

function QuizFrame({ story, children }: { story?: Story; children: ReactNode }) {
  const { quiz, progress } = useApp();
  return (
    <main id="main" className="quiz-page" tabIndex={-1}>
      <section className="quiz-panel story-panel" style={story ? accent(story) : undefined} aria-label="Ukens nyhetsquiz">
        {story ? <PanelImage image={story.images[0]} priority /> : <NewsGraphic />}
        <div className="panel-shade" />
        <header className="quiz-top">
          <Link className="quiz-close" to="/" aria-label="Lukk quizen og gå til forsiden">
            <Icon name="close" />
          </Link>
          <div className="quiz-meta">
            <span>Ukens nyhetsquiz · Uke {quiz.week}</span>
            <span className="quiz-points">{totalPoints(progress)} poeng</span>
          </div>
        </header>
        <div className="quiz-copy">{children}</div>
      </section>
    </main>
  );
}

function Steps() {
  const { progress } = useApp();
  return (
    <div className="quiz-steps" aria-hidden="true">
      {progress.questions.map((q, i) => (
        <span
          key={i}
          className={
            isDone(q) ? (q.gaveUp ? "gave-up" : "solved") : i === progress.index && !progress.finished ? "current" : ""
          }
        />
      ))}
    </div>
  );
}

type Pending = "guess" | "hint" | "giveUp" | null;

function QuestionView() {
  const { quiz, progress, storiesById, guess, hint, giveUp, next } = useApp();
  const index = progress.index;
  const headline = quiz.headlines[index];
  const q = progress.questions[index];
  const story = storiesById.get(headline.story_id);
  const done = isDone(q);
  const isLast = index === quiz.headlines.length - 1;

  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setInput("");
    setError(null);
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
    const word = input.trim();
    if (!word || pending || done) return;
    if (q.guesses.some((g) => normalize(g.word) === normalize(word))) {
      setError(`Du har allerede prøvd «${word}».`);
      return;
    }
    run("guess", async () => {
      await guess(word);
      setInput("");
      inputRef.current?.focus();
    });
  }

  const [before, after] = headline.text.split(BLANK);
  const hintsLeft = quiz.max_hints - q.hints;
  const stuck = !done && (q.guesses.length > 0 || q.hints > 0);

  return (
    <QuizFrame story={story}>
      <Steps />
      <div className="story-kicker">
        <span className="story-label">
          Spørsmål {index + 1} av {quiz.headlines.length}
        </span>
        {story && <Tag story={story} />}
        {q.readStory && (
          <span className="read-badge">
            Saken er lest <Icon name="check" size={13} />
          </span>
        )}
      </div>
      <h1 className="quiz-headline">
        {before}
        <span className={`quiz-blank ${done ? (q.gaveUp ? "gave-up" : "solved") : ""}`}>
          {q.answer ?? "?"}
          {!done && <span className="sr-only"> (ordet som mangler)</span>}
        </span>
        {after}
      </h1>

      {q.hint && !done && (
        <p className="quiz-hint">
          Hint:<span aria-label={`Hint: ${q.hint.replace(/ /g, "")}`}>{q.hint}</span>
        </p>
      )}

      {done ? (
        <Outcome q={q} story={story} isLast={isLast} onNext={next} nextRef={nextRef} />
      ) : (
        <>
          <form className="guess-form" onSubmit={onSubmit}>
            <label className="sr-only" htmlFor="guess-input">
              Ordet som mangler
            </label>
            <input
              id="guess-input"
              ref={inputRef}
              autoFocus
              value={input}
              readOnly={pending !== null}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Skriv ordet som mangler"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="send"
            />
            <button className="guess-submit" type="submit" disabled={pending !== null || !input.trim()}>
              {pending === "guess" ? "Sjekker…" : "Gjett"}
            </button>
          </form>
          <div className="quiz-actions">
            <button
              className="quiz-chip"
              onClick={() => run("hint", hint)}
              disabled={pending !== null || hintsLeft <= 0}
            >
              <Icon name="spark" size={17} />
              {hintsLeft > 0 ? `Hint (${hintsLeft} igjen · koster 1 poeng)` : "Ingen hint igjen"}
            </button>
            <button className="quiz-chip give-up" onClick={() => run("giveUp", giveUp)} disabled={pending !== null}>
              <Icon name="flag" size={17} />
              Gi opp
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="quiz-error" role="alert">
          {error}
        </p>
      )}

      {stuck && story && <StuckCard story={story} hasRead={q.readStory} />}

      {q.guesses.length > 0 && (
        <ol className="quiz-guesses" aria-label="Forsøkene dine, nærmest først">
          {[...q.guesses]
            .sort((a, b) => b.score - a.score)
            .map((g) => (
              <li key={g.word} className={`heat-${heat(g.score)}`}>
                <span className="guess-word">{g.word}</span>
                <span className="guess-bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(3, g.score)}%` }} />
                </span>
                <span className="guess-score">{g.score}</span>
              </li>
            ))}
        </ol>
      )}

      <p className="quiz-foot">Svarene vurderes etter mening, ikke stavemåte. Kilde: VG.</p>
    </QuizFrame>
  );
}

function StuckCard({ story, hasRead }: { story: Story; hasRead: boolean }) {
  return (
    <aside className={`stuck-card ${hasRead ? "has-read" : ""}`} aria-live="polite">
      <div>
        <strong>{hasRead ? "Svaret står i saken" : "Står du fast? Les saken."}</strong>
        <p>
          {hasRead
            ? `Du har lest «${story.title}». Bruk det du lærte, eller les den en gang til.`
            : `Svaret finner du i «${story.title}». Les saken, og kom tilbake til spørsmålet.`}
        </p>
      </div>
      <Link className="stuck-cta" to={`/sak/${story.id}?fra=quiz`}>
        <Icon name="book" size={19} />
        {hasRead ? "Les igjen" : "Les saken"}
      </Link>
    </aside>
  );
}

function Outcome({
  q,
  story,
  isLast,
  onNext,
  nextRef,
}: {
  q: QuestionState;
  story?: Story;
  isLast: boolean;
  onNext: () => void;
  nextRef: RefObject<HTMLButtonElement | null>;
}) {
  const tries = q.guesses.length;
  return (
    <div className={`quiz-result ${q.gaveUp ? "gave-up" : ""}`} aria-live="polite">
      <p className="quiz-result-title">{q.gaveUp ? `Svaret var «${q.answer}»` : `Riktig! +${pointsFor(q)} poeng`}</p>
      <p>
        {q.gaveUp
          ? "Ingen poeng denne gangen, men nå vet du det."
          : `Løst på ${tries} forsøk${q.hints ? ` med ${q.hints} hint` : ""}${q.readStory ? ", etter å ha lest saken" : ""}.`}
      </p>
      <div className="quiz-result-actions">
        <button className="cover-cta" ref={nextRef} onClick={onNext}>
          {isLast ? "Se resultatet" : "Neste spørsmål"}
          <Icon name="arrow" size={24} />
        </button>
        {story && (
          <Link className="read-more" to={`/sak/${story.id}?fra=quiz`}>
            {q.readStory ? "Les saken igjen" : "Les hele saken"}
          </Link>
        )}
      </div>
    </div>
  );
}

function ResultView() {
  const { quiz, progress, storiesById, restart } = useApp();
  const points = totalPoints(progress);
  const max = quiz.headlines.length * MAX_POINTS;
  const { title, text } = verdict(points, max);

  return (
    <QuizFrame>
      <Steps />
      <span className="story-label">Uke {quiz.week} · Ferdig</span>
      <h1 className="quiz-headline">{title}</h1>
      <p className="result-score">
        <strong>{points}</strong>av {max} poeng
      </p>
      <p className="story-summary">
        <span>{text}</span>
      </p>
      <ol className="result-list">
        {quiz.headlines.map((h, i) => {
          const q = progress.questions[i];
          const story = storiesById.get(h.story_id);
          const [before, after] = h.text.split(BLANK);
          const p = pointsFor(q);
          return (
            <li key={h.id}>
              <span className={`result-points ${p === 0 ? "zero" : ""}`}>{p === 0 ? "0" : `+${p}`}</span>
              <span className="result-text">
                {before}
                <b>{q.answer ?? BLANK}</b>
                {after}
              </span>
              {story && (
                <Link className="result-read" to={`/sak/${story.id}?fra=quiz`}>
                  Les saken
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      <div className="result-actions">
        <Link className="cover-cta" to="/#feed">
          Utforsk ukens saker
          <Icon name="arrow" size={24} />
        </Link>
        <button className="swipe-hint" onClick={restart}>
          <Icon name="refresh" size={18} />
          Spill igjen
        </button>
      </div>
      <p className="quiz-foot">Ny quiz kommer neste uke. Følg med på nyhetene, så er du klar.</p>
    </QuizFrame>
  );
}
