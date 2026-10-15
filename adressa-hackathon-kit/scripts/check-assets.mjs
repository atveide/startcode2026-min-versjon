import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'assets-manifest.json'), 'utf8'));
const errors = [];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(async entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [path.relative(root, file)];
  }))).flat();
}
const known = new Set(manifest.assets.map(asset => asset.path));
for (const asset of [...manifest.assets, ...manifest.licenseTexts]) {
  try {
    const bytes = await readFile(path.join(root, asset.path));
    if (hash(bytes) !== asset.sha256) errors.push(`${asset.path}: checksum differs from manifest`);
    if (asset.bytes != null && asset.bytes !== bytes.length) errors.push(`${asset.path}: wrong byte length`);
    if (asset.path.endsWith('.svg') && /<script|<foreignObject|\son\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|javascript:)/i.test(bytes.toString())) {
      errors.push(`${asset.path}: active SVG content found`);
    }
    if (asset.path.endsWith('.woff2') && bytes.subarray(0, 4).toString() !== 'wOF2') errors.push(`${asset.path}: not WOFF2`);
  } catch (error) {
    errors.push(`${asset.path}: ${error.message}`);
  }
}
for (const file of await walk(path.join(root, 'public/assets'))) {
  if (!known.has(file)) errors.push(`${file}: missing from asset manifest`);
}
const storySource = await readFile(path.join(root, 'src/data/stories.ts'), 'utf8');
for (const [, imagePath] of storySource.matchAll(/image:\s*['"]([^'"]+)['"]/g)) {
  if (!known.has(`public/${imagePath}`)) errors.push(`${imagePath}: story asset missing from manifest`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log(`Verified ${manifest.assets.length} local assets, ${manifest.licenseTexts.length} notices and every story image.`);
