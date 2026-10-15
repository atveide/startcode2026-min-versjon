import { useEffect, useRef, useState } from "react";
import type { Block, Story } from "../api";
import { Icon } from "../icons";
import { formatDate } from "../logic";
import { BLANK } from "../quiz";
import { goBack, Link, navigate, previousPath } from "../router";
import { useApp } from "../state";
import BottomNav from "./BottomNav";
import { accent, NewsGraphic, SaveButton, Tag, Wordmark } from "./bits";

export default function StoryPage({ id, fromQuiz }: { id: string; fromQuiz: boolean }) {
  const { storiesById, markRead, markQuizRead, importedAt, toast } = useApp();
  const story = storiesById.get(id);

  useEffect(() => {
    if (!story) return;
    markRead(story.id);
    if (fromQuiz) markQuizRead(story.id);
  }, [story, fromQuiz, markRead, markQuizRead]);

  useEffect(() => {
    if (story) document.title = `${story.title} · Opplyst`;
  }, [story]);

  if (!story) return <StoryNotFound />;

  async function share() {
    // Share Adressa's own link: the story belongs to them.
    try {
      if (navigator.share) await navigator.share({ title: story!.title, url: story!.url });
      else {
        await navigator.clipboard.writeText(story!.url);
        toast("Lenken til saken hos Adresseavisen er kopiert");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") toast("Vi fikk ikke delt lenken. Kopier adressen fra nettleseren.");
    }
  }

  return (
    <>
      <ReadingProgress />
      <button className="article-floater back-button" onClick={() => goBack(fromQuiz ? "/quiz" : "/")} aria-label="Gå tilbake">
        <Icon name="back" size={25} />
      </button>
      <button className="article-floater share-button" onClick={share} aria-label="Del saken">
        <Icon name="share" size={23} />
      </button>
      <SaveButton story={story} className="article-save" />
      <header className="article-masthead">
        <Link to="/" aria-label="Opplyst – til forsiden">
          <Wordmark />
        </Link>
        <span className="caption">Ukens nyheter fra Adresseavisen</span>
      </header>
      <main id="main" className="article" tabIndex={-1} style={accent(story)}>
        <article>
          {fromQuiz && <QuizContext story={story} />}
          {story.image && <Hero story={story} />}
          <header className={`article-intro ${story.image ? "" : "no-hero"}`}>
            <Tag story={story} />
            <h1>{story.title}</h1>
            <p className="article-meta">
              <time dateTime={story.publishedAt}>Publisert {formatDate(story.publishedAt)}</time>
              {story.modifiedAt && (
                <>
                  <span>·</span>
                  <span>Oppdatert {formatDate(story.modifiedAt)}</span>
                </>
              )}
              <span>·</span>
              <span>{story.source}</span>
              {story.authors.length > 0 && (
                <>
                  <span>·</span>
                  <span>{story.authors.join(", ")}</span>
                </>
              )}
            </p>
          </header>
          <div className="article-body">
            {story.lead && <p className="summary-text">{story.lead}</p>}
            {story.imported ? <FullStory story={story} /> : <NotImported story={story} />}
            <section id="sources" aria-labelledby="sources-title">
              <div className="section-label">
                <h2 id="sources-title">Kilde</h2>
              </div>
              <div className="source-list">
                <a className="source" href={story.url} target="_blank" rel="noopener noreferrer">
                  <img className="source-logo" src="/assets/brand/adressa-monogram.svg" alt="" />
                  <span>
                    <strong>Les originalartikkelen hos {story.source}</strong>
                    <small>adressa.no · Publisert {formatDate(story.publishedAt)} · Kan kreve abonnement</small>
                  </span>
                  <Icon name="external" size={18} />
                </a>
              </div>
            </section>
            <p className="snapshot-foot">
              {story.imported && importedAt
                ? `Hentet fra ${story.source} ${formatDate(importedAt)} med eget abonnement, og lagret bare på denne maskinen. Saken kan være endret hos Adressa siden.`
                : `Journalistikk fra ${story.source}. Hele saken leser du hos Adressa.`}
            </p>
          </div>
        </article>
      </main>
      {fromQuiz ? <QuizReturn /> : <BottomNav current="feed" />}
    </>
  );
}

function Hero({ story }: { story: Story }) {
  const [failed, setFailed] = useState(false);
  const image = story.image!;
  return (
    <>
      <figure className="article-hero">
        {failed ? (
          <NewsGraphic />
        ) : (
          <img src={image.src} alt={image.alt ?? ""} referrerPolicy="no-referrer" onError={() => setFailed(true)} />
        )}
        {image.credit && !image.caption && <p className="photo-credit">Foto: {image.credit}</p>}
      </figure>
      {image.caption && (
        <p className="hero-caption">
          {image.caption}
          {image.credit && <span> Foto: {image.credit}</span>}
        </p>
      )}
    </>
  );
}

/** Adressa's «Kort oppsummert» and the article text, from the local import. */
function FullStory({ story }: { story: Story }) {
  const summary = story.summary;
  return (
    <>
      <section className="deep-panel adressa-summary" aria-labelledby="summary-title">
        <div className="section-label">
          <h2 id="summary-title">{summary?.heading ?? "Kort oppsummert"}</h2>
        </div>
        {summary ? (
          <>
            <ul className="bullet-list summary-list">
              {summary.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            {summary.disclosure && (
              <p className="summary-disclosure">
                {summary.disclosure}{" "}
                {summary.disclosureUrl && (
                  <a href={summary.disclosureUrl} target="_blank" rel="noopener noreferrer">
                    Mer om KI-bruken ↗
                  </a>
                )}
              </p>
            )}
            <p className="summary-source">
              Kilde:{" "}
              <a href={summary.sourceUrl} target="_blank" rel="noopener noreferrer">
                {summary.source} ↗
              </a>
            </p>
          </>
        ) : (
          <p className="no-summary">
            <Icon name="info" size={18} />
            <span>Adresseavisen har ikke laget en kort oppsummering av denne saken. Les ingressen og saken under.</span>
          </p>
        )}
      </section>
      <section className="article-text" aria-label="Saken">
        {story.body.map((block, i) => (
          <BodyBlock key={i} block={block} />
        ))}
      </section>
    </>
  );
}

function BodyBlock({ block }: { block: Block }) {
  if (block.type === "heading") return <h3>{block.text}</h3>;
  if (block.type === "list")
    return (
      <ul className="bullet-list">
        {(block.items ?? []).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  return <p>{block.text}</p>;
}

/** Without the local import there is no article text here; the story lives on adressa.no. */
function NotImported({ story }: { story: Story }) {
  return (
    <section className="deep-panel not-imported" aria-label="Hele saken">
      <p>Hele saken er ikke hentet på denne maskinen. Les den hos {story.source}, og kom tilbake hit etterpå.</p>
      <a className="primary" href={story.url} target="_blank" rel="noopener noreferrer">
        Les saken hos {story.source} <Icon name="external" size={18} />
      </a>
    </section>
  );
}

function QuizContext({ story }: { story: Story }) {
  const { quiz, progress } = useApp();
  const index = quiz.headlines.findIndex((h) => h.story_id === story.id);
  if (index < 0) return null;
  const [before, after] = quiz.headlines[index].text.split(BLANK);
  const answer = progress.questions[index].answer;
  return (
    <aside className="quiz-context" aria-label="Spørsmålet du leser for">
      <Icon name="bulb" size={24} />
      <div>
        <span className="eyebrow">
          Dagens spill · Spørsmål {index + 1} av {quiz.headlines.length}
        </span>
        <p>
          {answer ? "Svaret: " : "Finn ordet som mangler: "}
          {before}
          <mark>{answer ?? BLANK}</mark>
          {after}
        </p>
      </div>
    </aside>
  );
}

function QuizReturn() {
  const { progress } = useApp();
  function back() {
    if (previousPath()?.startsWith("/quiz")) history.back();
    else navigate("/quiz");
  }
  return (
    <div className="quiz-return">
      <button onClick={back}>
        <Icon name="back" size={22} />
        {progress.finished ? "Tilbake til resultatet" : "Tilbake til spørsmålet"}
      </button>
    </div>
  );
}

function ReadingProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (ref.current) ref.current.style.width = `${max > 0 ? Math.min(100, Math.max(0, (scrollY / max) * 100)) : 100}%`;
    };
    update();
    addEventListener("scroll", update, { passive: true });
    return () => removeEventListener("scroll", update);
  }, []);
  return <div className="reading-progress" aria-hidden="true" ref={ref} />;
}

function StoryNotFound() {
  return (
    <>
      <main id="main" className="wrap" style={{ paddingTop: 100 }} tabIndex={-1}>
        <div className="empty">
          <Icon name="search" size={36} />
          <h2>Fant ikke saken</h2>
          <p>Saken finnes ikke i ukens utvalg.</p>
          <Link className="primary" to="/">
            Til forsiden
          </Link>
        </div>
      </main>
      <BottomNav current="feed" />
    </>
  );
}
