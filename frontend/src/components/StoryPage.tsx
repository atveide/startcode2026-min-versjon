import { useEffect, useRef, useState } from "react";
import type { Block, Story } from "../api";
import { Icon } from "../icons";
import { formatDate, formatDay } from "../logic";
import { BLANK } from "../quiz";
import { askForKey, getReaderKey } from "../readerKey";
import { goBack, Link, navigate, previousPath } from "../router";
import { useApp } from "../state";
import BottomNav from "./BottomNav";
import { accent, Brand, NewsGraphic, SaveButton } from "./bits";

export default function StoryPage({ id, fromQuiz }: { id: string; fromQuiz: boolean }) {
  const { storiesById, markOpened, markQuizRead, toast } = useApp();
  const story = storiesById.get(id);

  useEffect(() => {
    if (!story) return;
    markOpened(story.id);
    if (fromQuiz) markQuizRead(story.id);
  }, [story, fromQuiz, markOpened, markQuizRead]);

  useEffect(() => {
    if (story) document.title = `${story.title} · Oppdatert`;
  }, [story]);

  if (!story) return <StoryNotFound />;

  async function share() {
    // Share Adressa's own link: the story belongs to them.
    try {
      if (navigator.share) await navigator.share({ title: story!.title, url: story!.url });
      else {
        await navigator.clipboard.writeText(story!.url);
        toast("Lenken til saken er kopiert");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") toast("Vi fikk ikke delt lenken. Kopier adressen fra nettleseren.");
    }
  }

  return (
    <>
      <ReadingProgress />
      <button className="article-floater back-button" onClick={() => goBack(fromQuiz ? "/quiz" : "/nyheter")} aria-label="Gå tilbake">
        <Icon name="back" size={25} />
      </button>
      <button className="article-floater share-button" onClick={share} aria-label="Del saken">
        <Icon name="share" size={23} />
      </button>
      <SaveButton id={story.id} className="article-floater article-save" />
      <header className="article-masthead">
        <Link to="/" className="brand-link" aria-label="Oppdatert – til dagens quiz">
          <Brand />
        </Link>
      </header>
      <main id="main" className="article" tabIndex={-1} style={accent(story)}>
        <article>
          {fromQuiz && <QuizContext story={story} />}
          <header className="article-intro">
            <p className="kicker">
              {story.category} <span aria-hidden="true">·</span> {formatDay(story.publishedAt)}
            </p>
            <h1>{story.title}</h1>
            <p className="article-meta">
              <time dateTime={story.publishedAt}>Publisert {formatDate(story.publishedAt)}</time>
              {story.modifiedAt && (
                <>
                  <span>·</span>
                  <span>Oppdatert {formatDate(story.modifiedAt)}</span>
                </>
              )}
              {story.authors.length > 0 && (
                <>
                  <span>·</span>
                  <span>{story.authors.join(", ")}</span>
                </>
              )}
            </p>
          </header>
          <ShortVersion story={story} />
          {story.image && <Hero story={story} />}
          <div className="article-body">
            {story.lead && story.opplystSummary?.points.length ? <p className="summary-text">{story.lead}</p> : null}
            {story.imported ? <FullStory story={story} /> : <NotImported story={story} />}
          </div>
        </article>
      </main>
      {fromQuiz ? <QuizReturn /> : <BottomNav current="news" />}
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
          </>
        ) : (
          <p className="no-summary">
            <Icon name="info" size={18} />
            <span>Saken har ingen kort oppsummering. Les ingressen og saken under.</span>
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

/** Locked: the full story opens with a personal unlock link, or is read on adressa.no. */
function NotImported({ story }: { story: Story }) {
  const hasKey = Boolean(getReaderKey());
  return (
    <section className="deep-panel not-imported" aria-label="Hele saken">
      <p>
        {hasKey
          ? "Lenken på denne enheten gir ikke tilgang til hele saken lenger. Spør den som sendte den om en ny."
          : `Hele saken er låst. Har du fått en opplåsingslenke, åpner du den her. Ellers leser du hele saken i nettutgaven.`}
      </p>
      <div className="not-imported-actions">
        <button className="btn btn-primary" onClick={askForKey}>
          <Icon name="lock" size={18} /> Lås opp med lenken
        </button>
        <a className="btn btn-outline" href={story.url} target="_blank" rel="noopener noreferrer">
          Les hele saken <Icon name="external" size={18} />
        </a>
      </div>
    </section>
  );
}

/** The question the reader came from, folded up so the story comes first. Never the answer. */
function QuizContext({ story }: { story: Story }) {
  const { quiz, progress } = useApp();
  const index = quiz.headlines.findIndex((h) => h.story_id === story.id);
  if (index < 0) return null;
  const [before, after] = quiz.headlines[index].text.split(BLANK);
  const answer = progress.questions[index].answer;
  return (
    <details className="quiz-context">
      <summary>
        <Icon name="bulb" size={22} />
        <span>
          Dagens quiz · spørsmål {index + 1} av {quiz.headlines.length}
        </span>
        <span className="quiz-context-toggle" aria-hidden="true" />
      </summary>
      <p>
        {answer ? "Svaret: " : "Finn ordet som mangler: "}
        {before}
        <mark>{answer ?? BLANK}</mark>
        {after}
      </p>
    </details>
  );
}

/** Opplyst's bullet points first, clearly ours; without them, Adressa's own lead. */
function ShortVersion({ story }: { story: Story }) {
  const own = story.opplystSummary;
  if (!own?.points.length) return story.lead ? <p className="article-lead">{story.lead}</p> : null;
  return (
    <section className="short-version" aria-labelledby="short-title">
      <h2 id="short-title" className="kicker">
        Kortversjon
      </h2>
      <ul className="short-points">
        {own.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <p className="short-origin">{own.label}</p>
    </section>
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
          <Link className="btn btn-primary" to="/nyheter">
            Til nyhetene
          </Link>
        </div>
      </main>
      <BottomNav current="news" />
    </>
  );
}
