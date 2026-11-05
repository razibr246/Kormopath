# Repository Guidelines

## Project Structure

This is a Next.js app using the App Router and TypeScript. Pages and API handlers live in `app/` (`app/api/*/route.ts`); shared screens and UI components are in `components/`. Domain logic, types, and integrations belong in `lib/`. Tests are in `tests/`, and global styles are in `app/globals.css`. Keep new code near the feature it serves and use the `@/*` alias for imports from the repository root.

## Build, Test, and Development

- `npm install` installs the pinned dependencies.
- `npm run dev` starts the local Next.js server at `http://localhost:3000`.
- `npm run build` creates a production build; `npm start` serves that build.
- `npm test` runs the Node test suite (`tests/*.test.ts`), including financial calculations and evidence grounding.

Copy `.env.example` to `.env.local` for local configuration. `GEMINI_API_KEY` enables model-backed features; without it, rule-based fallbacks remain available. Keep secrets out of source control.

## Coding Style

Use TypeScript with the strict compiler settings in `tsconfig.json`. Match the existing style: two-space indentation, semicolons, double-quoted imports/strings, and named exports for shared logic. Use PascalCase for React component files and component names (for example, `StageAudit.tsx`), and lowercase names for utility modules (for example, `finops.ts`). Prefer small, typed functions and deterministic domain logic; validate external or model-provided data before using it. No formatter or lint script is currently defined in `package.json`.

## Testing

Add tests under `tests/` with the `*.test.ts` suffix, using Node's built-in `node:test` and `node:assert/strict` APIs. Cover expected results and important edge cases, especially for calculations, validation, and fallback behavior. Run `npm test` after changes; run `npm run build` for changes that affect app routes, components, or production compilation.

## Commits and Pull Requests

Git history is not available in this checkout, so no established commit format can be confirmed. Use concise, imperative commit subjects (for example, `Add receipt validation tests`). Pull requests should explain the user-visible change, note relevant configuration changes, link an issue when applicable, and include screenshots for UI changes. Call out tests and build checks performed.

## Security and Configuration

Never commit `.env.local`, API keys, passport signing secrets, or user documents. Keep legal and financial text grounded in the app's approved deterministic rules and templates; do not treat model output as a trusted source of amounts or legal clauses.

## Domain Boundaries

- Keep money calculations in pure, deterministic functions in `lib/finops.ts`; do not ask a model to calculate fees, exchange conversions, incentives, or totals. Preserve the reconciliation invariant between gross amounts, itemized steps, and net amounts.
- Keep evidence validation in `lib/grounding.ts`. Claims and receipt values returned by a model must be checked against the original source before they affect scores or financial records.
- Keep contract clauses in the reviewed templates in `lib/contract.ts`. Model output must not author or alter legal clauses; only validated user inputs should fill template fields.
- Treat model and external API responses as untrusted input. Validate their shape and bounds before using them in domain logic or returning them from API routes.
- Add or update focused tests in `tests/*.test.ts` when changing calculations, grounding checks, input validation, or fallback behavior.
