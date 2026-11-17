// Security headers for every route. A full script CSP is not set because Next.js injects
// inline bootstrap scripts; these directives restrict framing, plugins, base URLs and form
// targets without touching scripts.
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
const nextConfig = {
  reactStrictMode: true,
  // Lets a test build go to another folder (NEXT_DIST_DIR=.next-test) without clobbering a running `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
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
      // The service worker must always be revalidated so a new release takes over promptly.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Content-Type", value: "application/javascript; charset=utf-8" }] },
    ];
  },
};
export default nextConfig;
