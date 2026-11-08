# Reliability and usability improvements — 2026-11-08

## User-visible behavior

- Settings exports/restores a versioned local JSON backup covering all six apps, My Path, ChuktiGuard, the shared profile and Workspace ledger. It previews app names, accepts older exports and preserves existing storage items unless overwrite is selected. Arrays are not merged. Files remain in the browser. Backups are unencrypted.
- Shared persistence follows changes made in other tabs, resets state after a saved key is removed, and never copies a previous key's value into a newly selected key. A shared warning reports failed writes, including on screens that previously ignored hook save status.
- Profiles start without invented personal details, skill scores or financial records. Stored/imported profile fields are bounded and unexpected fields discarded. Import returns false if storage fails.
- My Path exports all-day follow-ups as iCalendar, with stable event IDs, escaped text, UTF-8 line folding and no BOM. Closed/accepted and undated opportunities are omitted. The app does not send notifications; import the file into a calendar and configure reminders there.
- HaatBazar rejects stale, incomplete, discontinuous and out-of-range weather observations. Missing readings never become zero rain/wind. The spray check needs six complete hours. Changing districts clears the previous district's display while loading.
- FX no longer freezes an unsuccessful build-time lookup for an hour. Successful upstream quotes still use the hourly fetch cache; live labels require bounded numeric rates and provider timestamps no older than 48 hours.
- Production passport signing/sharing refuses absent, short or public demo keys. Verification validates score totals, dates, expiry and token structure. The verifier describes browser-submitted results accurately rather than presenting an independent certification.
- ChuktiGuard's header and package form fit mobile screens. Package validation rejects fractional cents, excessive deliverables and zero-value splits. Milestone money splitting lives in the deterministic engine and preserves every cent. Draft due dates are explicitly described and remain editable. Contract templates themselves were not modified.
- Native system typography uses San Francisco on Apple devices, with larger compact labels, Inter on other devices and a locally served Bangla fallback (OFL notices included). Budget CSV exports neutralize whitespace-prefixed spreadsheet formulas and quote carriage returns.

## Verification

The final test run contains 94 domain/hook tests and 3 signing tests. Production compilation and type checks are part of `npm run build`. Browser journeys cover all six ecosystem apps, mobile layouts, examples, fallback coaching, backup/restore, cross-tab updates, storage failures, calendar export and package validation. `npm run test:browser` uses a pinned Puppeteer dependency and an installed Chrome/Chromium; CI runs these checks after the build.

Live API observations in this environment: weather returned 24 hours; unconfigured production passport issue/share returned 503. Gemini-backed paid/model behavior was not tested because no Gemini key is configured. Signing tests use a test-only key. Accounts, cloud sync, centralized rate limiting and independent certification are not implemented.

## Publication

GitHub authentication currently fails: the configured GH_TOKEN is invalid, and HTTPS push cannot authenticate. No usable Vercel credential or connected browser-control tool is available. Code remains local until authenticated access is repaired. Pushing main may trigger Vercel if the owner has connected that repository; deployment settings and environment variables must be verified by the owner.

Final verification after the typography changes: production build passed; 97 domain/hook/signing tests passed; 87 app browser checks and 16 feature checks passed; backup, storage-failure, cross-tab, calendar and package journeys passed. An additional 22 responsive typography checks passed at 375px and 768px across 11 routes, with no horizontal scrolling or page errors. On this Linux test host Inter was rendered; native San Francisco selection on Apple devices follows the system font stack and was not visually tested on a Mac. A fresh runtime FX request returned live=true after the caching fix.
