/* KormoPath service worker: lets visited pages open without a connection.
 * - API calls (/api/*) are never cached: answers stay live and private data never lands in a cache.
 * - Pages: network first; the last good copy is used only when offline; otherwise /offline.
 * - Hashed build assets (/_next/static) are immutable, so they are served cache first.
 * - Map tiles (OSM / MapLibre / Carto) and hospital datasets are cached offline for field and emergency use.
 * Bump VERSION to drop old caches after a release that changes this file's behaviour. */
const VERSION = "kp-v2-5";
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;
const TILES = `${VERSION}-tiles`;

const PRECACHE_ASSETS = [
  "/offline",
  "/favicon.svg",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/health/osm-hospitals-bd.json",
];

const PRECACHE_SHELLS = [
  "/",
  "/workspace",
  "/opportunities",
  "/pricing",
  "/feeguard",
  "/chuktiguard",
  "/admitbuddy",
  "/mediscan",
  "/mediscan/emergency",
  "/shohoj-budget",
  "/krishi",
  "/haatbazar",
  "/rokkha",
  "/legal",
  "/probaho",
  "/judges",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) =>
        cache.addAll(PRECACHE_ASSETS).then(() =>
          Promise.allSettled(
            PRECACHE_SHELLS.map((url) =>
              fetch(url).then((res) => {
                if (res.ok) return cache.put(url, res);
              })
            )
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Map tile caching for divisional/district offline navigation (OpenStreetMap, Carto, MapLibre tiles)
  if (
    url.hostname.includes("tile.openstreetmap.org") ||
    url.hostname.includes("basemaps.cartocdn.com") ||
    url.pathname.endsWith(".pbf") ||
    url.pathname.endsWith(".mvt")
  ) {
    event.respondWith(
      caches.open(TILES).then((cache) =>
        cache.match(request).then((hit) => {
          if (hit) return hit;
          return fetch(request)
            .then((res) => {
              if (res.ok) cache.put(request, res.clone());
              return res;
            })
            .catch(() => hit || new Response(null, { status: 504 }))
        })
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Share target (app/manifest.ts): the shared SMS stays on the phone. Answer here without a network
  // request and move the text after "#", which browsers never send to a server.
  if (url.pathname === "/rokkha/share") {
    const shared = ["title", "text", "url"].map((k) => url.searchParams.get(k) || "").filter(Boolean).join("\n").slice(0, 5000);
    event.respondWith(Response.redirect(new URL("/rokkha#share=" + encodeURIComponent(shared), self.location.origin).href, 303));
    return;
  }

  // Static assets, images, and public GeoJSON hospital datasets
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/health/") ||
    /\.(?:woff2?|png|svg|ico|json)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(ASSETS).then((c) => c.put(request, copy)); }
        return res;
      })),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Only keep plain successful pages; never a page carrying a query (e.g. /verify?t=…).
          if (res.ok && !url.search) { const copy = res.clone(); caches.open(PAGES).then((c) => c.put(request, copy)); }
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match("/offline"))),
    );
  }
});
