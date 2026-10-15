export type Headline = { id: number; text: string };

export type GuessResult = {
  score: number;
  solved: boolean;
  answer: string | null;
  full_text: string | null;
};

export async function fetchHeadlines(): Promise<Headline[]> {
  const res = await fetch("/api/headlines");
  if (!res.ok) throw new Error(`Failed to load headlines (${res.status})`);
  return res.json();
}

export async function submitGuess(headlineId: number, guess: string): Promise<GuessResult> {
  const res = await fetch("/api/guess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ headline_id: headlineId, guess }),
  });
  if (!res.ok) throw new Error(`Guess failed (${res.status})`);
  return res.json();
}
