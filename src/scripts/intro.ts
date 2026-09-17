/**
 * La intro: una pantalla del color de las pantallas, tres líneas de log y una
 * flor que se dibuja a trazo. Después la cortina azul se levanta y queda el papel.
 * Dura poco (menos de 3 s), se puede saltar, y no se repite en la misma sesión.
 */
import { gsap, reduce, detenerScroll } from './motion';

export interface OpcionesIntro {
  saltar: boolean;
  /** Se llama cuando la cortina empieza a levantarse (para arrancar la portada debajo). */
  alLevantar?: () => void;
}

const CLAVE = 'fpm:intro-vista';

export function marcarIntroVista(): void {
  try {
    sessionStorage.setItem(CLAVE, '1');
  } catch {
    /* modo privado o storage bloqueado: la intro se vuelve a ver, no pasa nada */
  }
}

export function introYaVista(): boolean {
  try {
    return sessionStorage.getItem(CLAVE) === '1';
  } catch {
    return false;
  }
}

export function correrIntro(el: HTMLElement | null, opciones: OpcionesIntro): Promise<void> {
  if (!el) {
    opciones.alLevantar?.();
    return Promise.resolve();
  }
  if (opciones.saltar || reduce) {
    el.remove();
    opciones.alLevantar?.();
    return Promise.resolve();
  }

  detenerScroll(true);
  document.documentElement.classList.add('intro-activa');

  const lineas = Array.from(el.querySelectorAll<HTMLElement>('.intro__log li'));
  const trazos = Array.from(el.querySelectorAll<SVGPathElement>('.intro__trazo'));
  const rellenos = Array.from(el.querySelectorAll<SVGElement>('.intro__relleno'));
  const botonSaltar = el.querySelector<HTMLButtonElement>('.intro__saltar');

  const fuentesListas = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 2200))]);

  return new Promise<void>((resolve) => {
    let terminando = false;

    const alTeclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') levantar(true);
    };

    const levantar = (rapido = false) => {
      if (terminando) return;
      terminando = true;
      window.removeEventListener('keydown', alTeclado);
      tl.kill();
      marcarIntroVista();
      opciones.alLevantar?.();
      gsap.to(el, {
        yPercent: -100,
        duration: rapido ? 0.7 : 1.1,
        ease: 'power3.inOut',
        onComplete: () => {
          el.remove();
          document.documentElement.classList.remove('intro-activa');
          detenerScroll(false);
          resolve();
        },
      });
    };

    const tl = gsap.timeline();
    gsap.set(el, { yPercent: 0, willChange: 'transform' });
    gsap.set(trazos, { drawSVG: '0%' });
    gsap.set(rellenos, { opacity: 0 });
    gsap.set(lineas, { opacity: 1, clipPath: 'inset(0 100% 0 0)' });

    // Cada línea "se escribe" con steps: una máscara que avanza de a caracteres.
    lineas.forEach((li, i) => {
      const n = Math.max(6, li.textContent?.trim().length ?? 12);
      tl.to(li, { clipPath: 'inset(0 0% 0 0)', duration: n * 0.028, ease: `steps(${n})` }, 0.15 + i * 0.55);
    });

    tl.to(trazos, { drawSVG: '100%', duration: 1.05, ease: 'power2.inOut', stagger: 0.06 }, 0.25)
      .to(rellenos, { opacity: 1, duration: 0.55, ease: 'power2.out', stagger: 0.03 }, 1.25)
      .add(() => {
        fuentesListas.then(() => levantar());
      }, 2.0);

    const saltar = () => levantar(true);
    botonSaltar?.addEventListener('click', saltar, { once: true });
    el.addEventListener('click', (e) => {
      if (e.target !== botonSaltar) saltar();
    });
    window.addEventListener('keydown', alTeclado);
  });
}
