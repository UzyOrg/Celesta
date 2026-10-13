import localFont from 'next/font/local';

/**
 * Tipografía de las pantallas Celeste (alumno y profesor).
 *
 * Las fuentes se sirven desde el propio repositorio con `next/font/local`: no
 * se pide nada a Google Fonts. Son los archivos de fontsource con los que se
 * renderizaron los diseños aprobados.
 *
 * - Bricolage Grotesque variable, subconjunto latino, con los ejes `opsz`
 *   (tamaño óptico, 12 a 96) y `wght` (200 a 800). El navegador aplica el
 *   tamaño óptico solo (`font-optical-sizing: auto`). Todo el texto va en esta
 *   fuente y en tipo oración.
 * - DM Mono 400 y 500, subconjunto latino. Solo para horas, duraciones,
 *   matrículas, conteos y direcciones (00:14, 20231457, celestea.mx/d/...).
 *
 * Ambas son OFL 1.1; sus licencias están junto a los archivos en `fonts/`.
 * Cada layout (`app/defensa` y `app/revision`) agrega `variable` a su
 * contenedor, y `tokens.module.css` las usa como `--c-fuente` y `--c-mono`.
 */
export const bricolage = localFont({
  src: './fonts/bricolage-grotesque-latin-opsz-normal.woff2',
  variable: '--font-bricolage',
  weight: '200 800',
  style: 'normal',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

export const dmMono = localFont({
  src: [
    { path: './fonts/dm-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/dm-mono-latin-500-normal.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-dm-mono',
  display: 'swap',
  fallback: ['ui-monospace', 'monospace'],
});
