import type { Metadata } from "next";
import { AdminDemo } from "@/components/apps/health/doctors/AdminDemo";

export const metadata: Metadata = { title: "অ্যাডমিন ডেমো — ডাক্তার ও পেমেন্ট যাচাই", description: "Demo admin desk: verify doctors against BMDC, set fees and verify bKash payments on this device." };

export default function Page() {
  return (
    <main id="main" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <AdminDemo />
    </main>
  );
}
