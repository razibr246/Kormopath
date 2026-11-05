# Competitor feature matrix

**Reviewed:** 2026-11-05. Official sources are linked in GLOBAL_PLATFORM_RESEARCH.md. This is a product-pattern comparison, not a full vendor teardown.

| Product group | Strong pattern | Lifecycle/access consideration | KormoPath response |
|---|---|---|---|
| Khan Academy / Duolingo / Brilliant | Progress history, active recall, review and targeted practice | Teacher features require class/role configuration | Add local mistake review with transparent signals; do not reward time alone |
| Coursera / edX / Codecademy | Job/subject pathways, lessons, practice, milestones and projects | Content and credential costs/regions vary | Curate source-linked resources; do not mirror proprietary courses |
| freeCodeCamp / Exercism | Interactive work, tests, projects, mentoring | Curriculum licenses vary | Use original rubrics and compatible/open content |
| GitHub | Profile narrative, pinned work, public artifacts | Public profiles reveal personal information | User-controlled, redacted project portfolio |
| GitHub Classroom | Autograding and pull-request feedback | Official docs state retirement Aug 28, 2026 | Do not depend on it; generic feedback pattern only |
| Linear / Notion | Structured goals, work status, updates, history and dashboards | Team features assume accounts; some features are plan-gated | Local personal action board; charts only from real records |
| LinkedIn / Google Career Certificates | Project evidence, credentials, resume/interview support | LinkedIn help says the old Skills Assessment feature is discontinued; Google job support availability is program/region dependent | Link skills to actual artifacts; never promise credential recognition or jobs |
| ChatGPT / Gemini / Claude / NotebookLM | Conversational and document-grounded assistance | Product capability, retention terms, cost and availability vary by tier | Keep one configured server-side provider with explicit send notices and cost limits |
| Shopify | Order/fulfillment states and shipment tracking | Requires real order and carrier integrations | HaatBazar quote → manually confirmed booking states first |
| W3C VC ecosystem | Issuer/holder/verifier model, privacy and disclosure | Requires standards-compliant proofs, issuer trust and status handling | Current KormoPath HMAC Passport remains app-specific until governance exists |

## Product scope count

Current source contains six ecosystem apps (AdmitBuddy, MediScan, Shohoj Budget, HaatBazar, Probaho, FeeGuard), the original Workspace flow, ChuktiGuard, and My Path. Settings and Passport verification support these areas. Count claims must come from one central route/product registry.
