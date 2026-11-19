import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "খামারের খাতা — কাজ, পশুপাখি ও খরচ",
  description: "MaathSathi's farm book: daily tasks, livestock and poultry records and crop costs, saved on this device.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
