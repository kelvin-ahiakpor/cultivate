import withSerwist from "@serwist/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Empty turbopack config silences the "webpack config but no turbopack config" warning.
  // Serwist's webpack plugin only runs at build time (and is disabled in dev anyway).
  turbopack: {},
  images: {
    unoptimized: true,
    remotePatterns: [],
  },
};

export default withSerwist({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // IMPORTANT: disable in dev to prevent stale SW caching dev build hashes
  disable: process.env.NODE_ENV !== "production",
  cacheOnNavigation: true,
  reloadOnOnline: true,
})(nextConfig);
