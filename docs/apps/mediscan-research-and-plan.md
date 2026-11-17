# MediScan BD — research and plan

## Audit
Before: file *name* parsed as the prescription, random 95–98% "OCR confidence", invented doctor/hospital, default medicines when nothing matched, invented doses and durations, "safe per DGDA/WHO" for any unknown pair, unverified brand/manufacturer/alternative data (e.g. the data attributed Maxpro to Square; this looked wrong and could not be verified), real hospital names on fictional samples. This was treated as the highest-risk app.

## Research (checked 2026-11-05)

| # | Reference | Finding | Reliability | Licence / use |
|---|---|---|---|---|
| 1 | Dhaka Tribune: "National emergency service 999 receives over 72.36 million calls since launch" | 999 = toll-free police/fire/ambulance, launched 12 Dec 2017 | National newspaper | Number shown in app |
| 2 | Prothom Alo / DGHS slides / BMRC bulletin on Shastho Batayon 16263 | Government 24/7 free health-advice line | Mixed; launch year conflicts (2006 vs 2015) | Number shown in app |
| 3 | The Financial Express: "natl telehealth helpline 16263 faces shutdown amid funding crisis"; JagoNews24 | Funding problems, staff unpaid | News; undated in results | Disclosed in app ("if unavailable, go to nearest hospital") |
| 4 | Daily Star / TBS / Prothom Alo / Mahbub & Co. on Personal Data Protection Ordinance 2025 | Health data is "sensitive"; specific consent required; cabinet approval 9 Oct 2025, gazette 9 Nov 2025 (BSS) | Press + law-firm summaries, not the ordinance text | Drove consent gate and local-only storage |
| 5 | MedEx (medex.com.bd, App Store listing) | Largest A–Z brand/generic index in BD; no official public API | Vendor listing | Not used as data (no licence/API) |
| 6 | DGDA Drug Verification app (reported) | Government-linked app to verify medicines and approved price | Secondary reports | Users are pointed to it for prices |
| 7 | DIMS (ITmedicus) App Store listing | Drug index with pack size & price | Vendor listing | Reference only |
| 8 | Arogga, MedKhata, MMedIndex (store listings) | Online pharmacy / family medicine lists | Vendor listings | Pattern only |
| 9 | WHO Bangladesh news on digital monitoring of essential medicines | DGHS-MIS, DGDA, WHO assess availability/affordability | WHO | Background |
| 10 | Fasten Health (docs, GitHub) | Self-hosted personal health record aggregator; GPL-3.0; last push May 2025 | Project docs | Not used (GPL; different scope) |
| 11 | Medplum | Developer platform for healthcare apps; licence not confirmed in results | One-line description | Not used |

**Conclusions used**
1. No openly licensed, official Bangladeshi drug-price API was found → do not ship prices; compare prices the user was quoted.
2. Health data is sensitive under the 2025 ordinance → no server storage, explicit consent before any image leaves the device, delete controls.
3. "No data" must never be shown as "safe".

## Clinical-content notes
- Reference list: 10 generics with general patient-leaflet-level notes; brand names only for recognition (`DRUG_REFERENCE` in `lib/prescription.ts`, reviewed 2026-11-05).
- Interaction rules kept deliberately small and well-known: duplicate ingredient (e.g. paracetamol in two products), duplicate PPI class, azithromycin with Al/Mg antacids (stated in azithromycin product information). The previous "PPIs reduce azithromycin absorption" note was replaced because it conflated PPIs with antacids.
- **These notes have not been reviewed by a pharmacist.** A clinical review is required before any public launch.

## Roadmap

| Priority | Item | Status |
|---|---|---|
| P0 | Remove fabricated OCR/doses/medicines/"safe" verdicts | Done |
| P0 | Emergency strip + red-flag detection | Done |
| P0 | Consent-gated, non-caching OCR route; local-only opt-in records | Done |
| P1 | Price comparison from user quotes | Done |
| P1 | Pharmacist review of every note and rule | **Blocked** — needs a qualified reviewer |
| P2 | Lab-report explainer (reference ranges with sources) | Not done — needs a sourced range table |
| P2 | Medication reminders | Done (2026-11-05) as a daily timetable + `.ics` calendar export from X+X+X doses only; "bd/tds" lines are not given clock times |
| P2 | Parse "2 tsp", "5 ml" style liquid doses | Done (2026-11-05): amount/unit as written (no unit conversion), od/bd/tds/qid and "দিনে ৩ বার"; spoon doses tell the user to use the supplied measuring cup |

## Design
Calm sky/cyan, high contrast, large readable Bangla, emergency information never hidden, uncertainty in amber, "not recognised" cards outlined.

## Testing
`tests/mediscan.test.ts` (7 tests) and browser checks: samples, unknown medicine, duplicate paracetamol, azithromycin+antacid, red flag, unknown pair = "no data", opt-in save persistence, API rejects missing consent and bad types, returns 503 without a key.
