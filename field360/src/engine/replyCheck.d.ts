// Types for the JavaScript reply checker, so app/api/field360/agent can run it (tsconfig has allowJs off).
export interface ReplyProblem { id: string; level: "fix" | "note"; bn: string; en: string }
export interface Proposal { action: string; text: string; target: string }
export interface ReplyCheck { ok: boolean; problems: ReplyProblem[]; proposals: Proposal[]; ceiling: number; limits: { bn: string; en: string }[] }
export function checkReply(args: { reply: string; proposals: Proposal[]; data: Record<string, unknown>; role: string; message: string; sources?: unknown[]; lang?: string | null }): ReplyCheck;
export function retryNote(problems: ReplyProblem[]): string;
export function repairReply(reply: string, problems: ReplyProblem[], data: Record<string, unknown>, lang?: string): string;
