import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { resolveBasePath } from './base-path.mjs';

const output = resolve('dist');
const base = resolveBasePath(process.env);
const html = await readFile(resolve(output, 'index.html'), 'utf8');
const manifest = JSON.parse(await readFile(resolve(output, '.vite/manifest.json'), 'utf8'));
const files = new Set(['index.html']);
for (const chunk of Object.values(manifest)) {
  for (const path of [chunk.file, ...(chunk.css ?? []), ...(chunk.assets ?? [])]) {
    if (path) files.add(path);
  }
}
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const path = match[1];
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(path)) continue;
  if (!path.startsWith(base)) throw new Error(`Asset does not use base ${base}: ${path}`);
  files.add(decodeURIComponent(path.slice(base.length).split(/[?#]/)[0]));
}
for (const file of files) {
  const fullPath = resolve(output, file);
  if (!fullPath.startsWith(`${output}/`)) throw new Error(`Asset escapes dist: ${file}`);
  await access(fullPath);
}
console.log(`Build verified: ${files.size} local files, base ${base}`);
