const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs');
const path=require('node:path');
// All Firebase reads/writes and authentication are simulated; external requests are blocked.
const assert=require('node:assert/strict');
const origin=process.env.ORIGIN || 'http://127.0.0.1:5173';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || chromium.executablePath(),ignoreDefaultArgs:['--hide-scrollbars'],args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
 const context=await browser.newContext({viewport:{width:392,height:852},timezoneId:'America/Panama'});
 await context.addInitScript(()=>{
  window.__rows={};window.__writes=[];
  const base='artifacts/diverty-oficial/public/data/';
  const packages=Array.from({length:300},(_,i)=>({id:'pkg'+i,nombre:'Paquete '+i,precio:100,descripcion:'Detalles del paquete',duracionHoras:2}));
  packages.push({id:'hotdogs',nombre:'Hot dogs',precio:2},{id:'pintacaritas',nombre:'Pintacaritas',precio:25,tipoCobro:'hora',isHourly:true});
  window.__rows[base+'configuracion/serviciosCustom']={paquetes:packages};
  window.__rows[base+'configuracion/clientesOcultos']={clients:[]};
  window.__rows[base+'configuracion/migracion_segura_v2']={done:true};
  window.__rows[base+'config_web/global']={centralBookingValidation:false};
  for(let i=0;i<2;i++)window.__rows[base+'eventos/event-'+String(i).padStart(4,'0')]={id:'event-'+String(i).padStart(4,'0'),cliente:'Cliente '+i%100,telefono:'6000'+String(i%100).padStart(4,'0'),email:'cliente'+i%100+'@example.invalid',fecha:'2026-10-07',hora:'10:00',estado:i===0?'Pendiente':'Confirmado',total:100,abono:25,servicio:'Paquete 1',serviciosSeleccionados:[{id:'pkg1',nombre:'Paquete 1',precio:100,precioOriginal:100,cantidad:1}],costosSeparados:true};
  window.alert=message=>{window.__alerts=(window.__alerts||[]).concat(message);};window.confirm=()=>true;
 });
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin)return route.abort();
  
  if(url.pathname==='/src/lib/firebase-auth.mjs')return route.fulfill({contentType:'text/javascript',body:`export const ADMIN_UID='test-admin';export const app={};export const auth={currentUser:{uid:ADMIN_UID}};export const LOGO_URL='';export const firebaseConfig={};`});
  if(url.pathname.includes('firebase_auth.js'))return route.fulfill({contentType:'text/javascript',body:`export const onAuthStateChanged=(_a,next)=>{queueMicrotask(()=>next({uid:'test-admin'}));return ()=>{};};export const signOut=async()=>{};export const signInWithEmailAndPassword=async()=>{};`});
  if(url.pathname.includes('firebase_firestore.js'))return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(__dirname,'reservation-fixture.mjs'),'utf8').replace('({id:path.split', '({metadata:{hasPendingWrites:false,fromCache:false},id:path.split').replace('return {docs,size:', 'return {metadata:{hasPendingWrites:false,fromCache:false},docs,size:')+'\nexport const increment=value=>({__increment:value});\nexport const getDocFromServer=getDoc;export const getDocsFromServer=getDocs;' });
  return route.continue();
 });

 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.clock.setFixedTime(new Date('2026-10-07T15:00:00Z'));await page.goto(origin);
 await page.getByRole('button',{name:'Nueva Reserva',exact:true}).waitFor({timeout:30000});
 const nav=page.getByRole('navigation',{name:'Menú principal'});
 for(const width of (process.env.WIDTHS ? process.env.WIDTHS.split(',').map(Number) : [390,768,900,1024,1440,1920])) {
   await page.setViewportSize({width,height:900});
   await page.waitForTimeout(100);
   const box=await nav.boundingBox(),main=await page.locator('#main-content').boundingBox();
   assert.ok(main.width>0);assert.equal(await nav.getByRole('button').count(),7);
   if(width>=900){assert.ok(box.width<250&&box.height>850);assert.ok(main.x>=box.x+box.width-1);}
   else{assert.ok(box.y>800&&box.width>=width-1);assert.ok(main.x<1);}
   for(const name of ['Inicio','Agenda','Clientes','Proveedores','Finanzas','Web','Ajustes']) {
     await nav.getByRole('button',{name,exact:true}).click();
     await page.waitForTimeout(700);
     if(errors.length)throw Error(JSON.stringify(errors));
     assert.equal(await nav.getByRole('button',{name,exact:true}).getAttribute('aria-current'),'page');
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow at '+width+' '+name);
     const overflow=await page.locator('#main-content').evaluate(el=>{const edge=el.getBoundingClientRect().left+el.clientWidth;return {bad:el.scrollWidth>el.clientWidth+1,items:[...el.querySelectorAll('*')].filter(x=>x.getBoundingClientRect().right>edge+1).slice(0,12).map(x=>({tag:x.tagName,cls:x.className,text:x.textContent.slice(0,50),right:x.getBoundingClientRect().right,parent:{cls:x.parentElement.className,right:x.parentElement.getBoundingClientRect().right,overflow:getComputedStyle(x.parentElement).overflow},scroll:{width:el.scrollWidth,client:el.clientWidth}}))};});assert.ok(!overflow.bad,'content overflow at '+width+' '+name+' '+JSON.stringify(overflow.items));
   }
   await nav.getByRole('button',{name:'Inicio',exact:true}).click();
   if(width>=900){
     const mainEl=page.locator('#main-content');await mainEl.evaluate(el=>el.scrollTop=0);
     const bounds=await mainEl.boundingBox();await page.mouse.move(bounds.x+bounds.width/2,bounds.y+150);
     await page.mouse.wheel(0,500);await page.waitForTimeout(500);
     const scroll=await mainEl.evaluate(el=>({top:el.scrollTop,height:el.clientHeight,total:el.scrollHeight}));
     assert.ok(scroll.top>100,'mouse wheel must scroll Home');
     await page.mouse.wheel(0,10000);await page.waitForTimeout(600);
     assert.ok(await mainEl.evaluate(el=>el.scrollTop+el.clientHeight>=el.scrollHeight-2),'wheel reaches bottom');
     const hero=await page.locator('.home-hero').boundingBox(),metrics=await page.locator('.home-metrics').boundingBox();
     assert.ok(metrics.x>=hero.x+hero.width,'desktop metrics beside greeting');
     const operations=await page.locator('.home-operations').boundingBox(),followup=await page.locator('.home-followup').boundingBox();
     assert.ok(followup.x>=operations.x+operations.width,'desktop follow-up beside operations');
     assert.notEqual(await mainEl.evaluate(el=>getComputedStyle(el).scrollbarWidth),'none');
     assert.ok(await mainEl.evaluate(el=>el.offsetWidth-el.clientWidth>=10),'visible scrollbar space');
     await mainEl.evaluate(el=>el.scrollTop=0);
   }
   if(process.env.SCREENSHOT_DIR){await page.waitForTimeout(700);fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'home-'+width+'.png')});}
 }
 await page.setViewportSize({width:1440,height:900});
 await nav.getByRole('button',{name:'Agenda',exact:true}).focus();await page.keyboard.press('Enter');
 assert.equal(await nav.getByRole('button',{name:'Agenda',exact:true}).getAttribute('aria-current'),'page');
 await page.getByRole('button',{name:'Mes',exact:true}).click();
 const day=page.getByRole('button',{name:/Ver reservas del 7\/10\/2026/});await day.focus();await page.keyboard.press('Enter');
 await page.locator('[data-reservation-id="event-0000"]').waitFor();
 await nav.getByRole('button',{name:'Inicio',exact:true}).click();
 await page.getByRole('button',{name:'Nueva Reserva',exact:true}).click();
 const modal=page.getByRole('dialog',{name:'Reserva',exact:true});await modal.waitFor();
 assert.ok((await modal.locator('.reservation-sheet').boundingBox()).width>=800);
 assert.ok(await modal.locator('.reservation-scroll').evaluate(el=>el.scrollHeight>el.clientHeight));
 await modal.locator('.reservation-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
 await page.getByRole('button',{name:/Guardar Reserva/}).waitFor();
 assert.deepEqual(errors,[]);console.log('PASS: wheel reaches Home bottom, desktop dashboard columns, visible scrollbar, seven sections at phone, tablet and desktop widths, no horizontal overflow, keyboard navigation and calendar, scrollable desktop reservation.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
