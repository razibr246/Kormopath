# Data portability improvement — 2026-11-08

Implemented a local backup/restore workflow at `/settings` for all six ecosystem apps, My Path, ChuktiGuard, the shared profile and Workspace ledger. The ledger was previously omitted from the settings export/delete group; it is now included.

Backups have a versioned format, key allowlist, 5 MB import limit, preview and explicit overwrite option. The default fills missing storage keys and preserves existing ones; it does not merge array records. Existing per-app JSON exports are supported. Failed writes attempt rollback, and the UI reports whether recovery completed. No file is sent to an API. Backups are not encrypted. Existing app sanitizers remain responsible for domain validation after import.

Added five focused tests covering cross-app round trips, Bangla preservation, conflict handling, older exports, invalid formats/keys and quota-failure rollback. Added GitHub Actions to run the test suite and production build with Node 24.

Validation: 80 tests passed; production build passed. Browser validation is recorded separately in the handoff. Gemini-backed features were not exercised because no API key is configured.

Publication: GitHub push dry-run failed because no GitHub authentication is available. No GitHub or Vercel update was performed. These changes are a focused improvement, not a claim of production readiness or competition results.
