import { useEffect, useState } from "react";
import { Icon } from "../icons";
import { storyMatches, videoMatches } from "../logic";
import { Link } from "../router";
import { useApp } from "../state";
import BottomNav from "./BottomNav";
import { Brand, SaveButton, SearchBox, Thumb } from "./bits";

export default function SavedPage() {
  const { saved, storiesById, videosById } = useApp();
  const [query, setQuery] = useState("");
  useEffect(() => {
    document.title = "Lagret · Opplyst";
  }, []);

  // Stories open as articles; videos open in the feed, where they play.
  const items = saved.flatMap((id) => {
    const story = storiesById.get(id);
    if (story)
      return storyMatches(story, query)
        ? [{ id, to: `/sak/${id}`, title: story.title, label: story.category, thumb: story.image?.src ?? null }]
        : [];
    const video = videosById.get(id);
    if (video)
      return videoMatches(video, query)
        ? [{ id, to: `/nyheter#video-${id}`, title: video.title, label: "Video", thumb: video.poster }]
        : [];
    return [];
  });

  return (
    <>
      <main id="main" className="saved" tabIndex={-1}>
        <header className="page-top">
          <Link to="/" className="brand-link" aria-label="Opplyst – til dagens quiz">
            <Brand />
          </Link>
        </header>
        <h1>Lagret</h1>
        <p className="saved-intro">Saker og videoer du vil komme tilbake til. De lagres på denne enheten.</p>
        {saved.length > 0 && (
          <SearchBox id="saved-search" value={query} onChange={setQuery} placeholder="Søk i det du har lagret" />
        )}
        {items.length ? (
          <ul className="saved-list">
            {items.map((item) => (
              <li className="saved-item" key={item.id}>
                <Link className="saved-link" to={item.to}>
                  <Thumb src={item.thumb} />
                  <span>
                    <small>{item.label}</small>
                    <strong>{item.title}</strong>
                  </span>
                </Link>
                <SaveButton id={item.id} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty">
            <Icon name="bookmark" size={32} />
            <h2>{query ? "Ingen treff" : "Ingenting lagret ennå"}</h2>
            <p>{query ? "Prøv et annet søkeord." : "Trykk på Lagre på en sak eller video for å finne den igjen her."}</p>
            {!query && (
              <Link className="btn btn-primary" to="/nyheter">
                Til nyhetene
              </Link>
            )}
          </div>
        )}
      </main>
      <BottomNav current="saved" />
    </>
  );
}
