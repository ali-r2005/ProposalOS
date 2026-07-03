/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Provider files inside templates are loaded at runtime via dynamic import,
  // so they must not be bundled by webpack. Mark them external on the server.
  serverExternalPackages: ["handlebars"],
};

module.exports = nextConfig;
