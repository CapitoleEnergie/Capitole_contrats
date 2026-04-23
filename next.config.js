/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permet d'utiliser les modules Node.js (jsforce, docxtemplater) dans les API routes
  experimental: {
    serverComponentsExternalPackages: ['jsforce', 'pizzip', 'docxtemplater'],
  },
}

module.exports = nextConfig
