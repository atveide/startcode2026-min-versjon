import type { Quiz } from "./api";
import { load, save } from "./storage";

export const BLANK = "___";
export const MAX_POINTS = 10;

/** A guess and how close its meaning is to the missing word, 0-100. Not points. */
export type Guess = { word: string; score: number };

export type QuestionState = {
  guesses: Guess[];
  answer: string | null; // set once solved or given up
  fullText: string | null;
  gaveUp: boolean;
  readStory: boolean; // opened the story behind the question
  draft: string; // what the player has typed but not sent, kept while they read the story
};

export type QuizProgress = {
  quizId: string;
  index: number;
  questions: QuestionState[];
  started: boolean;
  finished: boolean;
};

const KEY = "opplyst-quiz-v1";

function emptyQuestion(): QuestionState {
  return {
    guesses: [],
    answer: null,
    fullText: null,
    gaveUp: false,
    readStory: false,
    draft: "",
  };
}

export function newProgress(quiz: Quiz): QuizProgress {
  return { quizId: quiz.id, index: 0, questions: quiz.headlines.map(emptyQuestion), started: false, finished: false };
}

/** Progress for today's quiz, or a fresh start when it's a new day or the data is unusable. */
export function loadProgress(quiz: Quiz): QuizProgress {
  const stored = load(KEY) as Partial<QuizProgress> | null;
  if (
    !stored ||
    stored.quizId !== quiz.id ||
    !Array.isArray(stored.questions) ||
    stored.questions.length !== quiz.headlines.length ||
    typeof stored.index !== "number" ||
    stored.index < 0 ||
    stored.index >= quiz.headlines.length
  ) {
    return newProgress(quiz);
  }
  return {
    quizId: quiz.id,
    index: stored.index,
    started: Boolean(stored.started),
    finished: Boolean(stored.finished),
    questions: stored.questions.map((q) => ({ ...emptyQuestion(), ...q })),
  };
}

export function saveProgress(progress: QuizProgress) {
  save(KEY, progress);
}

export function isDone(q: QuestionState): boolean {
  return q.answer !== null;
}

// 10 points for a first-try solve; every extra guess costs a point.
// Reading the story is free: it's what the game wants you to do.
export function pointsFor(q: QuestionState): number {
  if (!isDone(q) || q.gaveUp) return 0;
  return Math.max(0, MAX_POINTS - (q.guesses.length - 1));
}

export function totalPoints(progress: QuizProgress): number {
  return progress.questions.reduce((sum, q) => sum + pointsFor(q), 0);
}

export function hasStarted(progress: QuizProgress): boolean {
  return (
    progress.started ||
    progress.finished ||
    progress.index > 0 ||
    progress.questions.some((q) => q.guesses.length || isDone(q))
  );
}

/** Every question is answered or skipped, whether or not the player has moved on to the news. */
export function isComplete(progress: QuizProgress): boolean {
  return progress.finished || progress.questions.every(isDone);
}

export function verdict(points: number, max: number): string {
  const ratio = max ? points / max : 0;
  if (ratio >= 0.8) return "Godt opplyst!";
  if (ratio >= 0.5) return "Godt på vei";
  return "Tid for å lese seg opp";
}

/** The colour of a question's points when shared: green for full points, down to white for none. */
function pointsDot(points: number): string {
  if (points >= MAX_POINTS) return "🟢";
  if (points >= 5) return "🟡";
  if (points > 0) return "🔵";
  return "⚪";
}

/**
 * The result as text to share, without giving away any answers: the points per question,
 * a 💡 where the player read the story, and the sum.
 */
export function shareText(progress: QuizProgress, day: string): string {
  const lines = progress.questions.map((q, i) => {
    const points = pointsFor(q);
    return `${i + 1}:   ${pointsDot(points)} ${points} poeng${q.readStory ? " 💡" : ""}`;
  });
  return [`Opplyst ${day}`, ...lines, `Sum: ${totalPoints(progress)} poeng`].join("\n");
}

export type Heat = "cold" | "warm" | "hot" | "right";

/**
 * How warm a guess is: under 30 cold, 30-69 lukewarm, 70-99 warm. The backend gives 100 only
 * to a guess it judged correct, so a high score alone never counts as solved.
 */
export function heat(score: number): Heat {
  if (score >= 100) return "right";
  if (score >= 70) return "hot";
  if (score >= 30) return "warm";
  return "cold";
}

export const HEAT_LABEL: Record<Heat, string> = { cold: "Kaldt", warm: "Lunkent", hot: "Varmt", right: "Riktig" };
