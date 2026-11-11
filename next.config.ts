import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy without nonces (see node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
 * Nonces would force every page to render per request; this site has no auth, forms or user data, so the
 * static-friendly policy is used: same-origin scripts (inline needed for Next's bootstrap), no plugins,
 * no framing. blob:/data: cover WebGL canvas textures and generated images.
 */
const csp = [
  "default-src 'self'",
  // wasm-unsafe-eval lets the meshopt decoder compile its WebAssembly; it does not allow JS eval.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  // blob: because GLTFLoader fetches a GLB's embedded textures through object URLs.
  "connect-src 'self' blob:",
  "worker-src 'self' blob:",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    // Optional licensed GLB / texture / HDR assets placed in public/. File names should be
    // versioned when replaced, so they can be cached for a long time.
    const longCache = [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }];
    // Vehicle GLBs are written by scripts/assets/prepare-glb.mjs with a content hash in the name
    // (and the manifest schema only accepts such names), so a URL never changes content.
    const immutable = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/models/:path*", headers: immutable },
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
