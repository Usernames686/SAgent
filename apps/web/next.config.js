/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@sagent/shared'],

  productionBrowserSourceMaps: false,

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'monaco-editor',
      '@monaco-editor/react',
      'zustand',
      '@tanstack/react-query',
    ],
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4001/api/:path*',
      },
    ];
  },

  webpack(config, { isServer, dev }) {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('monaco-editor');
    }

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }

    // Dev: 关闭 source map 加速编译
    if (dev) {
      config.devtool = false;
    }

    return config;
  },
};

module.exports = nextConfig;
