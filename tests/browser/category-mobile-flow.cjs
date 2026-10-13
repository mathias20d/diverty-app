const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const origin = process.env.ORIGIN || 'http://127.0.0.1:5273';
const base = 'artifacts/diverty-oficial/public/data/';
const names = ['Burbujas premium para fiestas infantiles y celebraciones escolares', 'Planes de animadores, payasitos y pintacaritas para eventos', 'Catalogoconunnombreextremadamentelargosinespaciosparacomprobarlalectura'];
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const width of [320, 360, 392, 430, 768, 1366]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 768, hasTouch: width < 768 });
      await context.addInitScript(({ base, names }) => {
        window.__messages = []; window.__commits = 0;
        window.__rows = Object.fromEntries(names.map((nombre, index) => [base + 'categorias_web/cat-' + index, { nombre, orden: index + 1, activo: index !== 2, visible: index !== 2, visibilidad: index === 2 ? 'oculto' : 'activo' }]));
      }, { base, names });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        if (url.pathname === '/@vite/client') return route.fulfill({ contentType: 'text/javascript', body: require('./vite-test-client.cjs') });
        if (url.pathname === '/') {
          const response = await route.fetch();
          return route.fulfill({ response, body: (await response.text()).replace('/src/main.jsx', '/tests/browser/web-admin-harness.jsx') });
        }
        if (url.pathname.includes('firebase_firestore.js')) return route.fulfill({ contentType: 'text/javascript', body: require('./web-admin-sdk.cjs') });
        return route.continue();
      });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin);
      // Mimic the CRM content padding, not just a full-width component harness.
      await page.locator('#root').evaluate(root => { root.style.padding = '16px'; });
      await page.getByRole('button', { name: /Catálogos/ }).click();
      for (const name of names) {
        const card = page.getByRole('article', { name: 'Catálogo: ' + name, exact: true });
        const heading = card.getByRole('heading', { name, exact: true });
        await heading.waitFor();
        const bounds = await heading.evaluate(element => {
          const style = getComputedStyle(element), rect = element.getBoundingClientRect();
          return { text: element.textContent, overflow: style.textOverflow, clamp: style.webkitLineClamp, height: rect.height, line: parseFloat(style.lineHeight), font: parseFloat(style.fontSize), widthFits: element.scrollWidth <= element.clientWidth + 1 };
        });
        assert.equal(bounds.text, name); assert.notEqual(bounds.overflow, 'ellipsis'); assert.equal(bounds.clamp, 'none'); assert.ok(bounds.widthFits); assert.ok(bounds.font >= 14);
        if (width < 640) {
          assert.ok(bounds.height > bounds.line, 'long names must wrap, not disappear');
          const positions = await card.evaluate(element => {
            const title = element.querySelector('h3').getBoundingClientRect();
            return [...element.querySelectorAll('button')].map(button => { const r = button.getBoundingClientRect(); return { below: r.top >= title.bottom, width: r.width, height: r.height, fits: r.left >= 0 && r.right <= innerWidth }; });
          });
          assert.ok(positions.every(position => position.below && position.width >= 44 && position.height >= 44 && position.fits), 'controls must not crowd the title and must remain touchable');
        }
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');
      assert.match(await page.getByRole('article', { name: 'Catálogo: ' + names[2], exact: true }).innerText(), /Oculto/i);
      assert.equal(await page.getByRole('button', { name: 'Subir ' + names[0], exact: true }).isDisabled(), true);
      await page.getByRole('button', { name: 'Bajar ' + names[0], exact: true }).click();
      await page.waitForFunction(base => window.__rows[base + 'categorias_web/cat-0'].orden === 2, base);
      assert.deepEqual(await page.locator('[data-category-id] h3').allTextContents(), [names[1], names[0], names[2]]);
      await page.getByRole('button', { name: 'Editar ' + names[0], exact: true }).click();
      assert.equal(await page.getByLabel('Nombre', { exact: true }).inputValue(), names[0]);
      const editedName = names[0] + ' y cumpleaños';
      await page.getByLabel('Nombre', { exact: true }).fill(editedName);
      await page.getByRole('button', { name: 'Guardar catálogo', exact: true }).click();
      await page.getByRole('heading', { name: editedName, exact: true }).waitFor();
      await page.getByRole('button', { name: 'Nuevo Catálogo', exact: true }).click();
      await page.getByLabel('Nombre', { exact: true }).fill('Nuevo catálogo sin servicios');
      await page.getByRole('button', { name: 'Guardar catálogo', exact: true }).click();
      await page.getByRole('heading', { name: 'Nuevo catálogo sin servicios', exact: true }).waitFor();
      const saved = await page.evaluate(base => ({ category: window.__rows[base + 'categorias_web/nuevo-catalogo-sin-servicios'], sync: window.__rows[base + 'config_web/web_sync'] }), base);
      assert.equal(saved.category.activo, true); assert.equal(saved.category.visible, true); assert.ok(saved.sync.versions.categorias_web >= 3);
      assert.deepEqual(errors, []);
      if (process.env.BROWSER_ARTIFACT_DIR) {
        fs.mkdirSync(process.env.BROWSER_ARTIFACT_DIR, { recursive: true });
        await page.screenshot({ path: path.join(process.env.BROWSER_ARTIFACT_DIR, `admin-categories-${width}.png`), fullPage: true });
      }
      await context.close(); console.log('PASS: category names, touch actions, reorder/edit/create and web sync at ' + width + 'px.');
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
