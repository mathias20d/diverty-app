const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const origin=process.env.ORIGIN || 'http://127.0.0.1:5273';
const base='artifacts/diverty-oficial/public/data/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
 try {
  for(const width of [392,1366]) {
   const context=await browser.newContext({viewport:{width,height:900}});
   await context.addInitScript(({base})=>{
    window.__writes=[];window.__rows={
     [base+'configuracion/serviciosCustom']:{paquetes:[{id:'old',nombre:'Plan Recreativo',precio:80,descripcion:'Descripción antigua'}]},
     [base+'configuracion/clientesOcultos']:{clients:[]},
     [base+'configuracion/migracion_segura_v2']:{done:true},
     [base+'configuracion/migracion_portal_v1']:{done:true},
     [base+'config_web/global']:{centralBookingValidation:false},
     [base+'config_web/web_sync']:{version:1,versions:{catalogo_web:1}},
     [base+'catalogo_web/recreativo']:{nombre:'Plan Recreativo',precio:150,descripcion:'Diversión para los niños.',serviciosLista:'Juegos dirigidos\nGloboflexia\nPintacaritas\nDuración total 2 horas',incluye:['Música'],tipoCobro:'paquete'},
    };window.confirm=()=>true;
   },{base});
   await context.route('**/*',async route=>{
    const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();
    if(url.pathname==='/@vite/client')return route.fulfill({contentType:'text/javascript',body:require('./vite-test-client.cjs')});
    if(url.pathname==='/src/lib/firebase-auth.mjs')return route.fulfill({contentType:'text/javascript',body:"export const ADMIN_UID='test-admin';export const app={};export const auth={currentUser:{uid:ADMIN_UID}};export const LOGO_URL='';export const firebaseConfig={};"});
    if(url.pathname.includes('firebase_auth.js'))return route.fulfill({contentType:'text/javascript',body:"export const onAuthStateChanged=(_a,next)=>{queueMicrotask(()=>next({uid:'test-admin'}));return()=>{};};export const signOut=async()=>{};export const signInWithEmailAndPassword=async()=>{};"});
    if(url.pathname.includes('firebase_firestore.js'))return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(__dirname,'reservation-fixture.mjs'),'utf8')});
    return route.continue();
   });
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(origin);await page.getByRole('button',{name:'Nueva Reserva',exact:true}).click();
   const modal=page.getByRole('dialog',{name:'Reserva',exact:true});
   await page.getByText('Sincronizando catálogo de la web...',{exact:true}).waitFor({state:'hidden'});
   await modal.locator('form input').nth(0).fill('Cliente de prueba');await modal.locator('form input').nth(1).fill('60000000');
   await modal.locator('input[type=date]').fill('2030-11-10');await modal.locator('input[type=time]').fill('14:00');
   await modal.getByPlaceholder('Buscar producto o servicio...').fill('Plan Recreativo');
   assert.equal(await modal.locator('[data-service-option]').count(),1);
   await modal.locator('[data-service-option=recreativo]').click();
   const description=modal.getByText('Descripción para el PDF',{exact:true}).locator('..').locator('textarea');
   const copied=await description.inputValue();
   for(const text of ['Diversión para los niños.','Juegos dirigidos','Globoflexia','Pintacaritas','Música','Duración total 2 horas'])assert.ok(copied.includes(text),text);
   assert.equal(await modal.getByLabel('Total de Plan Recreativo',{exact:true}).inputValue(),'150');
   await modal.getByRole('button',{name:'Agregar responsable',exact:true}).click();
   await modal.getByLabel('Nombre del responsable 1',{exact:true}).fill('Ana Animadora');
   await modal.getByLabel('Función del responsable 1',{exact:true}).selectOption('Animador(a)');
   await modal.getByRole('button',{name:'Agregar responsable',exact:true}).click();
   await modal.getByLabel('Nombre del responsable 2',{exact:true}).fill('María Pintacaritas');
   await modal.getByLabel('Función del responsable 2',{exact:true}).selectOption('Pintacaritas');
   // A remote web edit updates available choices, never the already booked line.
   await page.evaluate(({base})=>{
    window.__rows[base+'catalogo_web/recreativo'].descripcion='Nueva descripción web';
    window.__rows[base+'catalogo_web/recreativo'].serviciosLista='Magia\nDuración total 3 horas';
    window.__rows[base+'catalogo_web/recreativo'].precio=200;
    window.__rows[base+'config_web/web_sync']={version:2,versions:{catalogo_web:2}};
    window.__listeners.filter(item=>item.path===base+'config_web/web_sync').forEach(item=>item.emit());
   },{base});
   await page.waitForFunction(({base})=>window.__reads.filter(p=>p===base+'catalogo_web').length===2,{base});
   assert.equal(await description.inputValue(),copied);
   await modal.getByRole('button',{name:'Guardar Reserva',exact:true}).click();await modal.waitFor({state:'hidden'});
   const saved=await page.evaluate(({base})=>Object.entries(window.__rows).find(([p])=>p.startsWith(base+'eventos/man-'))?.[1],{base});
   assert.ok(saved);assert.equal(saved.total,150);assert.equal(saved.serviciosSeleccionados[0].descripcion,copied);assert.equal(saved.serviciosSeleccionados[0].duracionHoras,2);
   assert.equal(saved.personalResponsable.length,2);assert.deepEqual(saved.subcontratos,[]);
   assert.match(saved.descripcionEvento,/Juegos dirigidos/);assert.match(saved.descripcionEvento,/Música/);
   await page.getByRole('button',{name:'Clientes',exact:true}).first().click();
   await page.getByRole('heading',{name:'Cliente de prueba',exact:true}).click();
   await page.getByRole('button',{name:/Eventos/}).click();
   await page.getByRole('button').filter({hasText:'2030'}).filter({hasText:'Plan Recreativo'}).click();
   await modal.getByLabel('Nombre del responsable 1',{exact:true}).waitFor();
   assert.equal(await modal.getByLabel('Nombre del responsable 2',{exact:true}).inputValue(),'María Pintacaritas');
   assert.equal(await description.inputValue(),copied);
   await modal.getByLabel('Actualizar descripción de Plan Recreativo desde la web',{exact:true}).click();
   assert.match(await description.inputValue(),/Nueva descripción web/);assert.match(await description.inputValue(),/Magia/);
   assert.equal(await modal.getByLabel('Total de Plan Recreativo',{exact:true}).inputValue(),'150');
   await modal.getByRole('button',{name:'Actualizar Reserva',exact:true}).click();await modal.waitFor({state:'hidden'});
   assert.equal(await page.evaluate(({base})=>window.__reads.filter(p=>p===base+'catalogo_web').length,{base}),2,'reopening reuses the web cache');
   const updated=await page.evaluate(({base,id})=>window.__rows[base+'eventos/'+id],{base,id:saved.id});
   await page.evaluate(async event=>{
    const {default:React}=await import('/node_modules/.vite/deps/react.js');const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');const {default:Pdf}=await import('/src/modules/documents/PdfTemplate.jsx');
    document.getElementById('root').style.display='none';const div=document.createElement('div');document.body.appendChild(div);
    ReactDOM.createRoot(div).render(React.createElement(Pdf,{printData:event,printType:'orden_servicio',pdfScale:1,logoUrl:'',appSettings:{empresa:{}},utils:{safeNum:v=>Number(v)||0,normalizeText:v=>String(v||'').toLowerCase(),formatTime12h:v=>v,getLocalYYYYMMDD:()=> '2026-10-12'},onClose:()=>{},onPrint:()=>{},onDownload:()=>{},onShare:()=>{}}));
   },updated);
   await page.getByText('Ana Animadora',{exact:true}).waitFor();
   const order=await page.locator('#pdf-content').innerText();assert.match(order,/María Pintacaritas/);assert.match(order,/Pintacaritas/);assert.match(order,/Magia/);assert.doesNotMatch(order,/Costo|Abono/);
   assert.deepEqual(errors,[]);
   console.log(`PASS ${width}px: web catalogue wins duplicates, full details/duration, independent named staff, save/reopen, live sync/cache and explicit refresh without repricing.`);
   await context.close();
  }
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
