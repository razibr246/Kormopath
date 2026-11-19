import test from "node:test";
import assert from "node:assert/strict";
import { checkRequestBody, UPLOAD_ROUTES, UPLOAD_LIMIT, DEFAULT_LIMIT } from "../lib/bodyGuard.ts";

const h = (o: Record<string, string> = {}) => new Headers(o);

test("middleware: GET, HEAD and OPTIONS always pass", () => {
  for (const m of ["GET", "HEAD", "OPTIONS", "get"]) assert.equal(checkRequestBody(m, "/api/pitch", h({ "transfer-encoding": "chunked" })), null);
});

test("middleware: small JSON POST with Content-Length passes", () => {
  assert.equal(checkRequestBody("POST", "/api/pitch", h({ "content-length": "512" })), null);
  assert.equal(checkRequestBody("POST", "/api/pitch", h({ "content-length": "0" })), null);
  assert.equal(checkRequestBody("POST", "/api/pitch", h({ "content-length": String(DEFAULT_LIMIT) })), null);
});

test("middleware: oversized bodies get 413, with the larger limit only on upload routes", () => {
  assert.equal(checkRequestBody("POST", "/api/pitch", h({ "content-length": String(DEFAULT_LIMIT + 1) }))?.status, 413);
  assert.equal(checkRequestBody("POST", "/api/audit", h({ "content-length": String(DEFAULT_LIMIT + 1) })), null);
  assert.equal(checkRequestBody("POST", "/api/audit", h({ "content-length": String(UPLOAD_LIMIT + 1) }))?.status, 413);
  // Only exact upload paths get the big limit.
  assert.equal(checkRequestBody("POST", "/api/audit/extra", h({ "content-length": String(DEFAULT_LIMIT + 1) }))?.status, 413);
});

test("middleware: POST/PUT/PATCH without Content-Length on a non-upload route gets 411", () => {
  for (const m of ["POST", "PUT", "PATCH"]) {
    const v = checkRequestBody(m, "/api/buddy/chat", h());
    assert.equal(v?.status, 411, m);
    assert.match(v!.error, /Content-Length is required/);
  }
  assert.equal(checkRequestBody("DELETE", "/api/buddy/chat", h()), null, "DELETE carries no body");
});

test("middleware: upload routes may stream without Content-Length", () => {
  for (const r of UPLOAD_ROUTES) {
    assert.equal(checkRequestBody("POST", r, h()), null, r);
    assert.equal(checkRequestBody("POST", r, h({ "transfer-encoding": "chunked" })), null, r);
  }
});

test("middleware: chunked transfer encoding is refused on non-upload routes", () => {
  assert.equal(checkRequestBody("POST", "/api/pitch", h({ "transfer-encoding": "gzip, Chunked" }))?.status, 411);
  assert.equal(checkRequestBody("POST", "/api/pitch", h({ "transfer-encoding": "chunked", "content-length": "10" }))?.status, 411);
});

test("middleware: malformed Content-Length gets 400", () => {
  for (const bad of ["-1", "abc", "1e9", "12.5", "", "99999999999999999999"]) {
    assert.equal(checkRequestBody("POST", "/api/pitch", h({ "content-length": bad }))?.status, 400, JSON.stringify(bad));
  }
});

test("middleware: middleware.ts delegates to the tested guard and only matches /api", async () => {
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(new URL("../middleware.ts", import.meta.url), "utf8");
  assert.match(src, /checkRequestBody\(req\.method, req\.nextUrl\.pathname, req\.headers\)/);
  assert.match(src, /matcher: "\/api\/:path\*"/);
});
