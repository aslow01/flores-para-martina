/**
 * Pétalos sueltos: la lluvia del cierre y la ráfaga del huevo de pascua.
 * Sprites pre-renderizados, deriva con ruido, rotación en dos ejes simulada.
 */
import { crearRng, crearRuido, type RNG } from './noise';
import { petaloPath, ajustar } from './flora';

interface Petalo {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  giro: number; // "volteo" (escala en x) para simular un pétalo girando en 3D
  vgiro: number;
  sprite: HTMLCanvasElement;
  tam: number;
  fase: number;
  vida: number; // 1 = vivo; baja solo en la ráfaga
  rafaga: boolean;
}

export interface Petalos {
  lluvia(activa: boolean): void;
  rafaga(x: number, y: number, cantidad?: number): void;
  destruir(): void;
}

const COLORES = ['#ffd35a', '#f1b52b', '#e6a51c', '#d8940c', '#f7c23c'];

function spritePetalo(rng: RNG, dpr: number): { c: HTMLCanvasElement; tam: number } {
  const tam = rng.entre(14, 26);
  const c = document.createElement('canvas');
  c.width = Math.ceil(tam * dpr);
  c.height = Math.ceil(tam * dpr);
  const ctx = c.getContext('2d');
  if (!ctx) return { c, tam };
  ctx.scale(dpr, dpr);
  ctx.translate(tam * 0.08, tam / 2);
  const color = rng.elegir(COLORES);
  const base = ajustar(color, -0.28);
  const g = ctx.createLinearGradient(0, 0, tam * 0.84, 0);
  g.addColorStop(0, base);
  g.addColorStop(1, ajustar(color, 0.12));
  ctx.fillStyle = g;
  ctx.fill(new Path2D(petaloPath(tam * 0.84, tam * 0.2 * rng.entre(0.8, 1.2), rng.entre(0, 0.6), rng.entre(-0.4, 0.4))));
  return { c, tam };
}

export function crearPetalos(canvas: HTMLCanvasElement, semilla: number, reduce: boolean): Petalos {
  const ctx0 = canvas.getContext('2d');
  if (!ctx0) return { lluvia() {}, rafaga() {}, destruir() {} };
  const ctx: CanvasRenderingContext2D = ctx0;
  const rng = crearRng(semilla);
  const ruido = crearRuido(semilla + 77);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const sprites = Array.from({ length: 10 }, () => spritePetalo(rng, dpr));

  let W = 0;
  let H = 0;
  let petalos: Petalo[] = [];
  let lluviaActiva = false;
  let raf = 0;
  let corriendo = false;
  let destruido = false;
  let visible = true;
  let ultimo = 0;

  function medir(): void {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }

  function nuevoDeLluvia(): Petalo {
    const s = rng.elegir(sprites);
    return {
      x: rng() * W,
      y: -30 - rng() * H * 0.5,
      vx: 0,
      vy: rng.entre(28, 60),
      rot: rng() * Math.PI * 2,
      vrot: rng.entre(-1.2, 1.2),
      giro: rng() * Math.PI * 2,
      vgiro: rng.entre(1.5, 3.5),
      sprite: s.c,
      tam: s.tam,
      fase: rng() * 100,
      vida: 1,
      rafaga: false,
    };
  }

  function cantidadLluvia(): number {
    return Math.round(Math.min(46, Math.max(16, (W * H) / 26000)));
  }

  function paso(dt: number, t: number): void {
    const viento = ruido(t * 0.08, 1.5) * 40;
    for (const p of petalos) {
      const deriva = ruido(p.x * 0.004 + p.fase, t * 0.4) * 55;
      if (p.rafaga) {
        p.vx *= 0.96;
        p.vy = p.vy * 0.96 + 34 * dt;
        p.vida -= dt * 0.45;
      }
      p.x += (p.vx + viento + deriva) * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
      p.giro += p.vgiro * dt;
    }
    petalos = petalos.filter((p) => p.vida > 0 && p.y < H + 40);
    if (lluviaActiva) {
      const n = cantidadLluvia();
      const vivos = petalos.filter((p) => !p.rafaga).length;
      for (let i = vivos; i < n; i++) petalos.push(nuevoDeLluvia());
    }
  }

  function dibujar(): void {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (const p of petalos) {
      const sx = 0.35 + 0.65 * Math.abs(Math.cos(p.giro));
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.vida) * 0.95;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(sx, 1);
      ctx.drawImage(p.sprite, -p.tam / 2, -p.tam / 2, p.tam, p.tam);
      ctx.restore();
    }
  }

  function cuadro(ts: number): void {
    if (destruido) return;
    if (!lluviaActiva && petalos.length === 0) {
      corriendo = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    raf = requestAnimationFrame(cuadro);
    if (!visible || document.hidden) {
      ultimo = ts;
      return;
    }
    const dt = Math.min(0.05, (ts - ultimo) / 1000 || 0.016);
    ultimo = ts;
    paso(dt, ts / 1000);
    dibujar();
  }

  function arrancar(): void {
    if (corriendo || destruido) return;
    corriendo = true;
    ultimo = performance.now();
    raf = requestAnimationFrame(cuadro);
  }

  const ro = new ResizeObserver(medir);
  ro.observe(canvas);
  medir();
  const io = new IntersectionObserver((es) => {
    for (const e of es) visible = e.isIntersecting;
  });
  io.observe(canvas);

  return {
    lluvia(activa) {
      if (reduce) {
        // Versión quieta: un puñado de pétalos apoyados, sin animación.
        if (activa && petalos.length === 0) {
          for (let i = 0; i < cantidadLluvia(); i++) {
            const p = nuevoDeLluvia();
            p.y = rng() * H;
            petalos.push(p);
          }
          dibujar();
        }
        return;
      }
      lluviaActiva = activa;
      if (activa) arrancar();
    },
    rafaga(x, y, cantidad = 70) {
      if (reduce) return;
      const r = canvas.getBoundingClientRect();
      for (let i = 0; i < cantidad; i++) {
        const p = nuevoDeLluvia();
        const a = rng() * Math.PI * 2;
        const v = rng.entre(140, 520);
        p.x = x - r.left;
        p.y = y - r.top;
        p.vx = Math.cos(a) * v;
        p.vy = Math.sin(a) * v - 120;
        p.vrot = rng.entre(-6, 6);
        p.vida = rng.entre(1.6, 2.6);
        p.rafaga = true;
        petalos.push(p);
      }
      arrancar();
    },
    destruir() {
      destruido = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    },
  };
}
