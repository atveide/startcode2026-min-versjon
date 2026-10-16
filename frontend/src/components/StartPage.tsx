import { useEffect } from "react";
import { Icon } from "../icons";
import {
  hasStarted,
  isComplete,
  MAX_POINTS,
  totalPoints,
  verdict,
} from "../quiz";
import { Link, navigate } from "../router";
import { useApp } from "../state";
import BottomNav from "./BottomNav";
import { Brand, StreakBox } from "./bits";

/**
 * The daily way in: a short invitation to today's quiz on a real photo. The photo is a general
 * picture of Trondheim, never one of today's stories, so it can't give an answer away.
 */
export default function StartPage() {
  const { quiz, progress, showAbout, start } = useApp();
  const count = quiz.headlines.length;
  const max = count * MAX_POINTS;
  const points = totalPoints(progress);
  const complete = isComplete(progress);
  const started = hasStarted(progress);

  useEffect(() => {
    document.title = "Opplyst – dagens quiz fra Adressa";
  }, []);

  let title = "Hvor opplyst er du i dag?";
  let text = `${count} spørsmål fra nyhetene. Står du fast, finner du svaret i saken.`;
  let primary = { label: "Start dagens quiz", to: "/quiz" };
  let secondary = null;
  if (complete) {
    title = verdict(points, max);
    text = `Du fikk ${points} av ${max} poeng i dagens quiz. Nye spørsmål i morgen.`;
    primary = { label: "Se nyhetene", to: "/nyheter" };
    secondary = { label: "Se svarene", to: "/quiz/svar" };
  } else if (started) {
    text = `Du er på spørsmål ${progress.index + 1} av ${count} og har ${points} poeng så langt.`;
    primary = { label: "Fortsett quizen", to: "/quiz" };
  }

  return (
    <>
      <main
        id="main"
        className="start"
        tabIndex={-1}
        aria-labelledby="start-title"
      >
        <img
          className="start-photo"
          src="/assets/images/bakklandet.jpg"
          alt=""
        />
        <div className="start-shade" />
        <header className="start-top">
          <Brand />
          <button
            className="icon-button on-photo"
            onClick={showAbout}
            aria-label="Om Opplyst"
          >
            <Icon name="info" size={26} />
          </button>
        </header>
        <div className="start-copy">
          <h1 id="start-title">{title}</h1>
          <p className="start-text">{text}</p>
          <StreakBox className="on-photo" />
          <button
            className="btn btn-primary btn-wide"
            onClick={() => {
              if (primary.to === "/quiz") start();
              navigate(primary.to);
            }}
          >
            {primary.label} <Icon name="next" size={22} />
          </button>
          {secondary && (
            <Link className="btn btn-text btn-wide" to={secondary.to}>
              {secondary.label} <Icon name="next" size={22} />
            </Link>
          )}
          <p className="photo-note">
            Illustrasjonsfoto: Guy Delsaut / CC BY-SA 4.0
          </p>
        </div>
      </main>
      <BottomNav current="quiz" />
    </>
  );
}
