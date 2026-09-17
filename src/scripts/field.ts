/**
 * El campo de la portada: flores procedurales en canvas, tres planos, viento
 * con ruido simplex y reacción al puntero. Las cabezas se pre-renderizan a
 * sprites; por cuadro solo se dibujan tallos, hojas y transformaciones.
 */
import { crearRng, crearRuido, clamp, type RNG } from './noise';
import { crearFlor, crearSprite, hojaPath, mezclar, PALETA, type Especie, type Flor } from './flora';

interface Planta {
  capa: 0 | 1 | 2;
  x: number; // 0..1 del ancho
  suelo: number; // 0..1 del alto (línea de base)
  alto: number; // fracción del alto del canvas
  radio: number; // px CSS del sprite (radio de la cabeza)
  spriteKey: string;
  sprite: HTMLCanvasElement | null; // se crea en ratos libres (ver prepararSprites)
  spriteTam: number;
  fase: number;
  viento: number; // sensibilidad
  inclina: number; // inclinación fija
  hojas: { t: number; lado: 1 | -1; l: number; w: number; path: Path2D }[];
  retraso: number; // para el crecimiento
  lean: number;
  leanV: number;
}

interface Brizna {
  x: number;
  alto: number;
  curva: number;
  fase: number;
  color: string;
}

export interface Campo {
  crecer(): void;
  puntero(x: number | null, y: number | null): void;
  destruir(): void;
}

const CAPAS = [
  { suelo: [0.7, 0.8], alto: [0.18, 0.3], radio: [7, 12], tallo: 1.1, desaturar: 0.38, lean: 0.35, viento: 0.7 },
  { suelo: [0.84, 0.94], alto: [0.28, 0.44], radio: [12, 20], tallo: 1.6, desaturar: 0.14, lean: 0.7, viento: 0.9 },
  { suelo: [0.98, 1.06], alto: [0.4, 0.56], radio: [20, 34], tallo: 2.3, desaturar: 0, lean: 1, viento: 1 },
] as const;

const ESPECIES_PESO: readonly [Especie, number][] = [
  ['margarita', 0.42],
  ['girasol', 0.16],
  ['ranunculo', 0.24],
  ['boton', 0.18],
];

function elegirEspecie(rng: RNG): Especie {
  let r = rng();
  for (const [e, p] of ESPECIES_PESO) {
    if ((r -= p) <= 0) return e;
  }
  return 'margarita';
}

export function crearCampo(
  canvas: HTMLCanvasElement,
  opciones: { semilla: number; reduce: boolean; crecerAlInicio?: boolean },
): Campo {
  const ctx0 = canvas.getContext('2d', { alpha: true });
  if (!ctx0) {
    return { crecer() {}, puntero() {}, destruir() {} };
  }
  const ctx: CanvasRenderingContext2D = ctx0;
  const ruido = crearRuido(opciones.semilla ^ 0x9e3779b9);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let W = 0;
  let H = 0;
  let plantas: Planta[] = [];
  let briznas: Brizna[] = [];
  let px: number | null = null;
  let py: number | null = null;
  let visible = true;
  let raf = 0;
  let inicioCrecer = -1; // ms; -1 = todavía no crece
  let ultimo = 0;
  let destruido = false;
  let costoCuadro = 0; // ms promedio que tarda dibujar; si sube, bajamos a 30 fps
  let cuadroPar = false;

  // Colores por capa, calculados una sola vez (mezclar() parsea strings: no va en el cuadro).
  const colores = CAPAS.map((c) => ({
    tallo: mezclar(PALETA.stem, PALETA.paper, c.desaturar),
    hoja: mezclar(PALETA.leaf, PALETA.paper, c.desaturar),
    hojaOscura: mezclar(PALETA.leafDark, PALETA.paper, c.desaturar),
  }));

  // Sprites: por especie, variante y tamaño; se crean de a pocos en ratos libres
  // para no trabar el hilo principal al cargar (un teléfono lento lo agradece).
  const spriteCache = new Map<string, HTMLCanvasElement>();
  const modelos = new Map<string, Flor>();
  const pendientes = new Map<string, { especie: Especie; variante: number; tam: number; desaturar: number }>();
  let preparando = false;

  function crearSpriteDe(p: { especie: Especie; variante: number; tam: number; desaturar: number }): HTMLCanvasElement {
    const mkey = `${p.especie}:${p.variante}`;
    let flor = modelos.get(mkey);
    if (!flor) {
      flor = crearFlor(crearRng(opciones.semilla + p.variante * 7919 + p.especie.length * 131), p.especie);
      modelos.set(mkey, flor);
    }
    return crearSprite(flor, p.tam, dpr, p.desaturar);
  }

  function prepararSprites(): void {
    if (preparando) return;
    preparando = true;
    const idle: (cb: () => void) => void =
      'requestIdleCallback' in window ? (cb) => window.requestIdleCallback(cb, { timeout: 120 }) : (cb) => setTimeout(cb, 16);
    const paso = () => {
      if (destruido) return;
      let hechos = 0;
      for (const [key, p] of pendientes) {
        spriteCache.set(key, crearSpriteDe(p));
        pendientes.delete(key);
        if (++hechos >= 3) break;
      }
      for (const pl of plantas) if (!pl.sprite) pl.sprite = spriteCache.get(pl.spriteKey) ?? null;
      if (pendientes.size > 0) idle(paso);
      else {
        preparando = false;
        if (opciones.reduce) dibujar(0, 1);
      }
    };
    idle(paso);
  }

  function plantar(): void {
    const rng = crearRng(opciones.semilla);
    plantas = [];
    briznas = [];
    const escala = clamp(W / 1200, 0.55, 1.3); // en pantallas chicas, menos y más chicas
    const cantidad = [Math.round(34 * escala), Math.round(24 * escala), Math.round(14 * escala)] as const;

    CAPAS.forEach((capa, ci) => {
      const n = cantidad[ci]!;
      for (let i = 0; i < n; i++) {
        // Distribución: estratificada en x para que no queden huecos, con jitter.
        const x = clamp((i + rng.entre(0.1, 0.9)) / n, 0.01, 0.99);
        const especie = elegirEspecie(rng);
        const radioBase = rng.entre(capa.radio[0], capa.radio[1]) * clamp(escala, 0.75, 1.1);
        const variante = rng.entero(0, 5);
        // Tamaños cuantizados: menos sprites distintos que renderizar al arrancar.
        const tam = Math.ceil((radioBase * 2.2) / 8) * 8;
        const hojasN = rng.entero(1, 2);
        const hojas: Planta['hojas'] = [];
        for (let h = 0; h < hojasN; h++) {
          const l = radioBase * rng.entre(1.1, 1.9);
          const w = l * rng.entre(0.22, 0.3);
          hojas.push({ t: rng.entre(0.32, 0.72), lado: rng() > 0.5 ? 1 : -1, l, w, path: new Path2D(hojaPath(l, w)) });
        }
        const spriteKey = `${especie}:${variante}:${tam}:${capa.desaturar}`;
        const sprite = spriteCache.get(spriteKey) ?? null;
        if (!sprite && !pendientes.has(spriteKey)) pendientes.set(spriteKey, { especie, variante, tam, desaturar: capa.desaturar });
        plantas.push({
          capa: ci as 0 | 1 | 2,
          x,
          suelo: rng.entre(capa.suelo[0], capa.suelo[1]),
          alto: rng.entre(capa.alto[0], capa.alto[1]),
          radio: radioBase,
          spriteKey,
          sprite,
          spriteTam: tam,
          fase: rng() * 100,
          viento: capa.viento * rng.entre(0.8, 1.2),
          inclina: rng.entre(-0.12, 0.12),
          hojas,
          retraso: 0,
          lean: 0,
          leanV: 0,
        });
      }
    });

    // El crecimiento arranca del centro hacia los bordes, y de atrás hacia adelante.
    for (const p of plantas) {
      p.retraso = Math.abs(p.x - 0.5) * 900 + p.capa * 220 + rng.entre(0, 260);
    }

    const nb = Math.round(90 * escala);
    for (let i = 0; i < nb; i++) {
      briznas.push({
        x: rng(),
        alto: rng.entre(0.06, 0.16),
        curva: rng.entre(-0.5, 0.5),
        fase: rng() * 10,
        color: mezclar(PALETA.stem, PALETA.leaf, rng()),
      });
    }
    if (pendientes.size > 0) prepararSprites();
  }

  function redimensionar(): void {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    if (w === W && h === H) return;
    W = w;
    H = h;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    plantar();
    if (opciones.reduce && pendientes.size === 0) dibujar(0, 1);
  }

  /** Curva de crecimiento con un pequeño rebote, como una planta que se endereza. */
  function crecimiento(p: Planta, t: number): number {
    if (opciones.reduce) return 1;
    if (inicioCrecer < 0) return 0;
    const u = clamp((t - inicioCrecer - p.retraso) / 1500, 0, 1);
    if (u <= 0) return 0;
    const c1 = 1.2;
    const c3 = c1 + 1;
    const x = u - 1;
    return 1 + c3 * x * x * x + c1 * x * x; // easeOutBack suave
  }

  function puntoTallo(bx: number, by: number, ex: number, ey: number, cx: number, cy: number, t: number): [number, number] {
    const mt = 1 - t;
    return [mt * mt * bx + 2 * mt * t * cx + t * t * ex, mt * mt * by + 2 * mt * t * cy + t * t * ey];
  }

  function dibujar(tMs: number, fuerzaCrecimiento?: number): void {
    const t = tMs / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Ráfaga global lenta + detalle local por planta.
    const rafaga = 1 + 0.4 * ruido(t * 0.06, 3.7);

    // Briznas de pasto, al fondo.
    ctx.lineCap = 'round';
    for (const b of briznas) {
      const bx = b.x * W;
      const alto = b.alto * H;
      const v = (ruido(b.x * 6 + 20, t * 0.35) * 0.5 + b.curva) * alto * 0.5 * rafaga;
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(bx, H + 2);
      ctx.quadraticCurveTo(bx + v * 0.4, H - alto * 0.6, bx + v, H - alto);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (let ci = 0; ci < 3; ci++) {
      const capa = CAPAS[ci]!;
      for (const p of plantas) {
        if (p.capa !== ci) continue;
        const g = fuerzaCrecimiento ?? crecimiento(p, tMs);
        if (g <= 0.001 || !p.sprite) continue;

        const bx = p.x * W;
        const by = p.suelo * H;
        const alto = p.alto * H * g;

        // Viento: dos octavas de ruido, la planta oscila alrededor de su inclinación.
        const viento =
          (ruido(p.x * 1.6 + ci * 0.31, t * 0.13 + p.fase) * 0.62 + ruido(p.x * 5 + 40, t * 0.42 + p.fase) * 0.18) *
          0.22 *
          p.viento *
          rafaga;

        // Puntero: la planta se aparta con un resorte.
        let objetivo = 0;
        if (px !== null && py !== null) {
          const mx = bx;
          const my = by - alto * 0.65;
          const dx = mx - px;
          const dy = my - py;
          const d = Math.hypot(dx, dy);
          const R = 150 + p.radio * 2;
          if (d < R) {
            const f = 1 - d / R;
            objetivo = Math.sign(dx || 1) * f * f * 0.55 * capa.lean;
          }
        }
        p.leanV += (objetivo - p.lean) * 0.075;
        p.leanV *= 0.84;
        p.lean += p.leanV;

        const ang = p.inclina + viento + p.lean;
        const ex = bx + Math.sin(ang) * alto;
        const ey = by - Math.cos(ang * 0.55) * alto;
        const cx = bx + Math.sin(ang) * alto * 0.25;
        const cy = by - alto * 0.55;

        // Tallo
        const col = colores[ci]!;
        ctx.strokeStyle = col.tallo;
        ctx.lineWidth = capa.tallo * (0.6 + 0.4 * g);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(cx, cy, ex, ey);
        ctx.stroke();

        // Hojas
        for (const h of p.hojas) {
          const [hx, hy] = puntoTallo(bx, by, ex, ey, cx, cy, h.t);
          const [tx, ty] = puntoTallo(bx, by, ex, ey, cx, cy, h.t + 0.05);
          const tangente = Math.atan2(ty - hy, tx - hx);
          ctx.save();
          ctx.translate(hx, hy);
          ctx.rotate(tangente + h.lado * (0.9 + viento * 1.5));
          ctx.scale(g, g);
          ctx.fillStyle = h.lado > 0 ? col.hoja : col.hojaOscura;
          ctx.fill(h.path);
          ctx.restore();
        }

        // Cabeza
        const s = p.spriteTam;
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(ang * 0.9 + p.inclina);
        ctx.scale(g, g);
        ctx.drawImage(p.sprite, -s / 2, -s / 2, s, s);
        ctx.restore();
      }
    }
  }

  function cuadro(ts: number): void {
    if (destruido) return;
    raf = requestAnimationFrame(cuadro);
    if (!visible || document.hidden) return;
    // Limita a ~60 fps reales aunque la pantalla sea de 120; si dibujar cuesta caro
    // (teléfono lento), baja a 30 fps antes que trabar el scroll.
    cuadroPar = !cuadroPar;
    if (costoCuadro > 9 && cuadroPar) return;
    if (ts - ultimo < 15) return;
    ultimo = ts;
    const t0 = performance.now();
    dibujar(ts);
    costoCuadro = costoCuadro * 0.9 + (performance.now() - t0) * 0.1;
  }

  const ro = new ResizeObserver(() => redimensionar());
  ro.observe(canvas);
  redimensionar();

  const io = new IntersectionObserver((entradas) => {
    for (const e of entradas) visible = e.isIntersecting;
  });
  io.observe(canvas);

  if (!opciones.reduce) {
    raf = requestAnimationFrame(cuadro);
    if (opciones.crecerAlInicio) inicioCrecer = performance.now();
  }

  return {
    crecer() {
      if (inicioCrecer < 0) inicioCrecer = performance.now();
    },
    puntero(x, y) {
      if (x === null || y === null) {
        px = null;
        py = null;
        return;
      }
      const r = canvas.getBoundingClientRect();
      px = x - r.left;
      py = y - r.top;
    },
    destruir() {
      destruido = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    },
  };
}

