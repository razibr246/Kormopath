# KormoPath platform audit

Audit date: 2026-11-05. Scope: the whole repository, with focus on the six ecosystem apps and the shared platform they run on. This records what was found **before** changes; what was changed is in `kormopath-implementation-report.md`.

## What the platform is

- Next.js 15 App Router, React 19, TypeScript strict, Tailwind v4, Zod. No database, no authentication, no user accounts.
- Two halves:
  - **Core pipeline** (`/workspace`, `/verify`, `app/api/{audit,viva,pitch,passport,receipt,fx}`): model-backed agents (Gemini via `lib/llm.ts`) with Zod validation, repair loop, deterministic fallbacks, and an agent trace. This part was already well engineered and was not the focus of this work.
  - **Ecosystem apps**: `/admitbuddy`, `/mediscan`, `/shohoj-budget`, `/haatbazar`, `/probaho`, `/feeguard` (plus `/chuktiguard`). These were client-only pages driven by hardcoded datasets in `lib/*.ts`. None called a server route.
- Persistence: a few ad-hoc `localStorage` keys (`shohoj_expenses`, `kormopath_unified_profile_v1`), read inside `useState` initialisers.

## Baseline

| Check | Result before changes |
|---|---|
| `npm test` | **Never exited.** 17/17 tests passed, but the process hung: the cleanup `setInterval` in `lib/rateLimit.ts` kept Node's event loop alive. |
| `npm run build` | **Failed** with `Invariant: no direct app page entry found for /_not-found`, caused by a stale `.next` directory. A clean build (old `.next` moved aside, not deleted) succeeded. |
| Git history | Not a git repository; a full copy of the original source was taken before any edit (scratchpad `backup-original/`). |

## Platform-wide findings

| # | Severity | Finding |
|---|---|---|
| P1 | High | Ecosystem apps presented hardcoded or random data as real (OCR accuracy, market prices, deadlines, scores). Details per app below. |
| P2 | High | Rate limiter shared one bucket per IP across all API routes, so traffic on one route consumed another's budget. |
| P3 | Medium | Rate limiter interval prevented test/worker processes from exiting. |
| P4 | Medium | `localStorage` read in `useState` initialisers → server/client render mismatch (hydration warnings) and no validation of stored data. |
| P5 | Medium | App switcher used white text on a translucent background; on the six white app headers it was effectively invisible. It also said "5 apps" while listing 8. |
| P6 | Medium | Every app duplicated ~40 lines of header markup; ChuktiGuard passed `currentAppId="feeguard"`. |
| P7 | Medium | `lib/llm.ts` cached every model response in memory, including any future health data. |
| P8 | Medium | `/api/fx` fetched an external API with no timeout; a slow upstream could hang pages (observed during browser testing). |
| P9 | Low | Home page, Ecosystem Hub mini-demos, command palette and metadata repeated the inaccurate claims (Vision OCR 98.6%, DGDA-verified savings 30–50%, real-time mandi prices, 7-day forecasts, freshness grading, "5 apps"). |
| P10 | Low | `/`, `/workspace`, `/chuktiguard` scrolled horizontally at 375 px width. |
| P11 | Info | No authentication exists. "Unified accounts" would need a backend, database and identity provider; none is configured. |

## Per-app findings (summary)

Full detail is in each app's research-and-plan document.

| App | Critical problems found |
|---|---|
| AdmitBuddy | Application deadlines and exam dates for "2026 admissions" were invented (the 2026-27 circulars are not yet published; the 2025-26 GST cycle ran Dec 2025–Jan 2026). "18 real universities" — the dataset has 16. Counselor matched `"du"` as a substring, so "education" returned the Dhaka University answer. Unsourced scholarship claims. Readability score clamped to 65–98. Shortlist and tasks not persisted. |
| MediScan BD | Upload "read" only the **file name**; displayed a random 95–98% "OCR confidence"; invented a doctor and hospital; if nothing matched it **defaulted to Napa + Pantobex** and **invented dosages and durations**. Interaction checker returned "safe according to DGDA and WHO databases" for any unknown pair. Samples used real hospital names. Brand/manufacturer/alternative-brand data was unverified and in at least one case looked wrong. |
| Shohoj Budget | `/\d+/` only matches ASCII digits, so "১২০০ টাকা" was saved as **200**. Voice and SMS entries saved immediately with no confirmation. When no amount was found it invented 150 or 250. Received-money SMS saved as expenses. Entries had no real date; budget not persisted; fake "save ৳3,500" tip; seeded sample expenses into the user's ledger. |
| HaatBazar AI | Hardcoded prices presented as "Real-Time Mandi Rates" and "today's market signal", with invented trend percentages and sell-timing advice. Profit used Dhaka *retail* price minus ৳5 as the farmer's sale price and ignored commission and losses. "AI quality scan" returned a random 94–98 score. Disease notes gave specific pesticide doses without a source. |
| Probaho Coach | Words-per-minute clamped to 110–160 (always looked "normal"); "confidence" was just filler count with a floor of 60; keyword matching hit substrings ("ack" in "back", "lock" in "block"); "like" always counted as a filler; transcript could be analysed before the last speech result arrived. Only 3 questions; no typed mode, consent notice or history. |
| FeeGuard BD | Engine (`lib/finops.ts`) is correct, but the page re-derived numbers with hardcoded labels that disagreed with the values used ("$0.99" vs $2, "$15" vs $20, "1.0%" vs 0.8%), so the displayed lines did not add up. Applied the "2.5% **remittance** incentive" by default, contradicting the app's own rule that this incentive is not for freelancers. Pitch generator was written to move existing marketplace clients off-platform "without triggering automated TOS violation flags". Cited "SRO No. 197-Law/Income Tax/2024" with no source. The Payoneer→bKash route was computed but never shown. No live FX. |

## Security and privacy review

- No secrets in source; `.env*.local` ignored. `PASSPORT_SECRET` falls back to a public dev key with a logged warning (unchanged).
- API routes validate bodies with Zod and are rate-limited (now per route).
- Health data: before this work nothing left the browser, but the UI implied it did ("Vision OCR"). The new optional OCR route requires explicit consent, validates type/size, disables caching, and never logs content. Bangladesh's Personal Data Protection Ordinance 2025 (gazetted Nov 2025 per press reports) treats health data as sensitive and requires specific consent; see `mediscan-research-and-plan.md`.
- CSV exports now neutralise spreadsheet formula injection (Shohoj Budget).
- All stored data is re-validated on read (treated as untrusted).
