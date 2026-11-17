// Buildathon rule: the "Built For Ostad Presents YUNet AIgnite Buildathon 2026" sticker must be
// clearly visible near the top of every page. It was once silently replaced with `return null`;
// these checks make sure that cannot happen again unnoticed.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p: string) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("buildathon sticker renders the required label and links to the event", () => {
  const src = read("components/layout/BuildathonSticker.tsx");
  assert.match(src, /Built For Ostad Presents YUNet AIgnite Buildathon 2026/);
  assert.match(src, /yunet-aignite26\.devpost\.com/);
  assert.doesNotMatch(src, /export function BuildathonSticker\(\)\s*\{\s*return null;?\s*\}/);
});

test("root layout mounts the sticker before page content", () => {
  const layout = read("app/layout.tsx");
  const sticker = layout.indexOf("<BuildathonSticker />");
  assert.ok(sticker > 0, "BuildathonSticker must be rendered in app/layout.tsx");
  assert.ok(sticker < layout.indexOf("{children}"), "sticker must come before page content");
});
