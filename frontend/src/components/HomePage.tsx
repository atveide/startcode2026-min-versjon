import { useMemo } from "react";
import type { Story } from "../api";
import { Icon } from "../icons";
import { filterStories, formatDate } from "../logic";
import { hasStarted, totalPoints, MAX_POINTS } from "../quiz";
import { Link } from "../router";
import { useApp } from "../state";
import BottomNav from "./BottomNav";
import { accent, PanelImage, ReadBadge, SaveButton, SearchBox, Tag } from "./bits";

export default function HomePage() {
  return (
    <>
      <main id="main" className="feed" tabIndex={-1}>
        <Cover />
        <Feed />
      </main>
      <BottomNav current="feed" />
    </>
  );
}

function scrollToFeed() {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById("feed")?.scrollIntoView({ behavior: reduced ? "instant" : "smooth" });
}

function Cover() {
  const { stories, quiz, progress, showAbout } = useApp();
  const coverStory = stories.find((s) => s.images.length > 0);
  const coverImage = coverStory?.images[1] ?? coverStory?.images[0];
  const top = useMemo(
    () => [...stories].sort((a, b) => Date.parse(b.updated) - Date.parse(a.updated)).slice(0, 3),
    [stories],
  );
  const count = quiz.headlines.length;

  let cta = "Start ukens nyhetsquiz";
  let detail: string | null = null;
  if (progress.finished) {
    cta = "Se resultatet ditt";
    detail = `${totalPoints(progress)} av ${count * MAX_POINTS} poeng`;
  } else if (hasStarted(progress)) {
    cta = "Fortsett quizen";
    detail = `spørsmål ${progress.index + 1} av ${count}`;
  }

  return (
    <section className="daily-cover story-panel" aria-labelledby="cover-title">
      <PanelImage image={coverImage} priority />
      <div className="panel-shade" />
      <div className="story-top">
        <button className="edition-note" onClick={showAbout}>
          Opplyst <span>· Uke {quiz.week} · Lagret utgave</span>
        </button>
        <span className="brand-badge" aria-hidden="true">
          <img src="/assets/brand/adressa-monogram.svg" alt="" />
        </span>
      </div>
      <div className="cover-copy">
        <span className="story-label">Denne uken</span>
        <h1 id="cover-title">Ukens 3 viktigste</h1>
        <ol className="daily-list">
          {top.map((s, i) => (
            <li key={s.id}>
              <Link to={`/sak/${s.id}`}>
                <span>
                  {i + 1}. {s.title}
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <Link className="cover-cta" to="/quiz">
          <span>
            {cta}
            {detail && <small> · {detail}</small>}
          </span>
          <Icon name="arrow" size={24} />
        </Link>
        {!progress.finished && (
          <p className="cover-note">
            {count} spørsmål fra ukens nyheter. Står du fast, finner du svaret i saken.
          </p>
        )}
        <button className="swipe-hint" onClick={scrollToFeed}>
          Sveip videre til feeden <Icon name="down" size={20} />
        </button>
      </div>
      {coverStory && <span className="cover-photo-note">Bildet: {coverStory.title}</span>}
    </section>
  );
}

function Feed() {
  const { stories, snapshot, feed, setFeed, progress } = useApp();
  const categories = useMemo(() => ["Alle", ...new Set(stories.map((s) => s.category))], [stories]);
  const results = filterStories(stories, feed.query, feed.category);
  const filtered = Boolean(feed.query) || feed.category !== "Alle";

  return (
    <>
      <section className="feed-tools" id="feed" aria-labelledby="feed-title">
        <div className="feed-heading">
          <div>
            <span className="eyebrow">{progress.finished ? "Utforsk videre etter quizen" : "Ukens nyhetsbilde"}</span>
            <h2 id="feed-title">Feeden</h2>
          </div>
          <span className="feed-edition">{snapshot}</span>
        </div>
        <div className="toolbar">
          <SearchBox id="feed-search" value={feed.query} onChange={(query) => setFeed({ ...feed, query })} />
          <div className="chips" aria-label="Filtrer på kategori">
            {categories.map((c) => (
              <button
                key={c}
                className={`chip ${c === feed.category ? "active" : ""}`}
                aria-pressed={c === feed.category}
                onClick={() => setFeed({ ...feed, category: c })}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="search-status" aria-live="polite">
            {filtered
              ? `${results.length} ${results.length === 1 ? "sak" : "saker"}${feed.query ? ` for «${feed.query}»` : ""}`
              : ""}
          </p>
        </div>
      </section>
      <div id="feed-list">
        {results.length ? (
          results.map((s) => <FeedCard key={s.id} story={s} />)
        ) : (
          <div className="wrap">
            <div className="empty">
              <Icon name="search" size={36} />
              <h2>Ingen treff</h2>
              <p>Prøv et annet søkeord eller velg Alle.</p>
              <button className="primary" onClick={() => setFeed({ query: "", category: "Alle" })}>
                Vis alle saker
              </button>
            </div>
          </div>
        )}
      </div>
      {!filtered && (
        <div className="feed-end">
          <Icon name="check" size={28} />
          <strong>Du er oppdatert på ukens saker</strong>
          <p>
            {stories.length} saker · lagret {snapshot}
          </p>
          {!progress.finished && (
            <p>
              <Link className="primary" to="/quiz" style={{ marginTop: 20 }}>
                Test deg i ukens nyhetsquiz
              </Link>
            </p>
          )}
          <button className="text-button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            Til toppen ↑
          </button>
        </div>
      )}
    </>
  );
}

function FeedCard({ story }: { story: Story }) {
  const { stories } = useApp();
  const image = story.images[0];
  const position = stories.indexOf(story);
  return (
    <article
      className={`feed-card story-panel ${image ? "image-card" : "no-image"}`}
      aria-labelledby={`feed-title-${story.id}`}
      style={accent(story)}
    >
      <PanelImage image={image} />
      <div className="panel-shade" />
      <div className="story-top">
        <span className="edition-note">
          {story.latest ? "Siste i utvalget" : "Kort fortalt"} <span>· {formatDate(story.updated)}</span>
        </span>
        <SaveButton story={story} />
      </div>
      <Link className="feed-story-link" to={`/sak/${story.id}`}>
        <div className="feed-copy">
          <div className="story-kicker">
            <Tag story={story} />
            <ReadBadge story={story} />
          </div>
          <h2 id={`feed-title-${story.id}`}>{story.title}</h2>
          <p className="story-summary">
            <span>{story.summary[0]}</span>
          </p>
          <p className="story-source">
            Kilde: VG{image?.credit && <span> · {image.credit}</span>}
          </p>
          <span className="read-more">
            Gå i dybden <Icon name="external" size={18} />
          </span>
          <div className="story-position" aria-hidden="true">
            {stories.map((s) => (
              <span key={s.id} className={s.id === story.id ? "current" : ""} />
            ))}
          </div>
        </div>
      </Link>
      <span className="story-number" aria-hidden="true">
        {String(position + 1).padStart(2, "0")} / {String(stories.length).padStart(2, "0")}
      </span>
    </article>
  );
}
