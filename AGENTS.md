# AGENTS.md

KormoPath / KormoPilot AI: a Next.js (App Router, TypeScript, Tailwind v4) collection of Bangladesh-first career/finance/agriculture/health tools. No accounts, no database; device storage goes through `lib/clientStore.ts` (`usePersistentState(storageKey(app, name), initial, sanitize)`, keys namespaced `kormopath:<app>:<name>`, values load after mount so renders stay hydration-safe). Apps must not read each other's keys; MediScan data stays inside its own namespace.

## Commands

```bash
npm run dev      # Next.js dev server, http://localhost:3000
npm run build    # production build — also the ONLY type-check (no lint/format script)
npm test         # node --test tests/*.test.ts
node --test --test-name-pattern="Fiverr" tests/core.test.ts   # single test by name
```

- Tests run `.ts` files via Node's native type stripping (Node 22.6+; Node 24 here). No ts-node/bundler.
- Test files must import with **relative paths and explicit `.ts` extensions** (`../lib/finops.ts`). The `@/*` alias does not resolve under `node --test`.
- Only modules without `@/` imports, without `"server-only"`, and without non-strippable TS syntax can be imported from tests. `lib/finops.ts`, `lib/grounding.ts`, `lib/contract.ts` have no imports at all — keep them that way.
- `tsconfig.json` excludes `tests/`, so `npm run build` does not type-check tests.
- To verify a production build while `npm run dev` is running: `NEXT_DIST_DIR=.next-test npm run build && NEXT_DIST_DIR=.next-test npx next start -p 3100` (`.next-test` is gitignored).
- `tests/e2e/browser.mjs` (and `features-browser.mjs`) are NOT part of `npm test`; they need `puppeteer-core` installed outside the repo and local Chrome — see the file header.

## Env (`.env.local`, never commit)

`GEMINI_API_KEY` (optional — without it, every agent uses its rule-based fallback, but image/PDF reading is unavailable), `GEMINI_MODEL` (default `gemini-2.5-flash`), `GEMINI_FALLBACK_MODEL` (default `gemini-flash-lite-latest`, used on 429/5xx), `PASSPORT_SECRET` (if unset, passports are signed with a public dev key and `usingDevSecret()` is true).

## Architecture

### Core pipeline: `/workspace`
`app/workspace/page.tsx` is one large client component running four stages in order: `StageAudit` → `StageViva` → `StageContract` → `StageMoney` (in `components/`). It holds the shared state; `Telemetry` renders the combined agent trace and "Inspect JSON" view.

| Stage | Server route | Deterministic core |
|---|---|---|
| Auditor | `api/audit` (also reads public GitHub repos) | `lib/audit.ts`: `ruleExtract`, `groundSkills`, `valuate` |
| Examiner | `api/viva`, `api/passport` | `lib/challenges.ts`, `lib/sandbox.ts` (Web Worker, client-side); `lib/passport.ts` (HMAC sign/verify) |
| Outreach | `api/pitch` | `lib/contract.ts` (fixed bilingual clause templates) |
| Treasurer | `api/fx`, `api/receipt` | `lib/finops.ts`; fee/tax params with sources in `lib/data.ts` |

`/verify?t=<token>` is a server component checking a passport token via `lib/passport.check`.

### Every model-backed route follows one pattern — read `app/api/pitch/route.ts` first
1. `checkRateLimit(req, …)` (`lib/rateLimit.ts`, in-memory per-IP buckets) → `rateLimitResponse` on failure.
2. Validate the body with a Zod schema (bounded string/array sizes) → 400 on failure.
3. `new Tracer("<Agent>")` (`lib/trace.ts`); log every model call, tool call, check and fallback; return `trace: tracer.steps` in the JSON. The UI renders this log — fallbacks must be visible in it, never silent.
4. `structured(tracer, schema, system, prompt, file?)` from `lib/llm.ts`: raw `fetch` to Gemini in JSON mode → Zod validation → one repair retry sending the validation errors back → in-memory cache keyed by request hash. Returns `null` when there is no key, the call fails, or output stays invalid. **Every caller must handle `null` with a rule-based or template fallback.**
5. Put guardrails *inside* the Zod schema with `superRefine` so violations trigger the repair loop (e.g. `api/pitch` rejects any dollar amount not in the contract, via `unknownAmounts` from `lib/grounding.ts`).
6. Responses include `engine` (model name or `"template"`) and `raw` (model text or `null`).

`lib/llm.ts` imports `"server-only"`. `lib/sandbox.ts` and `lib/profile.ts` are `"use client"`. `lib/passport.ts` uses Node `crypto` — import it only from server code or tests.

**Exception: web-search routes.** `api/opportunities`, `api/product-search` and `api/haatbazar/market` bypass `structured()` and call Gemini directly with the `google_search` tool (search grounding isn't used with JSON mode here). They return free-text `answer` plus `sources` from `groundingMetadata.groundingChunks`, have **no** rule-based fallback (503 without a key), and the UI must present results as unverified search output with sources — never as confirmed prices or opportunities. `api/buddy/chat` does follow the standard pattern.

### Ecosystem apps
Standalone client apps, each with a pure domain module (unit-tested, no imports) and a page:

| App | Page | Domain logic | Server route |
|---|---|---|---|
| AdmitBuddy | `app/admitbuddy` | `lib/admitbuddy.ts` | — |
| MediScan BD | `app/mediscan` | `lib/prescription.ts` | `api/mediscan/ocr` (optional, consent-gated) |
| Shohoj Budget | `app/shohoj-budget` | `lib/budget.ts` | — |
| HaatBazar AI | `app/haatbazar` | `lib/haatbazar.ts` | `api/weather` (Open-Meteo) |
| Probaho Coach | `app/probaho` | `lib/speech.ts` | `api/probaho/coach` |
| FeeGuard BD | `app/feeguard` | `lib/finops.ts` | `api/fx` |
| ChuktiGuard | `app/chuktiguard` | re-exports `lib/finops.ts` / `lib/contract.ts` | — |

Hard rules for these apps (see `docs/`):
- **Never invent facts.** No made-up prices, admission dates, OCR confidences, doses or "safe" verdicts. Unverifiable data is user-entered with source and date, shown as a labelled example via `SourceTag` (`components/AppHeader.tsx`), or omitted. Missing stays missing.
- **Confirm before saving** anything parsed from speech, SMS or OCR (Shohoj, MediScan).
- **Money is integer poisha** in `lib/budget.ts`; fee math lives only in `lib/finops.ts`. FeeGuard must render `Channel.steps` from the engine, never re-derive numbers in the page.
- **MediScan:** never diagnose, prescribe or recommend a brand switch; "not in our list" is never "safe"; emergency strip stays visible; OCR needs `consent: true` and runs with `structured(..., { cache: false })`.
- **HaatBazar:** no pesticide doses; refer to the product label and Krishi Call Centre 16123.
- **Probaho (`api/probaho/coach`):** the quote check runs inside a per-request Zod `superRefine` against the answer, so an invented quote triggers the repair retry; the deterministic score in `lib/speech.ts` is never changed by the model.

## Domain boundaries

- Money calculations stay in pure deterministic functions in `lib/finops.ts`; never ask a model to compute fees, FX conversions, incentives or totals. Preserve the reconciliation invariant (gross ↔ itemized steps ↔ net).
- Evidence validation stays in `lib/grounding.ts`; model-returned claims/receipt values must be checked against the source before affecting scores or records.
- Contract clauses stay in the reviewed templates in `lib/contract.ts`; the model never authors or alters legal clauses — only validated user inputs fill template fields.
- Treat all model/external API responses as untrusted: validate shape and bounds before use.
- Add/update focused tests in `tests/*.test.ts` when changing calculations, grounding, validation or fallback behavior.

## Security configuration

- `next.config.mjs` sets headers for every route; Permissions-Policy allows same-origin microphone only. A feature needing camera or geolocation must update it.
- `middleware.ts` rejects API bodies over 256 KB with 413. Upload routes (base64) must be added to its `UPLOAD_ROUTES` (currently `/api/audit`, `/api/receipt`, `/api/mediscan/ocr`) or real uploads will be rejected.
- Never commit `.env.local`, API keys or `PASSPORT_SECRET`.

## Gotchas

- **Bangla text:** some characters (য়, ড়, ঢ়) exist as one codepoint or two; this repo contains both. Exact-string edits/comparisons on Bangla text can silently fail. Normalise with `.normalize("NFC")` in code (as `lib/budget.ts` does) and anchor scripted edits on nearby ASCII.
- **ChuktiGuard** used to carry its own fee math; it now re-exports from `lib/finops.ts`/`lib/contract.ts`. `lib/chuktiguard.ts` is the place to check if rail fees ever look divergent again.
- **Shared UI:** `components/AppHeader.tsx` (header, skip link, privacy chip, `SourceTag`), `AppSwitcherDropdown` (`variant="light"` on white headers).
- **UI conventions:** Tailwind v4 via `@tailwindcss/postcss`, theme in `app/globals.css`; `lucide-react` icons; English/বাংলা toggles kept in component state (`lang: "en" | "bn"`); `bnDigits` in `lib/contract.ts` converts digits to Bengali numerals.
- `/judges` is a static English guide for buildathon judges, linked from `components/BuildathonSticker.tsx`.
