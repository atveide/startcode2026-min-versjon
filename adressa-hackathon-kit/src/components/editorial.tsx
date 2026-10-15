import { ArrowRight, Bookmark, Clock3, Search } from 'lucide-react';
import type { Story } from '../data/stories';
import { categories } from '../data/stories';
import { PhotoCredit } from '../AssetCredits';

export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

export function publishedLabel(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('nb-NO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' });
}


export function PremiumBadge() {
  return <span className="premium-badge"><span aria-hidden="true">a</span> Pluss</span>;
}

export function StoryMeta({ story, includeDate = false }: { story: Story; includeDate?: boolean }) {
  return <div className="story-meta">
    {includeDate && <span>{publishedLabel(story.publishedAt)}</span>}
    <span className="reading-time"><Clock3 size={13} aria-hidden="true" /> {story.readingMinutes} min lesing</span>
    {story.premium && <PremiumBadge />}
  </div>;
}

export function SaveButton({ story, saved, onToggle, className = '', showLabel = false }: {
  story: Story; saved: boolean; onToggle: (id: string) => void; className?: string; showLabel?: boolean;
}) {
  return <button
    type="button"
    className={`${showLabel ? 'button button-secondary' : 'icon-button'} save-button ${saved ? 'is-saved' : ''} ${className}`}
    aria-label={`${saved ? 'Fjern fra lagrede' : 'Lagre saken'}: ${story.title}`}
    aria-pressed={saved}
    onClick={() => onToggle(story.id)}
    title={saved ? 'Fjern fra lagrede' : 'Lagre saken'}
  >
    <Bookmark size={showLabel ? 18 : 20} fill={saved ? 'currentColor' : 'none'} strokeWidth={1.8} aria-hidden="true" />
    {showLabel && (saved ? 'Lagret' : 'Lagre saken')}
  </button>;
}

export function StoryCard({ story, saved, onToggle }: { story: Story; saved: boolean; onToggle: (id: string) => void }) {
  return <article className="story-card">
    <a className="story-image-link" href={`#/article/${story.id}`} tabIndex={-1} aria-hidden="true">
      <img src={asset(story.image)} alt="" className="story-image" width="1200" height="800" loading="lazy" />
    </a>
    <PhotoCredit image={story.image} compact />
    <div className="card-content">
      <div className="card-eyebrow"><span className="eyebrow">{story.category}</span><SaveButton story={story} saved={saved} onToggle={onToggle} /></div>
      <h3 className="card-title"><a href={`#/article/${story.id}`}>{story.title}</a></h3>
      <p className="card-summary">{story.summary}</p>
      <StoryMeta story={story} />
    </div>
  </article>;
}

export function CategoryFilter({ value, onChange, label = 'Velg kategori' }: { value: string; onChange: (category: string) => void; label?: string }) {
  return <div className="filter-list" role="group" aria-label={label}>
    {categories.map(category => <button key={category} type="button" className={`filter-chip ${value === category ? 'is-active' : ''}`} aria-pressed={value === category} onClick={() => onChange(category)}>{category}</button>)}
  </div>;
}

export function EmptyState({ title, description, kind = 'saved', onReset }: { title: string; description: string; kind?: 'saved' | 'search'; onReset?: () => void }) {
  const Icon = kind === 'saved' ? Bookmark : Search;
  return <div className="empty-state">
    <span className="empty-icon"><Icon size={30} strokeWidth={1.5} aria-hidden="true" /></span>
    <h2>{title}</h2><p>{description}</p>
    {onReset ? <button type="button" className="button button-primary" onClick={onReset}>Nullstill søket <ArrowRight size={17} aria-hidden="true" /></button> : <a className="button button-primary" href="#/">Finn en historie <ArrowRight size={17} aria-hidden="true" /></a>}
  </div>;
}

