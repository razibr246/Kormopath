# AGENTS.md

KormoPath / KormoPilot AI: a Next.js (App Router, TypeScript, Tailwind v4) collection of Bangladesh-first career/finance/agriculture/health tools. No accounts, no database; device storage goes through `lib/clientStore.ts` (`usePersistentState(storageKey(app, name), initial, sanitize)`, keys namespaced `kormopath:<app>:<name>`, values load after mount so renders stay hydration-safe). Apps must not read each other's keys; MediScan data stays inside its own namespace.

## Commands

```bash
npm run dev      # Next.js dev server, http://localhost:3000
npm run build    # production build — also the ONLY type-check (no lint/format script)
npm test         # tests/*.test.ts, then tests/security/*.test.ts under --conditions=react-server
node --test --test-name-pattern="Fiverr" tests/core.test.ts   # single test by name
npm run test:browser   # Puppeteer journeys in tests/e2e/*.mjs; needs a production server on :3100
```

- Tests run `.ts` files via Node's native type stripping (Node 22.6+; Node 24 here). No ts-node/bundler.
- Test files must import with **relative paths and explicit `.ts` extensions** (`../lib/finops.ts`). The `@/*` alias does not resolve under `node --test`.
- Only modules without `@/` imports, without `"server-only"`, and without non-strippable TS syntax can be imported from tests. `lib/finops.ts`, `lib/grounding.ts`, `lib/contract.ts` have no imports at all — keep them that way.
- `tsconfig.json` excludes `tests/`, so `npm run build` does not type-check tests.
- To verify a production build while `npm run dev` is running: `NEXT_DIST_DIR=.next-test npm run build && NEXT_DIST_DIR=.next-test npx next start -p 3100` (`.next-test` is gitignored).
- `tests/security/` runs with `--conditions=react-server` so it can import server-side modules such as `lib/passport.ts`.
- `npm run test:browser` is NOT part of `npm test`. It uses `puppeteer-core` (a devDependency) with a locally installed Chrome (`CHROME_PATH` overrides the path, `BASE` overrides `http://localhost:3100`) and clears localStorage in its own browser profile.
- CI (`.github/workflows/ci.yml`, Node 24) runs `npm test`, `npm run build`, then the browser journeys against `npm start -- -p 3100`.

## Env (`.env.local`, never commit)

`GEMINI_API_KEY` (optional — without it, every agent uses its rule-based fallback, but image/PDF reading is unavailable), `GEMINI_API_KEYS` (optional, comma-separated extra keys tried in order on 401/403/429), `GEMINI_MODEL` (default `gemini-4-hydrogen`), `GEMINI_FALLBACK_MODEL` (default `gemini-3.5-flash-lite`), `GEMINI_TTS_MODEL` (default `gemini-3.8-flash-tts`), `GEMINI_TTS_VOICE` (default `Kore`), `GROQ_API_KEYS`, `OPENROUTER_API_KEYS`, `TAVILY_API_KEYS` (optional, comma-separated; see "AI providers" below), `LLM_HEDGE_MS` (default 1500), `PASSPORT_SECRET` (outside production, if unset, passports are signed with a public dev key and `usingDevSecret()` is true; with `NODE_ENV=production`, `signingConfigured()` fails closed, so issuing and verifying both refuse, unless the secret is at least 32 characters and is not the dev key). `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (or Vercel KV's `KV_REST_API_URL` + `KV_REST_API_TOKEN`) are optional: when set, rate limits are counted in Redis across all server instances (keys hold a SHA-256 hash of the IP, never the address; 429 replies carry `X-RateLimit-Store`); without them, or if Redis fails or takes over 800 ms, each instance uses its in-memory limiter.

## Architecture

### Core pipeline: `/workspace`
`app/workspace/page.tsx` is one large client component running four stages in order: `StageAudit` → `StageViva` → `StageContract` → `StageMoney` (in `components/workspace/`). It holds the shared state; `Telemetry` renders the combined agent trace and "Inspect JSON" view.

| Stage | Server route | Deterministic core |
|---|---|---|
| Auditor | `api/audit` (also reads public GitHub repos) | `lib/audit.ts`: `ruleExtract`, `groundSkills`, `valuate` |
| Examiner | `api/viva`, `api/passport` | `lib/challenges.ts`, `lib/sandbox.ts` (Web Worker, client-side); `lib/passport.ts` (HMAC sign/verify) |
| Outreach | `api/pitch` | `lib/contract.ts` (fixed bilingual clause templates) |
| Treasurer | `api/fx`, `api/receipt` | `lib/finops.ts`; fee/tax params with sources in `lib/data.ts` |

`/verify?t=<token>` is a server component checking a passport token via `lib/passport.check`.

### Gemini client: `lib/gemini.ts` (Interactions API) & `lib/decisions.ts` (Decisions API)
All model calls go through `interact()` in `lib/gemini.ts`: `POST /v1/interactions` (TTS and multimodal inputs use `/v1beta`), header `Api-Revision: 2026-05-20`, always `store: false`. It tries models in order (`gemini-4-hydrogen` → `gemini-4-argon` → `gemini-3.5-flash-lite` → `gemini-3.1-flash-lite`, with `gemini-4-carbon` for deep reasoning) and keys in order: 404 → next model, 401/403/429 → next key, 503 → next model (retried once only on the last model), other 5xx → one retry then next model, timeout → next model. Calibrated zero-token binary/choice decisions (scam detection in Rokkha, symptom triage in MediScan) go through `decide()` in `lib/decisions.ts` via `POST /v1beta/decisions` (`gemini-decision-1`, 0 output tokens). Real-time streaming voice agent schemas are modeled in `lib/geminiLive.ts` for `gemini-3.8-live` and `gemini-3.8-live-extended-thinking`. Requests with image, document or audio parts go to `/v1beta` (`lib/geminiVersion.ts`; v1 rejects them). A key refused with 401/403 is tried last for 30 minutes. A model rate-limited on every key, or one that timed out or answered 503, is tried last for 2–5 minutes, doubling on repeat failures up to 30 (`lib/cooldown.ts`); the deferral is logged in the trace. Each attempt is capped (~12 s) so the lighter model still gets a turn inside the ~30 s route limit, and every attempt is logged to the route's `Tracer`. Helpers: `outputText`, `citations` (from `url_citation` annotations), `outputAudio` (TTS returns `audio/wav`), `groundedSearch` (Google Search tool) and `SEARCH_ERROR_BN`. The old `generateContent` endpoint and `gemini-2.5-*` models are not available to new keys; do not reintroduce them. Web search can return 429 when the Google project's tier has no search quota; routes report that honestly.

### AI providers: `lib/llm.ts`, `lib/providers.ts`, `lib/webSearch.ts`
- **Text (`structured()`):** Groq goes first (OpenAI-compatible JSON mode, about 1 s). If it has not answered within `LLM_HEDGE_MS`, Gemini starts in parallel, and the first non-null answer wins (`hedge()` in `lib/structuredCore.ts`, tested). If both fail, OpenRouter free models are tried. Whichever answers goes through the same Zod schema, guards and repair retry, and every attempt and the winner are in the trace. Files (images, PDFs) and speech are Gemini only.
- **Keys:** Gemini keys rotate round-robin per request (`rotateKeys` in `lib/cooldown.ts`). Every provider uses the same cooldowns: a refused key is tried last for 30 minutes, and a rate-limited or slow model for 2–5 minutes. Keys are never logged.
- **Web search (`webSearch()`):** Gemini's Google-grounded search runs first. When it fails or its quota is out, Tavily finds pages and Groq answers from those pages only, with the same `sources`. The UI still presents this as unverified search output.
- **Voice:** `lib/speechChunks.ts` splits replies into a short first chunk and larger later chunks. Buddy and the Legal voice call play each chunk while the next is synthesised. `lib/ttsCache.ts` keeps short lines (≤ 220 characters, 40 per instance) so repeated greetings and menus play instantly.

### Every model-backed route follows one pattern — read `app/api/pitch/route.ts` first
1. `await checkRateLimitShared(req, …)` (`lib/rateLimit.ts`: per-IP buckets in Redis when configured, else in memory) → `rateLimitResponse` on failure. New routes use this, not the synchronous `checkRateLimit`.
2. Validate the body with a Zod schema (bounded string/array sizes) → 400 on failure.
3. `new Tracer("<Agent>")` (`lib/trace.ts`); log every model call, tool call, check and fallback; return `trace: tracer.steps` in the JSON. The UI renders this log — fallbacks must be visible in it, never silent.
4. `structured(tracer, schema, system, prompt, file?)` from `lib/llm.ts`: JSON-mode interaction via `lib/gemini.ts` → Zod validation → one repair retry sending the validation errors back → in-memory cache keyed by request hash. Returns `null` when there is no key, the call fails, or output stays invalid. **Every caller must handle `null` with a rule-based or template fallback.**
5. Put guardrails *inside* the Zod schema with `superRefine` so violations trigger the repair loop (e.g. `api/pitch` rejects any dollar amount not in the contract, via `unknownAmounts` from `lib/grounding.ts`).
6. Responses include `engine` (model name or `"template"`) and `raw` (model text or `null`).

`lib/llm.ts` imports `"server-only"`. `lib/sandbox.ts` and `lib/profile.ts` are `"use client"`. `lib/passport.ts` uses Node `crypto` — import it only from server code or tests.

**Exception: web-search routes.** `api/opportunities`, `api/product-search`, `api/haatbazar/market` and Buddy's web mode bypass `structured()` and use `groundedSearch()` (Google Search tool, plain text). They return free-text `answer` plus `sources` from `url_citation` annotations, have **no** rule-based fallback (503 without a key), and the UI must present results as unverified search output with sources — never as confirmed prices or opportunities. `api/buddy/chat` does follow the standard pattern.

### Ecosystem apps
Standalone client apps, each with a pure domain module (unit-tested, no imports) and a page:

| App | Page | Domain logic | Server route |
|---|---|---|---|
| AdmitBuddy | `app/admitbuddy` | `lib/admitbuddy.ts` | — |
| MediScan BD | `app/mediscan` | `lib/prescription.ts` | `api/mediscan/ocr` (optional, consent-gated) |
| Shohoj Budget | `app/shohoj-budget` | `lib/budget.ts` | — |
| HaatBazar AI | `app/haatbazar` | `lib/haatbazar.ts` | `api/weather` (Open-Meteo) |
| MaathSathi | `app/krishi` | `lib/krishi.ts`, reference data in `lib/krishiData.ts` | `api/weather` (Open-Meteo) |
| MaathSathi Field (FieldShift360 port) | `app/krishi/field` | `field360/src` (JS, MIT, from razibr246/fieldshift360) | `api/field360/{doctor,agent,tts,plans,messages}` |
| Rokkha | `app/rokkha` | `lib/rokkha.ts`, reference data in `lib/rokkhaData.ts` | `api/weather` (Open-Meteo) |
| Legal Aid (DLAS port) | `app/legal/*` (layout: `components/apps/legal/LegalShell.tsx`) | `lib/legal/*` (pure; facts in `lib/legal/data.ts`) | `api/legal/assist`, `api/legal/speak` |
| Probaho Coach | `app/probaho` | `lib/speech.ts` | `api/probaho/coach` |
| FeeGuard BD | `app/feeguard` | `lib/finops.ts` | `api/fx` |
| ChuktiGuard | `app/chuktiguard` | re-exports `lib/finops.ts` / `lib/contract.ts` | — |

Hard rules for these apps (see `docs/`):
- **Never invent facts.** No made-up prices, admission dates, OCR confidences, doses or "safe" verdicts. Unverifiable data is user-entered with source and date, shown as a labelled example via `SourceTag` (`components/layout/AppHeader.tsx`), or omitted. Missing stays missing.
- **Confirm before saving** anything parsed from speech, SMS or OCR (Shohoj, MediScan).
- **Shohoj সংসার modules** (`/shohoj-budget#wallets|dhar|bazar|mess|zakat`, `components/apps/shohoj/`, pure cores `lib/wallets.ts`, `lib/dhar.ts`, `lib/bazar.ts`, `lib/mess.ts`, `lib/zakat.ts`): integer poisha, `shohoj` namespace, confirm before saving. Transfers between wallets are not expenses; cash-out fees are. MFS rates in `lib/budget.ts` carry `verified` and `source`: only rates read on the provider's own page are verified (bKash 1.85%, Priyo 1.395%); the rest are labelled unverified and user-editable. Zakat never hardcodes a gold or silver price: the user enters it with date and source; only the bhori weight, nisab weights and 2.5% are constants, each sourced. Bazar shows the user's own price history only. Mess settlement invariant (members' balances = cash on hand − fixed-rate surplus) is tested.
- **Money is integer poisha** in `lib/budget.ts`; fee math lives only in `lib/finops.ts`. FeeGuard must render `Channel.steps` from the engine, never re-derive numbers in the page.
- **MediScan:** never diagnose, prescribe or recommend a brand switch; "not in our list" is never "safe"; emergency strip stays visible; OCR needs `consent: true` and runs with `structured(..., { cache: false })`. The adherence tracker (`lib/adherence.ts`, `app/mediscan/AdherenceTracker.tsx`) only counts doses against the user's own confirmed schedule (never proposes one), computes PDC over completed Asia/Dhaka days (a day is covered only if every dose was ticked), and shows a neutral "talk to your doctor or pharmacist" prompt below the PQA/CMS 80% threshold. The fever and dengue warning-sign watch (`lib/dengue.ts`, `app/mediscan/FeverWatch.tsx`) uses WHO's sign list only: any sign means "go to hospital now", day 3+ or a falling fever means "watch closely"; it never says dengue or not-dengue and never names a medicine.
- **MediScan health hub** (`app/mediscan/*` inside `components/apps/health/HealthShell.tsx`; pure cores `lib/health/*`): emergency help never needs an account or payment and the 999/16263 strip is on every page. `/mediscan/emergency` asks Overpass (`api/health/hospitals`) and shows the bundled OpenStreetMap copy `public/health/osm-hospitals-bd.json` at once (rebuild with `scripts/build-hospital-snapshot.py` from a Geofabrik extract), replacing it with live data if that arrives; facilities read "in map data" or "call to confirm", never "available"; travel time is a labelled estimate. `/mediscan/assistant` screens WHO/NHS red flags first, by exact keywords and phrase patterns for everyday Bangla, Banglish and English wording (any → 999, no chat; paraphrases tested in `tests/health-assist.test.ts`) and then names a specialty only (`lib/health/healthGuard.ts` inside the Zod schema: no diagnosis, medicine or dose; `cache: false`). Doctors: only the five fictional "Dr. Sample …" demo profiles exist; a doctor becomes bookable only when an admin records a BMDC check, and demo doctors never are. `/mediscan/admin` is hidden in production (locked notice, no nav link) unless `NEXT_PUBLIC_HEALTH_ADMIN_DEMO=on` (`lib/health/adminGate.ts`), because it has no login. Real payments are OFF (`PAYMENT_CONFIG.receiver` is null, so no number is in the public bundle) because doctor verification is only on the admin's own device and could be faked; enable a receiving number only once doctors are verified on a server with an authenticated admin, ideally a bKash merchant account; bookings stay Pending until an admin verifies the TrxID (never a PIN/OTP, no duplicates); video uses a Jitsi Meet link (host sign-in required) and nothing is recorded.
- **HaatBazar:** no pesticide doses; refer to the product label and Krishi Call Centre 16123.
- **MaathSathi (`/krishi`):** same no-dose rule, also for animal medicine (livestock call centre 16358). Prices, yields and vaccination dates are entered by the farmer; helplines and support programmes live in `lib/krishiData.ts`, each with an official source URL and check date. Voice-parsed tasks are confirmed before saving.
- **MaathSathi Field (`/krishi/field`, `field360/src`):** FieldShift360's farmer pages plus the officer Ropon Radar (`#/farmer/radar`), ported from Vite. Hash routing inside one Next page (`app/krishi/field/FieldClient.tsx`, `ssr: false`), which always runs in a document of its own (it reloads on client-side arrival and departure) because `field360/src/f360.css` is a global stylesheet with its own Tailwind build; KormoPath's `globals.css` excludes `field360/` with `@source not`. Do not hand-edit `f360.css`: rebuild it with `python3 -I scripts/build-f360-css.py <FieldShift360 src/index.css>`, which recolours to Shonar Bangla by keeping OKLCH lightness. `next.config.mjs` turns image imports under `field360/src` into URL strings (Vite behaviour); big static data lives in `public/field360/`, including MapLibre's module worker copied from `maplibre-gl` 6.11.2 (recopy both `.mjs` files if the package version changes). Storage keys use `STORAGE_PREFIX` (`kormopath:krishi:field360`) from `field360/src/config/brand.js`. `api/field360/doctor` and `agent` follow the standard route pattern: the no-dose rule (`lib/field360Guard.ts`) and FieldShift360's `engine/replyCheck.js` run inside the Zod schemas; without a key or a checked answer they return 503 and the page answers with its own rule-based check or voice brain. `plans` and `messages` always return 503 "not configured" (no database by design); the pages then keep working on the device. Buddy is hidden on this route because Chakra Agent takes the same corner. Every MaathSathi entry link (home card, switcher, palette, Buddy, manifest shortcut, footer) opens `/krishi/field#/farmer`; `/krishi` is the farm book (খামারের খাতা: tasks, livestock, costs), reached from the field nav item `#/farmer/book`, which `location.replace`s to it. User-visible text says মাঠসাথী / MaathSathi, never FieldShift, and the app opens in Bangla unless the farmer chose English. Geolocation is allowed (same origin) for its map "find my field".
- **Rokkha (`/rokkha`):** scam checks are rule-based (`checkMessage` in `lib/rokkha.ts`) and must quote the exact matched text; no hits is always worded as "no known signs found — this does NOT mean it is safe", never "safe". The cooling-off pause in `transferCheck` is a documented design rule, not a statistic. Helplines, warning links and the IFRC preparedness checklist live in `lib/rokkhaData.ts`, each with an official source URL and check date; never add a number from memory. Pasted messages and incident reports are never stored or sent; only checklist ticks, district and the pause end time are saved. Scam signs are matched in Bangla, English and Banglish (`BANGLISH` map); `inspectLinks` explains link tricks (shortener, number address, xn--, @, fake bKash/Nagad/Bangladesh Bank/gov.bd names) and never calls a link safe, even an official one. The call guard (`CALL_GUARD_SECONDS`, a design choice) and Family Guardian (`sanitizeGuardians`, max 2, confirm before saving, alert is a zero-PII `sms:` link the user sends) keep everything on the device. Shared SMS text (manifest `share_target`) is caught by `public/sw.js` at `/rokkha/share` and moved after `#`, so it never reaches the server; `app/rokkha/share` is only the fallback.
- **Legal Aid (`/legal`, ported from razibr246/Digital-Legal-Aid-System, co-developer AdribMahmud101):** legal information, never legal advice or a government portal: no seal, no ministry header, never "your case is filed". Every helpline, law and office comes from `lib/legal/data.ts`, each with an official source and check date (legal aid helpline 16699 per nlaso.gov.bd; 16122 cites the land ministry's own hotline.land.gov.bd). No section numbers and no income thresholds (unverifiable or amended); eligibility always ends "the legal aid office decides". The help strip (999, 109, 16699) is on every page via `LegalShell`. `api/legal/assist` runs `lib/legal/assistGuard.ts` inside the Zod schema (only known helplines and laws, no sections/amounts/promises, crisis answers open with 999/109) and falls back to `lib/legal/inquiries.ts`. Application drafts, case timelines and settlement drafts save on the device only after review; settlement drafts print stamped "খসড়া · আদালতের দলিল নয়". Mediation screens for violence first and never pushes it. `/legal/demo` is fictional data under a permanent demo banner. Chakma/Marma bridge output is labelled approximate. Design rules: `docs/apps/legal/DESIGN_BRIEF.md`; core API: `docs/apps/legal/CORE_API.md`.
- **Probaho (`api/probaho/coach`):** the quote check runs inside a per-request Zod `superRefine` against the answer, so an invented quote triggers the repair retry; the deterministic score in `lib/speech.ts` is never changed by the model.

- **Freemium (B2C, `lib/session.ts`, `components/pricing/UpgradeModal.tsx`, `/pricing`):**
  - **Profiles:** the three profiles are fictional demo profiles, with no accounts and no passwords; data stays on the device.
  - **Safety is never gated:** `SAFETY_FEATURES` and `ALWAYS_FREE_APPS` (emergency, symptom assistant, prescription reading, adherence and fever watch, legal, Rokkha, helplines) always return free. Only `PAID_FEATURES` can be gated. `tests/session.test.ts` enumerates this.
  - **Payments:** real payments are OFF (`PAYMENTS_OPEN = false`), and there is no receiving number. Nothing typed (a TrxID or anything else) ever unlocks a feature. Paid features turn on only through `enableDemoPro`, which sets `demo: true`, and the UI shows a "ডেমো" (demo) badge. A paid tier read from storage is always treated as demo. "Early access" (`joinEarlyAccess`) records interest on the device and unlocks nothing.
  - **Prices:** ৳99 / ৳299 are proposed (`PRICES_PROPOSED`), and the founder decides the final numbers.
  - **Storage:** sessions live under `kormopath:auth:*` (the legacy `kormopath:platform:session` is migrated), and the home dashboard under `kormopath:dashboard:*`. Both namespaces are in the backup allowlist.
  - **Pricing page:** no user counts, testimonials or revenue claims.

## Domain boundaries

- Money calculations stay in pure deterministic functions in `lib/finops.ts`; never ask a model to compute fees, FX conversions, incentives or totals. Preserve the reconciliation invariant (gross ↔ itemized steps ↔ net).
- Evidence validation stays in `lib/grounding.ts`; model-returned claims/receipt values must be checked against the source before affecting scores or records.
- Contract clauses stay in the reviewed templates in `lib/contract.ts`; the model never authors or alters legal clauses — only validated user inputs fill template fields.
- Treat all model/external API responses as untrusted: validate shape and bounds before use.
- Add/update focused tests in `tests/*.test.ts` when changing calculations, grounding, validation or fallback behavior.

## Security configuration

- `next.config.mjs` sets headers for every route; Permissions-Policy allows same-origin microphone and geolocation (MaathSathi Field map) only. A feature needing camera must update it.
- `middleware.ts` (rules in `lib/bodyGuard.ts`) rejects API bodies over 256 KB with 413, and POST/PUT/PATCH without Content-Length on non-upload routes with 411. Upload routes (base64) get 6.5 MB, but only if they are listed in `UPLOAD_ROUTES` in `lib/bodyGuard.ts` (currently `/api/audit`, `/api/receipt`, `/api/mediscan/ocr`, `/api/field360/doctor`, `/api/krishi/vision`); otherwise real uploads will be rejected.
- Never commit `.env.local`, API keys or `PASSPORT_SECRET`.

## Project structure

```
components/
  brand/        KormoPathLogo (mark + wordmark)
  layout/       AppHeader, AppFooter, Chrome (Navbar, Footer),
                AppSwitcherDropdown, CommandPalette, StorageNotice,
                BuildathonSticker, PwaSupport
  buddy/        Buddy (AI assistant panel + draggable launcher)
  home/         HeroOrbit, EcosystemHub
  workspace/    StageAudit, StageViva, StageContract, StageMoney,
                Telemetry, HeroDevice, ui (shared workspace primitives)
  apps/         AgriculturalLifecycle, HaatMarket, OpportunityTracker,
                DataBackup
  judges/       LiveAssertionHarness, DemoPlayer
lib/            Pure domain logic and server utilities (flat; each file's
                purpose is in the Ecosystem apps table above)
app/            Next.js App Router pages and API routes
docs/
  architecture/ System maps, feature inventory, user journeys
  apps/         Per-app research & plan documents
  research/     Competitor analysis, feature matrices, integrations
  reports/      Platform audit, testing, production readiness, reliability
  buildathon/   Demo script, pitch script
tests/          Unit tests (*.test.ts) + e2e/ browser journeys
public/         Favicon, icons, OG image, service worker
```

## Gotchas

- **Bangla text:** some characters (য়, ড়, ঢ়) exist as one codepoint or two; this repo contains both. Exact-string edits/comparisons on Bangla text can silently fail. Normalise with `.normalize("NFC")` in code (as `lib/budget.ts` does) and anchor scripted edits on nearby ASCII.
- **Backups:** `/settings` lists, exports and deletes data per app. Export/import (`lib/backup.ts`, `components/apps/DataBackup.tsx`) only accepts keys whose app namespace is in the allowlist in `lib/backup.ts`. A new app namespace must be added there, or its data is silently left out of backups.
- **ChuktiGuard** used to carry its own fee math; it now re-exports from `lib/finops.ts`/`lib/contract.ts`. `lib/chuktiguard.ts` is the place to check if rail fees ever look divergent again.
- **Shared UI:** `components/layout/AppHeader.tsx` (header, skip link, privacy chip, `SourceTag`), `AppSwitcherDropdown` (`variant="light"` on white headers).
- **Visual identity (v2, "Shonar Bangla"):** `app/globals.css` remaps Tailwind's colour scales (slate → warm earth, emerald → Padma green, orange → terracotta sun, amber → haldi, indigo → Bengal nil, blue → river, purple → jamdani plum). Each step keeps Tailwind's OKLCH lightness, so existing `text-slate-600` etc. keep their contrast; change hue/chroma there, not per page. Headings (`h1`, `h2`, `.display`) use Fraunces + Noto Serif Bengali via `next/font` in `app/layout.tsx`; numbers use JetBrains Mono. Shared pieces are `kp-*` classes (`kp-nav`, `kp-chip`, `kp-btn-primary`/`-sun`/`-ghost`, `kp-eyebrow`, `kp-em` for the two-tone serif accent) inside `@layer components`, so Tailwind utilities like `hidden lg:flex` still override them. The logo is `KormoPathMark`/`KormoPathLogo` (`components/brand/KormoPathLogo.tsx`); `public/favicon.svg`, `icon-512.png`, `apple-touch-icon.png` and `og-kormopath.png` are rendered from the same mark.
- **UI conventions:** Tailwind v4 via `@tailwindcss/postcss`, theme in `app/globals.css`; `lucide-react` icons; English/বাংলা toggles kept in component state (`lang: "en" | "bn"`); `bnDigits` in `lib/contract.ts` converts digits to Bengali numerals.
- `/judges` is a static English guide for buildathon judges, linked from `components/layout/BuildathonSticker.tsx`.
