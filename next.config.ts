import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Solo el Dockerfile define NEXT_OUTPUT; `next start` y Vercel no cambian.
  ...(process.env.NEXT_OUTPUT === 'standalone' && { output: 'standalone' as const }),
};

export default nextConfig;
