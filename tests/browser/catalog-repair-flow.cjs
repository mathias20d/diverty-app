const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const origin=process.env.ORIGIN||'http://127.0.0.1:5273';
const base='artifacts/diverty-oficial/public/data/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const width of [392,1366]){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.addInitScript(({base})=>{window.__messages=[];window.__commits=0;window.__rows={
   [base+'categorias_web/fiestas']:{nombre:'Fiestas',activo:true,visible:true,imagen:'/original.webp'},
   [base+'catalogo_web/plan']:{nombre:'Paquete de prueba',categoria:'fiestas',precio:100,imagen:'/icon-512.png',imagenTarjeta:'/anterior.webp',tipoCobro:'paquete',descripcion:'Duración total 3 horas',serviciosLista:'Animación 1 hora'},
   [base+'campanas_web/camp']:{titulo:'Campaña de prueba',activo:true,precio:100,imagen:'https://example.invalid/camp.jpg',fechaInicio:'2026-10-01',fechaFin:'2026-12-31',incluye:['Animación 1 hora']}
  };},{base});
  await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();
   if(url.pathname==='/@vite/client')return route.fulfill({contentType:'text/javascript',body:require('./vite-test-client.cjs')});
   if(url.pathname==='/'){const response=await route.fetch();return route.fulfill({response,body:(await response.text()).replace('/src/main.jsx','/tests/browser/web-admin-harness.jsx')});}
   if(url.pathname.includes('firebase_firestore.js'))return route.fulfill({contentType:'text/javascript',body:require('./web-admin-sdk.cjs')});return route.continue();});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(origin);
  await page.getByRole('button',{name:/Servicios y personajes/}).click();await page.getByRole('button',{name:'Editar',exact:true}).click();
  await page.getByRole('button',{name:'Quitar portada de tarjeta',exact:true}).click();
  await page.getByLabel('Duración total (horas)',{exact:true}).fill('1.5');
  await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.getByRole('button',{name:'Editar',exact:true}).waitFor();
  let row=await page.evaluate(path=>window.__rows[path],base+'catalogo_web/plan');assert.equal(row.imagenTarjeta,'');assert.equal(row.imagen,'/icon-512.png');assert.equal(row.duracionHoras,1.5);assert.equal(row.duracionCatalogoDefinida,true);
  await page.getByRole('button',{name:'Editar',exact:true}).click();assert.equal(await page.getByLabel('Duración total (horas)',{exact:true}).inputValue(),'1.5');assert.equal(await page.getByLabel('Portada de tarjeta (opcional)').inputValue(),'');
  await page.getByLabel('Duración total (horas)',{exact:true}).fill('-1');await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();assert.equal((await page.evaluate(path=>window.__rows[path],base+'catalogo_web/plan')).duracionHoras,1.5);
  await page.getByRole('button',{name:'Cerrar edición',exact:true}).click();await page.getByRole('button',{name:/Volver/}).click();
  await page.getByRole('button',{name:/Catálogos/}).click();await page.getByRole('button',{name:/Nuevo catálogo/i}).click();
  await page.getByLabel('Nombre',{exact:true}).fill('Fiéstas');await page.getByRole('button',{name:'Guardar catálogo',exact:true}).click();
  await page.waitForFunction(()=>window.__messages.some(message=>message.includes('Ya existe un catálogo')));
  assert.equal((await page.evaluate(path=>window.__rows[path],base+'categorias_web/fiestas')).imagen,'/original.webp');
  await page.getByLabel('Nombre',{exact:true}).fill('Nueva categoría');await page.getByRole('button',{name:'Guardar catálogo',exact:true}).click();await page.getByRole('heading',{name:'Nuevo catálogo',exact:true}).waitFor({state:'hidden'});
  assert.equal((await page.evaluate(path=>window.__rows[path],base+'categorias_web/nueva-categoria')).nombre,'Nueva categoría');
  await page.getByRole('button',{name:/Volver/}).click();await page.getByRole('button',{name:/Campañas/}).click();await page.getByRole('button',{name:'Editar campaña',exact:true}).click();
  await page.getByLabel('Duración total (horas)',{exact:true}).fill('2.25');await page.getByRole('button',{name:'Guardar campaña',exact:true}).click();await page.getByRole('button',{name:'Editar campaña',exact:true}).waitFor();
  row=await page.evaluate(path=>window.__rows[path],base+'campanas_web/camp');assert.equal(row.duracionHoras,2.25);assert.equal(row.duracionCatalogoDefinida,true);assert.equal(row.precio,100);
  assert.deepEqual(errors,[]);console.log('PASS catálogo: portada eliminada, duración persistente, duplicado protegido y campaña a '+width+'px.');await context.close();
 }}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
