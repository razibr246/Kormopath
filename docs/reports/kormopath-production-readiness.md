# Production readiness review

Date: 2026-11-05. Verdict: **ready for a public demo/pilot as device-local tools; not ready for a production launch handling real users' health or financial records at scale.**

## Status by app

| Application | Audit | Research | Improvements | Testing | Launch blockers |
|---|---|---|---|---|---|
| AdmitBuddy | Done | 8 refs (target 10) | Done + status tracker | 9 unit + 11 browser | Needs maintained, sourced 2026-27 circular dataset |
| MediScan BD | Done | 11 refs | Done + liquid doses, reminders | 12 unit + 18 browser | **Pharmacist review of all medicine notes and rules**; legal review under PDPO 2025 before enabling OCR publicly; Gemini data-processing terms |
| Shohoj Budget | Done | 8 refs | Done + goals, category budgets | 17 unit + 18 browser | None for local use; sync needs backend |
| HaatBazar AI | Done | 9 refs | Done | 7 unit + 8 browser | Confirm Open-Meteo commercial terms; agronomist review of disease notes |
| Probaho Coach | Done | 7 refs | Done + STAR check, streak | 11 unit + 9 browser | Real-mic testing on Android Chrome; larger reviewed question bank |
| FeeGuard BD | Done | 6 refs | Done | engine + 8 browser | Re-verify fees from official pages (Upwork, Payoneer, bKash, banks) |

## Security
- Inputs: all API bodies Zod-validated; district allowlist; MIME/size allowlist; base64 charset check.
- Abuse: per-route, per-IP rate limits (in-memory, so per-instance only; use a shared store such as Redis for multiple instances).
- Secrets: env only; `PASSPORT_SECRET` must be set in production (otherwise a public dev key is used and logged).
- Health data: consent literal required; no caching; trace contains timings only. The model provider still receives the image: this needs a data-processing agreement and a lawful-basis review.
- Stored data: validated on read; CSV formula-injection neutralised.
- Headers (2026-11-05): `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (mic same-origin only, camera/geolocation off), CSP `frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'`, `X-Powered-By` removed. No script CSP (Next.js inline bootstrap).
- Body size: `middleware.ts` returns 413 for API bodies over 256 KB (6.5 MB on upload routes) when `Content-Length` is sent; chunked requests without it are not capped there.
- `npm audit` (2026-11-05): sharp fixed (lockfile only). **Open:** zod < 4.6.6 (high, GHSA-mrhx-c7xc-m3w5) and next/postcss (high/moderate) need major upgrades (zod 4, Next 16) — owner decision.
- Not done: authentication.

## Performance
- All six apps are static pages (First Load JS 123–129 kB). APIs: weather cached 30 min upstream; FX 1 h; FX and weather have timeouts.
- No Lighthouse or real-device measurements were taken.

## Accessibility
- Done: skip link, labelled inputs, `aria-pressed` toggles, `role=alert/status`, progress bars with values, visible focus (global), no horizontal scroll at 375 px.
- Not done: screen-reader audit, colour-contrast audit, keyboard-only walkthrough of every flow.

## Remaining limitations
- No accounts, sync or cross-device access (by design for now; see architecture doc).
- No notifications (AdmitBuddy uses calendar alarms).
- Voice input depends on the browser; Chrome sends audio to Google; `bn-BD` support was not confirmed by documentation.
- MediScan reads `X+X+X`, ml/spoon/drop amounts and od/bd/tds/qid; free-form instructions ("take when needed") are not parsed.
- Dark theme not implemented for the apps.
- Research is mostly secondary sources and below 10 references per app for five apps.

## Run the project

```bash
npm install
cp .env.example .env.local      # optional: GEMINI_API_KEY (enables MediScan photo reading and core agents), PASSPORT_SECRET
npm run dev                      # http://localhost:3000
npm test                         # 70 unit tests
npm run build && npm start       # production
# browser checks: see header of tests/e2e/browser.mjs
```
