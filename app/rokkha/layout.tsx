import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "রক্ষা — প্রতারণা ও দুর্যোগে সুরক্ষা", template: "%s | KormoPath" },
  description: "Check a message for known scam signs, pause before sending money, find official helplines and prepare for floods and cyclones.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
