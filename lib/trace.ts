export type TraceStatus = "ok" | "warn" | "fallback" | "fail";

export interface TraceStep {
  agent: string; // e.g. "Auditor"
  tool: string; // e.g. "gemini-2.5-flash", "github-api", "zod", "evidence-check"
  detail: string;
  ms: number;
  status: TraceStatus;
  at?: number; // epoch ms, filled on the client
}

export class Tracer {
  steps: TraceStep[] = [];
  constructor(private agent: string) {}
  async time<T>(tool: string, fn: () => Promise<T>, describe: (r: T) => string, status: (r: T) => TraceStatus = () => "ok"): Promise<T> {
    const t0 = performance.now();
    const r = await fn();
    this.steps.push({ agent: this.agent, tool, detail: describe(r), ms: Math.round(performance.now() - t0), status: status(r) });
    return r;
  }
  log(tool: string, detail: string, status: TraceStatus = "ok", ms = 0) {
    this.steps.push({ agent: this.agent, tool, detail, ms, status });
  }
}
