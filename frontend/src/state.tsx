import {
  createContext,
  ReactNode,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fetchHint, Quiz, revealAnswer, Story, submitGuess } from "./api";
import { Icon } from "./icons";
import { isDone, loadProgress, newProgress, QuestionState, QuizProgress, saveProgress } from "./quiz";
import { loadIds, save } from "./storage";

type FeedFilter = { query: string; category: string };

type AppState = {
  stories: Story[];
  storiesById: Map<string, Story>;
  snapshot: string;
  quiz: Quiz;
  progress: QuizProgress;
  guess: (word: string) => Promise<void>;
  hint: () => Promise<void>;
  giveUp: () => Promise<void>;
  next: () => void;
  restart: () => void;
  markQuizRead: (storyId: string) => void;
  saved: string[];
  toggleSaved: (id: string) => void;
  read: string[];
  markRead: (id: string) => void;
  feed: FeedFilter;
  setFeed: (filter: FeedFilter) => void;
  toast: (message: string) => void;
  showAbout: () => void;
};

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppProvider");
  return value;
}

const SAVED_KEY = "opplyst-saved-v1";
const READ_KEY = "opplyst-read-v1";

type Props = { stories: Story[]; snapshot: string; quiz: Quiz; children: ReactNode };

export function AppProvider({ stories, snapshot, quiz, children }: Props) {
  const storiesById = useMemo(() => new Map(stories.map((s) => [s.id, s])), [stories]);
  const ids = useMemo(() => stories.map((s) => s.id), [stories]);

  const [progress, setProgress] = useState(() => loadProgress(quiz));
  const progressRef = useRef(progress);
  progressRef.current = progress;
  useEffect(() => saveProgress(progress), [progress]);

  const [saved, setSaved] = useState(() => loadIds(SAVED_KEY, ids));
  const [read, setRead] = useState(() => loadIds(READ_KEY, ids));
  const [feed, setFeed] = useState<FeedFilter>({ query: "", category: "Alle" });

  const [toastState, setToastState] = useState({ message: "", visible: false });
  const toastTimer = useRef<number | undefined>(undefined);
  const toast = useCallback((message: string) => {
    setToastState({ message, visible: true });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastState((t) => ({ ...t, visible: false })), 3000);
  }, []);

  const aboutRef = useRef<HTMLDialogElement>(null);
  const showAbout = useCallback(() => aboutRef.current?.showModal(), []);

  const updateQuestion = useCallback((index: number, change: (q: QuestionState) => QuestionState) => {
    setProgress((p) => ({ ...p, questions: p.questions.map((q, i) => (i === index ? change(q) : q)) }));
  }, []);

  const guess = useCallback(
    async (word: string) => {
      const index = progressRef.current.index;
      if (isDone(progressRef.current.questions[index])) return;
      const res = await submitGuess(quiz.headlines[index].id, word);
      updateQuestion(index, (q) =>
        isDone(q)
          ? q
          : {
              ...q,
              guesses: [...q.guesses, { word, score: res.score }],
              ...(res.solved ? { answer: res.answer, fullText: res.full_text } : {}),
            },
      );
    },
    [quiz, updateQuestion],
  );

  const hint = useCallback(async () => {
    const index = progressRef.current.index;
    const q = progressRef.current.questions[index];
    if (isDone(q) || q.hints >= quiz.max_hints) return;
    const res = await fetchHint(quiz.headlines[index].id, q.hints + 1);
    updateQuestion(index, (current) =>
      isDone(current) ? current : { ...current, hints: res.level, hint: res.hint },
    );
  }, [quiz, updateQuestion]);

  const giveUp = useCallback(async () => {
    const index = progressRef.current.index;
    if (isDone(progressRef.current.questions[index])) return;
    const res = await revealAnswer(quiz.headlines[index].id);
    updateQuestion(index, (q) =>
      isDone(q) ? q : { ...q, answer: res.answer, fullText: res.full_text, gaveUp: true },
    );
  }, [quiz, updateQuestion]);

  const next = useCallback(() => {
    setProgress((p) =>
      p.index >= p.questions.length - 1 ? { ...p, finished: true } : { ...p, index: p.index + 1 },
    );
  }, []);

  const restart = useCallback(() => setProgress(newProgress(quiz)), [quiz]);

  const markQuizRead = useCallback(
    (storyId: string) => {
      setProgress((p) => {
        const changed = p.questions.some((q, i) => quiz.headlines[i].story_id === storyId && !q.readStory);
        if (!changed) return p;
        return {
          ...p,
          questions: p.questions.map((q, i) =>
            quiz.headlines[i].story_id === storyId ? { ...q, readStory: true } : q,
          ),
        };
      });
    },
    [quiz],
  );

  const toggleSaved = useCallback(
    (id: string) => {
      const wasSaved = saved.includes(id);
      const nextSaved = wasSaved ? saved.filter((x) => x !== id) : [id, ...saved];
      if (!save(SAVED_KEY, nextSaved)) {
        toast("Nettleseren kunne ikke lagre endringen.");
        return;
      }
      setSaved(nextSaved);
      toast(wasSaved ? "Saken er fjernet fra lagrede" : "Saken er lagret på denne enheten");
    },
    [saved, toast],
  );

  const markRead = useCallback((id: string) => {
    setRead((current) => {
      if (current[0] === id) return current;
      const nextRead = [id, ...current.filter((x) => x !== id)];
      save(READ_KEY, nextRead);
      return nextRead;
    });
  }, []);

  const value: AppState = {
    stories,
    storiesById,
    snapshot,
    quiz,
    progress,
    guess,
    hint,
    giveUp,
    next,
    restart,
    markQuizRead,
    saved,
    toggleSaved,
    read,
    markRead,
    feed,
    setFeed,
    toast,
    showAbout,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      <div className={`toast ${toastState.visible ? "visible" : ""}`} role="status" aria-live="polite">
        {toastState.message}
      </div>
      <About dialogRef={aboutRef} snapshot={snapshot} />
    </AppContext.Provider>
  );
}

function About({ dialogRef, snapshot }: { dialogRef: RefObject<HTMLDialogElement | null>; snapshot: string }) {
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="about-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className="modal-head">
        <h2 id="about-title">Om Opplyst</h2>
        <button className="icon-button" onClick={() => dialogRef.current?.close()} aria-label="Lukk">
          <Icon name="close" />
        </button>
      </div>
      <div className="modal-body">
        <p>
          Opplyst gjør det morsomt å følge med på det som skjer rundt deg. Ukens nyhetsquiz bygger på sakene fra
          den siste uken. Står du fast, leser du saken og går tilbake til spørsmålet.
        </p>
        <ul>
          <li>Ukens nyhetsquiz med hint og vurdering av svaret ditt</li>
          <li>Saken bak hvert spørsmål, med sammendrag og fordypning</li>
          <li>Nyhetsfeed, søk, kategorier og lagrede saker</li>
        </ul>
        <p>
          I konseptet er Polaris Medias journalistikk grunnlaget for både spørsmål og saker. Denne prototypen
          bruker et lagret utvalg på fem saker fra VG, {snapshot}, som plassholder. Claude vurderer svarene i
          quizen. Spørsmålsfeltet i sakene svarer bare fra lagret innhold.
        </p>
        <p className="small">
          Uoffisiell hackathon-prototype med Adressa-design fra hackathonpakken. Den har ingen tilknytning til
          eller godkjenning fra Adresseavisen eller Polaris Media. Quizfremdrift og lagrede saker lagres bare i
          denne nettleseren.
        </p>
      </div>
    </dialog>
  );
}
