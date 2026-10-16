// Part of `npm run build`: puts the full stories from the local Adressa import into dist/private/.
//
// Adressa's «Kort oppsummert», the article text, the photos and Oppdatert's bullet points are
// subscription content, so they stay out of git and reach the hosted app only through a local build
// and `netlify deploy`. There the whole site is behind a password (netlify/edge-functions/
// password.ts), /private/ included, and the app adds them to the public stories (src/unlock.ts).
// Without the import the build still works, and the hosted stories show only their public facts.
import {spawnSync} from 'node:child_process';
import {copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(frontend, '../backend');
const target = resolve(frontend, 'dist/private');
// The photo names the scraper makes, as in backend/app/stories.py.
const IMAGE_FILE = /^adressa-[A-Za-z0-9]+\.(jpg|png|webp|avif)$/;

// A relative ADRESSA_CACHE_DIR is relative to backend/, as for the backend itself.
function cacheDir() {
  if (process.env.ADRESSA_CACHE_DIR) return resolve(backend, process.env.ADRESSA_CACHE_DIR);
  const env = resolve(backend, '.env');
  const line = existsSync(env) && readFileSync(env, 'utf8').split('\n').find(l => l.startsWith('ADRESSA_CACHE_DIR='));
  const value = line && line.slice('ADRESSA_CACHE_DIR='.length).trim();
  return value ? resolve(backend, value) : null;
}

// Only what the public week.json lacks: the full story.
const PRIVATE_FIELDS = ['lead', 'authors', 'modifiedAt', 'summary', 'body'];

// Oppdatert's bullet points come from articles that aren't ours to publish either, so they stay
// behind the password too. The backend prints the ones that match the current import.
function opplystSummaries() {
  const run = spawnSync('uv', ['run', 'python', '-m', 'app.summaries', '--export'], {cwd: backend, encoding: 'utf8'});
  if (run.status !== 0) {
    console.warn(`Fikk ikke hentet Oppdaterts kortversjoner, sakene får dem ikke: ${run.stderr || run.error}`);
    return {};
  }
  return JSON.parse(run.stdout);
}

const folder = cacheDir();
const cacheFile = folder && resolve(folder, 'articles.json');
if (!cacheFile || !existsSync(cacheFile)) {
  console.warn('Advarsel: fant ingen Adressa-import (ADRESSA_CACHE_DIR i backend/.env). Bygget har bare de offentlige sakene; kjør make scrape først.');
} else {
  const {articles, importedAt} = JSON.parse(readFileSync(cacheFile, 'utf8'));
  const summaries = opplystSummaries();
  mkdirSync(resolve(target, 'images'), {recursive: true});
  const stories = {};
  for (const a of articles.filter(a => Array.isArray(a.body) && a.body.length)) {
    const story = {...Object.fromEntries(PRIVATE_FIELDS.map(f => [f, a[f] ?? null])), opplystSummary: summaries[a.id] ?? null};
    const file = a.image?.file;
    if (file && IMAGE_FILE.test(file) && existsSync(resolve(folder, 'images', file))) {
      copyFileSync(resolve(folder, 'images', file), resolve(target, 'images', file));
      const {alt = null, caption = null, credit = null} = a.image;
      story.image = {src: `/private/images/${file}`, alt, caption, credit};
    }
    stories[a.id] = story;
  }
  writeFileSync(resolve(target, 'stories.json'), JSON.stringify({importedAt, stories}) + '\n');
  const all = Object.values(stories);
  console.log(`La ${all.length} saker (${all.filter(s => s.opplystSummary).length} med kortversjon, ${all.filter(s => s.image).length} med bilde) i ${target}`);
}
