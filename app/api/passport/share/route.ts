import { NextResponse } from "next/server";
import { z } from "zod";
import { check, issueShare, PassportSchema } from "@/lib/passport";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

const Body = z.object({ token: z.string().min(20).max(8000), fields: z.array(z.enum(["track", "challenge", "tests", "viva"])).min(1).max(4), expiresInDays: z.union([z.literal(1), z.literal(7), z.literal(30)]) });
export async function POST(req: Request) {
  const rl = checkRateLimit(req, { limit: 10, windowMs: 60_000, bucket: "passport-share" });
  if (!rl.success) return rateLimitResponse(rl.limit, rl.resetSeconds);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "শেয়ার সেটিংস যাচাই করুন।" }, { status: 400 });
  const result = check(parsed.data.token);
  if (!result.valid || !result.passport || result.passport.v !== 1) return NextResponse.json({ error: "মূল passport যাচাই হয়নি বা আগেই শেয়ার করা লিংক দেওয়া হয়েছে।" }, { status: 400 });
  const issued = issueShare(PassportSchema.parse(result.passport), parsed.data.fields, parsed.data.expiresInDays);
  return NextResponse.json(issued);
}
