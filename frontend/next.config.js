/** @type {import('next').Config} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: '/leadconnect', // Updated to match the repository name
  images: {
    unoptimized: true, // Required for static export
  },
}

module.exports = nextConfig
