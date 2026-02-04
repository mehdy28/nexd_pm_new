//next.config.mjs
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import CopyPlugin from 'copy-webpack-plugin';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  reactStrictMode: false,

  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.nexdpm.com',
          },
        ],
        destination: 'https://nexdpm.com/:path*',
        permanent: true,
      },
    ]
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' *.supademo.com https://www.googletagmanager.com; connect-src 'self' *.supademo.com https://www.google-analytics.com https://www.googletagmanager.com; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-src 'self' *.supademo.com;",
          },
        ],
      },
    ];
  },
  
  outputFileTracingIncludes: {
    '/blog/[slug]': ['./blogs/**/*'],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
        config.plugins.push(
          new CopyPlugin({
            patterns: [
              {
                from: path.join(
                  path.dirname(require.resolve('@excalidraw/excalidraw')),
                  'dist'
                ),
                to: path.join(__dirname, 'public', 'excalidraw-assets'),
                noErrorOnMissing: true,
              },
            ],
          })
        );
    }
    return config;
  },
}

export default nextConfig;