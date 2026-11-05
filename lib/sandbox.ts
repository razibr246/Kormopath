"use client";
import type { ChallengeTest } from "./challenges";
import type { TestResult } from "./types";

// Runs untrusted user code in a throwaway Web Worker: no DOM, no access to the page,
// killed after a hard timeout so an infinite loop can't freeze the app.
const WORKER_SRC = `
self.onmessage = (e) => {
  const { code, fnName, tests } = e.data;
  let fn;
  try { fn = new Function(code + "\\n;return " + fnName + ";")(); }
  catch (err) { self.postMessage({ compileError: String(err && err.message || err) }); return; }
  if (typeof fn !== "function") { self.postMessage({ compileError: fnName + " is not a function" }); return; }
  const results = [];
  for (const t of tests) {
    const assert = (c, m) => { if (!c) throw new Error(m || "assertion failed"); };
    const t0 = performance.now();
    try {
      new Function("fn", "assert", t.code)(fn, assert);
      const ms = performance.now() - t0;
      if (t.budgetMs && ms > t.budgetMs) results.push({ name: t.name, kind: t.kind, pass: false, ms, error: "took " + Math.round(ms) + " ms, budget is " + t.budgetMs + " ms" });
      else results.push({ name: t.name, kind: t.kind, pass: true, ms });
    } catch (err) {
      results.push({ name: t.name, kind: t.kind, pass: false, ms: performance.now() - t0, error: String(err && err.message || err) });
    }
  }
  self.postMessage({ results });
};`;

export function runTests(code: string, fnName: string, tests: ChallengeTest[], timeoutMs = 8000): Promise<{ results: TestResult[]; compileError?: string; ms: number }> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
    const w = new Worker(url);
    const done = (v: { results: TestResult[]; compileError?: string }) => {
      clearTimeout(timer);
      w.terminate();
      URL.revokeObjectURL(url);
      resolve({ ...v, ms: Math.round(performance.now() - t0) });
    };
    const timer = setTimeout(
      () => done({ results: tests.map((t) => ({ name: t.name, kind: t.kind, pass: false, ms: timeoutMs, error: "Timed out. Is there an infinite loop?" })) }),
      timeoutMs,
    );
    w.onmessage = (e) => done(e.data.compileError ? { results: [], compileError: e.data.compileError } : { results: e.data.results });
    w.onerror = (e) => done({ results: [], compileError: e.message });
    w.postMessage({ code, fnName, tests });
  });
}

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
