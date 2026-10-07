const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const sdk=require('./web-admin-sdk.cjs');
const origin=process.env.ORIGIN||'http://127.0.0.1:5173',webOrigin='https://divertypanama.netlify.app';
const encode=v=>typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?{integerValue:String(v)}:Array.isArray(v)?{arrayValue:{values:v.map(encode)}}:v&&typeof v==='object'?{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,encode(x)]))}}:{stringValue:String(v??'')};
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:392,height:852}});
  await context.addInitScript(()=>{window.__rows={
   'artifacts/diverty-oficial/public/data/temas_web/navidad':{nombre:'Navidad',colorPrimary:'#ff0000',colorBg:'#00ff00',isDefault:true},
   'artifacts/diverty-oficial/public/data/temas_web/halloween':{nombre:'Halloween',colorPrimario:'#ff6600',animaciones:false,isDefault:false},
  };window.__messages=[];window.__commits=0;});
  const requests=[];
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());requests.push(url.href);
   if(url.origin===origin){
    if(url.pathname==='/@vite/client')return route.fulfill({contentType:'text/javascript',body:require('./vite-test-client.cjs')});
    if(url.pathname==='/'){const r=await route.fetch();return route.fulfill({response:r,body:(await r.text()).replace('/src/main.jsx','/tests/browser/web-admin-harness.jsx')});}
    if(url.pathname.includes('firebase_firestore.js'))return route.fulfill({contentType:'text/javascript',body:sdk});
    return route.continue();
   }
   if(url.origin===webOrigin){const target=path.join('/workspace/Diverty-/dist',url.pathname);return route.fulfill({body:fs.readFileSync(target),contentType:({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp'})[path.extname(target)]||'application/octet-stream'});}
   if(url.hostname==='firestore.googleapis.com'){
    const collection=url.pathname.split('/public/data/')[1]?.split('/')[0];
    const rows=collection==='categorias_web'?[{id:'fiestas',nombre:'Fiestas',activo:true,visible:true}]:collection==='catalogo_web'?[{id:'plan-test',nombre:'Fiesta de prueba',categoria:'fiestas',precio:100,destacado:true,imagen:'/assets/logo-256.webp'}]:[];
    return route.fulfill({json:{documents:rows.map(({id,...data})=>({name:url.pathname+'/'+id,fields:Object.fromEntries(Object.entries(data).map(([key,value])=>[key,encode(value)]))}))}});
   }
   return route.abort();
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);
  await page.getByRole('button',{name:/^Temas/}).click();await page.getByRole('button',{name:'Editar tema Navidad',exact:true}).click();
  const color=label=>page.getByLabel(label+' (valor)',{exact:true});
  assert.equal(await color('Primario').inputValue(),'#2563EB');assert.equal(await color('Fondo').inputValue(),'#061426');
  const preview=page.frameLocator('iframe');await preview.locator('body[data-theme="christmas"]').waitFor();
  await color('Botón').fill('#123456');await color('Fondo').fill('#112233');await color('Tarjeta').fill('#223344');await color('Texto').fill('#f0f0f0');
  await page.getByLabel('Decoración',{exact:true}).selectOption('none');await page.getByRole('button',{name:'Animaciones',exact:true}).click();
  await page.frames().find(f=>f.url().includes('theme-preview.html')).waitForFunction(()=>getComputedStyle(document.body).backgroundColor==='rgb(17, 34, 51)'&&getComputedStyle(document.querySelector('#mainContent .season-btn')).transitionDuration==='0s',null,{polling:100});
  const painted=await preview.locator('body').evaluate(()=>({bg:getComputedStyle(document.body).backgroundColor,button:getComputedStyle(document.querySelector('#mainContent .season-btn')).backgroundColor,decor:document.querySelectorAll('#decor-layer .falling-decor').length,width:innerWidth,animation:getComputedStyle(document.querySelector('#mainContent .season-btn')).transitionDuration}));
  assert.equal(painted.bg,'rgb(17, 34, 51)');assert.equal(painted.button,'rgb(18, 52, 86)');assert.equal(painted.decor,0);assert.equal(painted.width,390);assert.equal(painted.animation,'0s');
  assert.equal(await page.evaluate(()=>window.__commits),0,'preview must not publish');
  await page.getByRole('button',{name:'Escritorio',exact:true}).click();assert.equal(await preview.locator('body').evaluate(()=>innerWidth),1080);
  await page.getByLabel('Decoración',{exact:true}).selectOption('snow');await preview.locator('#decor-layer .falling-decor').first().waitFor();assert.equal(await preview.locator('#decor-layer .falling-decor').count(),25);
  await page.getByLabel('Decoración',{exact:true}).selectOption('confetti');await preview.locator('#decor-layer .falling-decor').first().waitFor();
  await page.getByRole('button',{name:'Guardar tema',exact:true}).click();await page.getByRole('button',{name:'Editar tema Navidad',exact:true}).waitFor();
  const saved=await page.evaluate(()=>window.__rows['artifacts/diverty-oficial/public/data/temas_web/navidad']);
  assert.equal(saved.themeVersion,2);assert.equal(saved.colorButton,'#123456');assert.equal(saved.decorations,'confetti');assert.equal(saved.animations,false);assert.equal(saved.isDefault,true);
  await page.getByRole('button',{name:'Editar tema Navidad',exact:true}).click();assert.equal(await color('Botón').inputValue(),'#123456');assert.equal(await page.getByLabel('Decoración',{exact:true}).inputValue(),'confetti');
  assert.deepEqual(errors,[]);
  if(process.env.THEME_FIXTURE_PATH)fs.writeFileSync(process.env.THEME_FIXTURE_PATH,JSON.stringify(saved));
  await page.frames().find(f=>f.url().includes('theme-preview.html')).waitForFunction(()=>window.catalogLoaded===true&&!document.documentElement.classList.contains('diverty-booting'),null,{polling:100});
  await preview.getByRole('button',{name:'Reservar ahora',exact:true}).first().dispatchEvent('click');assert.equal(await preview.locator('#bookingForm').count(),0);assert.equal(await page.evaluate(()=>window.__commits),1,'clicking the preview cannot create a reservation or another save');
  assert.deepEqual(requests.filter(u=>u.includes('firebasejs')||u.includes('accounts:signUp')||u.includes('googletagmanager')),[],'preview cannot authenticate or load analytics');
  if(process.env.BROWSER_ARTIFACT_DIR){fs.mkdirSync(process.env.BROWSER_ARTIFACT_DIR,{recursive:true});await page.getByRole('button',{name:'Móvil',exact:true}).click();await page.locator('section[aria-label="Vista previa del tema"]').screenshot({path:path.join(process.env.BROWSER_ARTIFACT_DIR,'theme-preview.png')});}
  console.log('PASS: Christmas compatibility, draft color/decorations/motion, real mobile/desktop website preview, no writes before save, saved options retained.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
