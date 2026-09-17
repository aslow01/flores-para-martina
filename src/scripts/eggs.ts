/**
 * Huevos de pascua: escribir un nombre, así, sin más.
 * En una computadora, con el teclado en cualquier momento; en el celular, en la
 * línea en blanco de la P.D. (sin un campo, el teléfono no abre el teclado).
 */

export function iniciarHuevos(
  palabras: Record<string, string>,
  alDisparar: (texto: string, clave: string) => void,
  campo?: HTMLInputElement | null,
): void {
  const entradas = Object.entries(palabras).map(([clave, texto]) => ({ clave, texto, normal: normalizar(clave) }));
  const maxLargo = Math.max(...entradas.map((e) => e.normal.length));
  let buffer = '';

  function probar(texto: string): boolean {
    for (const e of entradas) {
      if (texto.endsWith(e.normal)) {
        alDisparar(e.texto, e.clave);
        return true;
      }
    }
    return false;
  }

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const objetivo = e.target as HTMLElement | null;
    if (objetivo && (objetivo.tagName === 'INPUT' || objetivo.tagName === 'TEXTAREA' || objetivo.isContentEditable)) return;
    if (e.key.length !== 1) return;
    buffer = (buffer + normalizar(e.key)).slice(-maxLargo);
    if (probar(buffer)) buffer = '';
  });

  campo?.addEventListener('input', () => {
    if (probar(normalizar(campo.value).trim())) campo.blur();
  });
}

function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}
