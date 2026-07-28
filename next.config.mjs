/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  eslint: {
    // Solo fallar en errores, no en warnings
    // Esto permite que el build continúe con warnings
    ignoreDuringBuilds: false, // Sigue ejecutando ESLint
  },
};

export default nextConfig;
