import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ফি-গার্ড — পেআউট ফি তুলনা",
  description: "Compare Payoneer, Wise, bank and bKash payout fees step by step, with the source and check date of every rate.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
