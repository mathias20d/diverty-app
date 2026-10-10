const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs');
const path=require('node:path');
// All Firebase reads/writes and authentication are simulated; external requests are blocked.
const assert=require('node:assert/strict');
const origin=process.env.ORIGIN || 'http://127.0.0.1:5173';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
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
  if(url.pathname.includes('firebase_firestore.js'))return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(__dirname,'reservation-fixture.mjs'),'utf8')});
  return route.continue();
 });
 // Simulate a keyboard shrinking only the visual viewport, as on mobile browsers.
 await context.addInitScript(()=>{
  const viewport=new EventTarget();let height=window.innerHeight,offsetTop=0,scale=1;
  Object.defineProperties(viewport,{height:{get:()=>height},offsetTop:{get:()=>offsetTop},scale:{get:()=>scale}});
  Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});
  window.__viewport=(nextHeight,nextTop=0,nextScale=1)=>{height=nextHeight;offsetTop=nextTop;scale=nextScale;viewport.dispatchEvent(new Event('resize'));};
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await page.clock.setFixedTime(new Date('2026-10-07T15:00:00Z'));await page.goto(origin);

 await page.getByRole('button',{name:'Nueva Reserva',exact:true}).waitFor({timeout:20000});
 await page.getByRole('button',{name:'Nueva Reserva',exact:true}).click();
 const modal=page.getByRole('dialog',{name:'Reserva',exact:true});await modal.waitFor();
 const input=label=>modal.getByText(label,{exact:true}).locator('..').locator('input');
 const name=input('Nombre *'),phone=input('Teléfono *'),email=input('Correo');
 await name.fill('Cliente con teclado');await phone.fill('60001234');
 await page.evaluate(()=>window.__viewport(420));
 if(process.env.EXPECT_KEYBOARD_FAILURE){await page.waitForTimeout(300);const bounds=await modal.boundingBox();assert.ok(bounds.y+bounds.height>420);console.log('REPRODUCED: dialog extends below keyboard: '+JSON.stringify(bounds));return;}
 const visible=async field=>{
  await page.waitForFunction(()=>{const dialog=document.querySelector('[role=dialog]');return dialog?.dataset.keyboardOpen==='true'&&dialog.getBoundingClientRect().bottom<=window.visualViewport.offsetTop+window.visualViewport.height+1;});
  await field.evaluate(element=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const rect=await field.boundingBox(),scroll=await modal.locator('.reservation-scroll').boundingBox();
  const viewport=await page.evaluate(()=>({height:visualViewport.height,top:visualViewport.offsetTop}));
  assert.ok(rect.y>=scroll.y-1,'field top must stay inside the scrolling form');
  assert.ok(rect.y+rect.height<=Math.min(scroll.y+scroll.height,viewport.top+viewport.height)+1,'keyboard must not cover the field');
 };
 await visible(phone);assert.equal(await phone.getAttribute('inputmode'),'tel');
 assert.equal(await phone.evaluate(e=>getComputedStyle(e).fontSize),'16px');
 assert.equal(await modal.locator('.reservation-actions').evaluate(e=>getComputedStyle(e).position),'static');
 await email.fill('teclado@example.invalid');await visible(email);assert.equal(await email.getAttribute('inputmode'),'email');
 await input('Dirección Exacta').fill('Dirección visible con teclado');await visible(input('Dirección Exacta'));
 // Browser viewport panning and keyboard height changes must preserve visibility.
 await page.evaluate(()=>window.__viewport(360,50));await visible(input('Dirección Exacta'));
 const search=modal.getByPlaceholder('Buscar producto o servicio...');await search.fill('Hot dogs');await visible(search);
 await modal.locator('[data-service-option="hotdogs"]').click();
 const quantity=modal.getByLabel('Cantidad de Hot dogs',{exact:true});await quantity.fill('200');await visible(quantity);
 assert.equal(await modal.getByLabel('Total de Hot dogs',{exact:true}).inputValue(),'400');
 const description=modal.getByPlaceholder('Detalles, viñetas, cambios...');await description.fill('Detalle visible para el PDF');await visible(description);
 await modal.getByRole('button',{name:'Ocultar teclado',exact:true}).click();
 assert.equal(await description.evaluate(e=>e===document.activeElement),false);
 await page.evaluate(()=>window.__viewport(852));
 await page.waitForFunction(()=>document.querySelector('[role=dialog]')?.dataset.keyboardOpen==='false');
 assert.equal(await phone.inputValue(),'60001234');assert.equal(await email.inputValue(),'teclado@example.invalid');
 await input('Fecha *').fill('2030-11-10');await input('Hora *').fill('10:00');
 await modal.getByRole('button',{name:'Guardar Reserva',exact:true}).click();await modal.waitFor({state:'hidden'});
 const saved=await page.evaluate(()=>Object.entries(window.__rows).filter(([path])=>path.includes('/eventos/man-')).at(-1)?.[1]);
 assert.ok(saved);assert.equal(saved.cliente,'Cliente con teclado');assert.equal(saved.total,400);assert.equal(saved.telefono,'60001234');assert.equal(saved.email,'teclado@example.invalid');
 // The same form still fits a desktop window without the compact keyboard header.
 await page.setViewportSize({width:1280,height:900});await page.evaluate(()=>window.__viewport(900));
 await page.getByRole('button',{name:'Nueva Reserva',exact:true}).click();await modal.waitFor();
 const sheet=await modal.locator('.reservation-sheet').boundingBox();assert.ok(sheet.width>=800&&sheet.width<1280-100);assert.ok(sheet.y>=0&&sheet.y+sheet.height<=900);
 assert.equal(await modal.getByRole('button',{name:'Ocultar teclado',exact:true}).isVisible(),false);
 await modal.getByRole('heading',{name:'Nueva Reserva',exact:true}).locator('..').locator('button').last().click();
 // Fallback for browsers without VisualViewport: use dynamic viewport height.
 await page.setViewportSize({width:392,height:852});
 await page.evaluate(()=>Object.defineProperty(window,'visualViewport',{configurable:true,value:undefined}));
 await page.getByRole('button',{name:'Nueva Reserva',exact:true}).click();await modal.waitFor();await phone.fill('60001234');
 await page.setViewportSize({width:392,height:420});
 await page.waitForFunction(()=>document.querySelector('[role=dialog]').getBoundingClientRect().bottom<=window.innerHeight+1);
 const fallback=await phone.boundingBox(),scroll=await modal.locator('.reservation-scroll').boundingBox();assert.ok(fallback.y>=scroll.y-1&&fallback.y+fallback.height<=scroll.y+scroll.height+1);
 assert.deepEqual(errors,[]);console.log('PASS: keyboard viewport resizing/panning, visible text fields/quantity/textarea, dismiss, saving, desktop and fallback.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
