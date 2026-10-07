import test from 'node:test';
import assert from 'node:assert/strict';
import {addReservationLine, billingMode, clientReservation, editReservationLine, reservationServices, unitPrice} from '../src/lib/reservation-lines.mjs';
import {createReservationModalStore} from '../src/lib/reservation-modal-store.mjs';

test('200 products at $2 each include transportation only once', () => {
  const product = editReservationLine({nombre: 'Hot dogs', precio: 2, cantidad: 1}, {tipoCobro: 'unidad', cantidad: 200});
  assert.equal(product.precio, 400);
  assert.equal(product.precioOriginal, 2);
  assert.equal(product.duracionHoras, 0);
  const form = reservationServices({transporte: '15', abono: '50'}, [product]);
  assert.equal(form.total, '415');
  assert.equal(form.abono, '50');
  assert.equal(form.servicio, 'Hot dogs (x200)');
});

test('hourly quantity changes both cost and operational duration', () => {
  const first = addReservationLine([], {nombre: 'Pintacaritas', tipoCobro: 'hora', precio: 25})[0];
  const two = editReservationLine(first, {cantidad: 2});
  const half = editReservationLine(two, {cantidad: 0.5});
  assert.equal(two.precio, 50);
  assert.equal(two.duracionHoras, 2);
  assert.equal(half.precio, 12.5);
  assert.equal(half.duracionHoras, 0.5);
  assert.equal(billingMode(two), 'hora');
});

test('editing legacy lines derives a unit price without doubling their totals or mutating input', () => {
  const old = {nombre: 'Paquete', cantidad: 2, precio: 150, duracionHoras: 3, descripcion: 'Incluye juegos'};
  const changed = editReservationLine(old, {cantidad: 3});
  assert.equal(unitPrice(old), 75);
  assert.equal(changed.precio, 225);
  assert.equal(changed.duracionHoras, 3);
  assert.equal(old.precio, 150);
  assert.equal(old.cantidad, 2);
  assert.equal(changed.descripcion, old.descripcion);
  assert.equal(editReservationLine(changed, {precio: 120}).precioOriginal, 40);
});

test('adding an already selected service is immutable and handles missing historical base prices', () => {
  const old = [{nombre: 'Pintacaritas', cantidad: 2, precio: 50, isHourly: true}];
  const added = addReservationLine(old, {nombre: 'Pintacaritas', precio: 999});
  assert.equal(added[0].precio, 75);
  assert.equal(added[0].duracionHoras, 3);
  assert.equal(old[0].cantidad, 2);
});

test('cleared inputs never introduce NaN and decimal prices are rounded as money', () => {
  const line = {nombre: 'Producto', cantidad: 3, precioOriginal: 0.1, precio: 0.3};
  assert.equal(editReservationLine(line, {cantidad: 7}).precio, 0.7);
  assert.equal(editReservationLine(line, {cantidad: ''}).precio, 0);
  assert.equal(editReservationLine(line, {precioOriginal: ''}).precio, 0);
});

test('client reservation carries contact details without copying a previous reservation or draft', () => {
  const defaults = {abono: '', serviciosSeleccionados: [], fecha: '', total: ''};
  const next = clientReservation(defaults, {nombre:'Ana', telefono:'60000000', email:'ana@example.invalid', ruc:'ID', id:'old', total:999, abono:999}, '2026-12-01');
  assert.deepEqual(next, {...defaults, cliente:'Ana', telefono:'60000000', email:'ana@example.invalid', ruc:'ID', fecha:'2026-12-01'});
  assert.equal(next.id, undefined);
});

test('modal subscribers receive opening/closing synchronously and can unsubscribe', () => {
  const store = createReservationModalStore({cliente:''});
  const states=[];
  const unsubscribe = store.subscribe(()=>states.push(store.getSnapshot().isOpen));
  store.set({...store.getSnapshot(), isOpen:true});
  store.set(previous=>({...previous,isOpen:false}));
  unsubscribe();
  store.set({...store.getSnapshot(), isOpen:true});
  assert.deepEqual(states,[true,false]);
});
