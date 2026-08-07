/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.LISPFLOW_API_URL || 'http://localhost:8080'}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
