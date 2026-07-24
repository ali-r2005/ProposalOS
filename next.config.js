/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Provider files inside templates are loaded at runtime via dynamic import,
  // so they must not be bundled by webpack. Mark them external on the server.
  serverExternalPackages: ["handlebars", "drizzle-orm", "postgres"],
  // Template files (templates/*/{providers,db}/*.js) are loaded via a runtime
  // string path (nativeImport), invisible to Vercel's output file tracer —
  // without the first glob, those compiled files get pruned from the deployed
  // function. Every template's db/client.js shim escapes one level further,
  // requiring the engine's own lib/db/client.ts (and, transitively,
  // lib/utils/error-handler.ts) by raw relative path — same blind spot for
  // the tracer, so both must be force-included too, even though they're also
  // reached normally elsewhere via webpack-bundled `@/lib/...` imports (that
  // bundling doesn't keep the original .ts source file on disk, which is what
  // this runtime require() actually needs). The node_modules globs are the
  // same fix one level deeper: tracing also can't reliably follow
  // drizzle-orm's/postgres's own subpath exports (package.json "exports"
  // maps) from a file it only found via force-include rather than static
  // analysis, so we force-include those packages whole too instead of
  // trusting the trace to reconstruct them file-by-file.
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./templates/**/*",
      "./lib/db/client.ts",
      "./lib/utils/error-handler.ts",
      "./node_modules/drizzle-orm/**/*",
      "./node_modules/postgres/**/*",
    ],
  },
};

module.exports = nextConfig;
