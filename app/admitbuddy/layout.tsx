import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "অ্যাডমিট বাডি — ভর্তির পরিকল্পনা",
  description: "Match Bangladeshi universities to your GPA, keep an admission checklist and draft your SOP. Dates and requirements come from the official circular.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
