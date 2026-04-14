import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid webpack's persistent pack cache in dev — on some Windows setups it triggers
  // "Array buffer allocation failed" (PackFileCacheStrategy) during compile.
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
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
    // Set BACKEND_URL or NEXT_PUBLIC_BACKEND_URL (e.g. http://localhost:8001)
    const rawBackend =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "http://localhost:8001";
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
