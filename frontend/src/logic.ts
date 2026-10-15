import type { Story, Video } from "./api";

export function normalize(text: string): string {
  return String(text)
    .toLocaleLowerCase("nb-NO")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matches(text: string, query: string): boolean {
  const terms = normalize(query).split(" ").filter(Boolean);
  const haystack = normalize(text);
  return terms.every((t) => haystack.includes(t));
}

// Searches what the feed shows: title, category, the lead and both kinds of summary.
export function storyMatches(s: Story, query = "", category = "Alle"): boolean {
  if (category !== "Alle" && s.category !== category) return false;
  const text = [s.title, s.category, s.lead ?? "", ...(s.summary?.bullets ?? []), ...(s.opplystSummary?.points ?? [])];
  return matches(text.join(" "), query);
}

export function videoMatches(v: Video, query = "", category = "Alle"): boolean {
  if (category !== "Alle" && category !== "Video") return false;
  return matches([v.title, v.description ?? "", "video"].join(" "), query);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Oslo",
  }).format(new Date(value));
}

/** «15. okt.», in Oslo time. Plain YYYY-MM-DD dates are read as that day. */
export function formatDay(value: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short", timeZone: "Europe/Oslo" }).format(date);
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const categoryColors: Record<string, string> = { Sport: "#4E9D2D", Kultur: "#C3002F" };

export function categoryColor(category: string): string {
  return categoryColors[category] ?? "#005379";
}
