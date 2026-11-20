import puppeteer from "puppeteer-core";

async function main() {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,1000"],
    defaultViewport: { width: 1280, height: 1000, deviceScaleFactor: 2 },
  });

  const page = await browser.newPage();
  await page.goto("http://localhost:3000/settings", { waitUntil: "networkidle0", timeout: 15000 });

  await page.screenshot({ path: "public/screenshots/22-settings-zapier-integration.png", fullPage: false });
  console.log("Saved public/screenshots/22-settings-zapier-integration.png");

  await browser.close();
}

main().catch(console.error);
