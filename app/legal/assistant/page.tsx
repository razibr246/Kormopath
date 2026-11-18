import type { Metadata } from "next";
import { Assistant } from "@/components/apps/legal/Assistant";

export const metadata: Metadata = {
  title: "জিজ্ঞাসা করুন",
  description: "Ask a legal question in Bangla or English, by text or a voice call. Verified helplines and laws with sources; legal information, not legal advice.",
};

export default function LegalAssistantPage() {
  return <Assistant />;
}
