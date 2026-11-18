import { NextResponse, type NextRequest } from "next/server";

// Reject oversized API bodies before any route parses JSON. Upload routes accept base64 files
// (Zod caps them at 6,000,000 chars); everything else is small text. This is defence in depth:
// zod < 4.6.6 can use excessive memory on oversized collections (GHSA-mrhx-c7xc-m3w5).
const UPLOAD_ROUTES = ["/api/audit", "/api/receipt", "/api/mediscan/ocr", "/api/field360/doctor"];
const UPLOAD_LIMIT = 6_500_000;
const DEFAULT_LIMIT = 256_000;

export function middleware(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return NextResponse.next();
  }

  const isUploadRoute = UPLOAD_ROUTES.some((r) => req.nextUrl.pathname === r);
  const limit = isUploadRoute ? UPLOAD_LIMIT : DEFAULT_LIMIT;

  const rawLength = req.headers.get("content-length");
  const transferEncoding = req.headers.get("transfer-encoding")?.toLowerCase() ?? "";

  // 1. Guard against chunked transfer-encoding bypassing size limits on non-upload routes
  if (transferEncoding.includes("chunked") && !isUploadRoute) {
    return NextResponse.json(
      { error: "Chunked transfer encoding is not permitted for standard JSON API endpoints." },
      { status: 411 }
    );
  }

  // 2. Content-Length check
  if (rawLength !== null) {
    const len = Number(rawLength);
    if (!Number.isFinite(len) || len < 0) {
      return NextResponse.json({ error: "Invalid Content-Length header." }, { status: 400 });
    }
    if (len > limit) {
      return NextResponse.json({ error: "Request payload too large." }, { status: 413 });
    }
  }

  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
