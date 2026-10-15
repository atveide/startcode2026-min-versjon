import type { Story } from "./api";

export function normalize(text: string): string {
  return String(text)
    .toLocaleLowerCase("nb-NO")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Searches what the feed card shows: title, category, the lead and Adressa's summary points.
export function filterStories(stories: Story[], query = "", category = "Alle"): Story[] {
  const terms = normalize(query).split(" ").filter(Boolean);
  return stories.filter(
    (s) =>
      (category === "Alle" || s.category === category) &&
      terms.every((t) =>
        normalize([s.title, s.category, s.lead ?? "", ...(s.summary?.bullets ?? [])].join(" ")).includes(t),
      ),
  );
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

const categoryColors: Record<string, string> = { Sport: "#4E9D2D", Kultur: "#C3002F" };

export function categoryColor(category: string): string {
  return categoryColors[category] ?? "#005379";
}
