import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@veska/ui', '@veska/sdk'],
};

export default config;
