// In-memory & pluggable token-bucket rate limiter per IP address
// Protected against IP spoofing, header injection, and unbounded memory growth.

export interface RateLimitRecord {
  tokens: number;
  lastRefill: number;
}

export interface RateLimitStore {
  get(key: string): RateLimitRecord | undefined;
  set(key: string, record: RateLimitRecord): void;
  delete(key: string): void;
  clear(): void;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, RateLimitRecord>();

  get(key: string): RateLimitRecord | undefined {
    return this.buckets.get(key);
  }

  set(key: string, record: RateLimitRecord): void {
    this.buckets.set(key, record);
  }

  delete(key: string): void {
    this.buckets.delete(key);
  }

  clear(): void {
    this.buckets.clear();
  }

  sweep(maxAgeMs = 600_000): void {
    const now = Date.now();
    for (const [key, record] of this.buckets.entries()) {
      if (now - record.lastRefill > maxAgeMs) {
        this.buckets.delete(key);
      }
    }
  }
}

let activeStore: RateLimitStore = new MemoryRateLimitStore();

// Clean up stale IP records every 10 minutes to prevent memory leaks
// unref() so this timer never keeps a Node process (tests, build workers) alive on its own.
if (typeof setInterval !== "undefined") {
  const sweepTimer = setInterval(() => {
    if (activeStore instanceof MemoryRateLimitStore) {
      activeStore.sweep();
    }
  }, 600_000);
  (sweepTimer as { unref?: () => void }).unref?.();
}

/** Set a custom distributed KV or memory rate limit store */
export function setRateLimitStore(store: RateLimitStore): void {
  activeStore = store;
}

/** Reset all rate limit buckets (useful for test isolation) */
export function resetRateLimits(): void {
  activeStore.clear();
}

const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_REGEX = /^[0-9a-fA-F:]{2,39}$/;

export function isValidIp(ip: string): boolean {
  if (!ip || ip.length > 45) return false;
  return IPV4_REGEX.test(ip) || (ip.includes(":") && IPV6_REGEX.test(ip));
}

/** Returns true for RFC1918 / loopback / link-local addresses */
export function isPrivateIp(ip: string): boolean {
  if (!isValidIp(ip)) return false;
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (ip.startsWith("172.")) {
    const parts = ip.split(".");
    const second = Number(parts[1]);
    if (second >= 16 && second <= 31) return true;
  }
  if (ip.startsWith("169.254.") || ip.startsWith("fe80:") || ip.startsWith("fc00:")) return true;
  return false;
}

/**
 * Extracts and sanitizes the client IP address from request headers.
 * Priority order:
 * 1. cf-connecting-ip (Cloudflare edge authoritative client IP)
 * 2. x-real-ip (Nginx / Vercel edge reverse proxy client IP)
 * 3. x-forwarded-for (Chain: selects first valid public IP or first valid IP)
 * 4. Fallback: "127.0.0.1"
 */
export function extractClientIp(req: Request): string {
  // 1. Cloudflare edge header
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp && isValidIp(cfIp.trim())) {
    return cfIp.trim();
  }

  // 2. Reverse proxy x-real-ip
  const realIp = req.headers.get("x-real-ip");
  if (realIp && isValidIp(realIp.trim())) {
    return realIp.trim();
  }

  // 3. x-forwarded-for chain
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(isValidIp);
    if (parts.length > 0) {
      // Look for the first public client IP in the chain
      const publicIp = parts.find((ip) => !isPrivateIp(ip));
      return publicIp ?? parts[0];
    }
  }

  return "127.0.0.1";
}

export interface RateLimitOptions {
  limit?: number; // max requests per window
  windowMs?: number; // window duration in ms (default: 60s)
  bucket?: string; // separate budget per route, so one endpoint can't exhaust another's limit
}

export function checkRateLimit(
  req: Request,
  options: RateLimitOptions = {}
): {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
} {
  const limit = options.limit ?? 30; // 30 requests per minute by default
  const windowMs = options.windowMs ?? 60_000;

  const ip = extractClientIp(req);
  const now = Date.now();
  const key = `${options.bucket ?? "default"}:${ip}`;
  let record = activeStore.get(key);

  if (!record) {
    record = { tokens: limit, lastRefill: now };
    activeStore.set(key, record);
  }

  // Refill tokens proportional to elapsed time
  const timePassed = now - record.lastRefill;
  const tokensToAdd = Math.floor((timePassed / windowMs) * limit);

  if (tokensToAdd > 0) {
    record.tokens = Math.min(limit, record.tokens + tokensToAdd);
    record.lastRefill = now;
  }

  if (record.tokens > 0) {
    record.tokens -= 1;
    const remaining = record.tokens;
    const resetSeconds = Math.ceil((windowMs - (now - record.lastRefill)) / 1000);
    return { success: true, limit, remaining, resetSeconds };
  }

  const resetSeconds = Math.ceil((windowMs - (now - record.lastRefill)) / 1000);
  return { success: false, limit, remaining: 0, resetSeconds };
}

export function rateLimitResponse(limit: number, resetSeconds: number, store?: "remote" | "memory"): Response {
  return Response.json(
    {
      error: "Too many requests. Please wait before making more queries.",
      retryAfterSeconds: resetSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(resetSeconds),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
        ...(store ? { "X-RateLimit-Store": store } : {}),
      },
    }
  );
}

/* ------------------------------------------------------------------------------------------------
 * Optional shared store (Upstash Redis / Vercel KV REST API).
 *
 * The in-memory buckets above are per server instance, so on a serverless deployment each warm instance has its
 * own budget. When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or Vercel KV's KV_REST_API_URL +
 * KV_REST_API_TOKEN) are set, checkRateLimitShared() counts requests in Redis instead, with a fixed window per
 * key: INCR, then PEXPIRE ... NX, then PTTL, in one pipeline call. Plain fetch, no extra dependency.
 * Without those variables, or if Redis does not answer within REMOTE_TIMEOUT_MS, it uses the in-memory limiter,
 * so a Redis outage never takes the API down.
 * ---------------------------------------------------------------------------------------------- */

export interface RemoteRateLimitStore {
  /** Counts one request against `key` and returns the count in the current window and ms until it resets. */
  hit(key: string, windowMs: number): Promise<{ count: number; resetMs: number }>;
}

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export const REMOTE_TIMEOUT_MS = 800;

export class UpstashRateLimitStore implements RemoteRateLimitStore {
  private readonly url: string;
  private readonly token: string;
  private readonly fetchImpl: FetchLike;
  private readonly prefix: string;
  constructor(url: string, token: string, fetchImpl: FetchLike = fetch as unknown as FetchLike, prefix = "kormopath:rl:") {
    this.url = url.replace(/\/+$/, "");
    this.token = token;
    this.fetchImpl = fetchImpl;
    this.prefix = prefix;
  }

  async hit(key: string, windowMs: number): Promise<{ count: number; resetMs: number }> {
    const k = this.prefix + key;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REMOTE_TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(`${this.url}/pipeline`, {
        method: "POST",
        headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
        body: JSON.stringify([["INCR", k], ["PEXPIRE", k, String(windowMs), "NX"], ["PTTL", k]]),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`Rate limit store HTTP ${res.status}`);
      const out = (await res.json()) as Array<{ result?: unknown; error?: string }>;
      const count = Number(out?.[0]?.result);
      const ttl = Number(out?.[2]?.result);
      if (!Array.isArray(out) || out.some((r) => r?.error) || !Number.isFinite(count)) throw new Error("Rate limit store returned an unexpected reply");
      return { count, resetMs: Number.isFinite(ttl) && ttl > 0 ? ttl : windowMs };
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Builds the shared store from env vars, or returns null when none are configured. */
export function remoteStoreFromEnv(env: Record<string, string | undefined> = process.env, fetchImpl?: FetchLike): RemoteRateLimitStore | null {
  const url = env.UPSTASH_REDIS_REST_URL?.trim() || env.KV_REST_API_URL?.trim();
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim() || env.KV_REST_API_TOKEN?.trim();
  if (!url || !token || !/^https:\/\//.test(url)) return null;
  return new UpstashRateLimitStore(url, token, fetchImpl);
}

let remoteStore: RemoteRateLimitStore | null | undefined; // undefined = not read from env yet

/** Override the shared store (tests), or pass null to force the in-memory limiter. */
export function setRemoteRateLimitStore(store: RemoteRateLimitStore | null | undefined): void {
  remoteStore = store;
}

/**
 * Like checkRateLimit, but counts in Redis when a shared store is configured (see above), so the limit holds
 * across all server instances. Falls back to the in-memory limiter if the store is missing or fails.
 */
/** Hex SHA-256 of an IP (first 32 hex chars), via Web Crypto, for keys stored outside this server. */
export async function hashIp(ip: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(`kormopath-rl:${ip}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

export async function checkRateLimitShared(
  req: Request,
  options: RateLimitOptions = {}
): Promise<{ success: boolean; limit: number; remaining: number; resetSeconds: number; store: "remote" | "memory" }> {
  if (remoteStore === undefined) remoteStore = remoteStoreFromEnv();
  if (remoteStore) {
    const limit = options.limit ?? 30;
    const windowMs = options.windowMs ?? 60_000;
    try {
      // Only a SHA-256 hash of the IP leaves this server: Redis never holds a raw address.
      const key = `${options.bucket ?? "default"}:${await hashIp(extractClientIp(req))}`;
      const { count, resetMs } = await remoteStore.hit(key, windowMs);
      const resetSeconds = Math.max(1, Math.ceil(resetMs / 1000));
      return { success: count <= limit, limit, remaining: Math.max(0, limit - count), resetSeconds, store: "remote" };
    } catch {
      // Store down or slow: keep serving with the per-instance limiter rather than failing open or closed.
    }
  }
  return { ...checkRateLimit(req, options), store: "memory" };
}
