# KormoPath architecture

## Layout

```
app/
  page.tsx, layout.tsx, globals.css      home, metadata, theme tokens
  workspace/, verify/                     core 4-agent pipeline (unchanged in this work)
  admitbuddy/ mediscan/ shohoj-budget/
  haatbazar/ probaho/ feeguard/           the six ecosystem apps (client components)
  chuktiguard/                            B2B contract/invoice tool
  settings/                               per-app local data: list, export, delete
  api/
    audit viva pitch passport receipt     core pipeline (model-backed, Zod, fallbacks)
    fx                                    live USD/BDT, 6 s timeout, labelled fallback
    weather                               Open-Meteo forecast + spray window (HaatBazar)
    mediscan/ocr                          consent-gated prescription transcription
components/
  AppHeader.tsx                           shared app header + SourceTag
  AppSwitcherDropdown.tsx                 app menu (dark/light variants)
  …                                       core pipeline stages, hub, chrome
lib/
  budget.ts        Shohoj: parsing, money in poisha, summaries, CSV, migration
  prescription.ts  MediScan: line parser, reference list, interactions, red flags, prices
  haatbazar.ts     HaatBazar: trip margin, truck share, seasons, spray window, diseases
  speech.ts        Probaho: question bank, analysis, scoring, progress
  admitbuddy.ts    AdmitBuddy: universities, matching, tasks, counselor, SOP, ICS
  finops.ts        FeeGuard/core: fee engine + reconciliation, CSV, effective cost
  clientStore.ts   namespaced, validated, hydration-safe localStorage
  llm.ts           Gemini JSON + Zod + repair; optional cache opt-out
  rateLimit.ts     per-route, per-IP token buckets
tests/
  *.test.ts        node:test unit tests (58)
  e2e/browser.mjs  browser workflow checks (71), run manually
docs/              audits, research, reports
```

## Principles

1. **Deterministic domain logic in `lib/`, UI in `app/`.** All six domain modules are pure (no imports), so they run under `node --test` with Node's type stripping. Pages never do money or scoring arithmetic themselves.
2. **No invented facts.** Data the app cannot verify is either user-entered (with source/date), shown as a labelled example, or omitted. `SourceTag` shows confidence (official, reported, indicative, estimate, example, unverified, user) and checked date.
3. **Model output is untrusted.** Only MediScan's OCR route uses a model in the ecosystem apps. It returns a transcription draft that the user edits before the deterministic parser runs. Responses are Zod-validated; caching is disabled for health data.
4. **Each app is independent.** No app imports another app's storage or state. If an external service fails (FX, weather, speech, Gemini), the app shows an honest message and keeps working offline for everything else.
5. **Privacy by default.** No accounts and no server database. Device-local storage is namespaced as `kormopath:<app>:<name>`. `/settings` lists, exports and deletes data per app. MediScan data is marked sensitive and never shared.

## Data flow examples

- **Shohoj voice entry:** Web Speech (browser) → transcript → `parseEntry` → confirmation card (editable) → user confirms → `Transaction` (amountPoisha, date, history) → `usePersistentState` → localStorage.
- **MediScan photo:** user ticks consent → `/api/mediscan/ocr` (rate limit, Zod: consent literal, MIME allowlist, size) → Gemini transcription (no cache) → text returned → user reviews → `parsePrescriptionText` → `checkAllPairs` / `detectRedFlags`.
- **HaatBazar weather:** district id (allowlist) → `/api/weather` → Open-Meteo (8 s timeout, Zod-validated, values clamped) → `sprayWindow` → UI with attribution.

## Shared platform: what exists and what does not

| Capability | Status |
|---|---|
| Consistent navigation, app switcher, skip link, privacy chip | Implemented (`AppHeader`) |
| Shared preferences | Pre-existing unified profile (`lib/profile.ts`) only; apps otherwise keep their own data |
| Data settings | `/settings` |
| Authentication / unified accounts / cross-device sync | **Not implemented.** Needs a backend, database and identity provider; none is configured in this repo. Designing it requires decisions (provider, hosting, data residency under PDPO 2025) that belong to the project owner. |
| Notifications | Not implemented (AdmitBuddy uses `.ics` alarms instead) |
| Dark theme | Not implemented for the six apps (the existing theme is light-only) |
