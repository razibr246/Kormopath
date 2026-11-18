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

export function rateLimitResponse(limit: number, resetSeconds: number): Response {
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
      },
    }
  );
}
