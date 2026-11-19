import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "আমার পথ — সুযোগ ও পরিকল্পনা",
  description: "Find jobs, scholarships and farmer programmes, track applications and follow-up dates on this device. Confirm every detail at the source.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
