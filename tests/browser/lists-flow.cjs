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
 await context.addInitScript(({eventCount})=>{
  window.__rows={};window.__writes=[];
  const base='artifacts/diverty-oficial/public/data/';
  const packages=Array.from({length:300},(_,i)=>({id:'pkg'+i,nombre:'Paquete '+i,precio:100,descripcion:'Detalles del paquete',duracionHoras:2}));
  packages.push({id:'hotdogs',nombre:'Hot dogs',precio:2},{id:'pintacaritas',nombre:'Pintacaritas',precio:25,tipoCobro:'hora',isHourly:true});
  window.__rows[base+'configuracion/serviciosCustom']={paquetes:packages};
  window.__rows[base+'configuracion/clientesOcultos']={clients:[]};
  window.__rows[base+'configuracion/migracion_segura_v2']={done:true};
  window.__rows[base+'config_web/global']={centralBookingValidation:false};
  for(let i=0;i<eventCount;i++)window.__rows[base+'eventos/event-'+String(i).padStart(4,'0')]={id:'event-'+String(i).padStart(4,'0'),cliente:'Cliente '+i%100,telefono:'6000'+String(i%100).padStart(4,'0'),email:'cliente'+i%100+'@example.invalid',fecha:i<2?'2026-10-07':'2026-10-01',hora:'10:00',estado:i===0?'Pendiente':'Confirmado',total:100,abono:25,servicio:'Paquete 1',serviciosSeleccionados:[{id:'pkg1',nombre:'Paquete 1',precio:100,precioOriginal:100,cantidad:1}],costosSeparados:true};
  window.alert=message=>{window.__alerts=(window.__alerts||[]).concat(message);};window.confirm=()=>true;
 },{eventCount:Number(process.env.EVENT_COUNT || 1200)});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin)return route.abort();
  
  if(url.pathname==='/src/lib/firebase-auth.mjs')return route.fulfill({contentType:'text/javascript',body:`export const ADMIN_UID='test-admin';export const app={};export const auth={currentUser:{uid:ADMIN_UID}};export const LOGO_URL='';export const firebaseConfig={};`});
  if(url.pathname.includes('firebase_auth.js'))return route.fulfill({contentType:'text/javascript',body:`export const onAuthStateChanged=(_a,next)=>{queueMicrotask(()=>next({uid:'test-admin'}));return ()=>{};};export const signOut=async()=>{};export const signInWithEmailAndPassword=async()=>{};`});
  if(url.pathname.includes('firebase_firestore.js'))return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(__dirname,'reservation-fixture.mjs'),'utf8')});
  return route.continue();
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await page.clock.setFixedTime(new Date('2026-10-07T15:00:00Z'));await page.goto(origin);

 await page.getByRole('button',{name:'Nueva Reserva',exact:true}).waitFor({timeout:30000});
 await page.getByRole('button',{name:'Agenda',exact:true}).first().click();
 const elapsed=await page.getByRole('button',{name:'Pendientes',exact:true}).evaluate(async button=>{const start=performance.now();button.click();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return performance.now()-start;});
 const cards=page.locator('[data-reservation-id]');
 await cards.first().waitFor();
 console.log('Agenda '+(process.env.EVENT_COUNT || 1200)+' reservations, CPU 4x: '+JSON.stringify({milliseconds:Math.round(elapsed),cards:await cards.count(),nodes:await page.locator('*').count()}));
 if(process.env.MEASURE_BASELINE || process.env.MEASURE_ONLY){assert.equal(await cards.count(),process.env.MEASURE_BASELINE?Number(process.env.EVENT_COUNT || 1200):30);return;}
 await page.getByText('Mostrando 30 de 1200 reservas',{exact:true}).waitFor();assert.equal(await cards.count(),30);
 const firstIDs=await cards.evaluateAll(nodes=>nodes.map(n=>n.dataset.reservationId));
 await page.getByRole('button',{name:'Mostrar más reservas',exact:true}).click();
 await page.getByText('Mostrando 60 de 1200 reservas',{exact:true}).waitFor();assert.equal(await cards.count(),60);
 assert.deepEqual((await cards.evaluateAll(nodes=>nodes.map(n=>n.dataset.reservationId))).slice(0,30),firstIDs);
 const secondGroup=cards.nth(40);await secondGroup.locator('.cursor-pointer').first().click();await secondGroup.getByRole('button',{name:'Editar',exact:true}).click();
 const edit=page.getByRole('dialog',{name:'Reserva',exact:true});await edit.waitFor();assert.equal(await edit.locator('form input').first().inputValue(),'Cliente 42');
 await edit.getByRole('heading',{name:'Editar Reserva',exact:true}).locator('..').locator('button').last().click();
 // Search covers the full history, even when only the first group is mounted.
 await page.getByPlaceholder('Buscar cliente, lugar, paquete...').fill('Cliente 99');
 await page.getByText('Mostrando 12 de 12 reservas',{exact:true}).waitFor();assert.equal(await cards.count(),12);assert.ok(await page.locator('[data-reservation-id="event-1199"]').count());
 await page.getByPlaceholder('Buscar cliente, lugar, paquete...').fill('Cliente');
 await page.getByText('Mostrando 30 de 1200 reservas',{exact:true}).waitFor();assert.equal(await cards.count(),30);
 // Calendar totals still count every event, including those beyond the visible group.
 await page.getByPlaceholder('Buscar cliente, lugar, paquete...').fill('');await page.getByRole('button',{name:'Mes',exact:true}).click();
 await page.getByText('Mostrando 30 de 1200 reservas',{exact:true}).waitFor();
 const day=page.locator('div.cursor-pointer').filter({has:page.locator('p').filter({hasText:/^1$/})}).filter({hasText:'+1196'});
 await day.click();await page.getByText('Mostrando 30 de 1198 reservas',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Mostrar más reservas',exact:true}).click();await page.getByText('Mostrando 60 de 1198 reservas',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Nueva reserva',exact:true}).click();
 const modal=page.getByRole('dialog',{name:'Reserva',exact:true});await modal.waitFor();
 const search=modal.getByPlaceholder('Buscar producto o servicio...');await search.focus();
 await modal.getByText('Mostrando 30 de 302 productos y servicios',{exact:true}).waitFor();assert.equal(await modal.locator('[data-service-option]').count(),30);
 await modal.getByRole('button',{name:'Mostrar más productos y servicios',exact:true}).click();
 await modal.getByText('Mostrando 60 de 302 productos y servicios',{exact:true}).waitFor();assert.equal(await modal.locator('[data-service-option]').count(),60);
 assert.equal(await search.evaluate(input=>input===document.activeElement),true,'loading more must keep the picker open');
 await search.fill('Paquete 299');await modal.getByText('Paquete 299',{exact:true}).waitFor();assert.equal(await modal.locator('[data-service-option]').count(),1);
 await modal.locator('[data-service-option]').click();await modal.getByLabel('Total de Paquete 299',{exact:true}).waitFor();assert.equal(await modal.getByLabel('Total de Paquete 299',{exact:true}).inputValue(),'100');
 await search.click();await modal.getByText('Mostrando 30 de 302 productos y servicios',{exact:true}).waitFor();assert.equal(await modal.locator('[data-service-option]').count(),30);
 // Opening a notification must reveal its exact reservation even beyond the first group.
 await page.goto(origin+'/?reservationId=event-0041');
 const notified=page.locator('[data-reservation-id="event-0041"]');
 await notified.getByRole('button',{name:'Editar',exact:true}).waitFor();
 await page.getByText('Mostrando 60 de 1198 reservas',{exact:true}).waitFor();
 assert.equal(await cards.count(),60);
 assert.deepEqual(errors,[]);console.log('PASS: Agenda batches, second-group editing, full-history search, calendar totals, catalog selection and notification targets.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
