# Legal Aid section — KormoPath design brief (mandatory for every legal work package)

The legal section must look, read and move exactly like the rest of KormoPath (v2 "Shonar Bangla").
Do NOT copy DLAS's own look: no Geist font, no shadcn/Radix styling, no government seal or
"গণপ্রজাতন্ত্রী বাংলাদেশ সরকার" header, no blue portal theme. Copy its features and logic; restyle everything.
Reference pages to imitate: app/rokkha/page.tsx (+ its CSS in app/globals.css `rk-*`), app/krishi/page.tsx
(+ app/krishi/krishi.css `ms-*`), app/mediscan/FeverWatch.tsx.

## Page frame
- `<div className="min-h-screen bg-paper">` → `AppHeader` (components/layout/AppHeader.tsx, appId="legal",
  href="/legal", name="আইনি সহায়তা", Bangla tagline) → `<main id="main" className="mx-auto max-w-6xl space-y-6 px-4 pb-24 pt-4 sm:px-6">`
  → `AppFooter`. The body already paints the paper background, ledger grid and glows: never set your own page background.
- Width: content max-w-6xl; reading text max-w-[62ch]. Must work at 375 px with no horizontal page scroll.

## Type (fonts come from app/layout.tsx; never import other fonts)
- Headings h1/h2 automatically use Fraunces + Noto Serif Bengali (`--font-display`). Do not set font-family on them.
- Body is Inter + Hind Siliguri (`--font-sans`), 17 px base. Numbers/IDs: `font-mono` (JetBrains Mono, tabular).
- Scale (exact sizes, Tailwind arbitrary values as in the reference pages):
  - Hero h1: `text-[clamp(30px,5vw,50px)] font-semibold leading-[1.08] text-slate-900`, with one `<em className="kp-em">…</em>` two-tone accent.
  - Section h2: `text-[clamp(21px,3vw,27px)] font-semibold leading-tight text-slate-900` (cards: `text-[20px] font-extrabold`).
  - Card title / h3: `text-[17px]`–`text-[18px] font-bold`.
  - Body: `text-[15px]`–`text-[15.5px] leading-relaxed text-slate-700`.
  - Secondary: `text-[14px]`–`text-[14.5px] text-slate-600`. Small print/labels: `text-[13px]`–`text-[13.5px]`. Never below `text-[12px]`.
  - Eyebrow above headings: `<p className="kp-eyebrow">…</p>`.
- Bangla: no letter-spacing on Bangla text, no faux bold, line-height ≥ 1.4 on any single-line Bangla chip/button
  (vowel signs clip otherwise), NFC-normalise stored Bangla. Bengali digits in Bangla UI (bnDigits from lib/contract.ts or a local helper).

## Colour (Tailwind scales are remapped in app/globals.css — use them, never raw hex for UI)
- Legal accent: indigo (= Bengal nil) + amber (= haldi) + emerald (= Padma green) for "next step"; red only for danger/emergency.
- Text: slate-900 headings, slate-700 body, slate-600 secondary (slate-400/500 only for tiny meta). White cards on the paper.
- Contrast WCAG AA at minimum.

## Components
- Cards: `rounded-2xl border border-slate-200 bg-white p-5 sm:p-6` (soft elevation on hover only).
- Buttons: `kp-btn-primary` (main action), `kp-btn-sun` (at most one loud action per screen), `kp-btn-ghost` (secondary),
  `kp-btn-lg` for hero actions. Chips/toggles: `kp-chip` (`kp-chip-on` when selected).
- Tap targets ≥ 44 px (`min-h-[44px]`; big actions `min-h-[48px]`–`[52px]`). Inputs: `rounded-xl border border-slate-300 px-3 py-2.5 text-[15px]`.
- Icons: lucide-react only, 16–20 px, `aria-hidden`.
- Sources: `SourceTag` (components/layout/AppHeader.tsx) next to every fact (law, helpline, rule), with checked date.
- Bilingual: Bangla first, EN toggle in component state (`lang: "bn" | "en"`) as in FeverWatch.tsx.
- Emergency strip (999, 109, legal aid 16699 — numbers ONLY from lib/legal/data.ts) visible on every legal page.

## Motion (CSS only like the rest of KormoPath; no framer-motion)
- Entrance: `kp-rise` / `motion-safe:animate-rise-in`; stagger with inline `animationDelay`.
- Hover: translateY(-2px) + soft shadow on cards; buttons already animate.
- Only transform/opacity; respect `prefers-reduced-motion`.
- One tasteful signature animation per screen at most (a balance scale that settles when a step completes, a stamped "খসড়া / draft" seal).

## Tone and truth
- Information, not legal advice: say so once per page, plainly. Never "your case is filed", never imply a government portal.
- Every law name, helpline, office and eligibility rule comes from lib/legal/data.ts (verified, sourced). Missing stays missing.
  No section numbers and no income thresholds (both were dropped as unverifiable or recently amended).
- Demo data is labelled "নমুনা / Demo" wherever it appears.
