import type { Metadata } from "next";
import { ServicesDirectory } from "@/components/apps/health/services/ServicesDirectory";

export const metadata: Metadata = {
  title: "অ্যাম্বুলেন্স ও স্বাস্থ্যসেবা | MediScan BD",
  description: "999 first, then verified government health services: 16263 doctor advice, government hospitals, vaccination, medicines and blood donation, each with its source.",
};

export default function Page() {
  return <ServicesDirectory />;
}
