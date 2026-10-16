import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Story, Video } from "../api";
import { Icon } from "../icons";
import { formatDay, formatTime, storyMatches, videoMatches } from "../logic";
import { isComplete } from "../quiz";
import { Link } from "../router";
import { useApp } from "../state";
import { load, save } from "../storage";
import BottomNav from "./BottomNav";
import { Brand, OpenedBadge, PanelImage, SaveButton, SearchBox } from "./bits";

const ADRESSA_URL = "https://www.adressa.no/";

type Item = { key: string; kind: "article"; story: Story } | { key: string; kind: "video"; video: Video };

// Where the reader is in the feed, kept across tab changes, story visits and later visits the
// same day. Video positions are kept for this session.
const POSITION_KEY = "opplyst-feed-position-v1";
const TIMES_KEY = "opplyst-video-times-v1";
type Position = { day: string; key: string | null };
let position = load(POSITION_KEY) as Position | null;
const videoTimes = new Map<string, number>(
  Object.entries((() => {
    try {
      return JSON.parse(sessionStorage.getItem(TIMES_KEY) ?? "{}") as Record<string, number>;
    } catch {
      return {};
    }
  })()),
);

function rememberTime(id: string, time: number) {
  videoTimes.set(id, time);
  try {
    sessionStorage.setItem(TIMES_KEY, JSON.stringify(Object.fromEntries(videoTimes)));
  } catch {
    // Not remembered after a reload; the clip starts from the beginning.
  }
}

function itemId(item: Item) {
  return item.kind === "article" ? `sak-${item.story.id}` : `video-${item.video.id}`;
}

export default function FeedPage() {
  const { feed, storiesById, videosById, quiz, filter } = useApp();
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [searching, setSearching] = useState(false);
  const visible = usePageVisible();
  const filtered = Boolean(filter.query.trim()) || filter.category !== "Alle";

  const all = useMemo(
    () =>
      feed.flatMap((e): Item[] => {
        if (e.type === "article") {
          const story = storiesById.get(e.id);
          return story ? [{ key: `article:${e.id}`, kind: "article", story }] : [];
        }
        const video = videosById.get(e.id);
        return video ? [{ key: `video:${e.id}`, kind: "video", video }] : [];
      }),
    [feed, storiesById, videosById],
  );
  const items = useMemo(
    () =>
      all.filter((item) =>
        item.kind === "article"
          ? storyMatches(item.story, filter.query, filter.category)
          : videoMatches(item.video, filter.query, filter.category),
      ),
    [all, filter],
  );

  useEffect(() => {
    document.title = "Nyheter · Oppdatert";
  }, []);

  // Back where the reader left off: a #link first, then the remembered item, else the top.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const hash = location.hash.slice(1);
    const key = position?.day === quiz.date ? position.key : null;
    const target = hash
      ? document.getElementById(hash)
      : key
        ? el.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`)
        : null;
    el.scrollTop = target ? target.offsetTop : 0;
    // Active right away, so a video there can start without waiting for the first scroll.
    const start = target?.dataset.key ?? items[0]?.key ?? null;
    setActive(start);
    if (start && start !== "end" && !filtered) {
      position = { day: quiz.date, key: start };
      save(POSITION_KEY, position);
    }
    // The view is decided once, when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The active item is the one that fills most of the screen. Only it may play.
  useEffect(() => {
    const root = scroller.current;
    if (!root || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const cover = entry.rootBounds ? entry.intersectionRect.height / entry.rootBounds.height : 0;
          const key = (entry.target as HTMLElement).dataset.key ?? null;
          if (cover >= 0.6 && key) {
            setActive(key);
            if (!filtered && key !== "end") {
              position = { day: quiz.date, key };
              save(POSITION_KEY, position);
            }
          }
        }
      },
      { root, threshold: [0, 0.25, 0.5, 0.6, 0.75, 1] },
    );
    root.querySelectorAll("[data-key]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items, filtered, quiz.date]);

  const nextKey = items[items.findIndex((i) => i.key === active) + 1]?.key;

  return (
    <>
      <main id="main" className="feed" tabIndex={-1}>
        <h1 className="sr-only">Nyheter</h1>
        <header className="feed-top">
          <Link to="/" className="brand-link" aria-label="Oppdatert – til dagens quiz">
            <Brand />
          </Link>
          <button
            className={`icon-button on-photo ${filtered ? "is-on" : ""}`}
            onClick={() => setSearching(true)}
            aria-label={filtered ? "Søk og filter er på. Endre" : "Søk og filtrer"}
          >
            <Icon name="search" size={26} />
          </button>
        </header>
        {filtered && <FilterBar count={items.length} />}
        <div className="feed-scroller" ref={scroller}>
          {items.map((item, i) =>
            item.kind === "article" ? (
              <ArticleCard key={item.key} itemKey={item.key} id={itemId(item)} story={item.story} first={i === 0} />
            ) : (
              <VideoCard
                key={item.key}
                itemKey={item.key}
                id={itemId(item)}
                video={item.video}
                active={visible && active === item.key}
                preload={active === item.key ? "auto" : nextKey === item.key ? "metadata" : "none"}
                muted={muted}
                setMuted={setMuted}
              />
            ),
          )}
          {items.length === 0 ? <EmptyCard filtered={filtered} /> : <EndCard all={all} scroller={scroller} />}
        </div>
      </main>
      <SearchSheet open={searching} onClose={() => setSearching(false)} />
      <BottomNav current="news" />
    </>
  );
}

function usePageVisible() {
  const [visible, setVisible] = useState(() => document.visibilityState === "visible");
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
}

function FilterBar({ count }: { count: number }) {
  const { filter, setFilter } = useApp();
  const parts = [filter.query.trim() && `«${filter.query.trim()}»`, filter.category !== "Alle" && filter.category];
  return (
    <div className="filter-bar" role="status">
      <span>
        {parts.filter(Boolean).join(" · ")} · {count} {count === 1 ? "treff" : "treff"}
      </span>
      <button className="btn btn-text" onClick={() => setFilter({ query: "", category: "Alle" })}>
        Vis alt
      </button>
    </div>
  );
}

/**
 * Opplyst's bullet points when there are some, else Adressa's own lead or summary point, always
 * with its origin.
 */
function shortText(story: Story): { points?: string[]; text?: string; origin?: string } | null {
  const own = story.opplystSummary;
  if (own?.points.length) return { points: own.points, origin: own.label };
  if (story.lead) return { text: story.lead };
  if (story.summary?.bullets[0])
    return { text: story.summary.bullets[0], origin: story.summary.heading };
  return null;
}

function ArticleCard({ story, itemKey, id, first }: { story: Story; itemKey: string; id: string; first: boolean }) {
  const short = shortText(story);
  return (
    <article className="card card-article" data-key={itemKey} id={id} aria-labelledby={`${id}-title`}>
      <PanelImage image={story.image} priority={first} className="card-photo" />
      <div className="card-shade" />
      <div className="card-copy">
        <div className="card-rail">
          <SaveButton id={story.id} labelled />
        </div>
        <p className="kicker">
          {story.category} <span aria-hidden="true">·</span> {formatDay(story.publishedAt)}
        </p>
        <h2 id={`${id}-title`} className={`card-title ${story.title.length > 64 ? "long" : ""}`}>
          {story.title}
        </h2>
        {short?.points ? (
          <ul className="card-points">
            {short.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        ) : (
          short?.text && <p className="card-summary">{short.text}</p>
        )}
        {short?.origin && <p className="card-origin">{short.origin}</p>}
        <div className="card-actions">
          <Link className="btn btn-outline" to={`/sak/${story.id}`}>
            Les saken <Icon name="next" size={22} />
          </Link>
          <OpenedBadge id={story.id} />
        </div>
        {story.image?.credit && <p className="card-credit">Foto: {story.image.credit}</p>}
      </div>
    </article>
  );
}

type PlayState = "idle" | "playing" | "paused" | "blocked" | "error";

function VideoCard({
  video,
  itemKey,
  id,
  active,
  preload,
  muted,
  setMuted,
}: {
  video: Video;
  itemKey: string;
  id: string;
  active: boolean;
  preload: "auto" | "metadata" | "none";
  muted: boolean;
  setMuted: (muted: boolean) => void;
}) {
  const { storiesById } = useApp();
  const ref = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<PlayState>("idle");
  const [buffering, setBuffering] = useState(false);
  const [time, setTime] = useState(() => videoTimes.get(video.id) ?? 0);
  const [duration, setDuration] = useState(video.duration);
  const pausedByUser = useRef(false);
  const linked = video.articleId ? storiesById.get(video.articleId) : undefined;

  const play = useCallback(
    (withSound: boolean) => {
      const el = ref.current;
      if (!el) return;
      el.muted = !withSound;
      el.play().catch((err: DOMException) => {
        // Interrupted, say by a swipe: show the play button if it's still the clip on screen.
        if (err.name === "AbortError") return setState((s) => (el.paused && s !== "error" ? "paused" : s));
        if (err.name === "NotAllowedError" && withSound) {
          // Sound needs a tap first in this browser: play without it, and say so.
          setMuted(true);
          el.muted = true;
          el.play().catch(() => setState("blocked"));
        } else if (err.name === "NotAllowedError") setState("blocked");
        else setState("error");
      });
    },
    [setMuted],
  );

  // Plays only while this is the item on screen and the page is visible; pauses otherwise.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!active) {
      if (!el.paused) el.pause();
      pausedByUser.current = false;
      return;
    }
    if (pausedByUser.current || state === "error") return;
    const saved = videoTimes.get(video.id);
    if (saved && Math.abs(el.currentTime - saved) > 1) el.currentTime = saved;
    play(!muted);
    // Started when the card becomes active; sound changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, video.id]);

  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);

  function toggle() {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      pausedByUser.current = false;
      play(!muted);
    } else {
      pausedByUser.current = true;
      el.pause();
    }
  }

  function toggleSound() {
    const el = ref.current;
    setMuted(!muted);
    if (el) {
      el.muted = !muted;
      if (el.paused && muted) {
        pausedByUser.current = false;
        play(true);
      }
    }
  }

  function retry() {
    const el = ref.current;
    if (!el) return;
    setState("idle");
    el.load();
    play(!muted);
  }

  const playing = state === "playing";
  return (
    <article className="card card-video" data-key={itemKey} id={id} aria-labelledby={`${id}-title`}>
      <video
        ref={ref}
        className="card-media"
        src={video.src}
        poster={video.poster}
        preload={preload}
        playsInline
        muted={muted}
        loop
        aria-describedby={video.description ? `${id}-desc` : undefined}
        onPlay={() => setState("playing")}
        onPause={() => {
          setState((s) => (s === "error" ? s : "paused"));
          if (ref.current) rememberTime(video.id, ref.current.currentTime);
        }}
        onTimeUpdate={() => {
          const t = ref.current?.currentTime ?? 0;
          setTime(t);
          rememberTime(video.id, t);
        }}
        onLoadedMetadata={() => ref.current && Number.isFinite(ref.current.duration) && setDuration(ref.current.duration)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onCanPlay={() => setBuffering(false)}
        onError={() => {
          setBuffering(false);
          setState("error");
        }}
      />
      <button className="video-tap" onClick={toggle} tabIndex={-1} aria-hidden="true" />
      <div className="card-shade video-shade" />

      {state === "error" ? (
        <div className="video-overlay" role="alert">
          <p>Videoen kunne ikke spilles av her.</p>
          <button className="btn btn-primary" onClick={retry}>
            Prøv igjen
          </button>
        </div>
      ) : state === "blocked" || (active && state === "paused") ? (
        <button className="video-big-play" onClick={toggle} aria-label={`Spill av «${video.title}»`}>
          <Icon name="play" size={40} />
          {state === "blocked" && <span>Trykk for å spille av</span>}
        </button>
      ) : null}
      {buffering && active && state !== "error" && (
        <p className="video-buffering" role="status">
          <span className="spinner" aria-hidden="true" /> Laster video …
        </p>
      )}

      <div className="card-copy video-copy">
        <h2 id={`${id}-title`} className="card-title video-title">
          {video.title}
        </h2>
        <p className="card-origin">
          Video · {video.platform} · {formatDay(video.publishedAt)}
        </p>
        {video.description && (
          <p id={`${id}-desc`} className="sr-only">
            {video.description}
          </p>
        )}
        <div className="card-actions">
          {/* Only a documented link to a story gets a button; the clip itself is the news item. */}
          {linked && (
            <Link className="btn btn-outline" to={`/sak/${linked.id}`}>
              Les saken <Icon name="next" size={22} />
            </Link>
          )}
          <span className="video-buttons">
            <button className="round-button" onClick={toggle} aria-label={playing ? "Pause" : "Spill av"}>
              <Icon name={playing ? "pause" : "play"} size={24} />
            </button>
            <button
              className={`round-button ${muted ? "" : "is-on"}`}
              onClick={toggleSound}
              aria-label={muted ? "Lyden er av. Slå på lyd" : "Lyden er på. Slå av lyd"}
              title={muted ? "Lyden er av" : "Lyden er på"}
            >
              <Icon name={muted ? "muted" : "sound"} size={24} />
            </button>
            <SaveButton id={video.id} labelled />
          </span>
        </div>
        <div className="video-progress">
          <input
            type="range"
            min={0}
            max={Math.max(1, duration)}
            step={0.1}
            value={Math.min(time, duration)}
            onChange={(e) => {
              const t = Number(e.target.value);
              if (ref.current) ref.current.currentTime = t;
              setTime(t);
              rememberTime(video.id, t);
            }}
            aria-label="Spol i videoen"
            aria-valuetext={`${formatTime(time)} av ${formatTime(duration)}`}
            style={{ "--done": `${(Math.min(time, duration) / Math.max(1, duration)) * 100}%` } as React.CSSProperties}
          />
          <span className="video-time" aria-hidden="true">
            {formatTime(time)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </article>
  );
}

function EndCard({ all, scroller }: { all: Item[]; scroller: React.RefObject<HTMLDivElement | null> }) {
  const { progress } = useApp();
  const stories = all.filter((i) => i.kind === "article").length;
  const clips = all.length - stories;
  return (
    <section className="card card-end" data-key="end" aria-labelledby="feed-end-title">
      <h2 id="feed-end-title">Det var alle innslagene</h2>
      <p>
        {stories} {stories === 1 ? "sak" : "saker"}
        {clips > 0 && ` og ${clips} ${clips === 1 ? "video" : "videoer"}`} denne uken.
      </p>
      <a className="btn btn-primary" href={ADRESSA_URL} target="_blank" rel="noopener noreferrer">
        Les flere saker <Icon name="external" size={20} />
      </a>
      {!isComplete(progress) && (
        <Link className="btn btn-outline" to="/">
          Til dagens quiz
        </Link>
      )}
      <button className="btn btn-text" onClick={() => scroller.current?.scrollTo({ top: 0 })}>
        Til toppen
      </button>
    </section>
  );
}

function EmptyCard({ filtered }: { filtered: boolean }) {
  const { setFilter } = useApp();
  return (
    <section className="card card-end" data-key="end">
      <h2>{filtered ? "Ingen treff" : "Ingen saker akkurat nå"}</h2>
      <p>{filtered ? "Prøv et annet søkeord eller vis alt." : "Prøv igjen litt senere."}</p>
      {filtered && (
        <button className="btn btn-primary" onClick={() => setFilter({ query: "", category: "Alle" })}>
          Vis alt
        </button>
      )}
    </section>
  );
}

function SearchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { stories, videos, filter, setFilter } = useApp();
  const ref = useRef<HTMLDialogElement>(null);
  const categories = useMemo(
    () => ["Alle", ...new Set(stories.map((s) => s.category)), ...(videos.length ? ["Video"] : [])],
    [stories, videos],
  );
  const count =
    stories.filter((s) => storyMatches(s, filter.query, filter.category)).length +
    videos.filter((v) => videoMatches(v, filter.query, filter.category)).length;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="search-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-head">
        <h2 id="search-title">Søk og filtrer</h2>
        <button className="icon-button" onClick={onClose} aria-label="Lukk">
          <Icon name="close" />
        </button>
      </div>
      <SearchBox id="feed-search" value={filter.query} onChange={(query) => setFilter({ ...filter, query })} />
      <div className="chips" role="group" aria-label="Kategori">
        {categories.map((c) => (
          <button
            key={c}
            className={`chip ${c === filter.category ? "active" : ""}`}
            aria-pressed={c === filter.category}
            onClick={() => setFilter({ ...filter, category: c })}
          >
            {c}
          </button>
        ))}
      </div>
      <button className="btn btn-primary btn-wide" onClick={onClose}>
        Vis {count} {count === 1 ? "innslag" : "innslag"}
      </button>
    </dialog>
  );
}
