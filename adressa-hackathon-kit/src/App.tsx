import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, Check,
  ChevronRight, Home, Info, MapPin, Moon, Newspaper,
  Search, Share2, Sun, UserRound, X,
} from 'lucide-react';
import { categories, stories } from './data/stories';
import type { Story } from './data/stories';
import { asset, publishedLabel, PremiumBadge, StoryMeta, SaveButton, StoryCard, CategoryFilter, EmptyState } from './components/editorial';
import { PhotoCredit, SourceCredits } from './AssetCredits';
import { Button, Badge } from './components/primitives';

type Route = { page: 'home' | 'search' | 'saved' | 'account' | 'design' | 'article'; id?: string };
type Theme = 'light' | 'dark';
const SAVED_KEY = 'adressa-hackathon:saved';
const THEME_KEY = 'adressa-hackathon:theme';

function getRoute(): Route {
  const hash = window.location.hash;
  if (hash === '#designsystem' || hash === '#/designsystem') return { page: 'design' };
  if (hash.startsWith('#/article/')) return { page: 'article', id: hash.slice(10) };
  if (hash === '#/search') return { page: 'search' };
  if (hash === '#/saved') return { page: 'saved' };
  if (hash === '#/account') return { page: 'account' };
  return { page: 'home' };
}

function initialSaved(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((id): id is string => typeof id === 'string' && stories.some(story => story.id === id)))];
  } catch { return []; }
}

function initialTheme(): Theme {
  try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; }
  catch { return 'light'; }
}


function storyMatches(story: Story, query: string, category: string): boolean {
  const text = `${story.title} ${story.summary} ${story.category} ${story.author}`.toLocaleLowerCase('nb-NO');
  return (category === 'Alle' || story.category === category) && text.includes(query.trim().toLocaleLowerCase('nb-NO'));
}


export default function App() {
  const [route, setRoute] = useState<Route>(getRoute);
  const [category, setCategory] = useState('Alle');
  const [searchCategory, setSearchCategory] = useState('Alle');
  const [query, setQuery] = useState('');
  const [savedIds, setSavedIds] = useState<string[]>(initialSaved);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [toast, setToast] = useState('');
  const [shareFallback, setShareFallback] = useState('');
  const [exampleSaved, setExampleSaved] = useState(false);
  const [exampleEmail, setExampleEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'error' | 'success'>('idle');
  const mainRef = useRef<HTMLElement>(null);
  const returnRoute = useRef('#/');
  const storageAvailable = useRef(true);

  useEffect(() => {
    const onHashChange = () => {
      const next = getRoute();
      if (next.page !== 'article') returnRoute.current = window.location.hash || '#/';
      setShareFallback('');
      setRoute(next);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    mainRef.current?.focus({ preventScroll: true });
    const pageTitle = route.page === 'article'
      ? stories.find(story => story.id === route.id)?.title || 'Saken finnes ikke'
      : ({ home: 'Nyheter fra Trondheim og Trøndelag', search: 'Søk', saved: 'Lagrede saker', account: 'Min side', design: 'Designsystem' } as Record<string, string>)[route.page];
    document.title = `${pageTitle} · Adressa prototype`;
  }, [route]);

  useEffect(() => {
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(savedIds)); }
    catch { storageAvailable.current = false; }
  }, [savedIds]);

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, theme); }
    catch { storageAvailable.current = false; }
    document.documentElement.style.colorScheme = theme;
    return () => { document.documentElement.style.colorScheme = ''; };
  }, [theme]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const toggleSaved = (id: string) => {
    const isSaved = savedIds.includes(id);
    setSavedIds(current => isSaved ? current.filter(saved => saved !== id) : [...current, id]);
    setToast(isSaved ? 'Saken er fjernet fra lagrede.' : 'Saken er lagret. Du finner den under Lagret.');
  };

  const shareStory = async (story: Story) => {
    const url = `${window.location.href.split('#')[0]}#/article/${story.id}`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
      setToast('Lenken er kopiert. Klar til å deles.');
      setShareFallback('');
    } catch {
      setShareFallback(url);
      setToast('Kopier lenken fra feltet under deleknappen.');
    }
  };

  const chooseCategory = (value: string) => {
    setCategory(value);
    if (route.page !== 'home') window.location.hash = '#/';
  };

  const filteredStories = stories.filter(story => storyMatches(story, '', category));
  const searchResults = stories.filter(story => storyMatches(story, query, searchCategory));
  const savedStories = savedIds.map(id => stories.find(story => story.id === id)).filter((story): story is Story => Boolean(story));
  const activeStory = stories.find(story => story.id === route.id);
  const lead = filteredStories[0];

  const navItems = [
    { page: 'home', href: '#/', label: 'Forside', Icon: Home },
    { page: 'search', href: '#/search', label: 'Søk', Icon: Search },
    { page: 'saved', href: '#/saved', label: 'Lagret', Icon: Bookmark },
    { page: 'account', href: '#/account', label: 'Min side', Icon: UserRound },
  ] as const;

  return <div className={`news-app ${theme === 'dark' ? 'theme-dark' : ''}`} data-theme={theme}>
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); mainRef.current?.focus(); }}>Hopp til innhold</a>
    <div className="prototype-strip">
      <div className="site-width prototype-inner"><span><span className="prototype-dot" aria-hidden="true" /> Uoffisiell hackathon-prototype <span className="prototype-extra">· Alle saker er fiktive</span></span><a href="#designsystem">Designsystem <ArrowUpRight size={13} aria-hidden="true" /></a></div>
    </div>
    <header className="site-header">
      <div className="site-width utility-row"><span><MapPin size={13} aria-hidden="true" /> Trondheim og Trøndelag</span><span>Lokalt. Nært. Hver dag.</span></div>
      <div className="site-width masthead">
        <a className="brand-link" href="#/" aria-label="Adressa – til forsiden"><img src={asset(`assets/brand/adressa-${theme === 'dark' ? 'white' : 'blue'}.svg`)} width="224" height="60" alt="adressa" /></a>
        <span className="masthead-statement">En del av livet.<br /><strong>En del av Trøndelag.</strong></span>
        <nav className="desktop-actions" aria-label="Hovedmeny">
          {navItems.filter(item => item.page !== 'home').map(({ page, href, label, Icon }) => <a key={page} href={href} className={`header-action ${route.page === page ? 'is-active' : ''}`} aria-current={route.page === page ? 'page' : undefined}><Icon size={20} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>{page === 'saved' && savedIds.length > 0 && <span className="count-dot" aria-label={`${savedIds.length} lagrede saker`}>{savedIds.length}</span>}</a>)}
        </nav>
      </div>
      <nav className="category-nav" aria-label="Nyhetskategorier"><div className="site-width category-nav-inner">
        {categories.map(item => <button key={item} type="button" className={`category-nav-item ${route.page === 'home' && category === item ? 'is-active' : ''}`} aria-pressed={route.page === 'home' && category === item} onClick={() => chooseCategory(item)}>{item === 'Alle' ? 'Forsiden' : item}</button>)}
        <a className="category-design-link" href="#designsystem">Vårt designsystem <ArrowUpRight size={14} aria-hidden="true" /></a>
      </div></nav>
    </header>

    <main id="main-content" className="site-width main-content" ref={mainRef} tabIndex={-1}>
      {route.page === 'home' && <>
        <div className="section-heading home-heading"><h1>{category === 'Alle' ? 'Ditt nyhetsbilde' : category}</h1><span className="edition-label"><span aria-hidden="true" /> Demo-utgave</span></div>
        {lead ? <>
          <div className="lead-layout">
            <article className="lead-story">
              <div className="lead-eyebrow"><span className="eyebrow">{lead.category}</span><span className="eyebrow-separator" aria-hidden="true" /><span className="subtle-label">En historie fra nærmiljøet</span><SaveButton story={lead} saved={savedIds.includes(lead.id)} onToggle={toggleSaved} /></div>
              <h2 className="lead-title"><a href={`#/article/${lead.id}`}>{lead.title}</a></h2>
              <p className="lead-summary">{lead.summary}</p>
              <StoryMeta story={lead} />
              <a className="lead-image-link" href={`#/article/${lead.id}`} tabIndex={-1} aria-hidden="true"><img className="lead-image" src={asset(lead.image)} alt="" width="1600" height="1000" fetchPriority="high" /></a>
              <p className="image-caption">{lead.imageAlt}<PhotoCredit image={lead.image} /></p>
            </article>
            <aside className="latest-sidebar" aria-label="Flere demosaker">
              <div className="latest-heading"><span className="live-dot" aria-hidden="true" /><h2>Siste fra demoen</h2></div>
              <p className="latest-note">Små og store historier. Tett på deg.</p>
              <ol className="latest-list">{stories.slice(1, 5).map((story, index) => <li key={story.id}><div className="latest-meta"><span className="latest-number">0{index + 1}</span><span>{story.category}</span></div><h3><a href={`#/article/${story.id}`}>{story.title}</a></h3><span className="latest-reading">{story.readingMinutes} min lesing</span></li>)}</ol>
              <a className="text-link latest-all" href="#/search">Utforsk alle sakene <ArrowRight size={17} aria-hidden="true" /></a>
            </aside>
          </div>
          <div className="section-heading more-heading"><h2>{category === 'Alle' ? 'Mer fra der du bor' : `Mer fra ${category}`}</h2><span>{filteredStories.length - 1} {filteredStories.length - 1 === 1 ? 'sak' : 'saker'}</span></div>
          <div className="story-grid">{filteredStories.slice(1).map(story => <StoryCard key={story.id} story={story} saved={savedIds.includes(story.id)} onToggle={toggleSaved} />)}</div>
          {filteredStories.length === 1 && <p className="quiet-note">Dette er den eneste demosaken i denne kategorien foreløpig.</p>}
        </> : <EmptyState title="Her kommer flere historier." description="Velg en annen kategori for å utforske demoen." kind="search" onReset={() => setCategory('Alle')} />}
        <section className="local-promise" aria-labelledby="local-title"><span className="promise-icon"><Newspaper size={30} strokeWidth={1.3} aria-hidden="true" /></span><div><p className="eyebrow">Det begynner her</p><h2 id="local-title">Nysgjerrig på det som er nært.</h2><p>Finn historiene som betyr noe for deg, og ta vare på dem du vil lese senere.</p></div><a className="button button-secondary" href="#/account">Gjør appen din <ArrowRight size={17} aria-hidden="true" /></a></section>
      </>}

      {route.page === 'search' && <div className="search-page">
        <div className="page-intro"><p className="eyebrow">Søk i Adressa</p><h1>Hva er du nysgjerrig på?</h1><p>Finn historier fra Trondheim, Trøndelag og livet rundt deg.</p></div>
        <form className="search-form" role="search" onSubmit={event => event.preventDefault()}>
          <label className="visually-hidden" htmlFor="story-search">Søk etter saker, steder eller temaer</label>
          <Search size={23} aria-hidden="true" /><input id="story-search" type="search" placeholder="Søk etter saker, steder eller temaer" value={query} onChange={event => setQuery(event.target.value)} autoComplete="off" />
          {query && <button type="button" className="icon-button" aria-label="Tøm søkefeltet" onClick={() => { setQuery(''); document.getElementById('story-search')?.focus(); }}><X size={20} aria-hidden="true" /></button>}
        </form>
        <CategoryFilter value={searchCategory} onChange={setSearchCategory} label="Filtrer søkeresultater etter kategori" />
        <div className="section-heading search-results-heading"><h2>{query.trim() ? `Resultater for «${query.trim()}»` : 'Alle historiene'}</h2><span role="status">{searchResults.length} {searchResults.length === 1 ? 'sak' : 'saker'}</span></div>
        {searchResults.length ? <div className="story-grid">{searchResults.map(story => <StoryCard key={story.id} story={story} saved={savedIds.includes(story.id)} onToggle={toggleSaved} />)}</div> : <EmptyState kind="search" title="Ingen treff denne gangen." description="Prøv et annet ord, et stedsnavn eller en annen kategori." onReset={() => { setQuery(''); setSearchCategory('Alle'); }} />}
      </div>}

      {route.page === 'saved' && <>
        <div className="page-intro"><p className="eyebrow">Lagrede saker</p><h1>God lesing kan vente.</h1><p>Dine historier, klare når du har tid.</p></div>
        <div className="section-heading saved-heading"><h2>Din leseliste</h2><span>{savedStories.length} {savedStories.length === 1 ? 'sak' : 'saker'}</span></div>
        {savedStories.length ? <div className="story-grid">{savedStories.map(story => <StoryCard key={story.id} story={story} saved onToggle={toggleSaved} />)}</div> : <EmptyState title="En god historie er verdt å ta vare på." description="Trykk på bokmerket ved en sak. Da ligger den her neste gang du åpner appen." />}
        <p className="privacy-note"><Info size={15} aria-hidden="true" /> Leselisten lagres i denne nettleseren.</p>
      </>}

      {route.page === 'account' && <div className="account-page">
        <div className="page-intro"><p className="eyebrow">Min side</p><h1>På din måte.</h1><p>Litt mer deg. Like mye Adressa.</p></div>
        <div className="account-layout"><section className="settings-section" aria-labelledby="theme-heading"><div className="settings-heading"><span className="setting-icon"><Sun size={22} aria-hidden="true" /></span><div><h2 id="theme-heading">Velg fargetema</h2><p>En god leseopplevelse, hele dagen.</p></div></div><div className="theme-options" role="group" aria-label="Fargetema"><button type="button" className={`theme-option ${theme === 'light' ? 'is-selected' : ''}`} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}><span className="theme-preview theme-preview-light"><span /><span /><span /></span><span><Sun size={17} aria-hidden="true" /> Lyst {theme === 'light' && <Check size={17} aria-hidden="true" />}</span></button><button type="button" className={`theme-option ${theme === 'dark' ? 'is-selected' : ''}`} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}><span className="theme-preview theme-preview-dark"><span /><span /><span /></span><span><Moon size={17} aria-hidden="true" /> Mørkt {theme === 'dark' && <Check size={17} aria-hidden="true" />}</span></button></div><p className="small-note">Valget huskes i denne nettleseren.</p></section>
          <div className="account-side"><a href="#/saved" className="reading-list-link"><span className="setting-icon"><Bookmark size={22} aria-hidden="true" /></span><span><strong>Din leseliste</strong><span>{savedIds.length} {savedIds.length === 1 ? 'lagret historie' : 'lagrede historier'}</span></span><ChevronRight size={20} aria-hidden="true" /></a><section className="prototype-explainer"><span className="eyebrow">Laget for å utforske</span><h2>En liten smakebit på noe nytt.</h2><p>Dette er en uoffisiell Adressa-prototype laget for en hackathon. Alle saker er fiktive og skrevet for demoen.</p><p>Du kan søke, lese, lagre og bytte tema. Ingen konto er nødvendig.</p><a className="text-link" href="#designsystem">Se designsystemet <ArrowUpRight size={17} aria-hidden="true" /></a></section></div></div>
        {!storageAvailable.current && <p className="notice"><Info size={17} aria-hidden="true" /> Nettleseren tillater ikke lokal lagring. Valgene dine fungerer mens siden er åpen.</p>}
      </div>}

      {route.page === 'article' && (activeStory ? <article className="article-page">
        <a className="back-link" href={returnRoute.current}><ArrowLeft size={17} aria-hidden="true" /> Tilbake til nyhetene</a>
        <header className="article-header"><div className="article-kicker"><span className="eyebrow">{activeStory.category}</span>{activeStory.premium && <PremiumBadge />}<Badge variant="demo">Fiktiv demosak</Badge></div><h1>{activeStory.title}</h1><p className="article-summary">{activeStory.summary}</p><div className="article-byline"><span className="author-avatar" aria-hidden="true">a</span><div><strong>{activeStory.author}</strong><span>{publishedLabel(activeStory.publishedAt)} <span aria-hidden="true">·</span> {activeStory.readingMinutes} min lesing</span></div></div></header>
        <figure className="article-figure"><img src={asset(activeStory.image)} alt={activeStory.imageAlt} width="1600" height="1000" fetchPriority="high" /><figcaption><span>{activeStory.imageAlt}</span><PhotoCredit image={activeStory.image} /></figcaption></figure>
        <div className="article-reading-layout"><aside className="article-tools" aria-label="Saksverktøy"><SaveButton story={activeStory} saved={savedIds.includes(activeStory.id)} onToggle={toggleSaved} showLabel /><button type="button" className="button button-secondary" onClick={() => void shareStory(activeStory)}><Share2 size={18} aria-hidden="true" /> Del saken</button>{shareFallback && <div className="share-fallback"><label htmlFor="share-url">Lenke til saken</label><input id="share-url" value={shareFallback} readOnly onFocus={event => event.currentTarget.select()} /><p>Marker og kopier lenken.</p></div>}</aside><div className="article-body"><p className="article-demo-note"><Info size={16} aria-hidden="true" /> Denne teksten er et originalt demoeksempel. Hendelsene er fiktive.</p>{activeStory.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}<div className="article-endmark" aria-hidden="true">a</div></div></div>
        <section className="related-stories" aria-labelledby="related-heading"><div className="section-heading"><h2 id="related-heading">Bli litt til</h2><a className="text-link" href="#/">Til forsiden <ArrowRight size={16} aria-hidden="true" /></a></div><div className="story-grid">{stories.filter(story => story.id !== activeStory.id).slice(0, 3).map(story => <StoryCard key={story.id} story={story} saved={savedIds.includes(story.id)} onToggle={toggleSaved} />)}</div></section>
      </article> : <EmptyState title="Denne saken finnes ikke i demoen." description="Gå til forsiden for å finne en av historiene våre." />)}

      {route.page === 'design' && <div className="design-page">
        <div className="page-intro design-intro"><p className="eyebrow">Adressa · Uoffisielt designsystem</p><h1>Lokalt i hjertet.<br />Tydelig i uttrykket.</h1><p>Et redaksjonelt utgangspunkt for gode nyhetsopplevelser. Laget for hackathon, med rom for deres egen idé.</p><a className="button button-primary" href="#/">Utforsk prototypen <ArrowUpRight size={17} aria-hidden="true" /></a></div>
        <section className="design-section" aria-labelledby="principles-heading"><div className="design-section-title"><span>01</span><h2 id="principles-heading">Et uttrykk med retning</h2></div><div className="principle-grid"><div><span className="principle-number">Nært</span><h3>Stedet er hovedpersonen.</h3><p>Store bilder og konkrete historier setter livet i Trøndelag først.</p></div><div><span className="principle-number">Tydelig</span><h3>Nyheten får puste.</h3><p>Redaksjonell typografi, skarpe skiller og en rolig fargepalett.</p></div><div><span className="principle-number">Nyttig</span><h3>Lett å finne. Godt å lese.</h3><p>Få valg, tydelige handlinger og en leseliste som er nær.</p></div></div></section>
        <section className="design-section" aria-labelledby="colors-heading"><div className="design-section-title"><span>02</span><h2 id="colors-heading">Farger med en jobb</h2></div><div className="swatch-grid">{[
          { name: 'Adressa-blå', variable: '--color-brand', hex: '#005379', role: 'Identitet og primærhandling' },
          { name: 'Lys blå', variable: '--color-accent', hex: '#28AAE2', role: 'Aksent og detaljer' },
          { name: 'Blå flate', variable: '--color-brand-soft', hex: '#E9F4F8', role: 'Rolige fremhevinger' },
          { name: 'Blekk', variable: '--color-ink', hex: '#17212B', role: 'Overskrifter og brødtekst' },
          { name: 'Papir', variable: '--color-paper', hex: '#FFFFFF', role: 'Redaksjonelle flater' },
          { name: 'Lerret', variable: '--color-canvas', hex: '#F4F5F2', role: 'Bakgrunn og grupper' },
        ].map(color => <div className="color-swatch" key={color.name}><div className="swatch-color" style={{ background: `var(${color.variable})` }} /><strong>{color.name}</strong><code>{color.variable}</code><span>{color.hex} · {color.role}</span></div>)}</div><p className="small-note">Heksverdiene beskriver lystemaet. Semantiske farger tilpasses automatisk når du velger mørkt tema på Min side.</p></section>
        <section className="design-section" aria-labelledby="typography-heading"><div className="design-section-title"><span>03</span><h2 id="typography-heading">Redaksjonell stemme</h2></div><div className="type-specimens"><div><span className="eyebrow">Bitter · Overskrifter</span><p className="type-display">Historier som<br />kommer nær.</p><p className="small-note">Tydelig serif med karakter. Tett linjeavstand og plass rundt.</p></div><div className="ui-type-sample"><span className="eyebrow">Inter · Grensesnitt og lesetekst</span><p className="type-ui-heading">Lett å finne frem.</p><p>De beste leseopplevelsene gir innholdet rom. Et rolig grensesnitt gjør at overskrifter, bilder og historier får oppmerksomheten.</p><span className="type-metadata">TRONDHEIM · 4 min lesing</span><p className="small-note">Enkle etiketter, tydelige knapper og god kontrast.</p></div></div></section>
        <section className="design-section" aria-labelledby="components-heading"><div className="design-section-title"><span>04</span><h2 id="components-heading">Komponenter i bruk</h2></div><div className="component-grid"><div className="component-specimen"><h3>Handlinger</h3><p className="small-note">Én tydelig hovedhandling per område.</p><div className="button-examples"><a className="button button-primary" href={`#/article/${stories[0]?.id || ''}`}>Les en demosak <ArrowRight size={17} aria-hidden="true" /></a><button type="button" className={`button button-secondary ${exampleSaved ? 'is-saved' : ''}`} aria-pressed={exampleSaved} onClick={() => setExampleSaved(current => !current)}><Bookmark size={17} fill={exampleSaved ? 'currentColor' : 'none'} aria-hidden="true" />{exampleSaved ? 'Lagret eksempel' : 'Lagre eksempel'}</button><Button disabled>Utilgjengelig handling</Button><Button variant="text" onClick={() => setToast('Dette er en tekstknapp med tydelig tilbakemelding.')}>Teksthandling <ArrowUpRight size={16} aria-hidden="true" /></Button></div></div><div className="component-specimen"><h3>Etiketter og filtre</h3><p className="small-note">Kategori, tilgang og tilstand har egne uttrykk.</p><div className="badge-examples"><span className="eyebrow">Trondheim</span><PremiumBadge /><Badge variant="demo">Fiktiv demosak</Badge><span className="success-badge"><Check size={13} aria-hidden="true" /> Lagret</span></div><CategoryFilter value={searchCategory} onChange={setSearchCategory} label="Eksempel på kategorifilter" /><p className="small-note" aria-live="polite">Valgt kategori: {searchCategory}</p></div><form className="component-specimen example-form" onSubmit={event => { event.preventDefault(); setEmailStatus(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(exampleEmail.trim()) ? 'success' : 'error'); }} noValidate><h3>Skjematilstander</h3><p className="small-note">Et lokalt eksempel. Ingen informasjon sendes.</p><label htmlFor="example-email">E-postadresse</label><input className={emailStatus === 'error' ? 'input-error' : ''} id="example-email" type="email" placeholder="navn@eksempel.no" value={exampleEmail} aria-invalid={emailStatus === 'error'} aria-describedby="email-feedback" onChange={event => { setExampleEmail(event.target.value); setEmailStatus('idle'); }} /><p id="email-feedback" className={`form-feedback ${emailStatus}`}>{emailStatus === 'error' ? 'Skriv en e-postadresse, for eksempel navn@eksempel.no.' : emailStatus === 'success' ? 'Adressen har et gyldig format. Ingenting er sendt.' : 'Prøv feltet med og uten en gyldig e-postadresse.'}</p><button className="button button-primary" type="submit">Valider eksempel <Check size={17} aria-hidden="true" /></button></form><div className="component-specimen"><h3>Innhold som kan åpnes</h3><p className="small-note">Enkle detaljer uten å forlate siden.</p><details className="sample-details"><summary>Hva er med i prototypen?<ChevronRight size={18} aria-hidden="true" /></summary><p>Forside, søk, artikkellesing, lagrede saker, fargetema og dette designsystemet.</p></details><details className="sample-details"><summary>Hvordan bruker vi systemet?<ChevronRight size={18} aria-hidden="true" /></summary><p>Bygg videre på de samme fargene, typografien og komponentene. La den redaksjonelle historien være det viktigste på siden.</p></details><p className="focus-hint"><ArrowDown size={15} aria-hidden="true" /> Bruk Tab for å se tydelige fokusmarkeringer.</p></div></div></section>
        <section className="design-section" aria-labelledby="spacing-heading"><div className="design-section-title"><span>05</span><h2 id="spacing-heading">Rytme og rom</h2></div><div className="spacing-grid"><div><p className="small-note">Avstander bygger på et rutenett med 4 px som grunnenhet.</p><div className="spacing-examples">{[4, 8, 12, 16, 24, 32, 48].map(size => <div key={size}><span style={{ width: size }} /><code>{size} px</code></div>)}</div></div><div className="radius-examples"><div><span style={{ borderRadius: 'var(--radius-sm)' }} /><code>4 px · Etiketter</code></div><div><span style={{ borderRadius: 'var(--radius-md)' }} /><code>8 px · Kontroller</code></div><div><span style={{ borderRadius: 'var(--radius-lg)' }} /><code>16 px · Utvalgte flater</code></div></div></div></section>
        <div className="design-endnote"><Info size={20} aria-hidden="true" /><p>Dette er et selvstendig designforslag for en hackathon, og er ikke Adresseavisens offisielle profilmanual. Prototypen bruker egne komponenter og originalt demoinnhold.</p></div>
      </div>}
    </main>

    <footer className="site-footer"><div className="site-width footer-inner"><a className="footer-brand" href="#/" aria-label="Adressa – til forsiden"><img src={asset(`assets/brand/adressa-${theme === 'dark' ? 'white' : 'blue'}.svg`)} width="144" height="40" alt="adressa" /></a><p>Trøndelag i hjertet.<span>Uoffisiell prototype · Fiktivt demoinnhold</span></p><a className="text-link" href="#designsystem">Designsystem <ArrowUpRight size={15} aria-hidden="true" /></a></div><SourceCredits /></footer>
    <nav className="mobile-nav" aria-label="Hovedmeny">{navItems.map(({ page, href, label, Icon }) => <a key={page} href={href} className={route.page === page ? 'is-active' : ''} aria-current={route.page === page ? 'page' : undefined}><span className="mobile-nav-icon"><Icon size={22} strokeWidth={route.page === page ? 2.2 : 1.7} fill={page === 'saved' && route.page === page ? 'currentColor' : 'none'} aria-hidden="true" />{page === 'saved' && savedIds.length > 0 && <span className="mobile-count">{savedIds.length}</span>}</span><span>{label}</span></a>)}</nav>
    <div className="toast-region" role="status" aria-live="polite" aria-atomic="true">{toast && <div className="toast"><Check size={18} aria-hidden="true" /><span>{toast}</span><button className="icon-button" type="button" aria-label="Lukk meldingen" onClick={() => setToast('')}><X size={17} aria-hidden="true" /></button></div>}</div>
  </div>;
}
