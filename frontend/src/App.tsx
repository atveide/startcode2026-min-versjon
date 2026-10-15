import { Fragment, ReactNode, useCallback, useEffect, useLayoutEffect, useState } from "react";
import { fetchQuiz, fetchStories, Quiz, Stories } from "./api";
import { Wordmark } from "./components/bits";
import FullscreenPrompt from "./components/FullscreenPrompt";
import HomePage from "./components/HomePage";
import QuizPage from "./components/QuizPage";
import SavedPage from "./components/SavedPage";
import StoryPage from "./components/StoryPage";
import { takeScrollTarget, useLocation } from "./router";
import { AppProvider } from "./state";

type Data =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; stories: Stories; quiz: Quiz };

export default function App() {
  const [data, setData] = useState<Data>({ status: "loading" });

  const load = useCallback(() => {
    setData({ status: "loading" });
    Promise.all([fetchStories(), fetchQuiz()])
      .then(([stories, quiz]) => setData({ status: "ready", stories, quiz }))
      .catch((err: Error) => setData({ status: "error", message: err.message }));
  }, []);

  useEffect(load, [load]);

  if (data.status === "loading") {
    return (
      <Splash>
        <p>Henter ukens nyheter …</p>
      </Splash>
    );
  }
  if (data.status === "error") {
    return (
      <Splash>
        <p role="alert">{data.message}. Prøv igjen.</p>
        <button className="primary" onClick={load}>
          Prøv igjen
        </button>
      </Splash>
    );
  }
  return (
    <AppProvider stories={data.stories.stories} importedAt={data.stories.importedAt} quiz={data.quiz}>
      <Routes />
      <FullscreenPrompt />
    </AppProvider>
  );
}

function Splash({ children }: { children: ReactNode }) {
  return (
    <main className="splash">
      <Wordmark />
      {children}
    </main>
  );
}

function Routes() {
  const location = useLocation();
  const { pathname } = location;

  useLayoutEffect(() => {
    const target = takeScrollTarget();
    if (!target) return;
    if ("hash" in target) document.getElementById(target.hash)?.scrollIntoView({ behavior: "instant" });
    else window.scrollTo({ top: target.y, behavior: "instant" });
  }, [location]);

  useEffect(() => {
    if (pathname === "/") document.title = "Opplyst – ukens nyhetsquiz";
  }, [pathname]);

  const storyMatch = pathname.match(/^\/sak\/([^/]+)\/?$/);
  let page: ReactNode;
  if (storyMatch) {
    const fromQuiz = new URLSearchParams(location.search).get("fra") === "quiz";
    page = <StoryPage id={decodeURIComponent(storyMatch[1])} fromQuiz={fromQuiz} />;
  } else if (pathname === "/quiz") page = <QuizPage />;
  else if (pathname === "/lagret") page = <SavedPage />;
  else page = <HomePage />;

  // Keyed so each route mounts fresh and plays its entrance animation.
  return <Fragment key={pathname + location.search}>{page}</Fragment>;
}
