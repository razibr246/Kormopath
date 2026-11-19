// API contract journey: calls the real route handlers on a running production build (no browser).
// Each model-backed route must answer with `engine` + a non-empty `trace`, and the safety rules must hold whether
// or not a model key is configured: red flags go to 999 by fixed rules before any model call, and legal crisis
// answers open with 999/109. Run with BASE (default http://localhost:3100).
const BASE = process.env.BASE || "http://localhost:3100";
let failed = 0;
const check = (ok, name, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
  if (!ok) failed++;
};
const post = async (path, body) => {
  const r = await fetch(BASE + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  let j = null;
  try { j = await r.json(); } catch { /* not JSON */ }
  return { status: r.status, j };
};

// 1. Health: a red flag is answered by the fixed rules, before any model, with a trace saying so.
{
  const { status, j } = await post("/api/health/assist", { mode: "route", text: "crushing feeling in my father's chest and he is sweating, which doctor next week?", lang: "en" });
  check(status === 200 && j?.emergency === true && j?.engine === "rule-based" && j.trace?.some((t) => t.tool === "red-flags"),
    "Health: crushing chest + sweating → 999 by rule, no model", `${status} ${j?.engine} ${j?.redFlags}`);
}
// 2. Health: a routine question returns a specialty from the fixed list, an engine and a trace.
{
  const { status, j } = await post("/api/health/assist", { mode: "route", text: "my knee hurts when I climb stairs", lang: "en" });
  check(status === 200 && j?.emergency === false && typeof j?.specialtyId === "string" && typeof j?.engine === "string" && j.trace?.length > 0,
    "Health: routine question → one specialty, engine and trace", `${status} ${j?.specialtyId} ${j?.engine}`);
}
// 3. Legal: a crisis opens with 999/109 (model or rule-based), with a trace.
{
  const { status, j } = await post("/api/legal/assist", { message: "he pushed me down the stairs and locks me in a room", lang: "en" });
  const a = String(j?.answer ?? "");
  check(status === 200 && /৯৯৯|999|১০৯|109/.test(a.slice(0, 160)) && Array.isArray(j?.trace) && typeof j?.engine === "string",
    "Legal: crisis wording opens with 999/109, with engine and trace", `${status} ${j?.engine} ${a.slice(0, 60)}`);
}
// 4. Validation: bad bodies are rejected with JSON errors, never a crash.
// /api/passport answers 503 instead when no production signing key is set (it fails closed by design).
for (const [path, body, want] of [["/api/pitch", {}, [400]], ["/api/passport", {}, [400, 503]], ["/api/health/assist", { mode: "route", text: "x" }, [400]], ["/api/mediscan/ocr", { consent: false }, [400]]]) {
  const { status, j } = await post(path, body);
  check(want.includes(status) && typeof j?.error === "string", `Validation: ${path} rejects a bad body with ${want.join("/")} + JSON error`, String(status));
}
// 5. Body guard: a body over 256 KB on a non-upload route is refused before the handler.
{
  const r = await fetch(BASE + "/api/pitch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pad: "x".repeat(300_000) }) });
  check(r.status === 413, "Body guard: 300 KB to a non-upload route → 413", String(r.status));
}

console.log(failed ? `${failed} API contract check(s) failed` : "API contract: all checks passed");
process.exit(failed ? 1 : 0);
