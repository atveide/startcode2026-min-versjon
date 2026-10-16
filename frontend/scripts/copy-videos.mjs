// Part of `npm run build`: copies Adressa's videos from the backend into dist/media/video/.
//
// The videos belong to the backend: `make videos ZIP=…` puts them in backend/media/videos, and the
// backend serves them itself in development. The hosted backend has no copy (the files stay out of
// git), so it points to this one on the hosted frontend instead (VIDEO_PUBLIC_URL). Only clips in
// backend/app/data/videos.json are copied, and the files reach the hosted app only through a local
// build and `netlify deploy`. Without the files the build still works, just without videos.
import {copyFileSync, existsSync, mkdirSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(frontend, '../backend');
const source = resolve(backend, process.env.VIDEO_MEDIA_DIR || 'media/videos');
const target = resolve(frontend, 'dist/media/video');

const {videos} = JSON.parse(readFileSync(resolve(backend, 'app/data/videos.json'), 'utf8'));
const files = videos.flatMap(v => [`${v.id}.mp4`, `${v.id}.jpg`]);
const missing = files.filter(f => !existsSync(resolve(source, f)));
if (missing.length) {
  console.warn(`Advarsel: mangler ${missing.join(', ')} i ${source}. Bygget har ingen videoer; kjør make videos ZIP=… først.`);
} else {
  mkdirSync(target, {recursive: true});
  for (const file of files) copyFileSync(resolve(source, file), resolve(target, file));
  console.log(`Kopierte ${videos.length} videoer med postere fra backend til ${target}`);
}
