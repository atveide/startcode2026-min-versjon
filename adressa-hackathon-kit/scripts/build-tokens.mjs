import { readFile, writeFile } from 'node:fs/promises';
const source = new URL('../design-system/tokens.json', import.meta.url);
const tokens = JSON.parse(await readFile(source, 'utf8'));
const lines = ['/* Generated from tokens.json. Run npm run tokens after edits. */', ':root {'];
for (const group of ['color', 'font', 'space', 'radius', 'size', 'type', 'motion']) {
  for (const [name, token] of Object.entries(tokens[group])) {
    lines.push(`  --${group}-${name}: ${token.$value};`);
  }
}
lines.push('}', '', '/* Semantic dark values for consumers that opt into data-theme. */', '[data-theme="dark"] {');
for (const [name, value] of Object.entries(tokens.dark)) lines.push(`  --color-${name}: ${value};`);
lines.push('}', '', '@media (prefers-reduced-motion: reduce) {', '  :root { --motion-fast: 0ms; --motion-normal: 0ms; }', '}', '');
await writeFile(new URL('../design-system/tokens.css', import.meta.url), lines.join('\n'));
console.log('Generated design-system/tokens.css');
