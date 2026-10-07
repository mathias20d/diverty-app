import {portalIndex} from '../src/lib/customer-portal.mjs';
import {needsPlaceReference} from '../src/lib/location-reference.mjs';
import {reservationGpsPoint} from '../src/lib/gps-point.mjs';
import test from 'node:test';
import { transportPending } from '../src/lib/web-request-review.mjs';
import { bookingControlDates } from '../src/lib/booking-control.mjs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const extract = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const production = extract('const christmasEventGps =', 'const christmasDistanceKm') + extract('const publicSlot = value => {', 'const isPendingWebRequest') +
  extract('const isPendingWebRequest', 'const getResourceAvailability') +
  extract('const clientStatusRef = id =>', 'let preparationPromise = null;') +
  extract('  const transitionEventStatus = useCallback', '  const handleUpdateEstado') +
  extract('  const handleConfirmWebRequest = useCallback', '  const handleRejectWebRequest');
const base = 'artifacts/diverty-oficial/public/data/';

function fixture() {
  const rows = new Map();
  const ref = (collection, id) => ({ id, path: base + collection + '/' + id });
  const rawRunTransaction = async (_db, callback) => {
    const writes = [];
    const tx = {
      get: async r => {
        assert.equal(writes.length, 0, 'Firestore reads must precede writes');
        return { exists: () => rows.has(r.path), data: () => rows.get(r.path) };
      },
      set: (r, data, options) => writes.push(() => rows.set(r.path,
        options?.merge ? { ...rows.get(r.path), ...data } : structuredClone(data))),
      delete: r => writes.push(() => rows.delete(r.path))
    };
    await callback(tx);
    writes.forEach(write => write());
  };
  const ctx = {
    portalIndex, db: {}, appId: 'diverty-oficial', needsPlaceReference, reservationGpsPoint, transportPending, bookingControlDates, confirmCentralRequest:async()=>null,
    doc: (_db, ...parts) => ({ id: parts.at(-1), path: parts.join('/') }),
    isEventRef: r => r.path.startsWith(base + 'eventos/'),
    availabilityRef: id => ref('disponibilidad_web', id), getDocRef: id => ref('eventos', id),
    rawRunTransaction, rawSetDoc: async () => {}, rawDeleteDoc: async () => {},
    writeBatch: () => { throw new Error('not used in this test'); },
    useCallback: fn => fn, publishSync: async () => {}, setEventos() {},
    showAlert() {}, console: { error() {} },
    utils: { triggerHaptic() {}, normalizeText: value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') }
  };
  vm.createContext(ctx);
  vm.runInContext(production + '\nthis.api = { setDoc, deleteDoc, runTransaction, transitionEventStatus, handleConfirmWebRequest };', ctx);
  return { rows, ref, api: ctx.api, ctx };
}

const event = {
  id: 'web-1', ownerUid: 'customer', origen: 'Web Directa', estado: 'Pendiente',
  cliente: 'Cliente ficticio', direccion:'PH de prueba', telefono: '60000000', fecha: '2026-11-10', hora: '10:00',
  servicio: 'Animación', total: '100', abono: '0', _rev: 1,
  resourceRequirements: { animadores: 1, payasos: 0, durationMinutes: 120 }
};

test('confirmation updates the event, customer status and public operational projection atomically', async () => {
  const f = fixture();
  f.rows.set(f.ref('eventos', event.id).path, event);
  await f.api.transitionEventStatus(event.id, 'Confirmado', { requirePendingWeb: true });
  assert.equal(f.rows.get(f.ref('eventos', event.id).path).estado, 'Confirmado');
  const customer = f.rows.get(f.ref('reservas_cliente', event.id).path);
  assert.equal(customer.estado, 'Confirmado');
  assert.equal(customer.ownerUid, event.ownerUid);
  const publicData = f.rows.get(f.ref('disponibilidad_web', event.id).path);
  assert.equal(publicData.resourceRequirements.animadores, 1);
  for (const field of ['cliente', 'telefono', 'ownerUid', 'total', 'abono']) assert.equal(field in publicData, false);
  await assert.rejects(f.api.transitionEventStatus(event.id, 'Confirmado', { requirePendingWeb: true }), /ALREADY_PROCESSED/);
});

test('manual reservations without a browser owner receive a private searchable index that follows edits and deletion', async () => {
  const f=fixture();
  const manual={...event,id:'manual',ownerUid:'',cliente:'María Peña',telefono:'+507 6070-2108'};
  await f.api.setDoc(f.ref('eventos',manual.id),manual);
  assert.deepEqual(f.rows.get(f.ref('portal_busqueda',manual.id).path),{nombreKey:'maria pena',telefonoKey:'60702108'});
  assert.equal(f.rows.has(f.ref('reservas_cliente',manual.id).path),false);
  await f.api.setDoc(f.ref('eventos',manual.id),{telefono:'60000000'},{merge:true});
  assert.equal(f.rows.get(f.ref('portal_busqueda',manual.id).path).telefonoKey,'60000000');
  await f.api.deleteDoc(f.ref('eventos',manual.id));
  assert.equal(f.rows.has(f.ref('portal_busqueda',manual.id).path),false);
});

test('changing date and time republishes availability and customer tracking together', async () => {
  const f = fixture();
  await f.api.setDoc(f.ref('eventos', event.id), event);
  await f.api.setDoc(f.ref('eventos', event.id), { fecha: '2026-11-12', hora: '15:00' }, { merge: true });
  for (const collection of ['eventos', 'disponibilidad_web', 'reservas_cliente']) {
    const row = f.rows.get(f.ref(collection, event.id).path);
    assert.equal(row.fecha, '2026-11-12');
    assert.equal(row.hora, '15:00');
  }
  assert.equal(f.rows.get(f.ref('eventos', event.id).path).total, '100');
});

test('cancellation preserves the event and customer status while freeing its public slot and lock', async () => {
  const f = fixture();
  await f.api.setDoc(f.ref('eventos', event.id), event);
  const lock = f.ref('disponibilidad_web', 'slot_2026-11-10_10-00');
  f.rows.set(lock.path, { reservationIds: [event.id], count: 1, capacity: 1 });
  await f.api.transitionEventStatus(event.id, 'Cancelado');
  assert.equal(f.rows.get(f.ref('eventos', event.id).path).estado, 'Cancelado');
  assert.equal(f.rows.get(f.ref('reservas_cliente', event.id).path).estado, 'Cancelado');
  assert.equal(f.rows.has(f.ref('disponibilidad_web', event.id).path), false);
  assert.equal(f.rows.has(lock.path), false);
});

test('rejection frees only the rejected reservation, keeping other IDs in a shared slot', async () => {
  const f = fixture();
  await f.api.setDoc(f.ref('eventos', event.id), event);
  const lock = f.ref('disponibilidad_web', 'slot_2026-11-10_10-00');
  f.rows.set(lock.path, { reservationIds: [event.id, 'other'], count: 2, capacity: 3 });
  await f.api.transitionEventStatus(event.id, 'Rechazada', { requirePendingWeb: true });
  assert.equal(f.rows.has(f.ref('disponibilidad_web', event.id).path), false);
  const remaining = f.rows.get(lock.path);
  assert.equal(remaining.count, 1);
  assert.deepEqual(Array.from(remaining.reservationIds), ['other']);
});

test('rescheduling moves the lock and preserves other reservations at both times', async () => {
  const f = fixture();
  await f.api.setDoc(f.ref('eventos', event.id), event);
  const old = f.ref('disponibilidad_web', 'slot_2026-11-10_10-00');
  const next = f.ref('disponibilidad_web', 'slot_2026-11-12_15-00');
  f.rows.set(old.path, { reservationIds: [event.id, 'old-other'], count: 2, capacity: 3 });
  f.rows.set(next.path, { reservationIds: ['new-other'], count: 1, capacity: 3 });
  await f.api.setDoc(f.ref('eventos', event.id), { fecha: '2026-11-12', hora: '15:00' }, { merge: true });
  assert.deepEqual(Array.from(f.rows.get(old.path).reservationIds), ['old-other']);
  assert.deepEqual(Array.from(f.rows.get(next.path).reservationIds).sort(), [event.id, 'new-other'].sort());
  assert.equal(f.rows.get(next.path).count, 2);
  assert.equal(f.rows.get(next.path).capacity, 3);
});

test('cancelling twice and deleting a cancelled event do not release another legacy reservation', async () => {
  const f = fixture();
  await f.api.setDoc(f.ref('eventos', event.id), event);
  const lock = f.ref('disponibilidad_web', 'slot_2026-11-10_10-00');
  f.rows.set(lock.path, { count: 3, capacity: 3 });
  await f.api.transitionEventStatus(event.id, 'Cancelado');
  await f.api.transitionEventStatus(event.id, 'Cancelado');
  await f.api.deleteDoc(f.ref('eventos', event.id));
  assert.equal(f.rows.get(lock.path).count, 2);
  for (const collection of ['eventos', 'disponibilidad_web', 'reservas_cliente']) {
    assert.equal(f.rows.has(f.ref(collection, event.id).path), false);
  }
});

test('reactivating a cancelled reservation reacquires its slot exactly once', async () => {
  const f = fixture();
  await f.api.setDoc(f.ref('eventos', event.id), event);
  await f.api.transitionEventStatus(event.id, 'Cancelado');
  await f.api.transitionEventStatus(event.id, 'Confirmado');
  await f.api.transitionEventStatus(event.id, 'Preparando');
  const lock = f.rows.get(f.ref('disponibilidad_web', 'slot_2026-11-10_10-00').path);
  assert.equal(lock.count, 1);
  assert.deepEqual(Array.from(lock.reservationIds), [event.id]);
});

test('changing a normal reservation to Santa moves between the correct lock namespaces', async () => {
  const f = fixture();
  await f.api.setDoc(f.ref('eventos', event.id), event);
  await f.api.setDoc(f.ref('eventos', event.id), { esNavidad: true }, { merge: true });
  assert.equal(f.rows.has(f.ref('disponibilidad_web', 'slot_2026-11-10_10-00').path), false);
  assert.equal(f.rows.get(f.ref('disponibilidad_web', 'slot_santa_2026-11-10_10-00').path).count, 1);
});

test('a failed event mutation leaves the event, projections and locks unchanged', async () => {
  const f = fixture();
  await f.api.setDoc(f.ref('eventos', event.id), event);
  const before = structuredClone([...f.rows]);
  await assert.rejects(f.api.runTransaction({}, async tx => {
    const ref = f.ref('eventos', event.id);
    await tx.get(ref);
    tx.set(ref, { hora: '15:00' }, { merge: true });
    throw new Error('simulated failure');
  }), /simulated failure/);
  assert.deepEqual([...f.rows], before);
});

test('accepting a web request publishes staff metadata and customer confirmation', async () => {
  const f = fixture();
  await f.api.setDoc(f.ref('eventos', event.id), event);
  assert.equal(await f.api.handleConfirmWebRequest(event), true);
  assert.equal(f.rows.get(f.ref('reservas_cliente', event.id).path).estado, 'Confirmado');
  assert.equal(f.rows.get(f.ref('disponibilidad_web', event.id).path).resourceRequirements.animadores, 1);
  assert.equal(await f.api.handleConfirmWebRequest(event), false, 'another device cannot accept the same pending request twice');
});

test('an outdated device cannot accept a location that now requires transport review', async () => {
  const f = fixture();
  await f.api.setDoc(f.ref('eventos', event.id), { ...event, requiereRevisionUbicacion: true });
  const before = structuredClone([...f.rows]);
  assert.equal(await f.api.handleConfirmWebRequest(event), false);
  assert.deepEqual([...f.rows], before);
});


test('a manual Santa request accepts its remote written address without GPS or invented coordinates',async()=>{
  const f=fixture(), pending={...event,esNavidad:true,ubicacion:'Ubicación por confirmar',transporteRevisadoEnApp:true};
  f.rows.set(f.ref('eventos',event.id).path,pending);
  assert.equal(await f.api.handleConfirmWebRequest({...pending,lat:9,lng:-79},'Santa 1'),true);
  const remote=f.rows.get(f.ref('eventos',event.id).path);
  assert.equal(remote.estado,'Confirmado');assert.equal(remote.direccion,pending.direccion);assert.equal(remote.santaAsignado,'Santa 1');
  assert.equal('lat' in remote,false);assert.equal('lng' in remote,false);
  assert.equal('lat' in f.rows.get(f.ref('disponibilidad_web',event.id).path),false);
  assert.equal(f.rows.get(f.ref('reservas_cliente',event.id).path).estado,'Confirmado');
});


test('admin edits coordinate the original and new dates with central booking transactions',async()=>{
  const f=fixture();
  f.rows.set(f.ref('config_web','global').path,{centralBookingValidation:true});
  f.rows.set(f.ref('eventos',event.id).path,event);
  await f.api.setDoc(f.ref('eventos',event.id),{...event,fecha:'2026-11-11',hora:'23:30'});
  for(const date of ['2026-11-09','2026-11-10','2026-11-11','2026-11-12'])assert.equal(f.rows.get(f.ref('booking_control',date).path).revision,1);
  assert.equal(f.rows.get(f.ref('reservas_cliente',event.id).path).fecha,'2026-11-11');
});
test('central approval uses returned server event and errors cannot fall back to client confirmation',async()=>{
  const f=fixture(),central={...event,centralBookingVersion:1};
  f.ctx.rawRunTransaction=async()=>assert.fail('Central approval cannot use a direct client transaction');
  f.ctx.confirmCentralRequest=async()=>({...central,estado:'Confirmado'});
  assert.equal(await f.api.handleConfirmWebRequest(central),true);
  f.ctx.confirmCentralRequest=async()=>{throw Object.assign(new Error('Horario ocupado'),{details:{reason:'SLOT_FULL'}});};
  assert.equal(await f.api.handleConfirmWebRequest(central),false);
});

test('a GPS-only request cannot be approved until its venue reference is saved',async()=>{
  const f=fixture(),gps={...event,direccion:'https://www.google.com/maps?q=9.01,-79.5',lat:9.01,lng:-79.5,referenciaLugar:''};
  f.rows.set(f.ref('eventos',gps.id).path,gps);
  assert.equal(await f.api.handleConfirmWebRequest(gps),false);
  assert.equal(f.rows.get(f.ref('eventos',gps.id).path).estado,'Pendiente');
  await f.api.setDoc(f.ref('eventos',gps.id),{...gps,referenciaLugar:'PH Las Palmeras, salón social'});
  assert.equal(await f.api.handleConfirmWebRequest(f.rows.get(f.ref('eventos',gps.id).path)),true);
  assert.equal(f.rows.get(f.ref('eventos',gps.id).path).referenciaLugar,'PH Las Palmeras, salón social');
});
test('an outdated device cannot approve after the remote venue reference was removed',async()=>{
  const f=fixture(),gps={...event,direccion:'https://www.google.com/maps?q=9.01,-79.5',referenciaLugar:'PH Las Palmeras'};
  f.rows.set(f.ref('eventos',gps.id).path,{...gps,referenciaLugar:''});
  assert.equal(await f.api.handleConfirmWebRequest(gps),false);
  assert.equal(f.rows.get(f.ref('eventos',gps.id).path).estado,'Pendiente');
});
