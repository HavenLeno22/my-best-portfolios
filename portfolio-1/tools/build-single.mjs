// Bundles the site into one self-contained HTML file: every stylesheet and script is inlined.
//
//   node tools/build-single.mjs                    -> dist/leno-instrument.html (a full page)
//   node tools/build-single.mjs --fragment --out x -> page content only, for hosts that wrap
//                                                    it in their own <html>/<head>/<body>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const fragment = args.includes('--fragment');
const outIndex = args.indexOf('--out');
const out = outIndex >= 0 ? resolve(args[outIndex + 1]) : join(root, 'dist', 'leno-instrument.html');

const read = (path) => readFileSync(join(root, path), 'utf8');

function inline(source, closingTag, path) {
  if (source.toLowerCase().includes(closingTag)) {
    throw new Error(`${path} contains "${closingTag}", which would end the inline block early.`);
  }
  return source;
}

let html = read('index.html');

html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, path) =>
  `<style>\n${inline(read(path), '</style', path)}</style>`);

html = html.replace(/<script src="(js\/[^"]+)" defer><\/script>/g, (_, path) =>
  `<script>\n${inline(read(path), '</script', path)}</script>`);

if (fragment) {
  html = html
    .replace(/<!doctype html>\s*/i, '')
    .replace(/<\/?html[^>]*>\s*/gi, '')
    .replace(/<\/?head>\s*/gi, '')
    .replace(/<\/?body>\s*/gi, '')
    .replace(/<meta (charset|name="viewport"|name="description"|name="theme-color")[^>]*>\s*/gi, '')
    .replace(/<link rel="icon"[^>]*>\s*/gi, '');
}

const leftovers = html.match(/(href|src)="(css|js)\/[^"]+"/g);
if (leftovers) throw new Error('Some local files were not inlined: ' + leftovers.join(', '));

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`Wrote ${out} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB${fragment ? ', fragment' : ''})`);
