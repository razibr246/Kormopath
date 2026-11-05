# Recommended integrations

## Keep / formalize

| Integration | Current use | Recommendation | Requirements |
|---|---|---|---|
| Gemini Developer API | Workspace, Buddy, OCR, and grounded product/opportunity searches | Keep server-side and schema-validate responses. Minimize prompts, do not cache sensitive content, configure spend/usage controls, and disclose each send. | Server-only API key. Verify unpaid/paid project terms and data tier before deployment; unpaid content may be used to improve products and reviewed by humans. Costs and grounding quotas vary. [Terms](https://ai.google.dev/gemini-api/terms) · [Pricing](https://ai.google.dev/gemini-api/docs/pricing) · [Limits](https://ai.google.dev/gemini-api/docs/rate-limits) |
| GitHub public API | Optional public repository metadata during audit | Keep username optional; describe exactly which public metadata is read. Do not treat repo languages as proficiency proof. | Respect GitHub limits and public-profile exposure; no new dependency needed. |
| Open-Meteo | HaatBazar weather forecast | Keep source attribution, timeout, cache and local-district disclaimer. Recheck API license/terms for commercial use. | Existing integration. |
| Exchange-rate provider | Reference FX for payout estimates | Keep timestamp/fallback; label it a reference, not guaranteed bank payout. | Existing integration; recheck limits/terms before public launch. |
| W3C VC Data Model 2.0 | Not integrated | Evaluate only after issuer governance, verifier trust, status/revocation and conformance plan exist. | Current HMAC Passport is not VC-conformant. [Standard](https://www.w3.org/TR/vc-data-model-2.0/) |
| OWASP ASVS 5.0 | Not in release checklist | Use a scoped, versioned security verification checklist for APIs, uploads, secrets and future auth. | Free standard; adopting it is not a certification. [ASVS](https://asvs.owasp.org/) |

## Do not add yet

- GitHub Classroom: official docs announce retirement Aug 28, 2026; do not integrate. [Notice](https://docs.github.com/en/education/manage-coursework-with-github-classroom/teach-with-github-classroom/leave-feedback-with-pull-requests).
- Hosted auth/database: no provider or data residency, retention, deletion, backup, access-control or account-recovery plan has been chosen.
- Payment, e-sign, escrow, job-board or supplier-marketplace APIs: no onboarding, KYC, refunds, disputes, support or payment operations exist.
- Additional AI vendors: current server-side Gemini integration is sufficient for the existing optional calls; adding vendors increases privacy, cost and maintenance without measured benefit.
- Advertising/behavior trackers: conflicts with the local-first promise unless separately approved with explicit consent/retention controls.

## Integration acceptance checklist

Before adding a provider, document official endpoint/product page, active lifecycle, terms/license, Bangladesh availability, cost/quota, budget owner, exact payload, retention, user disclosure/consent, failure path, test strategy and operating owner. Keep secrets server-side; validate external responses and return only the fields the UI needs.
