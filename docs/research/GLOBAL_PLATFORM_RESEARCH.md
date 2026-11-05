# Global platform research

**Reviewed:** 2026-11-05. This is an initial evidence-backed product-pattern review, not an exhaustive teardown of every named product. Use official product/help/standard documentation; re-check feature lifecycle, prices and API terms before integrating.

| Platform | Pattern confirmed in official source | Transferable lesson / KormoPath fit |
|---|---|---|
| Khan Academy | Student progress includes time/activity history and mastery movement. [Source](https://support.khanacademy.org/hc/en-us/articles/360032987591) | My Path should show dated task history and outcomes, not only a completion percentage. |
| Duolingo | Practice uses spaced repetition, active recall, accuracy and prior mistakes. [Source](https://blog.duolingo.com/spaced-repetition-for-learning/) | Probaho can schedule review from missed rubric points; avoid pressure-based streaks. |
| Coursera Skills Tracks | Role-aligned paths combine practice, assessments and credentials. [Source](https://www.coursera.org/business/skill-tracks) | Connect goals → practice → evidence; curate open/local resources rather than copy a paid catalog. |
| Codecademy | Skill/career paths sequence lessons, quizzes, projects and milestones; project catalog supports application of skills. [Paths](https://help.codecademy.com/hc/en-us/articles/220453248-Picking-Your-Learning-Path) · [Projects](https://www.codecademy.com/projects) | Give the Workspace challenge a portfolio-ready artifact and skill/evidence mapping. |
| freeCodeCamp | Curriculum certification includes projects and tests. [Source](https://www.freecodecamp.org/news/freecodecamps-new-coding-curriculum-is-now-live-with-1400-coding-lessons-and-6-developer-certifications-you-can-earn) | Credible proof needs checkable work, not ornamental badges. State exact assessment limits. |
| Exercism | Tracks contain concept/practice exercises; staged learning and optional mentoring are supported. [Tracks](https://exercism.org/docs/building/product/tracks.md) · [Modes](https://exercism.org/docs/building/product/unlocking-exercises) | Normalize Probaho and Workspace rubrics to stable skill IDs before adaptive learning. |
| LinkedIn | Projects can show descriptions, skills and media; a Skill Assessments help page says the old feature was discontinued, so lifecycle is mixed across official help pages. [Projects](https://www.linkedin.com/help/linkedin/answer/a8064614) · [Assessment status](https://www.linkedin.com/help/linkedin/answer/a507663) | Prefer project-based evidence; do not build on or advertise the retired assessment feature. |
| Google Career Certificates | Career support includes interview/resume resources and employer links for eligible graduates. [Source](https://grow.google/certificates) | Add a local application tracker and interview prep, but never promise employer access or placement without local partners. |
| GitHub profiles | Public profile README and pinned repos present selected work. [README](https://docs.github.com/en/account-and-profile/how-tos/profile-customization/managing-your-profile-readme) · [Resume guide](https://docs.github.com/en/account-and-profile/tutorials/using-your-github-profile-to-enhance-your-resume) | GitHub metadata can complement user-authored evidence; repository language alone is not verified proficiency. |
| GitHub Classroom | Historically offered feedback PRs/autograding, but official docs announce retirement Aug 28, 2026. [Notice](https://docs.github.com/en/education/manage-coursework-with-github-classroom/teach-with-github-classroom/leave-feedback-with-pull-requests) | Do not integrate a service that is closing; reuse only the generic rubric-feedback idea. |
| Linear | Projects, milestones, updates, history and scoped notifications organize work. [Projects](https://linear.app/docs/projects) · [Updates](https://linear.app/docs/initiative-and-project-updates) | Use “next action + progress update + history” in My Path; team workflows need accounts/roles. |
| Notion | Charts/dashboards are views over structured databases. [Source](https://www.notion.com/help/charts) | Any dashboard must summarize actual records and drill into them; never show fabricated/sample numbers as user analytics. |
| Shopify | Order status pages and shipment updates track actual fulfillment events. [Source](https://help.shopify.com/en/manual/fulfillment/setup/order-status-page/order-tracking) | HaatBazar can start with self-reported quote/booking state; no live delivery status without a carrier feed. |
| ChatGPT Study Mode | Uses guiding questions, explanations and comprehension checks. [Source](https://help.openai.com/en/articles/11780217-study-mode) | Offer a “coach me” mode that guides reasoning; Buddy must not read local records without specific permission. |
| W3C Verifiable Credentials 2.0 | Defines issuer-holder-verifier roles, privacy and selective disclosure. [Standard](https://www.w3.org/TR/vc-data-model-2.0/) | Current HMAC passport is not W3C VC; pursue interoperability only with issuer governance and revocation/status support. |
| OWASP ASVS 5.0 | Versioned verification requirements for web apps and APIs. [Source](https://asvs.owasp.org/) | Track production controls against a checklist; do not imply certification. |
| Next.js production guidance | Covers security, data fetching, accessibility, metadata, type safety and performance. [Source](https://nextjs.org/docs/app/guides/production-checklist) | Use framework-native deployment practices and measure before optimizing. |

## AI data handling and cost

Gemini API terms distinguish unpaid and paid services. Google says unpaid-service prompts/files and outputs may be used to improve products and human reviewers may process them; it advises against submitting sensitive, confidential or personal information to unpaid services. For paid services, prompts/responses are not used to improve products, while limited logging may still occur for abuse monitoring. A server key does not tell the app which tier or agreement is active. The deployment owner must verify billing, terms and applicable agreements before production. [Terms](https://ai.google.dev/gemini-api/terms) · [Pricing](https://ai.google.dev/gemini-api/docs/pricing) · [Zero data retention](https://ai.google.dev/gemini-api/docs/zdr)

Grounded search/model usage has model- and tier-specific quotas/costs. Avoid claiming production search is free based on a development key. [Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)

## Not justified by this research

- Adding every competitor feature or copying proprietary interface/code.
- AI access to private data without specific, revocable permission.
- Leaderboards, public communities, payments, employer access or supplier marketplaces before trust/safety and support operations exist.
- Calling a signed JSON token a W3C credential or a public GitHub lookup verified skill.
