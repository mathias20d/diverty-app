import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignmentPatch, assignProvider, markProviderPayment, providerCost, providerDraft, providerServices, saveProvider } from '../src/providers.mjs';
import { expenseSummary } from '../src/expenses.mjs';
const provider = {
  nombre: 'Ana Proveedora',
  activo: true,
  servicios: [{
    id: 's1',
    nombre: 'Pintacaritas',
    costo: 40,
    activo: true
  }]
};
const operation = {
  id: 'sub1',
  proveedorId: 'p1',
  servicioId: 's1',
  costo: 40,
  createdAt: '2026-10-10T12:00:00Z'
};
function database(initial) {
  const records = new Map(Object.entries(initial)),
    writes = [];
  return {
    records,
    writes,
    runTransaction: async (_, callback) => {
      const pending = [];
      const result = await callback({
        get: async ref => ({
          exists: () => records.has(ref),
          data: () => records.get(ref)
        }),
        set: (ref, patch, options) => pending.push({
          ref,
          patch,
          options
        })
      });
      pending.forEach(({
        ref,
        patch,
        options
      }) => {
        assert.equal(options.merge, true);
        records.set(ref, {
          ...records.get(ref),
          ...patch
        });
        writes.push({
          ref,
          patch
        });
      });
      return result;
    }
  };
}
test('provider legacy service remains assignable and zero costs are valid', () => {
  assert.deepEqual(providerServices({
    especialidad: 'Globoflexia',
    costoBase: 30
  }), [{
    id: 'srv-legacy',
    nombre: 'Globoflexia',
    costo: 30,
    activo: true
  }]);
  assert.equal(providerCost('0'), 0);
  assert.equal(providerCost('12,50'), 12.5);
  for (const value of ['', -1, 'abc', '2.555']) assert.throws(() => providerCost(value), /INVALID_PROVIDER_COST/);
  assert.equal(providerDraft(provider).servicios[0].id, 's1');
  assert.throws(() => providerDraft({
    ...provider,
    nombre: ''
  }), /PROVIDER_NAME_REQUIRED/);
});
test('assigning supplier separates legacy costs once and preserves client finances', () => {
  const old = {
    total: 200,
    abono: 80,
    gastos: 100,
    subcontratos: [{
      id: 'old',
      costo: 30
    }],
    _rev: 4
  };
  const patch = assignmentPatch(old, provider, operation),
    saved = {
      ...old,
      ...patch
    };
  assert.equal(saved.gastos, 70);
  assert.equal(saved._rev, 5);
  assert.deepEqual(expenseSummary(saved), {
    internal: 70,
    providers: 70,
    total: 140,
    profit: 60
  });
  assert.equal(saved.abono, 80);
  assert.equal(saved.total, 200);
  assert.equal(assignmentPatch(saved, {
    ...provider,
    activo: false
  }, operation), null);
  assert.throws(() => assignmentPatch(saved, provider, {
    ...operation,
    costo: 45
  }), /ASSIGNMENT_CONFLICT/);
});
test('assignment transaction uses fresh costs and avoids duplicates after acknowledgement loss', async () => {
  const data = database({
    event: {
      total: 200,
      abono: 80,
      gastos: 70,
      costosSeparados: true,
      pagosItems: [{
        id: 'payment',
        monto: 80
      }],
      subcontratos: [],
      _rev: 6
    },
    supplier: provider
  });
  const args = {
    ...data,
    db: {},
    ref: 'event',
    providerRef: 'supplier',
    operation
  };
  await assignProvider(args);
  data.records.set('supplier', {
    ...provider,
    activo: false
  });
  await assignProvider(args);
  assert.equal(data.writes.length, 1);
  assert.equal(data.records.get('event').subcontratos.length, 1);
  assert.equal(data.records.get('event').gastos, 70);
  assert.equal(data.records.get('event').pagosItems[0].monto, 80);
  await assert.rejects(assignProvider({
    ...args,
    operation: {
      ...operation,
      id: 'sub2'
    }
  }), /PROVIDER_UNAVAILABLE/);
  data.records.delete('event');
  await assert.rejects(assignProvider(args), /EVENT_NOT_FOUND/);
});
test('marking supplier paid is idempotent and does not change any expense or client payment', async () => {
  const old = {
    total: 200,
    abono: 80,
    gastos: 70,
    costosSeparados: true,
    subcontratos: [{
      ...operation,
      pagado: false,
      estadoPago: 'pendiente',
      extra: 'keep'
    }],
    _rev: 8
  };
  const data = database({
      event: old
    }),
    args = {
      ...data,
      db: {},
      ref: 'event',
      id: 'sub1',
      paid: true,
      now: operation.createdAt
    };
  await markProviderPayment(args);
  await markProviderPayment(args);
  const saved = data.records.get('event');
  assert.equal(data.writes.length, 1);
  assert.equal(saved._rev, 9);
  assert.equal(saved.subcontratos[0].extra, 'keep');
  assert.equal(saved.subcontratos[0].pagado, true);
  assert.equal(saved.gastos, 70);
  assert.equal(saved.abono, 80);
  assert.deepEqual(expenseSummary(saved), expenseSummary(old));
});
test('provider edits preserve unknown official fields, reject web edits without revision, and retry safely', async () => {
  const original = {
      ...provider,
      numeroSubcontrato: 'SUB-00003',
      updatedAt: '2026-10-01',
      extra: 'keep'
    },
    data = database({
      supplier: original
    });
  const args = {
    ...data,
    db: {},
    ref: 'supplier',
    original,
    draft: {
      ...original,
      nombre: 'Nuevo nombre'
    },
    operationId: 'save1',
    now: operation.createdAt
  };
  data.records.set('supplier', {
    ...original,
    updatedAt: '2026-10-02'
  });
  await assert.rejects(saveProvider(args), /PROVIDER_CHANGED/);
  assert.equal(data.writes.length, 0);
  data.records.set('supplier', original);
  await saveProvider(args);
  await saveProvider(args);
  const saved = data.records.get('supplier');
  assert.equal(data.writes.length, 1);
  assert.equal(saved.nombre, 'Nuevo nombre');
  assert.equal(saved.numeroSubcontrato, 'SUB-00003');
  assert.equal(saved.extra, 'keep');
});
