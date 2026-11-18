# Copilot instructions for KormoPath

## Project overview

This repo is a Next.js App Router project with TypeScript and Tailwind v4. It is a Bangladesh-first toolkit for career, finance, agriculture, and health use cases, with a shared landing page plus a Workspace flow and several standalone mini-apps.

Use Node.js 24. The app has no accounts, database, shared cloud profile, or cross-device sync; most saved data stays in browser local storage. Treat model output and restored storage as untrusted. Keep deterministic rules in pure `lib/*.ts` modules and keep evidence, money, contract, safety, and fallback behavior testable.

Read `AGENTS.md` before broad changes and `CLAUDE.md` for the pointer to that document. For app-specific work, also read the relevant files under `docs/apps/` and the app's implementation plan or rules.

## Build, test, and validation commands

Use these commands from the repo root:

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build and the repository's only TypeScript check
npm test         # node --test tests/*.test.ts && node --conditions=react-server --test tests/security/*.test.ts
npm run eval     # scripts/eval.ts
```

Run one unit test file or filter one test name:

```bash
node --test tests/core.test.ts
node --test --test-name-pattern="Fiverr" tests/core.test.ts
```

Browser checks require a production server on port 3100:

```bash
NEXT_DIST_DIR=.next-test npm run build
NEXT_DIST_DIR=.next-test npm start -- -p 3100
# In another terminal:
CHROME_PATH=/usr/bin/chromium npm run test:browser
```

`BASE` can override `http://localhost:3100`. Browser tests use `puppeteer-core` and clear local data on the test origin; use a dedicated test browser/profile. CI runs Node 24, `npm test`, `npm run build`, then starts the app on 3100 and runs `npm run test:browser`.

There is no lint script. `npm run build` and the test suite are the validation baseline. Tests execute `.ts` files through Node's native type stripping (Node 24); `tsconfig.json` excludes `tests/`, so tests are not type-checked by the build.

Test files must use explicit relative imports with `.ts` extensions, for example `import { compareChannels } from "../lib/finops.ts"`. Do not use `@/` in tests. Keep test-importable pure modules free of `server-only`, `@/` imports, or non-strippable TypeScript syntax.

## High-level architecture

### Workspace pipeline

The main `/workspace` pipeline in `app/workspace/page.tsx` holds shared client state and runs four stages in order:

| Stage | UI | Route | Deterministic core |
|---|---|---|---|
| Auditor | `components/workspace/StageAudit.tsx` | `app/api/audit` | `lib/audit.ts` |
| Examiner | `components/workspace/StageViva.tsx` | `app/api/viva`, `app/api/passport` | `lib/challenges.ts`, `lib/sandbox.ts`, `lib/passport.ts` |
| Outreach | `components/workspace/StageContract.tsx` | `app/api/pitch` | `lib/contract.ts` |
| Treasurer | `components/workspace/StageMoney.tsx` | `app/api/fx`, `app/api/receipt` | `lib/finops.ts`, `lib/data.ts` |

`StageViva` runs candidate code in `lib/sandbox.ts`, a client-side Web Worker. Passport signing uses `lib/passport.ts` and Node crypto; it is server/test-only. `/verify` verifies passport tokens server-side.

Routes and UI expose traceable model/tool/fallback behavior through `lib/trace.ts` and `components/workspace/Telemetry.tsx`. Model text is never the source of truth for money, legal clauses, evidence, or safety facts.

### Model and API patterns

Model-backed POST routes follow this order:

1. Apply `checkRateLimit()`/`rateLimitResponse()` first.
2. Validate the request with a bounded Zod schema.
3. Create `new Tracer(...)`, log checks/calls/fallbacks, and return `trace: tracer.steps`.
4. Call `structured(...)` from `lib/llm.ts`. It validates model JSON, retries once with Zod validation errors, and can return `null`.
5. Put model-output guardrails in Zod `superRefine()` rules so invalid results trigger the repair loop.
6. Every `null` path must use a rule/template fallback and mark `engine: "template"` or the app's deterministic fallback.
7. Return `raw: llm.raw` when model output exists, otherwise `raw: null`.

Read `app/api/pitch/route.ts` as the reference. `lib/llm.ts` imports `server-only`. `lib/gemini.ts` owns Google Interactions API calls, model/key fallback order, cooldowns, retries, citations, and TTS. Do not reintroduce the old `generateContent` endpoint or `gemini-2.5-*` models.

Web-search routes such as opportunities, product search, HaatBazar market search, and Buddy web mode use `groundedSearch()` instead of `structured()`. They return unverified text plus citations and must display sources; they have no confirmed-price fallback.

### Standalone app structure

Standalone apps are intentionally independent and mostly client-side:

- AdmitBuddy: `app/admitbuddy`, `lib/admitbuddy.ts`
- MediScan: `app/mediscan`, `lib/prescription.ts`, `lib/adherence.ts`, `lib/dengue.ts`
- Shohoj Budget: `app/shohoj-budget`, `lib/budget.ts`, `lib/wallets.ts`, `lib/dhar.ts`, `lib/bazar.ts`, `lib/mess.ts`, `lib/zakat.ts`
- HaatBazar: `app/haatbazar`, `lib/haatbazar.ts`
- MaathSathi: `app/krishi`, `lib/krishi.ts`, `lib/krishiData.ts`; `/krishi/field` ports `field360/src` and uses Field360 API routes
- Rokkha: `app/rokkha`, `lib/rokkha.ts`, `lib/rokkhaData.ts`
- Legal Aid: `app/legal/*`, `lib/legal/*`
- Probaho: `app/probaho`, `lib/speech.ts`
- FeeGuard: `app/feeguard`, `lib/finops.ts`
- ChuktiGuard: `app/chuktiguard`, re-exports `lib/finops.ts` and `lib/contract.ts`

Keep domain logic in pure modules and add focused tests when changing calculations or validation.

## Key conventions and repo-specific rules

### Test import rules

For test files, use explicit relative imports and include the `.ts` extension:

```ts
import { someFn } from "../lib/finops.ts";
```

Do not use the `@/` alias in tests. Security tests run under `--conditions=react-server` so they can import modules such as `lib/passport.ts`.

### Deterministic money and contracts

- Money calculations stay in pure `lib/finops.ts` or the integer-poisha Shohoj modules. Do not ask a model to calculate fees, FX conversions, incentives, taxes, or totals.
- `lib/budget.ts` uses integer poisha. Cash-out fees are expenses; wallet transfers are not.
- `lib/contract.ts` contains reviewed bilingual clause templates. The model fills only validated values and never authors or alters clauses.
- Preserve reconciliation invariants: gross to itemized steps to net. Verify Shohoj mess balances and FeeGuard `Channel.steps` instead of re-deriving numbers in a page.

### Safety, trust, and evidence rules

- Never invent prices, dates, doses, OCR confidences, admissions, safety verdicts, legal sections, or income thresholds. Missing facts stay missing.
- Rokkha: exact matched scam text must be quoted; "no hits" must say no known signs were found and never imply safety. Pasted messages/incident reports are not stored or sent. Helplines and official links come only from `lib/rokkhaData.ts`.
- MediScan: never diagnose, prescribe, or recommend a brand switch. OCR requires consent and `cache: false`; "not in our list" is not a safety verdict.
- MaathSathi/HaatBazar: never provide pesticide or animal-medicine doses; refer to labels and official helplines. Confirm voice-parsed tasks before saving.
- Legal Aid: legal information only, never legal advice or a government portal; no ministry-style seal, filed-case language, section numbers, or invented thresholds. Read `docs/apps/legal/`.
- Probaho: check quoted speech against the source inside Zod `superRefine()`; keep deterministic scoring in `lib/speech.ts`.
- Preserve app disclaimers and emergency/crisis UI. Add or change sensitive behavior only with the matching app documentation and focused tests.

### Storage, privacy, and security

- Browser state uses `lib/clientStore.ts`: `usePersistentState(storageKey(app, name), initial, sanitize)`. Keys are `kormopath:<app>:<name>`.
- Every read and restore is sanitized. Values load after mount to avoid hydration mismatch and initial saves; do not write localStorage during server render.
- Do not read another app's key, and do not add a namespace without adding it to `lib/backup.ts` and `lib/clientStore.ts`.
- `/settings` supports versioned backup/restore; backups are allowlist-only and app-specific sanitizers still validate restored records.
- Shohoj, MediScan, and voice/OCR flows require user confirmation before saving parsed or entered sensitive records.
- Do not commit `.env.local`, API keys, or `PASSPORT_SECRET`.
- Production passport signing fails closed unless `PASSPORT_SECRET` is at least 32 characters and is not the development key.
- `middleware.ts` allows 256 KB by default and 6.5 MB only for `/api/audit`, `/api/receipt`, `/api/mediscan/ocr`, and `/api/field360/doctor`.
- `next.config.mjs` sets security headers and same-origin microphone/geolocation permissions. Camera is disabled unless explicitly configured.

### Repo documentation is part of the code contract

Before making broader assumptions, check:
- `README.md`
- `AGENTS.md`
- `CLAUDE.md`
- app-specific docs under `docs/`

### UI and internationalization

- The visual identity is "Shonar Bangla". Use the shared `kp-*` classes and existing `text-*`, `brand-*`, paper, and semantic Tailwind tokens defined in `app/globals.css`; do not invent a second palette.
- Headings use the configured Fraunces/Noto Serif Bengali fonts, body text uses Inter/Hind Siliguri, and numbers use JetBrains Mono. Reuse shared layout pieces such as `AppHeader`, `AppSwitcherDropdown`, `KormoPathLogo`, and `SourceTag`.
- English/বাংলা toggles live in component state. Normalise Bangla Unicode with NFC when exact matching or persistence compares text, as Bengali may arrive in composed or decomposed form.
- `field360/` is excluded from KormoPath's global Tailwind source and has its own built CSS. Do not hand-edit `field360/src/f360.css`; rebuild it with `python3 -I scripts/build-f360-css.py <FieldShift360 src/index.css>`.
