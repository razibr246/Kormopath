# Existing project audit

**Reviewed:** 2026-11-05. This is an incremental audit of the current checkout, including the earlier per-app review in [`../kormopath-platform-audit.md`](../kormopath-platform-audit.md), architecture notes, current routes, and current tests.

## Executive summary

KormoPath is a Next.js 15 / React 19 / strict TypeScript product with a core freelancer workflow, six ecosystem apps, two additional product areas (ChuktiGuard and My Path), a shared assistant, and local data settings. It has no identity provider, database, role system, or remote user profile. The current design intentionally stores most data in browser localStorage and relies on server APIs for selected model calls and public data. This makes it a useful local-first pilot; it does not yet provide cross-device accounts, team collaboration, instructor/admin dashboards, or server-side notifications.

The repository already contains substantial app-specific research, architecture and production-readiness notes. The principal work now is to keep those claims synchronized with the code and to build a verifiable outcome loop across learning, evidence, opportunities and paid work. The highest risk is trust: this product includes health, money, admissions, agriculture and tax information. Expert review, source freshness, privacy notices and public deployment controls matter more than adding gamification or social features.

## Actual product areas and routes

| Area | Route | Main purpose | Data / services |
|---|---|---|---|
| Home and app hub | `/` | Discover the apps, ecosystem launcher, product search | FX API; product-search request only when user searches |
| Core Workspace | `/workspace` | Skill audit → code challenge/viva → client pitch/contract → payout ledger | Gemini-backed API routes, optional public GitHub lookup, FX; browser-local ledger |
| My Path | `/opportunities` | Goal paths, action checklist, source-grounded opportunity search, saved links | Local board; Gemini Search on explicit search |
| AdmitBuddy | `/admitbuddy` | Bangladesh admission planning, shortlist, documents, SOP and calendar export | Device-local profile/tasks; user-sourced circular details |
| MediScan BD | `/mediscan` | Prescription transcription/explanation and safety flags | Device-local; optional image sent to Gemini only after consent |
| Shohoj Budget | `/shohoj-budget` | Expense/income ledger, budgets, bill split, SMS, product search | Device-local; browser speech service; Gemini Search on explicit product query |
| HaatBazar AI | `/haatbazar` | Crop transport margin, local prices, weather, seasons, quotes | Device-local notes/quotes; Open-Meteo; Gemini Search on explicit query |
| Probaho Coach | `/probaho` | Speaking/viva practice, feedback and local progress | Local history; browser speech recognition may use browser vendor service |
| FeeGuard BD | `/feeguard` | Payout-channel comparison and reconciliation | Deterministic calculation, cited fee data, FX API, local records |
| ChuktiGuard | `/chuktiguard` | User-defined service packages, invoice and reviewed contract template | Device-local draft and packages; deterministic finance calculations |
| Passport verifier | `/verify` | Verify signed passport token or selective share token | Stateless API verification; signing secret required for trusted deployment |
| Data settings | `/settings` | Per-app browser storage export/delete | Browser localStorage |

## Repository and technical shape

- `app/` contains App Router pages and 13 API routes. `components/` contains shared shell, navigation, Buddy, practice stages and app UI. `lib/` contains pure domain logic, schemas, model adapter, storage and rate limiting. `tests/` contains 58 Node tests plus a separately-run Puppeteer browser journey script.
- There is no ORM, SQL/NoSQL schema, auth library, user role, or migrations directory. Do not describe user authentication or collaboration as implemented.
- Environment configuration uses `GEMINI_API_KEY`, optional model name and `PASSPORT_SECRET`. The API key is server-side. When `PASSPORT_SECRET` is absent, passport signing uses a known demo secret; that is unsuitable for production trust.
- No Git metadata is available in this checkout. Do not infer change history or clean up the preserved stale `.next` backup without owner review.

## Current check results

- `npm test`: **58 passed, 0 failed**. Node emits `MODULE_TYPELESS_PACKAGE_JSON` warnings for the TypeScript test modules.
- Initial build encountered a stale `.next` route invariant; the generated directory was preserved as `.next-codex-build-backup` and a clean build passed.
- Latest `npm run build`: **passed**, including TS checks and all 28 static/dynamic page outputs.
- Production route smoke check: **12/12 pages returned HTTP 200** (`/`, `/workspace`, `/settings`, and all app routes checked).
- Browser interaction journeys were not run: the existing script requires external `puppeteer-core`, which is not installed in this project.

## Main findings

### Implemented and working in current code

- App-specific deterministic logic for budget, finance reconciliation, agriculture margins, admission lists, prescription parsing and speech scoring.
- Device-local namespaced persistence with sanitization; settings page can export and delete each data group.
- Zod validation, per-route in-memory rate limits and model output validation on API calls.
- Clear medical boundaries in parsing (no diagnosis/dose generation), user confirmation before writing budget transactions, source links for opportunity/product searches, and weather-source attribution.
- My Path, Buddy, shareable timed Passport v2 subset, HaatBazar quotes/search and ChuktiGuard service-package builder exist in this checkout.

### Partial, misleading, or deployment-dependent

- Workspace CV, receipt OCR, viva grading and client-pitch generation now require explicit action-level consent and disclose Gemini's unpaid-tier review/use caveat; file selection alone does not upload CVs or receipts. Settings also describes API/provider data flows. Continue auditing each new outbound-data path and review whether the deployed Gemini billing tier is appropriate for the data users might submit.
- HaatBazar and shopping web results are search summaries, not a live seller catalog, stock feed, verified vendor directory or checkout.
- Browser speech behavior depends on the selected browser's implementation and privacy settings.
- Passport v1/v2 is a KormoPath HMAC token, not a W3C Verifiable Credential. The dev-secret fallback invalidates any production assurance.
- The recent standalone Haat market UI and package builder have not been covered by focused automated/browser tests yet.
- In-memory rate limiting is process-local and does not coordinate horizontally scaled instances.
- No centralized, maintainer-controlled content review/update workflow is present for admission, financial, health or agronomy reference data.

### Missing by design or not configured

- Accounts, account recovery, authorization roles, remote synchronization and server-side data retention.
- Community, direct messaging, comments, employer marketplace, supplier onboarding/verification, purchases, notifications and instructor/admin dashboards.
- Offline service worker/cache, installable icon set beyond existing site graphics, and conflict-safe sync.
- Error monitoring, analytics, CI workflow, centralized rate-limit store, documented backup/restore for user-held data, and end-to-end test dependency in the package.
- Expert review sign-offs for MediScan drug rules and HaatBazar disease guidance; current readiness report already flags these.

## P0/P1 actions

1. Maintain action-level privacy disclosure for every outbound request; explain what is sent, to whom and why, and never imply Buddy can read local app data. Validate this with browser journeys.
2. Require a production `PASSPORT_SECRET`, remove trust wording when only the demo key is active, and document rotation/revocation limitations.
3. Add reviewed source owner/checked date to consequential datasets and a way to report stale or incorrect facts.
4. Add targeted tests/browser checks for the recently added HaatBazar market and ChuktiGuard packages, then run the existing browser smoke suite when its optional Puppeteer environment is available.
5. Keep remote accounts, social networking, payments, and public seller/job marketplaces out of scope until ownership, privacy, moderation, payment, support and operations are funded.
