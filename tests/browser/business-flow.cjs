const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const origin = process.env.BUSINESS_ORIGIN || 'http://127.0.0.1:5174';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8089' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9098') throw new Error('Local demo Auth and Firestore emulators are required.');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox','--disable-dev-shm-usage'] });
  try {
    const context = await browser.newContext({ viewport: { width: 392, height: 852 }, timezoneId: 'America/Panama' });
    const external = [], errors = [];
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === origin || (url.hostname === '127.0.0.1' && ['8089','9098'].includes(url.port))) return route.continue();
      external.push(url.host); return route.abort();
    });
    const page = await context.newPage();
    const sdkUrls = {};
    page.on('request', request => {
      const url = new URL(request.url()), match = url.pathname.match(/firebase_(app|auth|firestore)\.js$/);
      if (match) sdkUrls[match[1]] = url.pathname + url.search;
    });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'warning' || message.type() === 'error') console.log('Browser diagnostic:', message.text()); });
    const artifact = async name => { if (process.env.BROWSER_ARTIFACT_DIR) { fs.mkdirSync(process.env.BROWSER_ARTIFACT_DIR, { recursive: true }); await page.screenshot({ path: path.join(process.env.BROWSER_ARTIFACT_DIR, name) }); } };
    const read = async (section, id) => page.evaluate(async ({ section, id, sdkUrls }) => {
      const { getApps } = await import(sdkUrls.app);
      const { getAuth } = await import(sdkUrls.auth);
      const { getFirestore, doc, getDoc } = await import(sdkUrls.firestore);
      const app = getApps().find(item => item.name === 'diverty-business-pilot'), uid = getAuth(app).currentUser.uid;
      const snap = await getDoc(doc(getFirestore(app), 'artifacts', `business-${uid}`, 'public','data',section,id));
      return snap.exists() ? snap.data() : null;
    }, { section, id, sdkUrls });
    const identity = () => page.evaluate(async sdkUrls => {
      const { getApps } = await import(sdkUrls.app);
      const { getAuth } = await import(sdkUrls.auth);
      return getAuth(getApps().find(item => item.name === 'diverty-business-pilot')).currentUser.uid;
    }, sdkUrls);
    const signUp = async (name, email) => {
      await page.getByRole('button', { name: 'Crear un negocio', exact: true }).click();
      await page.getByLabel('Nombre del negocio', { exact: true }).fill(name);
      await page.getByLabel('Correo electrónico', { exact: true }).fill(email);
      await page.getByLabel('Contraseña', { exact: true }).fill('Test-only-password-123');
      await page.getByRole('button', { name: 'Crear mi negocio', exact: true }).click();
      try { await page.getByRole('button', { name: 'Nueva Reserva', exact: true }).waitFor({ timeout: 15000 }); }
      catch (failure) { console.error('Signup UI:', await page.locator('body').innerText()); console.error('Browser errors:', errors, 'Blocked hosts:', external); throw failure; }
    };
    const signOut = async () => {
      await page.getByRole('button', { name: 'Ajustes', exact: true }).first().click();
      if (await page.getByRole('heading', { name: 'Facturación y Banco', exact: true }).isVisible()) await page.getByRole('button', { name: 'Ajustes', exact: true }).first().click();
      await page.getByRole('button').filter({ hasText: 'Seguridad y sesión' }).click();
      await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
      await page.getByRole('heading', { name: 'Entra a tu negocio', exact: true }).waitFor();
    };
    const createReservation = async (client, count) => {
      await page.getByRole('button', { name: 'Nueva Reserva', exact: true }).click();
      const modal = page.getByRole('dialog', { name: 'Reserva', exact: true });
      await modal.locator('form input').nth(0).fill(client);
      await modal.locator('form input').nth(1).fill('60000000');
      await modal.locator('form input').nth(2).fill('client@example.invalid');
      await modal.getByPlaceholder('Buscar producto o servicio...').fill('Hot dogs del negocio');
      await modal.getByRole('button', { name: 'Crear producto o servicio', exact: true }).click();
      const custom = modal.getByRole('heading', { name: 'Crear producto o servicio', exact: true }).locator('..');
      await custom.getByPlaceholder('Ej. Hot dogs o Pintacaritas').fill('Hot dogs del negocio');
      await custom.getByLabel('Cobro del nuevo concepto').selectOption('unidad');
      await custom.getByPlaceholder('0.00').fill('2');
      await custom.getByRole('button', { name: 'Agregar a lista', exact: true }).click();
      await modal.getByLabel('Cantidad de Hot dogs del negocio', { exact: true }).fill(String(count));
      await modal.locator('input[type=date]').fill('2030-11-10');
      await modal.locator('input[type=time]').fill('10:00');
      await modal.getByRole('button', { name: 'Guardar Reserva', exact: true }).click();
      await modal.waitFor({ state: 'hidden' });
      return page.evaluate(async sdkUrls => {
        const { getApps } = await import(sdkUrls.app);
        const { getAuth } = await import(sdkUrls.auth);
        const { getFirestore, collection, getDocs } = await import(sdkUrls.firestore);
        const app = getApps().find(item => item.name === 'diverty-business-pilot'), uid = getAuth(app).currentUser.uid;
        const snap = await getDocs(collection(getFirestore(app), 'artifacts', `business-${uid}`, 'public', 'data', 'eventos'));
        return snap.docs.map(item => ({ id: item.id, ...item.data() }));
      }, sdkUrls);
    };
    await page.goto(origin + '/negocios.html');
    await page.getByRole('heading', { name: 'Entra a tu negocio' }).waitFor();
    for (const width of [320, 392, 1040]) {
      await page.setViewportSize({ width, height: 852 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
      await artifact(`business-login-${width}.png`);
    }
    await page.setViewportSize({ width: 392, height: 852 });
    const suffix = Date.now();
    await signUp('Fiesta Mágica', `alice-${suffix}@example.invalid`);
    const aliceUid = await identity();
    assert.ok(await page.getByRole('heading', { name: 'Fiesta Mágica · Piloto', exact: true }).isVisible());
    const aliceRows = await createReservation('Cliente exclusivo Alice', 200);
    assert.equal(aliceRows.length, 1); assert.equal(aliceRows[0].total, 400);
    await page.getByRole('button', { name: 'Ajustes', exact: true }).first().click();
    await page.getByRole('button').filter({ hasText: 'Facturación y banco' }).click();
    await page.getByText('Entidad bancaria', { exact: true }).locator('..').locator('input').fill('Banco de prueba Alice');
    await page.waitForTimeout(400);
    assert.equal((await read('configuracion','appSettings')).empresa.banco, 'Banco de prueba Alice');
    await page.getByRole('button', { name: 'Inicio', exact: true }).first().click();
    await page.getByRole('button', { name: 'Nueva Reserva', exact: true }).click();
    const draft = page.getByRole('dialog', { name: 'Reserva', exact: true });
    await draft.locator('form input').first().fill('Borrador privado Alice');
    await page.waitForFunction(uid => {
      const value = localStorage.getItem(`business:demo-business-pilot:business-${uid}:diverty_form_draft`);
      return value && JSON.parse(value).cliente === 'Borrador privado Alice';
    }, aliceUid);
    await draft.getByRole('heading', { name: 'Nueva Reserva', exact: true }).locator('..').locator('button').last().click();
    await signOut();
    await signUp('Eventos Estrella', `bob-${suffix}@example.invalid`);
    assert.notEqual(await identity(), aliceUid);
    await page.getByRole('button', { name: 'Nueva Reserva', exact: true }).click();
    const empty = page.getByRole('dialog', { name: 'Reserva', exact: true });
    assert.equal(await empty.locator('form input').first().inputValue(), '');
    await empty.getByRole('heading', { name: 'Nueva Reserva', exact: true }).locator('..').locator('button').last().click();
    const bobRows = await createReservation('Cliente exclusivo Bob', 50);
    assert.equal(bobRows.length, 1); assert.equal(bobRows[0].cliente, 'Cliente exclusivo Bob'); assert.equal(bobRows[0].total, 100);
    assert.equal((await read('configuracion','appSettings')).empresa.banco, '');
    const denied = await page.evaluate(async ({ uid, id, sdkUrls }) => {
      const { getApps } = await import(sdkUrls.app);
      const { getFirestore, doc, getDoc, setDoc } = await import(sdkUrls.firestore);
      const db = getFirestore(getApps().find(item => item.name === 'diverty-business-pilot'));
      const ref = doc(db, 'artifacts', `business-${uid}`, 'public','data','eventos',id), codes = [];
      for (const operation of [() => getDoc(ref), () => setDoc(ref, { total: 0 })]) {
        try { await operation(); codes.push('ALLOWED'); } catch (error) { codes.push(error.code); }
      }
      return codes;
    }, { uid: aliceUid, id: aliceRows[0].id, sdkUrls });
    assert.deepEqual(denied, ['permission-denied','permission-denied']);
    await artifact('business-bob-panel.png');
    await signOut();
    await page.getByLabel('Correo electrónico', { exact: true }).fill(`alice-${suffix}@example.invalid`);
    await page.getByLabel('Contraseña', { exact: true }).fill('Test-only-password-123');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByRole('button', { name: 'Nueva Reserva', exact: true }).waitFor({ timeout: 30000 });
    assert.equal((await read('configuracion','appSettings')).empresa.banco, 'Banco de prueba Alice');
    assert.equal((await read('eventos', aliceRows[0].id)).total, 400);
    await page.getByRole('button', { name: 'Nueva Reserva', exact: true }).click();
    assert.equal(await page.getByRole('dialog', { name: 'Reserva', exact: true }).locator('form input').first().inputValue(), 'Borrador privado Alice');
    assert.deepEqual(errors, []);
    assert.equal(external.some(host => /firestore.googleapis|identitytoolkit|securetoken/.test(host)), false, 'business workflow must not contact production Firebase');
    console.log('PASS: real local Auth signup, two isolated businesses, 200 × $2 and 50 × $2 reservations, cloud settings, private drafts, logout/login, and cross-business reads/writes rejected. No production Firebase requests.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
