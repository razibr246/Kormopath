# Competitor and reference analysis

Checked 2026-11-05 through web search. Most results were secondary sources (news, reviews, vendor pages). The brief asked for at least 10 references per app; that target was **met only for MediScan BD**. The other apps have 6–9 references each, listed in their own documents. Nothing below is invented; where a claim could not be confirmed it says so.

## Summary by app

| App | References reviewed | Strongest ideas adopted | What KormoPath now does differently |
|---|---|---|---|
| AdmitBuddy | 8 (GST portal reports, BSS, PMEAT portal reports, Common App, ApplyKit, ApplyWise, SayHelloCollege, Wikipedia) | Per-school checklists, deadline reminders, % complete | Dates must come from the official circular with a source; Bangladesh-specific checklist; `.ics` export |
| MediScan BD | 11 (999, 16263, PDPO 2025 coverage, MedEx, DGDA app, DIMS, Arogga/MedKhata/MMedIndex, WHO BD, Fasten, Medplum) | Plain-language explanations, verification apps for prices | Explains only what is written; flags unknowns; emergency-first; consent-gated OCR; no price database claims |
| Shohoj Budget | 8 (Actual, Firefly III, Pocket Clear, Hishabee, TallyKhata, Jhinuk, Web Speech docs) | Simple categories, offline, mixed cash/MFS | Bangla number words, confirmation before save, SMS debit/credit, audit history |
| HaatBazar AI | 9 (DAM, AgriPriceBD, 16123, Krishoker Janala, Plantix pilot, iFarmer Folon, Open-Meteo, Banglapedia/UNCC/USDA, FEWS NET) | Extension-service referral, disease reference, weather | Full-cost trip decision with break-even; dated price notebook; spray window; no invented prices or doses |
| Probaho Coach | 7 (Yoodli ×2, Big Interview, Orai, Poised, hyperbound, Web Speech) | Fillers, pace, follow-up questions | Transparent rubric per question, Bangla viva track, no accent scoring, typed mode |
| FeeGuard BD | 6 (existing sourced fee data, Upwork fee explainers, client fee, Wise/Payoneer comparisons, open.er-api) | Fee breakdowns and route comparison | Reality check vs actual receipt; reconciliation shown; correctly scoped incentive |

## Licensing notes

| Project | Licence (as reported) | Used? |
|---|---|---|
| Actual Budget | MIT | Ideas only, no code |
| Firefly III | AGPL-3.0 | No (copyleft; ideas only) |
| Fasten Health | GPL-3.0 + commercial | No |
| Open-Meteo | Data CC BY 4.0; code AGPL-3.0; free API tier for non-commercial use (sources conflict on commercial terms) | API used with attribution; **check terms before commercial launch** |
| MedEx | No public API; third-party scrapers exist | Not used (no licence) |
| DAM daily prices | Government publication; reuse terms not checked | Linked only |

## Gaps worth closing
- Read official pages directly (Upwork fee help page, bKash/Payoneer fee page, DAM site, Open-Meteo terms, PDPO gazette text) rather than relying on secondary summaries.
- Find a licensable Bangladeshi drug reference (DGDA) and a pharmacist reviewer.
- Collect 2026-27 admission circulars as they are published.
