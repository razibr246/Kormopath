import puppeteer from "puppeteer-core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "kp-backup-"));
const BASE = process.env.BASE || "http://localhost:3100";
(async () => {
 const browser = await puppeteer.launch({ executablePath:process.env.CHROME_PATH || "/usr/bin/chromium", headless:true, args:['--no-sandbox'] });
 const page = await browser.newPage();
 const errors=[]; page.on('pageerror', e=>errors.push(e.message));
 await page.setViewport({width:390,height:844});
 await page.goto(BASE + "/settings",{waitUntil:'networkidle0'});
 await page.evaluate(()=>{localStorage.clear();localStorage.setItem('kormopath:shohoj:transactions.v2','[1]');});
 fs.writeFileSync(path.join(temp,"backup.json"),JSON.stringify({format:'kormopath-backup',version:1,exportedAt:new Date().toISOString(),data:{'kormopath:shohoj:transactions.v2':[2],'kp-ledger':[]}}));
 const select=async()=>{const input=await page.$('input[type=file]');await input.uploadFile(path.join(temp,"backup.json"));await page.waitForFunction(()=>document.body.innerText.includes('পুনরুদ্ধার করুন'));};
 const click=async text=>page.evaluate(t=>[...document.querySelectorAll('button')].find(b=>b.textContent===t).click(),text);
 await select();await click('পুনরুদ্ধার করুন');
 await page.waitForFunction(()=>document.querySelector('[role=status]'));
 if(await page.evaluate(()=>localStorage.getItem('kormopath:shohoj:transactions.v2'))!=='[1]')throw Error('Default preservation failed');
 if(await page.evaluate(()=>localStorage.getItem('kp-ledger'))!=='[]')throw Error('Workspace restore failed');
 await select();await page.click('input[type=checkbox]');await click('পুনরুদ্ধার করুন');
 await page.waitForFunction(()=>localStorage.getItem('kormopath:shohoj:transactions.v2')==='[2]');
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
 fs.writeFileSync(path.join(temp,"invalid.json"),'{"data":{"foreign":"value"}}');
 await (await page.$('input[type=file]')).uploadFile(path.join(temp,"invalid.json"));
 await page.waitForSelector('[role=alert]');

 for(const route of ['/','/workspace','/shohoj-budget','/mediscan','/admitbuddy','/probaho','/haatbazar','/feeguard','/chuktiguard','/opportunities']) {
  const response=await page.goto(BASE+route,{waitUntil:'networkidle0'});
  if(response.status()!==200)throw Error(route+' failed');
 }
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS: mobile backup preview, preserve, overwrite, Workspace restore, invalid file rejection, 10 route checks, no browser errors.');
 await browser.close();
 fs.rmSync(temp, {recursive:true,force:true});
})().catch(e=>{console.error(e);process.exit(1)});
