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
  if(url.pathname==='/src/App.jsx'){const response=await route.fetch();let body=await response.text();body=body.replace(/export default function App\(\{ firebaseUser \}\) \{/,match=>match+'\n window.__appRenders=(window.__appRenders||0)+1;');return route.fulfill({response,body});}
  if(url.pathname==='/src/lib/firebase-auth.mjs')return route.fulfill({contentType:'text/javascript',body:`export const ADMIN_UID='test-admin';export const app={};export const auth={currentUser:{uid:ADMIN_UID}};export const LOGO_URL='';export const firebaseConfig={};`});
  if(url.pathname.includes('firebase_auth.js'))return route.fulfill({contentType:'text/javascript',body:`export const onAuthStateChanged=(_a,next)=>{queueMicrotask(()=>next({uid:'test-admin'}));return ()=>{};};export const signOut=async()=>{};export const signInWithEmailAndPassword=async()=>{};`});
  if(url.pathname.includes('firebase_firestore.js'))return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(__dirname,'reservation-fixture.mjs'),'utf8')});
  return route.continue();
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await page.clock.setFixedTime(new Date('2026-10-07T15:00:00Z'));await page.goto(origin);
 if(process.env.EXPECT_PANEL_FAILURE){await page.getByRole('alert').filter({hasText:'No se pudo cargar el panel'}).waitFor();assert.ok(errors.some(e=>e.includes('AnimatedProgress is not defined')));console.log('REPRODUCED: '+JSON.stringify(errors));return;}
 await page.getByRole('button',{name:'Nueva Reserva',exact:true}).waitFor({timeout:15000});

 await page.locator('[data-reservation-id="event-0000"]').waitFor();
 assert.equal(await page.locator('[data-reservation-id]').count(),2);
 assert.equal(await page.getByRole('alert').filter({hasText:'No se pudo cargar el panel'}).count(),0);
 const first=page.locator('[data-reservation-id="event-0000"]');
 await first.getByText('$75.00',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Agenda',exact:true}).first().click();
 await page.locator('[data-reservation-id="event-0000"]').waitFor();
 assert.equal(await page.locator('[data-reservation-id]').count(),2);
 await page.getByRole('button',{name:'Cerrar fechas de la web',exact:true}).click();
 const availability=page.getByRole('dialog',{name:'Disponibilidad de la web'});
 await availability.getByRole('button',{name:'Cerrar esta fecha',exact:true}).waitFor();
 await availability.getByRole('button',{name:'Cerrar esta fecha',exact:true}).click();
 await availability.getByRole('status').filter({hasText:'Fecha cerrada'}).waitFor();
 assert.equal(await availability.locator('[data-availability-date="2026-10-07"]').getAttribute('data-closed'),'true');
 await availability.locator('[data-availability-date="2026-10-09"]').click();
 await availability.getByRole('button',{name:'Cerrar esta fecha',exact:true}).click();
 await availability.getByRole('status').filter({hasText:'Fecha cerrada'}).waitFor();
 await availability.locator('[data-availability-date="2026-10-07"]').click();
 await availability.getByRole('button',{name:'Reabrir esta fecha',exact:true}).click();
 await availability.getByRole('status').filter({hasText:'Fecha reabierta'}).waitFor();
 assert.deepEqual(await page.evaluate(()=>window.__rows['artifacts/diverty-oficial/public/data/config_web/fechas_cerradas'].fechas),{'2026-10-09':true});
 assert.equal(await page.evaluate(()=>Object.keys(window.__rows).filter(key=>key.includes('/eventos/')).length),2);
 await availability.getByRole('button',{name:'Mes siguiente',exact:true}).click();
 await availability.locator('[data-availability-date="2026-11-02"]').click();
 await availability.getByRole('button',{name:'Cerrar esta fecha',exact:true}).click();
 await availability.getByRole('status').filter({hasText:'Fecha cerrada'}).waitFor();
 assert.deepEqual(await page.evaluate(()=>window.__rows['artifacts/diverty-oficial/public/data/config_web/fechas_cerradas'].fechas),{'2026-10-09':true,'2026-11-02':true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await availability.getByRole('button',{name:'Cerrar calendario',exact:true}).click();
 await page.getByRole('button',{name:'Cerrar fechas de la web',exact:true}).click();
 await availability.getByRole('button',{name:'Reabrir esta fecha',exact:true}).waitFor();
 await page.setViewportSize({width:320,height:740});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.evaluate(()=>window.__failClosureSave=true);
 await availability.getByRole('button',{name:'Reabrir esta fecha',exact:true}).click();
 await availability.getByRole('alert').filter({hasText:'No se pudo guardar'}).waitFor();
 assert.equal(await page.evaluate(()=>window.__rows['artifacts/diverty-oficial/public/data/config_web/fechas_cerradas'].fechas['2026-11-02']),true);
 await page.evaluate(()=>window.__failClosureSave=false);
 await availability.getByRole('button',{name:'Reabrir esta fecha',exact:true}).click();
 await availability.getByRole('status').filter({hasText:'Fecha reabierta'}).waitFor();
 await availability.getByRole('button',{name:'Cerrar calendario',exact:true}).click();
 await page.setViewportSize({width:392,height:852});
 console.log('PASS: mobile calendar closes and reopens dates across months, persists after reopening and preserves existing events.');
 await page.getByRole('button',{name:'Finanzas',exact:true}).first().click();
 await page.getByRole('heading',{name:'Finanzas',exact:true}).waitFor();
 await page.getByText('Todo está cobrado',{exact:true}).waitFor({state:'hidden'});
 await page.locator('[data-finance-list="deudas"]').waitFor();
 assert.equal(await page.locator('[data-finance-list="deudas"]').getByRole('button',{name:'Marcar cobrado',exact:true}).count(),2);
 await page.getByRole('button',{name:'Inicio',exact:true}).first().click();
 await page.locator('[data-reservation-id="event-0000"]').waitFor();
 assert.deepEqual(errors,[]);console.log('PASS: authenticated panel, pending/confirmed cards, Agenda and Finanzas keep rendering with partial payments.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
