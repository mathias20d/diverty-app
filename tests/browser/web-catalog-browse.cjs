const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const origin = process.env.ORIGIN || 'http://127.0.0.1:5273';
const sdk = require('./web-admin-sdk.cjs');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const width of [392, 1366]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(() => {
        const base = 'artifacts/diverty-oficial/public/data/';
        window.__messages = []; window.__commits = 0;
        window.__rows = {
          [base+'categorias_web/fiestas']: { nombre: 'Animación infantil', orden: 1 },
          [base+'categorias_web/comida']: { nombre: 'Comida', orden: 2 },
          [base+'catalogo_web/magia']: { nombre: 'Magia Diverty', descripcion: 'Juegos y globoflexia', categoria: 'fiestas', precio: 100, destacado: true, orden: 1 },
          [base+'catalogo_web/hero']: { nombre: 'Héroe azul de aventuras y celebraciones', categoria: 'fiestas', precio: 80, tipoServicio: 'personaje', tematica: 'Superhéroes', oferta: true, orden: 2 },
          [base+'catalogo_web/dogs']: { nombre: 'Hot dogs', categoria: 'comida', precio: 2, tipoCobro: 'unidad', imagen: '/assets/logo-256.webp', orden: 3 },
        };
      });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        if (url.pathname === '/@vite/client') return route.fulfill({ contentType: 'text/javascript', body: require('./vite-test-client.cjs') });
        if (url.pathname === '/') {
          const response = await route.fetch();
          return route.fulfill({ response, body: (await response.text()).replace('/src/main.jsx', '/tests/browser/web-admin-harness.jsx') });
        }
        if (url.pathname.includes('firebase_firestore.js')) return route.fulfill({ contentType: 'text/javascript', body: sdk });
        return route.continue();
      });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin);
      await page.getByRole('button', { name: /Servicios y personajes/ }).click();
      await page.getByRole('status').filter({ hasText: '3 de 3 opciones' }).waitFor();
      const reads = await page.evaluate(() => window.__reads.length);
      const search = page.getByRole('textbox', { name: 'Buscar servicio o personaje', exact: true });
      await search.fill('hero animacion');
      await page.getByRole('status').filter({ hasText: '1 de 3 opciones' }).waitFor();
      assert.equal(await page.getByRole('heading', { name: 'Héroe azul de aventuras y celebraciones', exact: true }).count(), 1);
      await page.getByRole('button', { name: 'Editar', exact: true }).click();
      assert.equal(await page.getByLabel('Nombre', { exact: true }).inputValue(), 'Héroe azul de aventuras y celebraciones');
      await page.getByRole('button', { name: 'Cerrar edición', exact: true }).click();
      assert.equal(await search.inputValue(), 'hero animacion');
      await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
      await page.getByRole('combobox', { name: 'Ordenar catálogo', exact: true }).selectOption('price-asc');
      assert.deepEqual(await page.locator('h3').allTextContents(), ['Hot dogs', 'Héroe azul de aventuras y celebraciones', 'Magia Diverty']);
      await page.getByRole('button', { name: 'Ofertas', exact: true }).click();
      await page.getByRole('status').filter({ hasText: '1 de 3 opciones' }).waitFor();
      await search.fill('nada disponible');
      await page.getByText('No hay paquetes para este filtro.', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
      await page.getByRole('button', { name: 'Comida', exact: true }).click();
      await page.getByRole('heading', { name: 'Hot dogs', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.__reads.length), reads);
      assert.equal(await page.evaluate(() => window.__commits), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('PASS: admin catalog finds names/themes/inclusions/categories, sorts and clears filters, keeps edits and performs no extra reads or writes, at mobile and PC sizes.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
