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
  for(let i=0;i<1200;i++)window.__rows[base+'eventos/event-'+String(i).padStart(4,'0')]={id:'event-'+String(i).padStart(4,'0'),cliente:'Cliente '+i%100,telefono:'6000'+String(i%100).padStart(4,'0'),email:'cliente'+i%100+'@example.invalid',fecha:'2026-10-05',hora:'10:00',estado:'Completado',total:100,abono:100,servicio:'Paquete 1',serviciosSeleccionados:[{id:'pkg1',nombre:'Paquete 1',precio:100,precioOriginal:100,cantidad:1}],costosSeparados:true};
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
 await page.goto(origin);await page.getByRole('button',{name:'Nueva Reserva',exact:true}).waitFor({timeout:30000});
 await page.getByRole('button',{name:'Clientes',exact:true}).first().click();await page.getByPlaceholder('Buscar cliente...').waitFor();
 await page.getByPlaceholder('Buscar cliente...').fill('Cliente 0');await page.getByRole('heading',{name:'Cliente 0',exact:true}).click();
 const measurements=[];const parentRenders=[];
 for(let i=0;i<5;i++){
 const before=await page.evaluate(()=>window.__appRenders||0);
 const time=await page.evaluate(async()=>{const button=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Reservar');const start=performance.now();button.click();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return performance.now()-start;});
 await page.getByRole('heading',{name:'Nueva Reserva',exact:true}).waitFor();
 measurements.push(time);parentRenders.push((await page.evaluate(()=>window.__appRenders||0))-before);
 if(i<4){await page.getByRole('heading',{name:'Nueva Reserva',exact:true}).locator('..').locator('button').last().click();await page.waitForTimeout(300);}
 }
 const time=[...measurements].sort((a,b)=>a-b)[2];
 console.log('Opening at 4x CPU throttle, 1200 events/302 catalog items (5 samples, median): '+time.toFixed(1)+'ms');
 console.log('Samples: '+JSON.stringify(measurements.map(x=>Math.round(x)))+'; main App renders per opening: '+JSON.stringify(parentRenders));
 console.log('Name on client reservation: '+await page.locator('form input').first().inputValue());
 console.log('Browser errors: '+JSON.stringify(errors));
 if(process.env.BROWSER_ARTIFACT_DIR){fs.mkdirSync(process.env.BROWSER_ARTIFACT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.BROWSER_ARTIFACT_DIR,'client-reservation.png')});}
 assert.equal(await page.locator('form input').nth(0).inputValue(),'Cliente 0');
 assert.equal(await page.locator('form input').nth(1).inputValue(),'60000000');
 assert.equal(await page.locator('form input').nth(2).inputValue(),'cliente0@example.invalid');
 const modal=page.getByRole('dialog',{name:'Reserva',exact:true});
 // Avoid matching the selected concept card by selecting the dropdown button text.
 const choose=async name=>{await modal.getByPlaceholder('Buscar producto o servicio...').fill(name);await modal.locator('button').filter({has:page.locator('span').filter({hasText:new RegExp('^'+name+'$')})}).click();};
 await choose('Hot dogs');await modal.getByLabel('Cobrar Hot dogs por',{exact:true}).selectOption('unidad');
 await modal.getByLabel('Cantidad de Hot dogs',{exact:true}).fill('200');
 assert.equal(await modal.getByLabel('Total de Hot dogs',{exact:true}).inputValue(),'400');
 await choose('Pintacaritas');await modal.getByLabel('Horas de Pintacaritas',{exact:true}).fill('2');
 assert.equal(await modal.getByLabel('Total de Pintacaritas',{exact:true}).inputValue(),'50');
 await modal.getByLabel('Aumentar Pintacaritas',{exact:true}).click();
 assert.equal(await modal.getByLabel('Horas de Pintacaritas',{exact:true}).inputValue(),'3');
 assert.equal(await modal.getByLabel('Total de Pintacaritas',{exact:true}).inputValue(),'75');
 await modal.getByLabel('Horas de Pintacaritas',{exact:true}).fill('2');
 await modal.locator('input[type=date]').fill('2030-11-10');await modal.locator('input[type=time]').fill('10:00');
 await modal.getByRole('button',{name:'Guardar Reserva',exact:true}).click();
 await modal.waitFor({state:'hidden'});
 const saved=await page.evaluate(()=>Object.entries(window.__rows).filter(([path])=>path.includes('/eventos/man-')).at(-1)?.[1]);
 assert.ok(saved,'new reservation persisted');assert.equal(saved.total,450);assert.equal(saved.abono,0);
 assert.equal(saved.cliente,'Cliente 0');assert.equal(saved.email,'cliente0@example.invalid');
 assert.equal(saved.serviciosSeleccionados[0].cantidad,'200');assert.equal(saved.serviciosSeleccionados[0].tipoCobro,'unidad');
 assert.equal(saved.serviciosSeleccionados[1].duracionHoras,2);
 console.log('PASS: saved 200 Hot dogs at $2 and 2 hours at $25 with correct contacts and total $450.');
 // Reopen the saved reservation through the actual client history.
 await page.getByRole('button',{name:'Eventos',exact:false}).filter({hasText:'13'}).click();
 await page.getByRole('button').filter({hasText:'2030'}).filter({hasText:'Hot dogs'}).click();
 const edit=page.getByRole('dialog',{name:'Reserva',exact:true});
 assert.equal(await edit.getByLabel('Cantidad de Hot dogs',{exact:true}).inputValue(),'200');
 assert.equal(await edit.getByLabel('Horas de Pintacaritas',{exact:true}).inputValue(),'2');
 await edit.getByLabel('Horas de Pintacaritas',{exact:true}).fill('3');
 await edit.getByRole('button',{name:'Actualizar Reserva',exact:true}).click();await edit.waitFor({state:'hidden'});
 const edited=await page.evaluate(id=>window.__rows['artifacts/diverty-oficial/public/data/eventos/'+id],saved.id);
 assert.equal(edited.total,475);assert.equal(edited.serviciosSeleccionados[1].duracionHoras,3);
 console.log('PASS: reopening and editing retained units, rates and hours; total updated to $475.');
 // An unrelated saved draft must not replace the chosen client's contact details.
 await page.evaluate(saved=>{const draft={...saved,cliente:'Otro borrador',telefono:'69999999',email:'otro@example.invalid',serviciosSeleccionados:[],servicio:'',total:'',abono:''};delete draft.id;localStorage.setItem('diverty_form_draft',JSON.stringify(draft));},saved);
 await page.getByRole('button',{name:'Reservar',exact:true}).click();
 assert.equal(await page.getByRole('dialog',{name:'Reserva',exact:true}).locator('form input').first().inputValue(),'Cliente 0');
 await page.goBack();await page.getByRole('dialog',{name:'Reserva',exact:true}).waitFor({state:'hidden'});
 await page.getByPlaceholder('Buscar cliente...').waitFor();
 console.log('PASS: client data overrides unrelated drafts; browser Back closes only the reservation.');
 await page.getByRole('button',{name:'Inicio',exact:true}).first().click();
 await page.getByRole('button',{name:'Nueva Reserva',exact:true}).click();
 const fresh=page.getByRole('dialog',{name:'Reserva',exact:true});
 assert.equal(await fresh.locator('form input').first().inputValue(),'Otro borrador');
 await fresh.getByPlaceholder('Buscar producto o servicio...').fill('Concepto nuevo');
 await fresh.getByRole('button',{name:'Crear producto o servicio',exact:true}).click();
 const custom=fresh.getByRole('heading',{name:'Crear producto o servicio',exact:true}).locator('..');
 await custom.getByPlaceholder('Ej. Hot dogs o Pintacaritas').fill('Servicio nuevo por horas');
 await custom.getByLabel('Cobro del nuevo concepto').selectOption('hora');
 await custom.getByPlaceholder('0.00').fill('25');
 await custom.getByRole('button',{name:'Agregar a lista',exact:true}).click();
 await fresh.getByLabel('Horas de Servicio nuevo por horas',{exact:true}).fill('4');
 assert.equal(await fresh.getByLabel('Total de Servicio nuevo por horas',{exact:true}).inputValue(),'100');
 assert.equal(await fresh.locator('form input').first().inputValue(),'Otro borrador');
 console.log('PASS: generic creation still recovers drafts; custom hourly catalog updates preserve the form.');
 await fresh.getByRole('heading',{name:'Nueva Reserva',exact:true}).locator('..').locator('button').last().click();
 // Render the actual PDF component with the saved lines, without contacting Firebase.
 await page.evaluate(async data=>{
  const {default:React}=await import('/node_modules/.vite/deps/react.js');
  const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');
  const {default:Pdf}=await import('/src/modules/documents/PdfTemplate.jsx');
  const div=document.createElement('div');div.id='reservation-pdf-test';document.body.appendChild(div);
  const root=ReactDOM.createRoot(div);
  const props={utils:{safeNum:v=>Number(v)||0,normalizeText:v=>String(v||'').toLowerCase(),formatTime12h:v=>v,getLocalYYYYMMDD:()=> '2026-10-06'},logoUrl:'',printData:data,printType:'factura',pdfScale:1,onClose:()=>{},onPrint:()=>{},onShare:()=>{},onDownload:()=>{},appSettings:{empresa:{}}};
  root.render(React.createElement(Pdf,props));window.__pdfTest={root,React,Pdf,props};
 },edited);
 await page.locator('#reservation-pdf-test table').first().waitFor();
 const productRow=page.locator('#reservation-pdf-test tr').filter({hasText:'Hot dogs'});
 assert.match(await productRow.innerText(),/200/);assert.match(await productRow.innerText(),/2\.00/);assert.match(await productRow.innerText(),/400\.00/);
 const hourlyRow=page.locator('#reservation-pdf-test tr').filter({hasText:'Pintacaritas'});
 assert.match(await hourlyRow.innerText(),/3 Horas/);assert.match(await hourlyRow.innerText(),/25\.00/);assert.match(await hourlyRow.innerText(),/75\.00/);
 await page.evaluate(()=>{const {root,React,Pdf,props}=window.__pdfTest;const line={nombre:'Pintacaritas',tipoCobro:'hora',cantidad:0.5,precio:12.5,precioOriginal:25,duracionHoras:0.5};root.render(React.createElement(Pdf,{...props,printType:'cotizacion',printData:{...props.printData,total:999,servicio:'Pintacaritas (x0.5)',serviciosSeleccionados:[line]}}));});
 await page.locator('#reservation-pdf-test tr').filter({hasText:'Pintacaritas'}).getByText('0.5 Horas',{exact:true}).waitFor();
 assert.match(await page.locator('#reservation-pdf-test table').innerText(),/12\.50/);
 console.log('PASS: invoice shows unit/hour rates and line totals; half-hour quotation retains its selected service.');
 assert.deepEqual(errors,[]);
 assert.ok(await page.evaluate(()=>window.__appRenders>0),'App instrumentation executed');
 assert.deepEqual(parentRenders,[0,0,0,0,0],'opening reservations should not render App');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
