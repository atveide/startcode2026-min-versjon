import { CSSProperties, useState } from "react";
import type { Story, StoryImage } from "../api";
import { Icon } from "../icons";
import { categoryColor } from "../logic";
import { useApp } from "../state";

export function accent(story: Story): CSSProperties {
  return { "--accent": categoryColor(story.category) } as CSSProperties;
}

export function NewsGraphic() {
  return (
    <div className="news-graphic" aria-hidden="true">
      <span>“</span>
      <div />
    </div>
  );
}

/** A full-bleed panel photo. Falls back to the news graphic when the photo is missing. */
export function PanelImage({ image, priority = false }: { image: StoryImage | null; priority?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!image || failedSrc === image.src) return <NewsGraphic />;
  return (
    <img
      className="panel-image"
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
export function Thumb({ image }: { image: StoryImage | null }) {
  const [failed, setFailed] = useState(false);
  if (!image || failed)
    return (
      <span className="history-placeholder">
        <Icon name="feed" size={24} />
      </span>
    );
  return <img src={image.src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

export function Tag({ story }: { story: Story }) {
  return (
    <span className="tag" style={accent(story)}>
      {story.category}
    </span>
  );
}

export function ReadBadge({ story }: { story: Story }) {
  const { read } = useApp();
  if (!read.includes(story.id)) return null;
  return (
    <span className="read-badge">
      Lest <Icon name="check" size={13} />
    </span>
  );
}

export function SaveButton({ story, className = "" }: { story: Story; className?: string }) {
  const { saved, toggleSaved } = useApp();
  const isSaved = saved.includes(story.id);
  return (
    <button
      className={`save-story ${className} ${isSaved ? "is-saved" : ""}`}
      onClick={() => toggleSaved(story.id)}
      aria-label={isSaved ? "Fjern fra lagrede" : "Lagre sak"}
      aria-pressed={isSaved}
    >
      <Icon name="bookmark" size={23} />
    </button>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      Opplyst
      <span className="wordmark-dot" aria-hidden="true" />
    </span>
  );
}

export function SearchBox({
  id,
  value,
  onChange,
  placeholder = "Søk i saker",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
      <label className="sr-only" htmlFor={id}>
        Søk i sakene
      </label>
      <Icon name="search" size={21} />
      <input
        id={id}
        type="search"
        placeholder={placeholder}
        value={value}
        autoComplete="off"
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
