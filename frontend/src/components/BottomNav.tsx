import { Icon, IconName } from "../icons";
import { Link } from "../router";
import { useApp } from "../state";

export type NavTab = "news" | "quiz" | "saved";

/** Three places: the news feed, today's quiz and saved items. No extra home tab. */
export default function BottomNav({ current }: { current: NavTab | null }) {
  const { saved } = useApp();

  const tab = (name: NavTab, to: string, icon: IconName, label: string) => (
    <Link className={`nav-tab ${current === name ? "active" : ""}`} to={to} aria-current={current === name ? "page" : undefined}>
      <Icon name={icon} size={26} />
      <span>{label}</span>
      {name === "saved" && saved.length > 0 && (
        <span className="saved-count" aria-label={`${saved.length} lagret`}>
          {saved.length}
        </span>
      )}
    </Link>
  );

  return (
    <nav className="bottom-nav" aria-label="Hovedmeny">
      {tab("news", "/nyheter", "home", "Nyheter")}
      {tab("quiz", "/", "bulb", "Quiz")}
      {tab("saved", "/lagret", "bookmark", "Lagret")}
    </nav>
  );
}
