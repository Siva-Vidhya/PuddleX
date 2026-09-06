const nextConfig = {
  images: {
    domains: [
      "localhost",
      "puddlex-backend.onrender.com",
      "tile.openstreetmap.org"
    ]
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
}
export default nextConfig
