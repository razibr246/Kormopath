# Pitch script (English, about 3 minutes, 5 slides)

For presenting the deck live (final round) or as the voice-over for the demo video. The same text is in each slide's speaker notes.

## Slide 1 — Problem (~35 s)
Hi, I'm Razib Miah, a second-year CSE student at Daffodil International University.
Every day, young people in Bangladesh make big decisions on information they can't check.
A student freelancer can't prove their skills, so they undersell — and Fiverr keeps 20% of every order.
Admission dates are scattered across dozens of circulars. Prescriptions are hard to read. And household money and farm sales are decided without the full numbers.
KormoPath fixes this with AI you can actually check.

## Slide 2 — Solution (~40 s)
Our flagship is a four-agent pipeline that takes a freelancer from CV to money received.
One — upload a CV or a Fiverr screenshot. The Auditor values your skills, but it only keeps a skill if it can quote it word-for-word from your CV.
Two — the Examiner gives you a real bug to fix and a short spoken viva. Pass both and you get a signed Skill Passport anyone can verify.
Three — Outreach writes your pitch and a bilingual English and Bangla contract, with a clause for internet shutdowns.
Four — the Treasurer shows exactly how much taka reaches you on each payout route.
Around it, six everyday apps use the same rules — I'll show them at the end.

## Slide 3 — How it works (~40 s)
Here's what makes KormoPath different: the AI does the reading and writing, but code checks every claim.
Gemini returns structured JSON. If it fails our schema, the errors go back to the model for one repair.
Every skill must be found word-for-word in the source. The pitch can't mention a dollar amount that isn't in the contract.
And money is never calculated by the model — only by unit-tested code.
If Gemini is overloaded, we retry, switch to a lighter model, and finally fall back to rules — and the live trace on screen shows every one of those steps.

## Slide 4 — About me (~20 s)
I built KormoPath solo. I'm a full-stack and AI engineer in my second year of CSE at Daffodil International University.
This year my team was second runner-up at the national Legal-Tech Hackathon, run by the Directorate of Legal Aid with UNDP and the EU, and I was a prize winner in the Agent X AI competition by NetCom and Microsoft.
*[Add one true sentence about why this problem matters to you.]*

## Slide 5 — Six more apps + proof (~40 s)
The same rules power six everyday apps.
AdmitBuddy matches students to universities and tracks every application — it never invents an admission date.
MediScan reads a prescription in plain Bangla and turns it into calendar reminders — it never diagnoses.
Shohoj Budget lets you say an expense in Bangla, and nothing is saved until you confirm it.
HaatBazar tells a farmer whether a distant market is worth the trip, with live weather for spraying.
Probaho coaches interview and viva answers, and FeeGuard shows how much of a freelance payment really reaches you.
Everything stays on your device. It's live right now at kormopath.vercel.app, with 70 unit tests and 103 browser checks passing — and there's a two-minute judge tour at slash judges.
KormoPath — AI you can check. Thank you.

## Delivery tips
- Speak slower than feels natural; pause after each numbered step on slide 2.
- On slide 3, point at the trace if presenting live with the app open.
- If a judge asks "what if the AI is wrong?", the answer is slide 3: every claim is checked by code, and money is never calculated by the model.
- If asked about real users: say honestly what testing you've done so far and what the pilot plan is.
