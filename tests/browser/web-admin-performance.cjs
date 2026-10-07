const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const sdk = require('./web-admin-sdk.cjs');
const origin = process.env.ORIGIN || 'http://127.0.0.1:5173';
const base = 'artifacts/diverty-oficial/public/data/';
(async () => {
 const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
 try {
  const context = await browser.newContext({ viewport: { width: 392, height: 852 } });
  await context.addInitScript(({base}) => {
   window.__rows = {
    [base+'categorias_web/comida']: { nombre: 'Comida', orden: 1 },
    [base+'categorias_web/personajes']: { nombre: 'Personajes', orden: 2 },
    [base+'catalogo_web/dogs']: { nombre: 'Hot dogs', categoria: 'comida', precio: 2, imagen: '/assets/logo-256.webp', tipoCobro: 'unidad', cantidadMinima: 50, cantidadMaxima: 500 },
    [base+'catalogo_web/hero']: { nombre: 'Héroe', categoria: 'personajes', precio: 80, imagen: '/assets/logo-256.webp', tipoServicio: 'personaje' },
    [base+'campanas_web/promo']: { titulo: 'Promoción', orden: 1 },
    [base+'temas_web/normal']: { nombre: 'Normal', isDefault: true },
    [base+'galeria_web/photo']: { image: '/assets/logo-256.webp' },
    [base+'cupones_web/TEST']: { code: 'TEST', discount: 10 },
    [base+'config_web/global']: { bannerActive: true, bannerText: 'Banner original' },
    [base+'config_web/web_sync']: { version: 10, versions: { catalogo_web: 3, categorias_web: 1, config_web: 2 } },
   };
   window.__messages = []; window.__commits = 0; window.__readDelay = 60;
  }, {base});
  await context.route('**/*', async route => {
   const url = new URL(route.request().url());
   if (url.origin !== origin) return route.abort();
   if(url.pathname==='/@vite/client')return route.fulfill({contentType:'text/javascript',body:require('./vite-test-client.cjs')});
   if (url.pathname === '/') {
    const response = await route.fetch();
    return route.fulfill({response, body: (await response.text()).replace('/src/main.jsx', '/tests/browser/web-admin-harness.jsx')});
   }
   if (url.pathname.includes('firebase_firestore.js')) return route.fulfill({contentType: 'text/javascript', body: sdk});
   return route.continue();
  });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', error => {errors.push(error.message);console.error('Browser error:',error.message);});
  const idle = async () => { await page.waitForFunction(() => !document.querySelector('svg.animate-spin')); await page.waitForTimeout(80); };
  const reads = () => page.evaluate(() => window.__reads.length);
  const expectReads = async (before, names) => {
   await idle();
   assert.deepEqual(await page.evaluate(before => window.__reads.slice(before).map(path => path.split('/').slice(4).join('/')).sort(), before), [...names].sort());
  };
  const remote = async (changes, sections, legacy = false) => page.evaluate(({base, changes, sections, legacy}) => {
   for (const [path, data] of Object.entries(changes)) window.__rows[base+path] = data;
   const sync = window.__rows[base+'config_web/web_sync']; sync.version++;
   if (!legacy) for (const name of sections) sync.versions[name] = (sync.versions[name] || 0) + 1;
   window.__emitSync();
  }, {base, changes, sections, legacy});
  await page.goto(origin);
  await page.waitForFunction(() => window.__reads?.length === 8); await idle();
  assert.equal(await page.evaluate(() => window.__listens.length), 1);
  const initial = await reads();
  await page.evaluate(() => window.__renderAdmin()); await idle(); assert.equal(await reads(), initial, 'parent rerender must not reload');
  await page.getByRole('button', {name: /Servicios y personajes/}).click();
  for (const name of ['Comida', 'Personajes', 'Destacados', 'Ofertas', 'Todos']) await page.getByRole('button', {name, exact: true}).click();
  await page.getByPlaceholder('Buscar servicio o personaje…').fill('Hot dogs');
  await page.getByRole('button', {name: 'Editar', exact: true}).click();
  await page.getByLabel('Nombre', {exact:true}).fill('Hot dogs actualizados');
  assert.equal(await reads(), initial, 'filters/search/typing must be local');
  await page.getByRole('button', {name: 'Guardar cambios'}).click();
  await expectReads(initial, ['catalogo_web']);
  assert.equal(await page.evaluate(() => window.__commits), 1);
  await page.getByRole('button', {name: 'Editar', exact: true}).click();
  await page.getByLabel('Nombre', {exact:true}).fill('Borrador sin guardar');
  let before = await reads();
  await remote({'catalogo_web/hero': {nombre:'Héroe remoto', categoria:'personajes', precio:95}}, ['catalogo_web']);
  await page.waitForFunction(before => window.__reads.length > before, before); await expectReads(before, ['catalogo_web']);
  assert.equal(await page.getByLabel('Nombre', {exact:true}).inputValue(), 'Borrador sin guardar');
  await page.getByRole('button', {name:'Cerrar edición'}).click();
  await page.getByPlaceholder('Buscar servicio o personaje…').fill('');
  await page.getByRole('heading', {name:'Héroe remoto', exact:true}).waitFor();
  // Ignore pending local snapshots and stale queued confirmations.
  before = await reads();
  await page.evaluate(() => window.__emitSync({hasPendingWrites:true, fromCache:false})); await idle(); assert.equal(await reads(), before);
  await page.getByRole('button', {name:'Volver', exact:true}).click();
  await page.getByRole('button', {name:/Banner y ajustes/}).click();
  await page.getByLabel('Texto del banner').fill('Mi texto sin guardar');
  before = await reads(); await remote({'config_web/global': {bannerActive:false, bannerText:'Texto remoto'}}, ['config_web']);
  await page.waitForFunction(before => window.__reads.length > before, before); await expectReads(before, ['config_web/tema_global','config_web/global']);
  assert.equal(await page.getByLabel('Texto del banner').inputValue(), 'Mi texto sin guardar');
  before = await reads(); await page.getByRole('button', {name:'Guardar ajustes'}).click(); await expectReads(before, ['config_web/tema_global','config_web/global']);
  assert.equal(await page.evaluate(base => window.__rows[base+'config_web/global'].bannerText, base), 'Mi texto sin guardar');
  // A partial read failure retains existing data and can be retried.
  await page.getByRole('button', {name:'Volver', exact:true}).click(); await page.getByRole('button', {name:/Servicios y personajes/}).click();
  await page.evaluate(base => window.__failReads = [base+'catalogo_web'], base);
  before = await reads(); await remote({'catalogo_web/hero': {nombre:'Héroe recuperado', categoria:'personajes', precio:99}}, ['catalogo_web']);
  await page.getByRole('alert').waitFor(); await expectReads(before, ['catalogo_web']);
  await page.getByRole('heading', {name:'Héroe remoto',exact:true}).waitFor();
  await page.evaluate(() => window.__failReads = []);
  before = await reads(); await page.getByRole('button', {name:'Actualizar contenido'}).click(); await expectReads(before, ['categorias_web','catalogo_web']);
  await page.getByRole('heading', {name:'Héroe recuperado',exact:true}).waitFor(); assert.equal(await page.getByRole('alert').count(), 0);
  // Legacy/global notifications still refresh every section.
  before = await reads(); await remote({}, [], true); await page.waitForFunction(before => window.__reads.length > before, before);
  await expectReads(before, ['categorias_web','catalogo_web','campanas_web','temas_web','galeria_web','cupones_web','config_web/tema_global','config_web/global']);
  // Returning to the administrator validates the small sync document and reuses data.
  before = await reads(); await page.evaluate(() => window.__unmountAdmin()); await page.waitForFunction(() => !document.querySelector('h2'));
  await page.evaluate(() => window.__renderAdmin()); await page.getByRole('heading',{name:'Página Web',exact:true}).waitFor(); await idle();
  assert.equal(await reads(), before, 'same session and sync version reuse all loaded sections');
  await page.evaluate(() => window.__unmountAdmin()); await page.waitForFunction(() => !document.querySelector('h2'));
  await remote({'campanas_web/promo': {titulo:'Campaña fuera de pantalla'}}, ['campanas_web']);
  await page.evaluate(() => window.__renderAdmin()); await page.getByRole('heading',{name:'Página Web',exact:true}).waitFor();
  await page.waitForFunction(before => window.__reads.length > before, before); await expectReads(before, ['campanas_web']);
  // A legacy edit made while this screen is closed invalidates the session cache too.
  before = await reads(); await page.evaluate(() => window.__unmountAdmin()); await page.waitForFunction(() => !document.querySelector('h2'));
  await remote({}, [], true); await page.evaluate(() => window.__renderAdmin());
  await page.waitForFunction(before => window.__reads.length >= before+8, before); await idle(); assert.equal(await reads()-before, 8);
  // Changes to public collections outside this screen should not reload its lists.
  before = await reads(); await remote({}, ['resenas_web']); await idle(); assert.equal(await reads(), before);
  // Losing the version listener is visible; retry restores both data and live synchronization.
  await page.evaluate(() => window.__failSync()); await page.getByRole('alert').waitFor();
  before = await reads(); await page.getByRole('button', {name:'Reintentar',exact:true}).click();
  await page.waitForFunction(before => window.__reads.length >= before+8, before); await idle(); assert.equal(await reads()-before, 8);
  assert.equal(await page.getByRole('alert').count(), 0);
  await page.getByRole('button', {name:/Servicios y personajes/}).click();
  // Offline SDK data is displayed, but is not certified as current in the cache.
  await page.evaluate(() => window.__readsFromCache = true);
  before = await reads(); await remote({'catalogo_web/hero': {nombre:'Héroe tras reconectar', categoria:'personajes', precio:100}}, ['catalogo_web']);
  await page.getByRole('alert').waitFor(); await expectReads(before, ['catalogo_web']);
  await page.evaluate(() => {window.__readsFromCache = false; window.__emitSync();});
  await page.waitForFunction(before => window.__reads.length >= before+2, before); await idle();
  assert.equal(await page.getByRole('alert').count(), 0);
  // A failed write neither advances versions nor destroys the edit form.
  await page.getByPlaceholder('Buscar servicio o personaje…').fill('Hot dogs');
  await page.getByRole('button', {name:'Editar',exact:true}).click(); await page.getByLabel('Nombre',{exact:true}).fill('Guardado con cambio remoto');
  const commits = await page.evaluate(() => window.__commits);
  await page.evaluate(() => window.__failCommit = true);
  await page.getByRole('button',{name:'Guardar cambios'}).click(); await idle();
  assert.equal(await page.evaluate(() => window.__commits), commits);
  assert.equal(await page.getByLabel('Nombre',{exact:true}).inputValue(), 'Guardado con cambio remoto');
  await page.evaluate(() => {window.__failCommit = false; window.__commitDelay = 150;});
  await page.getByRole('button',{name:'Guardar cambios'}).click();
  await remote({'config_web/global': {bannerActive:true, bannerText:'Cambio durante guardado'}}, ['config_web']);
  await page.waitForFunction(commits => window.__commits > commits, commits); await idle();
  assert.equal(await page.evaluate(base => window.__rows[base+'catalogo_web/dogs'].nombre, base), 'Guardado con cambio remoto');
  await page.getByRole('button',{name:'Volver',exact:true}).click(); await page.getByRole('button',{name:/Banner y ajustes/}).click();
  assert.equal(await page.getByLabel('Texto del banner').inputValue(), 'Cambio durante guardado');
  await page.getByLabel('Texto del banner').fill('Guardado con lectura fallida');
  await page.evaluate(base => window.__failReads = [base+'config_web/global'], base);
  await page.getByRole('button', {name:'Guardar ajustes'}).click(); await page.getByRole('alert').waitFor(); await idle();
  assert.equal(await page.getByLabel('Texto del banner').inputValue(), 'Guardado con lectura fallida');
  await page.evaluate(() => window.__failReads = []);
  await page.getByRole('button', {name:'Actualizar contenido'}).click(); await idle();
  assert.equal(await page.getByRole('alert').count(), 0);
  // Leaving the screen must not cancel a save already accepted behind a pending read.
  await page.getByRole('button',{name:'Volver',exact:true}).click(); await page.getByRole('button',{name:/Servicios y personajes/}).click();
  await page.getByPlaceholder('Buscar servicio o personaje…').fill('Guardado con cambio remoto'); await page.getByRole('button',{name:'Editar',exact:true}).click();
  await page.getByLabel('Nombre',{exact:true}).fill('Guardado al salir');
  await page.evaluate(base => {window.__readDelays = {[base+'catalogo_web']:300};window.__commitDelay = 20;}, base);
  before = await reads(); await remote({}, ['catalogo_web']); await page.waitForFunction(before => window.__reads.length > before, before);
  const pendingCommits = await page.evaluate(() => window.__commits);
  await page.getByRole('button',{name:'Guardar cambios'}).click(); await page.evaluate(() => window.__unmountAdmin());
  await page.waitForFunction(() => !document.querySelector('h2')); await page.waitForFunction(count => window.__commits > count, pendingCommits);
  assert.equal(await page.evaluate(base => window.__rows[base+'catalogo_web/dogs'].nombre, base), 'Guardado al salir');
  await page.evaluate(() => {window.__readDelays = {};window.__renderAdmin();});
  await page.getByRole('heading',{name:'Página Web',exact:true}).waitFor(); await idle();
  // A different account must not inherit the previous account's cached data.
  before = await reads(); await page.evaluate(() => window.__renderAdmin('other-admin'));
  await page.waitForFunction(before => window.__reads.length >= before+8, before); await idle(); assert.equal(await reads()-before, 8);
  assert.deepEqual(errors, []);
  console.log('PASS: 0 reads per filter/search/parent rerender, 1 per product save, selective remote sync, draft preservation, read/write failures, concurrent save/sync, reconnection, legacy sync, session cache and account isolation.');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
