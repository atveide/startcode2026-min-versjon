import { useState } from "react";
import { Icon } from "../icons";
import { Wordmark } from "./bits";

const KEY = "opplyst-fullscreen-asked";

// Ask once per visit, and only where the browser can actually go fullscreen (not on iPhone).
function shouldAsk(): boolean {
  const supported = document.fullscreenEnabled && typeof document.documentElement.requestFullscreen === "function";
  const already =
    Boolean(document.fullscreenElement) || matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches;
  let asked = false;
  try {
    asked = sessionStorage.getItem(KEY) === "1";
  } catch {
    // Storage can be blocked; then we simply ask.
  }
  return supported && !already && !asked;
}

/** «Opplyst er best i fullskjerm»: shown before the app, so it feels like a real app. */
export default function FullscreenPrompt() {
  const [open, setOpen] = useState(shouldAsk);
  if (!open) return null;

  function close() {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      // Not remembered; the prompt just shows again next visit.
    }
    setOpen(false);
  }

  async function enter() {
    try {
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
      // Phones keep the app upright where the browser allows it.
      await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("portrait");
    } catch {
      // Fullscreen or the orientation lock was refused; the app works the same without.
    }
    close();
  }

  return (
    <div className="fs-prompt" role="dialog" aria-modal="true" aria-labelledby="fs-title">
      <div className="fs-card">
        <Wordmark />
        <h2 id="fs-title">Opplyst er best i fullskjerm</h2>
        <p>Sveip deg gjennom ukens nyheter og dagens spill uten adresselinje og nettlesermenyer.</p>
        <button className="quiz-submit" autoFocus onClick={enter}>
          Gå i fullskjerm
          <Icon name="next" size={20} />
        </button>
        <button className="fs-skip" onClick={close}>
          Fortsett uten fullskjerm
        </button>
      </div>
    </div>
  );
}
