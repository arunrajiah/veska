import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@veska/ui', '@veska/sdk'],
};

export default config;
