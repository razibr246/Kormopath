import { NextResponse, type NextRequest } from "next/server";

// Reject oversized API bodies before any route parses JSON. Upload routes accept base64 files
// (Zod caps them at 6,000,000 chars); everything else is small text. This is defence in depth:
// zod < 4.6.6 can use excessive memory on oversized collections (GHSA-mrhx-c7xc-m3w5).
const UPLOAD_ROUTES = ["/api/audit", "/api/receipt", "/api/mediscan/ocr"];
const UPLOAD_LIMIT = 6_500_000;
const DEFAULT_LIMIT = 256_000;

export function middleware(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return NextResponse.next();
  const limit = UPLOAD_ROUTES.some((r) => req.nextUrl.pathname === r) ? UPLOAD_LIMIT : DEFAULT_LIMIT;
  const len = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(len) && len > limit) {
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
