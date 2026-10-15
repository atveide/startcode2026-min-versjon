export type StoryImage = { src: string; alt: string | null; caption: string | null; credit: string | null };

/** Adressa's own «Kort oppsummert», unchanged, with its AI and editorial disclosure. */
export type Summary = {
  heading: string;
  bullets: string[];
  source: string;
  sourceUrl: string;
  disclosure: string | null;
  disclosureUrl: string | null;
};

export type Block = { type: "paragraph" | "heading" | "list"; text: string | null; items: string[] | null };

export type Story = {
  id: string;
  title: string;
  url: string;
  category: string;
  source: string;
  publishedAt: string;
  modifiedAt: string | null;
  authors: string[];
  lead: string | null;
  summary: Summary | null;
  image: StoryImage | null;
  body: Block[];
  /** True when the local Adressa import has the full article on this machine. */
  imported: boolean;
};

export type Stories = { week: number; importedAt: string | null; stories: Story[] };

export type Headline = { id: number; text: string; story_id: string };

export type Quiz = { id: string; date: string; week: number; max_hints: number; headlines: Headline[] };

export type GuessResult = {
  score: number;
  solved: boolean;
  answer: string | null;
  full_text: string | null;
};

export type Hint = { hint: string; level: number; max_level: number };

async function request<T>(url: string, init: RequestInit | undefined, failure: string): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${failure} (${res.status})`);
  return res.json();
}

export function fetchStories(): Promise<Stories> {
  return request("/api/stories", undefined, "Vi kunne ikke hente sakene");
}

export function fetchQuiz(): Promise<Quiz> {
  return request("/api/quiz", undefined, "Vi kunne ikke hente ukens quiz");
}

export function submitGuess(headlineId: number, guess: string): Promise<GuessResult> {
  return request(
    "/api/guess",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headline_id: headlineId, guess }),
    },
    "Vi fikk ikke sjekket svaret. Prøv igjen",
  );
}

export function fetchHint(headlineId: number, level: number): Promise<Hint> {
  return request(`/api/headlines/${headlineId}/hint/${level}`, undefined, "Vi fikk ikke hentet hintet");
}

export function revealAnswer(headlineId: number): Promise<{ answer: string; full_text: string }> {
  return request(
    `/api/headlines/${headlineId}/reveal`,
    { method: "POST" },
    "Vi fikk ikke hentet svaret",
  );
}
