import { useEffect, useState } from "react";
import { Icon } from "../icons";
import { filterStories } from "../logic";
import { Link } from "../router";
import { useApp } from "../state";
import BottomNav from "./BottomNav";
import { SaveButton, SearchBox, Thumb, Wordmark } from "./bits";

export default function SavedPage() {
  const { saved, storiesById } = useApp();
  const [query, setQuery] = useState("");
  useEffect(() => {
    document.title = "Lagrede saker · Opplyst";
  }, []);

  const stories = saved.map((id) => storiesById.get(id)).filter((s) => s !== undefined);
  const results = filterStories(stories, query);

  return (
    <>
      <main id="main" className="wrap saved-page" tabIndex={-1}>
        <header className="topline">
          <Link className="brand" to="/" aria-label="Opplyst – til forsiden">
            <Wordmark />
          </Link>
          <span className="masthead-caption">Ukens nyheter, kort fortalt</span>
        </header>
        <header className="saved-heading">
          <span className="eyebrow">Ta vare på det som interesserer deg</span>
          <h1>Lagrede saker</h1>
          <p>Sakene du vil komme tilbake til. De lagres på denne enheten.</p>
        </header>
        <SearchBox id="saved-search" value={query} onChange={setQuery} placeholder="Søk i lagrede saker" />
        {results.length ? (
          <div className="saved-list">
            {results.map((s) => (
              <div className="saved-item" key={s.id}>
                <Link className="history-item" to={`/sak/${s.id}`}>
                  <Thumb image={s.image} />
                  <div>
                    <span className="small muted">{s.category}</span>
                    <h3>{s.title}</h3>
                  </div>
                  <span className="arrow">
                    <Icon name="arrow" size={19} />
                  </span>
                </Link>
                <SaveButton story={s} />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty saved-empty">
            <Icon name="bookmark" size={36} />
            <h2>{query ? "Ingen treff i lagrede saker" : "Ingen lagrede saker ennå"}</h2>
            <p>
              {query
                ? "Prøv et annet søkeord."
                : "Trykk på bokmerket på en sak for å finne den igjen her."}
            </p>
            <Link className="primary" to="/#feed">
              Utforsk feeden
            </Link>
          </div>
        )}
      </main>
      <BottomNav current="saved" />
    </>
  );
}
