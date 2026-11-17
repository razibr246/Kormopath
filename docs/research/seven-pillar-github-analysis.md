# Seven-pillar GitHub analysis

Open-source projects on GitHub that do similar work to each KormoPath pillar, and one idea from each that KormoPath could use.

**How this was collected (2026-11-17).** Every row comes from the GitHub REST search API (`/search/repositories`), queried on 2026-11-17. "Stars" is `stargazers_count`. "Last push" is the repository's `pushed_at` date, which is the latest push to any branch. It is close to, but not exactly, the last commit on the default branch. Licence is GitHub's detected SPDX id. `NOASSERTION` means GitHub could not identify one licence, so check the repository before reusing code. Numbers change daily. No repository or number below was added from memory. When a search found nothing usable, the table says so.

**What KormoPath must keep while borrowing ideas** (from `AGENTS.md`):
- no accounts and no database; data stays on the device through `lib/clientStore.ts`
- money and health maths stay in pure, deterministic functions
- every model call has a rule-based or template fallback, and the fallback shows in the trace
- no invented facts: unverifiable data is entered by the user, with its source and date

---

## 01 Study: AdmitBuddy (`app/admitbuddy`, `lib/admitbuddy.ts`)

| Repo | Stars | Last push | Licence | What it does |
|---|---|---|---|---|
| [learningequality/kolibri](https://github.com/learningequality/kolibri) | 1177 | 2026-11-17 | MIT | Offline-first learning platform; content is shared device to device without internet |
| [moodle/moodle](https://github.com/moodle/moodle) | 7617 | 2026-11-17 | GPL-3.0 | Server-hosted learning management system with accounts, courses and grading |
| [oppia/oppia](https://github.com/oppia/oppia) | 6996 | 2026-11-17 | Apache-2.0 | Interactive lessons with feedback for each answer, designed for low-resource learners |
| [hscstack/platform](https://github.com/hscstack/platform) | 13 | 2026-11-09 | Apache-2.0 | Curated HSC/SSC resources for Bangladeshi students, maintained by the community |
| [ESRAILHAQUE/bangladesh-education-datasets](https://github.com/ESRAILHAQUE/bangladesh-education-datasets) | 5 | 2025-08-19 | none detected | Open JSON lists of Bangladeshi universities and National University colleges |

**Ideas to borrow**
- **Kolibri:** export and import content as one package without a server. AdmitBuddy could export a "deadline pack" (the user's own entered dates and sources) as a JSON file that a friend imports through `/settings`. The backup allowlist in `lib/backup.ts` already supports this.
- **Already shipped:** an offline spaced-revision study plan built by deterministic rules (`lib/admitbuddy.ts` `buildStudyPlan`, `components/apps/admitbuddy/StudyPlanner.tsx`, roadmap 1B). Oppia's ideas below would add to it.
- **Oppia:** feedback for each wrong answer. Show a short explanation for each eligibility rule a user fails, taken from the rule itself in `lib/admitbuddy.ts`, not from a model.
- **bangladesh-education-datasets:** a list of institution names to fill an autocomplete. Only names would be used, never dates or seat numbers, and each name keeps a link to the dataset and the date it was checked, so the no-invented-facts rule still holds. Licence is undetected, so ask the author before reusing it.

## 02 Skills and work: Workspace (Auditor, Examiner, Skill Passport), Probaho, opportunities

| Repo | Stars | Last push | Licence | What it does |
|---|---|---|---|---|
| [learningeconomy/LearnCard](https://github.com/learningeconomy/LearnCard) | 71 | 2026-11-17 | MIT | Open-source learning passport: learners collect and share skills as verifiable credentials |
| [digitalbazaar/vc](https://github.com/digitalbazaar/vc) | 216 | 2026-02-05 | BSD-3-Clause | JavaScript library for issuing and verifying W3C Verifiable Credentials |
| [luisgf/openbadgeslib](https://github.com/luisgf/openbadgeslib) | 2 | 2026-10-27 | LGPL-3.0 | Python library and CLI to issue, verify and revoke Open Badges 3.0 credentials |
| [xitanggg/open-resume](https://github.com/xitanggg/open-resume) | 8989 | 2024-10-29 | AGPL-3.0 | Resume builder and parser that runs in the browser |
| [jensjorisdecorte/Skill-Extraction-benchmark](https://github.com/jensjorisdecorte/Skill-Extraction-benchmark) | 17 | 2024-07-18 | none detected | Evaluation data for extracting skills from text, labelled with the ESCO taxonomy |

**Ideas to borrow**
- **LearnCard / digitalbazaar/vc:** KormoPath already has the first step. `lib/badge.ts` builds an *unsigned* JSON file in the Open Badges 3.0 shape from the passport, linked from the Examiner stage (roadmap 2A), and the evidence link points to `/verify`. The next step these projects show is *signing* it, with a Data Integrity proof or a JWT-VC from a published issuer key, so any wallet can verify it. Until then, keep the current statement that the file is unsigned and "does not establish identity".
- **open-resume:** parses the PDF in the browser, with no upload. Doing this before calling the model would give the Auditor a fallback when there is no key: the text is extracted on the device and `ruleExtract` runs on it. Right now, image and PDF reading need `GEMINI_API_KEY`. open-resume is AGPL-3.0, so copy the idea and write new code rather than copying its source.
- **ESCO benchmark:** add skill-extraction cases to the `/trust` evals, labelled with ESCO, so the "every skill quotes the CV" check is also measured for recall, not only precision.

Searches for a Bangla resume parser returned nothing.

## 03 Earn: ChuktiGuard (contracts), FeeGuard (payout fees), Outreach

| Repo | Stars | Last push | Licence | What it does |
|---|---|---|---|---|
| [jhpyle/docassemble](https://github.com/jhpyle/docassemble) | 1016 | 2026-11-13 | MIT | Guided interviews that assemble legal documents from YAML templates |
| [SuffolkLITLab/docassemble-AssemblyLine](https://github.com/SuffolkLITLab/docassemble-AssemblyLine) | 74 | 2026-11-16 | MIT | Turns paper court forms into step-by-step web interviews built on docassemble |
| [invoiceninja/invoiceninja](https://github.com/invoiceninja/invoiceninja) | 10597 | 2026-11-16 | NOASSERTION (source-available) | Invoices, quotes and time tracking for freelancers |
| [apache/fineract](https://github.com/apache/fineract) | 2631 | 2026-11-17 | Apache-2.0 | Core banking for microfinance and financial inclusion |
| [mojaloop/central-ledger](https://github.com/mojaloop/central-ledger) | 60 | 2026-11-17 | NOASSERTION | Ledger for the Mojaloop instant-payment switch; records and settles transfers between providers |
| [beckn/protocol-specifications](https://github.com/beckn/protocol-specifications) | 456 | 2025-10-10 | NOASSERTION | Beckn/ONDC open-network protocol specification for buyers and sellers |

**Ideas to borrow**
- **docassemble:** the template stays fixed and the user fills fields through an interview. `lib/contract.ts` already works this way. The idea to borrow is *conditional clause inclusion driven by validated answers* (for example: "Is the client outside Bangladesh?" adds the FX clause). The model never takes part.
- **invoiceninja:** contract → invoice → payment record. A deterministic invoice generated from the ChuktiGuard contract fields (same amounts, checked with `unknownAmounts`) would close the Earn loop, with no server.
- **Mojaloop central-ledger:** every transfer is recorded as balanced ledger entries. FeeGuard's reconciliation invariant (gross = itemized steps + net) already does the same. These ledger tests are a good model for property tests of `lib/finops.ts`.
- **Fineract / Beckn:** these are infrastructure. KormoPath cannot use them without a licensed partner (see the roadmap).

A search for Accord Project (`cicero`) found no repository under that name.

## 04 Home and money: Shohoj Budget (`lib/budget.ts`)

| Repo | Stars | Last push | Licence | What it does |
|---|---|---|---|---|
| [actualbudget/actual](https://github.com/actualbudget/actual) | 30318 | 2026-11-17 | MIT | Local-first personal finance app; sync is optional |
| [firefly-iii/firefly-iii](https://github.com/firefly-iii/firefly-iii) | 25262 | 2026-11-16 | AGPL-3.0 | Self-hosted personal finance manager with rules and budgets |
| [ajshovon/bd-sms-parsers](https://github.com/ajshovon/bd-sms-parsers) | 1 | 2026-10-03 | AGPL-3.0 | Kotlin library that parses bKash, Nagad, Rocket, Upay and Bangladeshi bank transaction SMS |
| [nadimtuhin/bd-trx-parser](https://github.com/nadimtuhin/bd-trx-parser) | 1 | 2026-10-14 | MIT | Parses transaction SMS from Bangladeshi banks and wallets (bKash, Nagad, EBL, DBBL and others) |
| [ssi-anik/bd-income-tax-calculator](https://github.com/ssi-anik/bd-income-tax-calculator) | 88 | 2023-12-20 | MPL-2.0 | Bangladesh personal income tax calculator in the browser |

**Ideas to borrow**
- **Already shipped:** rent and bill pockets in Shohoj (`lib/budget.ts` `planPockets`, `components/apps/RentPocketsPanel.tsx`, roadmap 4B).
- **Actual:** local-first with an *optional*, end-to-end encrypted sync. This is the right direction if KormoPath ever adds cross-device sync: the user keeps the key, and the server only stores encrypted data.
- **Firefly III:** user-defined auto-categorisation rules ("if payee contains X, category Y"). These would be deterministic rules stored on the device, run before any model suggestion.
- **bd-trx-parser (MIT):** a set of real bKash, Nagad and bank SMS formats. Shohoj could add these as regex test fixtures, without copying code. A parsed SMS still goes to the confirm-before-save step.
- **bd-income-tax-calculator:** tax slabs stored as data with a source. Any KormoPath tax estimate must keep the source URL and check date (as `lib/data.ts` does), because the slabs change with each Finance Act.

## 05 Health: MediScan BD (`lib/prescription.ts`, `api/mediscan/ocr`)

| Repo | Stars | Last push | Licence | What it does |
|---|---|---|---|---|
| [openmrs/openmrs-core](https://github.com/openmrs/openmrs-core) | 1995 | 2026-11-16 | NOASSERTION | Medical record system for clinics |
| [medic/cht-core](https://github.com/medic/cht-core) | 564 | 2026-11-16 | AGPL-3.0 | Community Health Toolkit: offline-first apps for community health workers |
| [dhis2/dhis2-core](https://github.com/dhis2/dhis2-core) | 361 | 2026-11-17 | BSD-3-Clause | Health information system for aggregate reporting, used by many health ministries |
| [WSAyan/medicinedb](https://github.com/WSAyan/medicinedb) | 61 | 2021-09-29 | MIT | SQLite database of medicines |
| [shubhobrataroy/BDMedMate](https://github.com/shubhobrataroy/BDMedMate) | 6 | 2023-05-13 | none detected | Offline drug index for Android, currently Bangladeshi medicines |
| [asiff00/bangla-pdf-ocr](https://github.com/asiff00/bangla-pdf-ocr) | 22 | 2024-10-12 | MIT | Converts Bangla PDFs to text with no extra downloads |

**Ideas to borrow**
- **Already shipped:** a MediScan adherence tracker with deterministic proportion-of-days-covered maths (`lib/adherence.ts`, `app/mediscan/AdherenceTracker.tsx`, roadmap 5B). It is a personal log, not a CHT workflow.
- **CHT:** task and referral rules are written as deterministic configuration, and the danger-sign rules always lead to "refer now". This matches MediScan's emergency strip, which is always visible. CHT's way of writing and testing rules (rules as data, with unit tests) is a good pattern for `lib/prescription.ts`.
- **OpenMRS / DHIS2:** need a facility, accounts and a server. Not suitable for KormoPath; noted in the roadmap.
- **medicinedb / BDMedMate:** an offline list of brand-to-generic names. Only use one that has a licence and a check date. Even then, "not in our list" must never mean "safe", and the list must never suggest switching brands. These datasets are years old (last pushes 2021 and 2023), so they would need re-checking against the DGDA register first.
- **bangla-pdf-ocr:** OCR on the device as a fallback when there is no key. Today MediScan OCR needs Gemini and consent. A local Tesseract-style fallback could fill the text box, and the user still confirms the text before it is saved.

## 06 Field: MaathSathi (`app/krishi`), HaatBazar (`lib/haatbazar.ts`)

| Repo | Stars | Last push | Licence | What it does |
|---|---|---|---|---|
| [farmOS/farmOS](https://github.com/farmOS/farmOS) | 1389 | 2026-11-05 | GPL-2.0 | Web-based farm records: assets, logs, plans |
| [spMohanty/PlantVillage-Dataset](https://github.com/spMohanty/PlantVillage-Dataset) | 1038 | 2026-02-05 | none detected | Labelled images of diseased plant leaves |
| [agstack/OpenAgri-WeatherService](https://github.com/agstack/OpenAgri-WeatherService) | 23 | 2026-08-06 | Apache-2.0 | Weather forecasts with farm indicators (for example spray windows, growing degree days) |
| [Open-ET/openet-ssebop](https://github.com/Open-ET/openet-ssebop) | 58 | 2026-11-09 | Apache-2.0 | SSEBop evapotranspiration model on Earth Engine (part of OpenET) |
| [farhad324/Auto-Chloro-A-Crop-Disease-Classifier-and-Remedies-Provider-In-Bangla](https://github.com/farhad324/Auto-Chloro-A-Crop-Disease-Classifier-and-Remedies-Provider-In-Bangla) | 13 | 2021-03-30 | MIT | Crop disease classifier that gives remedies in Bangla |
| [shamspias/AgriAid](https://github.com/shamspias/AgriAid) | 7 | 2023-03-31 | none detected | Disease forecasting and identification for farmers in Bangladesh |

**Ideas to borrow**
- **farmOS:** its data model of *assets* (a plot, a pond, a cow) and *logs* (activity, input, harvest, observation). MaathSathi now exports a farm record in this shape, marked "self-recorded, not verified" (`lib/krishi.ts` `buildFarmRecord`, `components/apps/krishi/FarmRecord.tsx`, roadmap 6B). Sowing is mapped to an activity log because MaathSathi does not track plant assets. The remaining step is live sync, which needs a farmOS server run by a cooperative.
- **OpenAgri-WeatherService:** farm indicators computed by rule from a forecast (for example "no spraying when wind is above X or rain is expected within Y hours"). KormoPath already gets Open-Meteo data from `api/weather`. A deterministic spray-window or irrigation hint fits, as long as it never gives a pesticide dose.
- **OpenET:** evapotranspiration is a good base for irrigation advice, but it covers the US and needs Earth Engine, so it is roadmap only.
- **PlantVillage / Auto-Chloro:** PlantVillage images are lab-style leaves on plain backgrounds, so a model trained only on them should not be trusted on photos taken in the field. If MaathSathi's crop doctor uses images, it should show the top candidates as "possible, check with your Upazila agriculture officer / 16123", never one diagnosis. Remedies must not include doses.

A search for Digital Green's Farmer.Chat found no official public repository, only an unrelated hackathon prototype, so it is not listed.

## 07 Protect: Rokkha (in development: scams, disasters)

| Repo | Stars | Last push | Licence | What it does |
|---|---|---|---|---|
| [sahana/eden](https://github.com/sahana/eden) | 35 | 2026-11-16 | MIT | Humanitarian and emergency management toolkit (shelters, missing persons, requests) |
| [google/cap-library](https://github.com/google/cap-library) | 88 | 2019-09-23 | Apache-2.0 | Common Alerting Protocol library. **Archived** (read-only) |
| [morrissimo/NWS-CAP-parser](https://github.com/morrissimo/NWS-CAP-parser) | 31 | 2012-11-05 | MIT | Small Python parser for CAP XML alerts (old, but shows how little code is needed) |
| [sameer-at-git/Bangla-SMS-Spam-Detection-Using-RoBERTa-XLMRoBERTa-BERT](https://github.com/sameer-at-git/Bangla-SMS-Spam-Detection-Using-RoBERTa-XLMRoBERTa-BERT) | 1 | 2025-09-22 | MIT | Research code: transformer models for detecting Bengali SMS spam |
| [Xrenes/BanglaPhish-2026](https://github.com/Xrenes/BanglaPhish-2026) | 0 | 2026-05-29 | NOASSERTION (README states CC BY-NC 4.0) | Synthetic Bangla phishing and scam benchmark data, 6,000 samples |
| [realsamiul/Kalopathor-public](https://github.com/realsamiul/Kalopathor-public) | 1 | 2026-09-25 | none detected | Bangladesh flood early-warning prototype: SAR detection, CAP alerts, evacuation routes |

**Ideas to borrow**
- **CAP (cap-library, NWS-CAP-parser):** CAP is a small XML format (`info`, `area`, `severity`, `urgency`, `expires`). Rokkha should parse official CAP feeds when they are available, and always show the issuer and the `expires` time. An expired alert is shown as expired, not as current.
- **Sahana Eden:** keep the *checklist* idea (go-bag, important documents, family meeting point) and leave the server out. The checklist lives on the device under a `kormopath:rokkha:*` namespace, which must be added to the allowlist in `lib/backup.ts`.
- **BanglaPhish-2026:** use it *only as an evaluation set* for a rule-based scam checker on `/trust` (measure precision and recall of the rules). The data is CC BY-NC: fine for a non-commercial hackathon eval, but it cannot be shipped in a commercial product. The data is synthetic, so the results must be labelled as synthetic.
- **Bangla SMS spam models:** too heavy to run in the browser and trained on small datasets. Deterministic red-flag rules work better here (OTP or PIN requests, "your account will be closed", lottery wins, links that do not match a known bKash or Nagad domain), with the model as an optional second opinion that shows in the trace.

No public repository was found for GASA's Global Signal Exchange, so it is not listed.

---

## How KormoPath compares

**What KormoPath already does better than most of these projects**
- **Honest AI with a measured fallback.** This review did not find a published guardrail eval in any of the AI-based Bangladeshi repos above (only their READMEs and descriptions were read). KormoPath's `/trust` page reports measured results from `lib/eval-results.json` (generated 2026-11-17): 21/21 Auditor skills backed by a quote from the CV, both injection and no-skill probes passed, 0 pitch amounts that are not in the contract, 8/8 coach quotes found, and 2,000 fee cases (8,000 channel routes) with 0 failures and at most 0.01 BDT error.
- **Deterministic money with an invariant.** `lib/finops.ts` reconciles gross, the itemized steps and net, in the same spirit as Mojaloop's balanced ledger, at the scale of one person.
- **No accounts, private by default.** Like Actual, and unlike Moodle, OpenMRS, DHIS2, Fineract and Sahana, a person can use KormoPath with no server-side identity.
- **Bangladesh first, across the life cycle.** The Bangladeshi repos found are single-purpose student or hobby projects (SMS parsers, a tax calculator, a disease classifier), and most have fewer than 20 stars. None links study, work, earning, budgets, health, farming and protection.

**Where KormoPath is thinner**
- **No interoperable credential.** The Skill Passport is an HMAC token checked only by KormoPath's `/verify`. The Open Badges 3.0 export (`lib/badge.ts`) is unsigned, so wallets cannot verify it. LearnCard and the VC libraries produce signed credentials.
- **No offline content packs or on-device OCR.** Kolibri works with no network at all, and bangla-pdf-ocr reads documents on the device. KormoPath's image and PDF reading needs a Gemini key.
- **Reference data is thin.** Medicines, institutions and crop disease labels are mostly entered by the user. That is correct for honesty, but there is little data available offline.
- **No sync, no multi-user workflows.** Actual offers optional encrypted sync, and CHT and Sahana support teams. KormoPath is one person on one device, with a JSON backup.
- **Scale and maturity.** These DPGs have years of field deployment. KormoPath is a hackathon-stage app that has not been audited for production (README).
