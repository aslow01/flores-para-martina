/**
 * El ramo: 21 flores SVG procedurales, papel kraft, cinta azul y una tarjeta.
 * Se abre tirando de la cinta (Draggable) o con el botón (teclado, lectores).
 */
import { gsap, Draggable, ScrollTrigger, reduce } from './motion';
import { crearRng } from './noise';
import { crearFlor, florSVG, hojaPath, mezclar, PALETA, type Especie } from './flora';

const VB_W = 600;
const VB_H = 800;
const BASE = { x: 300, y: 690 };
const PAPEL_TOP = 218;

interface Cabeza {
  x: number;
  y: number;
  r: number;
  fila: number;
  especie: Especie;
}

export interface Ramo {
  abrir(): void;
  cerrar(): void;
  abierto(): boolean;
}

function f(n: number): string {
  return n.toFixed(1);
}

function distribuirCabezas(rng: ReturnType<typeof crearRng>): Cabeza[] {
  const filas = [
    { n: 8, rx: 205, ry: 118, cy: 318, r: [30, 36] },
    { n: 7, rx: 160, ry: 86, cy: 336, r: [34, 41] },
    { n: 6, rx: 108, ry: 48, cy: 352, r: [40, 48] },
  ] as const;
  const especies: Especie[] = [];
  const mezcla: [Especie, number][] = [
    ['margarita', 8],
    ['ranunculo', 5],
    ['girasol', 4],
    ['boton', 4],
  ];
  for (const [e, n] of mezcla) for (let i = 0; i < n; i++) especies.push(e);
  // Barajar con semilla
  for (let i = especies.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = especies[i]!;
    especies[i] = especies[j]!;
    especies[j] = t;
  }
  const cabezas: Cabeza[] = [];
  let k = 0;
  filas.forEach((fila, fi) => {
    for (let i = 0; i < fila.n; i++) {
      const t = (i + 0.5) / fila.n;
      const ang = Math.PI * (0.1 + 0.8 * t);
      cabezas.push({
        x: 300 + Math.cos(ang) * fila.rx + rng.entre(-10, 10),
        y: fila.cy - Math.sin(ang) * fila.ry + rng.entre(-9, 9),
        r: rng.entre(fila.r[0], fila.r[1]),
        fila: fi,
        especie: especies[k++ % especies.length]!,
      });
    }
  });
  return cabezas;
}

export function crearRamo(raiz: HTMLElement, semilla: number, alAbrir?: () => void): Ramo {
  const svg = raiz.querySelector<SVGSVGElement>('.ramo__svg');
  const handle = raiz.querySelector<HTMLElement>('.ramo__handle');
  const botonAbrir = raiz.querySelector<HTMLButtonElement>('.ramo__abrir');
  const tag = raiz.querySelector<HTMLElement>('.ramo__tag');
  if (!svg || !handle || !botonAbrir || !tag) {
    return { abrir() {}, cerrar() {}, abierto: () => false };
  }

  const rng = crearRng(semilla);
  const cabezas = distribuirCabezas(rng);

  /* ---------- Construcción del SVG ---------- */
  let defs = `
    <filter id="kraft" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.9 0.35" numOctaves="3" seed="4" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.62  0 0 0 0 0.5  0 0 0 0 0.32  0 0 0 0.22 0" result="grano"/>
      <feBlend in="SourceGraphic" in2="grano" mode="multiply" result="mezcla"/>
      <feComposite in="mezcla" in2="SourceGraphic" operator="in"/>
    </filter>
    <filter id="sombra-suave" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="9"/></filter>
    <linearGradient id="kraft-izq" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b58c55"/><stop offset="0.6" stop-color="#cba874"/><stop offset="1" stop-color="#b8905a"/></linearGradient>
    <linearGradient id="kraft-der" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c39f68"/><stop offset="0.5" stop-color="#d3b17f"/><stop offset="1" stop-color="#ad8450"/></linearGradient>
    <linearGradient id="kraft-fondo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9c7745"/><stop offset="1" stop-color="#7d5d33"/></linearGradient>
    <linearGradient id="cinta" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4d8f"/><stop offset="0.5" stop-color="#22305c"/><stop offset="1" stop-color="#17223f"/></linearGradient>
    <linearGradient id="cinta-lazo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a5da3"/><stop offset="1" stop-color="#1c2749"/></linearGradient>
  `;

  // Sombra en el suelo
  let cuerpo = `<ellipse class="ramo__sombra" cx="300" cy="712" rx="150" ry="16" fill="#1d1a16" opacity="0.16" filter="url(#sombra-suave)"/>`;

  // Tallos y hojas (se ven cuando se abre el papel)
  let tallos = '';
  cabezas.forEach((c) => {
    const cx = BASE.x + (c.x - BASE.x) * 0.38;
    const cy = 575 + (c.y - 575) * 0.25;
    const ancho = 3.4 + c.fila * 0.5;
    tallos += `<path d="M${f(BASE.x)} ${f(BASE.y)}Q${f(cx)} ${f(cy)} ${f(c.x)} ${f(c.y)}" fill="none" stroke="${mezclar(PALETA.stem, PALETA.leafDark, rng() * 0.6)}" stroke-width="${f(ancho)}" stroke-linecap="round"/>`;
    // Hojas: en el tramo visible, apuntando afuera
    const nh = rng.entero(1, 2);
    for (let h = 0; h < nh; h++) {
      const t = rng.entre(0.42, 0.7);
      const mt = 1 - t;
      const hx = mt * mt * BASE.x + 2 * mt * t * cx + t * t * c.x;
      const hy = mt * mt * BASE.y + 2 * mt * t * cy + t * t * c.y;
      const l = rng.entre(38, 62);
      const w = l * rng.entre(0.24, 0.32);
      const lado = c.x < 300 ? -1 : 1;
      const rot = -90 + lado * rng.entre(48, 70);
      tallos += `<path d="${hojaPath(l, w)}" transform="translate(${f(hx)} ${f(hy)}) rotate(${f(rot)})" fill="${rng() > 0.5 ? PALETA.leaf : PALETA.leafDark}" opacity="0.95"/>`;
    }
  });
  cuerpo += `<g class="ramo__tallos" opacity="0">${tallos}</g>`;

  // Hilo de yute que ata los tallos cuando se saca el papel
  cuerpo += `<g class="ramo__yute" opacity="0">
    <path d="M262 606 Q300 596 338 606 Q300 620 262 606Z" fill="#b8975f"/>
    <path d="M262 612 Q300 602 338 612" fill="none" stroke="#8f6b3b" stroke-width="2"/>
    <path d="M300 612 q-6 14 -2 22 q4 -8 8 -20" fill="none" stroke="#8f6b3b" stroke-width="2" stroke-linecap="round"/>
  </g>`;

  // Papel de fondo: la cara interna del cono, detrás de las flores
  cuerpo += `<g class="ramo__papel ramo__papel--fondo" filter="url(#kraft)">
    <path d="M116 ${PAPEL_TOP - 80} C200 ${PAPEL_TOP - 104} 400 ${PAPEL_TOP - 100} 484 ${PAPEL_TOP - 78} L336 698 L264 698 Z" fill="url(#kraft-fondo)"/>
  </g>`;

  // Cabezas, de atrás hacia adelante
  let cabezasSvg = '';
  const modelos = new Map<string, ReturnType<typeof crearFlor>>();
  [...cabezas]
    .sort((a, b) => a.fila - b.fila || a.y - b.y)
    .forEach((c, i) => {
      const key = `${c.especie}-${i % 4}`;
      let flor = modelos.get(key);
      if (!flor) {
        flor = crearFlor(crearRng(rng.hijo()), c.especie);
        modelos.set(key, flor);
      }
      const { g, defs: d } = florSVG(flor, c.r, 'flor', 'r');
      defs += d;
      cabezasSvg += `<g class="cabeza" data-i="${i}" data-x="${f(c.x)}" data-y="${f(c.y)}" transform="translate(${f(c.x)} ${f(c.y)})">${g}</g>`;
    });
  cuerpo += `<g class="ramo__cabezas">${cabezasSvg}</g>`;

  // Papel kraft: dos paneles que se abren desde la base
  const bordeIzq = `M100 ${PAPEL_TOP + 8} C150 ${PAPEL_TOP - 6} 230 ${PAPEL_TOP + 10} 326 ${PAPEL_TOP - 4}`;
  const bordeDer = `M500 ${PAPEL_TOP + 8} C452 ${PAPEL_TOP - 14} 372 ${PAPEL_TOP + 18} 274 ${PAPEL_TOP + 2}`;
  cuerpo += `
    <g class="ramo__papel ramo__papel--izq" filter="url(#kraft)">
      <path d="${bordeIzq} L338 700 L262 700 Z" fill="url(#kraft-izq)"/>
      <path d="${bordeIzq} C300 ${PAPEL_TOP + 22} 200 ${PAPEL_TOP + 26} 100 ${PAPEL_TOP + 8} Z" fill="#d9b889" opacity="0.9"/>
      <path d="M150 ${PAPEL_TOP + 40} L286 690" stroke="#8f6b3b" stroke-opacity="0.35" stroke-width="1.5" fill="none"/>
      <path d="${bordeIzq}" stroke="#7a5a30" stroke-opacity="0.5" stroke-width="2" fill="none"/>
    </g>
    <g class="ramo__papel ramo__papel--der" filter="url(#kraft)">
      <path d="${bordeDer} L262 700 L338 700 Z" fill="url(#kraft-der)"/>
      <path d="${bordeDer} C300 ${PAPEL_TOP + 26} 400 ${PAPEL_TOP + 30} 500 ${PAPEL_TOP + 8} Z" fill="#dfc094" opacity="0.9"/>
      <path d="M446 ${PAPEL_TOP + 44} L318 690" stroke="#8f6b3b" stroke-opacity="0.3" stroke-width="1.5" fill="none"/>
      <path d="M274 ${PAPEL_TOP + 2} L262 700" stroke="#6b4c26" stroke-opacity="0.35" stroke-width="2" fill="none"/>
      <path d="${bordeDer}" stroke="#7a5a30" stroke-opacity="0.5" stroke-width="2" fill="none"/>
    </g>
  `;

  // Cinta azul: banda, colas, lazo, nudo
  const yB = 455;
  cuerpo += `
    <g class="ramo__cinta">
      <g class="cinta__banda">
        <path d="M176 ${yB - 4} Q300 ${yB + 26} 424 ${yB - 4} L420 ${yB + 20} Q300 ${yB + 50} 180 ${yB + 20} Z" fill="url(#cinta)"/>
        <path d="M176 ${yB - 4} Q300 ${yB + 26} 424 ${yB - 4}" fill="none" stroke="#5a6db5" stroke-opacity="0.5" stroke-width="1.5"/>
      </g>
      <g class="cinta__colas">
        <path d="M288 ${yB + 26} L262 ${yB + 128} L284 ${yB + 118} L298 ${yB + 134} L300 ${yB + 26} Z" fill="url(#cinta)"/>
        <path d="M312 ${yB + 26} L340 ${yB + 134} L322 ${yB + 120} L304 ${yB + 138} L300 ${yB + 26} Z" fill="#1c2749"/>
      </g>
      <g class="cinta__lazo">
        <path d="M296 ${yB + 18} C262 ${yB - 34} 208 ${yB - 10} 226 ${yB + 26} C238 ${yB + 50} 280 ${yB + 40} 296 ${yB + 18} Z" fill="url(#cinta-lazo)"/>
        <path d="M290 ${yB + 18} C270 ${yB - 6} 240 ${yB + 2} 244 ${yB + 22} C248 ${yB + 34} 274 ${yB + 30} 290 ${yB + 18} Z" fill="#141c36" opacity="0.7"/>
        <path d="M304 ${yB + 18} C338 ${yB - 34} 392 ${yB - 10} 374 ${yB + 26} C362 ${yB + 50} 320 ${yB + 40} 304 ${yB + 18} Z" fill="url(#cinta-lazo)"/>
        <path d="M310 ${yB + 18} C330 ${yB - 6} 360 ${yB + 2} 356 ${yB + 22} C352 ${yB + 34} 326 ${yB + 30} 310 ${yB + 18} Z" fill="#141c36" opacity="0.7"/>
        <path d="M272 ${yB - 4} C256 ${yB - 12} 236 ${yB - 6} 230 ${yB + 6}" fill="none" stroke="#6d80c4" stroke-opacity="0.45" stroke-width="2" stroke-linecap="round"/>
        <path d="M328 ${yB - 4} C344 ${yB - 12} 364 ${yB - 6} 370 ${yB + 6}" fill="none" stroke="#6d80c4" stroke-opacity="0.45" stroke-width="2" stroke-linecap="round"/>
      </g>
      <g class="cinta__nudo">
        <rect x="286" y="${yB + 6}" width="28" height="24" rx="7" fill="#17223f"/>
        <rect x="290" y="${yB + 10}" width="20" height="16" rx="5" fill="#2a3a6d"/>
      </g>
    </g>
  `;

  svg.setAttribute('viewBox', `0 0 ${VB_W} ${VB_H}`);
  svg.innerHTML = `<defs>${defs}</defs>${cuerpo}`;

  /* ---------- Estado inicial (cerrado) ---------- */
  const cabezasEl = Array.from(svg.querySelectorAll<SVGGElement>('.cabeza'));
  const papelIzq = svg.querySelector<SVGGElement>('.ramo__papel--izq')!;
  const papelFondo = svg.querySelector<SVGGElement>('.ramo__papel--fondo')!;
  const papelDer = svg.querySelector<SVGGElement>('.ramo__papel--der')!;
  const cinta = svg.querySelector<SVGGElement>('.ramo__cinta')!;
  const lazo = svg.querySelector<SVGGElement>('.cinta__lazo')!;
  const nudo = svg.querySelector<SVGGElement>('.cinta__nudo')!;
  const colas = svg.querySelector<SVGGElement>('.cinta__colas')!;
  const banda = svg.querySelector<SVGGElement>('.cinta__banda')!;
  const tallosEl = svg.querySelector<SVGGElement>('.ramo__tallos')!;
  const yute = svg.querySelector<SVGGElement>('.ramo__yute')!;
  const sombra = svg.querySelector<SVGEllipseElement>('.ramo__sombra')!;

  // Posición "apretada" de cada cabeza dentro del cono (coordenadas absolutas del viewBox).
  const cerradoDe = (el: SVGGElement) => {
    const x = Number(el.dataset.x);
    const y = Number(el.dataset.y);
    return {
      x: x + (300 - x) * 0.4,
      y: y + (PAPEL_TOP - 96 - y) * 0.6 + (Number(el.dataset.i) % 3) * 11,
      scale: 0.9,
      rotation: (300 - x) * 0.08,
      transformOrigin: '50% 50%',
    };
  };
  const abiertoDe = (el: SVGGElement) => ({
    x: Number(el.dataset.x),
    y: Number(el.dataset.y),
    scale: 1,
    rotation: 0,
  });
  cabezasEl.forEach((el) => gsap.set(el, cerradoDe(el)));
  // En SVG, el origen se da en coordenadas del viewBox (svgOrigin), no en px del elemento.
  gsap.set([papelIzq, papelDer, papelFondo], { svgOrigin: '300 700' });
  gsap.set(lazo, { svgOrigin: '300 470' });
  gsap.set(nudo, { svgOrigin: '300 473' });
  gsap.set(colas, { svgOrigin: '300 481' });
  gsap.set(tag, { opacity: 0, y: -40, rotation: -18, transformOrigin: '50% 0' });

  /* ---------- Desatar (progresivo, lo maneja el arrastre) ---------- */
  const tlDesatar = gsap.timeline({ paused: true });
  tlDesatar
    .to(lazo, { scale: 0.1, duration: 1, ease: 'none' }, 0)
    .to(nudo, { rotation: 28, y: 16, duration: 1, ease: 'none' }, 0)
    .to(colas, { scaleY: 1.75, duration: 1, ease: 'none' }, 0)
    .to(banda, { y: 12, duration: 1, ease: 'none' }, 0);

  const proxy = { p: 0 };
  const sincronizar = () => tlDesatar.progress(proxy.p);

  /* ---------- Abrir ---------- */
  let estado: 'cerrado' | 'abriendo' | 'abierto' = 'cerrado';
  let arrastre: Draggable | null = null;
  raiz.dataset.state = estado;
  const setEstado = (s: typeof estado) => {
    estado = s;
    raiz.dataset.state = s;
  };

  const volverACerrado = () => {
    setEstado('cerrado');
    raiz.classList.remove('ramo--revelado');
    proxy.p = 0;
    sincronizar();
    gsap.set(handle, { y: 0 });
    tlAbrir.timeScale(1);
    arrastre?.enable();
  };

  const tlAbrir = gsap.timeline({
    paused: true,
    onComplete: () => {
      setEstado('abierto');
      // El foco pasa al siguiente paso lógico: leer la tarjeta.
      raiz.querySelector<HTMLElement>('.ramo__leer')?.focus({ preventScroll: true });
    },
    onReverseComplete: volverACerrado,
  });
  tlAbrir
    .to(proxy, { p: 1, duration: 0.35, ease: 'power1.in', onUpdate: sincronizar }, 0)
    .to(cinta, { y: 150, rotation: 7, opacity: 0, duration: 0.6, ease: 'power2.in' }, 0.3)
    .to(papelIzq, { rotation: -36, x: -80, y: 30, opacity: 0, duration: 1.15, ease: 'power3.inOut' }, 0.55)
    .to(papelDer, { rotation: 36, x: 80, y: 30, opacity: 0, duration: 1.15, ease: 'power3.inOut' }, 0.68)
    .to(papelFondo, { y: 60, scaleY: 0.9, opacity: 0, duration: 1.0, ease: 'power3.inOut' }, 0.8)
    .to(sombra, { attr: { rx: 95 }, opacity: 0.11, duration: 1.2, ease: 'power2.inOut' }, 0.8)
    .to(tallosEl, { opacity: 1, duration: 0.5 }, 0.8)
    .to(yute, { opacity: 1, duration: 0.5 }, 1.1)
    .to(
      cabezasEl,
      {
        x: (_i: number, el: SVGGElement) => abiertoDe(el).x,
        y: (_i: number, el: SVGGElement) => abiertoDe(el).y,
        scale: 1,
        rotation: 0,
        duration: 1.7,
        ease: 'elastic.out(1, 0.55)',
        stagger: { each: 0.045, from: 'center' },
      },
      0.9,
    )
    .to(tag, { opacity: 1, y: 0, rotation: 0, duration: 1.5, ease: 'elastic.out(1, 0.42)' }, 1.5)
    .add(() => {
      if (tlAbrir.reversed()) return;
      raiz.classList.add('ramo--revelado');
      alAbrir?.();
    }, 1.2);

  function abrir(): void {
    if (estado !== 'cerrado') return;
    setEstado('abriendo');
    if (arrastre) arrastre.disable();
    if (reduce) {
      tlAbrir.progress(1);
      return;
    }
    tlAbrir.timeScale(1).play();
  }

  function cerrar(): void {
    if (estado !== 'abierto') return;
    setEstado('abriendo');
    raiz.classList.remove('ramo--revelado');
    if (reduce) {
      tlAbrir.pause(0);
      volverACerrado();
      return;
    }
    tlAbrir.timeScale(2.6).reverse();
  }

  /* ---------- Arrastre de la cinta ---------- */
  const RECORRIDO = 130;
  if (!reduce) {
    const cintaEl = svg.querySelector<SVGGElement>('.ramo__cinta');
    if (cintaEl) (cintaEl.style as CSSStyleDeclaration).cursor = 'grab';
    arrastre = Draggable.create(handle, {
      type: 'y',
      trigger: cintaEl ? [handle, cintaEl] : handle,
      bounds: { minY: 0, maxY: RECORRIDO },
      cursor: 'grab',
      activeCursor: 'grabbing',
      onDrag() {
        proxy.p = Math.min(1, Math.max(0, this.y / RECORRIDO));
        sincronizar();
      },
      onRelease() {
        if (proxy.p >= 0.55) {
          gsap.to(handle, { y: RECORRIDO, duration: 0.2, ease: 'power2.out' });
          abrir();
        } else {
          gsap.to(handle, { y: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' });
          gsap.to(proxy, { p: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)', onUpdate: sincronizar });
        }
      },
      onClick: () => tiron(),
    })[0] ?? null;

    // Al llegar a la sección, la cinta da un tironcito, una sola vez: invita sin explicar.
    ScrollTrigger.create({
      trigger: raiz,
      start: 'top 55%',
      once: true,
      onEnter: () => {
        if (estado === 'cerrado') gsap.delayedCall(0.7, tiron);
      },
    });
  }

  /** Un toque sin arrastre: la cinta "pide" que la tiren. */
  function tiron(): void {
    if (estado !== 'cerrado') return;
    gsap.fromTo(handle, { y: 0 }, { y: 18, duration: 0.5, ease: 'power2.inOut', yoyo: true, repeat: 1 });
    gsap.fromTo(proxy, { p: 0 }, { p: 0.14, duration: 0.5, ease: 'power2.inOut', yoyo: true, repeat: 1, onUpdate: sincronizar });
  }

  botonAbrir.addEventListener('click', abrir);

  // Con teclado: Enter/Espacio sobre la cinta también la desata.
  handle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      abrir();
    }
  });

  return {
    abrir,
    cerrar,
    abierto: () => estado === 'abierto',
  };
}

