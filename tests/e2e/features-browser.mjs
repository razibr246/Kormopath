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

// Rokkha: paste a scam SMS, a quoted signal appears; no-hit text never says "safe"
p = await page(390, 844);
await p.goto(`${BASE}/rokkha`, { waitUntil: "networkidle2" });
await p.type('[data-testid="rk-msg"]', "আপনার বিকাশ অ্যাকাউন্ট বন্ধ হয়ে যাবে। এখনই ওটিপি কোডটি বলুন: bit.ly/x1");
await p.click('[data-testid="rk-check"]');
await wait(200);
const rk = await p.evaluate(() => ({ ids: [...document.querySelectorAll("[data-signal]")].map((e) => e.getAttribute("data-signal")), marks: document.querySelectorAll("mark.rk-mark").length }));
check(rk.ids.includes("otp_pin") && rk.ids.includes("suspicious_link") && rk.marks > 0, "Rokkha: scam SMS shows quoted, highlighted signals", rk.ids.join(","));
await p.evaluate(() => { const t = document.querySelector('[data-testid="rk-msg"]'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(t, "Lunch at 1?"); t.dispatchEvent(new Event("input", { bubbles: true })); });
await p.click('[data-testid="rk-check"]');
await wait(200);
t = await p.$eval('[data-testid="rk-result"]', (e) => e.innerText).catch(() => "");
check(t.includes("মানে এই নয় যে বার্তাটি নিরাপদ"), "Rokkha: no-hit result says it does NOT mean safe", t.slice(0, 120));

// Banglish + link inspector: a fake bKash address is named as not official
await p.evaluate(() => { const t = document.querySelector('[data-testid="rk-msg"]'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(t, "Ami bkash theke bolchi, account block hoye jabe. otp ta din: https://bk4sh-secure.xyz/login"); t.dispatchEvent(new Event("input", { bubbles: true })); });
await p.click('[data-testid="rk-check"]');
await wait(200);
const rk2 = await p.evaluate(() => ({ ids: [...document.querySelectorAll("[data-signal]")].map((e) => e.getAttribute("data-signal")), flags: [...document.querySelectorAll("[data-link-flags]")].map((e) => e.getAttribute("data-link-flags")).join("|"), report: document.querySelector('[data-testid="rk-report-links"]')?.value || "" }));
check(rk2.ids.includes("mfs_agent") && rk2.ids.includes("pressure_secrecy") && rk2.flags.includes("brand_lookalike") && rk2.report.includes("bk4sh-secure.xyz"), "Rokkha: Banglish signs, fake-bKash link flagged, link copied into the report", `${rk2.ids.join(",")} / ${rk2.flags} / ${rk2.report}`);

// Call guard: opens full screen, "continue" is held for the countdown, "I have hung up" closes it
await p.click('[data-testid="rk-call-open"]');
await wait(300);
const g1 = await p.evaluate(() => ({ open: !!document.querySelector('[data-testid="rk-call-guard"]'), held: document.querySelector('[data-testid="rk-call-continue"]')?.disabled, tels: [...document.querySelectorAll('[data-testid="rk-call-guard"] a[href^="tel:"]')].map((a) => a.getAttribute("href")).join(",") }));
check(g1.open && g1.held === true && g1.tels.includes("tel:16247") && g1.tels.includes("tel:999"), "Rokkha: call guard opens with official numbers and holds 'continue'", JSON.stringify(g1));
await p.keyboard.press("Escape");
await wait(200);
check(!(await p.$('[data-testid="rk-call-guard"]')), "Rokkha: call guard closes");

// Family guardian: needs a confirm step before saving; the alert opens the phone's SMS app
await p.type("#rk-g-num", "01712345678");
await p.click('[data-testid="rk-g-review"]');
await wait(150);
const beforeSave = await p.evaluate(() => localStorage.getItem("kormopath:rokkha:guardians"));
await p.click('[data-testid="rk-g-save"]');
await wait(300);
const g2 = await p.evaluate(() => ({ stored: localStorage.getItem("kormopath:rokkha:guardians") || "", href: document.querySelector('[data-testid="rk-guardian-alert"]')?.getAttribute("href") || "" }));
check((!beforeSave || beforeSave === "[]") && g2.stored.includes("+8801712345678") && g2.href.startsWith("sms:+8801712345678?body="), "Rokkha: guardian saved only after confirm; alert is an sms: link", `${beforeSave} -> ${g2.stored} / ${g2.href.slice(0, 40)}`);
await p.close();

// Share target fallback page: shared text lands in the checker and leaves the address bar
p = await page(390, 844);
await p.goto(`${BASE}/rokkha/share?text=${encodeURIComponent("vul kore taka geche, ferot din")}`, { waitUntil: "networkidle2" });
await wait(500);
const sh = await p.evaluate(() => ({ url: location.href, msg: document.querySelector('[data-testid="rk-msg"]')?.value || "", ids: [...document.querySelectorAll("[data-signal]")].map((e) => e.getAttribute("data-signal")) }));
check(sh.msg.includes("ferot din") && sh.ids.includes("mfs_refund") && !sh.url.includes("ferot") && !sh.url.includes("text="), "Rokkha: shared SMS is checked and removed from the address bar", JSON.stringify(sh));
await p.close();

// MediScan fever watch: day 3+ means watch closely; one WHO warning sign means hospital now, with 999
p = await page(390, 844);
await p.goto(`${BASE}/mediscan#dengue`, { waitUntil: "networkidle2" });
await p.evaluate(() => { const i = document.querySelector("#fv-start"); const d = new Date(Date.now() + 6 * 3600e3 - 3 * 86400e3).toISOString().slice(0, 10); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(i, d); i.dispatchEvent(new Event("input", { bubbles: true })); });
await wait(200);
const fv1 = await p.$eval('[data-testid="fever-result"]', (e) => e.dataset.level).catch(() => "");
await p.click('[data-sign="bleeding"] input');
await wait(200);
const fv2 = await p.evaluate(() => ({ level: document.querySelector('[data-testid="fever-result"]')?.dataset.level, tel999: !!document.querySelector('[data-testid="fever-result"] a[href="tel:999"]'), stored: localStorage.getItem("kormopath:mediscan:feverWatch") }));
check(fv1 === "watch_closely" && fv2.level === "go_now" && fv2.tel999 && JSON.parse(fv2.stored || "{\"checks\":[]}").checks.length === 0, "MediScan: fever day 4 = watch closely; a warning sign = hospital now + 999; nothing saved without tapping save", `${fv1} -> ${JSON.stringify(fv2)}`);
await p.close();

// Home orbit: the living 3D orbit runs, and stays still under reduced motion
p = await page(390, 844);
await p.goto(`${BASE}/`, { waitUntil: "networkidle2" });
await p.evaluate(() => document.querySelector(".kp-orbit")?.scrollIntoView());
await wait(600);
const ob1 = await p.evaluate(() => [...document.querySelectorAll(".kp-orbit-node")].map((n) => n.style.left).join("|"));
await wait(900);
const ob2 = await p.evaluate(() => ({ live: document.querySelector(".kp-orbit")?.dataset.live, pos: [...document.querySelectorAll(".kp-orbit-node")].map((n) => n.style.left).join("|"), links: document.querySelectorAll(".kp-orbit-node a[href]").length }));
check(ob2.live === "true" && ob1 !== ob2.pos && ob2.links >= 9, "Home: 3D orbit moves and every node stays a link", `${ob2.links} links`);
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await p.reload({ waitUntil: "networkidle2" });
await wait(600);
const ob3 = await p.evaluate(() => document.querySelector(".kp-orbit")?.dataset.live ?? "none");
check(ob3 === "none", "Home: orbit stays still under reduced motion", ob3);
await p.close();

// Shohoj সংসার modules: every tab renders from its link; a dhar entry saves only after the review step
p = await page(375, 812);
await p.goto(`${BASE}/shohoj-budget`, { waitUntil: "networkidle2" });
await p.evaluate(() => localStorage.clear());
const shTabs = [];
for (const [v, id] of [["wallets", "wallets-panel"], ["dhar", "dhar-ledger"], ["bazar", "bazar-list"], ["mess", "mess-ledger"], ["zakat", "zakat-hub"]]) {
  await p.goto(`${BASE}/shohoj-budget#${v}`, { waitUntil: "networkidle2" });
  await wait(400);
  if (await p.$(`[data-testid="${id}"]`)) shTabs.push(v);
}
check(shTabs.length === 5, "Shohoj: wallets, dhar, bazar, mess and zakat tabs open from their links", shTabs.join(","));
await p.goto(`${BASE}/shohoj-budget#dhar`, { waitUntil: "networkidle2" });
await p.type('[data-testid="dhar-name"]', "রাকিব"); await p.type('[data-testid="dhar-amount"]', "500");
await p.click('[data-testid="dhar-review"]'); await wait(300);
const dBefore = await p.evaluate(() => JSON.parse(localStorage.getItem("kormopath:shohoj:dhar") || "[]").length);
await p.click('[data-testid="dhar-save"]'); await wait(400);
const dAfter = await p.evaluate(() => JSON.parse(localStorage.getItem("kormopath:shohoj:dhar") || "[]").length);
check(dBefore === 0 && dAfter === 1, "Shohoj: dhar entry saved only after confirm", `${dBefore} -> ${dAfter}`);
await p.close();

// Legal Aid (DLAS port): every page has the help strip, the demo is labelled, the assistant puts 999/109 first in a crisis
p = await page(375, 812);
const legalSeen = [];
for (const [route, id] of [["/legal", "legal-hero"], ["/legal/assistant", "legal-assistant"], ["/legal/apply", "apply-wizard"], ["/legal/track", "track-empty"], ["/legal/mediation", "legal-mediation"], ["/legal/demo", "demo-banner"]]) {
  await p.goto(`${BASE}${route}`, { waitUntil: "networkidle2" });
  await wait(300);
  const s = await p.evaluate((id) => ({ el: !!document.querySelector(`[data-testid="${id}"]`), strip: !!document.querySelector('[data-testid="legal-help-strip"] a[href="tel:16699"]'), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }), id);
  if (s.el && s.strip && s.sw <= s.cw + 1) legalSeen.push(route);
}
check(legalSeen.length === 6, "Legal: all six pages render with the 16699/999/109 strip and no sideways scroll at 375px", legalSeen.join(","));
const lr = await fetch(`${BASE}/api/legal/assist`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: "আমার স্বামী আমাকে মারধর করে", lang: "bn" }) });
const lj = await lr.json();
const la = String(lj.answer ?? "");
check(lr.status === 200 && /৯৯৯|999|১০৯|109/.test(la.slice(0, 120)) && Array.isArray(lj.trace), "Legal assistant: a violence question opens with 999/109, with a trace", `${lj.engine} ${la.slice(0, 80)}`);
await p.close();

// MediScan health hub: emergency finder answers fast with no account; the assistant routes red flags to 999;
// demo doctors never show the real bKash number
p = await page(390, 844);
await b.defaultBrowserContext().overridePermissions(BASE, ["geolocation"]);
await p.setGeolocation({ latitude: 23.7389, longitude: 90.3956 });
await p.goto(`${BASE}/mediscan/emergency`, { waitUntil: "networkidle2" });
const emT0 = Date.now();
await p.click('[data-testid="find-nearest"]');
for (let i = 0; i < 40; i++) { if (await p.$('[data-testid="hospital-card"]')) break; await wait(250); }
const em = await p.evaluate(() => ({ cards: document.querySelectorAll('[data-testid="hospital-card"]').length, c999: !!document.querySelector('a[href="tel:999"]'), avail: /\bavailable\b/i.test(document.querySelector('[data-testid="hospital-results"]')?.innerText ?? "") }));
check(em.cards >= 3 && em.c999 && !em.avail && Date.now() - emT0 < 8000, "Health: emergency finder lists hospitals within seconds (offline copy if Overpass is busy), 999 visible, never 'available'", `${em.cards} cards in ${Date.now() - emT0} ms`);
await p.goto(`${BASE}/mediscan/assistant`, { waitUntil: "networkidle2" });
await p.click('[data-testid="redflag-none"]'); await wait(150);
await p.type('[data-testid="symptom-input"]', "বুকে প্রচণ্ড ব্যথা আর শ্বাস নিতে কষ্ট হচ্ছে");
await p.click('[data-testid="symptom-submit"]'); await wait(600);
check(await p.evaluate(() => /999|৯৯৯/.test(document.querySelector('[data-testid="redflag-alert"]')?.innerText ?? "")), "Health assistant: chest pain typed as text goes straight to 999");
await p.goto(`${BASE}/mediscan/doctors`, { waitUntil: "networkidle2" });
await p.evaluate(() => document.querySelector('[data-testid="doctor-card"] button')?.click()); await wait(500);
const dr = await p.evaluate(() => ({ cards: document.querySelectorAll('[data-testid="doctor-card"]').length, demo: !!document.querySelector('[data-testid="demo-pay-banner"]'), num: document.body.innerText.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).includes("01927228826") }));
check(dr.cards === 5 && dr.demo && !dr.num, "Health: demo doctor booking shows the demo banner and never the real bKash number", JSON.stringify(dr));
await p.close();

// MaathSathi field app (FieldShift360 port): linked from MaathSathi, radar renders, storage stays in the krishi namespace
p = await page(390, 844);
await p.goto(`${BASE}/krishi`, { waitUntil: "networkidle2" });
const fLink = await p.$eval('[data-testid="ms-field360-open"]', (a) => a.getAttribute("href")).catch(() => "");
check(fLink === "/krishi/field#/farmer", "MaathSathi: links to the satellite field app", fLink);
await p.evaluate(() => localStorage.clear());
await p.goto(`${BASE}/krishi/field#/farmer/radar`, { waitUntil: "networkidle2", timeout: 60000 });
for (let i = 0; i < 30; i++) { if (await p.evaluate(() => /Godagari|গোদাগাড়ী/.test(document.querySelector("h1")?.innerText ?? ""))) break; await wait(500); }
const fr = await p.evaluate(() => ({ h1: document.querySelector("h1")?.innerText ?? "", keys: Object.keys(localStorage), buddy: !!document.querySelector('[aria-label*="Buddy"], [aria-label*="বাডি"]') }));
check(/Godagari|গোদাগাড়ী/.test(fr.h1) && fr.keys.length > 0 && fr.keys.every((k) => k.startsWith("kormopath:")), "Field app: Ropon Radar renders; every stored key is kormopath:*", `${fr.h1.slice(0, 50)} / ${fr.keys.join(",").slice(0, 120)}`);
const plans = await fetch(`${BASE}/api/field360/plans`);
check(plans.status === 503, "Field app: shared plan board says not configured (no database)", String(plans.status));
await p.close();
// Arriving by client-side navigation (a next/link from home) loads the field app in a fresh document
p = await page(1280, 900);
await p.goto(`${BASE}/`, { waitUntil: "networkidle2" });
await p.evaluate(() => { const a = document.querySelector('a[href="/krishi/field#/farmer"]'); a?.click(); });
await wait(4000);
const soft = await p.evaluate(() => ({ path: location.pathname, nav: new URL(performance.getEntriesByType("navigation")[0]?.name ?? location.href).pathname }));
check(soft.path === "/krishi/field" && soft.nav === "/krishi/field", "Field app: client-side arrival reloads into its own document", JSON.stringify(soft));
await p.close();

// Mobile: no horizontal scroll with the new strip
for (const route of ["/", "/judges", "/shohoj-budget", "/probaho", "/rokkha", "/krishi", "/krishi/field#/farmer", "/shohoj-budget#mess", "/mediscan/emergency", "/mediscan/doctors", "/mediscan/assistant"]) {
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
