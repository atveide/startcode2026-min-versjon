import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons";
import { Link } from "../router";
import { useApp } from "../state";

export type NavTab = "feed" | "quiz" | "saved";

export default function BottomNav({ current }: { current: NavTab }) {
  const { saved, showAbout } = useApp();
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const tab = (name: NavTab, to: string, icon: "feed" | "bulb" | "bookmark", label: string) => (
    <Link
      className={`nav-tab ${current === name ? "active" : ""}`}
      to={to}
      aria-current={current === name ? "page" : undefined}
    >
      <Icon name={icon} size={26} />
      <span>{label}</span>
      {name === "saved" && saved.length > 0 && <span className="saved-count">{saved.length}</span>}
    </Link>
  );

  return (
    <nav className="bottom-nav" aria-label="Hovedmeny" ref={navRef}>
      <button
        ref={triggerRef}
        className="icon-button menu-trigger"
        aria-label="Åpne meny"
        aria-expanded={open}
        aria-controls="main-menu"
        onClick={() => setOpen(!open)}
      >
        <Icon name="menu" size={26} />
      </button>
      {tab("feed", "/", "feed", "Feeden")}
      {tab("quiz", "/quiz", "bulb", "Quiz")}
      {tab("saved", "/lagret", "bookmark", "Lagret")}
      <div
        id="main-menu"
        className="menu"
        hidden={!open}
        onClick={(e) => (e.target as Element).closest("a") && setOpen(false)}
      >
        <div className="menu-heading">Ditt Opplyst</div>
        <Link to="/">
          <Icon name="feed" size={18} />
          Feeden
        </Link>
        <Link to="/quiz">
          <Icon name="bulb" size={18} />
          Ukens nyhetsquiz
        </Link>
        <Link to="/lagret">
          <Icon name="bookmark" size={18} />
          Lagrede saker
        </Link>
        <button
          onClick={() => {
            setOpen(false);
            showAbout();
          }}
        >
          <Icon name="info" size={18} />
          Om Opplyst
        </button>
      </div>
    </nav>
  );
}
