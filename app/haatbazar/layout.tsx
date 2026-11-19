import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "হাটবাজার — কৃষকের হিসাব ও আবহাওয়া",
  description: "Trip margin, truck sharing, district weather and spray windows for farmers, using the prices you were quoted.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
