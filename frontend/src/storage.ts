// localStorage can be missing or throw (private windows, blocked site data),
// so every read and write goes through these helpers.

export function load(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

export function save(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadIds(key: string, validIds: string[]): string[] {
  const value = load(key);
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => validIds.includes(id)))];
}
