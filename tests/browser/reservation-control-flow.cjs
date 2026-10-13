const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const origin=process.env.ORIGIN||'http://127.0.0.1:5273';
const base='artifacts/diverty-oficial/public/data/';
// Fictional records only. Every external request, including Firebase, is blocked.
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const width of [320,392,1366]){
   const context=await browser.newContext({viewport:{width,height:852},timezoneId:'America/Panama',hasTouch:width<900});
   await context.addInitScript(()=>{
    const base='artifacts/diverty-oficial/public/data/';window.__rows={};window.__writes=[];
    for(const name of ['migracion_segura_v2','migracion_portal_v1'])window.__rows[base+'configuracion/'+name]={done:true};
    window.__rows[base+'configuracion/serviciosCustom']={paquetes:[]};window.__rows[base+'configuracion/clientesOcultos']={clients:[]};
    window.__rows[base+'config_web/global']={centralBookingValidation:false};
    window.__rows[base+'catalogo_web/plan']={nombre:'Plan recreativo',duracionHoras:2,precio:150,visible:true};
    const event={fecha:'2026-10-22',hora:'14:00',estado:'Confirmado',servicio:'Plan recreativo',total:150,abono:25,
     numeroFactura:'FAC-EJEMPLO-001',numeroContrato:'CON-EJEMPLO-001',numeroCotizacion:'COT-EJEMPLO-001',
     telefono:'60000000',direccion:'Salón ficticio',referenciaLugar:'Entrada ficticia',ubicacion:'Panamá',
     serviciosSeleccionados:[{id:'plan',nombre:'Plan recreativo',precio:150,cantidad:1}],costosSeparados:true,_rev:3};
    const records={
     web:{...event,cliente:'Solicitud ficticia',estado:'Pendiente',origen:'Web Directa',abono:0},
     quote:{...event,cliente:'Cotización ficticia',estado:'Cotización',fecha:'2026-09-01',abono:0},
     manual:{...event,cliente:'Reserva manual ficticia',estado:'Pendiente',abono:0},
     normal:{...event,cliente:'Cliente con responsable de ejemplo',personalResponsable:[{nombre:'Animadora Ana de ejemplo',rol:'Animador(a)'}]},
     complete:{...event,cliente:'Evento realizado con saldo',estado:'Completado',fecha:'2026-09-10'},
     cancel:{...event,cliente:'Cancelada ficticia',estado:'Cancelado',abono:0},
     paid:{...event,cliente:'Pagada ficticia',abono:150,personalResponsable:[{nombre:'Otro encargado',rol:'Payaso(a)'}]},
     trash:{...event,cliente:'Oculta ficticia',deletedLocally:true},
    };
    for(let i=0;i<35;i++)records['historic-'+i]={...event,cliente:'Histórica '+i,estado:'Completado',fecha:'2026-09-01',abono:150};
    for(const[id,data]of Object.entries(records))window.__rows[base+'eventos/'+id]={...data,id};
    const persisted=sessionStorage.getItem('firebase-fixture-rows');if(persisted)window.__rows=JSON.parse(persisted);
    window.prompt=()=>window.__paymentAmount||'25';window.alert=()=>{};
    const viewport=new EventTarget();let height=innerHeight,offsetTop=0;
    Object.defineProperties(viewport,{height:{get:()=>height},offsetTop:{get:()=>offsetTop},scale:{get:()=>1}});
    Object.defineProperty(window,'visualViewport',{value:viewport,configurable:true});
    window.__viewport=(nextHeight,nextTop=0)=>{height=nextHeight;offsetTop=nextTop;viewport.dispatchEvent(new Event('resize'));};
   });
   await context.route('**/*',async route=>{
    const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();
    if(url.pathname==='/@vite/client')return route.fulfill({contentType:'text/javascript',body:require('./vite-test-client.cjs')});
    if(url.pathname==='/src/lib/firebase-auth.mjs')return route.fulfill({contentType:'text/javascript',body:"export const ADMIN_UID='test-admin';export const app={};export const auth={currentUser:{uid:ADMIN_UID}};export const LOGO_URL='/icon-512.png';export const firebaseConfig={};"});
    if(url.pathname.includes('firebase_auth.js'))return route.fulfill({contentType:'text/javascript',body:"export const onAuthStateChanged=(_auth,next)=>{queueMicrotask(()=>next({uid:'test-admin'}));return()=>{};};export const signOut=async()=>{};export const signInWithEmailAndPassword=async()=>{};"});
    if(url.pathname.includes('firebase_firestore.js')){
     let fixture=fs.readFileSync(path.join(__dirname,'reservation-fixture.mjs'),'utf8');
     fixture=fixture.replace("export const getDocs=async ref=>{","export const getDocs=async ref=>{if(window.__failHistory && ref.path.endsWith('/eventos'))throw new Error('offline history');");
     fixture=fixture.replace("export const setDoc=async(ref,data,options)=>{","export const setDoc=async(ref,data,options)=>{if(window.__stallSync && ref.path.endsWith('/syncBus'))return new Promise(()=>{});");
     return route.fulfill({contentType:'text/javascript',body:fixture});
    }
    return route.continue();
   });
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.clock.setFixedTime(new Date('2026-10-12T15:00:00Z'));await page.goto(origin);
   const control=page.getByRole('dialog',{name:'Control de reservas',exact:true});
   const row=id=>control.locator(`[data-control-id="${id}"]:visible`);
   const open=async()=>{await page.getByRole('button',{name:'Control de reservas',exact:true}).click();await control.waitFor();await control.getByRole('status').filter({hasText:'Cargando reservas'}).waitFor({state:'hidden'});};
   await page.getByRole('button',{name:'Nueva Reserva',exact:true}).waitFor();
   await page.evaluate(()=>window.__failHistory=true);await open();
   await control.getByRole('alert').filter({hasText:'No se pudo completar'}).waitFor();
   await page.evaluate(()=>window.__failHistory=false);await control.getByRole('button',{name:'Reintentar reservas',exact:true}).click();
   await control.getByRole('button',{name:'Cotizaciones (1)',exact:true}).waitFor();
   await row('quote').waitFor();assert.equal(await control.locator('[data-control-id]:visible').count(),3);
   await control.getByRole('button',{name:'Cotizaciones (1)',exact:true}).click();await row('quote').getByRole('button',{name:'Seguimiento',exact:true}).click();
   await control.getByLabel('Situación del contacto').selectOption('esperando_cliente');await control.getByLabel('Próximo contacto').fill('2026-10-15');
   await control.getByLabel('Nota de seguimiento').fill('Cotización enviada. Confirmar por teléfono.');
   if(width<900){
    await page.evaluate(()=>window.__viewport(400,30));
    await page.waitForFunction(()=>{const el=document.querySelector('[aria-label="Control de reservas"]');return el&&el.getBoundingClientRect().bottom<=431;});
    await control.getByRole('button',{name:'Guardar seguimiento',exact:true}).scrollIntoViewIfNeeded();
    assert.ok((await control.getByRole('button',{name:'Guardar seguimiento',exact:true}).boundingBox()).y<430);
    await page.evaluate(()=>window.__viewport(innerHeight));
   }
   await page.evaluate(()=>window.__failClosureSave=true);await control.getByRole('button',{name:'Guardar seguimiento',exact:true}).click();
   await control.getByRole('alert').filter({hasText:'Tus campos se conservaron'}).waitFor();
   assert.equal(await control.getByLabel('Nota de seguimiento').inputValue(),'Cotización enviada. Confirmar por teléfono.');
   await page.evaluate(()=>{window.__failClosureSave=false;window.__stallSync=true;});await control.getByRole('button',{name:'Guardar seguimiento',exact:true}).click();
   await control.getByRole('status').filter({hasText:'Seguimiento guardado'}).waitFor();
   await page.evaluate(()=>window.__stallSync=false);
   let quote=await page.evaluate(base=>window.__rows[base+'eventos/quote'],base);assert.equal(quote.estado,'Cotización');assert.equal(quote.abono,0);
   assert.equal(quote.seguimientoComercial.estado,'esperando_cliente');assert.equal(quote.numeroCotizacion,'COT-EJEMPLO-001');
   await row('quote').getByRole('button',{name:'Seguimiento',exact:true}).click();
   await page.evaluate(base=>{window.__rows[base+'eventos/quote'].seguimientoComercial.nota='Nota del otro equipo';window.__rows[base+'eventos/quote'].abono=10;},base);
   await control.getByLabel('Nota de seguimiento').fill('Cambio anterior');await control.getByRole('button',{name:'Guardar seguimiento',exact:true}).click();
   await control.getByRole('alert').filter({hasText:'Otro equipo cambió'}).waitFor();
   await control.getByRole('button',{name:'Cancelar seguimiento',exact:true}).click();await row('quote').getByRole('button',{name:'Seguimiento',exact:true}).click();
   assert.equal(await control.getByLabel('Nota de seguimiento').inputValue(),'Nota del otro equipo');
   await control.getByRole('button',{name:'Cancelar seguimiento',exact:true}).click();
   await control.getByRole('button',{name:'Con saldo (3)',exact:true}).click();await row('complete').waitFor();
   await row('normal').getByRole('button',{name:'Registrar abono',exact:true}).click();await row('normal').getByText('Recibido $50.00',{exact:false}).waitFor();
   const saved=await page.evaluate(base=>window.__rows[base+'eventos/normal'],base);assert.equal(saved.abono,50);assert.equal(saved.total,150);assert.equal(saved.personalResponsable[0].nombre,'Animadora Ana de ejemplo');
   await control.getByLabel('Buscar en el control').fill('animadora ana');assert.equal(await control.locator('[data-control-id]:visible').count(),1);await row('normal').waitFor();
   await control.getByRole('button',{name:'Limpiar filtros',exact:true}).click();await control.getByRole('button',{name:'Mostrar más registros',exact:true}).waitFor();
   assert.equal(await control.locator('[data-control-id]:visible').count(),30);await control.getByRole('button',{name:'Mostrar más registros',exact:true}).click();
   assert.equal(await control.locator('[data-control-id]:visible').count(),42);assert.equal(await row('trash').count(),0);
   await control.getByRole('button',{name:'Por preparar (1)',exact:true}).click();await row('manual').getByText('Por completar: Personal',{exact:true}).waitFor();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(process.env.SCREENSHOT_DIR){await page.getByText('Abono de $25.00 registrado correctamente.',{exact:true}).waitFor({state:'hidden'});fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await control.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`control-reservas-${width}.png`)});}
   // The same paper order/staff editor is reused, without opening the full reservation.
   await row('manual').getByRole('button',{name:'Personal / orden',exact:true}).click();await page.getByRole('heading',{name:'ORDEN DE SERVICIO',exact:true}).waitFor();
   await page.getByRole('button',{name:'Asignar / cambiar personal',exact:true}).click();
   await page.getByLabel('Nombre en la orden 1',{exact:true}).fill('Payasito de ejemplo');
   await page.getByLabel('Función en la orden 1',{exact:true}).selectOption('Payaso(a)');await page.getByRole('button',{name:'Guardar personal',exact:true}).click();
   await page.locator('#pdf-content').getByText('Payasito de ejemplo',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Atrás',exact:true}).click();await open();
   await control.getByRole('button',{name:'Por preparar (0)',exact:true}).waitFor();
   await control.getByRole('button',{name:'Todas (42)',exact:true}).click();await control.getByLabel('Buscar en el control').fill('Reserva manual ficticia');
   await row('manual').getByRole('button',{name:'Avanzar estado',exact:true}).click();await row('manual').getByText(/Confirmado/).waitFor();
   // Web requests cannot bypass the existing acceptance panel.
   await control.getByLabel('Buscar en el control').fill('');await control.getByRole('button',{name:'Solicitudes web (1)',exact:true}).click();
   assert.equal(await row('web').getByRole('button',{name:'Avanzar estado',exact:true}).count(),0);
   await row('web').getByRole('button',{name:'Revisar solicitud',exact:true}).click();await page.getByRole('heading',{name:'Solicitud Web',exact:true}).waitFor();
   assert.equal((await page.evaluate(base=>window.__rows[base+'eventos/web'],base)).estado,'Pendiente');
   // Preserve the fake backend across a page reload; the app itself stores this in Firestore.
   await page.evaluate(()=>sessionStorage.setItem('firebase-fixture-rows',JSON.stringify(window.__rows)));
   await page.reload();await open();await control.getByRole('button',{name:'Cotizaciones (1)',exact:true}).click();await row('quote').getByText('Nota del otro equipo',{exact:true}).waitFor();
   // Escape closes the panel and restores the launch button's focus.
   await control.getByRole('button',{name:'Cerrar',exact:true}).focus();await page.keyboard.press('Escape');await control.waitFor({state:'hidden'});
   assert.equal(await page.getByRole('button',{name:'Control de reservas',exact:true}).evaluate(el=>el===document.activeElement),true);
   assert.deepEqual(errors,[]);console.log(`PASS ${width}px: full history, filtering, pagination, follow-up failure/conflict, payment, staff/order, workflow and safe web review.`);
   await context.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
