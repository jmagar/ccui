/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server external packages (moved from experimental)
  serverExternalPackages: ['@anthropic-ai/claude-code'],
  // Enable TypeScript strict mode
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: false,
  },
  // Configure environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  // Configure WebSocket support for development
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  // Optimize images
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
  },
  // Configure output for Docker
  output: 'standalone',
};

module.exports = nextConfig;