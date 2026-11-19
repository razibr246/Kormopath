import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "আপনার ডেটা ও সেটিংস",
  description: "See what each KormoPath app saved on this device, export a backup or delete it.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
