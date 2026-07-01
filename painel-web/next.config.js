/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@herois/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'quickchart.io' },
    ],
  },
};

module.exports = nextConfig;
