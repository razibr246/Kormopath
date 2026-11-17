# Implementation report

Work date: 2026-11-05. A full copy of the original source was taken before any change (the repo is not under git).

## Platform-wide

| Change | Files |
|---|---|
| Rate-limit sweep timer `unref()` (tests now exit); separate bucket per route | `lib/rateLimit.ts`, `app/api/{audit,viva,pitch,receipt}/route.ts` |
| `structured(..., { cache: false })` option so sensitive inputs are not cached | `lib/llm.ts` |
| `/api/fx` 6 s upstream timeout with labelled fallback | `app/api/fx/route.ts` |
| Namespaced, validated, hydration-safe storage hook + CSV download helper | `lib/clientStore.ts` (new) |
| Shared app header with skip link and privacy chip; `SourceTag` | `components/AppHeader.tsx` (new) |
| App switcher: light variant for white headers, correct app count, settings link, aria-label | `components/AppSwitcherDropdown.tsx` |
| Data & privacy page (list/export/delete per app) | `app/settings/page.tsx` (new) |
| Removed inaccurate claims from home, hub mini-demos, command palette, metadata; hub budget demo now uses the real parser | `app/page.tsx`, `components/EcosystemHub.tsx`, `components/CommandPalette.tsx`, `app/layout.tsx`, `components/AgriculturalLifecycle.tsx` |
| Mobile overflow fixes on `/`, `/workspace`, `/chuktiguard`; ChuktiGuard switcher id fixed | `components/Chrome.tsx`, `app/globals.css`, `app/chuktiguard/page.tsx` |

## Per app

| App | New / rewritten | Summary |
|---|---|---|
| AdmitBuddy | `lib/admitbuddy.ts` (types, data, logic), `app/admitbuddy/page.tsx` | No invented dates; sourced user deadlines; tracker, checklist, `.ics`; persisted profile/shortlist/tasks/SOP; honest counselor; Flesch readability; official links |
| MediScan BD | `lib/prescription.ts`, `app/mediscan/page.tsx`, `app/api/mediscan/ocr/route.ts` (new) | Text-first reader; consent-gated OCR; emergency strip + red flags; duplicate/known-caution checks; "no data ≠ safe"; user-quote price comparison; opt-in local records |
| Shohoj Budget | `lib/budget.ts` (new), `app/shohoj-budget/page.tsx` | Bangla digits/number words; mandatory confirmation; income; dated editable ledger with audit history and undo; budget alerts; category analysis; SMS debit/credit; recurring; exact bill split; CSV; v1 migration |
| HaatBazar AI | `lib/haatbazar.ts`, `app/haatbazar/page.tsx`, `app/api/weather/route.ts` (new) | Full-cost trip decision + break-even; truck share; dated price notebook; weather + spray window; season calendar; disease notes without doses |
| Probaho Coach | `lib/speech.ts` (new), `app/probaho/page.tsx` | 8-question bank in 4 tracks; consent; typed mode; transparent scoring; follow-ups; model answers; optional local playback; history/progress |
| FeeGuard BD | `lib/finops.ts` (+3 functions), `app/feeguard/page.tsx` | Engine-rendered steps; 4 routes; live FX; editable sourced fees; incentive off by default; reality check + records; compliant pitch |

## Bugs found and fixed

1. `npm test` never exited (interval kept event loop alive).
2. Rate limiter shared one bucket across routes.
3. Shohoj: "১২০০" saved as 200.
4. Shohoj: voice/SMS saved without confirmation; invented default amounts; income SMS stored as expense.
5. MediScan: upload parsed the file name; fabricated OCR %, doctor, hospital, medicines, doses, durations; unknown pairs called safe.
6. HaatBazar: retail price used as farmer sale price; no commission/loss; random scan score.
7. Probaho: WPM clamp; substring keyword matches; "like" as filler; analysis race on stop.
8. AdmitBuddy: `"du"` substring triggered Dhaka University answer; university count claim; readability clamp.
9. FeeGuard: displayed lines did not add up to net; wrong labels; wrong incentive default; CSV differed from screen.
10. App switcher invisible on white headers; wrong app count; ChuktiGuard showed FeeGuard as current app.
11. Hydration-unsafe `localStorage` reads.
12. `/api/fx` could hang without timeout.
13. Horizontal scroll at 375 px on three pages.
14. Two identical "বুঝে নিন" buttons on Shohoj (found by the browser test).
15. Break-even price rounding understated the minimum price (found by unit test; now rounds up).
16. Probaho model answer did not match its own topic terms (found by unit test).

## Dependencies
None added to the project. `puppeteer-core@23.11.1` was installed **outside** the repo (scratchpad) to drive the local Chrome for browser tests.

## Tests changed
- Removed: `Prescription parser detects molecules, DGDA alternatives, and savings` (asserted OCR confidence ≥ 90, a fabricated value), `Clinical drug interaction checker catches absorption clashes` (old API; replaced by `tests/mediscan.test.ts`), `Agricultural transport arbitrage…` (tested inline arithmetic, not app code; replaced by `tests/haatbazar.test.ts`), `Counselor query handles sparse upcoming deadlines…` (old data shape; replaced in `tests/admitbuddy.test.ts`).
- Updated: SOP readability test now checks that plain text scores higher than dense text, instead of asserting the clamped range.
- Added: `tests/{budget,mediscan,haatbazar,speech,admitbuddy}.test.ts` and FeeGuard helper tests in `core.test.ts`.
