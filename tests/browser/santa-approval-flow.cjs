const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const origin=process.env.ORIGIN || 'http://127.0.0.1:5173';
const base='artifacts/diverty-oficial/public/data/';
// All data and Firebase sessions are simulated; no external request is allowed.
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({viewport:{width:392,height:852},timezoneId:'America/Panama'});
  await context.addInitScript(()=>{
   const base='artifacts/diverty-oficial/public/data/';
   window.__rows={};window.__writes=[];window.__alerts=[];
   window.__rows[base+'configuracion/serviciosCustom']={paquetes:[]};
   window.__rows[base+'configuracion/clientesOcultos']={clients:[]};
   window.__rows[base+'configuracion/migracion_segura_v2']={done:true};
   window.__rows[base+'config_web/global']={centralBookingValidation:false,capacidadSanta:2};
   const common={estado:'Pendiente',origen:'Web Directa',esNavidad:true,recursoNavidad:'Santa',servicio:'Entregas de Nochebuena',fecha:'2026-12-24',ubicacion:'Panamá Centro',direccion:'PH Las Palmeras, entrada por la garita',referenciaLugar:'Salón social',telefono:'60000000',email:'test@example.invalid',total:'75',transporte:'0',abono:'0',ownerUid:'test-customer',comentarios:'Conservar estas indicaciones'};
   for(const [id,data] of [['manual',{cliente:'Santa sin GPS',hora:'17:00'}],['transport',{cliente:'Santa transporte pendiente',hora:'18:00',ubicacion:'Ubicación por confirmar',requiereRevisionUbicacion:true,totalPendienteTransporte:true}],['gps',{cliente:'Santa con GPS',hora:'19:00',lat:9.0123,lng:-79.5012}]])window.__rows[base+'eventos/'+id]={...common,...data,id};
   window.alert=message=>window.__alerts.push(message);window.confirm=()=>true;
  });
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin!==origin)return route.abort();
   if(url.pathname==='/@vite/client')return route.fulfill({contentType:'text/javascript',body:require('./vite-test-client.cjs')+"\nexport const injectQuery=(url,query)=>url+(url.includes('?')?'&':'?')+query;"});
   if(url.pathname==='/src/lib/firebase-auth.mjs')return route.fulfill({contentType:'text/javascript',body:"export const ADMIN_UID='test-admin';export const app={};export const auth={currentUser:{uid:ADMIN_UID}};export const LOGO_URL='';export const firebaseConfig={};"});
   if(url.pathname.includes('firebase_auth.js'))return route.fulfill({contentType:'text/javascript',body:"export const onAuthStateChanged=(_a,next)=>{queueMicrotask(()=>next({uid:'test-admin'}));return ()=>{};};export const signOut=async()=>{};export const signInWithEmailAndPassword=async()=>{};"});
   if(url.pathname.includes('firebase_firestore.js'))return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(__dirname,'reservation-fixture.mjs'),'utf8')});
   return route.continue();
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-10-07T15:00:00Z'));await page.goto(origin);
  try{await page.getByRole('button',{name:'Nueva Reserva',exact:true}).waitFor({timeout:20000});}catch(error){console.error({pageErrors:errors,text:await page.locator('body').innerText()});throw error;}
  const open=async name=>{await page.getByRole('button',{name:'Solicitudes web',exact:true}).click();await page.getByRole('button').filter({has:page.getByRole('heading',{name,exact:true})}).click();};
  const accept=async()=>{const button=page.getByRole('button',{name:'Aceptar reserva',exact:true});assert.equal(await button.isEnabled(),true);await button.click();await page.getByRole('heading',{name:'¡Reserva confirmada!',exact:true}).waitFor();await page.getByRole('button',{name:'Cerrar',exact:true}).click();};
  const row=async id=>page.evaluate(key=>window.__rows[key],base+'eventos/'+id);
  await open('Santa sin GPS');
  const details=page.locator('details').filter({hasText:'Añadir GPS (opcional)'});assert.equal(await details.getAttribute('open'),null);
  assert.equal(await page.getByText('Dirección por confirmar',{exact:true}).count(),0);
  await page.locator('select').selectOption('Santa 2');await accept();
  const manual=await row('manual');assert.equal(manual.estado,'Confirmado');assert.equal(manual.santaAsignado,'Santa 2');assert.equal(manual.direccion,'PH Las Palmeras, entrada por la garita');assert.equal(manual.comentarios,'Conservar estas indicaciones');assert.equal('lat' in manual,false);assert.equal('lng' in manual,false);
  assert.equal(await page.evaluate(key=>window.__rows[key].estado,base+'reservas_cliente/manual'),'Confirmado');
  await open('Santa transporte pendiente');assert.equal(await page.getByRole('button',{name:'Revisa transporte',exact:true}).isEnabled(),false);
  await page.getByRole('button',{name:'Confirmar transporte',exact:true}).click();await page.getByRole('button',{name:'Aceptar reserva',exact:true}).waitFor();await accept();
  assert.equal((await row('transport')).transporteRevisadoEnApp,true);
  await open('Santa con GPS');assert.equal(await page.getByText('Añadir GPS (opcional)',{exact:true}).count(),0);await accept();
  const gps=await row('gps');assert.equal(gps.lat,9.0123);assert.equal(gps.lng,-79.5012);assert.equal(gps.estado,'Confirmado');
  assert.deepEqual(await page.evaluate(()=>window.__alerts),[]);assert.deepEqual(errors,[]);
  console.log('PASS: mobile Santa approval accepts written addresses without GPS, preserves existing GPS and customer data, keeps transport review and synchronizes the receipt.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
