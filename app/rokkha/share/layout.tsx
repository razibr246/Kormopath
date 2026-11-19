import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "রক্ষা — শেয়ার করা বার্তা যাচাই",
  description: "Check a shared message for known scam signs. The text stays on your device.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
