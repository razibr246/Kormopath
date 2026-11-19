import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "সহজ বাজেট — সংসারের হিসাব",
  description: "Speak or type expenses, set monthly budgets, track dhar/baki, mess meals, the bazar list and zakat. Saved on this device.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
