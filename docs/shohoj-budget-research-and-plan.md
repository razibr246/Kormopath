# Shohoj Budget — research and plan

## Audit
Before: "১২০০ টাকা" parsed as 200 (ASCII-only `\d`), voice/SMS saved instantly, invented default amounts (150/250), received-money SMS stored as expense, no dates, budget not saved, fake savings tip, sample rows seeded into the real ledger, hydration mismatch.

## Research (checked 2026-11-05)

| # | Reference | Finding | Reliability | Licence |
|---|---|---|---|---|
| 1 | Actual Budget (GitHub / openalternative.co) | Envelope budgeting; ~29.9k stars; active | Aggregator | MIT (per aggregators; LICENSE file not opened) |
| 2 | Firefly III | Self-hosted, double-entry; ~25k stars | Aggregator | AGPL-3.0 |
| 3 | Pocket Clear blog "expense tracker bangladesh" | Offline, BDT, bKash/Nagad/cash together | Self-promotional | — |
| 4 | Hishabee blog | Business stock/sales/dues app, not personal budgeting | Vendor | — |
| 5 | TallyKhata (via Daily Star "Halkhata goes digital") | Merchant wallets/QR, not a personal tracker | News | — |
| 6 | "Jhinuk: Bangla Expense Tracker" (Google Play developer page) | Exists; features not confirmed | Listing title only | — |
| 7 | Chrome Web Speech API docs / HTML5Rocks intro | `webkitSpeechRecognition`, language list in demo; audio sent to Google's service in Chrome | Official blog + third party | Platform API |
| 8 | MDN/third-party compatibility notes | Prefix still required; Safari/Firefox differ | Mixed | — |

No source confirmed `bn-BD` support explicitly; the app therefore handles `language-not-supported` and `network` errors and always offers typing.

**Conclusions used**
1. Popular open-source budgeting tools emphasise reliable ledgers and categories over "AI"; we kept logic deterministic and code-only (no AGPL code reused).
2. BD users mix cash/bKash/Nagad → payment method is first-class; SMS import exists but is confirmed.
3. Speech-to-text is cloud-based in Chrome and may misrecognise → transcript shown, confirmation required, low-confidence warning.

## Design decisions
- Money stored as integer **poisha** (`amountPoisha`) — no floating-point drift.
- Nothing is saved without an explicit "নিশ্চিত করুন". Invalid/absent amount disables confirm.
- Every edit appends an audit-history entry.
- v1 data (`shohoj_expenses`) is migrated, labelled "old data", and only removed on user request.

## Roadmap

| Priority | Item | Status |
|---|---|---|
| P0 | Bangla digits & number words, confirmation step, no invented amounts | Done |
| P0 | Dated, editable ledger with audit history and undo | Done |
| P1 | Income, monthly budget alerts, category breakdown, projection (labelled) | Done |
| P1 | SMS debit/credit, TrxID duplicate warning | Done |
| P1 | Recurring items, exact bill split, CSV export | Done |
| P2 | Savings goals | Done (2026-11-05): target, optional date, deposits/withdrawals, per-month arithmetic; never creates ledger transactions |
| P2 | Per-category budgets | Done (2026-11-05): monthly limit per category, 80% / over warnings |
| P2 | Installable PWA / offline voice | Not done (voice needs network in Chrome) |

## Testing
`tests/budget.test.ts` (13 tests). Browser: the exact user example → 1200 + grocery → nothing saved before confirmation → confirm → reload → edit with history → delete/undo → no-amount blocked → income SMS → legacy migration.
