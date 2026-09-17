/**
 * Servidor estático mínimo para `dist/`, con gzip, como lo sirve GitHub Pages.
 * Lo usan scripts/qa/run.mjs, scripts/og.mjs y scripts/qa/lighthouse.mjs.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { extname, join } from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.txt': 'text/plain',
};
const COMPRIMIBLES = new Set(['.html', '.js', '.css', '.svg', '.json', '.txt']);

export async function servir(dist, port) {
  const cache = new Map();
  const server = createServer(async (req, res) => {
    try {
      let ruta = decodeURIComponent(new URL(req.url ?? '/', `http://127.0.0.1:${port}`).pathname);
      if (ruta.endsWith('/')) ruta += 'index.html';
      let archivo = join(dist, ruta);
      let info = await stat(archivo).catch(() => null);
      if (info?.isDirectory()) {
        archivo = join(archivo, 'index.html');
        info = await stat(archivo).catch(() => null);
      }
      let status = 200;
      if (!info) {
        archivo = join(dist, '404.html');
        status = 404;
      }
      const ext = extname(archivo);
      let entrada = cache.get(archivo);
      if (!entrada) {
        const cuerpo = await readFile(archivo);
        entrada = { cuerpo, gzip: COMPRIMIBLES.has(ext) ? gzipSync(cuerpo, { level: 9 }) : null };
        cache.set(archivo, entrada);
      }
      const aceptaGzip = /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
      const headers = {
        'content-type': MIME[ext] ?? 'application/octet-stream',
        'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
      };
      if (entrada.gzip && aceptaGzip) {
        headers['content-encoding'] = 'gzip';
        headers['content-length'] = entrada.gzip.length;
        res.writeHead(status, headers);
        res.end(entrada.gzip);
      } else {
        headers['content-length'] = entrada.cuerpo.length;
        res.writeHead(status, headers);
        res.end(entrada.cuerpo);
      }
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return server;
}
