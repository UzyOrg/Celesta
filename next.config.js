/**
 * Next resolves CONFIG_FILES in order — `next.config.js`, `next.config.mjs`,
 * `next.config.ts` — and loads only the first one it finds. A second config
 * file next to this one is never read, so everything must live here.
 *
 * @type {import('next').NextConfig}
 */
const commonSecurityHeaders = [
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(), payment=(), usb=()' },
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
  "img-src 'self' data: blob:",
  "media-src 'self' data: blob:",
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
    return [{ source: '/:path*', headers }];
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
