import type { Metadata } from "next";
import { AssistantPage } from "@/components/apps/health/assistant/AssistantPage";

export const metadata: Metadata = {
  title: "কোন ডাক্তার দেখাব? | MediScan BD",
  description: "Check emergency warning signs first, then find which kind of doctor to see and what to tell them. Not a diagnosis, never medicine advice.",
};

export default function Page() {
  return <AssistantPage />;
}
