"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { usePersistentState, storageKey } from "@/lib/clientStore";
import { DEMO_DOCTORS, sanitizeDoctor, withOverrides, type Availability, type Doctor, type DoctorOverride } from "@/lib/health/doctors";
import { sanitizeBookings, type AuditEntry, type Booking } from "@/lib/health/booking";
import { PAYMENT_STATUS_LABEL, type PaymentStatus } from "@/lib/health/payments";
import "./doctors.css";

export const bnNum = (v: number | string) => String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
export const randBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));

/** Drawn avatar (initials), never a photo of a real person. */
export function DoctorAvatar({ initials, availability }: { initials: string; availability: Availability }) {
  return (
    <span className="dr-avatar" aria-hidden>
      <span className="dr-avatar-ring" />
      <span className="dr-avatar-face">{initials}</span>
      <span className={`dr-dot dr-dot-${availability}`} />
    </span>
  );
}

const TONE: Record<string, string> = {
  slate: "border-slate-300 bg-slate-50 text-slate-700",
  amber: "border-amber-300 bg-amber-50 text-amber-900",
  emerald: "border-emerald-300 bg-emerald-50 text-emerald-800",
  red: "border-red-300 bg-red-50 text-red-800",
  sky: "border-sky-300 bg-sky-50 text-sky-800",
};
export const toneClass = (t: string) => TONE[t] ?? TONE.slate;

export function StatusChip({ status, lang = "bn" }: { status: PaymentStatus; lang?: "bn" | "en" }) {
  const l = PAYMENT_STATUS_LABEL[status];
  return <span data-testid="booking-status" data-status={status} className={`inline-flex min-h-[28px] items-center rounded-full border px-2.5 text-[12.5px] font-bold leading-[1.4] ${toneClass(l.tone)}`}>{lang === "bn" ? l.bn : l.en}</span>;
}

/** Tilt a card toward the pointer (fine pointers only; nothing under reduced motion). */
export function TiltCard({ children, className = "", testId }: { children: ReactNode; className?: string; testId?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { el.style.setProperty("--dr-ry", `${(x * 7).toFixed(2)}deg`); el.style.setProperty("--dr-rx", `${(-y * 7).toFixed(2)}deg`); });
    };
    const leave = () => { cancelAnimationFrame(raf); el.style.setProperty("--dr-ry", "0deg"); el.style.setProperty("--dr-rx", "0deg"); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { cancelAnimationFrame(raf); el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, []);
  return <div ref={ref} className={`dr-card ${className}`} data-testid={testId}>{children}</div>;
}

// --- device stores -------------------------------------------------------------------------------

export interface Complaint { id: string; at: string; bookingRef: string; text: string; status: "open" | "resolved" }
export interface AdminState { overrides: Record<string, DoctorOverride>; realDoctors: Doctor[]; complaints: Complaint[]; audit: AuditEntry[] }
const EMPTY_ADMIN: AdminState = { overrides: {}, realDoctors: [], complaints: [], audit: [] };

function sanitizeAdmin(raw: unknown): AdminState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const overrides: Record<string, DoctorOverride> = {};
  if (o.overrides && typeof o.overrides === "object") {
    for (const [k, v] of Object.entries(o.overrides as Record<string, unknown>).slice(0, 100)) {
      if (!v || typeof v !== "object") continue;
      const x = v as Record<string, unknown>;
      overrides[k.slice(0, 60)] = {
        verified: typeof x.verified === "boolean" ? x.verified : undefined,
        bmdcNo: typeof x.bmdcNo === "string" ? x.bmdcNo.slice(0, 20) : undefined,
        bmdcCheckedOn: typeof x.bmdcCheckedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.bmdcCheckedOn) ? x.bmdcCheckedOn : undefined,
        suspended: typeof x.suspended === "boolean" ? x.suspended : undefined,
        feePoisha: typeof x.feePoisha === "number" ? x.feePoisha : undefined,
        followUpFeePoisha: typeof x.followUpFeePoisha === "number" ? x.followUpFeePoisha : undefined,
      };
    }
  }
  const realDoctors = Array.isArray(o.realDoctors) ? o.realDoctors.map(sanitizeDoctor).filter((d): d is Doctor => !!d).slice(0, 50) : [];
  const complaints = Array.isArray(o.complaints) ? o.complaints.filter((c): c is Complaint => !!c && typeof c === "object" && typeof (c as Complaint).text === "string").map((c) => ({ id: String(c.id).slice(0, 40), at: String(c.at).slice(0, 30), bookingRef: String(c.bookingRef ?? "").slice(0, 20), text: c.text.slice(0, 500), status: c.status === "resolved" ? "resolved" as const : "open" as const })).slice(0, 200) : [];
  const audit = Array.isArray(o.audit) ? o.audit.filter((a): a is AuditEntry => !!a && typeof a === "object" && typeof (a as AuditEntry).action === "string").map((a) => ({ at: String(a.at).slice(0, 30), action: a.action.slice(0, 60), target: String(a.target ?? "").slice(0, 80), detail: String(a.detail ?? "").slice(0, 200) })).slice(-500) : [];
  return { overrides, realDoctors, complaints, audit };
}

export const useBookings = () => usePersistentState<Booking[]>(storageKey("mediscan", "bookings"), [], sanitizeBookings);
export const useDoctorAdmin = () => usePersistentState<AdminState>(storageKey("mediscan", "doctorAdmin"), EMPTY_ADMIN, sanitizeAdmin);

/** Every doctor this device knows: the demo profiles (with admin changes) and any real doctors an admin added here. */
export function allDoctors(admin: AdminState): Doctor[] {
  return [...admin.realDoctors, ...withOverrides(DEMO_DOCTORS, admin.overrides)];
}

export const T = (lang: "bn" | "en") => (bn: string, en: string) => (lang === "bn" ? bn : en);
