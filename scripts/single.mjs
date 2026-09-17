#!/usr/bin/env node
/**
 * Empaqueta el sitio ya construido en UN solo archivo HTML, con las fuentes y el
 * JavaScript adentro: sirve para mandarlo por mail o abrirlo sin servidor.
 *
 * Uso: npm run build && node scripts/single.mjs   →  dist/flores-para-martina.html
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist');

let html = await readFile(join(DIST, 'index.html'), 'utf8');

// Fuentes → data URIs
for (const m of html.matchAll(/url\((\/assets\/[^)]+\.woff2)\)/g)) {
  const buf = await readFile(join(DIST, m[1]));
  html = html.replaceAll(m[0], `url(data:font/woff2;base64,${buf.toString('base64')})`);
}
// Sin precargas (ya no hay nada que precargar)
html = html.replace(/<link rel="preload"[^>]*>/g, '');
// Script principal → inline
for (const m of html.matchAll(/<script type="module" src="(\/assets\/[^"]+\.js)"><\/script>/g)) {
  const js = await readFile(join(DIST, m[1]), 'utf8');
  html = html.replace(m[0], `<script type="module">${js.replaceAll('</script', '<\\/script')}</script>`);
}
// Favicon → data URI; apple-touch-icon fuera
const fav = await readFile(join(DIST, 'favicon.svg'), 'utf8');
html = html.replace(/<link rel="icon" href="[^"]*" type="image\/svg\+xml">/, `<link rel="icon" href="data:image/svg+xml;utf8,${encodeURIComponent(fav)}" type="image/svg+xml">`);
html = html.replace(/<link rel="apple-touch-icon"[^>]*>/, '');

const salida = join(DIST, 'flores-para-martina.html');
await writeFile(salida, html);
console.log(`ok → ${salida} (${Math.round(html.length / 1024)} KB)`);
