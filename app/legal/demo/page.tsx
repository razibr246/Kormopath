import type { Metadata } from "next";
import { DemoDesk } from "@/components/apps/legal/demo/DemoDesk";

export const metadata: Metadata = {
  title: "অফিস ডেমো",
  description: "A labelled demo of how a legal aid application moves through the officer, lawyer, mediator and supervisor desks. Fictional people; not used by any real office.",
};

export default function LegalDemoPage() {
  return <DemoDesk />;
}
