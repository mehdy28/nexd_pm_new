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
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  reactStrictMode: false,
  
  // This configuration forces Vercel to include the 'blogs' directory and all
  // its files within the serverless function's file system. This is the fix.
  experimental: {
    outputFileTracingIncludes: {
      '/blog/[slug]': ['./blogs/**/*'],
    },
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