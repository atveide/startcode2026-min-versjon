import { FormEvent, ReactNode, RefObject, useEffect, useRef, useState } from "react";
import type { Story } from "../api";
import { Icon } from "../icons";
import { normalize } from "../logic";
import { BLANK, heat, isDone, MAX_POINTS, pointsFor, QuestionState, totalPoints, verdict } from "../quiz";
import { Link } from "../router";
import { useApp } from "../state";
import BottomNav from "./BottomNav";
import { accent, NewsGraphic, PanelImage, Tag } from "./bits";

export default function QuizPage() {
  const { progress } = useApp();
  useEffect(() => {
    document.title = "Ukens spill · Opplyst";
  }, []);
  return (
    <>
      {progress.finished ? <ResultView /> : <QuestionView />}
      <BottomNav current="quiz" />
    </>
  );
}

function QuizFrame({ story, children }: { story?: Story; children: ReactNode }) {
  const { quiz, progress } = useApp();
  const count = quiz.headlines.length;
  const position = progress.finished ? count : progress.index + 1;
  return (
    <main id="main" className="quiz-page" tabIndex={-1}>
      <section className="quiz-panel story-panel" style={story ? accent(story) : undefined} aria-labelledby="quiz-title">
        {story ? <PanelImage image={story.images[0]} priority /> : <NewsGraphic />}
        <div className="panel-shade" />
        <header className="quiz-top">
          <span className="quiz-title" id="quiz-title">
            Ukens spill
          </span>
          <Link className="quiz-close" to="/" aria-label="Lukk spillet og gå til forsiden">
            <Icon name="close" size={26} />
          </Link>
        </header>
        <div className="quiz-progress">
          <span>
            {position} av {count}
          </span>
          <Steps />
          <strong>{totalPoints(progress)} poeng</strong>
        </div>
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
        <span key={i} className={i === progress.index && !progress.finished ? "current" : isDone(q) ? "done" : ""} />
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
      setInput("");
      inputRef.current?.focus();
    });
  }

  const [before, after] = headline.text.split(BLANK);
  const hintsLeft = quiz.max_hints - q.hints;
  const stuck = !done && (q.guesses.length > 0 || q.hints > 0);

  return (
    <QuizFrame story={story}>
      {story && <Tag story={story} />}
      <h1 className="quiz-headline">
        {before}
        {done ? (
          <span className={`quiz-blank filled ${q.gaveUp ? "skipped" : ""}`}>{q.answer}</span>
        ) : (
          <span className="quiz-blank" role="img" aria-label="ordet som mangler" />
        )}
        {after}
      </h1>

      {done ? (
        <Outcome q={q} isLast={isLast} onNext={next} nextRef={nextRef} />
      ) : (
        <>
          <label className="quiz-label" htmlFor="guess-input">
            Hvilket ord mangler?
          </label>
          {q.hint && (
            <p className="quiz-hint">
              Hint:<span aria-label={`Hint: ${q.hint.replace(/ /g, "")}`}>{q.hint}</span>
            </p>
          )}
          <form className="guess-form" onSubmit={onSubmit}>
            <input
              id="guess-input"
              ref={inputRef}
              autoFocus
              value={input}
              readOnly={pending !== null}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Skriv svaret ditt"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="send"
            />
            <button className="quiz-submit" type="submit" disabled={pending !== null}>
              {pending === "guess" ? "Sjekker …" : "Svar"}
              <Icon name="next" size={20} />
            </button>
          </form>
          <div className="quiz-links">
            <button onClick={() => run("hint", hint)} disabled={pending !== null || hintsLeft <= 0}>
              {hintsLeft > 0 ? "Vis hint" : "Ingen hint igjen"}
            </button>
            <span aria-hidden="true" />
            <button onClick={() => run("giveUp", giveUp)} disabled={pending !== null}>
              Hopp over
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="quiz-error" role="alert">
          {error}
        </p>
      )}

      {!done && q.guesses.length > 0 && (
        <ol className="quiz-tries" aria-label="Forsøkene dine, nærmest først">
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

      {story && <StoryLink story={story} stuck={stuck} hasRead={q.readStory} />}
    </QuizFrame>
  );
}

/** The story behind the question. After a wrong guess it turns into a clear nudge to read it. */
function StoryLink({ story, stuck, hasRead }: { story: Story; stuck: boolean; hasRead: boolean }) {
  return (
    <div className={`quiz-story ${stuck ? "stuck" : ""}`} aria-live="polite">
      <small>
        {stuck && !hasRead
          ? "Står du fast? Svaret står i saken"
          : hasRead
            ? "Saken bak spørsmålet · lest"
            : "Saken bak spørsmålet"}
      </small>
      <Link to={`/sak/${story.id}?fra=quiz`}>
        <span>{story.title}</span>
        <Icon name="northEast" size={18} />
      </Link>
    </div>
  );
}

function Outcome({
  q,
  isLast,
  onNext,
  nextRef,
}: {
  q: QuestionState;
  isLast: boolean;
  onNext: () => void;
  nextRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <>
      <div className={`quiz-feedback ${q.gaveUp ? "skipped" : ""}`} aria-live="polite">
        <span className="quiz-feedback-icon">
          <Icon name={q.gaveUp ? "next" : "check"} size={22} />
        </span>
        <span>
          <strong>{q.gaveUp ? "Hoppet over" : "Riktig!"}</strong>
          <span>
            {q.gaveUp
              ? "Ingen poeng denne gangen, men nå vet du det."
              : `${q.readStory ? "Du leste deg opp og fant svaret." : "Du husket nyheten."} +${pointsFor(q)} poeng`}
          </span>
        </span>
      </div>
      <button className="quiz-submit" ref={nextRef} onClick={onNext}>
        {isLast ? "Se resultatet" : "Neste spørsmål"}
        <Icon name="next" size={20} />
      </button>
    </>
  );
}

function ResultView() {
  const { quiz, progress, storiesById, restart } = useApp();
  const points = totalPoints(progress);
  const max = quiz.headlines.length * MAX_POINTS;
  const { title, text } = verdict(points, max);

  return (
    <QuizFrame>
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
        <Link className="quiz-submit" to="/#feed">
          Utforsk ukens saker
          <Icon name="next" size={20} />
        </Link>
        <div className="quiz-links">
          <button onClick={restart}>Spill igjen</button>
        </div>
      </div>
      <p className="quiz-foot">Ny quiz kommer neste uke. Følg med på nyhetene, så er du klar.</p>
    </QuizFrame>
  );
}
