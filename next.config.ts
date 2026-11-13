import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // The Mac app ships the standalone server (.next/standalone) inside the .app.
  output: "standalone",
  // The data folder (database, card data, art) is read at run time from the user's folder;
  // file tracing must not copy it, or the sources, into the standalone server.
  outputFileTracingExcludes: { "*": ["data/**", "src/**"] },
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
