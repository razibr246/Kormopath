# KormoPath · 3-minute pitch script

Razib Miah · Ostad presents YUNet AIgnite Buildathon 2026 · National AI Hackathon for B2C Solutions

Present from `KormoPath-Deck-animated.html` (press F for full screen, N for these notes, arrow keys to move).

## Slide 1 · 0:00–0:15

Hi, I'm Razib Miah. This is **KormoPath**: AI you can check, for everyday life in Bangladesh. It's live right now, no sign-up. Scan the QR on my last slide and try it while I talk.

## Slide 2 · 0:15–0:50

Meet Nabila, 21. In one week: a client doesn't trust her CV and Fiverr keeps 20%. A fake bKash SMS asks for her OTP. At 2 a.m. her mother writes that Abbu has chest pain. Her landlord threatens her. **Ten worries, ten different apps, and AI chatbots that confidently make things up.** The gap isn't more AI. It's AI she can check.

## Slide 3 · 0:50–1:30

KormoPath is 12 consumer apps on one trust engine, all in Bangla, all free to start. **Rokkha** quotes the exact scam words in an SMS. **MediScan** sends chest pain to 999 first, never a diagnosis. The **hospital finder** shows the nearest emergency hospital. **Shohoj** tracks money to the poisha, **Legal Aid** explains the free 16699 service, and **MaathSathi** plans a farmer's field.

## Slide 4 · 1:30–2:20

Under the hood, four Gemini agents take a freelancer from skill to taka. The Auditor only keeps a skill if its exact quote is in the CV. The Examiner tests real code in a sandbox and issues a signed passport. Fees and tax are computed by code, never by AI. **Buddy** brings this to all 12 apps: ask the bKash cash-out fee and it quotes bKash's own page, ৳92.50 for ৳5,000. We measured it on the live site: 21 of 21 skills quoted, 2 of 2 trap CVs caught, 0 invented dollar amounts, and 640+ tests.

## Slide 5 · 2:20–3:00

The business is B2C freemium. **Safety is free forever**: 999 triage, hospitals, scam checks, legal aid. Pro is ৳99 per app or ৳299 for everything, only when it saves time, and payments open only after a verified bKash merchant account. It's ready today: Bangla first, phone first, works even when the AI is down. I built it alone, and I'd love you to try it now. **Thank you.**

## If a judge asks

- **How does it make money?** Freemium: safety is free forever; Pro is a proposed ৳99 per app or ৳299 all-access per month, for convenience features. No payment is taken until a verified bKash merchant account exists.
- **Why trust the AI?** Every answer is checked by code before you see it: skills need an exact quote, money is computed by code, emergencies go to 999 before any AI call, and the trace is visible. Results are public at kormopath.vercel.app/trust.
- **What if the AI is down?** Every app falls back to rule-based answers, labelled "offline answer".
- **Is any user data stored?** No account, no database. Data stays on the user's device and can be exported or deleted per app.
