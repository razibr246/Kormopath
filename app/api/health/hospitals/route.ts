import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimitShared, rateLimitResponse } from "@/lib/rateLimit";
import { Tracer } from "@/lib/trace";
import { BD_BOUNDS, MAX_RADIUS_KM, OSM_COPYRIGHT, OVERPASS_POLICY, cacheKey, overpassQuery, parseOverpass, type Place } from "@/lib/health/hospitals";

export const runtime = "nodejs";
export const maxDuration = 30;

/*
 * Hospitals, emergency clinics and ambulance stations near a point, from OpenStreetMap via the Overpass API.
 * No key. Fair use is about 10,000 requests and 1 GB a day per user (OVERPASS_POLICY), so results are cached for
 * 10 minutes per ~1 km cell and the route is rate limited. The exact position is never stored or logged; only the
 * rounded cell is a cache key. When Overpass is busy or down the route says so (503) and the page falls back to the
 * 999 / 16263 buttons. Nothing is invented: every hospital, phone and facility comes from the map data.
 */
const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
// A plain product token: overpass-api.de answered 406 to a User-Agent with a "(+url)" comment (checked 2026-11-18).
const USER_AGENT = "KormoPath-health/1.0";
const TTL_MS = 10 * 60_000;
const cache = new Map<string, { at: number; places: Place[]; osmBase: string | null }>();

const Query = z.object({
  lat: z.coerce.number().min(BD_BOUNDS.minLat).max(BD_BOUNDS.maxLat),
  lon: z.coerce.number().min(BD_BOUNDS.minLon).max(BD_BOUNDS.maxLon),
  r: z.coerce.number().int().min(1).max(MAX_RADIUS_KM).default(10),
});

async function fetchOverpass(tracer: Tracer, query: string): Promise<{ json: unknown; endpoint: string } | null> {
  for (const endpoint of ENDPOINTS) {
    const t0 = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12_000);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json", "user-agent": USER_AGENT },
        body: new URLSearchParams({ data: query }).toString(),
        cache: "no-store",
      });
      if (!res.ok) { tracer.log("overpass", `${new URL(endpoint).host} answered HTTP ${res.status}`, "warn", Date.now() - t0); continue; }
      const json = await res.json();
      tracer.log("overpass", `${new URL(endpoint).host} answered`, "ok", Date.now() - t0);
      return { json, endpoint };
    } catch (e) {
      tracer.log("overpass", `${new URL(endpoint).host}: ${(e as Error).name === "AbortError" ? "timed out" : "unreachable"}`, "warn", Date.now() - t0);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

export async function GET(req: Request) {
  const rl = await checkRateLimitShared(req, { limit: 20, windowMs: 60_000, bucket: "health-hospitals" });
  if (!rl.success) return rateLimitResponse(rl.limit, rl.resetSeconds);

  const sp = new URL(req.url).searchParams;
  const p = Query.safeParse({ lat: sp.get("lat"), lon: sp.get("lon"), r: sp.get("r") ?? undefined });
  if (!p.success) return NextResponse.json({ error: "অবস্থানটি বাংলাদেশের ভেতরে হতে হবে।", errorEn: "The location must be inside Bangladesh." }, { status: 400 });
  const { lat, lon, r } = p.data;
  const tracer = new Tracer("HospitalFinder");
  const source = { osm: OSM_COPYRIGHT, policy: OVERPASS_POLICY };

  const key = cacheKey(lat, lon, r);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    tracer.log("cache", "Served from a recent search of this area (under 10 minutes old)", "ok");
    return NextResponse.json({ places: hit.places, osmBase: hit.osmBase, fetchedAt: new Date(hit.at).toISOString(), radiusKm: r, source, trace: tracer.steps }, { headers: { "Cache-Control": "no-store" } });
  }

  const got = await fetchOverpass(tracer, overpassQuery(lat, lon, r * 1000));
  if (!got) {
    tracer.log("fallback", "Map data unavailable right now: call 999 or 16263, or try again in a minute", "fallback");
    return NextResponse.json({
      error: "ম্যাপের তথ্য এখন আনা যাচ্ছে না। জরুরি হলে এখনই ৯৯৯-এ ফোন করুন।",
      errorEn: "Map data is unavailable right now. In an emergency, call 999 now.",
      source, trace: tracer.steps,
    }, { status: 503 });
  }
  const places = parseOverpass(got.json);
  const osmBase = (got.json as { osm3s?: { timestamp_osm_base?: unknown } })?.osm3s?.timestamp_osm_base;
  const entry = { at: Date.now(), places, osmBase: typeof osmBase === "string" ? osmBase : null };
  tracer.log("parse", `${places.length} named places with a position in Bangladesh`, places.length ? "ok" : "warn");
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  cache.set(key, entry);
  return NextResponse.json({ places, osmBase: entry.osmBase, fetchedAt: new Date(entry.at).toISOString(), radiusKm: r, source, trace: tracer.steps }, { headers: { "Cache-Control": "no-store" } });
}
