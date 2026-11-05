# AdmitBuddy — research and plan

## Audit
See `kormopath-platform-audit.md` and `kormopath-six-applications-analysis.md`. Key issues fixed: invented deadlines/exam dates, "18 universities" (16 in data), `"du"` substring bug in the counselor, unsourced scholarship claims, clamped readability score, nothing persisted.

## Research (checked 2026-11-05)

Fewer than the requested 10 references were reviewed for this app. Only items actually opened in search results are listed; most are secondary (news, third-party sites).

| # | Reference | What we learned | Type / reliability | Licence / use |
|---|---|---|---|---|
| 1 | GST cluster admission portal `gstadmission.ac.bd` (via admissionwar.com reporting) | 2025-26 circular published on the official site; final online application reported 10–24 Dec 2025 | Third-party report of official site | Link only |
| 2 | BSS News: "GST Cluster Admission: special application phase begins" (bssnews.net/news/350449) | Special phase 12–16 Jan 2026; first phase up to 30 Dec 2025 | National news agency | Link only |
| 3 | PMEAT stipend portal `estipend.pmeat.gov.bd` (reported by multiple outlets) | Bachelor-level students register here; disbursed via Nagad per a 2024 agreement | News reports; amounts conflict between sources | Link only; amounts not shown |
| 4 | Wikipedia: Prime Minister's Education Assistance Trust | Trust under Ministry of Education for merit-based support to underprivileged students | Encyclopedia | Background |
| 5 | Common App mobile page (commonapp.org/mobile) | Dashboard checklist of deadlines and requirements | Vendor page | Pattern only |
| 6 | ApplyKit review (diycollegerankings.com) | Colour-coded calendars, % complete per application | Review | Pattern only |
| 7 | ApplyWise / Med School Application Tracker (App Store listings) | Deadline alerts, overdue notices, on-device data | Store listings | Pattern only |
| 8 | SayHelloCollege free tracker spreadsheet | Tracks deadlines, aid, test requirements, status | Vendor resource | Pattern only |

Not found / not verified: CollegeVine and Scholarships.com feature details (search returned nothing usable); any open-source admissions tracker; 2026-27 circular dates for any university; current GPA cutoffs; private-university waiver rates.

**Conclusions used in the build**
1. Date-driven tracking with checklists and reminders is the common core of these products → implemented with user-entered, sourced dates and `.ics` export (works with phone calendars without push infrastructure).
2. Because 2026-27 dates are not published and cutoffs/waivers could not be verified, the app must not show them as facts → dates are user-entered with a required source; GPA/fees are labelled "indicative, unverified".

## Roadmap

| Priority | Item | Status |
|---|---|---|
| P0 | Remove invented dates; user-entered dates with source | Done |
| P0 | Fix counselor substring bug; remove invented facts | Done |
| P0 | Persist profile, shortlist, tasks, documents, SOP draft | Done |
| P1 | Document checklist, `.ics` export, official resource links | Done |
| P1 | Real readability (Flesch), generic-phrase hints | Done |
| P2 | Verified dataset of 2026-27 circulars (source URL + date per row), refreshed by a maintainer | Not done — needs a human to read circulars when published |
| P2 | Scholarship directory with eligibility filters | Not done — no verified dataset yet |
| P3 | Browser notifications for upcoming dates | Not done — needs a service worker; `.ics` alarms cover this for now |

## Design
Indigo/blue, welcoming and organised. Tabs: discover, tracker, SOP, ask, official links. Cards show fit, category, eligibility, and "date not added" until the student adds one.

## Testing
`tests/admitbuddy.test.ts` (8 tests: no invented deadlines, user deadlines drive days-left/closed, selective public = Reach, undated tasks stay undated, deadline validation, counselor fixes, real Flesch score, `.ics` output). Browser: shortlist → tracker → add dated deadline with source → reject without source → reload persistence → counselor → SOP analysis.
