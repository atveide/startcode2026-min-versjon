import { FormEvent, useEffect, useState } from "react";
import { fetchHeadlines, fetchHint, Headline, Hint, revealAnswer, submitGuess } from "./api";

const BLANK = "___";
const MAX_POINTS = 10;

type Guess = { word: string; score: number };
type Result = { guesses: number; hints: number; gaveUp: boolean };

// 10 points for a first-try solve; every extra guess and every hint costs a point.
function pointsFor(result: Result): number {
  if (result.gaveUp) return 0;
  return Math.max(0, MAX_POINTS - (result.guesses - 1) - result.hints);
}

export default function HeadlineGame() {
  const [headlines, setHeadlines] = useState<Headline[] | null>(null);
  const [index, setIndex] = useState(0);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [hint, setHint] = useState<Hint | null>(null);
  const [answer, setAnswer] = useState<string | null>(null); // set once solved or given up
  const [results, setResults] = useState<Result[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    fetchHeadlines()
      .then(setHeadlines)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error && !headlines) return <p className="error">{error}</p>;
  if (!headlines) return <p>Laster…</p>;
  if (showSummary) return <Summary results={results} onRestart={restart} />;

  const headline = headlines[index];
  const [before, after] = headline.text.split(BLANK);
  const hintsUsed = hint?.level ?? 0;
  const done = answer !== null;
  const result = done ? results[results.length - 1] : null;

  async function run(action: () => Promise<void>) {
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  function finish(word: string, guessCount: number, gaveUp: boolean) {
    setAnswer(word);
    setResults([...results, { guesses: guessCount, hints: hintsUsed, gaveUp }]);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const word = input.trim();
    if (!word || pending || done) return;

    run(async () => {
      const res = await submitGuess(headline.id, word);
      const next = [...guesses, { word, score: res.score }];
      setGuesses(next);
      setInput("");
      if (res.solved) finish(res.answer!, next.length, false);
    });
  }

  function onHint() {
    run(async () => setHint(await fetchHint(headline.id, hintsUsed + 1)));
  }

  function onGiveUp() {
    run(async () => finish((await revealAnswer(headline.id)).answer, guesses.length, true));
  }

  function nextHeadline() {
    if (index === headlines!.length - 1) {
      setShowSummary(true);
      return;
    }
    setIndex(index + 1);
    setGuesses([]);
    setHint(null);
    setAnswer(null);
  }

  function restart() {
    setIndex(0);
    setGuesses([]);
    setHint(null);
    setAnswer(null);
    setResults([]);
    setShowSummary(false);
  }

  const isLast = index === headlines.length - 1;
  const sortedGuesses = [...guesses].sort((a, b) => b.score - a.score);
  const hintsLeft = hint ? hint.max_level - hint.level : null;

  return (
    <section className="game">
      <p className="progress">
        Overskrift {index + 1} av {headlines.length}
      </p>

      <h2 className="headline">
        {before}
        <span className={result ? (result.gaveUp ? "blank gave-up" : "blank solved") : "blank"}>
          {answer ?? "?"}
        </span>
        {after}
      </h2>

      {hint && !done && <p className="hint">Hint: {hint.hint}</p>}

      {result ? (
        <div className={result.gaveUp ? "result-box gave-up" : "result-box"}>
          <p>
            {result.gaveUp
              ? "Du ga opp — 0 poeng."
              : `Riktig! Løst på ${result.guesses} forsøk${
                  result.hints ? ` og ${result.hints} hint` : ""
                } — ${pointsFor(result)} poeng.`}
          </p>
          <button autoFocus onClick={nextHeadline}>
            {isLast ? "Se resultat" : "Neste overskrift"}
          </button>
        </div>
      ) : (
        <>
          <form onSubmit={onSubmit} className="guess-form">
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Gjett ordet"
              disabled={pending}
            />
            <button type="submit" disabled={pending || !input.trim()}>
              {pending ? "Sjekker…" : "Gjett"}
            </button>
          </form>
          <div className="actions">
            <button type="button" onClick={onHint} disabled={pending || hintsLeft === 0}>
              Hint{hintsLeft !== null ? ` (${hintsLeft} igjen)` : ""}
            </button>
            <button type="button" className="give-up" onClick={onGiveUp} disabled={pending}>
              Gi opp
            </button>
          </div>
        </>
      )}

      {error && <p className="error">{error}</p>}

      {guesses.length > 0 && (
        <ol className="guesses">
          {sortedGuesses.map((g, i) => (
            <li key={i}>
              <span>{g.word}</span>
              <span className="bar" style={{ width: `${g.score}%` }} />
              <span className="score">{g.score}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Summary({ results, onRestart }: { results: Result[]; onRestart: () => void }) {
  const total = results.reduce((sum, r) => sum + pointsFor(r), 0);
  return (
    <section className="game">
      <h2>Ferdig!</h2>
      <p>
        Du fikk <strong>{total}</strong> av {results.length * MAX_POINTS} poeng.
      </p>
      <ol>
        {results.map((r, i) => (
          <li key={i}>
            {r.gaveUp ? "Ga opp" : `${r.guesses} forsøk`}
            {r.hints ? `, ${r.hints} hint` : ""} — {pointsFor(r)} poeng
          </li>
        ))}
      </ol>
      <button onClick={onRestart}>Spill igjen</button>
    </section>
  );
}
