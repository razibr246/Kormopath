import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "চুক্তিগার্ড — চুক্তি, ইনভয়েস ও পেমেন্ট",
  description: "Reviewed bilingual contract templates, invoices and payment planning for Bangladesh-based freelancers. Legal text should be checked by a professional.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
