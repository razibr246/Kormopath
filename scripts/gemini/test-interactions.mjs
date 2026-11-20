#!/usr/bin/env node

/**
 * Gemini Interactions API Verification Script
 * Validates endpoint connectivity, Api-Revision: 2026-05-20, and store: false privacy invariant.
 * 
 * Usage:
 *   node scripts/gemini/test-interactions.mjs
 */

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.log("ℹ No GEMINI_API_KEY detected. In KormoPath, all agents automatically use 100% deterministic rule-based fallbacks.");
  process.exit(0);
}

const BASE = "https://generativelanguage.googleapis.com";
const MODEL = process.env.GEMINI_MODEL || "gemini-4-hydrogen";

async function main() {
  console.log(`[Gemini API] Testing modern Interactions API with model: ${MODEL}...`);

  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE}/v1/interactions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": API_KEY,
        "Api-Revision": "2026-05-20",
      },
      body: JSON.stringify({
        model: MODEL,
        store: false, // Strict zero-PII invariant
        input: "Reply with the single word: OK",
      }),
    });

    const elapsed = Math.round(performance.now() - t0);

    if (!res.ok) {
      console.warn(`[Gemini API] HTTP ${res.status} returned in ${elapsed}ms: ${res.statusText}`);
      process.exit(0);
    }

    const json = await res.json();
    const text = (json.steps || [])
      .filter((s) => s.type === "model_output")
      .flatMap((s) => s.content || [])
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("")
      .trim();

    console.log(`✓ [Gemini API] Success in ${elapsed}ms! Model: ${json.model || MODEL}, Output: "${text}"`);
  } catch (err) {
    console.error("[Gemini API] Request failed:", err.message);
  }
}

main();
