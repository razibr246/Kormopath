import type { Metadata } from "next";
import { Appointments } from "@/components/apps/health/doctors/Appointments";

export const metadata: Metadata = { title: "আমার অ্যাপয়েন্টমেন্ট", description: "Your consultation bookings, payment status and receipts, kept on this phone." };

export default function Page() {
  return (
    <main id="main" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <Appointments />
    </main>
  );
}
