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
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
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
      {
        source: '/download/mac',
        destination: 'https://github.com/agentix-ai/agentix/releases/latest',
        permanent: false,
      },
      {
        source: '/download/windows',
        destination: 'https://github.com/agentix-ai/agentix/releases/latest',
        permanent: false,
      },
      {
        source: '/download/releases',
        destination: 'https://github.com/agentix-ai/agentix/releases',
        permanent: false,
      },
      {
        source: '/download/connector',
        destination: '/connector.py',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
