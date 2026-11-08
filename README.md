# KormoPath AI · কর্মপথ

**A Bangladesh-first collection of career, learning, finance, agriculture and health tools.**

KormoPath currently contains six standalone applications, a shared landing page and Workspace tools. It is an early-stage web app: it does not have user accounts, a shared cloud profile, a database-backed workspace, or cross-device sync. Most saved data stays in browser local storage. The product audit and roadmap are in [`docs/audit/EXISTING_PROJECT_AUDIT.md`](docs/audit/EXISTING_PROJECT_AUDIT.md) and [`docs/research/FEATURE_OPPORTUNITY_MAP.md`](docs/research/FEATURE_OPPORTUNITY_MAP.md).

## Current applications

| Step | Agent | What it does | What's real |
|---|---|---|---|
| 1. Value your skills | Auditor | Reads a CV, PDF or profile screenshot, reads public GitHub repos, values you against a local rate dataset | Gemini vision + JSON schema + repair loop; every skill must quote the CV or it's rejected; rate computed by code |
| 2. Prove them live | Examiner | A real bug-hunt (payment webhook, checkout, CRM dedupe) + a voice/text viva | Tests run in a sandboxed Web Worker with time budgets; viva credit only for points the model can quote from your answer; score computed by code; HMAC-signed, tamper-evident Skill Passport with a public `/verify` page |
| 3. Win a direct client | Outreach | Writes the cold email and a bilingual (English/বাংলা) contract with an internet-shutdown clause | Email checked so every $ figure matches the contract; contract text is a fixed template (the AI never writes legal clauses) |
| 4. Bring the money home | Treasurer | Compares payout channels and tracks income | Pure deterministic math with unit tests and reconciliation checks; FX lookup; CSV export |

Other apps include HaatBazar AI (agriculture and market information), Shohoj Budget, MediScan BD (prescription text support), Probaho and AdmitBuddy. Availability and maturity vary; AI and third-party features need configuration and are not professional advice or a substitute for qualified review.

My Path lets you bookmark search results or add your own links, track application status, record follow-up dates and outcomes, export each path to CSV, and download follow-up dates as an iCalendar file for Google Calendar or other calendars. The app does not send notifications itself. The tracker works in your browser without an API key.

Workspace shows model calls, tool calls and fallbacks for its supported flows. Model output is untrusted: financial calculations remain deterministic and claims from uploaded evidence are checked against source text.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional: add GEMINI_API_KEY and PASSPORT_SECRET
npm run dev                  # http://localhost:3000
npm test                     # money-math and grounding unit tests
```

Without `GEMINI_API_KEY`, model-backed features may use limited fallbacks or be unavailable; image/PDF OCR requires the key. Configure `PASSPORT_SECRET` with at least 32 random characters for signed passport operations. Do not put secrets in client-side code or commit `.env.local`.

## Browser backup and restore

Open `/settings` to download a versioned JSON backup of all saved app data, including the Workspace ledger. On another device, open the same page and select the backup to preview its keys before restoring. Existing storage items are kept by default; replacing them requires selecting the overwrite option. Individual records inside arrays are not merged. Older per-app exports are also supported. Files are processed locally and are not uploaded. Backups are unencrypted and may contain sensitive data; store them securely. Files over 5 MB, unsupported versions and unrelated storage keys are rejected. App-specific sanitizers still validate restored records when an app opens.

`npm test` and `npm run build` also run in GitHub Actions for pushes and pull requests.

## Verification

Use Node.js 24. `npm test` runs domain, storage-hook and signing checks. Browser checks use the pinned `puppeteer-core` dev dependency and an installed Chromium/Chrome browser:

```bash
npm run build
npm start -- -p 3100
# In another terminal (set CHROME_PATH for your installed browser):
CHROME_PATH=/usr/bin/chromium npm run test:browser
```

`BASE` can override the default `http://localhost:3100`. Browser tests clear local data on the test origin; use a dedicated test browser profile. CI runs the same build and browser journeys. The interface uses native system typography (San Francisco on Apple devices), with locally served Inter on other devices and Hind Siliguri for Bangla. Font licenses are in `public/font-licenses/`.

Production passport signing and sharing return HTTP 503 until a suitable signing key is configured. Signatures protect record integrity; browser-submitted assessment results do not establish independent identity or skill certification. Local profiles start empty and restored profile values are bounded before use.

## Deployment

1. Push this folder to a new GitHub repo.
2. vercel.com → Add New → Project → import the repo (framework: Next.js, no settings to change).
3. Settings → Environment Variables:
   - `GEMINI_API_KEY` — free key from https://aistudio.google.com/apikey
   - `PASSPORT_SECRET` — at least 32 random characters (e.g. `openssl rand -hex 32`)
   - `GEMINI_MODEL` — optional, defaults to `gemini-2.5-flash`
4. Deploy, then verify environment variables, route behavior, data disclosures, security headers, and the production build for your deployment. The app has not been audited as production-ready; see the audit and security roadmap before handling sensitive data.

## Data and AI

The Settings page describes which user-entered content is sent to KormoPath APIs and third-party providers. Gemini's data treatment depends on the API billing tier and current Google terms; review [Gemini API terms](https://ai.google.dev/gemini-api/terms) before enabling model-backed features. Do not submit sensitive, medical-identifying, payment, or confidential client information. The product does not currently provide account-level access control or central data deletion.

## Disclaimer

- Information only, not medical, legal, tax, financial, or career advice.
