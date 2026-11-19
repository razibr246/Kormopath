import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "প্রবাহ কোচ — ভাইভা ও কথা বলার অনুশীলন",
  description: "Practise interview and viva answers in Bangla or English and get structured feedback. Coaching, not a certification.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
