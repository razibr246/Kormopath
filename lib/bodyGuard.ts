/*
 * Request-size rules for /api/*, used by middleware.ts. NO imports, so tests/middleware.test.ts can run it under
 * node --test (middleware.ts imports next/server, which the test runner cannot load).
 *
 * Why: every non-upload route takes small JSON. Rejecting oversized or unsized bodies before a route parses JSON is
 * defence in depth (zod < 4.6.6 can use excessive memory on oversized collections, GHSA-mrhx-c7xc-m3w5).
 *  - GET/HEAD/OPTIONS: no body expected, always allowed.
 *  - Non-upload routes: POST/PUT/PATCH must declare Content-Length (411 otherwise). Browsers always send it for the
 *    string and JSON bodies this app posts; only streamed or chunked bodies omit it, and nothing streams to these
 *    routes. DELETE may omit it (no body). Chunked transfer encoding is refused (411).
 *  - Upload routes (base64 files): may stream, since Zod still caps the decoded size inside the route.
 *  - Any declared length over the route's limit: 413. A malformed length: 400.
 */

export const UPLOAD_ROUTES = ["/api/audit", "/api/receipt", "/api/mediscan/ocr", "/api/field360/doctor", "/api/krishi/vision"];
export const UPLOAD_LIMIT = 6_500_000;
export const DEFAULT_LIMIT = 256_000;

const NO_BODY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

export interface BodyVerdict { status: 400 | 411 | 413; error: string }

/** Returns null when the request may proceed, or the status and message to reject it with. */
export function checkRequestBody(method: string, pathname: string, headers: { get(name: string): string | null }): BodyVerdict | null {
  const m = method.toUpperCase();
  if (NO_BODY_METHODS.has(m)) return null;

  const isUploadRoute = UPLOAD_ROUTES.includes(pathname);
  const limit = isUploadRoute ? UPLOAD_LIMIT : DEFAULT_LIMIT;
  const rawLength = headers.get("content-length");
  const transferEncoding = headers.get("transfer-encoding")?.toLowerCase() ?? "";

  if (transferEncoding.includes("chunked") && !isUploadRoute) {
    return { status: 411, error: "Chunked transfer encoding is not permitted for standard JSON API endpoints." };
  }

  if (rawLength !== null) {
    const trimmed = rawLength.trim();
    const len = /^\d+$/.test(trimmed) ? Number(trimmed) : NaN;
    if (!Number.isSafeInteger(len)) return { status: 400, error: "Invalid Content-Length header." };
    if (len > limit) return { status: 413, error: "Request payload too large." };
    return null;
  }

  if (!isUploadRoute && BODY_METHODS.has(m)) {
    return { status: 411, error: "Content-Length is required for this endpoint." };
  }
  return null;
}
