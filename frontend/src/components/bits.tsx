import { CSSProperties, useState } from "react";
import type { Story, StoryImage } from "../api";
import { Icon } from "../icons";
import { categoryColor } from "../logic";
import { isComplete } from "../quiz";
import { useApp } from "../state";
import { activeStreak } from "../streak";

export function accent(story: Story): CSSProperties {
  return { "--accent": categoryColor(story.category) } as CSSProperties;
}

/** Shown where a photo is missing: a plain dark surface, nothing made up. */
export function NewsGraphic() {
  return <div className="news-graphic" aria-hidden="true" />;
}

/** A full-bleed photo. Falls back to a plain surface when the photo is missing or fails. */
export function PanelImage({
  image,
  priority = false,
  className = "panel-image",
}: {
  image: StoryImage | null;
  priority?: boolean;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!image || failedSrc === image.src) return <NewsGraphic />;
  return (
    <img
      className={className}
      src={image.src}
      alt={image.alt ?? ""}
      loading={priority ? "eager" : "lazy"}
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => setFailedSrc(image.src)}
    />
  );
}

/** A small thumbnail, or a placeholder when the photo is missing. */
export function Thumb({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed)
    return (
      <span className="thumb-placeholder">
        <Icon name="feed" size={24} />
      </span>
    );
  return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

/** «Åpnet» means the reader opened the story, not that they read it. */
export function OpenedBadge({ id }: { id: string }) {
  const { opened } = useApp();
  if (!opened.includes(id)) return null;
  return (
    <span className="opened-badge">
      <Icon name="check" size={14} /> Åpnet
    </span>
  );
}

export function SaveButton({
  id,
  className = "",
  labelled = false,
}: {
  id: string;
  className?: string;
  labelled?: boolean;
}) {
  const { saved, toggleSaved } = useApp();
  const isSaved = saved.includes(id);
  return (
    <button
      className={`save-button ${labelled ? "labelled" : ""} ${className} ${isSaved ? "is-saved" : ""}`}
      onClick={() => toggleSaved(id)}
      aria-label={isSaved ? "Fjern fra Lagret" : "Lagre"}
      aria-pressed={isSaved}
    >
      <Icon name="bookmark" size={labelled ? 28 : 22} />
      {labelled && <span aria-hidden="true">{isSaved ? "Lagret" : "Lagre"}</span>}
    </button>
  );
}

/** «Opplyst fra Adressa»: small and readable on every screen. */
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-name">Oppdatert</span>
      <span className="brand-from">fra Adressa</span>
    </span>
  );
}

export function SearchBox({
  id,
  value,
  onChange,
  placeholder = "Søk i saker og videoer",
  autoFocus = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
      <label className="sr-only" htmlFor={id}>
        Søk
      </label>
      <Icon name="search" size={21} />
      <input
        id={id}
        type="search"
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        autoFocus={autoFocus}
        enterKeyHint="search"
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button className="clear" type="button" aria-label="Tøm søk" onClick={() => onChange("")}>
          <Icon name="close" size={18} />
        </button>
      )}
    </form>
  );
}

/** The current and the best streak of finished daily quizzes, side by side. */
export function StreakBox({ className = "" }: { className?: string }) {
  const { quiz, progress, streak } = useApp();
  const current = activeStreak(streak, quiz.date);
  const keepGoing = current > 0 && !isComplete(progress);
  const stats = [
    { label: "Nåværende streak", days: current, current: true },
    { label: "Beste streak", days: streak.best, current: false },
  ];
  return (
    <section className={`streak-box ${className}`} aria-label="Streak med fullførte quizer">
      <dl className="streak-stats">
        {stats.map((s) => (
          <div key={s.label} className={`streak-stat ${s.current ? "current" : ""}`}>
            <dt>{s.label}</dt>
            <dd>
              <b>{s.days}</b>
            </dd>
          </div>
        ))}
      </dl>
      {keepGoing && <p className="streak-note">Fullfør dagens quiz for å holde streaken.</p>}
    </section>
  );
}
