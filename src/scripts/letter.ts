/**
 * La tarjeta: el saludo y la firma se "escriben", y la corrección del final
 * se tacha a mano dos veces antes de quedar como tiene que quedar.
 */
import { gsap, ScrollTrigger, reduce, EASE } from './motion';

export function iniciarCarta(raiz: HTMLElement): void {
  const corr = raiz.querySelector<HTMLElement>('.corr');
  if (!corr) return;

  const tacha1 = corr.querySelector<SVGPathElement>('.corr__tacha--1 path');
  const tacha2 = corr.querySelector<SVGPathElement>('.corr__tacha--2 path');
  const medio = corr.querySelector<HTMLElement>('.corr__mano--medio');
  const final = corr.querySelector<HTMLElement>('.corr__mano--final');
  if (!tacha1 || !tacha2 || !medio || !final) return;

  if (reduce) {
    gsap.set([tacha1, tacha2], { drawSVG: '100%' });
    gsap.set([medio, final], { opacity: 1, clipPath: 'none' });
    return;
  }

  gsap.set([tacha1, tacha2], { drawSVG: '0%' });
  gsap.set([medio, final], { opacity: 1, clipPath: 'inset(-20% 100% -20% 0)' });

  const tl = gsap.timeline({ paused: true });
  tl.to(tacha1, { drawSVG: '100%', duration: 0.42, ease: 'power2.inOut' }, 0.2)
    .to(medio, { clipPath: 'inset(-20% 0% -20% 0)', duration: 0.6, ease: 'power1.inOut' }, 0.75)
    .to(tacha2, { drawSVG: '100%', duration: 0.36, ease: 'power2.inOut' }, 1.9)
    .to(final, { clipPath: 'inset(-20% 0% -20% 0)', duration: 0.75, ease: 'power1.inOut' }, 2.4);

  ScrollTrigger.create({
    trigger: corr,
    start: 'top 78%',
    once: true,
    onEnter: () => tl.play(),
  });

  // Al abrir la P.D. con <details>, un pequeño acomodo para que no salte.
  const pd = raiz.querySelector<HTMLDetailsElement>('.pd');
  const pdTexto = pd?.querySelector<HTMLElement>('.pd__texto');
  if (pd && pdTexto) {
    pd.addEventListener('toggle', () => {
      if (pd.open) gsap.fromTo(pdTexto, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.7, ease: EASE });
    });
  }
}
