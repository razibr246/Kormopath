import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidIp,
  isPrivateIp,
  extractClientIp,
  checkRateLimit,
  resetRateLimits,
  setRateLimitStore,
  MemoryRateLimitStore,
  type RateLimitRecord,
  type RateLimitStore,
} from "../lib/rateLimit.ts";

test("rateLimit: isValidIp validates IPv4 and IPv6 strictly", () => {
  assert.equal(isValidIp("127.0.0.1"), true);
  assert.equal(isValidIp("103.205.180.12"), true);
  assert.equal(isValidIp("255.255.255.255"), true);
  assert.equal(isValidIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334"), true);
  assert.equal(isValidIp("::1"), true);

  // Invalid strings, injections, out of bounds
  assert.equal(isValidIp(""), false);
  assert.equal(isValidIp("256.0.0.1"), false);
  assert.equal(isValidIp("1.2.3.4.5"), false);
  assert.equal(isValidIp("127.0.0.1; DROP TABLE users"), false);
  assert.equal(isValidIp("<script>alert(1)</script>"), false);
  assert.equal(isValidIp("../../../etc/passwd"), false);
});

test("rateLimit: isPrivateIp correctly identifies RFC1918 and loopback addresses", () => {
  assert.equal(isPrivateIp("127.0.0.1"), true);
  assert.equal(isPrivateIp("10.0.0.1"), true);
  assert.equal(isPrivateIp("172.16.5.10"), true);
  assert.equal(isPrivateIp("172.31.255.255"), true);
  assert.equal(isPrivateIp("192.168.1.1"), true);
  assert.equal(isPrivateIp("169.254.169.254"), true);

  // Public internet addresses
  assert.equal(isPrivateIp("103.205.180.12"), false);
  assert.equal(isPrivateIp("8.8.8.8"), false);
  assert.equal(isPrivateIp("1.1.1.1"), false);
});

test("rateLimit: extractClientIp follows trusted proxy precedence and ignores spoofed headers", () => {
  // 1. Cloudflare takes highest precedence
  const req1 = new Request("https://kormopath.gov.bd/api/audit", {
    headers: {
      "cf-connecting-ip": "103.205.180.12",
      "x-real-ip": "10.0.0.2",
      "x-forwarded-for": "1.2.3.4",
    },
  });
  assert.equal(extractClientIp(req1), "103.205.180.12");

  // 2. x-real-ip takes precedence over x-forwarded-for when no Cloudflare header
  const req2 = new Request("https://kormopath.gov.bd/api/audit", {
    headers: {
      "x-real-ip": "103.205.180.55",
      "x-forwarded-for": "10.0.0.1, 103.205.180.99",
    },
  });
  assert.equal(extractClientIp(req2), "103.205.180.55");

  // 3. x-forwarded-for finds public IP even if internal proxy prepended private IP
  const req3 = new Request("https://kormopath.gov.bd/api/audit", {
    headers: {
      "x-forwarded-for": "10.0.0.1, 103.205.180.99, 192.168.1.5",
    },
  });
  assert.equal(extractClientIp(req3), "103.205.180.99");

  // 4. Injected or malformed IP falls back safely
  const req4 = new Request("https://kormopath.gov.bd/api/audit", {
    headers: {
      "cf-connecting-ip": "malicious;payload",
      "x-forwarded-for": "hack;injection",
    },
  });
  assert.equal(extractClientIp(req4), "127.0.0.1");
});

test("rateLimit: checkRateLimit enforces token bucket limits and separate buckets", () => {
  resetRateLimits();
  const req = new Request("https://kormopath.gov.bd/api/test", {
    headers: { "x-real-ip": "203.0.113.195" },
  });

  const res1 = checkRateLimit(req, { limit: 3, bucket: "test-route" });
  assert.equal(res1.success, true);
  assert.equal(res1.remaining, 2);

  const res2 = checkRateLimit(req, { limit: 3, bucket: "test-route" });
  assert.equal(res2.success, true);
  assert.equal(res2.remaining, 1);

  const res3 = checkRateLimit(req, { limit: 3, bucket: "test-route" });
  assert.equal(res3.success, true);
  assert.equal(res3.remaining, 0);

  // 4th request exceeds limit
  const res4 = checkRateLimit(req, { limit: 3, bucket: "test-route" });
  assert.equal(res4.success, false);
  assert.equal(res4.remaining, 0);

  // Separate bucket for the same IP still has budget
  const resOther = checkRateLimit(req, { limit: 3, bucket: "other-route" });
  assert.equal(resOther.success, true);
  assert.equal(resOther.remaining, 2);
});

test("rateLimit: custom RateLimitStore adapter pluggability", () => {
  const customStoreMap = new Map<string, RateLimitRecord>();
  const customStore: RateLimitStore = {
    get(key: string) {
      return customStoreMap.get(key);
    },
    set(key: string, record: RateLimitRecord) {
      customStoreMap.set(key, record);
    },
    delete(key: string) {
      customStoreMap.delete(key);
    },
    clear() {
      customStoreMap.clear();
    },
  };

  setRateLimitStore(customStore);
  resetRateLimits();

  const req = new Request("https://kormopath.gov.bd/api/adapter", {
    headers: { "cf-connecting-ip": "198.51.100.42" },
  });

  checkRateLimit(req, { limit: 5, bucket: "adapter-test" });
  assert.equal(customStoreMap.has("adapter-test:198.51.100.42"), true);

  // Restore memory store for other tests
  setRateLimitStore(new MemoryRateLimitStore());
});
