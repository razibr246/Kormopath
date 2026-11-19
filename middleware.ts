import { NextResponse, type NextRequest } from "next/server";
import { checkRequestBody } from "./lib/bodyGuard";

// Reject oversized or unsized API bodies before any route parses JSON. The rules (and the upload routes that may send
// base64 files up to 6.5 MB) live in lib/bodyGuard.ts, which tests/middleware.test.ts covers.
export function middleware(req: NextRequest) {
  const verdict = checkRequestBody(req.method, req.nextUrl.pathname, req.headers);
  if (verdict) return NextResponse.json({ error: verdict.error }, { status: verdict.status });
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
