import { load, save } from "./storage";

/** Days in a row with a finished daily quiz. Lives only in this browser. */
export type Streak = { current: number; best: number; lastDate: string | null };

const KEY = "opplyst-streak-v1";

export function loadStreak(): Streak {
  const stored = load(KEY) as Partial<Streak> | null;
  const current = Number(stored?.current) || 0;
  const best = Number(stored?.best) || 0;
  const lastDate = typeof stored?.lastDate === "string" ? stored.lastDate : null;
  return { current, best: Math.max(best, current), lastDate };
}

/** The quiz date before `date`, both as YYYY-MM-DD. */
function dayBefore(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Counts today's finished quiz: one more if yesterday's was finished too, otherwise a new streak of 1. */
export function recordCompletion(streak: Streak, date: string): Streak {
  if (streak.lastDate === date) return streak;
  const current = streak.lastDate === dayBefore(date) ? streak.current + 1 : 1;
  const next = { current, best: Math.max(streak.best, current), lastDate: date };
  save(KEY, next);
  return next;
}

/** The streak as it stands on `date`: still alive if the last finished quiz was today or yesterday. */
export function activeStreak(streak: Streak, date: string): number {
  return streak.lastDate === date || streak.lastDate === dayBefore(date) ? streak.current : 0;
}
