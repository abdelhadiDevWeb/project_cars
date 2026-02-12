import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '8001',
        pathname: '/uploads/**',
      },
    ],
  },
  async rewrites() {
    // Proxy Next.js /api/* to Bun backend.
    // Set URLBACKEND in client env (e.g. http://localhost:8001)
    const rawBackend = process.env.URLBACKEND || process.env.BACKEND_URL || "http://localhost:8001";
    const backend = rawBackend.endsWith("/") ? rawBackend.slice(0, -1) : rawBackend;
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backend}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
