# Health apps: what others do, and what MediScan adopts (checked 2026-11-18)

Claims are the companies' own descriptions (app store listings, own sites, press), not independent tests.

| App | What it does (claimed) | Source |
|---|---|---|
| NHS 111 online (UK) | Starts every check with a "Call 999 now for any of these" screen (heart attack, stroke, breathing, heavy bleeding, seizure, swelling of throat, labour) before any questions | https://111.nhs.uk/triage/check-its-not-an-emergency |
| DocTime (BD) | Video, audio or chat with BMDC-registered doctors, filters by specialty, fee, rating, gender and availability; e-prescriptions, records, family profiles, bKash/Nagad/card payment | https://apps.apple.com/us/app/doctime/id1586295223 · https://www.thedailystar.net/node/2102393 |
| Arogga (BD) | Medicine delivery, lab tests with home sample collection where available, doctor consultation | https://arogga.com/ · https://futurestartup.com/2024/04/22/aroggas-lab-testing/ |
| Praava Health (BD) | Family doctors and diagnostics; "Ghore Lab" home sample collection in Dhaka | https://www.tbsnews.net/bangladesh/health/praava-health-launches-home-lab-testing-solution-ghore-lab-581874 |
| Practo (India) | Find and book doctors by area, specialty and hospital; teleconsultation | https://apps.apple.com/us/app/-/id953772015 |
| Shastho Batayon 16263 (BD govt) | 24-hour doctor advice by phone, hospital/doctor/ambulance information, complaints | https://16263.dghs.gov.bd/ |

Not adopted as a source: a Practo "symptom search" description and Teladoc feature lists found only on vendor
blogs (unverified).

## Patterns MediScan adopts (safe versions)

1. **Emergency screen first** (NHS 111): the assistant opens with a tick-list of warning signs from NHS pages.
   Any tick, or any matching words, shows "Call 999 / nearest emergency hospital" at once, with no animation
   and no further questions. Red flags are checked on the phone before anything is sent.
2. **Symptom → specialty routing** (DocTime/Practo filters): the answer is a kind of doctor from a fixed list
   (`lib/health/specialty.ts`) with a link to `/mediscan/doctors?specialty=…`. Never a disease, medicine or dose;
   the guard (`lib/health/healthGuard.ts`) runs inside the model's schema and a rule-based router is the fallback.
3. **Organised note for the doctor**: a copyable summary in the person's own words (since when, where, medicines
   already taken, allergies) plus the questions to ask. Medicines and allergies never leave the phone.
4. **Plain-language terms**: ECG, blood test, X-ray, ultrasound, CT, MRI and blood pressure, each linked to its
   NHS page.
5. **Government channels up front** (16263): the services page lists 999 first, then only official pages
   (16263, DGHS hospital & clinic section, VaxEPI, DGDA) and one long-running volunteer blood-donor group,
   each with a SourceTag.

## Deliberately not adopted

- Medicine ordering and payment inside the assistant (out of scope; MediScan never recommends medicines).
- Ratings or doctor counts we cannot verify.
- A mental-health line: the helpline found in directories had a compromised website on the check date, so it
  is omitted until it can be verified on a working official page.
