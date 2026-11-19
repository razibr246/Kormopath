import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ওয়ার্কস্পেস — সিভি থেকে পেমেন্ট",
  description: "The freelancer workspace: audit your CV, pass a coding viva, draft a reviewed contract and reconcile your payout fees.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
