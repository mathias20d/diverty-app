const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const origin=process.env.ORIGIN || 'http://127.0.0.1:4173';

// Smoke test the actual production chunks. No credentials or external requests.
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  const context=await browser.newContext();
  const requests=[],errors=[];
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.origin!==origin)return route.abort();
   requests.push(url.pathname);return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin);
  await page.getByPlaceholder('Correo Electrónico').waitFor({timeout:20000});
  assert.equal(requests.some(p=>/\/(App|firestore|FinancesView|SettingsView)-/.test(p)),false,'login must not download admin sections or Firestore');
  const assets=fs.readdirSync(path.join(__dirname,'../../dist/assets'));
  const modules=['App','FinancesView','SettingsView','WebAdmin'].map(name=>'/assets/'+assets.find(file=>file.startsWith(name+'-')&&file.endsWith('.js')));
  const results=await page.evaluate(async paths=>{
   const modules=await Promise.all(paths.map(p=>import(p)));
   // Shared icons can make Rollup expose App through a module namespace facade.
   return modules.map(m=>typeof (m.default || Object.values(m).find(value=>value?.default)?.default));
  },modules);
  assert.deepEqual(results,['function','function','function','function']);
  assert.ok(requests.some(p=>/\/firestore-/.test(p)),'the admin module links its own SDK chunk');
  assert.deepEqual(errors,[]);
  console.log('PASS: production login loads independently; admin, finance, settings and web catalog chunks link successfully.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
