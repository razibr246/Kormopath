import type { Metadata } from "next";
import { LegalShell } from "@/components/apps/legal/LegalShell";

export const metadata: Metadata = {
  title: { default: "আইনি সহায়তা — বিনামূল্যে আইনি সাহায্যের পথ", template: "%s | আইনি সহায়তা" },
  description: "Whether you may get free government legal aid in Bangladesh, an application draft, mediation prep and spoken legal information. Legal information, not legal advice.",
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return <LegalShell>{children}</LegalShell>;
}
