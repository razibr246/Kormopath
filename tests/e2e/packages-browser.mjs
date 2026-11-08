import puppeteer from "puppeteer-core";
import assert from "node:assert/strict";
const BASE = process.env.BASE || "http://localhost:3100";
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812 });
  const externalFonts = [];
  page.on("request", (request) => { if (/fonts\.google/.test(request.url())) externalFonts.push(request.url()); });
  await page.goto(BASE + "/chuktiguard", { waitUntil: "networkidle0" });
  const click = (text) => page.evaluate((t) => [...document.querySelectorAll("button")].find((button) => button.textContent.includes(t)).click(), text);
  await page.type('[aria-label="Package name"]', 'Website package');
  await page.type('[aria-label="Package deliverables"]', 'Design\nBuild\nTest');
  await page.type('[aria-label="Package fee in USD"]', '0.01');
  await click('Save package');
  await page.waitForFunction(() => [...document.querySelectorAll('[role=alert]')].some((element) => element.textContent.includes('at least $0.01')));
  await page.click('[aria-label="Package fee in USD"]', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type('[aria-label="Package fee in USD"]', '10');
  await click('Save package');
  await page.waitForFunction(() => document.body.innerText.includes('Use in invoice editor'));
  await click('Use in invoice editor');
  await page.waitForSelector('[aria-label="Milestone 1 amount in USD"]');
  const amounts = await page.$$eval('input[aria-label$="amount in USD"]', (inputs) => inputs.map((input) => Number(input.value)));
  assert.deepEqual(amounts, [3.34, 3.33, 3.33]);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.equal(externalFonts.length, 0);
  console.log('PASS: package validation, exact-cent milestone split, mobile editor and locally hosted fonts.');
} finally { await browser.close(); }
