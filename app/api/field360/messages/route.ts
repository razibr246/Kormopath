import { NextResponse } from "next/server";

export const runtime = "nodejs";

// FieldShift360's officer-to-farmer message store needs a shared database. KormoPath has none by design (no accounts, data stays on
// the device), so the store answers "not configured" and field360/src/engine/sharedMessages.js keeps working from this
// browser's own messages (and other open tabs, through BroadcastChannel), saying it is offline.
const off = () => NextResponse.json({ error: "officer message store not configured: KormoPath keeps messages on this device" }, { status: 503 });
export const GET = off;
export const POST = off;
