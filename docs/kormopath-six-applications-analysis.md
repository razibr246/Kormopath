# Six applications: feature inventory and analysis

Each app's real purpose was determined from its code, not from its marketing copy. "Before" is what the code actually did on 2026-11-05; "After" is what it does now.

## AdmitBuddy — education (`/admitbuddy`, `lib/admitbuddy.ts`)

**Actual purpose:** help a Bangladeshi HSC student choose universities, track applications and draft an SOP.

| Feature | Before | After |
|---|---|---|
| Profile | 3-step wizard, preloaded with a fictional student, not saved | Single form, empty by default, saved on device, validated on read |
| University list | 16 universities (claimed 18), fit score, Reach/Match/Safety | Same 16, fit score explained, eligibility hint, unverified figures labelled, filters incl. "GPA met" and shortlist |
| Deadlines | Invented 2026 dates and countdowns | **No invented dates.** Student copies dates from the official circular with a required source; days-left, overdue state, `.ics` calendar export with a 2-day reminder |
| Tasks | Generated from invented dates, not saved | Per-shortlisted university, undated until a date is entered; completion saved |
| Documents | — | Document checklist (SSC/HSC, photo, NID/birth reg., fee receipt, admit card, quota) |
| SOP | Template + clamped "readability" | Template as a starting point, editable draft saved, real Flesch Reading Ease, generic-phrase warnings |
| Counselor | Keyword replies with invented facts; `"du"` substring bug | Answers only from app data and official links; word-boundary matching; never states an unentered date |
| Resources | — | Official portals (GST admission, PMEAT stipend, UGC) with checked date |

## MediScan BD — health (`/mediscan`, `lib/prescription.ts`, `app/api/mediscan/ocr`)

**Actual purpose:** help a patient understand a prescription they already have (what each medicine is, how often, how long, before/after food) and spot obvious risks. It is not a diagnosis or prescribing tool.

| Feature | Before | After |
|---|---|---|
| Input | File name parsed as if it were the image; fake OCR % | Type/paste text; optional photo transcription **with explicit consent**, user must review the draft |
| Parsing | Unknown text → default medicines; invented doses/durations | Line-by-line: dose `1+0+1` (Bangla digits too), duration, a.c./p.c., strength — only as written; unknown medicines kept and flagged |
| Medicine info | Brand, maker, price, "DGDA-verified" alternative brand | 10 generics with general patient information; brand names used only for recognition; no prices or brand recommendations |
| Interactions | Unknown pair = "safe per DGDA/WHO" | Duplicate ingredient (e.g. two paracetamol products), duplicate PPI, azithromycin + Al/Mg antacid; unknown = "no data — this is not 'safe'" |
| Safety | — | Emergency strip (999, 16263) always visible; red-flag symptom detection (EN/BN) with call-999 action |
| Savings | Hardcoded % savings | Price comparison using prices the user was quoted, course units from the written dose |
| Records | — | Opt-in save on this device, delete one/all; never shared with other apps |

## Shohoj Budget — voice finance (`/shohoj-budget`, `lib/budget.ts`)

**Actual purpose:** quick personal expense/income logging by voice or text for students and young earners, with a monthly budget.

| Feature | Before | After |
|---|---|---|
| Amount parsing | ASCII digits only; "১২০০" → 200; invented defaults | Bangla & ASCII digits, separators, decimals, `২ হাজার ৫০০`, `5k`, spoken words (বারোশো, দেড় হাজার, আড়াই হাজার, সাড়ে তিনশো); null if absent |
| Saving | Immediate | **Always a confirmation card**: shows what was heard, matched words, issues; editable amount/type/category/method/date/note; confirm disabled without a valid amount |
| Income | — | Income detection (পেলাম, বেতন, received…) and income categories |
| SMS | Every SMS = expense, default ৳250 | Debit vs credit, TrxID, counterparty, duplicate-TrxID warning, confirmation |
| Ledger | No dates, no edit | Real dates, month selector, edit with audit history, delete with undo |
| Budget | Not saved | Saved; usage bar with 80%/100% alerts; safe-per-day; straight-line projection labelled "not a guarantee" |
| Analysis | Fake tip | Category breakdown, top-category nudge, unusual-expense flag (>3× category median, ≥3 peers) |
| Recurring | — | Templates (rent, salary…) added per month on user action |
| Bill split | Rounded, could not sum to total | Exact split to the poisha |
| Export / data | — | CSV (formula-injection safe, Excel BOM), migration of v1 data (not deleted), save-failure warning |

## HaatBazar AI — agriculture (`/haatbazar`, `lib/haatbazar.ts`, `app/api/weather`)

**Actual purpose (from code):** farmer-side market decision support (sell locally vs. take to a distant market) plus crop-problem reference. It was **not** a marketplace: no listings, buyers, sellers or transactions existed, so none were invented.

| Feature | Before | After |
|---|---|---|
| Prices | Hardcoded "real-time" rates and trends | Dated price notebook (crop, market, farmgate/wholesale/retail, who said it, date), stale flag after 3 days, link to DAM |
| Trip decision | Retail − ৳5, no commission/loss | Wholesale price, commission %, transport/maund, labour, loss %, other costs; extra vs local; **break-even price** |
| Truck sharing | Fixed "40% saving" claim | Fare split by each farmer's maunds, sums exactly |
| Weather | — | Open-Meteo 24-h forecast by district, rain/wind/temperature, spray-window check, attribution, honest error |
| Calendar | — | Rabi/Kharif-1/Kharif-2 and Aus/Aman/Boro with source |
| Crop problems | Pesticide doses | Symptoms, conditions, prevention, non-chemical steps; chemical control → label + Upazila office / 16123; no doses |
| Photo scan | Random 94–98 score | Removed; honest note pointing to Krishoker Janala and the extension officer |

## Probaho Coach — viva speaking (`/probaho`, `lib/speech.ts`)

**Actual purpose:** practise answering technical viva, HR interview, thesis-defence and Bangla job-viva questions out loud.

| Feature | Before | After |
|---|---|---|
| Questions | 3 technical | 8 across 4 tracks (technical, HR, academic, Bangla), levels, target times, explicit topics, model answers |
| Input | Mic only | Mic (with consent notice) or typed; live interim transcript; transcript editable then re-scored |
| Scoring | Clamped WPM, filler-based "confidence" | Transparent 50/20/30: topic coverage (word-boundary + synonyms), structure (example, conclusion, sentence length), delivery (fillers per 100 words, real pace when timed) |
| Feedback | One generic sentence | Covered/missing topics, specific tips, follow-up question, model answer after attempt |
| Audio | — | Optional local playback of own recording (memory only, never uploaded) |
| Progress | — | Local history (scores only unless transcripts opted in), early vs recent average, weakest area, days practised, delete |
| Fairness | — | No pronunciation/accent scoring, stated on screen |

## FeeGuard BD — fee saver (`/feeguard`, `lib/finops.ts`)

**Actual purpose:** show a Bangladeshi freelancer how much of an invoice reaches them through Fiverr, Upwork, Payoneer→bKash or a direct bank wire, and what the "20%" marketplace fee really costs. Beneficiary: the freelancer. Savings come from fee differences between routes, not from discounts or partnerships (none exist).

| Feature | Before | After |
|---|---|---|
| Channels | 3 shown, bKash computed but hidden | 4 cards rendered from the engine's own steps; best route; on-screen reconciliation check |
| Fees | Hardcoded labels disagreeing with values | Each fee editable with its source, confidence and checked date |
| FX | Fixed 120 | Live mid-market rate via `/api/fx` (6 s timeout, fallback labelled), editable |
| Incentive | 2.5% "remittance" incentive on by default | Off by default; named correctly as the export incentive; eligibility stated |
| Savings claim | "Stop losing 20%", yearly gain | Difference vs Fiverr and vs best marketplace, with conditions (finding clients yourself, ToS, variable Upwork fee) |
| Reality check | — | Enter what actually arrived → real total cost %, vs estimate; saved payment records with CSV |
| Pitch | Move marketplace clients off-platform | Email for clients you found yourself, with ToS warning |
| Tax | Unsourced SRO number | Tax rules from `lib/data.ts` with sources; "not tax advice" |

## Cross-app

- Shared `AppHeader` (identity, KormoPath link, switcher, privacy chip, skip link), `SourceTag` (where a number came from), `clientStore` (namespaced, validated, hydration-safe storage).
- `/settings`: per-app list of stored data, export JSON, delete per app; health data marked sensitive; deleting one app leaves the others.
- Apps stay independent: no app reads another app's storage; MediScan data is never shared. The only shared item is the pre-existing unified profile (shortlist sync from AdmitBuddy).
