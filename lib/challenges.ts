// Bug-hunt challenges. Tests run for real in a sandboxed Web Worker in the browser.

export interface ChallengeTest {
  name: string;
  kind: "correctness" | "edge" | "performance";
  code: string; // body run with `fn` (the user's function) and `assert` in scope
  budgetMs?: number;
}

export interface RubricPoint {
  point: string;
  keywords: string[]; // used only by the offline grader
}

export interface VivaQuestion {
  id: string;
  question: string;
  rubric: RubricPoint[];
}

export interface Challenge {
  id: string;
  title: string;
  story: string;
  fnName: string;
  tracks: string[];
  buggy: string;
  reference: string;
  tests: ChallengeTest[];
  viva: VivaQuestion[];
}

export const CHALLENGES: Challenge[] = [
  {
    id: "webhook",
    title: "The double-credited payment",
    story:
      "A client's checkout uses a payment webhook. Support says some customers were credited twice and one balance shows ৳1,998.99 instead of ৳1,999. Fix applyWebhook so every test passes.",
    fnName: "applyWebhook",
    tracks: ["fullstack", "mobile"],
    buggy: `// ledger = { balanceCents: number, seen: Set<string> }
// event  = { id: string, type: string, amount: number | string }
function applyWebhook(ledger, event) {
  if (event.type === "payment.succeeded") {
    ledger.balanceCents += event.amount * 100;
  }
  return ledger;
}`,
    reference: `function applyWebhook(ledger, event) {
  if (ledger.seen.has(event.id)) return ledger;          // idempotent
  if (event.type !== "payment.succeeded") return ledger;
  const cents = Math.round(Number(event.amount) * 100);  // integer cents
  if (!Number.isFinite(cents) || cents <= 0) {
    throw new RangeError("invalid amount");
  }
  ledger.seen.add(event.id);
  ledger.balanceCents += cents;
  return ledger;
}`,
    tests: [
      { name: "Credits ৳12.50 as 1250 paisa", kind: "correctness", code: `const l = fn({balanceCents:0, seen:new Set()}, {id:"e1", type:"payment.succeeded", amount:12.5}); assert(l.balanceCents === 1250, "expected 1250, got " + l.balanceCents);` },
      { name: "String amount \"19.99\" becomes exactly 1999", kind: "correctness", code: `const l = fn({balanceCents:0, seen:new Set()}, {id:"e2", type:"payment.succeeded", amount:"19.99"}); assert(l.balanceCents === 1999, "expected 1999, got " + l.balanceCents);` },
      { name: "Duplicate delivery is credited once", kind: "edge", code: `const l = {balanceCents:0, seen:new Set()}; const e = {id:"dup", type:"payment.succeeded", amount:5}; fn(l, e); fn(l, e); assert(l.balanceCents === 500, "credited " + l.balanceCents + " paisa");` },
      { name: "Negative amount is rejected", kind: "edge", code: `let threw = false; try { fn({balanceCents:0, seen:new Set()}, {id:"n", type:"payment.succeeded", amount:-20}); } catch(e){ threw = true; } assert(threw, "should throw on negative amount");` },
      { name: "Refund events don't change the balance", kind: "correctness", code: `const l = fn({balanceCents:100, seen:new Set()}, {id:"r", type:"refund.created", amount:1}); assert(l.balanceCents === 100, "balance changed to " + l.balanceCents);` },
      { name: "50,000 events in under 400 ms", kind: "performance", budgetMs: 400, code: `const l = {balanceCents:0, seen:new Set()}; for (let i=0;i<50000;i++) fn(l, {id:"p"+i, type:"payment.succeeded", amount:1}); assert(l.balanceCents === 5000000, "wrong total");` },
    ],
    viva: [
      {
        id: "w1",
        question: "Payment providers often deliver the same webhook more than once. How does your fix stop a double credit, and where would you keep processed event IDs in production?",
        rubric: [
          { point: "Make it idempotent: record processed event IDs and skip repeats", keywords: ["idempot", "duplicate", "seen", "event id", "already", "once", "skip"] },
          { point: "Persist IDs in a database with a unique constraint, not in memory", keywords: ["database", "db", "unique", "constraint", "redis", "persist", "table"] },
          { point: "Check and record in one transaction to avoid races", keywords: ["transaction", "atomic", "race", "lock", "concurren"] },
        ],
      },
      {
        id: "w2",
        question: "Why is storing money as floating-point taka dangerous, and what did you do instead?",
        rubric: [
          { point: "Binary floating point can't represent values like 0.1 exactly, so sums drift", keywords: ["float", "binary", "precision", "rounding", "0.1", "exact", "decimal"] },
          { point: "Store integer minor units (paisa/cents)", keywords: ["cent", "paisa", "integer", "minor unit", "whole number"] },
          { point: "Convert and round once at the input boundary", keywords: ["round", "math.round", "parse", "convert", "boundary", "input"] },
        ],
      },
    ],
  },
  {
    id: "cart",
    title: "The negative checkout",
    story:
      "A Shopify-style store lets a ৳500 coupon drive a ৳300 cart to −৳200, and 3 shirts at $19.99 show $59.970000000000006. Fix cartTotal.",
    fnName: "cartTotal",
    tracks: ["cms_ecommerce"],
    buggy: `// items  = [{ price: number, qty: number }]
// coupon = { type: "percent" | "fixed", value: number, expires: "YYYY-MM-DD" } | null
// today  = "YYYY-MM-DD". Return the total rounded to 2 decimals.
function cartTotal(items, coupon, today) {
  let total = 0;
  for (const item of items) total += item.price * item.qty;
  if (coupon) {
    if (coupon.type === "percent") total = total - total * coupon.value / 100;
    else total = total - coupon.value;
  }
  return total;
}`,
    reference: `function cartTotal(items, coupon, today) {
  let cents = 0;
  for (const { price, qty } of items) {
    if (!Number.isInteger(qty) || qty < 0) throw new RangeError("bad qty");
    cents += Math.round(price * 100) * qty;
  }
  if (coupon && coupon.expires >= today) {
    const off = coupon.type === "percent"
      ? Math.round(cents * coupon.value / 100)
      : Math.round(coupon.value * 100);
    cents = Math.max(0, cents - off);
  }
  return cents / 100;
}`,
    tests: [
      { name: "3 × 19.99 is exactly 59.97", kind: "correctness", code: `const t = fn([{price:19.99, qty:3}], null, "2026-11-01"); assert(t === 59.97, "got " + t);` },
      { name: "10% coupon on 100.00 gives 90", kind: "correctness", code: `const t = fn([{price:50, qty:2}], {type:"percent", value:10, expires:"2026-12-31"}, "2026-11-01"); assert(t === 90, "got " + t);` },
      { name: "Fixed coupon can't push total below zero", kind: "edge", code: `const t = fn([{price:300, qty:1}], {type:"fixed", value:500, expires:"2026-12-31"}, "2026-11-01"); assert(t === 0, "got " + t);` },
      { name: "Expired coupon is ignored", kind: "edge", code: `const t = fn([{price:100, qty:1}], {type:"percent", value:50, expires:"2026-10-01"}, "2026-11-01"); assert(t === 100, "got " + t);` },
      { name: "Negative quantity is rejected", kind: "edge", code: `let threw=false; try { fn([{price:10, qty:-2}], null, "2026-11-01"); } catch(e){ threw=true; } assert(threw, "should throw on negative qty");` },
      { name: "100,000 line items in under 300 ms", kind: "performance", budgetMs: 300, code: `const items = Array.from({length:100000}, () => ({price:1.1, qty:1})); const t = fn(items, null, "2026-11-01"); assert(t === 110000, "got " + t);` },
    ],
    viva: [
      {
        id: "c1",
        question: "A customer applies a ৳500 fixed coupon to a ৳300 cart. What should happen, and why?",
        rubric: [
          { point: "The total stops at zero; it can never go negative", keywords: ["zero", "negative", "clamp", "max", "0"] },
          { point: "The discount is capped at the subtotal (state what happens to the leftover)", keywords: ["cap", "subtotal", "leftover", "remaining", "lost", "credit"] },
          { point: "Check the coupon is valid (expiry, eligibility) before applying it", keywords: ["expir", "valid", "eligib", "date"] },
        ],
      },
      {
        id: "c2",
        question: "Why did 19.99 × 3 not equal 59.97 in the original code?",
        rubric: [
          { point: "Floating point can't store 19.99 exactly, so multiplication drifts", keywords: ["float", "binary", "precision", "rounding", "exact"] },
          { point: "Calculate in integer cents/paisa", keywords: ["cent", "paisa", "integer"] },
          { point: "Format with 2 decimals only for display", keywords: ["display", "tofixed", "format", "show"] },
        ],
      },
    ],
  },
  {
    id: "dedupe",
    title: "The lead list that froze",
    story:
      "An automation imports form leads into a CRM. With 40,000 rows the dedupe step freezes, and Rahim@Mail.com and ' rahim@mail.com' come through as two people. Fix dedupeLeads.",
    fnName: "dedupeLeads",
    tracks: ["ai_automation", "design"],
    buggy: `// rows = [{ name: string, email?: string }]
// Keep the FIRST row for each person (same email ignoring case
// and surrounding spaces). Drop rows with no email. Keep order.
function dedupeLeads(rows) {
  return rows.filter((row, i) =>
    rows.findIndex(r => r.email === row.email) === i
  );
}`,
    reference: `function dedupeLeads(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = (row.email || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}`,
    tests: [
      { name: "Case and spaces don't create duplicates", kind: "correctness", code: `const r = fn([{name:"A", email:"Rahim@Mail.com"}, {name:"B", email:" rahim@mail.com "}]); assert(r.length === 1, "kept " + r.length);` },
      { name: "Keeps the first occurrence", kind: "correctness", code: `const r = fn([{name:"first", email:"x@y.com"}, {name:"second", email:"X@y.com"}]); assert(r[0].name === "first", "kept " + (r[0] && r[0].name));` },
      { name: "Drops rows without an email", kind: "edge", code: `const r = fn([{name:"no email"}, {name:"blank", email:"  "}, {name:"ok", email:"a@b.com"}]); assert(r.length === 1 && r[0].name === "ok", "kept " + r.map(x=>x.name).join(","));` },
      { name: "Keeps original order", kind: "correctness", code: `const r = fn([{name:"1",email:"c@x"},{name:"2",email:"a@x"},{name:"3",email:"b@x"}]); assert(r.map(x=>x.name).join("") === "123", "order " + r.map(x=>x.name).join(""));` },
      { name: "40,000 rows in under 300 ms", kind: "performance", budgetMs: 300, code: `const rows = Array.from({length:40000}, (_, i) => ({name:"n"+i, email:"u"+i+"@x.com"})); const r = fn(rows); assert(r.length === 40000, "kept " + r.length);` },
    ],
    viva: [
      {
        id: "d1",
        question: "Your original function froze at 40,000 leads. What was its time complexity, and what is yours now?",
        rubric: [
          { point: "Original was O(n²): findIndex scans the list for every row", keywords: ["n^2", "n²", "n2", "quadratic", "findindex", "nested"] },
          { point: "New version is O(n) using a Set or Map lookup", keywords: ["o(n)", "linear", "set", "map", "hash"] },
          { point: "Trade-off: extra memory for the set", keywords: ["memory", "space"] },
        ],
      },
      {
        id: "d2",
        question: "Which email normalisations are safe, and which could wrongly merge two different people?",
        rubric: [
          { point: "Trimming spaces and lowercasing are safe", keywords: ["lower", "case", "trim", "space", "whitespace"] },
          { point: "Removing dots or +tags is provider-specific (e.g. Gmail) and can merge different people", keywords: ["plus", "+", "dot", "gmail", "alias", "provider", "tag"] },
        ],
      },
    ],
  },
];

export function challengeForTrack(trackId: string): Challenge {
  return CHALLENGES.find((c) => c.tracks.includes(trackId)) ?? CHALLENGES[0];
}
