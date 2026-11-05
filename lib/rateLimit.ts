// In-memory sliding token-bucket rate limiter per IP address
interface RateLimitRecord {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, RateLimitRecord>();

// Clean up stale IP records every 10 minutes to prevent memory leaks
// unref() so this timer never keeps a Node process (tests, build workers) alive on its own.
if (typeof setInterval !== "undefined") {
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of buckets.entries()) {
      if (now - record.lastRefill > 600_000) {
        buckets.delete(ip);
      }
    }
  }, 600_000);
  (sweep as { unref?: () => void }).unref?.();
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

  // Extract client IP address from standard headers
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "127.0.0.1";

  const now = Date.now();
  const key = `${options.bucket ?? "default"}:${ip}`;
  let record = buckets.get(key);

  if (!record) {
    record = { tokens: limit, lastRefill: now };
    buckets.set(key, record);
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
