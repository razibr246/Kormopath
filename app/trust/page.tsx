import type { Metadata } from "next";
import { TEXT_MODELS } from "@/lib/gemini";
import results from "@/lib/eval-results.json";
import { TrustView, type EvalResults } from "./TrustView";

export const metadata: Metadata = {
  title: "Measured results",
  description: "KormoPath's AI checks, measured on fixed inputs by a repeatable script: evidence quotes, hallucination probes, the pitch amount guard, coach quotes and fee reconciliation.",
};

export default function TrustPage() {
  return <TrustView results={results as unknown as EvalResults} primaryModel={TEXT_MODELS[0] ?? "gemini-4-hydrogen"} />;
}
