/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/terms',
        destination: '/termly.html',
      },
    ]
  },
};

module.exports = nextConfig;
