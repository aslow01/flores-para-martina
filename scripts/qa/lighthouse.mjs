#!/usr/bin/env node
/**
 * Lighthouse (móvil, con throttling simulado) contra dist/ servido con gzip.
 * Uso: npm run build && npm run lighthouse
 * Necesita Chrome/Chromium: CHROME_PATH=/ruta/a/chrome si no lo encuentra solo.
 */
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { servir } from './server.mjs';

const ROOT = resolve(import.meta.dirname, '../..');
const PORT = 4177;
const OUT = join(ROOT, 'qa-output', 'lighthouse');

await mkdir(OUT, { recursive: true });
const server = await servir(join(ROOT, 'dist'), PORT);

const args = [
  '--yes',
  'lighthouse@13',
  `http://127.0.0.1:${PORT}/`,
  '--form-factor=mobile',
  '--screenEmulation.mobile',
  '--throttling-method=simulate',
  '--only-categories=performance,accessibility,best-practices,seo',
  '--output=json',
  '--output=html',
  `--output-path=${join(OUT, 'movil')}`,
  '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
  '--quiet',
];
const codigo = await new Promise((r) => {
  const p = spawn('npx', args, { stdio: 'inherit', env: process.env });
  p.on('exit', r);
});
server.close();
if (codigo !== 0) process.exit(codigo ?? 1);

const informe = JSON.parse(await readFile(join(OUT, 'movil.report.json'), 'utf8'));
console.log('\nLighthouse móvil');
for (const [k, v] of Object.entries(informe.categories)) console.log(`  ${k.padEnd(16)} ${Math.round(v.score * 100)}`);
const a = informe.audits;
for (const id of ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index'])
  if (a[id]) console.log(`  ${id.padEnd(26)} ${a[id].displayValue}`);
const flojas = Object.values(a)
  .filter((x) => x.score !== null && x.score < 0.9 && x.scoreDisplayMode === 'numeric')
  .map((x) => `${x.id} (${x.score})`);
console.log(`  auditorías numéricas por debajo de 0.9: ${flojas.join(', ') || 'ninguna'}`);
