import type { Metadata } from "next";
import { PricingView } from "./PricingView";

export const metadata: Metadata = {
  title: "প্ল্যান ও মূল্য",
  description: "What is free forever (all safety, emergency and legal help) and what the proposed paid plans add. Payments are not open yet.",
};

export default function PricingPage() {
  return <PricingView />;
}
