import type { NextConfig } from "next";

/** `npm run build:demo` (the hosted web demo): see src/lib/demo/mode.ts. */
const demo = process.env.NEXT_PUBLIC_DEMO === "1";

const nextConfig: NextConfig = {
  /* config options here */
  // The Mac app ships the standalone server (.next/standalone) inside the .app.
  output: "standalone",
  // The data folder (database, card data, art) is read at run time from the user's folder;
  // file tracing must not copy it, or the sources, into the standalone server.
  outputFileTracingExcludes: { "*": ["data/**", "src/**"] },
  // The demo reads its card data, the migrations and the recorded fixture log at run time.
  ...(demo && { outputFileTracingIncludes: { "/*": ["./.demo-data/cards/**", "./drizzle/**", "./tests/fixtures/power-logs/**"] } }),
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
