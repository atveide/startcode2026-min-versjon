import { AnchorHTMLAttributes, MouseEvent, useSyncExternalStore } from "react";

// A small history-API router. Each entry remembers its scroll position, so going
// back to the feed lands where the reader left it.

type Location = { pathname: string; search: string; hash: string };
type ScrollTarget = { y: number } | { hash: string };
type EntryState = { y: number; inApp: boolean; from?: string };

const listeners = new Set<() => void>();
let current = read();
let scrollTarget: ScrollTarget | null = location.hash ? { hash: location.hash.slice(1) } : null;

function read(): Location {
  return { pathname: location.pathname, search: location.search, hash: location.hash };
}

function emit() {
  current = read();
  listeners.forEach((listener) => listener());
}

history.scrollRestoration = "manual";
if (!(history.state as EntryState | null)?.inApp) {
  history.replaceState({ y: 0, inApp: false } satisfies EntryState, "");
}

window.addEventListener("popstate", () => {
  // Plain #hash jumps create entries without our state; let the browser scroll those.
  const state = history.state as EntryState | null;
  scrollTarget = state ? { y: state.y } : null;
  emit();
});

export function navigate(to: string) {
  const url = new URL(to, location.origin);
  const from = location.pathname + location.search;
  history.replaceState({ ...history.state, y: scrollY }, "");
  history.pushState({ y: 0, inApp: true, from } satisfies EntryState, "", url.pathname + url.search + url.hash);
  scrollTarget = url.hash ? { hash: url.hash.slice(1) } : { y: 0 };
  emit();
}

/** Go back in history when the previous page is ours, otherwise open `fallback`. */
export function goBack(fallback = "/") {
  if ((history.state as EntryState | null)?.inApp) history.back();
  else navigate(fallback);
}

/** The path we came from, if this page was opened inside the app. */
export function previousPath(): string | undefined {
  return (history.state as EntryState | null)?.from;
}

export function takeScrollTarget(): ScrollTarget | null {
  const target = scrollTarget;
  scrollTarget = null;
  return target;
}

export function useLocation(): Location {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

export function Link({ to, onClick, ...rest }: LinkProps) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  }
  return <a href={to} onClick={handleClick} {...rest} />;
}
