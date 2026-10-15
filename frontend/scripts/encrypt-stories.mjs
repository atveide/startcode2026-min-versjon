// Encrypts the full stories from the local Adressa import for the readers you give a link.
//
//   npm --prefix frontend run encrypt                       re-encrypt for everyone (after an import)
//   npm --prefix frontend run encrypt -- --add Kari Ola     add readers, each with a personal link
//   npm --prefix frontend run encrypt -- --testers 10       add tester-01 … tester-10
//   npm --prefix frontend run encrypt -- --remove Ola       take a reader's access away
//
// The stories are encrypted once with a fresh content key (AES-256-GCM), and that key is wrapped
// with each reader's personal key. A link carries the personal key in its #fragment, which
// browsers never send to a server. Removing a reader and re-running locks them out: the stories
// get a new content key that only the remaining readers can unwrap. Then build and deploy.
//
// The personal keys and links stay in frontend/.readers.json and frontend/.reader-links.txt, and
// the package in public/private/ is ciphertext only; all three are git-ignored.
import {spawnSync} from 'node:child_process';
import {createCipheriv, createHash, randomBytes} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readersFile = resolve(frontend, '.readers.json');
const linksFile = resolve(frontend, '.reader-links.txt');
const outFile = resolve(frontend, 'public/private/stories.enc.json');
const APP_URL = 'https://startcode-august-demo.netlify.app/';

const args = process.argv.slice(2);
const after = flag => {
  const i = args.indexOf(flag);
  if (i < 0) return [];
  const rest = args.slice(i + 1);
  const end = rest.findIndex(a => a.startsWith('--'));
  return end < 0 ? rest : rest.slice(0, end);
};

function cacheDir() {
  if (process.env.ADRESSA_CACHE_DIR) return process.env.ADRESSA_CACHE_DIR;
  const env = resolve(frontend, '../backend/.env');
  const line = existsSync(env) && readFileSync(env, 'utf8').split('\n').find(l => l.startsWith('ADRESSA_CACHE_DIR='));
  const value = line && line.slice('ADRESSA_CACHE_DIR='.length).trim();
  if (!value) throw new Error('Sett ADRESSA_CACHE_DIR (i backend/.env eller miljøet) til mappen med articles.json.');
  return value;
}

// {name: base64url key}
const readers = existsSync(readersFile) ? JSON.parse(readFileSync(readersFile, 'utf8')) : {};
const added = after('--add').filter(name => !readers[name]);
const testers = Number(after('--testers')[0] ?? 0);
for (let n = 1, made = 0; made < testers; n++) {
  const name = `tester-${String(n).padStart(2, '0')}`;
  if (!readers[name] && !added.includes(name)) added.push(name), made++;
}
for (const name of added) readers[name] = randomBytes(32).toString('base64url');
for (const name of after('--remove')) {
  if (!(name in readers)) throw new Error(`Fant ingen leser som heter ${name}.`);
  delete readers[name];
}
if (!Object.keys(readers).length) throw new Error('Ingen lesere ennå. Legg til med --add <navn> eller --testers <antall>.');

// Only what the public week.json lacks: the full story, never the local photo copies.
const PRIVATE_FIELDS = ['lead', 'authors', 'modifiedAt', 'summary', 'body'];

// Opplyst's bullet points come from articles that aren't ours to publish either, so they travel in
// the same package. The backend prints the ones that match the current import.
function opplystSummaries() {
  const run = spawnSync('uv', ['run', 'python', '-m', 'app.summaries', '--export'], {
    cwd: resolve(frontend, '../backend'),
    encoding: 'utf8',
  });
  if (run.status !== 0) {
    console.warn(`Fikk ikke hentet Opplysts kortversjoner, sakene får dem ikke: ${run.stderr || run.error}`);
    return {};
  }
  return JSON.parse(run.stdout);
}

const {articles, importedAt} = JSON.parse(readFileSync(resolve(cacheDir(), 'articles.json'), 'utf8'));
const summaries = opplystSummaries();
const stories = Object.fromEntries(articles
  .filter(a => Array.isArray(a.body) && a.body.length)
  .map(a => [a.id, {
    ...Object.fromEntries(PRIVATE_FIELDS.map(f => [f, a[f] ?? null])),
    opplystSummary: summaries[a.id] ?? null,
  }]));

// WebCrypto expects the auth tag appended to the ciphertext.
function seal(key, plain) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(plain), cipher.final(), cipher.getAuthTag()]);
  return {iv: iv.toString('base64'), data: data.toString('base64')};
}

// The app finds its entry by this id, so the public package never names anyone.
const readerId = key => createHash('sha256').update(key).digest().subarray(0, 9).toString('base64url');

const contentKey = randomBytes(32);
const sealed = seal(contentKey, Buffer.from(JSON.stringify({importedAt, stories}), 'utf8'));
const wrapped = Object.fromEntries(Object.values(readers).map(k => {
  const key = Buffer.from(k, 'base64url');
  const {iv, data} = seal(key, contentKey);
  return [readerId(key), {iv, key: data}];
}));

mkdirSync(dirname(outFile), {recursive: true});
writeFileSync(outFile, JSON.stringify({v: 2, alg: 'AES-256-GCM', ...sealed, readers: wrapped}) + '\n');
writeFileSync(readersFile, JSON.stringify(readers, null, 2) + '\n', {mode: 0o600});
const links = Object.entries(readers).map(([name, key]) => `${name}\t${APP_URL}#nokkel=${key}`);
writeFileSync(linksFile, links.join('\n') + '\n', {mode: 0o600});

const withSummary = Object.values(stories).filter(s => s.opplystSummary).length;
console.log(`Krypterte ${Object.keys(stories).length} saker (${withSummary} med Opplysts kortversjon) for ${links.length} lesere til ${outFile}`);
if (added.length) console.log(`Nye lesere: ${added.join(', ')}`);
console.log(`Lenkene ligger i ${linksFile}. Bygg og deploy appen for at endringen skal gjelde.`);
