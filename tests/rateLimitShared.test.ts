import test from "node:test";
import assert from "node:assert/strict";
import {
  UpstashRateLimitStore,
  remoteStoreFromEnv,
  setRemoteRateLimitStore,
  checkRateLimitShared,
  resetRateLimits,
  type RemoteRateLimitStore,
} from "../lib/rateLimit.ts";

const req = (ip = "103.205.180.12") => new Request("http://x/api/pitch", { headers: { "x-real-ip": ip } });

// A fake Upstash REST endpoint: implements the INCR / PEXPIRE NX / PTTL pipeline against a Map.
function fakeUpstash() {
  const data = new Map<string, { n: number; expiresAt: number | null }>();
  const calls: Array<{ url: string; auth: string; body: unknown }> = [];
  let now = 1_000_000;
  const fetchImpl = async (url: string, init: { headers: Record<string, string>; body: string }) => {
    const body = JSON.parse(init.body) as string[][];
    calls.push({ url, auth: init.headers.authorization, body });
    const results = body.map(([cmd, key, ...args]) => {
      let e = data.get(key);
      if (e && e.expiresAt !== null && e.expiresAt <= now) { data.delete(key); e = undefined; }
      if (cmd === "INCR") { const n = (e?.n ?? 0) + 1; data.set(key, { n, expiresAt: e?.expiresAt ?? null }); return { result: n }; }
      if (cmd === "PEXPIRE") { if (e && e.expiresAt === null) { e.expiresAt = now + Number(args[0]); return { result: 1 }; } return { result: 0 }; }
      if (cmd === "PTTL") return { result: e?.expiresAt ? e.expiresAt - now : -1 };
      return { error: "unknown" };
    });
    return { ok: true, status: 200, json: async () => results };
  };
  return { fetchImpl, calls, data, advance: (ms: number) => { now += ms; } };
}

test("rateLimitShared: no env vars means no remote store", () => {
  assert.equal(remoteStoreFromEnv({}), null);
  assert.equal(remoteStoreFromEnv({ UPSTASH_REDIS_REST_URL: "https://a.upstash.io" }), null, "token required");
  assert.equal(remoteStoreFromEnv({ UPSTASH_REDIS_REST_URL: "http://plain", UPSTASH_REDIS_REST_TOKEN: "t" }), null, "https only");
  assert.ok(remoteStoreFromEnv({ UPSTASH_REDIS_REST_URL: "https://a.upstash.io", UPSTASH_REDIS_REST_TOKEN: "t" }) instanceof UpstashRateLimitStore);
  assert.ok(remoteStoreFromEnv({ KV_REST_API_URL: "https://kv.vercel", KV_REST_API_TOKEN: "t" }) instanceof UpstashRateLimitStore);
});

test("rateLimitShared: Upstash store sends one authenticated pipeline and counts in a fixed window", async () => {
  const f = fakeUpstash();
  const store = new UpstashRateLimitStore("https://a.upstash.io/", "secret", f.fetchImpl);
  const r1 = await store.hit("pitch:1.2.3.4", 60_000);
  const r2 = await store.hit("pitch:1.2.3.4", 60_000);
  assert.deepEqual([r1.count, r2.count], [1, 2]);
  assert.equal(r2.resetMs, 60_000);
  assert.equal(f.calls[0].url, "https://a.upstash.io/pipeline");
  assert.equal(f.calls[0].auth, "Bearer secret");
  assert.deepEqual(f.calls[0].body, [["INCR", "kormopath:rl:pitch:1.2.3.4"], ["PEXPIRE", "kormopath:rl:pitch:1.2.3.4", "60000", "NX"], ["PTTL", "kormopath:rl:pitch:1.2.3.4"]]);
  f.advance(60_001);
  assert.equal((await store.hit("pitch:1.2.3.4", 60_000)).count, 1, "window resets after expiry");
});

test("rateLimitShared: limit is enforced through the remote store", async () => {
  const f = fakeUpstash();
  setRemoteRateLimitStore(new UpstashRateLimitStore("https://a.upstash.io", "t", f.fetchImpl));
  try {
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await checkRateLimitShared(req(), { limit: 3, windowMs: 60_000, bucket: "t1" }));
    assert.deepEqual(results.map((r) => r.success), [true, true, true, false]);
    assert.deepEqual(results.map((r) => r.remaining), [2, 1, 0, 0]);
    assert.ok(results.every((r) => r.store === "remote"));
    assert.equal(results[3].resetSeconds, 60);
    // A different IP has its own budget.
    assert.equal((await checkRateLimitShared(req("8.8.8.8"), { limit: 3, bucket: "t1" })).success, true);
  } finally {
    setRemoteRateLimitStore(undefined);
  }
});

test("rateLimitShared: store failure or bad reply falls back to the in-memory limiter", async () => {
  resetRateLimits();
  const failing: RemoteRateLimitStore = { hit: async () => { throw new Error("down"); } };
  setRemoteRateLimitStore(failing);
  try {
    const r = await checkRateLimitShared(req(), { limit: 2, bucket: "t2" });
    assert.equal(r.store, "memory");
    assert.equal(r.success, true);
    await checkRateLimitShared(req(), { limit: 2, bucket: "t2" });
    assert.equal((await checkRateLimitShared(req(), { limit: 2, bucket: "t2" })).success, false, "memory limit still applies");
  } finally {
    setRemoteRateLimitStore(undefined);
    resetRateLimits();
  }
  const bad = new UpstashRateLimitStore("https://a", "t", async () => ({ ok: false, status: 401, json: async () => ({}) }));
  await assert.rejects(bad.hit("k", 1000), /HTTP 401/);
  const garbled = new UpstashRateLimitStore("https://a", "t", async () => ({ ok: true, status: 200, json: async () => [{ error: "WRONGPASS" }] }));
  await assert.rejects(garbled.hit("k", 1000), /unexpected reply/);
});

test("rateLimitShared: without a remote store it is the in-memory limiter", async () => {
  resetRateLimits();
  setRemoteRateLimitStore(null);
  try {
    const r = await checkRateLimitShared(req(), { limit: 1, bucket: "t3" });
    assert.equal(r.store, "memory");
    assert.equal((await checkRateLimitShared(req(), { limit: 1, bucket: "t3" })).success, false);
  } finally {
    setRemoteRateLimitStore(undefined);
    resetRateLimits();
  }
});

test("the shared store only ever sees a hash of the IP, never the address itself", async () => {
  const { checkRateLimitShared, setRemoteRateLimitStore } = await import("../lib/rateLimit.ts");
  const seen: string[] = [];
  setRemoteRateLimitStore({ hit: async (key: string) => { seen.push(key); return { count: 1, resetMs: 60_000 }; } });
  try {
    const req = new Request("https://x.test/api/pitch", { method: "POST", headers: { "x-forwarded-for": "203.0.113.7" } });
    const r = await checkRateLimitShared(req, { bucket: "pitch" });
    assert.equal(r.store, "remote");
    assert.equal(seen.length, 1);
    assert.ok(!seen[0].includes("203.0.113.7"), seen[0]);
    assert.match(seen[0], /^pitch:[0-9a-f]{32}$/);
  } finally {
    setRemoteRateLimitStore(null);
  }
});
