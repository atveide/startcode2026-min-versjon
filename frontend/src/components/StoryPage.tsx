import { FormEvent, KeyboardEvent, ReactNode, useEffect, useId, useRef, useState } from "react";
import type { QA, Story } from "../api";
import { Icon } from "../icons";
import { Answer, answerQuestion, formatDate } from "../logic";
import { BLANK } from "../quiz";
import { goBack, Link, navigate, previousPath } from "../router";
import { useApp } from "../state";
import BottomNav from "./BottomNav";
import { accent, NewsGraphic, SaveButton, Tag, Wordmark } from "./bits";

export default function StoryPage({ id, fromQuiz }: { id: string; fromQuiz: boolean }) {
  const { storiesById, markRead, markQuizRead, snapshot, toast } = useApp();
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
    const url = location.origin + location.pathname;
    try {
      if (navigator.share) await navigator.share({ title: story!.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Lenken er kopiert");
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
        <span className="caption">Ukens nyheter, kort fortalt</span>
      </header>
      <main id="main" className="article" tabIndex={-1} style={accent(story)}>
        <article>
          {fromQuiz && <QuizContext story={story} />}
          {story.images.length > 0 && <Gallery story={story} />}
          <header className={`article-intro ${story.images.length ? "" : "no-hero"}`}>
            <Tag story={story} />
            <h1>{story.title}</h1>
            <p className="article-meta">
              <time dateTime={story.updated}>{formatDate(story.updated)}</time>
              <span>·</span>
              <button onClick={() => document.getElementById("sources")?.scrollIntoView({ behavior: "smooth" })}>
                {story.sources.length} {story.sources.length === 1 ? "kilde" : "kilder"}
              </button>
              <span>· Lagret utgave</span>
            </p>
          </header>
          <div className="article-body">
            <p className="summary-text">{story.summary.join(" ")}</p>
            <section aria-labelledby="latest-title">
              <div className="section-label">
                <h2 id="latest-title">Siste utvikling</h2>
                <Info label="Vis informasjon om sammendraget">
                  Sammendraget er et forkortet, lagret utdrag fra VG {snapshot}. Det oppdateres ikke automatisk.
                  Kildene finner du nederst.
                </Info>
              </div>
              <ul className="bullet-list">
                {story.developments.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </section>
            <DeepDive story={story} />
            <section>
              <details className="question">
                <summary>Bakgrunn</summary>
                <p>{story.background}</p>
              </details>
            </section>
            <section id="sources" aria-labelledby="sources-title">
              <div className="section-label">
                <h2 id="sources-title">
                  Basert på {story.sources.length} {story.sources.length === 1 ? "kilde" : "kilder"}
                </h2>
                <Info label="Vis informasjon om kildelisten">
                  Lenkene går til originalartiklene hos VG. De kan kreve innlogging.
                </Info>
              </div>
              <div className="source-list">
                {story.sources.map((source) => (
                  <a className="source" key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
                    <span className="source-badge" aria-hidden="true">
                      VG
                    </span>
                    <span>
                      <strong>{source.title}</strong>
                      <small>vg.no · Åpnes hos VG</small>
                    </span>
                    <Icon name="external" size={18} />
                  </a>
                ))}
              </div>
            </section>
            <p className="snapshot-foot">
              Opplyst · Lagret utvalg fra VG · {snapshot}
              <br />
              Lagret informasjon. Åpne originalkildene for senere oppdateringer.
            </p>
          </div>
        </article>
      </main>
      {fromQuiz ? <QuizReturn /> : <BottomNav current="feed" />}
    </>
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
          Ukens quiz · Spørsmål {index + 1} av {quiz.headlines.length}
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

function Gallery({ story }: { story: Story }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const count = story.images.length;
  const image = story.images[index];
  const step = (delta: number) => setIndex((i) => (i + delta + count) % count);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      step(e.key === "ArrowRight" ? 1 : -1);
    }
  }

  return (
    <div
      className="article-hero"
      {...(count > 1
        ? { tabIndex: 0, role: "region", "aria-label": "Bildegalleri – bruk piltastene", onKeyDown }
        : {})}
    >
      {failed.includes(image.src) ? (
        <NewsGraphic />
      ) : (
        <img src={image.src} alt={image.alt} onError={() => setFailed((f) => [...f, image.src])} />
      )}
      {count > 1 && (
        <div className="gallery-controls">
          <button className="previous" onClick={() => step(-1)} aria-label="Forrige bilde">
            <Icon name="back" size={20} />
          </button>
          <button className="next" onClick={() => step(1)} aria-label="Neste bilde">
            <Icon name="arrow" size={20} />
          </button>
          <span className="gallery-counter" aria-live="polite">
            {index + 1} / {count}
          </span>
        </div>
      )}
      {image.credit && <p className="photo-credit">{image.credit}</p>}
    </div>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button className="info-button" aria-label={label} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        i
      </button>
      <p className="info-text" id={id} hidden={!open}>
        {children}
      </p>
    </>
  );
}

function DeepDive({ story }: { story: Story }) {
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<(Answer & { q: string })[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (asking) inputRef.current?.focus();
  }, [asking]);

  useEffect(() => {
    chatRef.current?.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [chat]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const q = question.trim();
    if (!q) return;
    setChat((c) => [...c, { q, ...answerQuestion(story, q) }].slice(-20));
    setQuestion("");
  }

  return (
    <section className="deep-panel" aria-labelledby="deep-title">
      <div className="section-label">
        <h2 id="deep-title">Gå i dybden</h2>
        <Info label="Vis informasjon om Gå i dybden">
          Svarene er skrevet på forhånd fra det lagrede innholdet. Spørsmålsfeltet finner relevante svar lokalt og
          er ikke koblet til en KI-tjeneste.
        </Info>
      </div>
      <p>Velg et spørsmål, eller still ditt eget.</p>
      {story.qa.map((item, i) => (
        <QAItem key={item.q} item={item} story={story} open={i === 0} />
      ))}
      <button className="outline ask-toggle" aria-expanded={asking} onClick={() => setAsking(!asking)}>
        Still ditt eget spørsmål <Icon name="send" size={16} />
      </button>
      {asking && (
        <form className="ask-form" onSubmit={submit}>
          <label className="sr-only" htmlFor="question-input">
            Spørsmål om saken
          </label>
          <div className="question-entry">
            <textarea
              id="question-input"
              ref={inputRef}
              placeholder="Lurer du på noe annet?"
              rows={2}
              maxLength={500}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <button type="submit" aria-label="Send spørsmål">
              <Icon name="send" size={21} />
            </button>
          </div>
          <p className="ask-note">Svar fra det lagrede innholdet · ingen KI-tilkobling</p>
        </form>
      )}
      <div className="chat" aria-live="polite" ref={chatRef}>
        {chat.map((item, i) => (
          <div key={i} style={{ display: "contents" }}>
            <div className="chat-question">{item.q}</div>
            <div className="chat-answer">{item.answer}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function QAItem({ item, story, open }: { item: QA; story: Story; open: boolean }) {
  const [more, setMore] = useState(false);
  const [sources, setSources] = useState(false);
  return (
    <details className="question" open={open}>
      <summary>{item.q}</summary>
      <p>{item.a}</p>
      <div className="answer-actions">
        <button onClick={() => setMore(!more)}>{more ? "Vis mindre" : "Fortell mer"}</button>
        <button aria-expanded={sources} onClick={() => setSources(!sources)}>
          Kilder
        </button>
      </div>
      {more && <div className="answer-extra">{story.background}</div>}
      {sources && (
        <div className="inline-sources">
          {story.sources.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">
              {s.title} ↗
            </a>
          ))}
        </div>
      )}
    </details>
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
