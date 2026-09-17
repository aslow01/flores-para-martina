/**
 * Orquesta la página: intro, campo, ramo, carta, contador, pétalos y huevos.
 * Cada pieza es independiente y tolera que su elemento no exista.
 */
import { gsap, ScrollTrigger, reduce, iniciarScroll, revelar, scrollA, EASE } from './motion';
import { semillaDe } from './noise';
import { crearCampo } from './field';
import { crearPetalos } from './petals';
import { correrIntro, introYaVista } from './intro';
import { crearRamo, type Ramo } from './bouquet';
import { iniciarCarta } from './letter';
import { iniciarContador } from './counter';
import { iniciarHuevos } from './eggs';
import { persona, fecha, contador as textosContador, huevos } from '../content/martina';

const html = document.documentElement;
const params = new URLSearchParams(location.search);
const modoOg = params.has('og'); // para generar la imagen de vista previa
const semilla = semillaDe(`${persona.ella} ${persona.apellido}`);
if (modoOg) html.classList.add('og');

// Avisa al paracaídas de Base.astro que el JS llegó bien.
html.classList.add('listo');

iniciarScroll();

/* ---------- Intro: ¿se muestra? ---------- */
const introEl = document.querySelector<HTMLElement>('.intro');
const conIntro = !!introEl && !modoOg && !reduce && !introYaVista();
// Solo si la intro va a tapar la portada tiene sentido esconder el titular para revelarlo después.
if (conIntro) html.classList.add('con-intro');

/* ---------- Portada: el campo ---------- */
const canvasCampo = document.querySelector<HTMLCanvasElement>('.portada__campo');
const campo = canvasCampo ? crearCampo(canvasCampo, { semilla, reduce: reduce || modoOg, crecerAlInicio: !conIntro }) : null;
if (campo && !reduce) {
  window.addEventListener('pointermove', (e) => campo.puntero(e.clientX, e.clientY), { passive: true });
  window.addEventListener('pointerleave', () => campo.puntero(null, null));
  window.addEventListener('blur', () => campo.puntero(null, null));
}

function entradaPortada(): void {
  if (!conIntro) return; // ya está todo visible
  const portada = document.querySelector<HTMLElement>('.portada');
  if (!portada) return;
  const lineas = portada.querySelectorAll<HTMLElement>('.portada__linea > span');
  const resto = portada.querySelectorAll<HTMLElement>('[data-portada]');
  const tl = gsap.timeline({ delay: 0.15 });
  tl.fromTo(lineas, { yPercent: 108, visibility: 'visible' }, { yPercent: 0, duration: 1.35, ease: EASE, stagger: 0.11 }, 0).fromTo(
    resto,
    { opacity: 0, y: 18 },
    { opacity: 1, y: 0, duration: 1.1, ease: EASE, stagger: 0.09 },
    0.45,
  );
}

correrIntro(introEl, {
  saltar: !conIntro,
  alLevantar: () => {
    campo?.crecer();
    entradaPortada();
  },
}).then(() => ScrollTrigger.refresh());

/* ---------- Revelados ---------- */
(document.fonts?.ready ?? Promise.resolve()).then(() => {
  revelar();
  ScrollTrigger.refresh();
});

if (!reduce) {
  // El campo se hunde despacio al scrollear; el titular, un poco menos. Profundidad sin estridencia.
  gsap.to('.portada__campo-wrap', {
    yPercent: 14,
    ease: 'none',
    scrollTrigger: { trigger: '.portada', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('.portada__texto', {
    yPercent: -8,
    opacity: 0.25,
    ease: 'none',
    scrollTrigger: { trigger: '.portada', start: '30% top', end: 'bottom top', scrub: true },
  });
  gsap.to('.tradicion__numero', {
    yPercent: -12,
    ease: 'none',
    scrollTrigger: { trigger: '.tradicion', start: 'top bottom', end: 'bottom top', scrub: true },
  });
}

/* ---------- Navegación interna ---------- */
document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const destino = a.getAttribute('href');
    if (!destino || destino === '#' || !document.querySelector(destino)) return;
    e.preventDefault();
    scrollA(destino, Number(a.dataset.scroll || 0));
  });
});

/* ---------- Ramo (se construye cuando se acerca a la pantalla) ---------- */
const ramoEl = document.querySelector<HTMLElement>('.ramo');
let ramo: Ramo | null = null;
if (ramoEl) {
  const construir = () => {
    if (ramo) return;
    ramo = crearRamo(ramoEl, semilla + 21);
    ScrollTrigger.refresh();
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          construir();
          io.disconnect();
        }
      },
      { rootMargin: '120% 0px' },
    );
    io.observe(ramoEl);
  } else {
    construir();
  }
}

document.querySelector<HTMLButtonElement>('.cierre__volver')?.addEventListener('click', () => {
  ramo?.cerrar();
  scrollA('#ramo', -24);
});

/* ---------- Carta ---------- */
const cartaEl = document.querySelector<HTMLElement>('.carta');
if (cartaEl) iniciarCarta(cartaEl);

/* ---------- Contador ---------- */
const contadorEl = document.querySelector<HTMLElement>('.contador');
if (contadorEl) iniciarContador(contadorEl, { iso: fecha.iso, zona: fecha.zona, textos: textosContador });

/* ---------- Pétalos del cierre ---------- */
const canvasCierre = document.querySelector<HTMLCanvasElement>('.cierre__petalos');
if (canvasCierre) {
  const lluvia = crearPetalos(canvasCierre, semilla + 2, reduce);
  ScrollTrigger.create({
    trigger: canvasCierre,
    start: 'top bottom',
    end: 'bottom top',
    onEnter: () => lluvia.lluvia(true),
    onEnterBack: () => lluvia.lluvia(true),
    onLeave: () => lluvia.lluvia(false),
    onLeaveBack: () => lluvia.lluvia(false),
  });
}

/* ---------- Huevos de pascua ---------- */
const canvasRafaga = document.querySelector<HTMLCanvasElement>('.rafaga');
const toast = document.querySelector<HTMLElement>('.toast__texto');
if (canvasRafaga && toast) {
  const rafaga = crearPetalos(canvasRafaga, semilla + 3, reduce);
  let ocultar: gsap.core.Tween | null = null;
  const campoPd = document.querySelector<HTMLInputElement>('.pd__campo');
  iniciarHuevos(
    { ...huevos },
    (texto) => {
      rafaga.rafaga(window.innerWidth / 2, window.innerHeight * 0.55, 90);
      toast.textContent = texto;
      ocultar?.kill();
      gsap.fromTo(toast, { opacity: 0, y: 24, rotation: -5 }, { opacity: 1, y: 0, rotation: -1.5, duration: 0.8, ease: EASE });
      ocultar = gsap.to(toast, { opacity: 0, y: -10, duration: 0.6, delay: 2.6, ease: 'power2.in' });
      if (campoPd) campoPd.value = '';
    },
    campoPd,
  );
}
