// @ts-check
import { defineConfig } from 'astro/config';

/**
 * `site` y `base` se calculan solos cuando el build corre en GitHub Actions:
 *   - usuario/flores-para-martina  ->  https://usuario.github.io/flores-para-martina/
 *   - usuario/usuario.github.io    ->  https://usuario.github.io/
 * Localmente el base es "/" y no hay que tocar nada.
 * Para un dominio propio: definí SITE_URL (y BASE_PATH="/") en el workflow.
 */
const repo = process.env.GITHUB_REPOSITORY; // "usuario/repo"
let site = process.env.SITE_URL;
let base = process.env.BASE_PATH ?? '/';

if (repo) {
  const [owner, name] = repo.split('/');
  const esUserSite = name.toLowerCase() === `${owner.toLowerCase()}.github.io`;
  site ??= `https://${owner.toLowerCase()}.github.io`;
  if (!process.env.BASE_PATH) base = esUserSite ? '/' : `/${name}/`;
}

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  compressHTML: true,
  build: {
    // "assets" en vez de "_astro": si algún día se sirve desde una rama con Jekyll,
    // las carpetas con guion bajo se ignoran y el sitio se rompe.
    assets: 'assets',
    inlineStylesheets: 'always',
  },
  vite: {
    build: {
      cssCodeSplit: false,
      assetsInlineLimit: 0,
    },
  },
});
