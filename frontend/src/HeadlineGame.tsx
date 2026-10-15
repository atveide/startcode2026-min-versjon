import { FormEvent, useEffect, useState } from "react";
import { fetchHeadlines, GuessResult, Headline, submitGuess } from "./api";

const BLANK = "___";
const MAX_POINTS = 10;

// 10 points for a first-try solve, one point less per extra guess.
function pointsFor(guessCount: number): number {
  return Math.max(0, MAX_POINTS - (guessCount - 1));
}

type Guess = { word: string; score: number };

export default function HeadlineGame() {
  const [headlines, setHeadlines] = useState<Headline[] | null>(null);
  const [index, setIndex] = useState(0);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [solved, setSolved] = useState<GuessResult | null>(null);
  const [results, setResults] = useState<number[]>([]); // guess count per finished headline
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const word = input.trim();
    if (!word || pending || solved) return;

    setPending(true);
    setError(null);
    try {
      const result = await submitGuess(headline.id, word);
      const next = [...guesses, { word, score: result.score }];
      setGuesses(next);
      setInput("");
      if (result.solved) {
        setSolved(result);
        setResults([...results, next.length]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  function nextHeadline() {
    if (index === headlines!.length - 1) {
      setShowSummary(true);
      return;
    }
    setIndex(index + 1);
    setGuesses([]);
    setSolved(null);
  }

  function restart() {
    setIndex(0);
    setGuesses([]);
    setSolved(null);
    setResults([]);
    setShowSummary(false);
  }

  const isLast = index === headlines.length - 1;
  const sortedGuesses = [...guesses].sort((a, b) => b.score - a.score);

  return (
    <section className="game">
      <p className="progress">
        Overskrift {index + 1} av {headlines.length}
      </p>

      <h2 className="headline">
        {before}
        <span className={solved ? "blank solved" : "blank"}>{solved ? solved.answer : "?"}</span>
        {after}
      </h2>

      {solved ? (
        <div className="solved-box">
          <p>
            Riktig! Løst på {guesses.length} forsøk —{" "}
            {pointsFor(guesses.length)} poeng.
          </p>
          <button autoFocus onClick={nextHeadline}>
            {isLast ? "Se resultat" : "Neste overskrift"}
          </button>
        </div>
      ) : (
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

function Summary({ results, onRestart }: { results: number[]; onRestart: () => void }) {
  const total = results.reduce((sum, n) => sum + pointsFor(n), 0);
  return (
    <section className="game">
      <h2>Ferdig!</h2>
      <p>
        Du fikk <strong>{total}</strong> av {results.length * MAX_POINTS} poeng.
      </p>
      <ol>
        {results.map((n, i) => (
          <li key={i}>
            {n} forsøk — {pointsFor(n)} poeng
          </li>
        ))}
      </ol>
      <button onClick={onRestart}>Spill igjen</button>
    </section>
  );
}
