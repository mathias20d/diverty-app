const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const origin=process.env.ORIGIN || 'http://127.0.0.1:5173';
const sdk=require('./web-admin-sdk.cjs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const context=await browser.newContext({viewport:{width:392,height:852}});
 await context.addInitScript(()=>{window.__rows={'artifacts/diverty-oficial/public/data/categorias_web/comida':{nombre:'Comida',activo:true,visible:true}};window.__messages=[];window.__commits=0;});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();
  if(url.pathname==='/'){const response=await route.fetch();return route.fulfill({response,body:(await response.text()).replace('/src/main.jsx','/tests/browser/web-admin-harness.jsx')});}
  if(url.pathname.includes('firebase_firestore.js'))return route.fulfill({contentType:'text/javascript',body:sdk});
  return route.continue();
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);
 await page.getByRole('button',{name:/Servicios y personajes/}).click();
 await page.getByRole('button',{name:'Nuevo servicio / personaje'}).click();
 await page.getByRole('button',{name:'Por cantidad',exact:true}).click();
 await page.getByLabel('Nombre',{exact:true}).fill('Hot dogs de prueba');
 await page.getByLabel('Precio por unidad',{exact:true}).fill('2');
 await page.getByLabel('Cantidad mínima',{exact:true}).fill('50');
 await page.getByLabel('Cantidad máxima',{exact:true}).fill('500');
 await page.getByLabel('Aumentar de',{exact:true}).fill('25');
 await page.getByLabel('Nombre de la unidad',{exact:true}).fill('hot dog');
 await page.getByLabel('Imagen interna',{exact:true}).fill('/assets/logo-256.webp');
 await page.getByLabel('Cantidad máxima',{exact:true}).fill('20');await page.getByRole('button',{name:'Guardar cambios'}).click();
 assert.equal(await page.evaluate(()=>window.__commits),0);assert.ok((await page.evaluate(()=>window.__messages.at(-1))).includes('máximo'));
 await page.getByLabel('Cantidad máxima',{exact:true}).fill('500');await page.getByRole('button',{name:'Guardar cambios'}).click();
 await page.getByRole('button',{name:'Editar',exact:true}).first().waitFor();await page.getByRole('button',{name:'Editar',exact:true}).first().click();
 assert.equal(await page.getByLabel('Cantidad mínima',{exact:true}).inputValue(),'50');assert.equal(await page.getByLabel('Nombre de la unidad',{exact:true}).inputValue(),'hot dog');
 await page.getByRole('button',{name:'Guardar cambios'}).click();
 await page.getByRole('button',{name:'Nuevo servicio / personaje'}).click();await page.getByRole('button',{name:'Personaje',exact:true}).click();
 for(const [index,name,price] of [[0,'Héroe de prueba A','80'],[1,'Héroe de prueba B','95']]){
  await page.getByLabel('Nombre',{exact:true}).fill(name);await page.getByLabel('Precio',{exact:true}).fill(price);
  await page.getByLabel('Temática (opcional)',{exact:true}).fill('Superhéroes');
  await page.getByLabel('Foto del personaje',{exact:true}).fill('/assets/logo-256.webp');
  await page.getByRole('button',{name:index===0?'Guardar y agregar otro personaje':'Guardar cambios'}).click();
  if(index===0){await page.waitForFunction(input=>input.value==='',await page.getByLabel('Nombre',{exact:true}).elementHandle());}
 }
 await page.getByRole('button',{name:'Editar',exact:true}).nth(2).waitFor();
 const result=await page.evaluate(()=>({rows:window.__rows,commits:window.__commits}));
 const products=Object.entries(result.rows).filter(([p])=>p.includes('/catalogo_web/')).map(([p,data])=>({...data,id:p.split('/').at(-1)}));
 const categories=Object.entries(result.rows).filter(([p])=>p.includes('/categorias_web/')).map(([p,data])=>({...data,id:p.split('/').at(-1)}));
 assert.equal(products.length,3);assert.equal(products.find(x=>x.nombre==='Hot dogs de prueba').tipoCobro,'unidad');
 assert.equal(products.filter(x=>x.tipoServicio==='personaje').length,2);assert.ok(categories.some(x=>x.id==='personajes'&&x.visible));
 assert.equal(result.rows['artifacts/diverty-oficial/public/data/config_web/web_sync'].versions.catalogo_web,4);
 assert.deepEqual(errors,[]);
 if(process.env.CATALOG_FIXTURE_PATH)fs.writeFileSync(process.env.CATALOG_FIXTURE_PATH,JSON.stringify({products,categories}));
 console.log('PASS: create/edit quantity products, reject invalid bounds, create character category, add two characters and sync every save.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
