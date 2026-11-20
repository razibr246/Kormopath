import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The service worker serves files "cache first" only when their name carries a content hash. A dev server's chunk
// names have none; caching them served old code after an edit and caused hydration errors.
const sw = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const HASHED = new Function(`return ${sw.match(/const HASHED = (\/.*\/);/)![1]}`)() as RegExp;

test("content-hashed build files are cache-first", () => {
  for (const p of [
    "/_next/static/chunks/1038.f0283111d83e22d3.js",
    "/_next/static/chunks/app/page-8c1d2e3f4a5b6c7d.js",
    "/_next/static/css/2b7f3c0e1a9d8e7f.css",
    "/_next/static/media/deb0a8988b10e311-s.woff2",
    "/_next/static/media/inter.a1b2c3d4.woff2",
  ]) assert.ok(HASHED.test(p), p);
});

test("unhashed files (dev chunks, manifests) never are", () => {
  for (const p of [
    "/_next/static/chunks/app/page.js",
    "/_next/static/chunks/webpack.js",
    "/_next/static/chunks/main-app.js",
    "/_next/static/development/_buildManifest.js",
    "/_next/static/rmpwv8SP_DxpTHFHbScAi/_buildManifest.js",
  ]) assert.ok(!HASHED.test(p), p);
});

test("unhashed build files go to the network before any cache branch", () => {
  const passThrough = sw.indexOf('if (url.pathname.startsWith("/_next/static/")) return;');
  assert.ok(passThrough > sw.indexOf("HASHED.test(url.pathname)"));
  assert.ok(passThrough < sw.indexOf('url.pathname.startsWith("/health/")'));
});
