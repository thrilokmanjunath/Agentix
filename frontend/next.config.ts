import type { NextConfig } from "next";

const rawBackendUrl = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV !== "production" ? "http://127.0.0.1:8001" : "https://agentix-api-lord.onrender.com")).trim();
const BACKEND_URL = rawBackendUrl.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  compress: true,
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [],
  },
  experimental: {
    optimizePackageImports: ['recharts', 'framer-motion'],
    serverActions: {
      bodySizeLimit: '50mb',
    },
    middlewareClientMaxBodySize: 52428800, // 50MB limit for rewrites proxy
  },
  async rewrites() {
    if (!BACKEND_URL) return [];
    return [
      {
        source: '/api/v1/:path*',
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/workspace',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/onboarding',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
