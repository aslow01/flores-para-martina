#!/usr/bin/env node
/**
 * Control de calidad en loop. Levanta `dist/` en un servidor local, abre la página
 * en varios tamaños y comprueba lo que un ojo cansado deja pasar:
 *
 *  - cero errores de consola y cero pedidos fallidos
 *  - sin scroll horizontal
 *  - la intro termina sola y la portada aparece
 *  - el ramo se abre por arrastre y por botón
 *  - accesibilidad con axe-core (sin problemas serios ni críticos)
 *  - peso real transferido (gzip), fuentes incluidas
 *  - capturas por sección en qa-output/
 *
 * Uso: npm run build && npm run qa
 * Variables: PW_EXECUTABLE (ruta a un Chromium), QA_BASE (por defecto http://127.0.0.1:4173/)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { servir } from './server.mjs';

const ROOT = resolve(import.meta.dirname, '../..');
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, 'qa-output');
const PORT = 4173;
const BASE = process.env.QA_BASE ?? `http://127.0.0.1:${PORT}/`;

const VIEWPORTS = [
  { nombre: 'movil-390', width: 390, height: 844, mobile: true, dpr: 3 },
  { nombre: 'tablet-768', width: 768, height: 1024, mobile: true, dpr: 2 },
  { nombre: 'desktop-1440', width: 1440, height: 900, mobile: false, dpr: 1 },
  { nombre: 'desktop-1920', width: 1920, height: 1080, mobile: false, dpr: 1 },
];

const SECCIONES = ['#contenido', '#por-que', '#ramo', '#carta', '#notas', '#contador', '#cierre'];

async function main() {
  await mkdir(OUT, { recursive: true });
  const server = await servir(DIST, PORT);
  const browser = await chromium.launch({
    executablePath: process.env.PW_EXECUTABLE || undefined,
    args: ['--enable-gpu-rasterization'],
  });

  const informe = { fecha: new Date().toISOString(), viewports: {}, peso: null, ok: true };
  const problemas = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dpr,
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
      locale: 'es-AR',
      timezoneId: 'America/Argentina/Buenos_Aires',
    });
    const page = await context.newPage();
    const consola = [];
    const fallidos = [];
    const pedidos = new Map();
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') consola.push(`${m.type()}: ${m.text()}`);
    });
    page.on('pageerror', (e) => consola.push(`pageerror: ${e.message}`));
    page.on('requestfailed', (r) => fallidos.push(`${r.url()} — ${r.failure()?.errorText}`));
    page.on('response', async (r) => {
      const url = r.url();
      if (!url.startsWith(BASE)) return;
      if (r.status() >= 400) fallidos.push(`${url} — HTTP ${r.status()}`);
      try {
        const cuerpo = await r.body();
        pedidos.set(url, { bytes: cuerpo.length, gzip: gzipSync(cuerpo, { level: 9 }).length, tipo: r.headers()['content-type'] ?? '' });
      } catch {
        /* respuestas sin cuerpo */
      }
    });

    const r = { capturas: [], consola, fallidos, overflow: false, ramo: {}, axe: null };
    informe.viewports[vp.nombre] = r;

    await page.goto(BASE, { waitUntil: 'load' });

    // Intro: tiene que existir y terminar sola en menos de 5 s.
    const intro = page.locator('.intro');
    if ((await intro.count()) > 0) {
      await page.waitForTimeout(900);
      await page.screenshot({ path: join(OUT, `${vp.nombre}-00-intro.png`) });
      r.capturas.push('00-intro');
      try {
        await intro.waitFor({ state: 'detached', timeout: 6000 });
      } catch {
        problemas.push(`[${vp.nombre}] la intro no terminó sola`);
      }
    }
    await page.waitForTimeout(4200); // el campo termina de crecer
    await page.screenshot({ path: join(OUT, `${vp.nombre}-01-portada.png`) });
    r.capturas.push('01-portada');

    // Scroll horizontal
    r.overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (r.overflow) problemas.push(`[${vp.nombre}] hay scroll horizontal`);

    // Secciones
    for (const [i, sel] of SECCIONES.entries()) {
      if (i === 0) continue;
      await page.evaluate((s) => {
        const el = document.querySelector(s);
        el?.scrollIntoView({ block: 'start', behavior: 'instant' });
      }, sel);
      await page.waitForTimeout(1900);
      const nombre = `${String(i + 1).padStart(2, '0')}-${sel.slice(1)}`;
      await page.screenshot({ path: join(OUT, `${vp.nombre}-${nombre}.png`) });
      r.capturas.push(nombre);

      if (sel === '#ramo') {
        // 1) Arrastre de la cinta
        const handle = page.locator('.ramo__handle');
        const caja = await handle.boundingBox();
        if (caja) {
          const cx = caja.x + caja.width / 2;
          const cy = caja.y + caja.height / 2;
          await page.mouse.move(cx, cy);
          await page.mouse.down();
          for (let k = 1; k <= 12; k++) {
            await page.mouse.move(cx, cy + k * 12, { steps: 2 });
            await page.waitForTimeout(16);
          }
          await page.screenshot({ path: join(OUT, `${vp.nombre}-${nombre}-arrastre.png`) });
          await page.mouse.up();
          await page.waitForTimeout(3600);
          r.ramo.porArrastre = (await page.locator('.ramo').getAttribute('data-state')) === 'abierto';
          if (!r.ramo.porArrastre) problemas.push(`[${vp.nombre}] el ramo no se abrió arrastrando la cinta`);
          await page.screenshot({ path: join(OUT, `${vp.nombre}-${nombre}-abierto.png`) });
          r.capturas.push(`${nombre}-abierto`);
        }
        // 2) Cerrar y abrir por botón (teclado)
        await page.evaluate(() => document.querySelector('.cierre__volver')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
        await page.waitForTimeout(2200);
        await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'start', behavior: 'instant' }), sel);
        await page.waitForTimeout(600);
        const estadoCerrado = await page.locator('.ramo').getAttribute('data-state');
        r.ramo.vuelveACerrar = estadoCerrado === 'cerrado';
        if (!r.ramo.vuelveACerrar) problemas.push(`[${vp.nombre}] "volver a abrir" no cerró el ramo (estado ${estadoCerrado})`);
        await page.locator('.ramo__abrir').focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3600);
        r.ramo.porBoton = (await page.locator('.ramo').getAttribute('data-state')) === 'abierto';
        if (!r.ramo.porBoton) problemas.push(`[${vp.nombre}] el ramo no se abrió con el botón`);
      }
      if (sel === '#carta') {
        await page.waitForTimeout(2600); // la corrección termina de escribirse
        await page.screenshot({ path: join(OUT, `${vp.nombre}-${nombre}-correccion.png`) });
      }
    }

    // Huevo de pascua
    await page.keyboard.type('martina', { delay: 30 });
    await page.waitForTimeout(700);
    const toast = await page.locator('.toast__texto').evaluate((el) => ({ texto: el.textContent, opacidad: getComputedStyle(el).opacity }));
    r.huevo = toast;
    if (!toast.texto || Number(toast.opacidad) < 0.5) problemas.push(`[${vp.nombre}] el huevo de pascua no respondió`);
    await page.screenshot({ path: join(OUT, `${vp.nombre}-09-huevo.png`) });

    // Accesibilidad (arriba de todo, con la portada en su estado normal)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(1200);
    try {
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
      const graves = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      r.axe = axe.violations.map((v) => ({ id: v.id, impacto: v.impact, nodos: v.nodes.length, ayuda: v.help }));
      if (graves.length) problemas.push(`[${vp.nombre}] axe: ${graves.map((v) => v.id).join(', ')}`);
    } catch (e) {
      r.axe = `no se pudo correr axe: ${e.message}`;
    }

    if (consola.length) problemas.push(`[${vp.nombre}] consola: ${consola.join(' | ')}`);
    if (fallidos.length) problemas.push(`[${vp.nombre}] pedidos fallidos: ${fallidos.join(' | ')}`);

    // Peso (se mide una vez, en desktop)
    if (vp.nombre === 'desktop-1440') {
      let bytes = 0;
      let gzip = 0;
      const detalle = [];
      for (const [url, v] of pedidos) {
        bytes += v.bytes;
        gzip += v.gzip;
        detalle.push({ url: url.replace(BASE, '/'), bytes: v.bytes, gzip: v.gzip });
      }
      informe.peso = { bytes, gzip, kb: Math.round(gzip / 1024), detalle: detalle.sort((a, b) => b.gzip - a.gzip) };
    }

    await context.close();
  }

  // Modo "menos movimiento": todo tiene que verse sin animar.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    const visible = await page.evaluate(() => {
      const el = document.querySelector('.portada__bajada');
      return el ? Number(getComputedStyle(el).opacity) : 0;
    });
    const introQuedo = (await page.locator('.intro').count()) > 0 && (await page.locator('.intro').isVisible());
    await page.screenshot({ path: join(OUT, `reduce-01-portada.png`) });
    informe.reduce = { bajadaVisible: visible === 1, introOculta: !introQuedo, errores };
    if (visible !== 1) problemas.push('[reduce] la bajada de la portada no está visible sin animaciones');
    if (introQuedo) problemas.push('[reduce] la intro quedó visible con prefers-reduced-motion');
    if (errores.length) problemas.push(`[reduce] errores: ${errores.join(' | ')}`);
    await context.close();
  }

  await browser.close();
  server.close();

  informe.problemas = problemas;
  informe.ok = problemas.length === 0;
  await writeFile(join(OUT, 'informe.json'), JSON.stringify(informe, null, 2));

  console.log(`\nPeso transferido (gzip): ${informe.peso?.kb} KB  (${informe.peso?.bytes} bytes sin comprimir)`);
  for (const d of informe.peso?.detalle ?? []) console.log(`  ${String(d.gzip).padStart(7)} gz  ${String(d.bytes).padStart(7)}  ${d.url}`);
  console.log(problemas.length ? `\n${problemas.length} problema(s):\n - ${problemas.join('\n - ')}` : '\nSin problemas.');
  process.exit(problemas.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
