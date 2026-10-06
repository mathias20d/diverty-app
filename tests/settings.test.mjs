import test from 'node:test';
import assert from 'node:assert/strict';
import { readAppSettings, readResourceCount } from '../src/lib/settings.mjs';

const defaults = { metaMensual: 1500, empresa: { nombreTitular: 'Diverty', banco: 'Banco', ruc: 'RUC' } };
test('zero available staff is preserved instead of being replaced by default capacity', () => {
  assert.equal(readResourceCount(0, 3), 0);
  assert.equal(readResourceCount('0', 1), 0);
  assert.equal(readResourceCount(undefined, 3), 3);
  assert.equal(readResourceCount('invalid', 1), 1);
});
test('invalid or wrongly shaped local settings recover without preventing startup', () => {
  for (const saved of [null, '{incompleto', 'null', '[]', 'false', '42']) {
    assert.deepEqual(readAppSettings(saved, defaults), defaults);
  }
});
test('existing company values and custom settings survive, missing values get defaults', () => {
  const saved = JSON.stringify({ empresa: { nombreTitular: 'Mi empresa' }, metaMensual: 2000, extra: true });
  assert.deepEqual(readAppSettings(saved, defaults), {
    empresa: { nombreTitular: 'Mi empresa', banco: 'Banco', ruc: 'RUC' }, metaMensual: 2000, extra: true
  });
});
test('invalid nested company data and financial target cannot break the app', () => {
  for (const empresa of [null, [], 'incorrecto', { banco: null }]) {
    const actual = readAppSettings(JSON.stringify({ empresa, metaMensual: 'mal' }), defaults);
    assert.equal(actual.empresa.banco, 'Banco');
    assert.equal(actual.metaMensual, 1500);
  }
  assert.equal(readAppSettings('{"metaMensual":0}', defaults).metaMensual, 0);
});
