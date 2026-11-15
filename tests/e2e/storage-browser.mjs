import puppeteer from "puppeteer-core";
import assert from "node:assert/strict";
const BASE = process.env.BASE || "http://localhost:3100";
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
try {
  const first = await browser.newPage();
  await first.goto(BASE + "/opportunities", { waitUntil: "networkidle0" });
  await first.evaluate(() => localStorage.clear());
  await first.reload({ waitUntil: "networkidle0" });
  const second = await browser.newPage();
  await second.goto(BASE + "/opportunities", { waitUntil: "networkidle0" });
  await first.evaluate(() => {
    const key = "kormopath:platform:opportunityBoard.v1";
    const board = JSON.parse(localStorage.getItem(key));
    board.path = "study";
    localStorage.setItem(key, JSON.stringify(board));
  });
  await second.waitForFunction(() => document.querySelector('[aria-label="পথ বেছে নিন"] button[aria-pressed=true]')?.textContent.includes("বিশ্ববিদ্যালয়"));
  await first.evaluate(() => localStorage.removeItem("kormopath:platform:opportunityBoard.v1"));
  await second.waitForFunction(() => document.querySelector('[aria-label="পথ বেছে নিন"] button[aria-pressed=true]')?.textContent.includes("ফ্রিল্যান্স"));
  console.log("PASS: saved state updates across tabs and resets after deletion.");

  const blocked = await browser.newPage();
  await blocked.evaluateOnNewDocument(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("kormopath:")) throw new DOMException("Quota exceeded", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await blocked.goto(BASE + "/admitbuddy", { waitUntil: "networkidle0" });
  await blocked.waitForFunction(() => document.querySelector('aside[role=alert]')?.textContent.includes("সংরক্ষণ করা যায়নি"));
  console.log("PASS: failed browser writes show a shared unsaved-data warning.");

  await second.evaluate(() => {
    const board = JSON.parse(localStorage.getItem("kormopath:platform:opportunityBoard.v1"));
    board.saved = [{ id: "calendar", title: "ইন্টার্নশিপ", url: "https://example.com/jobs", track: "freelance", status: "saved", followUp: "2027-01-02", note: "কল করুন", savedAt: "2026-11-08" }];
    localStorage.setItem("kormopath:platform:opportunityBoard.v1", JSON.stringify(board));
  });
  await second.reload({ waitUntil: "networkidle0" });
  await second.evaluate(() => {
    const original = URL.createObjectURL;
    URL.createObjectURL = function (blob) { window.exportedBlob = blob; return original.call(this, blob); };
    [...document.querySelectorAll("button")].find((button) => button.textContent.includes("ক্যালেন্ডারে ফলো-আপ")).click();
  });
  const calendar = await second.evaluate(async () => ({ text: await window.exportedBlob.text(), bytes: Array.from(new Uint8Array(await window.exportedBlob.arrayBuffer()).slice(0, 3)) }));
  assert.ok(calendar.text.startsWith("BEGIN:VCALENDAR"));
  assert.deepEqual(calendar.bytes, [66, 69, 71]);
  assert.match(calendar.text, /20270102/);
  console.log("PASS: My Path calendar export is valid UTF-8 without BOM.");
} finally { await browser.close(); }
