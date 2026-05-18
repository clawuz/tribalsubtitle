/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        // Allow direct cross-origin render calls from Firebase Hosting domain
        source: '/api/render',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://tribalsubtitle.web.app' },
          { key: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
      {
        source: '/api/download/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://tribalsubtitle.web.app' },
        ],
      },
    ]
  },
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
