import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "মীমাংসার খসড়া প্রিন্ট",
  description: "Print your settlement draft, stamped as a draft and not a court document.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
