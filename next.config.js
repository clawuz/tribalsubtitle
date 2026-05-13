/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '2gb' },
    serverComponentsExternalPackages: [
      '@remotion/bundler',
      '@remotion/renderer',
      '@remotion/compositor-darwin-arm64',
      '@remotion/compositor-darwin-x64',
      '@remotion/compositor-linux-x64',
      '@remotion/compositor-linux-arm64',
      'remotion',
    ],
  },
}
module.exports = nextConfig
