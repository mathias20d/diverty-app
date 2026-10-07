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
  window.__rows={};window.__writes=[];window.__minuteTicks=[];const nativeInterval=window.setInterval;window.setInterval=(fn,ms,...args)=>{if(ms===60000)window.__minuteTicks.push(fn);return nativeInterval(fn,ms,...args);};
  const base='artifacts/diverty-oficial/public/data/';
  const packages=Array.from({length:300},(_,i)=>({id:'pkg'+i,nombre:'Paquete '+i,precio:100,descripcion:'Detalles del paquete',duracionHoras:2}));
  packages.push({id:'hotdogs',nombre:'Hot dogs',precio:2},{id:'pintacaritas',nombre:'Pintacaritas',precio:25,tipoCobro:'hora',isHourly:true});
  window.__rows[base+'configuracion/serviciosCustom']={paquetes:packages};
  window.__rows[base+'configuracion/clientesOcultos']={clients:[]};
  window.__rows[base+'configuracion/migracion_segura_v2']={done:true};
  window.__rows[base+'config_web/global']={centralBookingValidation:false};
  for(let i=0;i<1200;i++)window.__rows[base+'eventos/event-'+String(i).padStart(4,'0')]={id:'event-'+String(i).padStart(4,'0'),cliente:'Cliente '+i%100,telefono:'6000'+String(i%100).padStart(4,'0'),email:'cliente'+i%100+'@example.invalid',fecha:i<10?'2026-10-07':'2026-10-05',hora:'10:00',estado:'Completado',total:100,abono:100,servicio:'Paquete 1',serviciosSeleccionados:[{id:'pkg1',nombre:'Paquete 1',precio:100,precioOriginal:100,cantidad:1}],gastos:i%5,subcontratos:[{costo:10,pagado:i%2===0}],costosSeparados:true};
  window.alert=message=>{window.__alerts=(window.__alerts||[]).concat(message);};window.confirm=()=>true;
  Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__clipboard=text;}}});
 });
 const sectionRequests=new Set();
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname.includes('/src/modules/finances/') || url.pathname.includes('/src/modules/settings/'))sectionRequests.add(url.pathname);
  if(url.origin!==origin)return route.abort();
  if(url.pathname==='/src/App.jsx'){const response=await route.fetch();let body=await response.text();body=body.replace(/export default function App\(\{ firebaseUser \}\) \{/,match=>match+'\n window.__appRenders=(window.__appRenders||0)+1;');const start=body.indexOf('const evtCalculoBase = useMemo');const end=body.indexOf('const maxChartVal = useMemo');
  body=body.slice(0,start)+body.slice(start,end).replaceAll('eventosActivos.filter(', '(window.__financeScans=(window.__financeScans||0)+1,eventosActivos).filter(')+body.slice(end);
  body=body.replace('const maxChartVal = useMemo','window.__dayState={todayStr,financePeriod,financeYear,financeMonth}; window.__financeSnapshot={evtCount:evtCalculoBase.length,finanzasData,gastosPorCategoria,finanzasMes,chartData}; const maxChartVal = useMemo');
  return route.fulfill({response,body});}
  if(url.pathname==='/src/lib/firebase-auth.mjs')return route.fulfill({contentType:'text/javascript',body:`export const ADMIN_UID='test-admin';export const app={};export const auth={currentUser:{uid:ADMIN_UID}};export const LOGO_URL='';export const firebaseConfig={};`});
  if(url.pathname.includes('firebase_auth.js'))return route.fulfill({contentType:'text/javascript',body:`export const onAuthStateChanged=(_a,next)=>{queueMicrotask(()=>next({uid:'test-admin'}));return ()=>{};};export const signOut=async()=>{};export const signInWithEmailAndPassword=async()=>{};`});
  if(url.pathname.includes('firebase_firestore.js'))return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(__dirname,'reservation-fixture.mjs'),'utf8')});
  return route.continue();
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await page.clock.setFixedTime(new Date('2026-10-07T15:00:00Z'));await page.goto(origin);await page.getByRole('button',{name:'Nueva Reserva',exact:true}).waitFor({timeout:30000});

 const initial=await page.evaluate(()=>({renders:window.__appRenders,scans:window.__financeScans||0}));
 await page.waitForTimeout(1600);
 const settled=await page.evaluate(()=>({renders:window.__appRenders,scans:window.__financeScans||0}));
 console.log('Initial/background finance scans: '+settled.scans+'; root renders during 1.6s: '+(settled.renders-initial.renders));
 if(!process.env.PERFORMANCE_BASELINE){assert.equal(settled.scans,0);assert.equal(settled.renders-initial.renders,0);}
 assert.equal(sectionRequests.size,0,'Finanzas and Ajustes must not download at startup');
 const beforeMinute=await page.evaluate(()=>window.__appRenders);
 await page.evaluate(()=>window.__minuteTicks.forEach(fn=>fn()));await page.waitForTimeout(100);
 if(!process.env.PERFORMANCE_BASELINE)assert.equal(await page.evaluate(()=>window.__appRenders),beforeMinute,'same-day minute must not rerender the app');
 await page.evaluate(()=>{window.__financeStart=performance.now();[...document.querySelectorAll('button')].find(el=>el.textContent.trim()==='Finanzas').click();});
 await page.getByText('GANANCIA ESTIMADA DE ESTE MES',{exact:false}).waitFor({timeout:10000});
 console.log('Finance first display:',await page.evaluate(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return {milliseconds:Math.round(performance.now()-window.__financeStart),nodes:document.getElementsByTagName('*').length};}));
 const beforeAnimation=await page.evaluate(()=>window.__appRenders);await page.waitForTimeout(1700);
 if(!process.env.PERFORMANCE_BASELINE)assert.ok((await page.evaluate(()=>window.__appRenders))-beforeAnimation<=3,'gain animation must remain inside its card');
 assert.ok(sectionRequests.has('/src/modules/finances/FinancesView.jsx'));
 const incomeList=page.locator('[data-finance-list="ingresos"]');
 assert.equal(await incomeList.locator(':scope > button').count(),30,'render only the first group while retaining the full balance');
 const beforeMore=await page.evaluate(()=>window.__appRenders);
 await incomeList.getByRole('button',{name:'Mostrar más ingresos',exact:true}).evaluate(el=>el.click());
 await page.waitForFunction(()=>document.querySelector('[data-finance-list="ingresos"]').querySelectorAll(':scope > button').length===60);
 assert.equal(await incomeList.getByRole('status').innerText(),'60 de 1200 ingresos');
 assert.equal(await page.evaluate(()=>window.__appRenders),beforeMore,'showing more must only update the finance section');
 const csvDownload=page.waitForEvent('download');
 await page.getByRole('button',{name:'Exportar balance',exact:true}).evaluate(el=>el.click());
 const csv=fs.readFileSync(await (await csvDownload).path(),'utf8');
 assert.equal(csv.trim().split('\n').length,1201,'export every reservation, including rows outside the displayed group');
 const snapshots={};
 for(const [key,label] of [['mes','Este Mes'],['anio','Año'],['todos','Histórico'],['seleccionado','Otro Mes']]){
  await page.getByRole('button',{name:label,exact:true}).evaluate(el=>el.click());await page.waitForTimeout(100);
  snapshots[key]=await page.evaluate(()=>window.__financeSnapshot);
 }
 // Expected amounts were captured before optimization with this same fixture.
 const snapshotFile=process.env.PERFORMANCE_BASELINE || path.join(__dirname,'performance-finance.json');
 if(process.env.PERFORMANCE_BASELINE)fs.writeFileSync(snapshotFile,JSON.stringify(snapshots));
 else assert.deepEqual(snapshots,JSON.parse(fs.readFileSync(snapshotFile,'utf8')),'finance reports must retain identical values across periods');
 const beforeIdle=await page.evaluate(()=>window.__appRenders);await page.waitForTimeout(1500);
 if(!process.env.PERFORMANCE_BASELINE)assert.equal(await page.evaluate(()=>window.__appRenders),beforeIdle,'the gain animation must not render the root');
 const blur=await page.locator('[class~="backdrop-blur-2xl"]').first().evaluate(el=>getComputedStyle(el).backdropFilter);
 console.log('Mobile heavy blur: '+blur);
 if(!process.env.PERFORMANCE_BASELINE){
  assert.equal(blur,'none');
  const providersList=page.locator('[data-finance-list="proveedores"]');
  assert.equal(await providersList.getByRole('button',{name:/^(Registrar pago|Marcar pendiente)$/}).count(),30);
  await providersList.getByRole('button',{name:'Mostrar más pagos a proveedores',exact:true}).evaluate(el=>el.click());
  await providersList.getByRole('status').filter({hasText:'60 de 1200'}).waitFor();
  await providersList.locator(':scope > div').filter({hasText:'Cliente 35'}).getByRole('button',{name:'Registrar pago',exact:true}).evaluate(el=>el.click());
  const confirmation=page.getByRole('heading',{name:'¿Estás seguro?',exact:true}).locator('..');
  assert.equal(await confirmation.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(255, 255, 255, 0.98)','dialogs must keep their readable white background without blur');
  await page.getByRole('button',{name:'Confirmar',exact:true}).evaluate(el=>el.click());
  await page.waitForFunction(()=>window.__rows['artifacts/diverty-oficial/public/data/eventos/event-0035'].subcontratos[0].pagado===true);
  assert.equal(await page.evaluate(()=>window.__rows['artifacts/diverty-oficial/public/data/eventos/event-0034'].subcontratos[0].pagado),true);
  assert.equal(await page.evaluate(()=>window.__rows['artifacts/diverty-oficial/public/data/eventos/event-0037'].subcontratos[0].pagado),false);
  // Refresh with 45 partial payments: the balance covers every record, including hidden groups.
  await page.evaluate(()=>{for(let i=100;i<145;i++)window.__rows['artifacts/diverty-oficial/public/data/eventos/event-'+String(i).padStart(4,'0')].abono=50;});
  await page.getByRole('button',{name:'Año',exact:true}).evaluate(el=>el.click());
  await page.waitForFunction(()=>window.__financeSnapshot?.finanzasData?.porCobrar===2250);
  const debtsList=page.locator('[data-finance-list="deudas"]');
  await debtsList.getByRole('status').filter({hasText:'30 de 45'}).waitFor();
  assert.equal(await debtsList.getByRole('button',{name:'Marcar cobrado',exact:true}).count(),30);
  await page.getByRole('button',{name:'Copiar',exact:true}).evaluate(el=>el.click());
  assert.equal(await page.evaluate(()=>(window.__clipboard.match(/👤/g)||[]).length),45,'copy every pending client before expanding the list');
  await debtsList.getByRole('button',{name:'Mostrar más cobros pendientes',exact:true}).evaluate(el=>el.click());
  await debtsList.getByRole('status').filter({hasText:'45 de 45'}).waitFor();
  assert.equal(await debtsList.getByRole('button',{name:'Marcar cobrado',exact:true}).count(),45);
  await debtsList.locator(':scope > div').filter({has:page.getByText('Cliente 35',{exact:true})}).getByRole('button',{name:'Marcar cobrado',exact:true}).evaluate(el=>el.click());
  await page.getByRole('button',{name:'Confirmar',exact:true}).evaluate(el=>el.click());
  await page.waitForFunction(()=>window.__rows['artifacts/diverty-oficial/public/data/eventos/event-0135'].abono===100);
  await page.waitForFunction(()=>window.__financeSnapshot?.finanzasData?.porCobrar===2200);
  await page.setViewportSize({width:1280,height:900});
  assert.notEqual(await page.locator('[class~="backdrop-blur-2xl"]').first().evaluate(el=>getComputedStyle(el).backdropFilter),'none');
  await page.bringToFront();
  await page.clock.setFixedTime(new Date('2026-11-01T05:01:00Z'));await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForFunction(()=>window.__dayState?.todayStr==='2026-11-01');
  await page.getByRole('button',{name:'Este Mes',exact:true}).click();
  await page.waitForFunction(()=>window.__financeSnapshot?.finanzasMes?.diasTranscurridos===1 && window.__financeSnapshot?.finanzasData?.facturado===0).catch(async error=>{console.log('Day transition:',await page.evaluate(()=>({hidden:document.hidden,now:new Date().toISOString(),state:window.__dayState,report:window.__financeSnapshot})));throw error;});
  assert.equal(await page.evaluate(()=>window.__financeSnapshot.finanzasMes.diasTranscurridos),1);
  assert.equal(await page.evaluate(()=>window.__financeSnapshot.finanzasData.facturado),0,'month advances when returning to the app');
  await page.getByRole('button',{name:'Ajustes',exact:true}).last().evaluate(el=>el.click());
  await page.getByRole('button').filter({has:page.getByText('Mi negocio',{exact:true})}).waitFor();
  assert.ok(sectionRequests.has('/src/modules/settings/SettingsView.jsx'));
  for(const [label,title] of [['Mi negocio','Mi negocio'],['Facturación y banco','Facturación y Banco'],['Meta mensual','Meta mensual'],['Notificaciones','Notificaciones'],['Personal disponible','Personal disponible'],['Documentos','Documentos'],['Herramientas del sistema','Herramientas del sistema'],['Seguridad y sesión','Seguridad y sesión'],['Zona de peligro','Zona de peligro']]){
   await page.getByRole('button').filter({has:page.getByText(label,{exact:true})}).evaluate(el=>el.click());
   await page.getByRole('heading',{name:title,exact:true}).waitFor();
   if(label==='Meta mensual'){
    await page.locator('#main-content input[type="number"]').fill('2300');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('diverty_settings')).metaMensual),2300);
   }
   await page.locator('#main-content').getByRole('button',{name:'Ajustes',exact:true}).evaluate(el=>el.click());
  }
  console.log('PASS: deferred loading, incremental finance lists, payment from the second group and all settings views.');
 }
 assert.deepEqual(errors,[]);console.log('PASS: performance and financial report checks.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
