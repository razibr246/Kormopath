import type { Metadata } from "next";
import { AdminDemo } from "@/components/apps/health/doctors/AdminDemo";

export const metadata: Metadata = {
  title: "অ্যাডমিন ডেমো — শুধু এই ডিভাইসে",
  description: "Demo admin desk on this device only. It cannot take payments.",
  // A demo desk with no login must never appear in search results.
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function Page() {
  return (
    <main id="main" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <AdminDemo />
    </main>
  );
}
