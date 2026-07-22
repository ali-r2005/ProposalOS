/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Provider files inside templates are loaded at runtime via dynamic import,
  // so they must not be bundled by webpack. Mark them external on the server.
  serverExternalPackages: ["handlebars", "drizzle-orm", "postgres"],
  // Template files (templates/*/{providers,db}/*.js) are loaded via a runtime
  // string path (nativeImport), invisible to Vercel's output file tracer —
  // without the first glob, those compiled files get pruned from the deployed
  // function. The node_modules globs are the same fix one level deeper: tracing
  // also can't reliably follow drizzle-orm's/postgres's own subpath exports
  // (package.json "exports" maps) from a file it only found via force-include
  // rather than static analysis, so we force-include those packages whole too
  // instead of trusting the trace to reconstruct them file-by-file.
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./templates/**/*",
      "./node_modules/drizzle-orm/**/*",
      "./node_modules/postgres/**/*",
    ],
  },
};

module.exports = nextConfig;
