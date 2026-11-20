import "server-only";
import type { Tracer } from "./trace";
import { geminiAvailable, groundedSearch } from "./gemini";
import { GROQ, chatJSON, providerAvailable } from "./providers";
import { hedge } from "./structuredCore";

/*
 * Web search with a backup. Gemini's Google-grounded search answers first; when it fails or its search quota is
 * used up, Tavily (TAVILY_API_KEYS / TAVILY_API_KEY) finds pages and Groq writes the answer from those pages only,
 * citing the same links. Either way the result is unverified search output with its sources: the UI must present
 * it that way (AGENTS.md), never as confirmed prices or opportunities.
 */

type Source = { title: string; url: string };
export type SearchResult =
  | { ok: true; answer: string; sources: Source[]; model: string }
  | { ok: false; reason: "quota" | "failed" | "empty" };

const tavilyKeys = () =>
  [...new Set([process.env.TAVILY_API_KEY, process.env.TAVILY_API_KEYS].flatMap((v) => (v ?? "").split(",")).map((k) => k.trim()).filter(Boolean))];

export const searchAvailable = () => geminiAvailable() || tavilyKeys().length > 0;

async function tavily(tracer: Tracer, query: string): Promise<{ answer: string | null; results: Array<Source & { content: string }> } | null> {
  for (const [i, key] of tavilyKeys().entries()) {
    const t0 = performance.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12_000);
    try {
      const r = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ query: query.slice(0, 380), max_results: 6, search_depth: "basic", include_answer: "basic" }),
        signal: ctrl.signal,
      });
      const ms = Math.round(performance.now() - t0);
      if (!r.ok) { tracer.log("tavily", `HTTP ${r.status} (key ${i + 1}); trying the next key`, "warn", ms); continue; }
      const j = (await r.json()) as { answer?: string; results?: Array<{ title?: string; url?: string; content?: string }> };
      const results = (j.results ?? [])
        .filter((x) => typeof x.url === "string" && /^https?:\/\//.test(x.url))
        .map((x) => ({ title: String(x.title ?? x.url).slice(0, 160), url: String(x.url), content: String(x.content ?? "").slice(0, 700) }));
      tracer.log("tavily", `Found ${results.length} pages`, results.length ? "ok" : "warn", ms);
      return { answer: typeof j.answer === "string" ? j.answer : null, results };
    } catch (e) {
      tracer.log("tavily", `${(e as Error).name === "AbortError" ? "timed out" : "failed"} (key ${i + 1})`, "warn", Math.round(performance.now() - t0));
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

/** Tavily pages, then a Groq answer written from those pages only (Bangla, cited as [1], [2]…). */
async function tavilyAnswer(tracer: Tracer, query: string, prompt: string, system?: string): Promise<SearchResult> {
  const found = await tavily(tracer, query);
  if (!found || !found.results.length) return { ok: false, reason: found ? "empty" : "failed" };
  const sources: Source[] = found.results.map(({ title, url }) => ({ title, url }));
  if (providerAvailable(GROQ)) {
    const pages = found.results.map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.content}`).join("\n\n");
    const res = await chatJSON(
      tracer,
      GROQ,
      `${system ?? ""}\nAnswer from the numbered pages below ONLY. Write every sentence in Bangla (Bengali script), no English sentences; keep names as they are. Never add facts, prices, dates or numbers that are not in the pages, and cite pages as [1], [2]. If the pages do not answer the question, say so. Return JSON {"answer": string}.`,
      `Question and instructions:\n${prompt}\n\nPages:\n${pages}`,
      12_000,
      8_000,
    );
    try {
      const answer = res ? String((JSON.parse(res.raw) as { answer?: unknown }).answer ?? "").trim() : "";
      if (answer) return { ok: true, answer, sources, model: `tavily+${res!.model}` };
    } catch { /* fall through to Tavily's own summary */ }
  }
  if (found.answer) return { ok: true, answer: found.answer, sources, model: "tavily" };
  return { ok: false, reason: "empty" };
}

/**
 * Search the web, fastest source first: Gemini's Google-grounded search starts at once; if it has not answered in
 * SEARCH_HEDGE_MS (or it fails, e.g. no search quota), Tavily + Groq starts too, and the first answer wins.
 * `query` is the plain question for Tavily (the prompt carries instructions). Same result shape as groundedSearch().
 */
const SEARCH_HEDGE_MS = 3_000;
export async function webSearch(tracer: Tracer, prompt: string, system?: string, opts: { query?: string } = {}): Promise<SearchResult> {
  const query = (opts.query ?? prompt).trim();
  const useTavily = tavilyKeys().length > 0;
  let geminiReason: "quota" | "failed" | "empty" = "failed";
  const gem = geminiAvailable()
    ? async () => { const g = await groundedSearch(tracer, prompt, system); if (g.ok) return g; geminiReason = g.reason; tracer.log("search", `Gemini search ${g.reason}`, "fallback"); return null; }
    : null;
  const tav = useTavily ? async () => { const t = await tavilyAnswer(tracer, query, prompt, system); return t.ok ? t : null; } : null;
  const first = gem ?? tav;
  if (!first) return { ok: false, reason: "failed" };
  const won = await hedge(first, gem && tav ? tav : null, SEARCH_HEDGE_MS, (why) =>
    tracer.log("search", why === "slow" ? `Gemini search slower than ${SEARCH_HEDGE_MS} ms; Tavily started in parallel` : "Tavily started", "warn"));
  if (won) return won.value;
  return { ok: false, reason: geminiReason };
}
