# Testing report

Run on 2026-11-05, macOS, Node v24.18.0, Next.js 15.5.28 production build, Google Chrome (headless) via puppeteer-core 23.11.1.

## Commands run and results

| Command | Result |
|---|---|
| `npm test` (baseline, before changes) | 17/17 passed, but **process did not exit** (timer leak) |
| `npm run build` (baseline) | **Failed** (`/_not-found` invariant, stale `.next`); clean build passed |
| `npx tsc --noEmit -p .` (final) | No errors |
| `npm test` (final) | **58/58 passed**, exits normally (~0.3 s) |
| `npm run build` (final) | Success, 21 routes |
| `tests/e2e/browser.mjs` against `next start -p 3100` (final) | **71/71 checks passed** |

## Unit tests (58)

| File | Tests | Covers |
|---|---|---|
| `tests/core.test.ts` | 15 | Fee engine (Fiverr, wire+incentive, reconciliation invariant over amounts/withdrawals, non-negative, best channel, batching), digit grouping, evidence grounding, numbers must appear, milestone sums, rate limiter, list balance, SOP readability, ChuktiGuard, FeeGuard effective cost/CSV |
| `tests/budget.test.ts` | 13 | Bangla digits, the "আজকে বাজারে ১২০০ টাকা" example, separators/multipliers, Bangla number words, null amount, income/method, SMS in/out/OTP, poisha sums, budget pace, exact split, CSV injection, stored-data validation, legacy migration, unusual expense |
| `tests/mediscan.test.ts` | 7 | Dose/duration/meal timing from text only, missing fields reported, unknown medicines kept, Bangla digits, duplicate/caution/no-data, red flags, price comparison and course units |
| `tests/haatbazar.test.ts` | 7 | Trip margin, break-even (rounded up), not-worth-it case, truck share sums, price age, spray window, season lookup, no doses in disease notes |
| `tests/speech.test.ts` | 9 | Word-boundary matching, contextual "like", real pace, typed answers, weak answers/follow-ups, score sum, Bangla, progress, every model answer covers its topics |
| `tests/admitbuddy.test.ts` | 8 | No invented deadlines, user deadlines/closed, Reach for selective public, undated tasks, validation, counselor fixes, Flesch, `.ics` |

## Browser checks (71)

Workflows exercised end-to-end in a real browser on the production build:

- **Shohoj Budget (14):** typed the user's example → confirmation card with 1200 and groceries → nothing saved before confirm → confirm → reload persistence → edit with audit trail → delete and undo → amount-less entry blocked → income SMS → legacy v1 migration.
- **MediScan BD (13):** emergency numbers visible; fake badges gone; upload disabled without consent; samples read; unknown medicine flagged; azithromycin + antacid caution; duplicate paracetamol; red-flag alert; unknown pair "no data"; opt-in save persists; OCR API rejects missing consent (400) and bad type (400); returns 503 with no key configured.
- **FeeGuard BD (8):** invariant banner; 4 routes; incentive off; removed claims; FX source label; each card's lines sum to net within ৳2 display rounding; reality check; record persists.
- **HaatBazar AI (8):** fake claims removed; 16123 shown; **live Open-Meteo forecast loaded** with attribution and spray advice; trip result; "sell locally" when costs exceed the gap; price note persists with ৳/maund; weather API rejects unknown district (400).
- **Probaho Coach (7):** typed answer → follow-up, missing topics, fillers → model answer → history/progress persist → Bangla track → mic consent notice.
- **AdmitBuddy (9):** no invented countdowns; profile form; "date not added"; shortlist → undated tasks; dated deadline with source; missing source rejected; reload persistence; counselor fix; SOP analysis.
- **Settings (2):** per-app listing with health marked sensitive; deleting Probaho data left Shohoj data intact.
- **Mobile 375 px (10 routes):** no horizontal scroll on `/`, the six apps, `/settings`, `/workspace`, `/chuktiguard`.

### Console and network
The final run logged 5 entries, all expected: three 400s and one 503 from the deliberate negative API checks, and one `ERR_ABORTED` for `/api/fx` when a test closed a page mid-request. No uncaught page errors.

### Problems the tests found (and fixes)
First browser run: 63/70. Fixed: duplicate button label on Shohoj (UX bug); `/api/fx` hang (added timeout); overflow on `/`, `/chuktiguard`, `/workspace`; two test-script issues (wrong button chosen, a native date-input quirk). Unit tests found the break-even rounding bug and a model-answer/topic mismatch.

## Not tested
- Real microphone input (headless Chrome has no mic); the speech code paths were exercised only through typed input and the consent screen.
- Real Gemini OCR (no `GEMINI_API_KEY` in this environment).
- Safari, Firefox and real Android devices; screen-reader walkthroughs; Lighthouse performance runs.
- The core `/workspace` pipeline beyond page load and layout (unchanged in this work).

## Update 2026-11-05: competitor-inspired features

| Command | Result |
|---|---|
| `npm test` | **70/70 pass** (12 new in `tests/features.test.ts`) |
| `npx tsc --noEmit` | clean |
| `npm run build` (clean `.next`) | success, 28 routes + middleware |
| `tests/e2e/browser.mjs` vs `next start -p 3100` | first run 86/87 (reminder label showed lowercase alias "napa" → fixed to prescription spelling); **final 87/87** |

New browser checks (16): Shohoj category budget with Bangla digits, goal progress and per-month amount, persistence, no silent transaction; MediScan ml/frequency reading, 1+0+1 timetable, bd line left unscheduled, `.ics` content (2 events × 5 days), export does not save the prescription; AdmitBuddy stage/next step and persistence; Probaho STAR flags and streak; security headers, 413 on oversized body, normal requests unaffected.

Console errors in the run are the deliberate bad-request checks (400/422) and one fetch aborted on page close.
