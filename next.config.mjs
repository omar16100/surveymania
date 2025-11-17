import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    },
    instrumentationHook: true,
    outputFileTracingExcludes: {
      '*': [
        'node_modules/.prisma/client/libquery_engine-*',
        'node_modules/@prisma/engines/**',
        'node_modules/.bin/prisma',
      ],
    },
    serverExternalPackages: [
      '@prisma/client',
      '@prisma/adapter-d1',
      '.prisma/client'
    ]
  }
}

export default nextConfig;

initOpenNextCloudflareForDev();

