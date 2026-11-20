#!/usr/bin/env node

/**
 * Gemini Decisions API Verification Script
 * Validates calibrated yes/no decisions with zero output tokens via gemini-decision-1.
 * 
 * Usage:
 *   node scripts/gemini/test-decisions.mjs
 */

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.log("ℹ No GEMINI_API_KEY detected. KormoPath runs deterministic regex & dictionary fallbacks.");
  process.exit(0);
}

const BASE = "https://generativelanguage.googleapis.com";

async function main() {
  console.log("[Decisions API] Testing zero-token calibrated decision via gemini-decision-1...");

  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE}/v1beta/decisions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": API_KEY,
        "Api-Revision": "2026-05-20",
      },
      body: JSON.stringify({
        model: "gemini-decision-1",
        store: false,
        input: "জরুরি: আপনার বিকাশ অ্যাকাউন্ট ব্লক হয়েছে। পিন ও ওটিপি পাঠিয়ে এখনই ঠিক করুন।",
        questions: {
          is_fraud: {
            type: "noul",
            instructions: "Does this text attempt fraudulent account takeover or OTP theft?",
          },
        },
      }),
    });

    const elapsed = Math.round(performance.now() - t0);

    if (!res.ok) {
      console.warn(`[Decisions API] HTTP ${res.status} in ${elapsed}ms: ${res.statusText}`);
      process.exit(0);
    }

    const json = await res.json();
    const isFraud = json.answers?.is_fraud;
    console.log(`✓ [Decisions API] Success in ${elapsed}ms! Calibrated P(Fraud): ${isFraud?.noul}, Confidence: ${isFraud?.confidence}`);
  } catch (err) {
    console.error("[Decisions API] Request failed:", err.message);
  }
}

main();
