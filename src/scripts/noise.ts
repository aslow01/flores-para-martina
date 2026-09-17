/**
 * Azar con semilla y ruido simplex 2D.
 *
 * Con la misma semilla, el campo y el ramo salen siempre iguales: las flores de
 * Martina son estas y no otras. (Math.random daría flores distintas en cada visita.)
 */

export interface RNG {
  /** Número en [0, 1). */
  (): number;
  /** Número en [min, max). */
  entre(min: number, max: number): number;
  /** Entero en [min, max]. */
  entero(min: number, max: number): number;
  /** Elige un elemento del arreglo. */
  elegir<T>(lista: readonly T[]): T;
  /** Semilla derivada para un sub-generador independiente. */
  hijo(): number;
}

/** mulberry32: chico, rápido y suficiente para dibujar flores. */
export function crearRng(semilla: number): RNG {
  let a = semilla >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = next as RNG;
  rng.entre = (min, max) => min + (max - min) * next();
  rng.entero = (min, max) => Math.floor(min + (max - min + 1) * next());
  rng.elegir = (lista) => lista[Math.floor(next() * lista.length)]!;
  rng.hijo = () => Math.floor(next() * 4294967296);
  return rng;
}

/** Convierte un texto (por ejemplo, un nombre) en una semilla estable. */
export function semillaDe(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ---------- Simplex 2D (Stefan Gustavson, dominio público), con tabla permutada por semilla ---------- */

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const GRAD: readonly (readonly [number, number])[] = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

export type Ruido2D = (x: number, y: number) => number;

export function crearRuido(semilla: number): Ruido2D {
  const rng = crearRng(semilla);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = p[i]!;
    p[i] = p[j]!;
    p[j] = t;
  }
  const perm = new Uint8Array(512);
  const permMod8 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255]!;
    permMod8[i] = perm[i]! & 7;
  }

  return (xin, yin) => {
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;

    let n = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      const g = GRAD[permMod8[ii + perm[jj]!]!]!;
      t0 *= t0;
      n += t0 * t0 * (g[0] * x0 + g[1] * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      const g = GRAD[permMod8[ii + i1 + perm[jj + j1]!]!]!;
      t1 *= t1;
      n += t1 * t1 * (g[0] * x1 + g[1] * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) {
      const g = GRAD[permMod8[ii + 1 + perm[jj + 1]!]!]!;
      t2 *= t2;
      n += t2 * t2 * (g[0] * x2 + g[1] * y2);
    }
    return 70 * n; // aprox. en [-1, 1]
  };
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
