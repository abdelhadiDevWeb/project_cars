import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Directory containing this config (`client/`) — absolute path required by Turbopack. */
const clientDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Next 16 defaults to Turbopack for `next build`; we use `next build --webpack` for custom webpack().
  // When a parent folder has its own package-lock.json, Turbopack can pick that as the root and fail to
  // resolve packages that only exist under `client/node_modules` (e.g. tailwindcss).
  turbopack: {
    root: clientDir,
  },
  // Avoid webpack's persistent pack cache in dev — on some Windows setups it triggers
  // "Array buffer allocation failed" (PackFileCacheStrategy) during compile.
  webpack: (config, { dev }) => {
    if (dev) {
      // Full cache disable caused very high memory use with large modules (e.g. utils/i18n.ts).
      // Filesystem cache without compression avoids PackFileCacheStrategy issues on some Windows setups.
      config.cache = {
        type: "filesystem",
        compression: false,
        maxMemoryGenerations: 1,
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '7000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'server-bun.onrender.com',
        pathname: '/uploads/**',
      },
    ],
  },
  async rewrites() {
    // Proxy Next.js /api/* to Bun backend.
    // Keep default aligned with server_bun PORT (7000) and utils/backend.ts.
    // Override with BACKEND_URL or NEXT_PUBLIC_BACKEND_URL when needed.
    const rawBackend =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "http://localhost:7000";
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
