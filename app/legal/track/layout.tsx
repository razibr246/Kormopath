import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "আমার মামলার সময়রেখা",
  description: "Keep your own case timeline and next dates on this device.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
