// Copies the imported videos' web copies and posters into public/media/video/, so the hosted
// frontend serves them (the backend points there when it has no copy itself, VIDEO_PUBLIC_URL).
//
//   npm --prefix frontend run videos
//
// Only clips in backend/app/data/videos.json are copied. The folder is git-ignored: the files reach
// the hosted app only through a local build and `netlify deploy`.
import {copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(frontend, '../backend');
const source = resolve(backend, process.env.VIDEO_MEDIA_DIR || 'media/videos');
const target = resolve(frontend, 'public/media/video');

const {videos} = JSON.parse(readFileSync(resolve(backend, 'app/data/videos.json'), 'utf8'));
const files = videos.flatMap(v => [`${v.id}.mp4`, `${v.id}.jpg`]);
const missing = files.filter(f => !existsSync(resolve(source, f)));
if (missing.length) throw new Error(`Mangler ${missing.join(', ')} i ${source}. Kjør make videos ZIP=… først.`);

mkdirSync(target, {recursive: true});
for (const old of readdirSync(target)) if (!files.includes(old)) rmSync(resolve(target, old));
for (const file of files) copyFileSync(resolve(source, file), resolve(target, file));
console.log(`Kopierte ${videos.length} videoer med postere til ${target}`);
