export type StoryImage = { src: string; alt: string; credit?: string | null };
export type Source = { title: string; url: string };
export type QA = { q: string; a: string; tags: string[] };

export type Story = {
  id: string;
  title: string;
  category: string;
  color: string;
  latest: boolean;
  updated: string;
  images: StoryImage[];
  summary: string[];
  developments: string[];
  background: string;
  sources: Source[];
  qa: QA[];
};

export type Stories = { snapshot: string; stories: Story[] };

export type Headline = { id: number; text: string; story_id: string };

export type Quiz = { id: string; week: number; max_hints: number; headlines: Headline[] };

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
