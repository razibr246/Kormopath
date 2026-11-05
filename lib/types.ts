import type { CheckedSkill, Extraction, Valuation } from "./audit";
import type { TraceStep } from "./trace";

export interface AuditResult {
  engine: string;
  extraction: Extraction;
  skills: CheckedSkill[];
  valuation: Valuation;
  raw: string | null;
  trace: TraceStep[];
}

export interface TestResult {
  name: string;
  kind: "correctness" | "edge" | "performance";
  pass: boolean;
  ms: number;
  error?: string;
}

export interface VivaGrade {
  engine: string;
  covered: { point: number; quote: string; verified: boolean }[];
  score: number;
  total: number;
  feedback: string;
  raw: string | null;
}

export interface PassportState {
  token: string;
  id: string;
}

export interface LedgerRow {
  id: string;
  date: string;
  payer: string;
  provider: string;
  amountUsd: number;
  bdtReceived: number | null;
  reference: string;
  source: "receipt" | "manual";
  checked: boolean;
}
