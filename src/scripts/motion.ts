/**
 * Movimiento: GSAP + Lenis, y las pocas reglas que comparte toda la página.
 * Una sola familia de curvas (expo.out para revelar, power2.inOut para escenas),
 * duraciones entre 0,3 s y 2,4 s, y nada en loop salvo el viento.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Draggable } from 'gsap/Draggable';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText, Draggable, DrawSVGPlugin);

export const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const EASE = 'expo.out';
export const EASE_ESCENA = 'power2.inOut';

let lenis: Lenis | null = null;

export function iniciarScroll(): Lenis | null {
  if (reduce || lenis) return lenis;
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, touchMultiplier: 1.4 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function detenerScroll(parar: boolean): void {
  if (!lenis) {
    document.documentElement.style.overflow = parar ? 'hidden' : '';
    return;
  }
  if (parar) lenis.stop();
  else lenis.start();
}

export function scrollA(objetivo: string | HTMLElement, offset = 0): void {
  const el = typeof objetivo === 'string' ? document.querySelector<HTMLElement>(objetivo) : objetivo;
  if (!el) return;
  if (lenis) {
    lenis.scrollTo(el, { offset, duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
  } else {
    const y = el.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }
}

/**
 * Revelado genérico: cualquier [data-reveal] sube y aparece al entrar en pantalla,
 * una sola vez. `data-reveal="lines"` parte el texto por líneas con máscara.
 * Los hijos con data-reveal-delay escalonan.
 */
export function revelar(raiz: ParentNode = document): void {
  const nodos = raiz.querySelectorAll<HTMLElement>('[data-reveal]');
  if (reduce) {
    nodos.forEach((n) => (n.style.opacity = '1'));
    return;
  }
  nodos.forEach((el) => {
    const modo = el.dataset.reveal || 'up';
    const delay = Number(el.dataset.revealDelay || 0);
    const start = el.dataset.revealStart || 'top 85%';

    if (modo === 'lines') {
      el.style.opacity = '1';
      SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
        aria: 'none', // aria-label no está permitido en <p>; las líneas se leen igual
        linesClass: 'linea',
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 112,
            duration: 1.15,
            ease: EASE,
            stagger: 0.075,
            delay,
            scrollTrigger: { trigger: el, start, once: true },
          }),
      });
      return;
    }

    if (modo === 'wipe') {
      gsap.set(el, { opacity: 1, clipPath: 'inset(0 100% 0 0)' });
      gsap.to(el, {
        clipPath: 'inset(0 0% 0 0)',
        duration: 1.3,
        ease: EASE,
        delay,
        scrollTrigger: { trigger: el, start, once: true },
      });
      return;
    }

    gsap.fromTo(
      el,
      { opacity: 0, y: modo === 'fade' ? 0 : 26 },
      {
        opacity: 1,
        y: 0,
        duration: 1.1,
        ease: EASE,
        delay,
        scrollTrigger: { trigger: el, start, once: true },
      },
    );
  });
}

export { gsap, ScrollTrigger, SplitText, Draggable };
