import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEMO_CASES, DEMO_LAWYERS, SIMULATION, emptyDemoState, sanitizeDemoState, dlaoQueue, moveStage, openCase, markActionDone,
  lawyerDesk, lawyerCaseView, chiefStats, severityOf, timeBadge, SEVERITY_ORDER,
} from "../lib/legal/demoData.ts";

const NOW = new Date("2026-11-18T06:00:00Z");

test("legal demo: every applicant is marked fictional and every lawyer as demo", () => {
  assert.ok(DEMO_CASES.every((c) => c.nameBn.includes("কাল্পনিক") && c.nameEn.includes("fictional")));
  assert.ok(DEMO_LAWYERS.every((l) => l.bn.includes("নমুনা") && l.en.includes("demo")));
  assert.equal(new Set(DEMO_CASES.map((c) => c.id)).size, DEMO_CASES.length);
});

test("legal demo: queue puts the most severe first and filters work", () => {
  const q = dlaoQueue(emptyDemoState());
  assert.equal(q.length, DEMO_CASES.length);
  for (let i = 1; i < q.length; i++) assert.ok(SEVERITY_ORDER.indexOf(q[i - 1].severity.level) <= SEVERITY_ORDER.indexOf(q[i].severity.level));
  const em = dlaoQueue(emptyDemoState(), { severity: "emergency" });
  assert.ok(em.every((r) => r.severity.level === "emergency"));
  assert.equal(dlaoQueue(emptyDemoState(), { search: "নীলা" }).length, 1);
  assert.ok(severityOf(DEMO_CASES[0]).level === "emergency", "abuse in the applicant's own words is an emergency");
});

test("legal demo: review time badge follows the stage limit and the stalled lawyer case is over time", () => {
  const review = timeBadge({ ...DEMO_CASES[0], daysInStage: 20 }, "review");
  assert.equal(review.level, "breach");
  assert.equal(timeBadge({ ...DEMO_CASES[0], daysInStage: 1 }, "review").level, "ok");
  const stalled = dlaoQueue(emptyDemoState()).find((r) => r.c.id === "DEMO-05")!;
  assert.equal(stalled.time.level, "breach");
});

test("legal demo: moving a stage and opening an emergency case are both audited", () => {
  let s = moveStage(emptyDemoState(), "DEMO-02", "review", "dlao", NOW);
  assert.equal(s.stages["DEMO-02"], "review");
  assert.equal(s.audit.at(-1)?.kind, "application_accepted");
  s = openCase(s, "DEMO-01", "dlao", NOW);
  assert.equal(s.audit.at(-1)?.kind, "sensitive_case_opened");
  const before = s.audit.length;
  s = moveStage(s, "DEMO-02", "review", "dlao", NOW);
  assert.equal(s.audit.length, before, "no-op moves are not logged");
});

test("legal demo: lawyer tracker grades seeded and marked actions", () => {
  const v = lawyerCaseView(emptyDemoState(), DEMO_CASES.find((c) => c.id === "DEMO-05")!, NOW)!;
  assert.equal(v.summary.done, 2);
  assert.ok(v.summary.overdue > 0);
  const next = v.actions.find((a) => a.state !== "done")!;
  const s = markActionDone(emptyDemoState(), "DEMO-05", next.code, NOW);
  assert.equal(lawyerCaseView(s, DEMO_CASES.find((c) => c.id === "DEMO-05")!, NOW)!.summary.done, 3);
  assert.equal(lawyerDesk(emptyDemoState(), "law-kha", NOW).length, 1);
});

test("legal demo: chief counts reconcile", () => {
  const c = chiefStats(emptyDemoState(), NOW);
  assert.equal(c.open + c.closed, c.total);
  assert.equal(c.byStage.reduce((n, x) => n + x.count, 0), c.total);
  assert.equal(c.bySeverity.reduce((n, x) => n + x.count, 0), c.total);
  assert.ok(c.lawyers.every((l) => l.progressPercent >= 0 && l.progressPercent <= 100));
});

test("legal demo: sanitize drops junk and keeps valid state", () => {
  assert.equal(sanitizeDemoState(null), null);
  let s = moveStage(emptyDemoState(), "DEMO-03", "review", "dlao", NOW);
  s = { ...s, role: "chief", simStep: SIMULATION.length - 1 };
  const back = sanitizeDemoState(JSON.parse(JSON.stringify(s)))!;
  assert.deepEqual(back, s);
  const junk = sanitizeDemoState({ role: "hacker", stages: { "DEMO-01": "nope", "X": "review" }, done: { "DEMO-05": [1, "first_contact"] }, audit: [{ kind: "x" }], simStep: 99 })!;
  assert.equal(junk.role, "dlao");
  assert.deepEqual(junk.stages, {});
  assert.deepEqual(junk.done, { "DEMO-05": ["first_contact"] });
  assert.equal(junk.audit.length, 0);
  assert.equal(junk.simStep, 0);
});
