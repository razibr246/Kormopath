import type { Metadata } from "next";
import { AdminDemo } from "@/components/apps/health/doctors/AdminDemo";
import { adminDeskEnabled } from "@/lib/health/adminGate";

export const metadata: Metadata = {
  title: "অ্যাডমিন ডেমো — শুধু এই ডিভাইসে",
  description: "Demo admin desk on this device only. It cannot take payments.",
  // A demo desk with no login must never appear in search results.
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function Page() {
  if (!adminDeskEnabled()) {
    return (
      <main id="main" className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div data-testid="admin-locked" className="rounded-2xl border border-slate-200 bg-white p-6 space-y-2">
          <h1 className="text-[22px] font-bold text-slate-900">অ্যাডমিন ডেস্ক বন্ধ আছে</h1>
          <p className="text-[15px] text-slate-700">লগইন ছাড়া কেউ যেন ডাক্তারকে &ldquo;যাচাই করা&rdquo; দেখাতে না পারে, তাই এই ডেস্ক এখানে বন্ধ। সার্ভারে লগইনসহ অ্যাডমিন চালু হলে খুলবে।</p>
          <p className="text-[14px] text-slate-500">The admin desk is off here: without a sign-in, anyone could mark a doctor as verified. It opens once a server-side admin with login exists.</p>
        </div>
      </main>
    );
  }
  return (
    <main id="main" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <AdminDemo />
    </main>
  );
}
