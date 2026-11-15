// Browser workflow checks for the six ecosystem apps (not part of `npm test`).
//
// Run a production server on port 3100, then npm run test:browser.
// Set BASE and CHROME_PATH to override the origin and installed browser.
// WARNING: clears localStorage on the test origin in its isolated browser profile.
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE || "http://localhost:3100";
const results = [];
const pass = (name, detail = "") => results.push({ ok: true, name, detail });
const fail = (name, detail = "") => results.push({ ok: false, name, detail });
const check = (cond, name, detail = "") => (cond ? pass(name, detail) : fail(name, detail));

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "/usr/bin/chromium"),
  headless: true,
  args: ["--no-sandbox", "--lang=bn-BD"],
});

const consoleErrors = [];
async function newPage(width = 1280, height = 900) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(`${page.url()} :: ${m.text()}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`${page.url()} :: PAGEERROR ${e.message}`));
  page.on("requestfailed", (r) => {
    const u = r.url();
    if (!u.includes("favicon")) consoleErrors.push(`${page.url()} :: REQUESTFAILED ${u} ${r.failure()?.errorText}`);
  });
  return page;
}

const text = (page) => page.evaluate(() => document.body.innerText);
async function clickText(page, selector, needle) {
  const ok = await page.evaluate(
    (sel, n) => {
      const el = [...document.querySelectorAll(sel)].find((e) => e.textContent && e.textContent.includes(n) && !e.disabled);
      if (!el) return false;
      el.click();
      return true;
    },
    selector,
    needle,
  );
  if (!ok) throw new Error(`no clickable ${selector} containing "${needle}"`);
  await new Promise((r) => setTimeout(r, 150));
}
async function typeInto(page, selector, value, clear = true) {
  await page.waitForSelector(selector);
  if (clear) {
    await page.click(selector, { clickCount: 3 });
    await page.keyboard.press("Backspace");
  }
  await page.type(selector, value);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function step(name, fn) {
  try {
    await fn();
  } catch (e) {
    fail(name, `EXCEPTION ${e.message}`);
  }
}

// ---------- Shohoj Budget ----------
await step("shohoj", async () => {
  const p = await newPage();
  await p.goto(`${BASE}/shohoj-budget`, { waitUntil: "networkidle0" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "networkidle0" });
  await typeInto(p, "#entry", "আজকে বাজারে ১২০০ টাকা খরচ করেছি");
  await clickText(p, "button", "বুঝে নিন");
  let t = await text(p);
  check(t.includes("ঠিক আছে কি না দেখে নিশ্চিত করুন"), "Shohoj: confirmation card appears before saving");
  const amt = await p.$eval('input[inputmode="decimal"]', (e) => e.value);
  check(amt === "1200", "Shohoj: '১২০০' parsed as 1200 (was 200 before)", `amount field=${amt}`);
  const cat = await p.evaluate(() => [...document.querySelectorAll("select")].map((s) => s.value));
  check(cat.includes("grocery"), "Shohoj: 'বাজার' suggests grocery", cat.join(","));
  check(t.includes("এই মাসে এখনো কোনো লেনদেন নেই"), "Shohoj: nothing saved before confirmation");
  await clickText(p, "button", "নিশ্চিত করুন");
  t = await text(p);
  check(t.includes("৳1,200") && t.includes("বাজার ও মুদি"), "Shohoj: confirmed transaction appears in ledger");
  await p.reload({ waitUntil: "networkidle0" });
  await wait(300);
  t = await text(p);
  check(t.includes("৳1,200") && t.includes("লেনদেন —"), "Shohoj: transaction persists after reload");
  // edit
  await p.click('button[aria-label="সংশোধন"]');
  await typeInto(p, 'input[inputmode="decimal"]', "1300");
  await clickText(p, "button", "সংশোধন সংরক্ষণ");
  await p.click('button[aria-label="পরিবর্তনের ইতিহাস"]');
  t = await text(p);
  check(t.includes("৳1,300") && t.includes("পরিমাণ ৳1,200 → ৳1,300"), "Shohoj: edit recorded in audit history");
  // delete + undo
  await p.click('button[aria-label="মুছুন"]');
  t = await text(p);
  check(t.includes("ফিরিয়ে আনুন"), "Shohoj: delete offers undo");
  await clickText(p, "button", "ফিরিয়ে আনুন");
  t = await text(p);
  check(t.includes("৳1,300"), "Shohoj: undo restores transaction");
  // no amount -> cannot confirm
  await typeInto(p, "#entry", "রিকশা ভাড়া দিয়েছি");
  await clickText(p, "button", "বুঝে নিন");
  const disabled = await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("নিশ্চিত করুন"))?.disabled);
  check(disabled === true, "Shohoj: no amount → confirm disabled (nothing invented)");
  t = await text(p);
  check(t.includes("টাকার পরিমাণ বুঝতে পারিনি"), "Shohoj: explains missing amount");
  await clickText(p, "button", "বাতিল");
  // SMS income
  await typeInto(p, "#sms", "You have received Tk 5,000.00 from 01700000000. TrxID ABC123 bKash");
  await clickText(p, "button", "এসএমএস পড়ুন");
  const incPressed = await p.evaluate(() => [...document.querySelectorAll("button[aria-pressed]")].find((b) => b.textContent.trim() === "আয়")?.getAttribute("aria-pressed"));
  check(incPressed === "true", "Shohoj: received-money SMS detected as income");
  await clickText(p, "button", "নিশ্চিত করুন");
  t = await text(p);
  check(t.includes("+৳5,000"), "Shohoj: income saved");
  // legacy migration
  await p.evaluate(() => {
    localStorage.setItem("shohoj_expenses", JSON.stringify([{ id: "e1", category: "Transport", categoryBn: "x", amount: 200, note: "রিকশা", method: "Cash", time: "আজ" }]));
    localStorage.removeItem("kormopath:shohoj:legacyMigrated");
  });
  await p.reload({ waitUntil: "networkidle0" });
  await wait(300);
  t = await text(p);
  check(t.includes("পুরনো ভার্সনের 1টি এন্ট্রি") && t.includes("পুরনো ডেটা"), "Shohoj: legacy v1 data migrated, not lost");
  await p.close();
});

// ---------- MediScan ----------
await step("mediscan", async () => {
  const p = await newPage();
  await p.goto(`${BASE}/mediscan`, { waitUntil: "networkidle0" });
  let t = await text(p);
  check(t.includes("999") && t.includes("16263"), "MediScan: emergency numbers always visible");
  check(!t.includes("OCR 98") && !t.includes("ভেরিফাইড ডিজিডিএ"), "MediScan: fake OCR % and 'DGDA verified' badge removed");
  const uploadDisabled = await p.$eval('input[type="file"]', (e) => e.disabled);
  check(uploadDisabled, "MediScan: image upload disabled until consent");
  await clickText(p, "button", "নমুনা ২");
  t = await text(p);
  check(t.includes("Fexofenadine") && t.includes("Omeprazole") && t.includes("সকালে ১টি, রাতে ১টি"), "MediScan: sample prescription read into plain Bangla");
  await clickText(p, "button", "নমুনা ৩");
  t = await text(p);
  check(t.includes("এই ওষুধ চিনতে পারিনি"), "MediScan: unknown medicine flagged, not replaced");
  check(t.includes("অ্যান্টাসিড অ্যান্টিবায়োটিকের শোষণ"), "MediScan: azithromycin + antacid caution");
  await typeInto(p, "#rx", "Tab Napa 500mg 1+1+1 x 3 days\nTab Napa Extra 1+0+1 x 3 days");
  t = await text(p);
  check(t.includes("একই উপাদান দুটিতেই আছে"), "MediScan: duplicate paracetamol detected");
  await typeInto(p, "#sym", "বুকে ব্যথা হচ্ছে");
  t = await text(p);
  check(t.includes("এখনই চিকিৎসা নিন"), "MediScan: red-flag symptom triggers emergency guidance");
  // pair checker unknown pair
  await p.select("select:nth-of-type(1)", "metformin").catch(() => {});
  const selects = await p.$$("section select");
  if (selects.length >= 3) {
    await selects[selects.length - 2].select("metformin");
    await selects[selects.length - 1].select("fexofenadine");
    t = await text(p);
    check(t.includes("এর মানে এই নয় যে একসাথে খাওয়া নিরাপদ"), "MediScan: unknown pair is 'no data', not 'safe'");
  } else fail("MediScan: pair checker selects found", String(selects.length));
  // save opt-in & persistence
  await typeInto(p, "#lbl", "পরীক্ষা");
  await clickText(p, "button", "সংরক্ষণ");
  await p.reload({ waitUntil: "networkidle0" });
  await wait(300);
  t = await text(p);
  check(t.includes("পরীক্ষা"), "MediScan: opt-in saved prescription persists locally");
  // API consent enforcement
  const r = await p.evaluate(async () => {
    const res = await fetch("/api/mediscan/ocr", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ file: { mimeType: "image/png", base64: "A".repeat(200) } }) });
    return { status: res.status, body: await res.json() };
  });
  check(r.status === 400, "MediScan API: rejects request without consent", JSON.stringify(r));
  const r2 = await p.evaluate(async () => {
    const res = await fetch("/api/mediscan/ocr", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ consent: true, file: { mimeType: "text/html", base64: "A".repeat(200) } }) });
    return res.status;
  });
  check(r2 === 400, "MediScan API: rejects disallowed file type", String(r2));
  const r3 = await p.evaluate(async () => {
    const res = await fetch("/api/mediscan/ocr", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ consent: true, file: { mimeType: "image/png", base64: "A".repeat(200) } }) });
    return { status: res.status, body: await res.json() };
  });
  check(r3.status === 503 || r3.status === 422 || r3.status === 200, "MediScan API: valid consented request handled (503 without key)", JSON.stringify(r3));
  await p.close();
});

// ---------- FeeGuard ----------
await step("feeguard", async () => {
  const p = await newPage();
  await p.goto(`${BASE}/feeguard`, { waitUntil: "networkidle0" });
  await wait(500);
  let t = await text(p);
  check(t.includes("✓ প্রতিটি ধাপ যোগ করলে নিট মিলে যায়"), "FeeGuard: reconciliation invariant holds on screen");
  check(t.includes("Direct client via Payoneer") && t.includes("Direct client via bank wire"), "FeeGuard: all four routes shown incl. Payoneer→bKash");
  const inc = await p.evaluate(() => [...document.querySelectorAll('input[type="checkbox"]')].map((c) => c.checked));
  check(inc.every((c) => c === false), "FeeGuard: incentive is off by default");
  check(!t.includes("$0.99") && !t.includes("SRO") && !t.includes("TOS violation"), "FeeGuard: hardcoded wrong labels, SRO claim and ToS-evasion copy removed");
  check(/মিড-মার্কেট|ফলব্যাক/.test(t), "FeeGuard: FX source shown (live or fallback)");
  // card sum check: parse first card's numbers
  const sums = await p.evaluate(() =>
    [...document.querySelectorAll("article")].map((a) => {
      const nums = [...a.querySelectorAll("dd")].map((d) => {
        const s = d.textContent.replace(/[৳,\s]/g, "").replace("−", "-").replace("+", "");
        return Number(s);
      });
      const net = Number(a.querySelector("strong.font-mono").textContent.replace(/[৳,\s]/g, ""));
      return { gross: nums[0], steps: nums.slice(1), net };
    }),
  );
  const ok = sums.every((c) => Math.abs(c.gross + c.steps.reduce((x, y) => x + y, 0) - c.net) <= 2);
  check(ok, "FeeGuard: each card's displayed lines add up to its net (±৳2 rounding)", JSON.stringify(sums.map((s) => [s.gross, s.steps, s.net])));
  // reality check record
  const inputs = await p.$$('input[inputmode="decimal"]');
  await inputs[0].type("90000");
  t = await text(p);
  check(t.includes("আসল মোট খরচ"), "FeeGuard: reality check computes actual cost");
  await clickText(p, "button", "রেকর্ডে রাখুন");
  await p.reload({ waitUntil: "networkidle0" });
  await wait(300);
  t = await text(p);
  check(t.includes("আপনার পেমেন্ট রেকর্ড (1)"), "FeeGuard: payment record persists");
  await p.close();
});

// ---------- HaatBazar ----------
await step("haatbazar", async () => {
  const p = await newPage();
  await p.goto(`${BASE}/haatbazar`, { waitUntil: "networkidle0" });
  await wait(1500);
  let t = await text(p);
  check(!t.includes("Real-Time Mandi") && !t.includes("আজকের বাজার সংকেত"), "HaatBazar: fake 'real-time' prices/signals removed");
  check(t.includes("16123"), "HaatBazar: Krishi Call Centre shown");
  const wxOk = t.includes("Weather data by Open-Meteo.com");
  const wxErr = t.includes("পূর্বাভাস পাওয়া যায়নি");
  check(wxOk || wxErr, "HaatBazar: weather loads with attribution, or shows an honest error", wxOk ? "live forecast" : "error state shown");
  if (wxOk) check(/স্প্রে করার মতো আবহাওয়া|স্প্রে না করাই ভালো/.test(t), "HaatBazar: spray-window advice from forecast");
  check(t.includes("দূরের মোকামে নিলে হাটের চেয়ে"), "HaatBazar: trip calculator result shown");
  // set distant price to 40 -> not worth it
  const numInputs = await p.$$('section input[type="number"]');
  await numInputs[2].click({ clickCount: 3 });
  await numInputs[2].type("40");
  t = await text(p);
  check(t.includes("হাটেই বিক্রি ভালো"), "HaatBazar: says sell locally when costs exceed gap");
  // price note
  await p.type('input[placeholder="যেমন: মহাস্থান হাট"]', "মহাস্থান হাট");
  const priceInputs = await p.$$('form input[inputmode="decimal"]');
  await priceInputs[0].type("36");
  await clickText(p, "button", "যোগ করুন");
  await p.reload({ waitUntil: "networkidle0" });
  await wait(300);
  t = await text(p);
  check(t.includes("মহাস্থান হাট") && t.includes("1,440"), "HaatBazar: price note saved with per-maund conversion and persists");
  // weather api validation
  const st = await p.evaluate(async () => (await fetch("/api/weather?d=../../etc")).status);
  check(st === 400, "Weather API: rejects unknown district", String(st));
  await p.close();
});

// ---------- Probaho ----------
await step("probaho", async () => {
  const p = await newPage();
  await p.goto(`${BASE}/probaho`, { waitUntil: "networkidle0" });
  await clickText(p, "button", "লিখে উত্তর");
  await typeInto(p, "#typed", "Um, I would basically use a transaction, um, you know.");
  await clickText(p, "button", "মূল্যায়ন করুন");
  let t = await text(p);
  check(t.includes("পরীক্ষকের পরের প্রশ্ন হতে পারে"), "Probaho: missing topic produces follow-up question");
  check(t.includes("Not covered"), "Probaho: missing topics listed");
  check(t.includes("ফিলার: "), "Probaho: filler words reported");
  await clickText(p, "button", "নমুনা উত্তর দেখুন");
  t = await text(p);
  check(t.includes("SELECT ... FOR UPDATE"), "Probaho: model answer shown after attempt");
  await p.reload({ waitUntil: "networkidle0" });
  await wait(300);
  t = await text(p);
  check(t.includes("অনুশীলনের ইতিহাস") && /\d+\/\d+\/\d+/.test(t) && t.includes("আপনার অগ্রগতি"), "Probaho: session history and progress persist");
  // Bangla track
  await clickText(p, "button", "বাংলা ভাইভা");
  t = await text(p);
  check(t.includes("নিজের সম্পর্কে সংক্ষেপে বলুন"), "Probaho: Bangla question bank available");
  await clickText(p, "button", "বলে উত্তর");
  t = await text(p);
  check(t.includes("মাইক ব্যবহারের আগে জেনে নিন"), "Probaho: consent notice shown before mic use");
  await p.close();
});

// ---------- AdmitBuddy ----------
await step("admitbuddy", async () => {
  const p = await newPage();
  await p.goto(`${BASE}/admitbuddy`, { waitUntil: "networkidle0" });
  await wait(300);
  let t = await text(p);
  check(!/\d+ days left/.test(t) && !t.includes("2026 Admissions"), "AdmitBuddy: no invented countdowns/'2026 admissions' claims");
  check(t.includes("আপনার তথ্য"), "AdmitBuddy: profile form shown for new user");
  check(t.includes("তারিখ যোগ করা হয়নি"), "AdmitBuddy: universities show 'date not added'");
  await p.click('button[aria-label="BUET শর্টলিস্টে রাখুন"]');
  await clickText(p, "button", "আবেদন ট্র্যাকার");
  t = await text(p);
  check(t.includes("BUET: অনলাইন আবেদন জমা") && t.includes("তারিখ এখনো জানা নেই"), "AdmitBuddy: shortlisted university creates undated tasks");
  await p.type('input[type="date"]', "12012026");
  await clickText(p, "button", "যোগ করুন");
  t = await text(p);
  check(t.includes("2026-12-01") && t.includes("উৎস: অফিসিয়াল সার্কুলার"), "AdmitBuddy: user deadline with source appears on task", t.match(/BUET: অনলাইন[^\n]*\n[^\n]*/)?.[0]);
  // invalid source
  await p.evaluate(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    const d = document.querySelector('input[type="date"]');
    setter.call(d, "2026-12-15");
    d.dispatchEvent(new Event("input", { bubbles: true }));
    const i = [...document.querySelectorAll("input")].find((x) => x.placeholder?.startsWith("যেমন: gstadmission"));
    setter.call(i, "");
    i.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await clickText(p, "button", "যোগ করুন");
  t = await text(p);
  const alertText = await p.evaluate(() => document.querySelector('[role="alert"]')?.textContent ?? "");
  check(alertText.includes("সার্কুলার"), "AdmitBuddy: deadline without source rejected", alertText);
  await p.reload({ waitUntil: "networkidle0" });
  await wait(300);
  await clickText(p, "button", "আবেদন ট্র্যাকার");
  t = await text(p);
  check(t.includes("2026-12-01"), "AdmitBuddy: shortlist and deadline persist after reload");
  await clickText(p, "button", "প্রশ্ন করুন");
  await typeInto(p, "#ask", "what education options do I have");
  await p.keyboard.press("Enter");
  await wait(150);
  t = await text(p);
  const last = t.split("what education options do I have")[1] ?? "";
  check(!last.includes("University of Dhaka"), "AdmitBuddy: 'education' no longer triggers DU answer");
  await clickText(p, "button", "SOP সহায়ক");
  await clickText(p, "button", "টেমপ্লেট বসান");
  t = await text(p);
  check(t.includes("Flesch Reading Ease"), "AdmitBuddy: SOP analysis shows real readability");
  await p.close();
});

// ---------- Settings ----------
await step("settings", async () => {
  const p = await newPage();
  await p.goto(`${BASE}/settings`, { waitUntil: "networkidle0" });
  await wait(300);
  let t = await text(p);
  check(t.includes("সংবেদনশীল স্বাস্থ্য তথ্য") && /\dটি আইটেম/.test(t), "Settings: lists per-app local data with health data marked");
  p.on("dialog", (d) => d.accept());
  const rows = await p.$$("section[aria-label] > div");
  // Probaho row is 4th
  const btns = await rows[3].$$("button");
  await btns[1].click();
  await wait(200);
  const probahoKeys = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("kormopath:probaho:")).length);
  const otherKeys = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("kormopath:shohoj:")).length);
  check(probahoKeys === 0 && otherKeys > 0, "Settings: deleting one app's data leaves other apps intact", `probaho=${probahoKeys} shohoj=${otherKeys}`);
  await p.close();
});

// ---------- Competitor-inspired features ----------
const setValue = (p, selector, value) =>
  p.evaluate((sel, v) => {
    const el = document.querySelector(sel);
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  }, selector, value);
const captureBlobs = (p) =>
  p.evaluate(() => {
    window.__blobs = [];
    const orig = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (b) => { window.__blobs.push(b); return orig(b); };
  });
const flat = (s) => s.replace(/\n/g, " | ");

await step("shohoj goals & category budgets", async () => {
  const p = await newPage();
  await p.goto(`${BASE}/shohoj-budget`, { waitUntil: "networkidle2" });
  await wait(300);
  await clickText(p, 'section[aria-labelledby="catb-h"] button', "সীমা ঠিক করুন");
  await setValue(p, 'section[aria-labelledby="catb-h"] select', "food");
  await typeInto(p, 'section[aria-labelledby="catb-h"] input', "১০০০");
  await clickText(p, 'section[aria-labelledby="catb-h"] button', "সংরক্ষণ");
  let row = await p.$eval('[data-testid="catbudget-food"]', (e) => e.innerText).catch(() => "");
  check(row.includes("৳1,000"), "Shohoj: per-category budget saved (Bangla digits accepted)", flat(row));
  await clickText(p, 'section[aria-labelledby="goal-h"] button', "নতুন লক্ষ্য");
  await typeInto(p, 'section[aria-labelledby="goal-h"] input[placeholder="যেমন ল্যাপটপ"]', "Laptop");
  const goalInputs = await p.$$('section[aria-labelledby="goal-h"] input[inputmode="decimal"]');
  await goalInputs[0].type("60000");
  await setValue(p, 'section[aria-labelledby="goal-h"] input[type="date"]', "2027-12-31");
  await clickText(p, 'section[aria-labelledby="goal-h"] button', "লক্ষ্য যোগ করুন");
  await typeInto(p, '[data-testid="goal"] input', "15000");
  await clickText(p, '[data-testid="goal"] button', "জমা");
  let goal = await p.$eval('[data-testid="goal"]', (e) => e.innerText).catch(() => "");
  check(goal.includes("৳15,000 / ৳60,000 (25%)") && goal.includes("মাসে প্রায়"), "Shohoj: savings goal progress and per-month amount", flat(goal));
  const txBefore = await p.evaluate(() => JSON.parse(localStorage.getItem("kormopath:shohoj:transactions.v2") || "[]").length);
  await p.reload({ waitUntil: "networkidle2" });
  await wait(300);
  goal = await p.$eval('[data-testid="goal"]', (e) => e.innerText).catch(() => "");
  row = await p.$eval('[data-testid="catbudget-food"]', (e) => e.innerText).catch(() => "");
  const txAfter = await p.evaluate(() => JSON.parse(localStorage.getItem("kormopath:shohoj:transactions.v2") || "[]").length);
  check(goal.includes("25%") && row.includes("৳1,000"), "Shohoj: goal and category budget persist after reload");
  check(txBefore === txAfter, "Shohoj: saving to a goal does not silently create a transaction", `${txBefore} → ${txAfter}`);
  await p.close();
});

await step("mediscan liquid doses & reminders", async () => {
  const p = await newPage();
  await p.goto(`${BASE}/mediscan`, { waitUntil: "networkidle2" });
  const savedBefore = await p.evaluate(() => localStorage.getItem("kormopath:mediscan:savedPrescriptions"));
  await setValue(p, "#rx", "Rx\nTab. Napa 500mg 1+0+1 x 5 days p.c.\nSyp. Fexo 5 ml bd x 7 days");
  await wait(200);
  const t = await text(p);
  check(t.includes("দিনে ২ বার") && t.includes("প্রতিবার ৫ মি.লি."), "MediScan: syrup frequency and ml amount read as written");
  const morning = await p.$eval('[data-testid="slot-morning"]', (e) => e.innerText).catch(() => "");
  const noon = await p.$eval('[data-testid="slot-noon"]', (e) => e.innerText).catch(() => "");
  check(morning.includes("Napa") && noon.includes("কিছু নেই"), "MediScan: timetable built from 1+0+1 dose", flat(morning));
  check(t.includes("এগুলো রিমাইন্ডারে যোগ হয়নি"), "MediScan: 'bd' line not assigned to clock times");
  await captureBlobs(p);
  await clickText(p, "button", "ক্যালেন্ডার রিমাইন্ডার");
  await wait(200);
  const ics = await p.evaluate(async () => (window.__blobs[0] ? await window.__blobs[0].text() : ""));
  check(/BEGIN:VCALENDAR/.test(ics) && (ics.match(/COUNT=5/g) || []).length === 2 && !ics.includes("Fexo"), "MediScan: .ics has 2 Napa reminders × 5 days, none for the bd syrup", `${(ics.match(/BEGIN:VEVENT/g) || []).length} events`);
  const savedAfter = await p.evaluate(() => localStorage.getItem("kormopath:mediscan:savedPrescriptions"));
  check(savedBefore === savedAfter, "MediScan: reminder export does not save the prescription");
  await p.close();
});

await step("admitbuddy status board", async () => {
  const p = await newPage();
  await p.goto(`${BASE}/admitbuddy`, { waitUntil: "networkidle0" });
  await wait(300);
  await clickText(p, "button", "আবেদন ট্র্যাকার");
  const sel = 'select[aria-label="BUET আবেদনের ধাপ"]';
  await p.waitForSelector(sel, { timeout: 3000 });
  await setValue(p, sel, "applied");
  await typeInto(p, 'input[aria-label^="BUET নোট"]', "Roll 12345");
  await p.keyboard.press("Tab");
  await wait(200);
  const t = await text(p);
  check(t.includes("আবেদন জমা 1") && t.includes("আবেদন ফি পরিশোধ করুন"), "AdmitBuddy: stage change updates counts and next step");
  await p.reload({ waitUntil: "networkidle0" });
  await wait(300);
  await clickText(p, "button", "আবেদন ট্র্যাকার");
  const stage = await p.$eval(sel, (e) => e.value).catch(() => "");
  const note = await p.$eval('input[aria-label^="BUET নোট"]', (e) => e.value).catch(() => "");
  check(stage === "applied" && note === "Roll 12345", "AdmitBuddy: stage and note persist after reload", `${stage} / ${note}`);
  await p.close();
});

await step("probaho STAR & streak", async () => {
  const p = await newPage();
  await p.goto(`${BASE}/probaho`, { waitUntil: "networkidle0" });
  await clickText(p, "button", "এইচআর ইন্টারভিউ");
  await setValue(p, 'section[aria-labelledby="q-h"] select', "hr-conflict");
  await wait(150);
  await clickText(p, "button", "লিখে উত্তর");
  await typeInto(p, "#typed", "I think teamwork is important. I always try my best and I respect everyone on the team.");
  await clickText(p, "button", "মূল্যায়ন করুন");
  const star = await p.$eval('[data-testid="star-check"]', (e) => e.innerText).catch(() => "");
  check(star.includes("○ পরিস্থিতি") && star.includes("○ ফলাফল"), "Probaho: STAR check flags missing story parts", flat(star).slice(0, 120));
  const streak = await p.$eval('[data-testid="streak"]', (e) => e.innerText).catch(() => "");
  check(/টানা 1 দিন/.test(streak), "Probaho: practice streak shown after a session", streak);
  await p.close();
});

await step("security headers & body limit", async () => {
  const res = await fetch(`${BASE}/shohoj-budget`);
  const h = (k) => res.headers.get(k) || "";
  check(h("x-frame-options") === "DENY" && h("x-content-type-options") === "nosniff" && h("content-security-policy").includes("frame-ancestors 'none'") && h("permissions-policy").includes("microphone=(self)") && !h("x-powered-by"), "Platform: security headers set, X-Powered-By removed");
  const big = await fetch(`${BASE}/api/buddy/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: "x".repeat(300_000) }] }) });
  check(big.status === 413, "Platform: oversized API body rejected before parsing (413)", String(big.status));
  const ok = await fetch(`${BASE}/api/weather?d=dhaka`);
  check(ok.status !== 413, "Platform: normal API requests unaffected", String(ok.status));
});

// ---------- Mobile layout ----------
for (const route of ["/", "/admitbuddy", "/mediscan", "/shohoj-budget", "/haatbazar", "/probaho", "/feeguard", "/settings", "/workspace", "/chuktiguard"]) {
  await step(`mobile ${route}`, async () => {
    const p = await newPage(375, 812);
    await p.goto(`${BASE}${route}`, { waitUntil: "networkidle2" });
    await wait(300);
    const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    check(o.sw <= o.cw + 1, `Mobile 375px: no horizontal scroll on ${route}`, `scrollWidth=${o.sw} clientWidth=${o.cw}`);
    await p.close();
  });
}

await browser.close();
const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  — ${r.detail}` : ""}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
console.log(`\nConsole/page/network errors (${consoleErrors.length}):`);
for (const e of [...new Set(consoleErrors)]) console.log("  " + e);
process.exit(failed.length ? 1 : 0);
