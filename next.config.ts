import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    // Optional licensed GLB / texture / HDR assets placed in public/. File names should be
    // versioned when replaced, so they can be cached for a long time.
    const longCache = [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }];
    return [
      { source: "/models/:path*", headers: longCache },
      { source: "/textures/:path*", headers: longCache },
      { source: "/environments/:path*", headers: longCache },
    ];
  },
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
