import type { Metadata } from "next";
import { EmergencyFinder } from "@/components/apps/health/emergency/EmergencyFinder";

export const metadata: Metadata = {
  title: "কাছের জরুরি হাসপাতাল",
  description: "Find the nearest hospital that can treat an emergency in Bangladesh, from OpenStreetMap data. Call 999 first. No sign-up, no payment.",
};

export default function EmergencyHospitalPage() {
  return (
    <main id="main" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <EmergencyFinder />
    </main>
  );
}
