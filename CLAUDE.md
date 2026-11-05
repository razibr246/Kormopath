# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Next.js dev server, http://localhost:3000
npm run build    # production build (also the only type-check: there is no lint/format script)
npm test         # node --test tests/*.test.ts
node --test --test-name-pattern="Fiverr" tests/core.test.ts   # run a single test by name
```

Tests run `.ts` files directly through Node's native type stripping (Node 22.6+; Node 24 here), with no ts-node or bundler. So:
- Test files import with **relative paths and explicit `.ts` extensions** (`../lib/finops.ts`). The `@/*` alias does not resolve under `node --test`.
- Only modules with no `@/` imports, no `"server-only"` and no TS-only runtime syntax (enums, parameter properties) can be imported from tests. `lib/finops.ts`, `lib/grounding.ts` and `lib/contract.ts` have no imports at all, so keep them that way.
- `tsconfig.json` excludes `tests/`, so `npm run build` does not type-check tests.

Env (`.env.local`): `GEMINI_API_KEY` (optional; without it every agent uses its rule-based fallback, but image/PDF reading needs it), `GEMINI_MODEL` (default `gemini-2.5-flash`), `PASSPORT_SECRET` (if unset, passports are signed with a public dev key and the trace logs a warning).

## Architecture

The product is KormoPath / KormoPilot AI: four agents that take a Bangladeshi freelancer from CV to money received. The README explains the product and the fee and tax facts it relies on, with the date they were checked.

### The core pipeline: `/workspace`
`app/workspace/page.tsx` is one large client component that runs four stages in order: `StageAudit` → `StageViva` → `StageContract` → `StageMoney` (in `components/`). It holds the shared state (audit result, test results, viva grade, passport, ledger) and passes it down. `Telemetry` shows the combined agent trace and the "Inspect JSON" view.

| Stage | Server route | Deterministic core |
|---|---|---|
| Auditor | `api/audit` (also reads GitHub public repos) | `lib/audit.ts`: `ruleExtract`, `groundSkills`, `valuate` |
| Examiner | `api/viva`, `api/passport` | `lib/challenges.ts` and `lib/sandbox.ts` (Web Worker, client-side); `lib/passport.ts` (HMAC sign/verify) |
| Outreach | `api/pitch` | `lib/contract.ts` (fixed bilingual clause templates) |
| Treasurer | `api/fx`, `api/receipt` | `lib/finops.ts`; fee and tax params with sources in `lib/data.ts` |

`/verify?t=<token>` is a server component that checks a passport token with `lib/passport.check`.

### How every model-backed route works
Read `app/api/pitch/route.ts` or `app/api/audit/route.ts` as the reference. New routes should follow the same pattern:
1. `checkRateLimit(req, …)` (`lib/rateLimit.ts`, in-memory per-IP buckets) → `rateLimitResponse` on failure.
2. Validate the request body with a Zod schema (bounded string and array sizes) → 400 on failure.
3. `new Tracer("<Agent>")` (`lib/trace.ts`). Log every model call, tool call, check and fallback to it, and return `trace: tracer.steps` in the JSON response. The UI renders this log, so fallbacks must be visible in it, not silent.
4. `structured(tracer, schema, system, prompt, file?)` from `lib/llm.ts`: a raw `fetch` to Gemini in JSON mode, then Zod validation, one repair retry that sends the validation errors back, and an in-memory cache keyed by a hash of the request. It returns `null` when there is no key, the call fails, or the output is still invalid. **Every caller must handle `null` with a rule-based or template fallback.**
5. Put guardrails *inside* the Zod schema with `superRefine` so that violations trigger the repair loop. For example, `api/pitch` rejects any dollar amount not in the contract (`unknownAmounts` from `lib/grounding.ts`).
6. Responses include `engine` (the model name or `"template"`/rule-based) and `raw` (the model text, or `null`).

`lib/llm.ts` and `lib/passport.ts` import `"server-only"`. `lib/sandbox.ts` and `lib/profile.ts` are `"use client"`.

**Exception: web-search routes.** `api/opportunities` (`app/opportunities`), `api/product-search` (Shohoj Budget) and `api/haatbazar/market` (`components/HaatMarket.tsx`) bypass `structured()` and call Gemini directly with the `google_search` tool, because search grounding isn't used with JSON mode here. They return free-text `answer` plus `sources` from `groundingMetadata.groundingChunks`, have no rule-based fallback (503 without a key), and the UI must present results as unverified search output with their sources, never as confirmed prices or opportunities. `api/buddy/chat` (`components/Buddy.tsx`) does follow the standard `structured()` pattern.

### Ecosystem apps
Six independent client apps sit beside the core pipeline. Each has a pure domain module (no imports, unit-tested) and a page:

| App | Page | Domain logic | Server route |
|---|---|---|---|
| AdmitBuddy | `app/admitbuddy` | `lib/admitbuddy.ts` | — |
| MediScan BD | `app/mediscan` | `lib/prescription.ts` | `api/mediscan/ocr` (optional, consent-gated) |
| Shohoj Budget | `app/shohoj-budget` | `lib/budget.ts` | — |
| HaatBazar AI | `app/haatbazar` | `lib/haatbazar.ts` | `api/weather` (Open-Meteo) |
| Probaho Coach | `app/probaho` | `lib/speech.ts` | — |
| FeeGuard BD | `app/feeguard` | `lib/finops.ts` | `api/fx` |

Rules that every change to these apps must keep (see `docs/` for the reasons):
- **Never invent facts.** No made-up prices, admission dates, OCR confidences, doses or "safe" verdicts. Unverifiable data is user-entered with a source and date, shown as a labelled example via `SourceTag` (`components/AppHeader.tsx`), or left out. A missing value is shown as missing.
- **Confirm before saving** anything parsed from speech, SMS or OCR (Shohoj, MediScan).
- **Money is integer poisha** in `lib/budget.ts`; fee math only in `lib/finops.ts`. FeeGuard must render `Channel.steps` from the engine and never re-derive numbers in the page.
- **MediScan:** never diagnose, prescribe or recommend a brand switch; "not in our list" is never "safe"; the emergency strip stays visible; OCR needs `consent: true` and runs with `structured(..., { cache: false })`.
- **HaatBazar:** no pesticide doses; refer to the label and Krishi Call Centre 16123.

Platform security lives in two places: `next.config.mjs` sets headers for every route (Permissions-Policy allows only same-origin microphone; adding a feature that needs camera or geolocation means updating it), and `middleware.ts` rejects API bodies over 256 KB with 413. Routes that accept base64 uploads must be listed in its `UPLOAD_ROUTES`, or real uploads will be rejected.

Shared pieces: `components/AppHeader.tsx` (header, skip link, privacy chip, `SourceTag`), `AppSwitcherDropdown` (`variant="light"` on white headers), and `lib/clientStore.ts`. All device storage goes through `usePersistentState(storageKey(app, name), initial, sanitize)`. Keys are namespaced `kormopath:<app>:<name>`, every read passes through a sanitiser, and values load after mount so renders are hydration-safe. `/settings` lists, exports and deletes data per app. Apps must not read each other's keys, and MediScan data must stay inside its own namespace.

Bangla text gotcha: some characters (য়, ড়, ঢ়) can be stored as one Unicode codepoint or as two, and files in this repo contain both. Exact-string edits or comparisons on Bangla text can silently fail to match. Normalise with `.normalize("NFC")` in code (as `lib/budget.ts` does), and anchor scripted edits on nearby ASCII.

`lib/chuktiguard.ts` still has its own `fmtBdt` and `calculateInvoiceFinOps`, with rail fees and incentive rates written into the code instead of coming from `lib/finops.ts`. Check both places before changing money logic, and prefer moving the math into `finops.ts`.

To test a production build while someone is running `npm run dev`, build into a separate folder so their `.next` cache is not overwritten: `NEXT_DIST_DIR=.next-test npm run build && NEXT_DIST_DIR=.next-test npx next start -p 3100`.

`api/probaho/coach` is a model-backed route on the standard pattern: the quote check runs inside a per-request Zod schema (`superRefine` against the answer), so a made-up quote triggers the repair retry; the deterministic score in `lib/speech.ts` is never changed by the model. `/judges` is a static English guide for buildathon judges, linked from the sticker strip in `components/BuildathonSticker.tsx`.

Browser workflow checks live in `tests/e2e/browser.mjs` (plus `tests/e2e/features-browser.mjs`) and are not part of `npm test`. They need `puppeteer-core` installed outside the repo; the file header says how to run them.

### UI conventions
Tailwind v4 (via `@tailwindcss/postcss`; theme and global styles in `app/globals.css`), `lucide-react` icons, and English/বাংলা toggles kept in component state (`lang: "en" | "bn"`). `bnDigits` in `lib/contract.ts` converts digits to Bengali numerals.
