// Browser + API checks for the judge tour, example-data buttons and the Probaho AI coach.
// Run with npm run test:browser; BASE and CHROME_PATH are supported.
import puppeteer from "puppeteer-core";
const BASE = process.env.BASE || "http://localhost:3100";
const results = [];
const check = (c, name, d = "") => results.push({ ok: !!c, name, d });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 40; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await wait(500); }

// API: coach
const good = "During my final-year project my teammate wanted to rewrite the backend two weeks before the demo. My role was to keep the demo stable, so I asked him to list the problems and I proposed small fixes first. In the end we delivered on time and I learned to argue with data.";
let r = await fetch(`${BASE}/api/probaho/coach`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId: "hr-conflict", answer: good }) });
let d = await r.json();
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const quotesIn = (d.strengths ?? []).every((s) => norm(good).includes(norm(s.quote)) || d.engine === "rule-based");
check(r.status === 200 && Array.isArray(d.gaps) && d.gaps.length >= 1, "Coach API: returns strengths/gaps", `engine=${d.engine} strengths=${d.strengths?.length} gaps=${d.gaps?.length}`);
check(quotesIn, "Coach API: every strength quote appears in the answer", JSON.stringify((d.strengths ?? []).map((s) => s.quote)).slice(0, 160));
console.log("coach trace:", (d.trace ?? []).map((t) => `${t.tool}:${t.status}`).join(" "));
r = await fetch(`${BASE}/api/probaho/coach`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId: "hr-conflict", answer: "too short" }) });
d = await r.json();
check(d.engine === "guard", "Coach API: short answer not sent to the model");
r = await fetch(`${BASE}/api/probaho/coach`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId: "nope", answer: good }) });
check(r.status === 404, "Coach API: unknown question 404");

const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "/usr/bin/chromium"), headless: true, args: ["--no-sandbox"] });
const errors = [];
const page = async (w = 1280, h = 900) => { const p = await b.newPage(); await p.setViewport({ width: w, height: h }); p.on("pageerror", (e) => errors.push(`${p.url()} ${e.message}`)); return p; };
const clickText = (p, sel, n) => p.evaluate((s, n) => { const el = [...document.querySelectorAll(s)].find((e) => e.textContent.includes(n)); if (el) el.click(); return !!el; }, sel, n);

// Judge tour + strip link
let p = await page();
await p.goto(`${BASE}/shohoj-budget`, { waitUntil: "networkidle2" });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: "networkidle2" });
const tourLink = await p.$('a[href="/judges"]');
check(!!tourLink, "Strip: 'Judges: 2-minute tour' link on app pages");
await wait(300);
const loaded = await p.$('[data-testid="load-example"]');
check(!!loaded, "Shohoj: 'Load example data' shown on empty ledger");
if (loaded) await loaded.click();
await wait(300);
let t = await p.evaluate(() => document.body.innerText);
check(t.includes("উদাহরণ: বাসা ভাড়া") && t.includes("Example entries, not real data"), "Shohoj: example entries are labelled as examples");
await clickText(p, "button", "উদাহরণ মুছুন");
await wait(300);
const left = await p.evaluate(() => JSON.parse(localStorage.getItem("kormopath:shohoj:transactions.v2") || "[]").length);
check(left === 0, "Shohoj: examples removed in one tap", String(left));
await p.close();

p = await page();
await p.goto(`${BASE}/judges`, { waitUntil: "networkidle2" });
t = await p.evaluate(() => document.body.innerText);
check(t.includes("KormoPath in 2 minutes") && ["AdmitBuddy", "MediScan BD", "Shohoj Budget", "HaatBazar AI", "Probaho Coach", "FeeGuard BD"].every((n) => t.includes(n)), "Judge tour: English guide lists flagship + all 6 apps");
await p.close();

p = await page();
await p.goto(`${BASE}/admitbuddy`, { waitUntil: "networkidle2" });
await wait(300);
const ex = await p.$('[data-testid="example-profile"]');
check(!!ex, "AdmitBuddy: 'Try an example' button on empty profile");
if (ex) await ex.click();
await wait(400);
t = await p.evaluate(() => document.body.innerText);
check(/ফিট \d+/.test(t) || /Match|Safety|Reach/.test(t), "AdmitBuddy: example profile shows fit scores");
await p.close();

// Probaho AI coach in the UI
p = await page();
await p.goto(`${BASE}/probaho`, { waitUntil: "networkidle2" });
await clickText(p, "button", "এইচআর ইন্টারভিউ");
await p.evaluate(() => { const s = document.querySelector('section[aria-labelledby="q-h"] select'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(s, "hr-conflict"); s.dispatchEvent(new Event("change", { bubbles: true })); });
await wait(200);
await clickText(p, "button", "লিখে উত্তর");
await p.type("#typed", good);
await clickText(p, "button", "মূল্যায়ন করুন");
await wait(300);
await clickText(p, '[data-testid="ai-coach"] button', "Ask the AI coach");
for (let i = 0; i < 40; i++) { const done = await p.evaluate(() => /what worked|improve next time|unavailable/i.test(document.querySelector('[data-testid="ai-coach"]')?.innerText ?? "")); if (done) break; await wait(500); }
t = await p.$eval('[data-testid="ai-coach"]', (e) => e.innerText).catch(() => "");
check(/improve next time/i.test(t), "Probaho: AI coach panel shows coaching", t.replace(/\n/g, " | ").slice(0, 200));
await p.close();

// Mobile: no horizontal scroll with the new strip
for (const route of ["/", "/judges", "/shohoj-budget", "/probaho"]) {
  p = await page(375, 812);
  await p.goto(`${BASE}${route}`, { waitUntil: "networkidle2" });
  const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  check(o.sw <= o.cw + 1, `Mobile 375px: no horizontal scroll on ${route}`, `${o.sw}/${o.cw}`);
  await p.close();
}
await b.close();
for (const x of results) console.log(`${x.ok ? "PASS" : "FAIL"}  ${x.name}${x.d ? "  — " + x.d : ""}`);
console.log(`${results.filter((x) => x.ok).length}/${results.length} passed; page errors: ${errors.length} ${errors.slice(0, 2).join(" | ")}`);

process.exit(results.some((x) => !x.ok) || errors.length ? 1 : 0);
