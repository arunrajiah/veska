import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const config: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@veska/ui', '@veska/core'],
  experimental: {
    typedRoutes: true,
  },
  webpack(webpackConfig) {
    // Allow importing TypeScript files with a .js extension (ESM-compatible imports)
    webpackConfig.resolve = {
      ...webpackConfig.resolve,
      extensionAlias: {
        '.js': ['.ts', '.tsx', '.js', '.jsx'],
        '.jsx': ['.tsx', '.jsx'],
      },
    };
    return webpackConfig;
  },
};

export default withNextIntl(config);
