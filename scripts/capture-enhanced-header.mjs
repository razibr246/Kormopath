import puppeteer from "puppeteer-core";
import fs from "fs";

async function main() {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,800"],
    defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 2 },
  });

  const page = await browser.newPage();
  await page.goto("http://localhost:3000/legal", { waitUntil: "networkidle0", timeout: 15000 });

  // 1. Screenshot of the brand header pill
  const nav = await page.$(".kp-nav");
  if (nav) {
    await nav.screenshot({ path: "public/screenshots/20-enhanced-legal-header-pill.png" });
    console.log("Saved public/screenshots/20-enhanced-legal-header-pill.png");
  }

  // 2. Open the App Info modal
  const infoBtn = await page.$('button[aria-label*="তথ্য ও হটলাইন"]');
  if (infoBtn) {
    await infoBtn.click();
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: "public/screenshots/21-legal-app-info-modal.png" });
    console.log("Saved public/screenshots/21-legal-app-info-modal.png");
  }

  await browser.close();
}

main().catch(console.error);
