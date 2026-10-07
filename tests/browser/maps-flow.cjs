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
  window.__rows[base+'eventos/event-0000'].direccion='https://www.google.com/maps/place/PH+Prueba/@9.01295,-79.50180,19z/data=!4m6!3m5!1sabc!8m2!3d9.01234567!4d-79.50123456!16sxyz';
  Object.assign(window.__rows[base+'eventos/event-0001'],{lat:9.0333,lng:-79.0555,direccion:'https://www.google.com/maps?q=9.1,-79.4'});
  window.__opened=[];window.open=url=>window.__opened.push(url);
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

 await page.getByRole('button',{name:'Nueva Reserva',exact:true}).waitFor({timeout:20000});
 for(const [id,point] of [['event-0000','9.01234567,-79.50123456'],['event-0001','9.0333,-79.0555']]){
  const card=page.locator(`[data-reservation-id="${id}"]`);await card.waitFor();
  await card.locator('h3').click();
  await card.locator('[title="Abrir en Google Maps"]').first().click();
  await page.getByRole('button',{name:'Google Maps Mapa y ruta',exact:true}).click();
  let opened=await page.evaluate(()=>window.__opened.at(-1));assert.equal(new URL(opened).searchParams.get('query'),point);
  await card.locator('[title="Abrir en Google Maps"]').first().click();
  await page.getByRole('button',{name:'Waze Navegar ahora',exact:true}).click();
  opened=await page.evaluate(()=>window.__opened.at(-1));assert.equal(new URL(opened).searchParams.get('ll'),point);
 }
 assert.deepEqual(errors,[]);console.log('PASS: Google Maps and Waze open the place pin and preserve saved numeric coordinates.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
