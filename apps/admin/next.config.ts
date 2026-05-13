import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@veska/ui', '@veska/core'],
  experimental: {
    typedRoutes: true,
  },
};

export default config;
