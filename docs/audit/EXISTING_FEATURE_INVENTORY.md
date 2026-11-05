# Existing feature inventory

**Reviewed:** 2026-11-05. “Implemented” means a real interaction/data flow exists in this checkout. “Partial” means meaningful flow exists but an operational, content or trust dependency remains.

| Product area | Implemented | Partial / external dependency | Not implemented |
|---|---|---|---|
| Home / ecosystem | App cards, launcher, command palette, app links, language toggle | Translation is not consistently shared across every route | Personalized central dashboard |
| Workspace | CV/text/file audit, GitHub public repo lookup, sandbox challenges, viva, pitch, reviewed contract template, finance ledger | AI features need Gemini; GitHub lookup is limited to public repo metadata; ledger is local | Accounts/sync, review by a human employer, real payment execution |
| My Path | Four goal paths, checklists, grounded web search, saved source links, links into apps | Search quality, results and citations depend on Gemini Search; no human application review | Application pipeline statuses, reminders, outcome analytics |
| AdmitBuddy | Profile, shortlist, program comparison, document checklist, tasks, user-provided dates, ICS, SOP draft, counselor | Admission circular data requires user validation/current official sources | Official API sync, application submission, live reminders |
| MediScan | Typed prescription parser, risk flags, optional consented image transcription, local records | Requires pharmacist review; OCR depends on Gemini; medical references are incomplete | Diagnosis, prescribing, clinician review, pharmacy order/medical record sync |
| Shohoj Budget | Bengali number parser, editable confirmation, ledger, categories, recurring items, bill split, budget pacing, CSV, SMS parsing | Voice and product search depend on browser/vendor and Gemini respectively | Bank/MFS account sync, receipt inbox connection, cloud sync |
| HaatBazar | Trip margin/break-even, shared truck arithmetic, price notes, weather, spray window, season/disease references, user-entered quotes | Agronomist review and current official supplier/transport data | Live DAM feed, verified marketplace, booking/payment/tracking |
| Probaho | Question tracks, typed/speech answers, deterministic scoring, progress history, consent controls | Speech provider support varies; question bank remains finite | Teacher dashboard, audited external certification |
| FeeGuard | Reconciled fee channels, editable source-bound inputs, FX, actual-received comparison, local records, compliant draft pitch | Fee/source freshness and production-source review | Direct account connection or actual payout |
| ChuktiGuard | Invoice editor/preview, milestones, reviewed templates, service-package builder | Legal/accounting terms require professional and jurisdiction review | E-signature, escrow, client account, payment processing |
| Passport | Signed v1 full token, v2 selected fields/expiry, public verify page | HMAC key is deployment-controlled; current model is not a W3C VC | Issuer trust registry, revocation/status list, external credential interoperability |
| Data & privacy | Namespaced device storage, sanitization on read, export/delete per group | Browser clearing, device loss and cross-browser moves are user-controlled | Cloud backup/recovery, shared device profiles |
| Shared Buddy | App-aware guide and chat context, server-side Gemini request, no local-storage access | Requires Gemini; chat text leaves device when submitted | Read/modify app records, tool execution, role permissions |

## Existing areas that must not be duplicated

- No second expense ledger: extend Shohoj Budget.
- No second admission tracker: extend AdmitBuddy.
- No second local opportunity bookmark board: extend My Path.
- No second skill passport: extend Workspace Passport and its verifier.
- No AI financial calculator: money remains in pure deterministic helpers.
- No medical or pesticide decision engine: preserve professional referral boundaries.
