import type { Metadata } from "next";
import { DoctorDirectory } from "@/components/apps/health/doctors/DoctorDirectory";

export const metadata: Metadata = { title: "ডাক্তার খুঁজুন — ফোন ও ভিডিও পরামর্শ", description: "Find a doctor and book an audio or video consultation. Demo profiles until a BMDC-verified doctor is added." };

export default function Page() {
  return (
    <main id="main" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <DoctorDirectory />
    </main>
  );
}
