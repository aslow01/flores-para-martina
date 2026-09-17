/**
 * Contador vivo. Antes del 21: cuánto falta. El 21: hoy. Después: cuántos días
 * llevan estas flores sin marchitarse. Todo en hora de Buenos Aires, aunque se
 * abra desde otro lado.
 */
import { gsap, reduce } from './motion';

interface Estado {
  prefijo: (n: number) => string;
  numero: (n: number) => string;
  etiqueta: (n: number) => string;
  bajada: string;
}

export interface TextosContador {
  antes: Estado;
  hoy: Estado;
  despues: Estado;
  detalle: (h: number, m: number) => string;
}

interface Config {
  iso: string; // instante en que empieza el 21 (con offset)
  zona: string;
  textos: TextosContador;
}

/** Fecha "civil" (año-mes-día) de un instante, vista desde una zona horaria. */
function fechaCivil(instante: Date, zona: string): number {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instante);
  const g = (t: string) => Number(partes.find((p) => p.type === t)?.value ?? 0);
  return Date.UTC(g('year'), g('month') - 1, g('day'));
}

export function iniciarContador(raiz: HTMLElement, cfg: Config): void {
  const q = (s: string) => raiz.querySelector<HTMLElement>(s);
  const prefijo = q('.contador__prefijo');
  const numero = q('.contador__n');
  const etiqueta = q('.contador__etiqueta');
  const bajada = q('.contador__bajada');
  const detalle = q('.contador__detalle');
  if (!prefijo || !numero || !etiqueta || !bajada || !detalle) return;
  const el = { prefijo, numero, etiqueta, bajada, detalle };

  const objetivo = new Date(cfg.iso);
  const objetivoCivil = fechaCivil(objetivo, cfg.zona);
  const DIA = 86_400_000;
  let ultimo = '';

  function actualizar(): void {
    const ahora = new Date();
    const hoyCivil = fechaCivil(ahora, cfg.zona);
    const dias = Math.round((objetivoCivil - hoyCivil) / DIA);

    let estado: Estado;
    let n: number;
    let d = '';
    if (dias > 0) {
      estado = cfg.textos.antes;
      n = dias;
    } else if (dias === 0) {
      estado = cfg.textos.hoy;
      n = 0;
    } else {
      estado = cfg.textos.despues;
      n = -dias;
      const desde = ahora.getTime() - objetivo.getTime();
      const resto = desde % DIA;
      d = cfg.textos.detalle(Math.floor(resto / 3_600_000), Math.floor((resto % 3_600_000) / 60_000));
    }

    const clave = `${estado.prefijo(n)}|${estado.numero(n)}|${estado.etiqueta(n)}|${estado.bajada}`;
    if (clave !== ultimo) {
      ultimo = clave;
      el.prefijo.textContent = estado.prefijo(n);
      el.numero.textContent = estado.numero(n);
      el.etiqueta.textContent = estado.etiqueta(n);
      el.bajada.textContent = estado.bajada;
    }
    if (el.detalle.textContent !== d) {
      if (reduce || !el.detalle.textContent) {
        el.detalle.textContent = d;
      } else {
        gsap.to(el.detalle, {
          opacity: 0,
          y: -6,
          duration: 0.25,
          onComplete: () => {
            el.detalle.textContent = d;
            gsap.fromTo(el.detalle, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.5 });
          },
        });
      }
    }
  }

  actualizar();
  window.setInterval(actualizar, 30_000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) actualizar();
  });
}
