import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceOrderData, serviceOrderReference, serviceOrderShareText } from '../src/lib/service-order.mjs';

test('order references reuse an existing number or the full reservation ID without renumbering invoices', () => {
  const event = { id: 'reserva-completa-123456789', numeroFactura: 'FAC-001', numeroContrato: 'CON-002' };
  assert.equal(serviceOrderReference(event), 'OS-reserva-completa-123456789');
  assert.equal(serviceOrderReference({ ...event, numeroOrdenServicio: 'OS-010' }), 'OS-010');
  assert.equal(event.numeroFactura, 'FAC-001');
});
test('order data preserves fractional hours, unit quantities and package durations, without prices or private costs', () => {
  const event = {
    id: 'test', cliente: 'Cliente de prueba', fecha: '2026-10-22', hora: '14:00', telefono: '60000000',
    total: 450, abono: 50, gastos: 90, detalleGastos: 'Dato interno',
    serviciosSeleccionados: [
      { nombre: 'Plan Diverty', cantidad: 1, duracionHoras: 2, precio: 100, incluye: ['Juegos', 'Globoflexia'], descripcion: 'Juegos' },
      { nombre: 'Pintacaritas', cantidad: 0.5, tipoCobro: 'hora', precio: 12.5 },
      { nombre: 'Hot dogs', cantidad: 200, tipoCobro: 'unidad', unidadEtiqueta: 'hot dog', precio: 400 },
      { nombre: 'Actividad por niño', cantidad: 25, tipoCobro: 'nino', precio: 125 },
    ], subcontratos: [{ nombre: 'Animador de prueba', servicio: 'Animación', costo: 90, pagado: false }],
  };
  const before = structuredClone(event), data = serviceOrderData(event);
  assert.deepEqual(data.services.map(line => [line.quantity, line.unit, line.duration]), [[1,'servicio(s)','2 horas'],[0.5,'horas','0.5 horas'],[200,'hot dog','No aplica'],[25,'niños','—']]);
  assert.equal(data.services[3].missingDuration,true);
  assert.deepEqual(data.staff, [{ name: 'Animador de prueba', role: 'Animación' }]);
  assert.equal(data.services[0].description, 'Juegos\nGloboflexia');
  assert.doesNotMatch(JSON.stringify(data), /precio|costo|abono|gastos|Dato interno|pagado/);
  assert.deepEqual(event, before);
});

test('old orders resolve catalog duration; custom durations win and no duration is invented', () => {
  const event={serviciosSeleccionados:[{id:'show',nombre:'Show infantil',cantidad:1},{nombre:'Plan a medida',cantidad:3,duracionHoras:1.5,duracionDefinidaManualmente:true,descripcion:'Duración total: 4 horas'},{nombre:'Servicio sin duración'}]};
  const data=serviceOrderData(event,[{id:'show',nombre:'Show infantil',serviciosLista:'Duración: 45 minutos'}]);
  assert.deepEqual(data.services.map(s=>s.duration),['0.75 horas','1.5 horas','—']);
  assert.deepEqual(data.services.map(s=>s.missingDuration),[false,false,true]);
  assert.doesNotMatch(JSON.stringify(data),/Según reserva/);
});
test('historical reservations and missing staff remain usable, while broken lines are omitted', () => {
  assert.equal(serviceOrderData({ servicio: 'Animación infantil' }).services[0].name, 'Animación infantil');
  const data = serviceOrderData({ serviciosSeleccionados: [null, {}, { nombre: 'Servicio', cantidad: 0 }], subcontratos: [null, { costo: 10 }] });
  assert.equal(data.services.length, 1);
  assert.equal(data.services[0].quantity, 1);
  assert.deepEqual(data.staff, []);
});
test('the sharing message describes a paper service order instead of an invoice or payment request', () => {
  const message = serviceOrderShareText({ cliente: 'Cliente', fecha: '2026-10-22', total: 100, abono: 0 });
  assert.match(message, /22\/10\/2026/);
  assert.match(message, /firma y la calificación/);
  assert.doesNotMatch(message, /factura|saldo|abono|100/);
});

test('named staff do not need supplier costs and repeated assignments do not print twice', () => {
  const event = { personalResponsable:[{nombre:'Ana',rol:'Animador(a)'},{nombre:'Luis',rol:'Payaso(a)'},{nombre:'María',rol:'Pintacaritas'},{nombre:'Eva',rol:'Encargado del servicio infantil'},{nombre:''}],subcontratos:[{nombre:'Ana',servicio:'Animador(a)',costo:50}] };
  assert.equal(serviceOrderData(event).staff.length,4);
  assert.deepEqual(serviceOrderData(event).staff[2],{name:'María',role:'Pintacaritas'});
  assert.doesNotMatch(JSON.stringify(serviceOrderData(event)),/costo/);
  const data = serviceOrderData({serviciosSeleccionados:[{nombre:'Plan',descripcion:'Todo lo que incluye:\n• Juegos\n• Música',incluye:['Juegos','Música']}]});
  assert.equal(data.services[0].description,'Todo lo que incluye:\nJuegos\nMúsica');
});
