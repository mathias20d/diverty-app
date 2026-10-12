const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const origin=process.env.ORIGIN || 'http://127.0.0.1:5273';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
 try {
 for(const width of [392,1366]) {
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.addInitScript(()=>{
   const base='artifacts/diverty-oficial/public/data/';window.__writes=[];window.__rows={
    [base+'configuracion/serviciosCustom']:{paquetes:[]},[base+'configuracion/clientesOcultos']:{clients:[]},
    [base+'configuracion/migracion_segura_v2']:{done:true},[base+'configuracion/migracion_portal_v1']:{done:true},
    [base+'config_web/global']:{centralBookingValidation:false},[base+'config_web/web_sync']:{version:1,versions:{catalogo_web:1}},
    [base+'catalogo_web/show']:{nombre:'Show infantil',precio:100,serviciosLista:'Duración: 45 minutos'},
    [base+'eventos/legacy-duration']:{id:'legacy-duration',cliente:'Cliente anterior',telefono:'60000000',fecha:'2030-11-10',hora:'10:00',estado:'Confirmado',total:100,abono:0,servicio:'Show infantil',serviciosSeleccionados:[{id:'show',nombre:'Show infantil',precio:100,cantidad:1}],costosSeparados:true},
   };window.confirm=()=>true;
  });
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();
   if(url.pathname==='/@vite/client')return route.fulfill({contentType:'text/javascript',body:require('./vite-test-client.cjs')});
   if(url.pathname==='/src/lib/firebase-auth.mjs')return route.fulfill({contentType:'text/javascript',body:"export const ADMIN_UID='test-admin';export const app={};export const auth={currentUser:{uid:ADMIN_UID}};export const LOGO_URL='';export const firebaseConfig={};"});
   if(url.pathname.includes('firebase_auth.js'))return route.fulfill({contentType:'text/javascript',body:"export const onAuthStateChanged=(_a,next)=>{queueMicrotask(()=>next({uid:'test-admin'}));return()=>{};};export const signOut=async()=>{};export const signInWithEmailAndPassword=async()=>{};"});
   if(url.pathname.includes('firebase_firestore.js'))return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(__dirname,'reservation-fixture.mjs'),'utf8')});
   return route.continue();
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.setFixedTime(new Date('2030-11-10T13:00:00Z'));
  await page.goto(origin+'/?reservationId=legacy-duration');
  await page.getByRole('button',{name:'Orden de servicio',exact:true}).click();
  await page.locator('[aria-label="Servicios de la orden"] tr').filter({hasText:'Show infantil'}).getByText('0.75 horas',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Guardar',exact:true}).isEnabled(),true);
  assert.doesNotMatch(await page.locator('#pdf-content').innerText(),/Según reserva/);
  assert.equal(await page.evaluate(()=>window.__writes.filter(write=>write.path.endsWith('/eventos/legacy-duration')).length),0,'looking up old durations cannot change the reservation');
  await page.getByRole('button',{name:'Atrás',exact:true}).click();
  await page.getByRole('button',{name:'Inicio',exact:true}).first().click();
  await page.getByRole('button',{name:'Nueva Reserva',exact:true}).click();
  const modal=page.getByRole('dialog',{name:'Reserva',exact:true});
  await modal.locator('form input').nth(0).fill('Cliente personalizado');await modal.locator('form input').nth(1).fill('60000000');
  await modal.locator('input[type=date]').fill('2030-11-10');await modal.locator('input[type=time]').fill('14:00');
  await modal.getByPlaceholder('Buscar producto o servicio...').fill('Paquete personalizado');
  await modal.getByRole('button',{name:'Crear producto o servicio',exact:true}).click();
  const custom=modal.getByRole('heading',{name:'Crear producto o servicio',exact:true}).locator('..');
  await custom.getByPlaceholder('Ej. Hot dogs o Pintacaritas').fill('Paquete personalizado');await custom.getByPlaceholder('0.00').fill('180');
  await custom.getByRole('button',{name:'Agregar a lista',exact:true}).click();
  await page.getByText('Indica la duración del servicio personalizado en horas.',{exact:true}).waitFor();
  await custom.getByLabel('Duración del nuevo servicio en horas',{exact:true}).fill('1.5');
  await custom.getByRole('button',{name:'Agregar a lista',exact:true}).click();
  assert.equal(await modal.getByLabel('Duración de Paquete personalizado en horas',{exact:true}).inputValue(),'1.5');
  await modal.getByLabel('Cantidad de Paquete personalizado',{exact:true}).fill('2');
  assert.equal(await modal.getByLabel('Duración de Paquete personalizado en horas',{exact:true}).inputValue(),'1.5');
  assert.equal(await modal.getByLabel('Total de Paquete personalizado',{exact:true}).inputValue(),'360');
  await modal.getByLabel('Duración de Paquete personalizado en horas',{exact:true}).fill('3');
  assert.equal(await modal.getByLabel('Total de Paquete personalizado',{exact:true}).inputValue(),'360');
  await modal.getByRole('button',{name:'Guardar Reserva',exact:true}).click();await modal.waitFor({state:'hidden'});
  const saved=await page.evaluate(()=>Object.entries(window.__rows).find(([p])=>p.includes('/eventos/man-'))?.[1]);
  assert.equal(saved.serviciosSeleccionados[0].duracionHoras,3);assert.equal(saved.total,360);
  await page.getByRole('button',{name:'Agenda',exact:true}).first().click();
  const card=page.locator(`[data-reservation-id="${saved.id}"]`);await card.getByRole('heading',{name:'Cliente personalizado',exact:true}).click();
  await card.getByRole('button',{name:'Orden de servicio',exact:true}).click();
  const row=page.locator('[aria-label="Servicios de la orden"] tr').filter({hasText:'Paquete personalizado'});
  await row.getByText('3 horas',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Guardar',exact:true}).isEnabled(),true);
  await page.getByRole('button',{name:'Atrás',exact:true}).click();
  await card.getByRole('button',{name:'Editar',exact:true}).click();
  assert.equal(await modal.getByLabel('Duración de Paquete personalizado en horas',{exact:true}).inputValue(),'3');
  await modal.getByLabel('Duración de Paquete personalizado en horas',{exact:true}).fill('');
  await modal.getByRole('button',{name:'Actualizar Reserva',exact:true}).click();await modal.waitFor({state:'hidden'});
  await card.getByRole('button',{name:'Orden de servicio',exact:true}).click();
  await page.getByRole('button',{name:'Completar duración de la reserva',exact:true}).waitFor();
  for(const label of ['Guardar','Compartir','Imprimir PDF'])assert.equal(await page.getByRole('button',{name:label,exact:true}).isDisabled(),true,label);
  await page.getByRole('button',{name:'Completar duración de la reserva',exact:true}).click();
  await modal.getByLabel('Duración de Paquete personalizado en horas',{exact:true}).fill('2.5');
  await modal.getByRole('button',{name:'Actualizar Reserva',exact:true}).click();await modal.waitFor({state:'hidden'});
  await card.getByRole('button',{name:'Orden de servicio',exact:true}).click();
  await row.getByText('2.5 horas',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Guardar',exact:true}).isEnabled(),true);assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: historical web duration, custom required duration, save/edit, quantity/price independence, PDF duration and missing-duration correction.`);
  await context.close();
 }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
