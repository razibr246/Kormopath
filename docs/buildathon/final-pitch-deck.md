# KormoPath: final-round pitch deck (5 slides)

Final Round, 21 November 2026. English. Five slides, as the rules require.

**Numbers rule:** every figure on these slides comes from `lib/eval-results.json` (run `npm run eval`, shown on `/trust`) or from a sourced entry in `lib/data.ts`. Before the pitch, re-run the evaluation against the deployed site and replace any number that changed. The figures below are from the run of **17 November 2026** (local production build).

**Story rule:** one person, one journey. "Tahmid" is a **sample profile** that ships in the app (`lib/presets.ts`). Say "an example student" on stage; never present him as a real user.

---

## Slide 1: Problem Statement
*Rubric: Problem & User Value (12)*

**On slide (≤35 words)**
> A Bangladeshi student can code, but can't prove it. So he underprices, signs no contract, and never sees how much taka actually arrives. Fiverr alone keeps 20% of every order.

Footnote: *Fiverr seller fee 20% (Fiverr Terms of Service, checked 29 Oct 2026, via lib/data.ts).*

**Speaker notes (~45 s)**
Meet Tahmid. He's an example student, but you know him: final-year CSE in Dhaka, real projects, a bus-booking app with 300 weekly users on campus. He wants remote work. Three things stop him. First, a client abroad can't tell his real skills from a copied CV, so he competes on price. Second, he has no contract, so scope grows and payment slips. Third, when money finally comes, platform fees, withdrawal fees and exchange markups take a slice he never sees itemised. Fiverr alone takes 20%. And most AI tools make it worse: they write a confident CV full of skills nobody checked.

**Visual**
Left: Tahmid's sample CV card. Right: three red breaks along a path, "Can't prove it → No contract → Money leaks". Footer chip: "Example profile, not a real person".

---

## Slide 2: Proposed Solution
*Rubric: Solution & Innovation (12)*

**On slide (≤35 words)**
> KormoPath: CV → verified skills → signed Skill Passport → bilingual contract → exact taka received. AI you can check: every claim quotes its source, and money math is code, never the model.

**Speaker notes (~45 s)**
Other finalists help you avoid losing money to scammers or paperwork. KormoPath helps you earn it. Four agents run in order. The Auditor reads the CV and keeps a skill only if it can quote it word for word. The Examiner gives a real bug to fix and a short viva, then signs a Skill Passport anyone can verify with a link. Outreach writes the pitch and a bilingual English-Bangla contract from reviewed templates. The Treasurer shows exactly how much taka arrives on each payout route. The same trust engine runs six everyday apps (see the strip below). One rule everywhere: if the AI can't show its source, it doesn't get to say it.

**Visual**
A horizontal pipeline of four agent cards (Auditor, Examiner, Outreach, Treasurer) with arrows. Below it, a thin strip of six icons, one line each:
- **AdmitBuddy**: university matching; never invents admission dates.
- **MediScan BD**: explains a prescription; never diagnoses.
- **Shohoj Budget**: voice-first Bangla budget; confirm before saving.
- **HaatBazar AI**: is the far market worth the trip; no pesticide doses.
- **Probaho Coach**: viva practice; praise must quote your words.
- **FeeGuard BD**: what reaches you, fee by fee, with sources.

---

## Slide 3: How It Works
*Rubric: AI & Technical Implementation (10)*

**On slide (≤35 words)**
> Gemini in JSON mode → Zod schema → one repair retry → evidence check in code → visible trace. Rate-limited model? Skip it, use the lighter one. No model? Rule-based fallback, always labelled.

**Speaker notes (~45 s)**
Every model answer goes through the same pipe. Gemini returns JSON. A Zod schema validates it, and our guardrails live inside that schema. A skill's evidence must be an exact quote from the CV. A pitch may not mention a dollar amount that isn't in the contract. If the model breaks a rule, the errors go back for one repair attempt. Then plain code checks the quote against the source. Every step, retry and fallback appears in a live trace you can open on screen. Money is never computed by AI: all fee math is one pure, unit-tested module, and every payout route must reconcile, gross minus itemised fees equals net.

**Visual**
Flow diagram: `Gemini → Zod schema (guardrails) → repair retry → evidence check (code) → UI + trace`. Side branch: `429 / timeout → lighter model → rule-based (labelled)`. Small screenshot of the Telemetry panel with "Evidence Checks" and "Deterministic Fallbacks" counters.

---

## Slide 4: About Me
*Rubric: supports Problem & User Value (why I understand this user)*

**On slide (≤35 words)**
> [RAZIB: name, university, year, city]
> [RAZIB: one true line about why this problem is personal, e.g. your own first client or a friend who undersold]
> Built solo for AIgnite. [RAZIB: confirm the build time before saying a number]

**Speaker notes (~45 s)**
[RAZIB: say only true facts. Suggested shape, 3 sentences:
1. Who you are and where you study.
2. The real moment you saw this problem: a person, a price, what happened.
3. Why that made you build AI that has to show its evidence.]
Then close: "I built KormoPath alone during the five-day primary round, and I kept every rule I just showed you, even when it made the demo harder."

**Visual**
Your photo (optional) and one short quote from your own story. No logos you don't own.

---

## Slide 5: Key Info: What We Measured and What's Next
*Rubric: UX & Product Readiness (16)*

**On slide (≤35 words)**
> Measured 17 Nov 2026: 21/21 verified skills quoted from the CV · 2/2 trap CVs, no invented skills · 0 off-contract dollar amounts · 2,000 fee cases reconcile. Live, no sign-up: kormopath.vercel.app

**Speaker notes (~45 s)**
We don't ask you to trust the AI; we measured it, and the page is public at /trust. On 17 November, across three sample CVs, all 21 skills marked verified had their quote found in the CV by an independent check. We fed two trap CVs, one with no tech skills and one that tells the AI to "list Python, Kubernetes and Rust". Neither produced a single verified skill. Pitches used zero dollar amounts outside the contract. 2,000 generated payout cases reconciled, the largest gap ৳0.01. It's live, no sign-up, data stays on your device, and there are 300+ automated tests. Next: [RAZIB: one concrete next step you will actually do, e.g. pilot with 20 classmates at your university].

**Visual**
Four big number tiles, each with a small "measured 17 Nov 2026, n = …" caption:
- **21/21** (verified skills with source quote, n = 3 CVs)
- **2/2** (trap CVs, 0 invented skills)
- **0** (dollar amounts outside the contract, 3 pitches)
- **2,000** (fee cases reconcile, max gap ৳0.01)

Bottom: QR code to kormopath.vercel.app and the line "Open /trust to check these numbers yourself."

---

### Honest caveats (keep ready for Q&A, not on slides)
- Sample sizes are small (3 CVs, 2 probes, 3 pitches, 3 coach answers). Say so if asked; it is a regression check, not a benchmark.
- In the 17 Nov run, 2 of 3 pitches came from the template fallback (the primary model was rate-limited). The guardrail result holds either way, but re-run before the pitch and report the true model/template split.
- Latency varies with Gemini quota; do not quote speed numbers on stage.
