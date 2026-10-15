import { Fragment, ReactNode, useCallback, useEffect, useLayoutEffect, useState } from "react";
import { fetchQuiz, fetchStories, Quiz, Stories } from "./api";
import { Brand } from "./components/bits";
import FeedPage from "./components/FeedPage";
import QuizPage from "./components/QuizPage";
import SavedPage from "./components/SavedPage";
import StartPage from "./components/StartPage";
import StoryPage from "./components/StoryPage";
import { redirect, takeScrollTarget, useLocation } from "./router";
import { AppProvider } from "./state";
import { load, save } from "./storage";
import { withFullStories } from "./unlock";

type Content = { stories: Stories; quiz: Quiz };
type Data = { status: "loading" } | { status: "error"; message: string } | ({ status: "ready" } & Content);

const REFRESH_EVERY = 10 * 60 * 1000;

function fetchContent(): Promise<Content> {
  return Promise.all([fetchStories().then(withFullStories), fetchQuiz()]).then(([stories, quiz]) => ({ stories, quiz }));
}

export default function App() {
  const [data, setData] = useState<Data>({ status: "loading" });
  const [waiting, setWaiting] = useState<Content | null>(null);
  const location = useLocation();
  const inQuiz = location.pathname === "/quiz" || new URLSearchParams(location.search).get("fra") === "quiz";

  const reload = useCallback(() => {
    setData({ status: "loading" });
    fetchContent()
      .then((content) => setData({ status: "ready", ...content }))
      .catch((err: Error) => setData({ status: "error", message: err.message }));
  }, []);

  useEffect(reload, [reload]);

  // A new day (Oslo time) brings a new quiz. Look for it when the app comes back into view.
  const currentId = data.status === "ready" ? data.quiz.id : null;
  useEffect(() => {
    if (!currentId) return;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      fetchQuiz()
        .then((quiz) => (quiz.id === currentId ? null : fetchContent()))
        .then((content) => content && setWaiting(content))
        .catch(() => {
          // Offline or the server is down: keep today's quiz and try again later.
        });
    };
    document.addEventListener("visibilitychange", check);
    const timer = window.setInterval(check, REFRESH_EVERY);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.clearInterval(timer);
    };
  }, [currentId]);

  // Never swap the quiz while someone is answering or reading for a question: it waits.
  useEffect(() => {
    if (waiting && !inQuiz) {
      setData({ status: "ready", ...waiting });
      setWaiting(null);
    }
  }, [waiting, inQuiz]);

  if (data.status === "loading") {
    return (
      <Splash>
        <p>Henter dagens nyheter …</p>
      </Splash>
    );
  }
  if (data.status === "error") {
    return (
      <Splash>
        <p role="alert">{data.message}. Prøv igjen.</p>
        <button className="btn btn-primary" onClick={reload}>
          Prøv igjen
        </button>
      </Splash>
    );
  }
  return (
    // A new quiz starts fresh; saved stories and the reading position live in storage.
    <AppProvider key={data.quiz.id} data={data.stories} quiz={data.quiz}>
      <Routes quiz={data.quiz} />
    </AppProvider>
  );
}

function Splash({ children }: { children: ReactNode }) {
  return (
    <main className="splash">
      <Brand />
      {children}
    </main>
  );
}

// Where the reader was today: the first visit with a new quiz opens on its invitation, later
// visits the same day go back to the news, the quiz or Lagret, also when the quiz was skipped.
const PLACE_KEY = "opplyst-place-v1";
const SECTIONS = ["/", "/nyheter", "/quiz", "/lagret"];
let opened = false;

function Routes({ quiz }: { quiz: Quiz }) {
  const location = useLocation();
  const { pathname } = location;

  useLayoutEffect(() => {
    if (opened) return;
    opened = true;
    if (pathname !== "/") return;
    if (location.hash === "#feed") return redirect("/nyheter");
    const place = load(PLACE_KEY) as { quizId?: string; section?: string } | null;
    if (place?.quizId === quiz.id && place.section && place.section !== "/" && SECTIONS.includes(place.section)) {
      redirect(place.section);
    }
    // Runs once, for the address the app was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const section = pathname === "/quiz/svar" ? "/" : pathname;
    if (SECTIONS.includes(section)) save(PLACE_KEY, { quizId: quiz.id, section });
  }, [pathname, quiz.id]);

  useLayoutEffect(() => {
    const target = takeScrollTarget();
    if (!target) return;
    if ("hash" in target) document.getElementById(target.hash)?.scrollIntoView({ behavior: "instant" });
    else window.scrollTo({ top: target.y, behavior: "instant" });
  }, [location]);

  const storyMatch = pathname.match(/^\/sak\/([^/]+)\/?$/);
  let page: ReactNode;
  if (storyMatch) {
    const fromQuiz = new URLSearchParams(location.search).get("fra") === "quiz";
    page = <StoryPage id={decodeURIComponent(storyMatch[1])} fromQuiz={fromQuiz} />;
  } else if (pathname === "/quiz") page = <QuizPage />;
  else if (pathname === "/quiz/svar") page = <QuizPage answers />;
  else if (pathname === "/nyheter") page = <FeedPage />;
  else if (pathname === "/lagret") page = <SavedPage />;
  else page = <StartPage />;

  // Keyed so each route mounts fresh and plays its entrance animation.
  return <Fragment key={pathname + location.search}>{page}</Fragment>;
}
