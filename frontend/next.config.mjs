/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Phase 20: emits .next/standalone with only the files and node_modules
  // the server actually needs, so the production image doesn't have to
  // carry the whole dependency tree.
  output: 'standalone',
};

export default nextConfig;
