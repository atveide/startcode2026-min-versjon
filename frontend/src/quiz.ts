import type { Quiz } from "./api";
import { load, save } from "./storage";

export const BLANK = "___";
export const MAX_POINTS = 10;

export type Guess = { word: string; score: number };

export type QuestionState = {
  guesses: Guess[];
  hints: number;
  hint: string | null;
  answer: string | null; // set once solved or given up
  fullText: string | null;
  gaveUp: boolean;
  readStory: boolean; // opened the story behind the question
};

export type QuizProgress = {
  quizId: string;
  index: number;
  questions: QuestionState[];
  finished: boolean;
};

const KEY = "opplyst-quiz-v1";

function emptyQuestion(): QuestionState {
  return { guesses: [], hints: 0, hint: null, answer: null, fullText: null, gaveUp: false, readStory: false };
}

export function newProgress(quiz: Quiz): QuizProgress {
  return { quizId: quiz.id, index: 0, questions: quiz.headlines.map(emptyQuestion), finished: false };
}

/** Progress for this week's quiz, or a fresh start when it's a new week or the data is unusable. */
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

// 10 points for a first-try solve; every extra guess and every hint costs a point.
// Reading the story is free: it's what the game wants you to do.
export function pointsFor(q: QuestionState): number {
  if (!isDone(q) || q.gaveUp) return 0;
  return Math.max(0, MAX_POINTS - (q.guesses.length - 1) - q.hints);
}

export function totalPoints(progress: QuizProgress): number {
  return progress.questions.reduce((sum, q) => sum + pointsFor(q), 0);
}

export function hasStarted(progress: QuizProgress): boolean {
  return progress.finished || progress.index > 0 || progress.questions.some((q) => q.guesses.length || q.hints || isDone(q));
}

export function verdict(points: number, max: number): { title: string; text: string } {
  const ratio = max ? points / max : 0;
  if (ratio >= 0.8)
    return {
      title: "Godt opplyst!",
      text: "Du har fulgt med på ukens nyheter. Utforsk feeden, så er du klar til morgendagens spill.",
    };
  if (ratio >= 0.5)
    return {
      title: "Godt på vei",
      text: "Du kan mye om ukens nyheter. Les sakene du bommet på, så går det enda bedre i morgen.",
    };
  return {
    title: "Tid for å lese seg opp",
    text: "Sakene bak spørsmålene ligger i feeden. Les deg opp, så stiller du sterkere i morgen.",
  };
}

/** How warm a guess is, for colouring the bar. */
export function heat(score: number): "hot" | "warm" | "cold" {
  if (score >= 70) return "hot";
  if (score >= 30) return "warm";
  return "cold";
}
