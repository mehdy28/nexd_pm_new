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

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            // Allow scripts from self, Supademo, and unsafe inline/eval scripts which Next.js might use in dev mode.
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.supademo.com;",
          },
        ],
      },
    ];
  },
  
  // This is the corrected configuration. The key is now at the top level.
  // This forces Vercel to include the 'blogs' directory in the serverless function.
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