import manifest from '../assets-manifest.json';

type AssetRecord = {
  path: string;
  title: string;
  source: { author?: string; pageUrl?: string };
  license: { id: string; url?: string };
};
const allAssets = manifest.assets as AssetRecord[];
const photos = allAssets.filter(item => item.path.endsWith('.jpg'));

/** Always outside article links/buttons so source links never become nested controls. */
export function PhotoCredit({ image, compact = false }: { image: string; compact?: boolean }) {
  const photo = photos.find(item => item.path === `public/${image}`);
  if (!photo) {
    const original = allAssets.find(item => item.path === `public/${image}` && item.license.id === 'MIT');
    return <span className="photo-credit">{original ? 'Original illustrasjon for hackathon · MIT' : 'Bildekilde ikke registrert i assetmanifestet.'}</span>;
  }
  return <span className={`photo-credit ${compact ? 'photo-credit-compact' : ''}`}>
    Illustrasjonsfoto: <a href={photo.source.pageUrl} target="_blank" rel="noreferrer">{photo.source.author}</a>
    {' · '}<a href={photo.license.url} target="_blank" rel="noreferrer">{photo.license.id.replaceAll('-', ' ')}</a>
    <span className="photo-changes"> · Nedskalert, komprimert{compact ? ' og vist som utsnitt' : '; utsnitt i visningen'}</span>
  </span>;
}

export function SourceCredits() {
  return <div className="site-width source-credits">
    <details>
      <summary>Bilder, kilder og bruksstatus</summary>
      <div className="credit-grid">
        {photos.map(photo => <p key={photo.path}><strong>{photo.title}</strong><PhotoCredit image={photo.path.replace(/^public\//, '')} /></p>)}
      </div>
      <p>Logoen er hentet fra <a href="https://www.adressa.no/" target="_blank" rel="noreferrer">adressa.no</a>.
        Blå og hvit variant er avledet for prototypen. Designsystem og appikon er uoffisielle forslag.
        Bitter og Inter er lokale, åpne fonter under SIL OFL 1.1. UI-ikoner: Lucide.</p>
      <p>Alle saker er fiktive demoeksempler. Fotoene viser steder og dokumenterer ingen av demoens hendelser.
        Fullstendige kilder, endringer og lisenser ligger i filene <code>docs/ASSET_SOURCES.md</code>, <code>assets-manifest.json</code> og <code>licenses/</code> i pakken.</p>
    </details>
  </div>;
}
