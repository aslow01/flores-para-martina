#!/usr/bin/env node
/**
 * Genera public/og.png (1200×630): la vista previa que muestran WhatsApp, iMessage, etc.
 * No es un diseño aparte: es la portada real del sitio, abierta con ?og (sin intro,
 * sin hint, campo quieto), fotografiada con Chromium.
 *
 * Uso: npm run build && npm run og && npm run build
 * (el segundo build copia la imagen nueva a dist/)
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, copyFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist');
const PORT = 4175;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };

const server = createServer(async (req, res) => {
  let ruta = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`).pathname;
  if (ruta.endsWith('/')) ruta += 'index.html';
  const archivo = join(DIST, ruta);
  const info = await stat(archivo).catch(() => null);
  if (!info) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(archivo)] ?? 'application/octet-stream' });
  createReadStream(archivo).pipe(res);
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch({ executablePath: process.env.PW_EXECUTABLE || undefined });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${PORT}/?og`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);
const salida = join(ROOT, 'public', 'og.png');
await page.screenshot({ path: salida, type: 'png' });
await copyFile(salida, join(DIST, 'og.png')).catch(() => {});
await browser.close();
server.close();
console.log(`ok → ${salida}`);
