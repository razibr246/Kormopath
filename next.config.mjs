import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

// Security headers for every route. These CSP directives restrict framing, plugins, base URLs and form targets.
// No script-src, on purpose:
//  - Next.js injects inline bootstrap scripts. The only strict option is a per-request nonce set in middleware,
//    which forces every page to render dynamically. All pages are prerendered static HTML served from the CDN
//    today, which is what keeps first load fast on slow mobile data.
//  - The Examiner sandbox (lib/sandbox.ts) runs the candidate's code with new Function inside a blob: Worker, so a
//    script policy would still need 'unsafe-eval' and blob:, which removes most of its protection.
//  - No user-supplied HTML is rendered: the only dangerouslySetInnerHTML is our own JSON-LD, and field360's
//    innerHTML writes are numeric SVG animation frames.
// Revisit if the sandbox moves to its own origin (e.g. a sandboxed iframe); a hash-based script-src for the static
// pages becomes worthwhile then.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // Microphone: Probaho Coach, Shohoj Budget and MaathSathi field voice entry. Geolocation: MaathSathi field map
  // "find my field" (/krishi/field). Both same origin only; everything else off.
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(self), payment=(), usb=(), interest-cohort=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
];

/** @type {import('next').NextConfig} */
const nextConfig = (phase) => ({
  reactStrictMode: true,
  compress: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // Keep the dev server's generated chunks separate from production builds and starts.
  distDir: process.env.NEXT_DIST_DIR || (phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next"),
  devIndicators: false,
  poweredByHeader: false,
  // FieldShift360 (field360/src, mounted at /krishi/field) was written for Vite, where importing an image gives its
  // URL string. Next's image loader returns an object instead, so images under field360/ become plain asset URLs.
  webpack(config) {
    const f360 = /[\\/]field360[\\/]src[\\/]/;
    const visit = (rules) => {
      for (const r of rules) {
        if (!r || typeof r !== "object") continue;
        if (Array.isArray(r.oneOf)) visit(r.oneOf);
        if (r.loader === "next-image-loader") r.exclude = r.exclude ? [].concat(r.exclude, f360) : f360;
      }
    };
    visit(config.module.rules);
    config.module.rules.push({
      test: /\.(png|jpe?g|webp|gif|svg|avif)$/i,
      include: f360,
      type: "asset/resource",
      generator: { filename: "static/media/f360/[name].[hash:8][ext]" },
    });
    return config;
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        source: "/favicon.svg",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      // The service worker must always be revalidated so a new release takes over promptly.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Content-Type", value: "application/javascript; charset=utf-8" }] },
    ];
  },
});
export default nextConfig;
