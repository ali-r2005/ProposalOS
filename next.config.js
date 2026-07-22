/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Provider files inside templates are loaded at runtime via dynamic import,
  // so they must not be bundled by webpack. Mark them external on the server.
  serverExternalPackages: ["handlebars"],
  // Template files are loaded via a runtime string path (nativeImport), which
  // is invisible to Vercel's output file tracer — without this, the compiled
  // templates/*/{providers,db}/*.js files get pruned from the deployed
  // serverless function and only the raw .ts sources are left on disk.
  outputFileTracingIncludes: {
    "/api/**/*": ["./templates/**/*"],
  },
};

module.exports = nextConfig;
