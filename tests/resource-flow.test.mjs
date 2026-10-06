import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { peakResourceUsage } from '../src/lib/resource-usage.mjs';

const source = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const context = vm.createContext({ peakResourceUsage, utils: { normalizeText: value => String(value || '').toLowerCase() } });
vm.runInContext(source.slice(source.indexOf('const publicSlot ='), source.indexOf('const NORMAL_OPERATION_STEPS')) + '\nthis.check = getResourceAvailability;', context);
const request = { id: 'new', fecha: '2026-11-10', hora: '10:00', resourceRequirements: { animadores: 1, payasos: 0, durationMinutes: 120 } };
const row = (id, hora, estado = 'Confirmado') => ({ id, fecha: request.fecha, hora, estado, resourceRequirements: { animadores: 1, payasos: 0, durationMinutes: 60 } });

test('operational preview permits two adjacent events and excludes cancelled events and quotations', () => {
  const result = context.check(request, [row('a', '10:00'), row('b', '11:00'), row('c', '10:00', 'Cancelado'), row('d', '10:00', 'Cotización')], { animadores: 2, payasos: 1 });
  assert.equal(result.feasible, true);
  assert.equal(result.usage.animadores, 1);
});
test('operational preview rejects a real staff overlap', () => {
  const result = context.check(request, [row('a', '10:00'), row('b', '10:30')], { animadores: 2, payasos: 1 });
  assert.equal(result.feasible, false);
  assert.equal(result.usage.animadores, 2);
});
