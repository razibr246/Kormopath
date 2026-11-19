import { test } from "node:test";
import assert from "node:assert/strict";
import { DEMO_DOCTORS, filterDoctors, isRealBookable, upcomingSlots, withOverrides, sanitizeDoctor, normalizeBdMobile, type Doctor } from "../lib/health/doctors.ts";
import { PAYMENT_CONFIG, checkTrxId, canMove, formatTaka } from "../lib/health/payments.ts";
import { createBooking, submitTrxId, adminSetStatus, canJoin, bookingMessage, sanitizeBookings, makeRoom, type Booking } from "../lib/health/booking.ts";

let seed = 7;
const rand = (n: number) => Uint8Array.from({ length: n }, () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) % 256);
const NOW = "2026-11-18T09:00:00.000Z";

test("only the five fictional demo doctors ship, none bookable for real", () => {
  assert.deepEqual(DEMO_DOCTORS.map((d) => d.nameEn), ["Dr. Sample Ahmed", "Dr. Sample Rahman", "Dr. Sample Karim", "Dr. Sample Khan", "Dr. Sample Akter"]);
  for (const d of DEMO_DOCTORS) {
    assert.equal(d.demo, true);
    assert.equal(d.bmdcNo, null);
    assert.equal(d.consultPhone, null);
    assert.equal(isRealBookable(d), false);
  }
});

test("admin 'verifying' a demo doctor never makes it real or gives it a phone", () => {
  const [d] = withOverrides(DEMO_DOCTORS, { "demo-ahmed": { verified: true, bmdcNo: "A-123", bmdcCheckedOn: "2026-11-18", consultPhone: "01700000000" } });
  assert.equal(d.demo, true);
  assert.equal(d.consultPhone, null);
  assert.equal(isRealBookable(d), false);
});

test("a real doctor is bookable only with BMDC number, check date and not suspended", () => {
  const real = sanitizeDoctor({ id: "r1", nameEn: "Dr Real", feePoisha: 50000, followUpFeePoisha: 30000, types: ["audio"], days: [0], slots: ["10:00"], verified: true, bmdcNo: "A-12345", bmdcCheckedOn: "2026-11-18", consultPhone: "01712345678" }) as Doctor;
  assert.equal(isRealBookable(real), true);
  assert.equal(isRealBookable({ ...real, bmdcCheckedOn: null }), false);
  assert.equal(isRealBookable({ ...real, suspended: true }), false);
  assert.equal(normalizeBdMobile("+8801712345678"), "01712345678");
});

test("filters by specialty, fee, language and type", () => {
  assert.deepEqual(filterDoctors(DEMO_DOCTORS, { specialtyId: "cardiology" }).map((d) => d.id), ["demo-khan"]);
  assert.ok(filterDoctors(DEMO_DOCTORS, { maxFeePoisha: 50000 }).every((d) => d.feePoisha <= 50000));
  assert.ok(filterDoctors(DEMO_DOCTORS, { type: "audio" }).every((d) => d.types.includes("audio")));
  assert.deepEqual(filterDoctors(DEMO_DOCTORS, { q: "akter" }).map((d) => d.id), ["demo-akter"]);
});

test("slots skip past times today (Dhaka) and the doctor's off days", () => {
  const d = DEMO_DOCTORS[0]; // Sun–Thu
  const slots = upcomingSlots(d, new Date("2026-11-18T13:30:00Z"), 7); // 19:30 Dhaka, Wednesday
  assert.ok(slots.every((s) => !(s.date === "2026-11-18" && s.time <= "19:30")));
  assert.ok(slots.every((s) => [0, 1, 2, 3, 4].includes(new Date(s.date + "T00:00:00Z").getUTCDay())));
});

test("payment config is the owner's personal bKash, not a merchant API", () => {
  // Real payments stay off (no number in the public bundle) until doctors are verified on a server.
  assert.equal(PAYMENT_CONFIG.receiver, null);
  assert.equal(PAYMENT_CONFIG.merchantApi, false);
});

test("TrxID: PIN/OTP-looking values are refused; format checked", () => {
  assert.deepEqual(checkTrxId("12345"), { ok: false, reason: "pin_like" });
  assert.deepEqual(checkTrxId("123456"), { ok: false, reason: "pin_like" });
  assert.deepEqual(checkTrxId("abc"), { ok: false, reason: "format" });
  assert.deepEqual(checkTrxId(" 9a8b7c6d5e "), { ok: true, trxId: "9A8B7C6D5E" });
  assert.equal(canMove("pending", "verified"), true);
  assert.equal(canMove("unpaid", "verified"), false);
  assert.equal(formatTaka(12345600, "en"), "৳1,23,456");
});

test("booking flow: no double slot, no duplicate TrxID, paid only after admin verifies", () => {
  const d = DEMO_DOCTORS[0];
  const a = createBooking([], { doctor: d, type: "video", date: "2026-11-22", time: "10:00" }, NOW, rand);
  assert.ok(a.ok);
  const b1 = (a as { booking: Booking }).booking;
  assert.equal(b1.demo, true);
  assert.ok(b1.room && b1.room.length > 30);
  const clash = createBooking([b1], { doctor: d, type: "audio", date: "2026-11-22", time: "10:00" }, NOW, rand);
  assert.deepEqual(clash, { ok: false, error: "slot_taken" });
  let list: Booking[] = [b1];
  const s1 = submitTrxId(list, b1.id, "9A8B7C6D5E", NOW);
  assert.ok(s1.ok); list = (s1 as { list: Booking[] }).list;
  assert.equal(list[0].status, "pending");
  assert.equal(canJoin(list[0]), false);
  const b2 = (createBooking(list, { doctor: d, type: "audio", date: "2026-11-22", time: "10:30" }, NOW, rand) as { booking: Booking }).booking;
  list = [...list, b2];
  assert.deepEqual(submitTrxId(list, b2.id, "9a8b7c6d5e", NOW), { ok: false, error: "duplicate" });
  assert.deepEqual(adminSetStatus(list, b2.id, "verified", "", NOW), { ok: false, error: "wrong_status" });
  assert.deepEqual(adminSetStatus(list, b1.id, "failed", " ", NOW), { ok: false, error: "no_reason" });
  const v = adminSetStatus(list, b1.id, "verified", "seen in bKash app", NOW);
  assert.ok(v.ok); list = (v as { list: Booking[] }).list;
  assert.equal(list[0].status, "verified");
  assert.equal(canJoin(list[0]), false, "demo bookings never open a call");
  assert.ok(/KP-/.test(bookingMessage(list[0], "en")) && !/symptom/i.test(bookingMessage(list[0], "en")));
});

test("follow-up needs a verified earlier booking with the same doctor and uses the follow-up fee", () => {
  const d = DEMO_DOCTORS[0];
  const b1 = (createBooking([], { doctor: d, type: "audio", date: "2026-11-22", time: "10:00" }, NOW, rand) as { booking: Booking }).booking;
  assert.deepEqual(createBooking([b1], { doctor: d, type: "audio", date: "2026-11-23", time: "10:00", kind: "followup", parentId: b1.id }, NOW, rand), { ok: false, error: "no_parent" });
  const verified = { ...b1, trxId: "AB12CD34EF", status: "verified" as const };
  const f = createBooking([verified], { doctor: d, type: "audio", date: "2026-11-23", time: "10:00", kind: "followup", parentId: b1.id }, NOW, rand);
  assert.ok(f.ok && f.booking.feePoisha === d.followUpFeePoisha);
});

test("sanitizeBookings drops junk and keeps valid rows", () => {
  const b = (createBooking([], { doctor: DEMO_DOCTORS[1], type: "video", date: "2026-11-22", time: "16:00" }, NOW, rand) as { booking: Booking }).booking;
  const out = sanitizeBookings([b, { id: "x" }, null, "junk"]);
  assert.equal(out?.length, 1);
  assert.equal(out?.[0].ref, b.ref);
  assert.ok(makeRoom(rand).startsWith("KormoPath-Consult-"));
});

test("admin demo: banner says demo/this device only/no payments, page is noindex, and no payment number can be shown", async () => {
  const { readFileSync } = await import("node:fs");
  const admin = readFileSync(new URL("../components/apps/health/doctors/AdminDemo.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../app/mediscan/admin/page.tsx", import.meta.url), "utf8");
  assert.match(admin, /data-testid="admin-demo-banner"/);
  assert.match(admin, /শুধু এই ডিভাইসে/);
  assert.match(admin, /cannot take payments/);
  // The admin desk never reads or sets the receiving number.
  assert.doesNotMatch(admin, /PAYMENT_CONFIG|receiver|realPaymentsEnabled/);
  assert.match(page, /robots:\s*\{\s*index:\s*false/);
  assert.equal(PAYMENT_CONFIG.receiver, null);
});

test("admin desk: hidden in production unless NEXT_PUBLIC_HEALTH_ADMIN_DEMO=on, open in development", async () => {
  const { adminDeskEnabled } = await import("../lib/health/adminGate.ts");
  assert.equal(adminDeskEnabled({ NODE_ENV: "production" }), false);
  assert.equal(adminDeskEnabled({ NODE_ENV: "production", NEXT_PUBLIC_HEALTH_ADMIN_DEMO: "yes" }), false);
  assert.equal(adminDeskEnabled({ NODE_ENV: "production", NEXT_PUBLIC_HEALTH_ADMIN_DEMO: "on" }), true);
  assert.equal(adminDeskEnabled({ NODE_ENV: "development" }), true);
});
