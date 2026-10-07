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
 });
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin)return route.abort();
  if(url.pathname==='/src/App.jsx'){const response=await route.fetch();let body=await response.text();body=body.replace(/export default function App\(\{ firebaseUser \}\) \{/,match=>match+'\n window.__appRenders=(window.__appRenders||0)+1;');const start=body.indexOf('const evtCalculoBase = useMemo');const end=body.indexOf('const maxChartVal = useMemo');
  body=body.slice(0,start)+body.slice(start,end).replaceAll('eventosActivos.filter(', '(window.__financeScans=(window.__financeScans||0)+1,eventosActivos).filter(')+body.slice(end);
  body=body.replace('const maxChartVal = useMemo','window.__financeSnapshot={evtCount:evtCalculoBase.length,finanzasData,gastosPorCategoria,finanzasMes,chartData}; const maxChartVal = useMemo');
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
 const beforeMinute=await page.evaluate(()=>window.__appRenders);
 await page.evaluate(()=>window.__minuteTicks.forEach(fn=>fn()));await page.waitForTimeout(100);
 if(!process.env.PERFORMANCE_BASELINE)assert.equal(await page.evaluate(()=>window.__appRenders),beforeMinute,'same-day minute must not rerender the app');
 await page.getByRole('button',{name:'Finanzas',exact:true}).first().evaluate(el=>el.click());
 await page.getByText('GANANCIA ESTIMADA DE ESTE MES',{exact:false}).waitFor({timeout:10000});const beforeAnimation=await page.evaluate(()=>window.__appRenders);await page.waitForTimeout(1700);
 if(!process.env.PERFORMANCE_BASELINE)assert.ok((await page.evaluate(()=>window.__appRenders))-beforeAnimation<=3,'gain animation must remain inside its card');
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
  await page.getByRole('button',{name:'Registrar pago',exact:true}).first().evaluate(el=>el.click());
  const confirmation=page.getByRole('heading',{name:'¿Estás seguro?',exact:true}).locator('..');
  assert.equal(await confirmation.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(255, 255, 255, 0.98)','dialogs must keep their readable white background without blur');
  await page.getByRole('button',{name:'Cancelar',exact:true}).evaluate(el=>el.click());
  await page.setViewportSize({width:1280,height:900});
  assert.notEqual(await page.locator('[class~="backdrop-blur-2xl"]').first().evaluate(el=>getComputedStyle(el).backdropFilter),'none');
  await page.clock.setFixedTime(new Date('2026-11-01T05:01:00Z'));await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await page.getByRole('button',{name:'Este Mes',exact:true}).evaluate(el=>el.click());
  await page.waitForFunction(()=>window.__financeSnapshot?.finanzasMes?.diasTranscurridos===1 && window.__financeSnapshot?.finanzasData?.facturado===0);
  assert.equal(await page.evaluate(()=>window.__financeSnapshot.finanzasMes.diasTranscurridos),1);
  assert.equal(await page.evaluate(()=>window.__financeSnapshot.finanzasData.facturado),0,'month advances when returning to the app');
 }
 assert.deepEqual(errors,[]);console.log('PASS: performance and financial report checks.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
