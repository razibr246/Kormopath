import { NextResponse } from "next/server";

export const runtime = "nodejs";

// FieldShift360's shared plan board needs a shared database. KormoPath has none by design (no accounts, data stays on
// the device), so the board answers "not configured" and field360/src/engine/sharedPlans.js keeps working from this
// browser's own plans (and other open tabs, through BroadcastChannel), saying it is offline.
const off = () => NextResponse.json({ error: "shared plan board not configured: KormoPath keeps plans on this device" }, { status: 503 });
export const GET = off;
export const POST = off;
