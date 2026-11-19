# KormoPath as a B2C product

For the National AI Hackathon for B2C Solutions (final, 21 November 2026). Every number here is either from the code
(`lib/session.ts`, `lib/eval-results.json`) or marked as an assumption for the founder to confirm. No market size,
user count or revenue is claimed, because none has been measured. Fill every `[RAZIB: …]` before the pitch.

## 1. Who buys (individual consumers, not companies)

| Segment | What they get first, free | What they would pay for |
|---|---|---|
| University students and fresh graduates | Skill Passport, AdmitBuddy deadlines, Probaho interview practice | AdmitBuddy model tests and practice exams; unlimited Probaho coaching |
| Student and early freelancers | Verified skills, bilingual contract, exact taka on each payout route | Workspace PDF export; all-access |
| Households | Shohoj budget, wallets, dues, mess, zakat; Rokkha scam checks | All-access for the family's extras |
| Farmers | MaathSathi field and farm book, HaatBazar weather | Nothing required: farming tools stay free |
| Patients and carers | Emergency hospitals, "which doctor?", prescription reading, medicine schedule | Booking verified doctors (once verification is live) |

## 2. The consumer journey (short sales cycle)

1. Open kormopath.vercel.app: **no sign-up, no download**. The home button "এখনই শুরু করুন · সাইন-আপ লাগবে না" (start now, no sign-up) opens the product.
2. First value in under a minute: a verified skill with its quote, a scam check on a pasted SMS, or the nearest emergency hospital.
3. A paid extra appears only at the moment it helps (for example, starting a model test). The sheet shows the fixed price, says payments are not open yet, and offers early access or a free demo.
4. Payment, when it opens: one fixed monthly price, paid by bKash to a verified merchant account. No negotiation, no contract.

## 3. Pricing (fixed, low, proposed)

| Plan | Proposed price | Adds |
|---|---|---|
| Free forever | ৳0 | Everything on the safety charter below, plus budget, scam checks, legal aid, farm book and hospital finder |
| One app | ৳99 / month | Every paid extra in one app |
| All-access | ৳299 / month | Paid extras in every app |

These are a team proposal (`PRICES_PROPOSED = true`). [RAZIB: confirm or change ৳99 and ৳299, and say whether they are monthly or one-time.]

## 4. The free-safety charter (never behind a payment)

Coded in `lib/session.ts` (`SAFETY_FEATURES`, `ALWAYS_FREE_APPS`) and tested in `tests/session.test.ts`:

- the emergency hospital finder, the 999 / 16263 strip and ambulance numbers
- the symptom assistant ("কোন ডাক্তার দেখাব?"), prescription reading, the medicine schedule and fever watch
- all of legal aid (16699, 109) and Rokkha (scam and link checks), plus every helpline

Payments are off (`PAYMENTS_OPEN = false`), there is no receiving number in the code, and nothing a user types (a
bKash TrxID or anything else) can unlock a feature. Paid features can be switched on only as a labelled demo, with no money.

## 5. Acquisition and retention

**Channels (no paid ads to start):**
- **University clubs:** CSE and career clubs, with Skill Passport sessions.
- **Facebook groups:** freelancer, admission-prep and household-budget groups. Content is a 30-second demo of one check (scam SMS, payout comparison).
- **Union Digital Centres:** the shared-PC privacy mode exists for them (AppHeader "Shared PC").
- **Word of mouth:** a verify link (`/verify`) for passports and an `sms:` family alert in Rokkha carry the name.

**Retention loop:** the budget, medicine schedule, dues and farm book are daily or weekly habits. Each one is saved on
the device and shows progress, such as days covered or dues settled. Paid extras sit next to these habits, not in front of them.

## 6. Unit economics (assumptions, founder to confirm)

| Item | Value | Status |
|---|---|---|
| Price | ৳99 / ৳299 per month | Proposed in code |
| Model cost per answer | `[RAZIB: from the Gemini billing page]` | Not measured |
| Answers per paying user per month | `[RAZIB: estimate]` | Assumption |
| Payment fee (bKash merchant) | `[RAZIB: from your merchant agreement]` | Not known yet |
| Hosting | `[RAZIB: from the Vercel plan]` | Not measured |

Break-even = fixed monthly costs ÷ (price − payment fee − model cost per user). Fill this in from real bills, not guesses.

## 7. Branding and story

- Name: কর্মপথ / KormoPath, "AI you can check". Shonar Bangla visual identity (`app/globals.css`).
- Story: Tahmid (an example student) earns his first remote income: a verified skill, a fair contract, every taka shown. The same trust engine protects his family's budget, his mother's medicine schedule and his village's farm.
- [RAZIB: your own moment, one sentence, the real one.]

## 8. 30-second answer: "How does it make money?"

"Safety is free for everyone, forever: emergency hospitals, the health assistant, legal aid and scam checks. People
pay a small fixed monthly fee, ৳99 for one app or ৳299 for all, for extras like model tests, unlimited interview
coaching and exports. There's no sign-up to start, so the first value comes in under a minute, and the paid extra
shows up only when it helps. Payments open once our bKash merchant account is verified. Until then we don't take money,
and the app says so. [RAZIB: one real next step, e.g. pilot with N students at your university.]"
