/**
 * Botánica procedural. Cuatro especies amarillas, ninguna flor igual a otra.
 *
 * Todo se describe en un radio unitario (R = 1) y después se escala:
 * el mismo modelo sirve para los sprites del campo (canvas) y para el ramo (SVG).
 */
import type { RNG } from './noise';

export type Especie = 'margarita' | 'girasol' | 'ranunculo' | 'boton';

export interface Petalo {
  ang: number; // radianes
  l: number; // largo (fracción de R)
  w: number; // semiancho (fracción de R)
  punta: number; // 0 redonda, 1 puntiaguda
  curva: number; // desvío de la punta, en fracciones de w
  capa: number; // 0 = atrás
  color: string; // color en la punta
  base: string; // color en la base
}

export interface Semilla {
  x: number;
  y: number;
  r: number;
  color: string;
}

export interface Flor {
  especie: Especie;
  petalos: Petalo[];
  centroR: number;
  centroColor: string;
  centroBorde: string;
  semillas: Semilla[];
  /** Anillo de polen (solo girasol). */
  anillo: { r0: number; r1: number; color: string } | null;
}

/* ---------- Color ---------- */

function hexARgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbAHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
/** Mezcla dos colores hex, t en [0, 1]. */
export function mezclar(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexARgb(a);
  const [r2, g2, b2] = hexARgb(b);
  return rgbAHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}
/** Aclara (t > 0) u oscurece (t < 0) un color, sin pasar por HSL. */
export function ajustar(hex: string, t: number): string {
  return t >= 0 ? mezclar(hex, '#fff6d6', t) : mezclar(hex, '#3a2408', -t);
}

export const PALETA = {
  sun: '#ffd35a',
  marigold: '#f1b52b',
  deep: '#d8940c',
  honey: '#b8790a',
  pollen: '#8a5a12',
  seed: '#4a2f10',
  seed2: '#6d4519',
  paper: '#f5eedf',
  stem: '#5e6b3a',
  leaf: '#7b8b48',
  leafDark: '#3e4a27',
  greenCenter: '#8f9c4b',
} as const;

/* ---------- Geometría ---------- */

/** Camino SVG de un pétalo apoyado en el origen, apuntando a +x. */
export function petaloPath(l: number, w: number, punta: number, curva: number): string {
  const cx1 = l * 0.32;
  const cx2 = l * (0.76 + 0.16 * punta);
  const cy2 = w * (0.66 - 0.5 * punta);
  const ty = curva * w;
  const f = (n: number) => n.toFixed(3);
  return (
    `M0 0` +
    `C${f(cx1)} ${f(-w)} ${f(cx2)} ${f(-cy2 + ty * 0.4)} ${f(l)} ${f(ty)}` +
    `C${f(cx2)} ${f(cy2 + ty * 0.7)} ${f(cx1)} ${f(w)} 0 0Z`
  );
}

/** Camino SVG de una hoja apoyada en el origen, apuntando a +x. */
export function hojaPath(l: number, w: number): string {
  const f = (n: number) => n.toFixed(2);
  return `M0 0Q${f(l * 0.45)} ${f(-w)} ${f(l)} 0Q${f(l * 0.55)} ${f(w)} 0 0Z`;
}

interface Capa {
  n: number;
  l: [number, number];
  w: [number, number];
  punta: number;
  curva: number;
  base: string;
  color: string;
  desfase: number; // rotación de la capa respecto a la anterior
}

const ESPECIES: Record<Especie, { capas: Capa[]; centroR: number; centro: string; borde: string }> = {
  margarita: {
    capas: [
      { n: 17, l: [0.86, 1], w: [0.11, 0.15], punta: 0.15, curva: 0.1, base: '#dfa019', color: '#ffd65f', desfase: 0 },
    ],
    centroR: 0.21,
    centro: '#8a5a12',
    borde: '#b8790a',
  },
  girasol: {
    capas: [
      { n: 22, l: [0.86, 0.96], w: [0.12, 0.16], punta: 0.8, curva: 0.08, base: '#c2830a', color: '#e6a61c', desfase: 0.5 },
      { n: 22, l: [0.9, 1], w: [0.13, 0.17], punta: 0.75, curva: 0.1, base: '#d8940c', color: '#f7bd35', desfase: 0 },
    ],
    centroR: 0.4,
    centro: '#3f2810',
    borde: '#2e1c0a',
  },
  ranunculo: {
    capas: [
      { n: 9, l: [0.94, 1], w: [0.3, 0.34], punta: 0, curva: 0, base: '#d2920f', color: '#edad24', desfase: 0 },
      { n: 8, l: [0.7, 0.76], w: [0.26, 0.3], punta: 0, curva: 0, base: '#e3a51a', color: '#f7c23c', desfase: 0.5 },
      { n: 7, l: [0.46, 0.52], w: [0.22, 0.26], punta: 0, curva: 0, base: '#efb62a', color: '#ffd35a', desfase: 0.25 },
    ],
    centroR: 0.09,
    centro: '#8f9c4b',
    borde: '#5e6b3a',
  },
  boton: {
    capas: [
      { n: 12, l: [0.86, 0.94], w: [0.2, 0.23], punta: 0.1, curva: 0.05, base: '#d3930f', color: '#efb42a', desfase: 0 },
      { n: 10, l: [0.58, 0.66], w: [0.19, 0.22], punta: 0.1, curva: 0.05, base: '#e7a91d', color: '#fcc94a', desfase: 0.5 },
    ],
    centroR: 0.13,
    centro: '#c98d12',
    borde: '#a06f0b',
  },
};

export function crearFlor(rng: RNG, especie: Especie): Flor {
  const def = ESPECIES[especie];
  const petalos: Petalo[] = [];
  let rotAcum = rng() * Math.PI * 2;

  def.capas.forEach((capa, ci) => {
    const n = capa.n + rng.entero(-2, 2);
    const paso = (Math.PI * 2) / n;
    rotAcum += paso * capa.desfase;
    for (let i = 0; i < n; i++) {
      const jitter = rng.entre(-0.06, 0.06);
      const tono = rng.entre(-0.07, 0.07);
      petalos.push({
        ang: rotAcum + paso * i + paso * jitter,
        l: rng.entre(capa.l[0], capa.l[1]),
        w: rng.entre(capa.w[0], capa.w[1]),
        punta: capa.punta,
        curva: capa.curva * rng.entre(-1, 1),
        capa: ci,
        color: ajustar(capa.color, tono),
        base: ajustar(capa.base, tono * 0.5),
      });
    }
  });

  const semillas: Semilla[] = [];
  let anillo: Flor['anillo'] = null;
  if (especie === 'girasol') {
    // Espiral de Vogel: r = c·√n, θ = n·137,5°. Es lo que hace un girasol de verdad.
    const N = 120;
    const rMax = def.centroR * 0.92;
    const dorado = Math.PI * (3 - Math.sqrt(5));
    for (let i = 1; i <= N; i++) {
      const r = rMax * Math.sqrt(i / N);
      const t = i * dorado;
      const k = r / rMax;
      semillas.push({
        x: Math.cos(t) * r,
        y: Math.sin(t) * r,
        r: 0.016 + 0.017 * k,
        color: i % 3 === 0 ? PALETA.seed2 : k > 0.75 ? '#5a3a16' : PALETA.seed,
      });
    }
    anillo = { r0: def.centroR * 0.9, r1: def.centroR * 1.06, color: '#b9862a' };
  } else if (especie === 'margarita') {
    // Polen: puntitos irregulares en el disco central.
    for (let i = 0; i < 26; i++) {
      const r = Math.sqrt(rng()) * def.centroR * 0.85;
      const t = rng() * Math.PI * 2;
      semillas.push({ x: Math.cos(t) * r, y: Math.sin(t) * r, r: rng.entre(0.012, 0.022), color: rng() > 0.5 ? '#c98d12' : '#6b4419' });
    }
  }

  return {
    especie,
    petalos,
    centroR: def.centroR,
    centroColor: def.centro,
    centroBorde: def.borde,
    semillas,
    anillo,
  };
}

/* ---------- Canvas ---------- */

const cachePaths = new Map<string, Path2D>();
function pathDe(p: Petalo): Path2D {
  const key = `${p.l.toFixed(3)}|${p.w.toFixed(3)}|${p.punta}|${p.curva.toFixed(3)}`;
  let path = cachePaths.get(key);
  if (!path) {
    path = new Path2D(petaloPath(p.l, p.w, p.punta, p.curva));
    cachePaths.set(key, path);
  }
  return path;
}

/**
 * Dibuja una flor centrada en el origen del contexto, con radio R en px.
 * `desaturar` mezcla los colores con el papel (para las flores lejanas).
 */
export function dibujarFlor(ctx: CanvasRenderingContext2D, flor: Flor, R: number, desaturar = 0): void {
  const col = (c: string) => (desaturar > 0 ? mezclar(c, PALETA.paper, desaturar) : c);
  const ordenados = [...flor.petalos].sort((a, b) => a.capa - b.capa);

  ctx.save();
  ctx.scale(R, R);
  ctx.lineJoin = 'round';
  for (const p of ordenados) {
    ctx.save();
    ctx.rotate(p.ang);
    const g = ctx.createLinearGradient(0, 0, p.l, 0);
    g.addColorStop(0, col(p.base));
    g.addColorStop(0.55, col(mezclar(p.base, p.color, 0.6)));
    g.addColorStop(1, col(p.color));
    ctx.fillStyle = g;
    ctx.fill(pathDe(p));
    // Un trazo finito en la base da lectura de ilustración, no de clip-art.
    ctx.strokeStyle = col('#8a5a12');
    ctx.globalAlpha = 0.14;
    ctx.lineWidth = 0.02;
    ctx.stroke(pathDe(p));
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Sombra hacia el centro
  const sombra = ctx.createRadialGradient(0, 0, flor.centroR * 0.6, 0, 0, flor.centroR * 2.4);
  sombra.addColorStop(0, 'rgba(110, 60, 0, 0.28)');
  sombra.addColorStop(1, 'rgba(110, 60, 0, 0)');
  ctx.fillStyle = sombra;
  ctx.beginPath();
  ctx.arc(0, 0, flor.centroR * 2.4, 0, Math.PI * 2);
  ctx.fill();

  if (flor.anillo) {
    ctx.fillStyle = col(flor.anillo.color);
    ctx.beginPath();
    ctx.arc(0, 0, flor.anillo.r1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = col(flor.centroColor);
  ctx.beginPath();
  ctx.arc(0, 0, flor.centroR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = col(flor.centroBorde);
  ctx.lineWidth = 0.018;
  ctx.stroke();
  for (const s of flor.semillas) {
    ctx.fillStyle = col(s.color);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Pre-renderiza una flor a un canvas (sprite) de lado `px` (en px CSS) y densidad `dpr`. */
export function crearSprite(flor: Flor, px: number, dpr: number, desaturar = 0): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.ceil(px * dpr);
  c.height = Math.ceil(px * dpr);
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.scale(dpr, dpr);
  ctx.translate(px / 2, px / 2);
  dibujarFlor(ctx, flor, px * 0.46, desaturar);
  return c;
}

/* ---------- SVG ---------- */

let contadorIds = 0;

/**
 * Marca SVG de una flor centrada en (0,0) con radio R. Devuelve el `<g>` y las
 * definiciones que necesita (gradientes), para insertar en un <defs> compartido.
 */
export function florSVG(flor: Flor, R: number, clase = 'flor', prefijo = 'f'): { g: string; defs: string } {
  const id = `${prefijo}${++contadorIds}`;
  const f = (n: number) => n.toFixed(2);
  const ordenados = [...flor.petalos].sort((a, b) => a.capa - b.capa);
  let defs = '';
  let g = `<g class="${clase}">`;

  // Un gradiente por capa (no por pétalo): el gradiente se define en el espacio del
  // pétalo, antes de rotarlo, así que base→punta queda bien orientado en todos.
  const capas = new Map<number, Petalo>();
  for (const p of ordenados) if (!capas.has(p.capa)) capas.set(p.capa, p);
  for (const [capa, p] of capas) {
    defs += `<linearGradient id="${id}c${capa}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.base}"/><stop offset="0.55" stop-color="${mezclar(p.base, p.color, 0.6)}"/><stop offset="1" stop-color="${p.color}"/></linearGradient>`;
  }
  ordenados.forEach((p) => {
    g += `<path d="${petaloPath(p.l * R, p.w * R, p.punta, p.curva)}" fill="url(#${id}c${p.capa})" stroke="#8a5a12" stroke-opacity="0.16" stroke-width="${f(R * 0.02)}" stroke-linejoin="round" transform="rotate(${f((p.ang * 180) / Math.PI)})"/>`;
  });

  const rs = flor.centroR * 2.4 * R;
  defs += `<radialGradient id="${id}s"><stop offset="0.25" stop-color="#6e3c00" stop-opacity="0.3"/><stop offset="1" stop-color="#6e3c00" stop-opacity="0"/></radialGradient>`;
  g += `<circle r="${f(rs)}" fill="url(#${id}s)"/>`;

  if (flor.anillo) {
    g += `<circle r="${f(flor.anillo.r1 * R)}" fill="${flor.anillo.color}"/>`;
  }
  g += `<circle r="${f(flor.centroR * R)}" fill="${flor.centroColor}" stroke="${flor.centroBorde}" stroke-width="${f(R * 0.018)}"/>`;
  for (const s of flor.semillas) {
    g += `<circle cx="${f(s.x * R)}" cy="${f(s.y * R)}" r="${f(s.r * R)}" fill="${s.color}"/>`;
  }
  g += '</g>';
  return { g, defs };
}

/** Un solo elemento SVG completo (para las flores prensadas de las notas). */
export function florSVGCompleta(flor: Flor, tam: number, clase = 'flor', prefijo = 'n'): string {
  const { g, defs } = florSVG(flor, tam * 0.44, clase, prefijo);
  return `<svg viewBox="${-tam / 2} ${-tam / 2} ${tam} ${tam}" width="${tam}" height="${tam}" aria-hidden="true" focusable="false"><defs>${defs}</defs>${g}</svg>`;
}
