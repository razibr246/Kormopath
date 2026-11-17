# FeeGuard BD — research and plan

## What the "20% Fee Saver" actually is
From the code: FeeGuard compares how much of a freelancer's USD invoice arrives in Bangladesh via Fiverr (20% seller fee), Upwork (variable fee), Payoneer→bKash, or a direct bank wire. The "saving" is the difference between those routes. There are no discounts, promotions or partnerships, and none were invented. The saving is not universal: it depends on having a direct client and on fees that vary.

## Audit
Before: page ignored the engine's steps and re-derived numbers with wrong hardcoded labels ($0.99 vs $2; $15 vs $20; 1.0% vs 0.8%), so displayed lines did not reconcile; Payoneer→bKash hidden; fixed FX; "2.5% remittance incentive" on by default (contradicting `TAX_RULES`); pitch template aimed at moving marketplace clients off-platform "without triggering TOS flags"; unsourced "SRO No. 197" citation; CSV computed differently from the screen.

## Research (checked 2026-11-05)

| # | Reference | Finding | Reliability |
|---|---|---|---|
| 1 | Existing `lib/data.ts` sources (Fiverr ToS summary, bKash Payoneer page, Bangladesh Bank FY26-27 circular coverage, MTB incentive terms) | 20% Fiverr fee; Payoneer→bKash 3% + $1; 2.5% export incentive for individual software/ITES freelancers; wage-earner incentive not for freelancers | Mixed official/reported, checked 2026-10-29 by previous work |
| 2 | goLance, jobbers.io, snipework, vortenza (Upwork fee explainers, 2026) | Variable fee since 1 May 2025, shown before proposal and locked per contract; ~10% typical; still in place July 2026 | Third-party; Upwork help page not opened |
| 3 | hireinsouth / fastlancer | Client contract initiation fee $0.99–$14.99 | Third-party |
| 4 | freelancedhaka.pages.dev (Wise vs Payoneer, 2026) | Claims Wise cheaper; bKash support claims conflict with nsave | Single-author site, inconsistent; **not used** |
| 5 | nsave Bangladesh page | Says Wise mostly a one-way receiving bridge | Competitor page; not used |
| 6 | open.er-api.com (live rate) | Daily mid-market USD/BDT | Reported; used live with source shown |

**Conclusions used**
1. Upwork's fee varies per contract → editable, with the actual proposal rate recommended.
2. Wise fees/bKash support could not be verified → Wise not added as a channel.
3. The most honest "saving" metric is what the user actually received → reality check vs mid-market rate.

## Roadmap

| Priority | Item | Status |
|---|---|---|
| P0 | Render engine steps; reconciliation shown; CSV from engine | Done |
| P0 | Incentive off by default and correctly named; remove ToS-evasion pitch and unsourced SRO | Done |
| P1 | Live FX with timeout + labelled fallback; editable fees with sources | Done |
| P1 | Reality check and saved payment records with CSV | Done |
| P2 | Add Wise / other rails once official fee pages are verified | Not done |
| P2 | Per-bank inward SWIFT charge table | Not done — needs bank-published schedules |

## Testing
`tests/core.test.ts` (engine invariants, plus `effectiveCost`, `savingBetween`, `channelsToCsv`). Browser: invariant banner, 4 routes, incentive default off, removed claims, FX source shown, each card's lines add up to net (±৳2 rounding), reality check, record persistence.
