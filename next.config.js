/**
 * Next resolves CONFIG_FILES in order — `next.config.js`, `next.config.mjs`,
 * `next.config.ts` — and loads only the first one it finds. A second config
 * file next to this one is never read, so everything must live here.
 *
 * @type {import('next').NextConfig}
 */
/**
 * El micrófono está cerrado en todo el sitio salvo en /defensa, donde el alumno habla, y en
 * /revision, donde el profesor puede dictarle a Celestea (solo si hay transcripción real
 * configurada). Solo el propio sitio (`self`) puede pedirlo: ningún iframe ni script ajeno. La cámara
 * sigue cerrada en todas partes, también en /defensa: no hay cámara ni vigilancia.
 */
const permissionsPolicy = (microphone) => ({
  key: 'Permissions-Policy',
  value: `camera=(), geolocation=(), microphone=${microphone}, payment=(), usb=()`,
});

const commonSecurityHeaders = [
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  { key: 'X-XSS-Protection', value: '0' },
];

const productionContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // unicorn.studio serves the hero scene's own image assets from this origin.
  // `connect-src` already allows the scene payload; the `<img>` tags it injects
  // need the image directive as well.
  "img-src 'self' data: blob: https://assets.unicorn.studio",
  // Las preguntas de voz y el audio original llegan de Storage con enlaces firmados que caducan.
  "media-src 'self' data: blob: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://storage.googleapis.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join('; ');

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Lets a second dev server (e.g. the retest walkthrough on another port)
  // build into its own directory instead of clobbering the primary `.next`.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  eslint: {
    // Keep ESLint in the build; fail on errors, tolerate warnings.
    ignoreDuringBuilds: false,
  },
  async headers() {
    const headers = [...commonSecurityHeaders];
    if (process.env.NODE_ENV === 'production') {
      headers.push(
        { key: 'Content-Security-Policy', value: productionContentSecurityPolicy },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }
      );
    }
    // Cuando dos reglas fijan el mismo encabezado, gana la última: /defensa abre el micrófono.
    return [
      { source: '/:path*', headers: [...headers, permissionsPolicy('()')] },
      { source: '/defensa/:path*', headers: [permissionsPolicy('(self)')] },
      { source: '/revision/:path*', headers: [permissionsPolicy('(self)')] },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/terms',
        destination: '/termly.html',
      },
    ];
  },
};

module.exports = nextConfig;
