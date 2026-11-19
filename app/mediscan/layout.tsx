import type { Metadata } from "next";
import { HealthShell } from "@/components/apps/health/HealthShell";

export const metadata: Metadata = {
  title: "মেডিস্ক্যান — প্রেসক্রিপশন, ডাক্তার ও জরুরি হাসপাতাল",
  description: "Understand a prescription in plain Bangla, find which kind of doctor to see and the nearest emergency hospital. 999 and 16263 on every page. Never a diagnosis.",
};

export default function MediscanLayout({ children }: { children: React.ReactNode }) {
  return <HealthShell>{children}</HealthShell>;
}
