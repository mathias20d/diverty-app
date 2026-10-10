import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_COMPANY, documentData, documentHTML, ensureDocumentNumber } from '../src/documents.mjs';
const event = {
  cliente: 'Cliente prueba',
  fecha: '2026-10-10',
  total: 95,
  abono: 25,
  transporte: 0,
  servicio: 'Diverty Amigo(a)',
  serviciosSeleccionados: [{
    id: 'amigo',
    nombre: 'Diverty Amigo(a)',
    cantidad: 1,
    precio: 95,
    duracionHoras: 1,
    incluye: ['Animación Infantil 1 Hora', 'Duración 2 Horas']
  }]
};
test('PDF uses total package duration rather than first activity and preserves stored invoice balance', () => {
  const data = documentData(event, 'factura');
  assert.equal(data.lines[0].hours, 2);
  assert.equal(data.total, 95);
  assert.equal(data.balance, 70);
  assert.equal(data.lines.length, 1);
  const html = documentHTML(event, 'factura', DEFAULT_COMPANY);
  assert.ok(html.includes('2 h'));
  assert.ok(html.includes('Animación Infantil 1 Hora'));
  assert.ok(html.includes('Duración 2 Horas'));
  assert.ok(!html.includes('divertyeventos.online'));
});
test('unit and hourly service prices use booked line subtotal, never live catalog prices', () => {
  const data = documentData({
    ...event,
    total: 480,
    servicio: 'Hot dogs + Pintacaritas',
    serviciosSeleccionados: [{
      nombre: 'Hot dogs',
      cantidad: 200,
      precio: 400,
      tipoCobro: 'unidad'
    }, {
      nombre: 'Pintacaritas',
      cantidad: 2,
      precio: 80,
      tipoCobro: 'hora'
    }]
  }, 'factura', [{
    nombre: 'Hot dogs',
    precio: 999
  }]);
  assert.equal(data.lines[0].unitPrice, 2);
  assert.equal(data.lines[0].hours, 0);
  assert.equal(data.lines[1].unitPrice, 40);
  assert.equal(data.lines[1].hours, 2);
  assert.equal(data.total, 480);
});
test('legacy excess inventory is excluded and quote totals use selected services with transport', () => {
  const dirty = {
    ...event,
    total: 999,
    transporte: 10,
    serviciosSeleccionados: [...event.serviciosSeleccionados, ...event.serviciosSeleccionados, {
      nombre: 'Extra no reservado',
      cantidad: 1,
      precio: 1000
    }]
  };
  assert.equal(documentData(dirty, 'cotizacion').total, 105);
  assert.equal(documentData(dirty, 'cotizacion').lines.length, 1);
  assert.equal(documentData(dirty, 'factura').total, 999);
  assert.equal(documentData({
    ...dirty,
    servicio: 'Servicio manual'
  }, 'factura').lines.length, 1);
  assert.equal(documentData({
    ...dirty,
    servicio: 'Servicio manual'
  }, 'factura').lines[0].name, 'Servicio manual');
});
test('all customer and company content is escaped and documents contain no external image/font requests', () => {
  const html = documentHTML({
    ...event,
    cliente: '<script>alert(1)</script>',
    direccion: '" & <img src=x>',
    serviciosSeleccionados: [{
      ...event.serviciosSeleccionados[0],
      incluye: ['<b>Actividad</b>']
    }]
  }, 'factura', {
    ...DEFAULT_COMPANY,
    nombre: '<iframe src=x>'
  });
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&lt;img src=x&gt;'));
  assert.ok(html.includes('&lt;b&gt;Actividad&lt;/b&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<iframe'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('@import'));
});
test('document numbering reads fresh reservation, keeps its official number and increments shared counter once', async () => {
  let current = {
      ...event,
      numeroContrato: 'CON-00001',
      _rev: 8
    },
    counter = {
      ultimo: 7,
      extra: 'keep'
    },
    writes = 0;
  const runTransaction = async (_, callback) => callback({
    get: async ref => ({
      exists: () => true,
      data: () => ref === 'event' ? current : counter
    }),
    set: (ref, patch, options) => {
      assert.equal(options.merge, true);
      if (ref === 'event') current = {
        ...current,
        ...patch
      };else counter = {
        ...counter,
        ...patch
      };
      writes++;
    }
  });
  const args = {
    runTransaction,
    db: {},
    ref: 'event',
    counterRef: 'counter',
    type: 'factura',
    now: '2026-10-10T12:00:00Z'
  };
  await ensureDocumentNumber(args);
  await ensureDocumentNumber(args);
  assert.equal(writes, 2);
  assert.equal(counter.ultimo, 8);
  assert.equal(counter.extra, 'keep');
  assert.equal(current.numeroFactura, 'FAC-00008');
  assert.equal(current.numeroContrato, 'CON-00001');
  assert.equal(current._rev, 9);
  assert.equal(current.abono, 25);
});
test('numbering never guesses an uninitialized or corrupt counter and does not recreate deleted events', async () => {
  const run = counter => async (_, callback) => callback({
    get: async ref => ({
      exists: () => ref === 'event' || counter != null,
      data: () => ref === 'event' ? event : counter
    }),
    set: () => assert.fail('Unexpected write')
  });
  const args = {
    db: {},
    ref: 'event',
    counterRef: 'counter',
    type: 'factura',
    now: 'now'
  };
  await assert.rejects(ensureDocumentNumber({
    ...args,
    runTransaction: run(null)
  }), /COUNTER_NOT_READY/);
  await assert.rejects(ensureDocumentNumber({
    ...args,
    runTransaction: run({
      ultimo: -1
    })
  }), /INVALID_DOCUMENT_COUNTER/);
  await assert.rejects(ensureDocumentNumber({
    ...args,
    runTransaction: async (_, callback) => callback({
      get: async () => ({
        exists: () => false
      })
    })
  }), /EVENT_NOT_FOUND/);
});
