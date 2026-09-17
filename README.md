# Flores amarillas para Martina

Un ramo de 21 flores amarillas que no se marchitan. Sitio estático de una sola página, hecho a mano con Astro 7, TypeScript, GSAP y Lenis, pensado para vivir en GitHub Pages.

Ninguna flor es una imagen: se dibujan con código, con una semilla fija, para que siempre sean las mismas. El azul aparece una sola vez a propósito: es el azul de las pantallas, y termina siendo la cinta que ata el ramo y la tinta de la carta.

## Qué hay adentro

| Sección | Qué hace |
| --- | --- |
| Intro | Pantalla azul con tres líneas de log y una flor dibujada a trazo; la cortina se levanta y queda el papel. Dura menos de 3 s, se puede saltar y no se repite en la misma sesión. |
| Portada | Campo de flores procedurales en canvas: viento con ruido simplex, tres planos con parallax, las flores se apartan del puntero. |
| Por qué amarillas | La tradición, con datos verificados y su fuente. |
| La entrega | Ramo envuelto en kraft, atado con una cinta azul que se desata arrastrándola (o con el botón). 21 flores brotan con física; una tarjeta queda colgando. |
| La tarjeta | La carta, con una tachadura hecha a mano y una P.D. escondida. |
| Notas al margen | Cinco flores prensadas con datos reales. |
| Sin marchitarse | Contador vivo en hora de Buenos Aires: cuánto falta para el 21, o hace cuánto que las flores siguen abiertas. |
| Cierre | Lluvia de pétalos, colofón técnico y las fuentes de los datos. |

Hay dos huevos de pascua: escribí `martina` o `matias` en cualquier momento, sin hacer clic en nada.

## Cómo cambiar los textos

**Todo el texto vive en un solo archivo: [`src/content/martina.ts`](src/content/martina.ts).** La carta, los títulos, la firma, la fecha, los datos, las frases de los huevos de pascua. Los componentes no repiten nada: leen de ahí.

Cosas que seguramente quieras tocar:

- `persona.firma`: cómo firmás la carta.
- `carta.parrafos` y `carta.correccion`: la carta y la tachadura (`antes` → `medio` → `despues`).
- `meta.url`: la URL final, cuando la publiques (se usa en la vista previa al compartir).
- `meta.repo`: si querés que el colofón enlace al código.
- `fecha`: si algún año querés cambiar el ancla del contador.

Si cambiás el nombre en `persona`, cambian también la semilla del campo y del ramo: salen otras flores.

## Correr en tu computadora

Necesitás Node 22.12 o más nuevo (hay un `.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # revisa tipos (astro check) y genera dist/
npm run preview    # sirve dist/ como lo va a servir Pages
```

## Publicar en GitHub Pages

1. Creá un repositorio en GitHub (por ejemplo `flores-para-martina`). Con una cuenta gratuita tiene que ser público para que Pages funcione (privado solo con GitHub Pro). No pasa nada: la página tiene `noindex` para no aparecer en buscadores, y la URL solo la conoce quien vos quieras.
2. Subí el código:

   ```bash
   git init
   git add .
   git commit -m "Flores amarillas para Martina"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/flores-para-martina.git
   git push -u origin main
   ```

3. En el repo, andá a **Settings → Pages** y en *Build and deployment* elegí **Source: GitHub Actions**. Una sola vez.
4. El workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) corre solo con cada push a `main`. En un par de minutos la página queda en `https://TU-USUARIO.github.io/flores-para-martina/`.
5. Poné esa URL en `meta.url` dentro de `src/content/martina.ts` y hacé push de nuevo, así la vista previa al compartir apunta bien.

No hay que configurar rutas: `astro.config.mjs` deduce el `base` del nombre del repo. Si lo llamás `TU-USUARIO.github.io`, queda en la raíz; con cualquier otro nombre, queda en `/nombre-del-repo/`.

**Dominio propio:** agregá un archivo `public/CNAME` con el dominio, configuralo en Settings → Pages, y descomentá `SITE_URL` y `BASE_PATH` en el workflow.

## Control de calidad

Hay un loop de verificación que corre contra `dist/`, con Chromium:

```bash
npm run build
npm run qa
```

Abre la página en cuatro tamaños (390, 768, 1440 y 1920 px), comprueba que no haya errores de consola ni pedidos fallidos ni scroll horizontal, que la intro termine sola, que el ramo se abra por arrastre y por botón, que el huevo de pascua responda, que `prefers-reduced-motion` deje todo visible sin animar, corre axe-core (sin problemas serios ni críticos) y mide el peso real transferido. Deja capturas de cada sección en `qa-output/` y un `informe.json`.

Para que funcione hace falta un Chromium; con `npx playwright install chromium` alcanza, o apuntá `PW_EXECUTABLE` a uno que ya tengas.

`npm run lighthouse` corre Lighthouse en modo móvil contra el mismo `dist/` (necesita Chrome; `CHROME_PATH` si no lo encuentra). Última medición: performance 94, accesibilidad 100, buenas prácticas 100. SEO da 63 a propósito: la página lleva `noindex`.

La imagen de vista previa (`public/og.png`) es la portada real fotografiada: `npm run og` (y después `npm run build` otra vez para que entre en `dist/`).

`npm run single` empaqueta el sitio construido en un solo archivo (`dist/flores-para-martina.html`, con fuentes y JavaScript adentro) por si querés mandarlo por mail o abrirlo sin servidor.

## Cómo está armado

```
src/
  content/martina.ts     ← todo el texto
  layouts/Base.astro     ← <head>, fuentes, metadatos, grano, scripts
  pages/index.astro      ← la página; 404.astro, la que no existe
  components/            ← una sección por archivo
  scripts/
    noise.ts             ← azar con semilla + ruido simplex
    flora.ts             ← botánica procedural (4 especies) para canvas y SVG
    field.ts             ← el campo de la portada
    bouquet.ts           ← el ramo: SVG, papel, cinta arrastrable, apertura
    petals.ts            ← pétalos que caen y ráfagas
    motion.ts            ← GSAP + Lenis y las reglas de movimiento
    intro.ts, letter.ts, counter.ts, eggs.ts, main.ts
  styles/                ← tokens, tipografía, base
  assets/fonts/          ← woff2 self-hosted (ver scripts/fonts.py)
```

Decisiones que vale la pena conocer:

- **Sin imágenes, sin música, sin plantilla.** Todo lo que se ve se dibuja en el momento. Pesa menos que una foto de un celular, fuentes incluidas.
- **Una sola familia de curvas** (`expo.out` para revelar, `power2.inOut` para escenas) y nada en loop salvo el viento. Con `prefers-reduced-motion` todo se ve igual, quieto.
- **Fraunces se instancia con el eje SOFT al máximo** (terminales redondeadas, como pétalos) y queda variable solo en peso: un tercio del tamaño. `scripts/fonts.py` lo regenera.
- **Sin base de datos ni cuentas.** Es un archivo con un nombre adentro, en un servidor que no cobra.

## Créditos y licencias

- Código: MIT (ver `LICENSE`).
- Tipografías: Fraunces (Undercase Type), Alegreya y Alegreya Sans SC (Huerta Tipográfica, Argentina) y Nothing You Could Do (Kimberly Geswein), todas bajo SIL Open Font License 1.1. Detalle en `src/assets/fonts/LICENSES.md`.
- GSAP 3 (Webflow) bajo su licencia estándar sin cargo; Lenis (darkroom.engineering) bajo MIT; Astro bajo MIT.

Los datos que afirma la página tienen fuente al pie de la misma página y en `src/content/martina.ts`.
