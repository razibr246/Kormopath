# Feature opportunity map and phased roadmap

Effort and cost are relative estimates. Provider prices, quotas and legal costs must be checked when a feature is approved.

| Priority | Feature | User value / overlap | Effort & infra | Dependencies / main risk | Success measure |
|---|---|---|---|---|---|
| P0 | Accurate disclosure/consent at every outbound data action | Users can see what leaves the device; privacy page/Buddy/MediScan notices are partial | S / near-zero direct cost | Current Gemini tier terms; avoid wrong retention claims | Every send says payload, recipient, reason; file selection alone never uploads |
| P0 | Expert review and source freshness registry | High-risk health, agriculture, fee/tax, admission facts need trust | M / reviewer and maintenance cost | Pharmacist, agronomist, tax/admission source owners | Each high-risk rule has reviewer/source/check date/review schedule |
| P0 | Production Passport key guard | Current HMAC fallback is a public demo secret | S / no vendor cost | Production secret rotation invalidates old links | Production refuses to issue trusted proof when secret is absent |
| P0 | Automated CI and critical journey coverage | Current 58 unit tests pass; browser checks are optional external Puppeteer | M / low | CI runtime, browser dependency maintenance | Tests/build/browser flows run on every proposed release |
| P1 | Saved opportunity → applied → response/outcome | Current My Path saves links/checklists but not application state | M / local-first | Use user-set dates; don't claim submission | Users can record source, status, next date, outcome and export |
| P1 | Evidence portfolio | Current Workspace challenge/Passport lacks general project catalog | M / local only | Clearly distinguish self-asserted from tested evidence | Attach project artifact/context to skill and assessment evidence |
| P1 | Probaho mistake-review queue | Existing progress history and finite rubric bank | M / local only | Reviewed question bank and stable skill IDs | Missed concepts return later; improvement measured by rubric |
| P1 | HaatBazar quote lifecycle | Current user-entered supplier/freight quote comparison | M local MVP; L for marketplace | Seller verification, order support, fraud, delivery feeds | Track last-confirmed date, conditions and self-reported order state |
| P1 | Source catalog with stale flags | Existing SourceTags are scattered | M / low | Content/editorial owner | Consequential sources expose checked date and stale status |
| P1 | Offline static shell | Local calculations/forms work after page load; no service worker | M / low hosting; moderate engineering | Precise cache exclusions for health, tokens, API data | App shell opens offline without sensitive cache leakage |
| P2 | Optional accounts and sync | Device loss interrupts continuity | L / recurring hosting/auth/storage cost | Identity, roles, recovery, deletion, retention, data residency, health review | Opt-in sync; export/delete; privacy boundaries preserved |
| P2 | Mentor/reviewer workspace | Human feedback can strengthen learning proof | L / operations + backend | Reviewer verification, permissions, moderation | Review turnaround and abuse metrics |
| P2 | Verified vendor/booking marketplace | Farmers want supply/logistics comparison and fulfillment | XL / operations, payment and support | Vendor verification, stock/price freshness, refunds, delivery disputes | Quote-to-fulfillment and complaint rates |
| P3 | Cross-app AI coach | Personalized “what next” across tools | L / model costs and privacy infrastructure | Per-source permissions, minimization, audit and consent revocation | Recommendations cite approved evidence and are useful |
| P3 | Public community, streaks, leagues | Peer motivation | L / continuous safety operations | Spam, harassment, minors, privacy, addictive mechanics | Do not ship until moderation and outcome policy exist |

## Release sequence

### P0 — trust and correctness

1. Accurate action-level data disclosure; no upload-on-file-select.
2. Remove inconsistent “five/six app” claims; one route registry.
3. Require a production Passport secret and document demo/verification limits.
4. Get pharmacist and agronomist review; maintain source/date owners for admission and financial facts.
5. Adopt OWASP ASVS 5.0 scoped checklist, CI, and critical journey/browser checks.

### P1 — outcomes without a database

Local application tracker, portfolio evidence, mistake review, Haat quote confirmation state, source freshness, then static-shell offline support with sensitive/API exclusions.

### P2/P3 — only with operational decisions

Accounts, sync, mentors, employer access, vendor marketplace, payments, push, and adaptive AI need identity, retention, access control, deletion, support, trust/safety, legal review and funding. They are not frontend-only additions.
