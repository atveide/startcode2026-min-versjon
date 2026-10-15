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

export function filterStories(stories: Story[], query = "", category = "Alle"): Story[] {
  const terms = normalize(query).split(" ").filter(Boolean);
  return stories.filter(
    (s) =>
      (category === "Alle" || s.category === category) &&
      terms.every((t) =>
        normalize([s.title, s.category, ...s.summary, ...s.developments, s.background].join(" ")).includes(t),
      ),
  );
}

const stopWords = new Set(
  "hva er det en et de den dette denne i pa til for med og a som om seg har ble var kan jeg du han hun fikk fa saken fra meg vil gi fortell mer litt".split(
    " ",
  ),
);
const genericWords = new Set("hvor hvem nar hvordan hvorfor etter mange skjedde hendelsen".split(" "));

export type Answer = { answer: string; matched: boolean };

// Extractive local retrieval: it only returns a stored answer, never generated facts.
export function answerQuestion(story: Story, question: string): Answer {
  const query = normalize(question);
  const exact = story.qa.find((item) => normalize(item.q) === query);
  if (exact) return { answer: exact.a, matched: true };
  const words = query.split(" ").filter((w) => w.length > 2 && !stopWords.has(w));
  const similar = (w: string, t: string) =>
    t === w || (w.length > 4 && t.length > 4 && (t.startsWith(w) || w.startsWith(t)));
  const ranked = story.qa
    .map((item) => {
      const tags = normalize(item.tags.join(" ")).split(" ");
      const score = words.reduce((sum, w) => sum + (tags.some((t) => similar(w, t)) ? 1 : 0), 0);
      const contentMatch = words.some((w) => !genericWords.has(w) && tags.some((t) => similar(w, t)));
      return { item, score, contentMatch };
    })
    .sort((a, b) => b.score - a.score);
  const simpleIntent = words.length > 0 && words.every((w) => genericWords.has(w));
  const best = ranked[0];
  if (!best?.score || (!best.contentMatch && !simpleIntent)) {
    return {
      answer:
        "Jeg finner ikke et sikkert svar på dette i det lagrede utvalget. Prøv et av spørsmålene over, eller åpne kildene for mer informasjon.",
      matched: false,
    };
  }
  return { answer: best.item.a, matched: true };
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
