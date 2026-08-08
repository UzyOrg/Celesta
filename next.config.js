/**
 * Next resolves CONFIG_FILES in order — `next.config.js`, `next.config.mjs`,
 * `next.config.ts` — and loads only the first one it finds. A second config
 * file next to this one is never read, so everything must live here.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  // Lets a second dev server (e.g. the retest walkthrough on another port)
  // build into its own directory instead of clobbering the primary `.next`.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  eslint: {
    // Keep ESLint in the build; fail on errors, tolerate warnings.
    ignoreDuringBuilds: false,
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
