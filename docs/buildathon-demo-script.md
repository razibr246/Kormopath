# Demo video script (English, about 2.5 minutes)

For the Ostad Presents YUNet AIgnite Buildathon 2026 submission. Record the screen at https://kormopath.vercel.app on a laptop, 1440×900 or larger. Check first that the live audit trace shows a Gemini model (the site uses `gemini-flash-lite-latest` first, `gemini-2.5-flash` as backup), not "No GEMINI_API_KEY set". The free tier has a daily request limit per model, so don't run the presets over and over before recording.

| Time | Screen | Say |
|---|---|---|
| 0:00–0:15 | Landing page, sticker visible at the top | "Hi, I'm Razib. A student in Bangladesh can have real skills and still fail to earn: nobody can verify them, they don't know their rate, clients come with no contract, and fees eat the payout. KormoPath fixes that path end to end." |
| 0:15–0:45 | Workspace → click the **Tahmid Hasan** judge preset | "One click runs four AI agents. The Auditor sends the CV to Gemini, which must quote the CV for every skill. Code then checks each quote is really there; anything it can't find is struck out. Here the rate is an indicative range from a sourced dataset." |
| 0:45–1:05 | Point at the trace column on the right | "This is the live trace: the Gemini call, the schema check, the evidence check and timings, all measured. If the model is overloaded we retry, then switch to a lighter model, and if all else fails a rule-based agent takes over, labelled as such." |
| 1:05–1:30 | Stage 2: run the bug-hunt tests, type a short viva answer | "Claims aren't enough, so the Examiner gives a real bug to fix in a sandbox, then a spoken viva. Pass both and you get a signed Skill Passport that anyone can verify." |
| 1:30–1:55 | Stage 3: the pitch and the bilingual contract | "The Outreach agent drafts a cold email. A guardrail rejects any dollar amount that isn't in the contract, and the contract clauses, including an internet-shutdown clause, come from fixed templates in English and Bangla, never from the model." |
| 1:55–2:15 | Stage 4: payout comparison | "The Treasurer compares payout routes in taka with a live exchange rate. The fee math is plain, unit-tested code; the AI never calculates money." |
| 2:15–2:35 | Quick cuts: MediScan reminders, Shohoj voice budget, Probaho STAR check | "The same rules power six more apps: prescription reading with calendar reminders, a voice-first Bangla budget, interview practice and more. Data stays on your device." |
| 2:35–2:45 | Back to the landing page | "KormoPath: from skill to income, with AI you can check. Try it at kormopath.vercel.app. Thank you." |

Tips: speak slowly, zoom the browser to 110–125% so text is readable on YouTube, and keep it under 3 minutes.
