// The reader's personal key for the encrypted full stories (see scripts/encrypt-stories.mjs).
// It arrives once in the #fragment of the unlock link, which browsers never send to a server,
// and is kept in this browser only.

const KEY = "opplyst-reader-key";
const FRAGMENT = /^#nokkel=([A-Za-z0-9_-]{40,})$/;

export function getReaderKey(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setReaderKey(key: string | null) {
  try {
    if (key) localStorage.setItem(KEY, key);
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the stories just stay locked.
  }
}

/** Accepts the whole unlock link or the bare key. */
export function keyFrom(input: string): string | null {
  const text = input.trim();
  const fromLink = text.match(/#nokkel=([A-Za-z0-9_-]{40,})/);
  if (fromLink) return fromLink[1];
  return /^[A-Za-z0-9_-]{40,}$/.test(text) ? text : null;
}

/** For the Home Screen app, which has its own storage: paste the link once more. */
export function askForKey() {
  const input = prompt("Lim inn opplåsingslenken du fikk:");
  if (input === null) return;
  const key = keyFrom(input);
  if (!key) {
    alert("Det ser ikke ut som en opplåsingslenke. Kopier hele lenken og prøv igjen.");
    return;
  }
  setReaderKey(key);
  location.reload();
}

// Runs on import, before the router reads the address: keep the key, drop it from the URL.
const match = location.hash.match(FRAGMENT);
if (match) {
  setReaderKey(match[1]);
  history.replaceState(history.state, "", location.pathname + location.search);
}
