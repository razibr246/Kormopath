import puppeteer from "puppeteer-core";
const S = process.argv[2];
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844 });
await p.goto("http://localhost:3100/workspace", { waitUntil: "networkidle2", timeout: 90000 });
await p.screenshot({ path: `${S}/ws-proof.png` });
console.log("scrollWidth", await p.evaluate(() => document.documentElement.scrollWidth));
await b.close();
