/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Provider files inside templates are loaded at runtime via dynamic import,
  // so they must not be bundled by webpack. Mark them external on the server.
  // `axios` belongs here (not just in outputFileTracingIncludes below): a raw
  // `node_modules/axios/**/*` glob only grabs axios's own files, not its own
  // `require()`/`import`s (form-data, proxy-from-env, follow-redirects,
  // https-proxy-agent, and *their* transitive deps) — those only got pulled
  // in one broken package at a time as each one surfaced at runtime in
  // production ("Cannot find package 'form-data'", then 'proxy-from-env', ...).
  // serverExternalPackages makes Next.js's tracer walk axios's whole
  // dependency closure properly, the same way it already does for
  // drizzle-orm/postgres below — no more whack-a-mole.
  serverExternalPackages: ["handlebars", "drizzle-orm", "postgres", "axios"],
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
      // Same blind spot, second data source: templates that fetch their catalog
      // data from a Frappe app (rather than owning Postgres tables) reach this
      // chain through their own db/client.ts shim, so it needs the same
      // force-include treatment as lib/db/client.ts above.
      "./lib/frappe/template-data.ts",
      "./lib/frappe/client.ts",
      "./lib/frappe/types.ts",
      "./node_modules/axios/**/*",
      // axios's own runtime require()s/imports (its Node http adapter, proxy
      // support, multipart forms) reach a chain of transitive dependencies
      // that Vercel's tracer can't discover on its own — axios is only ever
      // reached via nativeImport()'s string specifier here, so trace analysis
      // never walks its require graph, and adding "axios" to
      // serverExternalPackages does NOT fix this either (confirmed by
      // re-tracing: that setting affects webpack bundling, not the file
      // tracer's inclusion set). Every package below was hit one at a time in
      // production ("Cannot find package 'form-data'", then 'proxy-from-env',
      // ...) before force-including the whole closure here at once.
      "./node_modules/form-data/**/*",
      "./node_modules/proxy-from-env/**/*",
      "./node_modules/follow-redirects/**/*",
      "./node_modules/https-proxy-agent/**/*",
      "./node_modules/agent-base/**/*",
      "./node_modules/debug/**/*",
      "./node_modules/asynckit/**/*",
      "./node_modules/combined-stream/**/*",
      "./node_modules/es-set-tostringtag/**/*",
      "./node_modules/hasown/**/*",
      "./node_modules/mime-types/**/*",
      "./node_modules/mime-db/**/*",
      "./node_modules/delayed-stream/**/*",
      "./node_modules/es-errors/**/*",
      "./node_modules/get-intrinsic/**/*",
      "./node_modules/has-tostringtag/**/*",
      "./node_modules/ms/**/*",
    ],
  },
};

module.exports = nextConfig;
