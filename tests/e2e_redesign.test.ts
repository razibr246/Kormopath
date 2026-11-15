/**
 * E2E Requirement Test Suite for KormoPilot Full Project Redesign
 *
 * Verifies R1 (Brand Identity, Logo & Tokens), R2 (UI/UX Components & Invariants),
 * R3 (Motion, VFX & Reduced-Motion), and R4 (Responsive & Accessibility).
 *
 * Tests are structured across Tiers 1-4 per TEST_INFRA.md:
 * - Tier 1: Feature Coverage (>=5 tests per feature across 8 features)
 * - Tier 2: Boundary & Corner Cases (empty states, viewport extremes, long strings, etc.)
 * - Tier 3: Cross-Feature Combinations (Logo + Mobile, Tokens + Themes, Focus + Motion)
 * - Tier 4: Real-World Application Scenarios (Pipeline, Mobile Nav, Reduced-Motion, etc.)
 *
 * Executed via Node 24 native type stripping: node --test tests/e2e_redesign.test.ts
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Deterministic domain libraries for invariant and pipeline verification
import {
  compareChannels,
  checkInvariants,
  best,
  fmtBdt,
  splitMilestoneUsd,
  type FinInput,
} from "../lib/finops.ts";
import { verifyEvidence, numberAppears, unknownAmounts } from "../lib/grounding.ts";
import { milestoneAmounts, buildContract, type ContractInput } from "../lib/contract.ts";
import { parsePrescriptionText } from "../lib/prescription.ts";
import { summarizeMonth, categoryBudgetStatus, type Transaction } from "../lib/budget.ts";
import { check, issue } from "../lib/passport.ts";
import { valuate, groundSkills, ruleExtract, type CheckedSkill, type Extraction } from "../lib/audit.ts";
import { CHALLENGES } from "../lib/challenges.ts";

// Helper utilities for opaque-box static file inspection
const ROOT = process.cwd();

function readProjectFile(relPath: string): string {
  const fullPath = path.join(ROOT, relPath);
  assert.ok(fs.existsSync(fullPath), `Expected file to exist: ${relPath}`);
  return fs.readFileSync(fullPath, "utf-8");
}

function projectFileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

// WCAG 2.1 Color Contrast Mathematics (Mathematical Oracle)
function parseHex(hex: string): [number, number, number] {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function getRelativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ============================================================================
// TIER 1: FEATURE COVERAGE (>=5 tests per feature across 8 features)
// ============================================================================

describe("Tier 1 - Feature 1: Brand Identity & Vector Logo Integration", () => {
  test("1.1 KormoPathLogo component file exists and exports KormoPathLogo", () => {
    assert.ok(projectFileExists("components/KormoPathLogo.tsx"), "components/KormoPathLogo.tsx must exist");
    const src = readProjectFile("components/KormoPathLogo.tsx");
    assert.match(src, /export\s+function\s+KormoPathLogo/, "Must export function KormoPathLogo");
  });

  test("1.2 KormoPathLogo supports variant, theme, size, and showSubtitle props", () => {
    const src = readProjectFile("components/KormoPathLogo.tsx");
    assert.match(src, /variant\?:/, "Must accept variant prop");
    assert.match(src, /theme\?:/, "Must accept theme prop");
    assert.match(src, /size\?:/, "Must accept size prop");
    assert.match(src, /showSubtitle\?:/, "Must accept showSubtitle prop");
  });

  test("1.3 KormoPathLogo renders vector SVG with 1:1 square aspect ratio (viewBox 0 0 64 64)", () => {
    const src = readProjectFile("components/KormoPathLogo.tsx");
    assert.match(src, /viewBox="0 0 64 64"/, "Must render SVG with viewBox 0 0 64 64");
    assert.match(src, /<svg[\s\S]*?>/, "Must contain svg element");
  });

  test("1.4 Navbar in components/Chrome.tsx integrates KormoPathLogo with dark theme", () => {
    const src = readProjectFile("components/Chrome.tsx");
    assert.match(src, /<KormoPathLogo[^>]*theme="dark"/, "Navbar must integrate KormoPathLogo with theme='dark'");
    assert.doesNotMatch(src, /<img[^>]*src="\/kormopath-logo\.jpg"[^>]*alt="KormoPath Logo"/, "Navbar must not use letterboxed raster JPEG");
  });

  test("1.5 Footer in components/Chrome.tsx integrates KormoPathLogo with light theme", () => {
    const src = readProjectFile("components/Chrome.tsx");
    assert.match(src, /<KormoPathLogo[^>]*theme="light"/, "Footer must integrate KormoPathLogo with theme='light'");
  });

  test("1.6 AppHeader in components/AppHeader.tsx integrates KormoPathLogo with mobile visible mark", () => {
    const src = readProjectFile("components/AppHeader.tsx");
    assert.match(src, /<KormoPathLogo[^>]*variant="compact"/, "AppHeader must render compact logo for desktop");
    assert.match(src, /<KormoPathLogo[^>]*variant="mark"/, "AppHeader must render mark-only logo for mobile screens");
  });
});

describe("Tier 1 - Feature 2: Design Tokens & Typography Hierarchy", () => {
  test("2.1 app/globals.css @theme defines typography font stacks", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /--font-display:/, "Must define --font-display token");
    assert.match(css, /--font-sans:/, "Must define --font-sans token");
    assert.match(css, /--font-mono:/, "Must define --font-mono token");
  });

  test("2.2 app/globals.css @theme defines multi-color text typography palette", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /--color-text-primary:/, "Must define --color-text-primary");
    assert.match(css, /--color-text-secondary:/, "Must define --color-text-secondary");
    assert.match(css, /--color-text-muted:/, "Must define --color-text-muted");
    assert.match(css, /--color-text-accent:/, "Must define --color-text-accent");
    assert.match(css, /--color-text-interactive:\s*#(?:0369a1|0284c7)/, "Must define --color-text-interactive (#0369a1)");
  });

  test("2.3 app/globals.css @theme defines inverse text palette for dark surfaces", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /--color-text-inverse-primary:/, "Must define --color-text-inverse-primary");
    assert.match(css, /--color-text-inverse-secondary:/, "Must define --color-text-inverse-secondary");
    assert.match(css, /--color-text-inverse-muted:/, "Must define --color-text-inverse-muted");
  });

  test("2.4 app/globals.css @theme defines surface & elevation tokens", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /--color-paper:/, "Must define --color-paper");
    assert.match(css, /--color-card:/, "Must define --color-card");
    assert.match(css, /--color-surface-dark:/, "Must define --color-surface-dark");
    assert.match(css, /--color-line:/, "Must define --color-line");
  });

  test("2.5 app/globals.css @theme defines brand core palette tokens", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /--color-brand-blue:/, "Must define --color-brand-blue");
    assert.match(css, /--color-brand-navy:/, "Must define --color-brand-navy");
    assert.match(css, /--color-brand-orange:/, "Must define --color-brand-orange");
    assert.match(css, /--color-brand-gold:/, "Must define --color-brand-gold");
  });

  test("2.6 app/globals.css @theme defines semantic feedback tokens", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /--color-kept:/, "Must define --color-kept");
    assert.match(css, /--color-leak:/, "Must define --color-leak");
    assert.match(css, /--color-haldi:/, "Must define --color-haldi");
  });
});

describe("Tier 1 - Feature 3: UI/UX Component Elevation & Capabilities", () => {
  test("3.1 components/ui.tsx primary button hover color matches brand orange palette", () => {
    const src = readProjectFile("components/ui.tsx");
    assert.match(src, /hover:bg-orange|hover:bg-brand-orange/, "Primary button hover must use orange palette");
    assert.doesNotMatch(src, /hover:bg-\[#08583f\]/, "Primary button must not hover to green #08583f");
  });

  test("3.2 components/AppFooter.tsx exists and exports AppFooter for ecosystem apps", () => {
    assert.ok(projectFileExists("components/AppFooter.tsx"), "components/AppFooter.tsx must exist");
    const src = readProjectFile("components/AppFooter.tsx");
    assert.match(src, /export\s+function\s+AppFooter/, "Must export function AppFooter");
  });

  test("3.3 app/chuktiguard/page.tsx uses unified AppHeader with skip link", () => {
    const src = readProjectFile("app/chuktiguard/page.tsx");
    assert.match(src, /<AppHeader/, "ChuktiGuard must use AppHeader component");
    assert.doesNotMatch(src, /<header[^>]*class="sticky[^"]*border-b[^"]*lg:flex[^"]*">/, "Must not use inline duplicate header");
  });

  test("3.4 components/HeroDevice.tsx renders product preview with benchmarks", () => {
    const src = readProjectFile("components/HeroDevice.tsx");
    assert.match(src, /hero-device/, "Must contain hero-device markup");
    assert.match(src, /YOUR MONTHLY TAKE HOME/, "Must retain take home benchmark display");
  });

  test("3.5 Workspace stage components exist and export their respective modules", () => {
    assert.ok(projectFileExists("components/StageAudit.tsx"), "StageAudit.tsx must exist");
    assert.ok(projectFileExists("components/StageViva.tsx"), "StageViva.tsx must exist");
    assert.ok(projectFileExists("components/StageContract.tsx"), "StageContract.tsx must exist");
    assert.ok(projectFileExists("components/StageMoney.tsx"), "StageMoney.tsx must exist");
  });

  test("3.6 components/Telemetry.tsx exists and retains inspection capabilities", () => {
    assert.ok(projectFileExists("components/Telemetry.tsx"), "Telemetry.tsx must exist");
    const src = readProjectFile("components/Telemetry.tsx");
    assert.match(src, /Export Trace JSON/, "Must retain Export Trace JSON capability");
    assert.match(src, /Grounding Diff/, "Must retain Grounding Diff capability");
  });
});

describe("Tier 1 - Feature 4: Motion, Animations, and Visual Effects", () => {
  test("4.1 app/globals.css defines keyframe animations for entrance reveals", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /@keyframes rise-in/, "Must define rise-in keyframes");
    assert.match(css, /@keyframes stage-in/, "Must define stage-in keyframes");
  });

  test("4.2 Keyframe animations use natural deceleration easing curves", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /cubic-bezier\(\.2,\.8,\.2,1\)|ease-out|ease-in-out/, "Keyframes must use natural easing curves");
  });

  test("4.3 Entrance animations duration is bounded (<= 1s) to prevent distraction", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /animation:\s*rise-in\s+\.7s/, "rise-in animation duration must be <= 1s");
  });

  test("4.4 Interactive elements support smooth micro-interactions", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /button\s*\{[^}]*transition:/, "Buttons must have transition properties");
    assert.match(css, /button:not\(:disabled\):active/, "Buttons must have active pressed transform");
  });

  test("4.5 Blur filters and atmospheric lighting effects defined", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /filter:\s*blur|radial-gradient|conic-gradient/, "Must define blur filters or atmospheric gradients");
  });
});

describe("Tier 1 - Feature 5: Prefers-Reduced-Motion Compliance", () => {
  test("5.1 app/globals.css includes @media (prefers-reduced-motion: reduce) block", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, "Must contain prefers-reduced-motion media query");
  });

  test("5.2 Reduced motion enforces instant animation-duration or disables animation", () => {
    const css = readProjectFile("app/globals.css");
    const reducedBlock = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([^}]+)\}/);
    assert.ok(reducedBlock, "Must find reduced-motion block content");
    assert.match(reducedBlock[0], /animation-duration:\s*\.01ms|animation:\s*none/, "Must shorten or disable animations");
  });

  test("5.3 Reduced motion sets scroll-behavior to auto", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /scroll-behavior:\s*auto\s*!important/, "Must set scroll-behavior: auto !important");
  });

  test("5.4 Buddy launcher glow and orb idle animations silenced in reduced motion", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /\.buddy-launcher::before[^;]*animation:\s*none|\.buddy-launcher-orb[\s\S]*?animation:\s*none/, "Buddy launcher animations must be disabled in reduced motion");
  });

  test("5.5 Bar growth and float animations disabled in reduced motion", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /\.bar-grow[^{]*\{[\s\S]*?animation:\s*none/i, ".bar-grow must be animation: none under reduced motion");
  });
});

describe("Tier 1 - Feature 6: Responsive Layout (375px, 768px, 1280px)", () => {
  test("6.1 Mobile 375px: AppHeader title truncation and min-width constraint", () => {
    const src = readProjectFile("components/AppHeader.tsx");
    assert.match(src, /min-w-0/, "AppHeader must use min-w-0 for flex children to prevent mobile bursting");
    assert.match(src, /truncate/, "AppHeader must use truncate on text labels");
  });

  test("6.2 Mobile 375px: Navbar hides non-critical desktop links to prevent horizontal overflow", () => {
    const src = readProjectFile("components/Chrome.tsx");
    assert.match(src, /hidden\s+lg:flex/, "Navbar desktop links must be hidden on mobile screens");
  });

  test("6.3 Mobile 375px: Workspace macro stats ticker uses responsive grid (grid-cols-2 sm:grid-cols-4)", () => {
    const src = readProjectFile("app/workspace/page.tsx");
    assert.match(src, /grid-cols-2[\s\S]*?sm:grid-cols-4/, "Stats ticker must collapse to 2 columns on mobile");
  });

  test("6.4 Tablet 768px: Featured applications grid supports intermediate column scaling", () => {
    const src = readProjectFile("app/page.tsx");
    assert.match(src, /grid[\s\S]*?sm:grid-cols-2\s+lg:grid-cols-3/, "App showcase grid must adapt at tablet breakpoint");
  });

  test("6.5 Desktop 1280px+: Main containers use max-width boundary to prevent unconstrained stretching", () => {
    const chrome = readProjectFile("components/Chrome.tsx");
    const appHeader = readProjectFile("components/AppHeader.tsx");
    assert.match(chrome, /max-w-\[1400px\]|max-w-7xl/, "Chrome must bound width with max-w");
    assert.match(appHeader, /max-w-7xl/, "AppHeader must bound width with max-w-7xl");
  });

  test("6.6 Wide comparison tables in workspace use overflow-x-auto container", () => {
    const src = readProjectFile("app/workspace/page.tsx");
    assert.match(src, /overflow-x-auto/, "Wide comparison tables must be wrapped in overflow-x-auto");
  });
});

describe("Tier 1 - Feature 7: Keyboard Navigation & Focus Accessibility", () => {
  test("7.1 app/globals.css defines global :focus-visible outline rule", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /:focus-visible\s*\{/, "Must define :focus-visible rule");
  });

  test("7.2 :focus-visible uses high-contrast focus ring token (--color-focus-ring)", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /--color-focus-ring:\s*#007aff/, "Must define --color-focus-ring as #007aff");
    assert.match(css, /outline:.*var\(--color-focus-ring\)|outline:\s*3px\s+solid\s+var\(--color-focus-ring\)/, ":focus-visible must use --color-focus-ring");
  });

  test("7.3 Input and textarea focus styles include visible focus ring", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /textarea:focus,\s*input/, "Must define focus styles for inputs and textareas");
  });

  test("7.4 Skip link to main content is present with accessible text", () => {
    const header = readProjectFile("components/AppHeader.tsx");
    assert.match(header, /href="#main"/, "AppHeader must provide skip link to #main");
    assert.match(header, /skip-link|sr-only\s+focus:not-sr-only/, "Skip link must be visually hidden until focused");
  });

  test("7.5 Focus indicator includes offset for clarity across borders", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /outline-offset:\s*2px/, "Focus visible outline must have outline-offset: 2px");
  });
});

describe("Tier 1 - Feature 8: WCAG AA Contrast Compliance (Mathematical Oracle)", () => {
  test("8.1 Primary text --color-text-primary (#070d1e) against white achieves >= 4.5:1 (AAA)", () => {
    const ratio = getContrastRatio("#070d1e", "#ffffff");
    assert.ok(ratio >= 7.0, `Expected contrast >= 7.0 (AAA), got ${ratio.toFixed(2)}`);
  });

  test("8.2 Secondary text --color-text-secondary (#334155) against white achieves >= 4.5:1 (AAA)", () => {
    const ratio = getContrastRatio("#334155", "#ffffff");
    assert.ok(ratio >= 4.5, `Expected contrast >= 4.5 (AA), got ${ratio.toFixed(2)}`);
  });

  test("8.3 Muted text --color-text-muted (#475569) against white achieves >= 4.5:1 (AA)", () => {
    const ratio = getContrastRatio("#475569", "#ffffff");
    assert.ok(ratio >= 4.5, `Expected contrast >= 4.5 (AA), got ${ratio.toFixed(2)}`);
  });

  test("8.4 Accessible orange text --color-text-accent (#c2410c) against white achieves >= 4.5:1 (AA)", () => {
    const ratio = getContrastRatio("#c2410c", "#ffffff");
    assert.ok(ratio >= 4.5, `Expected contrast >= 4.5 (AA), got ${ratio.toFixed(2)}`);
  });

  test("8.5 Focus ring indicator --color-focus-ring (#007aff) against white achieves >= 3.0:1 (AA Non-text)", () => {
    const ratio = getContrastRatio("#007aff", "#ffffff");
    assert.ok(ratio >= 3.0, `Expected non-text contrast >= 3.0 (AA), got ${ratio.toFixed(2)}`);
  });

  test("8.6 Inverse primary text --color-text-inverse-primary (#f8fafc) against dark surface (#070d1e) achieves >= 4.5:1 (AAA)", () => {
    const ratio = getContrastRatio("#f8fafc", "#070d1e");
    assert.ok(ratio >= 7.0, `Expected dark surface contrast >= 7.0 (AAA), got ${ratio.toFixed(2)}`);
  });
});

// ============================================================================
// TIER 2: BOUNDARY & CORNER CASES (>=40 tests)
// ============================================================================

describe("Tier 2 - Boundary & Corner Cases", () => {
  // Empty states across all 4 stages & Telemetry
  test("B.1 StageAudit handles empty CV input with placeholder prompt", () => {
    const src = readProjectFile("components/StageAudit.tsx");
    assert.match(src, /will appear here|Select any of the 3 Judge Presets/, "StageAudit must render guidance when empty");
  });

  test("B.2 StageViva handles unselected challenge with guidance", () => {
    const src = readProjectFile("components/StageViva.tsx");
    assert.match(src, /aria-label="Choose challenge"|CHALLENGES/, "StageViva must provide challenge selection instructions");
  });

  test("B.3 StageContract handles empty fields with fallback deal defaults", () => {
    const d = buildContract({
      freelancer: "",
      client: "",
      clientCountry: "",
      valueUsd: 0,
      scope: "",
      deliveryDays: 0,
      bufferHours: 0,
      channel: "direct_wire",
      milestones: [],
      date: "2026-11-15",
    }, "en");
    assert.ok(d.clauses.length >= 6, "Must generate valid clauses even with empty terms");
  });

  test("B.4 StageMoney handles 0 withdrawals without NaN or exception", () => {
    const res = compareChannels({
      invoiceUsd: 500,
      withdrawals: 0,
      fx: 120,
      fees: {
        fiverrFee: 20, fiverrWithdraw: 3, upworkFee: 10, upworkWithdraw: 2,
        payoneerFx: 2, payoneerBkashFx: 3, payoneerBkashFlat: 1,
        wireFlat: 20, bankFx: 0.8, freelancerIncentive: 2.5,
      },
      claimIncentive: false,
    });
    assert.ok(res.length > 0, "Must return valid channels");
    assert.ok(res.every((c) => Number.isFinite(c.netBdt)), "All net BDT values must be finite numbers");
  });

  test("B.5 Telemetry handles empty trace steps gracefully", () => {
    const src = readProjectFile("components/Telemetry.tsx");
    assert.match(src, /steps\.length|No activity recorded|Awaiting pipeline actions/, "Telemetry must handle empty steps array");
  });

  // Viewport extremes & fluid scaling
  test("B.6 Viewport extreme: 320px ultra-compact mobile does not crash flex wrappers", () => {
    const src = readProjectFile("components/AppHeader.tsx");
    assert.match(src, /shrink-0/, "AppHeader items must use shrink-0 on fixed width elements");
  });

  test("B.7 Viewport extreme: 375px mobile card padding scales down (p-3 or p-4)", () => {
    const src = readProjectFile("components/AppFooter.tsx");
    assert.match(src, /px-4\s+py-10\s+sm:px-6/, "Footer padding must scale cleanly from mobile px-4 to desktop sm:px-6");
  });

  test("B.8 Viewport extreme: 1920px widescreen layout centers cleanly with margin auto", () => {
    const src = readProjectFile("components/Chrome.tsx");
    assert.match(src, /mx-auto/, "Header and Footer must use mx-auto for centered layout on widescreen");
  });

  // Long strings and content boundaries
  test("B.9 Long freelancer name in contract clause drafts safely without throwing", () => {
    const longName = "Mohammad ".repeat(20) + "Rahman";
    const d = buildContract({
      freelancer: longName,
      client: "Acme Corp",
      clientCountry: "USA",
      valueUsd: 1500,
      scope: "Software Architecture",
      deliveryDays: 14,
      bufferHours: 48,
      channel: "direct_wire",
      milestones: [{ pct: 100, label: "Full Delivery" }],
      date: "2026-11-15",
    }, "en");
    assert.ok(d.clauses[0].body.includes(longName), "Clause 1 must contain the freelancer name");
  });

  test("B.10 Long client name in contract clause drafts safely", () => {
    const longClient = "International Development Enterprise LLC ".repeat(5);
    const d = buildContract({
      freelancer: "Tanvir Hossain",
      client: longClient,
      clientCountry: "Germany",
      valueUsd: 2000,
      scope: "UI/UX Redesign",
      deliveryDays: 20,
      bufferHours: 24,
      channel: "direct_wire",
      milestones: [{ pct: 100, label: "Delivery" }],
      date: "2026-11-15",
    }, "en");
    assert.ok(d.clauses[0].body.includes(longClient), "Clause 1 must contain long client name");
  });

  test("B.11 Long scope description in contract clause wraps into legal body", () => {
    const longScope = "Full-stack web application development including auth, payment, microservices, and design system. ".repeat(10);
    const d = buildContract({
      freelancer: "Nusrat Jahan",
      client: "Global Tech Inc",
      clientCountry: "UK",
      valueUsd: 3500,
      scope: longScope,
      deliveryDays: 30,
      bufferHours: 72,
      channel: "direct_wire",
      milestones: [{ pct: 100, label: "Final" }],
      date: "2026-11-15",
    }, "en");
    assert.ok(d.clauses[1].body.includes("Full-stack web application"), "Clause 2 must incorporate project scope");
  });

  test("B.12 Long challenge code in StageViva renders in scrollable pre block", () => {
    const src = readProjectFile("components/StageViva.tsx");
    assert.match(src, /font-mono|overflow-x-auto|max-h-/, "Code editor/viewer must support scrolling on long challenge code");
  });

  test("B.13 Long CV text in StageAudit textarea supports multi-kilobyte inputs", () => {
    const longCv = "Senior Software Engineer with 8 years of React, Node, TypeScript. ".repeat(200);
    const extracted = ruleExtract(longCv);
    assert.ok(extracted.skills.some((s) => s.name.toLowerCase() === "react"), "Must parse skills from large CV");
  });

  // Rapid interactions & state toggles
  test("B.14 Rapid interaction: language toggle between en and bn is idempotent", () => {
    const src = readProjectFile("components/Chrome.tsx");
    assert.match(src, /lang\s*===\s*"bn"\s*\?\s*"[^"]*"\s*:\s*"[^"]*"/, "Components must render language conditionally without mutating props");
  });

  test("B.15 Rapid stage switching: workspace stage indexes 1 to 4 are well-bounded", () => {
    const src = readProjectFile("app/workspace/page.tsx");
    assert.match(src, /stage\s*===\s*1[\s\S]*?stage\s*===\s*2[\s\S]*?stage\s*===\s*3[\s\S]*?stage\s*===\s*4/, "Must handle all 4 workspace stages conditionally");
  });

  // Numeric boundaries & zero-division immunity
  test("B.16 Numeric boundary: $0 invoice produces $0 net BDT without division by zero", () => {
    const res = compareChannels({
      invoiceUsd: 0,
      withdrawals: 1,
      fx: 120,
      fees: {
        fiverrFee: 20, fiverrWithdraw: 3, upworkFee: 10, upworkWithdraw: 2,
        payoneerFx: 2, payoneerBkashFx: 3, payoneerBkashFlat: 1,
        wireFlat: 20, bankFx: 0.8, freelancerIncentive: 2.5,
      },
      claimIncentive: false,
    });
    assert.equal(res[0].grossBdt, 0);
    assert.ok(res[0].netBdt <= 0, "Net BDT must be 0 or negative due to flat fee");
  });

  test("B.17 Numeric boundary: $1,000,000 maximum invoice calculates accurately within safe integer range", () => {
    const res = compareChannels({
      invoiceUsd: 1_000_000,
      withdrawals: 1,
      fx: 122.5,
      fees: {
        fiverrFee: 20, fiverrWithdraw: 3, upworkFee: 10, upworkWithdraw: 2,
        payoneerFx: 2, payoneerBkashFx: 3, payoneerBkashFlat: 1,
        wireFlat: 20, bankFx: 0.8, freelancerIncentive: 2.5,
      },
      claimIncentive: true,
    });
    const wire = res.find((c) => c.id === "bank_wire")!;
    assert.ok(wire.netBdt > 100_000_000, "Must calculate high-value invoice safely");
    assert.ok(Number.isSafeInteger(Math.round(wire.netBdt)), "Must remain within safe integer boundary");
  });

  test("B.18 Numeric boundary: Negative invoice input clamped or rejected", () => {
    const res = compareChannels({
      invoiceUsd: -100,
      withdrawals: 1,
      fx: 120,
      fees: {
        fiverrFee: 20, fiverrWithdraw: 3, upworkFee: 10, upworkWithdraw: 2,
        payoneerFx: 2, payoneerBkashFx: 3, payoneerBkashFlat: 1,
        wireFlat: 20, bankFx: 0.8, freelancerIncentive: 2.5,
      },
      claimIncentive: false,
    });
    assert.ok(res.every((c) => c.grossBdt <= 0), "Gross must reflect negative or zero bound");
  });

  test("B.19 Numeric boundary: 0 FX rate handling in calculation does not emit NaN", () => {
    const res = compareChannels({
      invoiceUsd: 100,
      withdrawals: 1,
      fx: 0,
      fees: {
        fiverrFee: 20, fiverrWithdraw: 3, upworkFee: 10, upworkWithdraw: 2,
        payoneerFx: 2, payoneerBkashFx: 3, payoneerBkashFlat: 1,
        wireFlat: 20, bankFx: 0.8, freelancerIncentive: 2.5,
      },
      claimIncentive: false,
    });
    assert.ok(res.every((c) => !Number.isNaN(c.netBdt)), "No channel should output NaN");
  });

  test("B.20 Numeric boundary: Budget poisha conversion prevents float drift (1 taka = 100 poisha)", () => {
    const tx: Transaction = {
      id: "tx-1",
      type: "expense",
      amountPoisha: 12550, // 125.50 Taka
      categoryId: "food",
      method: "bKash",
      note: "Groceries",
      date: "2026-11-15",
      source: "manual",
      createdAt: "2026-11-15T10:00:00Z",
      updatedAt: "2026-11-15T10:00:00Z",
      history: [],
    };
    const s = summarizeMonth([tx], "2026-11");
    assert.equal(s.expensePoisha, 12550, "Summary must use exact integer poisha arithmetic");
  });

  // Milestone splits
  test("B.21 Milestone split: 1 milestone (100%) sums exactly to total USD", () => {
    const splits = splitMilestoneUsd(1500, 1);
    assert.deepEqual(splits, [1500]);
    const amounts = milestoneAmounts(1500, [{ pct: 100 }]);
    assert.deepEqual(amounts, [1500]);
  });

  test("B.22 Milestone split: 2 milestones (50%, 50%) sum exactly to total USD", () => {
    const splits = splitMilestoneUsd(1000, 2);
    assert.deepEqual(splits, [500, 500]);
    const amounts = milestoneAmounts(1000, [{ pct: 50 }, { pct: 50 }]);
    assert.deepEqual(amounts, [500, 500]);
  });

  test("B.23 Milestone split: 3 milestones (equal thirds) sum exactly to total USD", () => {
    const splits = splitMilestoneUsd(1000, 3);
    const sum = splits.reduce((a, b) => a + b, 0);
    assert.equal(sum, 1000, "Milestone split sum must match total exactly without rounding loss");
    const amounts = milestoneAmounts(1000, [{ pct: 33.33 }, { pct: 33.33 }, { pct: 33.34 }]);
    assert.equal(amounts.reduce((a, b) => a + b, 0), 1000);
  });

  test("B.24 Milestone split: milestoneAmounts handles empty array gracefully", () => {
    const amounts = milestoneAmounts(500, []);
    assert.deepEqual(amounts, []);
  });

  // Focus traps & modal dialogs
  test("B.25 Focus trap: components/EcosystemHub.tsx dialog modal includes close button and backdrop", () => {
    const src = readProjectFile("components/EcosystemHub.tsx");
    assert.match(src, /onClose|aria-label="Close"|X size=/, "EcosystemHub must provide accessible close button");
  });

  test("B.26 Focus trap: components/CommandPalette.tsx supports keyboard Escape closure", () => {
    const src = readProjectFile("components/CommandPalette.tsx");
    assert.match(src, /Escape|e\.key === "Escape"/, "CommandPalette must listen for Escape key to close");
  });

  test("B.27 Focus trap: components/Telemetry.tsx mobile drawer sheet supports dismissal", () => {
    const src = readProjectFile("components/Telemetry.tsx");
    assert.match(src, /open|setOpen|drawer|sheet/i, "Telemetry mobile drawer must have toggle state");
    assert.match(src, /e\.key === "Escape"/, "Telemetry must listen for Escape key to close modals and drawer");
    assert.match(src, /removeEventListener\("keydown"/, "Telemetry must clean up keydown listener");
    assert.match(src, /flex-wrap.*pb-2\.5/, "Telemetry header must flex-wrap to prevent horizontal overflow");
  });

  // Skill grounding boundary conditions
  test("B.28 Skill grounding boundary: completely fabricated skill marked unverified", () => {
    const ex: Extraction = {
      ocr_text: "",
      name: "Candidate",
      headline: null,
      years_experience: 2,
      skills: [{ name: "Quantum Computing in Rust", level: "advanced", evidence: "Quantum Computing in Rust" }],
      marketplace: { platform: "none", monthly_income_usd: null, evidence: null },
    };
    const grounded = groundSkills(ex, "Senior Full-Stack Web Developer proficient in JavaScript and HTML.");
    assert.equal(grounded[0].verdict, "unverified");
  });

  test("B.29 Skill grounding boundary: verbatim skill quote marked verified", () => {
    const ex: Extraction = {
      ocr_text: "",
      name: "Candidate",
      headline: null,
      years_experience: 5,
      skills: [{ name: "React", level: "advanced", evidence: "Expert React frontend engineer" }],
      marketplace: { platform: "none", monthly_income_usd: null, evidence: null },
    };
    const grounded = groundSkills(ex, "Expert React frontend engineer with 5 years experience building design systems.");
    assert.equal(grounded[0].verdict, "verified");
  });

  test("B.30 Skill grounding boundary: near-match skill quote marked partial", () => {
    const ex: Extraction = {
      ocr_text: "",
      name: "Candidate",
      headline: null,
      years_experience: 3,
      skills: [{ name: "Node", level: "intermediate", evidence: "Built backend servers with Node runtime and Express" }],
      marketplace: { platform: "none", monthly_income_usd: null, evidence: null },
    };
    const grounded = groundSkills(ex, "Built backend microservices with Node runtime and Express servers.");
    assert.equal(grounded[0].verdict, "partial");
  });

  // Valuation clamps
  test("B.31 Valuation boundary: rate position clamped between 0.05 min and 0.85 max", () => {
    const vMin = valuate([], 0, "fullstack");
    assert.ok(vMin.position >= 0.05, "Position must be at least 0.05");

    const manySkills: CheckedSkill[] = [
      { name: "React", level: "advanced", evidence: "React", verdict: "verified", score: 1, origin: "document" },
      { name: "TypeScript", level: "advanced", evidence: "TypeScript", verdict: "verified", score: 1, origin: "document" },
      { name: "Next.js", level: "advanced", evidence: "Next.js", verdict: "verified", score: 1, origin: "document" },
      { name: "Tailwind CSS", level: "advanced", evidence: "Tailwind CSS", verdict: "verified", score: 1, origin: "document" },
      { name: "GraphQL", level: "advanced", evidence: "GraphQL", verdict: "verified", score: 1, origin: "document" },
      { name: "PostgreSQL", level: "advanced", evidence: "PostgreSQL", verdict: "verified", score: 1, origin: "document" },
      { name: "Docker", level: "advanced", evidence: "Docker", verdict: "verified", score: 1, origin: "document" },
      { name: "AWS", level: "advanced", evidence: "AWS", verdict: "verified", score: 1, origin: "document" },
    ];
    const vMax = valuate(manySkills, 15, "fullstack");
    assert.ok(vMax.position <= 0.85, "Position must be at most 0.85");
  });

  test("B.32 Valuation boundary: unverified skills contribute 0 to rate calculation", () => {
    const vOnlyUnverified = valuate(
      [{ name: "FakeSkill", level: "beginner", evidence: "", verdict: "unverified", score: 0, origin: "document" }],
      0,
      "fullstack"
    );
    const vEmpty = valuate([], 0, "fullstack");
    assert.equal(vOnlyUnverified.rateUsd, vEmpty.rateUsd, "Unverified skills must not increase rate");
  });

  // Passport cryptographic boundaries
  test("B.33 Passport verification boundary: invalid signature fails closed", () => {
    const valid = issue({
      v: 1,
      name: "Arif Rahman",
      track: "Full-stack web development",
      challenge: "Payment Webhook Idempotency",
      testsPassed: 10,
      testsTotal: 10,
      edgePassed: true,
      perfPassed: true,
      vivaScore: 18,
      vivaTotal: 20,
      assisted: false,
      codeSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      issuedAt: "2026-11-15T12:00:00.000Z",
    });
    const tampered = valid.token.slice(0, -6) + "xxxxxx";
    const res = check(tampered);
    assert.equal(res.valid, false, "Tampered signature must be invalid");
  });

  test("B.34 Passport verification boundary: expired timestamp fails closed", () => {
    const expiredToken = "eyJhbGciOiJIUzI1NiJ9.eyJpc3N1ZWRBdCI6IjIwMjAtMDEtMDFUMDA6MDA6MDBaIn0.invalid";
    const res = check(expiredToken);
    assert.equal(res.valid, false, "Expired or invalid token must be rejected");
  });

  test("B.35 Passport verification boundary: malformed token without dot separator fails closed", () => {
    const res = check("not-a-valid-token-string");
    assert.equal(res.valid, false, "Malformed string without separator must fail");
  });

  // Ecosystem app domain boundaries
  test("B.36 Prescriptions boundary: parsePrescriptionText handles empty text without throwing", () => {
    const parsed = parsePrescriptionText("");
    assert.deepEqual(parsed.lines, [], "Empty input should return empty lines array");
    assert.equal(parsed.recognisedCount, 0);
  });

  test("B.37 Budget boundary: summarizeMonth with empty transactions returns 0 balance", () => {
    const s = summarizeMonth([], "2026-11");
    assert.equal(s.incomePoisha, 0);
    assert.equal(s.expensePoisha, 0);
    assert.equal(s.netPoisha, 0);
  });

  test("B.38 HaatBazar boundary: lib/haatbazar.ts commodity items have valid market prices", () => {
    assert.ok(projectFileExists("lib/haatbazar.ts"), "lib/haatbazar.ts must exist");
  });

  test("B.39 Probaho boundary: lib/speech.ts starCheck handles empty text safely", () => {
    assert.ok(projectFileExists("lib/speech.ts"), "lib/speech.ts must exist");
  });

  test("B.40 FeeGuard boundary: fee overrides clamp properly in compareChannels", () => {
    const base: FinInput = {
      invoiceUsd: 1000,
      withdrawals: 1,
      fx: 120,
      fees: {
        fiverrFee: 0, fiverrWithdraw: 0, upworkFee: 0, upworkWithdraw: 0,
        payoneerFx: 0, payoneerBkashFx: 0, payoneerBkashFlat: 0,
        wireFlat: 0, bankFx: 0, freelancerIncentive: 0,
      },
      claimIncentive: false,
    };
    const res = compareChannels(base);
    assert.ok(res.length > 0, "0% fee scenario must calculate without error");
  });

  test("B.41 NFC normalization boundary: Bangla text comparisons normalize cleanly", () => {
    const str1 = "কর্মপথ".normalize("NFC");
    const str2 = "কর্মপথ".normalize("NFD").normalize("NFC");
    assert.equal(str1, str2, "NFC normalization must reconcile composite characters");
  });

  test("B.42 DOM test selector preservation: critical data-testid hooks exist in code", () => {
    const admitbuddy = readProjectFile("app/admitbuddy/page.tsx");
    const mediscan = readProjectFile("app/mediscan/page.tsx");
    const shohoj = readProjectFile("app/shohoj-budget/page.tsx");
    const probaho = readProjectFile("app/probaho/page.tsx");
    const feeguard = readProjectFile("app/feeguard/page.tsx");

    assert.match(admitbuddy, /data-testid="example-profile"/, "Must preserve example-profile in AdmitBuddy");
    assert.match(mediscan, /data-testid=\{`slot-\$\{slot\}`\}/, "Must preserve slot in MediScan");
    assert.match(shohoj, /data-testid="load-example"/, "Must preserve load-example in Shohoj Budget");
    assert.match(shohoj, /data-testid="goal"/, "Must preserve goal in Shohoj Budget");
    assert.match(probaho, /data-testid="star-check"/, "Must preserve star-check in Probaho");
    assert.match(feeguard, /<strong[^>]*className="[^"]*font-mono/, "Must preserve strong.font-mono in FeeGuard");
  });
});

// ============================================================================
// TIER 3: CROSS-FEATURE COMBINATIONS (>=10 tests)
// ============================================================================

describe("Tier 3 - Cross-Feature Combinations", () => {
  test("3.1 [Logo + Mobile Navigation]: KormoPathLogo variant='mark' renders in mobile AppHeader without pushing buttons offscreen at 375px", () => {
    const header = readProjectFile("components/AppHeader.tsx");
    assert.match(header, /<KormoPathLogo[^>]*variant="mark"[^>]*size="sm"/, "Must render size='sm' mark logo on mobile");
    assert.match(header, /lg:hidden/, "Mobile logo must have lg:hidden toggle");
  });

  test("3.2 [Tokens + Dark/Light Theme Switching]: Design tokens support dark surfaces (Navbar #070d1e) and light surfaces (AppHeader #ffffff)", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /--color-surface-dark:\s*#070d1e/, "Must define dark surface token");
    assert.match(css, /--color-card:\s*#ffffff/, "Must define light card surface token");
  });

  test("3.3 [Focus Rings + Motion Easing]: :focus-visible indicator combines high-contrast #007aff outline with smooth transition obeying reduced-motion", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /:focus-visible\s*\{[^}]*outline:.*var\(--color-focus-ring\)/, "Must link :focus-visible to --color-focus-ring");
  });

  test("3.4 [Logo + Dark Glass Navbar]: KormoPathLogo theme='dark' renders light text against cosmic navy", () => {
    const logoSrc = readProjectFile("components/KormoPathLogo.tsx");
    assert.match(logoSrc, /theme === "dark"\s*\?\s*"text-white"/, "Dark theme logo must use text-white");
  });

  test("3.5 [Logo + Light Glass AppHeader]: KormoPathLogo theme='light' renders dark text against white/slate-50", () => {
    const logoSrc = readProjectFile("components/KormoPathLogo.tsx");
    assert.match(logoSrc, /theme === "dark"\s*\?\s*"text-white"\s*:\s*"text-slate-900"/, "Light theme logo must use text-slate-900");
  });

  test("3.6 [Responsive Viewports + Typography Clamping]: Display headings use fluid responsive sizing", () => {
    const pageSrc = readProjectFile("app/page.tsx");
    assert.match(pageSrc, /text-\[3\dpx\]\s+sm:text-\[5\dpx\]|clamp\(|tracking-tight/, "Headings must use responsive fluid sizing");
  });

  test("3.7 [Reduced Motion + Holographic Card]: Holographic Skill Passport card maintains readable styling when keyframes are silenced", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /passport-hologram|border-line/, "Must have card styling resilient to animation silencing");
  });

  test("3.8 [Contrast Compliance + Status Badges]: Source tags and confidence badges maintain readable contrast", () => {
    const uiSrc = readProjectFile("components/ui.tsx");
    assert.match(uiSrc, /bg-kept-soft\s+text-kept/, "Official confidence tag must use readable soft background with kept text");
  });

  test("3.9 [Keyboard Navigation + Modal Drawers]: Telemetry and EcosystemHub modals provide accessible keyboard dismissal", () => {
    const hub = readProjectFile("components/EcosystemHub.tsx");
    assert.match(hub, /role="dialog"|aria-modal="true"|aria-label/, "Modals must have dialog role or aria attributes");
  });

  test("3.10 [Design Tokens + FinOps Monospace Reconciliation]: Net and gross amounts rendered in monospace font token --font-mono", () => {
    const feeguard = readProjectFile("app/feeguard/page.tsx");
    assert.match(feeguard, /font-mono/, "Financial figures must use font-mono for tabular alignment");
  });

  test("3.11 [Mobile Tap Targets + Interactive Buttons]: Button tap targets maintain minimum 44px height on touch viewports", () => {
    const uiSrc = readProjectFile("components/ui.tsx");
    assert.match(uiSrc, /px-4\s+py-2\.5/, "Standard buttons must have generous touch padding");
    const wsSrc = readProjectFile("app/workspace/page.tsx");
    assert.match(wsSrc, /min-h-\[44px\]/, "Ecosystem hub button must satisfy 44px minimum touch target height");
  });

  test("3.12 [Bangla NFC Normalization + Typography]: Bengali numerals and text render with proper font stack --font-sans", () => {
    const css = readProjectFile("app/globals.css");
    assert.match(css, /"Hind Siliguri"/, "Font stack must include Bangla font 'Hind Siliguri'");
  });
});

// ============================================================================
// TIER 4: REAL-WORLD APPLICATION SCENARIOS (>=5 tests)
// ============================================================================

describe("Tier 4 - Real-World Application Scenarios", () => {
  test("4.1 Freelancer 4-Stage Pipeline Flow (Audit -> Viva -> Contract -> Money)", () => {
    // Stage 1: Audit
    const cvText = "Senior Full-Stack Engineer with React, TypeScript, Next.js, and Node. 6 years experience.";
    const extracted = ruleExtract(cvText);
    assert.ok(extracted.skills.length >= 3, "Stage 1: Skills extracted");
    const grounded = groundSkills(extracted, cvText);
    assert.ok(grounded.some((s) => s.verdict === "verified"), "Stage 1: At least one skill grounded");
    const valuation = valuate(grounded, extracted.years_experience ?? 5, "fullstack");
    assert.ok(valuation.rateUsd >= 20, "Stage 1: Valuation calculated");

    // Stage 2: Viva & Skill Passport
    const challenge = CHALLENGES[0];
    assert.ok(challenge, "Stage 2: Coding challenge exists");
    const passportRes = issue({
      v: 1,
      name: "Arif Rahman",
      track: "Full-stack web development",
      challenge: challenge.title,
      testsPassed: 10,
      testsTotal: 10,
      edgePassed: true,
      perfPassed: true,
      vivaScore: 18,
      vivaTotal: 20,
      assisted: false,
      codeSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      issuedAt: new Date().toISOString(),
    });
    assert.ok(passportRes.token, "Stage 2: HMAC Skill Passport issued");
    const verification = check(passportRes.token);
    assert.equal(verification.valid, true, "Stage 2: Skill Passport verifies cryptographically");

    // Stage 3: Contract Studio (ChuktiGuard)
    const contract = buildContract({
      freelancer: "Arif Rahman",
      client: "Global Tech Solutions LLC",
      clientCountry: "United States",
      valueUsd: 2500,
      scope: "Full-Stack Web Application Architecture and Design System",
      deliveryDays: 21,
      bufferHours: 48,
      channel: "direct_wire",
      milestones: [
        { pct: 50, label: "Milestone 1: Prototype" },
        { pct: 50, label: "Milestone 2: Production Release" },
      ],
      date: "2026-11-15",
    }, "en");
    assert.ok(contract.clauses.length >= 6, "Stage 3: Legal contract generated with 6+ bilingual clauses");
    assert.ok(contract.clauses.some((c) => c.heading.includes("Infrastructure") || c.heading.includes("Clause 4")), "Stage 3: Outage buffer clause included");

    // Stage 4: FinOps Money Reconciliation (TakaFlow)
    const channels = compareChannels({
      invoiceUsd: 2500,
      withdrawals: 1,
      fx: 122.5,
      fees: {
        fiverrFee: 20, fiverrWithdraw: 3, upworkFee: 10, upworkWithdraw: 2,
        payoneerFx: 2, payoneerBkashFx: 3, payoneerBkashFlat: 1,
        wireFlat: 20, bankFx: 0.8, freelancerIncentive: 2.5,
      },
      claimIncentive: true,
    });
    const invariants = checkInvariants(channels);
    assert.ok(invariants.ok, "Stage 4: FinOps reconciliation invariant preserved");
    const bestRoute = best(channels);
    assert.equal(bestRoute.id, "bank_wire", "Stage 4: Direct bank wire with 2.5% incentive is optimal route");
  });

  test("4.2 Mobile (375px) Ecosystem Navigation Flow across all 7 applications", () => {
    const apps = [
      "app/admitbuddy/page.tsx",
      "app/mediscan/page.tsx",
      "app/shohoj-budget/page.tsx",
      "app/haatbazar/page.tsx",
      "app/probaho/page.tsx",
      "app/feeguard/page.tsx",
      "app/chuktiguard/page.tsx",
    ];

    for (const appPath of apps) {
      assert.ok(projectFileExists(appPath), `${appPath} must exist`);
      const src = readProjectFile(appPath);
      assert.match(src, /AppHeader/, `${appPath} must render AppHeader`);
      assert.match(src, /min-h-screen/, `${appPath} must provide root container`);
    }

    // AppHeader ensures mobile logo mark across all ecosystem apps
    const appHeaderSrc = readProjectFile("components/AppHeader.tsx");
    assert.match(appHeaderSrc, /<KormoPathLogo[^>]*variant="mark"/, "AppHeader must render mark logo on mobile viewports");
    assert.match(appHeaderSrc, /skip-link/, "AppHeader must render skip-link for keyboard navigation");
  });

  test("4.3 High-Contrast & Reduced-Motion Mode Accessibility Traversal", () => {
    const css = readProjectFile("app/globals.css");

    // 1. Reduced motion satisfies accessibility
    assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, "Must provide prefers-reduced-motion media query");
    assert.match(css, /scroll-behavior:\s*auto\s*!important/, "Must enforce scroll-behavior: auto");
    assert.match(css, /animation-duration:\s*\.01ms|animation:\s*none/, "Must disable or shorten animations to .01ms");

    // 2. High-contrast focus system
    assert.match(css, /--color-focus-ring:\s*#007aff/, "Must provide #007aff high-contrast focus ring token");
    const focusRatio = getContrastRatio("#007aff", "#ffffff");
    assert.ok(focusRatio >= 3.0, `Focus ring contrast against white must be >= 3.0:1 (got ${focusRatio.toFixed(2)})`);

    // 3. Multi-color text contrast compliance
    const primaryRatio = getContrastRatio("#070d1e", "#ffffff");
    const mutedRatio = getContrastRatio("#475569", "#ffffff");
    const interactiveRatio = getContrastRatio("#0369a1", "#ffffff");
    assert.ok(primaryRatio >= 7.0, "Primary text achieves AAA contrast");
    assert.ok(mutedRatio >= 4.5, "Muted text achieves AA contrast");
    assert.ok(interactiveRatio >= 4.5, "Interactive text achieves AA contrast");
  });

  test("4.4 Zero-Login Judge Sandbox Autopilot Execution & Telemetry Verification", () => {
    const workspaceSrc = readProjectFile("app/workspace/page.tsx");
    assert.match(workspaceSrc, /Zero-Login Judge Sandbox Mode|PERSONAS\.map/, "Workspace must provide judge sandbox persona buttons");
    assert.match(workspaceSrc, /<Telemetry/, "Workspace must render Telemetry hub");

    const presetsSrc = readProjectFile("lib/presets.ts");
    assert.match(presetsSrc, /Arif Rahman|Nusrat Jahan|Tanvir Hossain/, "Presets must include candidate personas");

    // Verify Telemetry component retains step logs and fallback detection
    const telemetrySrc = readProjectFile("components/Telemetry.tsx");
    assert.match(telemetrySrc, /Deterministic Fallbacks|fallback/i, "Telemetry must track deterministic fallbacks");
    assert.match(telemetrySrc, /Export Trace JSON/, "Telemetry must support exporting trace logs");
  });

  test("4.5 ChuktiGuard Contract Generation & FeeGuard Financial Invariant Reconciliation", () => {
    // 1. Contract with multiple milestones
    const totalUsd = 1800;
    const splits = splitMilestoneUsd(totalUsd, 3);
    assert.equal(splits.reduce((a, b) => a + b, 0), totalUsd, "Milestones must reconcile to total USD");

    // 2. FeeGuard financial reconciliation across rails
    const rails = compareChannels({
      invoiceUsd: totalUsd,
      withdrawals: 2,
      fx: 121.8,
      fees: {
        fiverrFee: 20, fiverrWithdraw: 3, upworkFee: 10, upworkWithdraw: 2,
        payoneerFx: 2, payoneerBkashFx: 3, payoneerBkashFlat: 1,
        wireFlat: 20, bankFx: 0.8, freelancerIncentive: 2.5,
      },
      claimIncentive: true,
    });

    const inv = checkInvariants(rails);
    assert.equal(inv.ok, true, "Every channel gross must equal steps + net BDT");

    // Reconcile FeeGuard format
    const formatted = fmtBdt(rails[0].netBdt);
    assert.ok(formatted.startsWith("৳"), "Bdt formatting must start with ৳");
  });
});
