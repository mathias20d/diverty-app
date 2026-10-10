// Reuses the web administrator's projection and transaction rules.
import {doc,runTransaction as rawRunTransaction} from 'firebase/firestore';
import {db} from './firebase';
import {normalize} from './workspace-data.mjs';
import {portalIndex} from './domain/customer-portal.mjs';
import {bookingControlDates} from './domain/booking-control.mjs';
import {serviceDurationHours} from './domain/service-duration.mjs';
import {peakResourceUsage} from './domain/resource-usage.mjs';
const utils={normalizeText:normalize},appId='diverty-oficial';
const isEventRef=ref=>ref.path.startsWith('artifacts/'+appId+'/public/data/eventos/');
const availabilityRef=id=>doc(db,'artifacts',appId,'public','data','disponibilidad_web',id);
const publicSlot = value => {
  const state = String(value.estado || '').toLowerCase();
  if (!value.fecha || value.deletedLocally === true || /cancelad|rechaz|cot/.test(state)) return null;

  const slot = {
    fecha: String(value.fecha),
    hora: String(value.hora || '')
  };

  // Preserve the reservation coordinates in disponibilidad_web so the
  // Santa booking page can recommend nearby delivery times.
  const lat = Number(value.lat);
  const lng = Number(value.lng);
  if (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  ) {
    slot.lat = lat;
    slot.lng = lng;
  }

  // Keep Christmas/Santa metadata when it is present on the event.
  if (value.esNavidad === true) {
    slot.esNavidad = true;
    slot.recursoNavidad = value.recursoNavidad || 'Santa';
    const santa = String(value.santaAsignado || '').trim();
    if (santa) slot.santaAsignado = santa;
  }

  // Reservas normales: publica solo metadatos logísticos no sensibles.
  // La web usa esto para comprobar disponibilidad de animadores/payaso
  // sin tener acceso a datos privados del cliente.
  if (value.esNavidad !== true) {
    const rr = value.resourceRequirements && typeof value.resourceRequirements === 'object' ? value.resourceRequirements : {};
    const animadores = Math.max(0, Math.round(Number(rr.animadores) || 0));
    const payasos = Math.max(0, Math.round(Number(rr.payasos) || 0));
    const durationMinutes = Math.max(30, Math.round(Number(rr.durationMinutes || value.duracionMinutos) || 120));
    if (animadores || payasos || durationMinutes) {
      slot.resourceRequirements = { animadores, payasos, durationMinutes };
      slot.duracionMinutos = durationMinutes;
      slot.tipoReserva = 'normal';
    }
  }

  return slot;
};

const isPendingWebRequest = value => {
  const estado = String(value?.estado || '').trim().toLowerCase();
  const origen = String(value?.origen || '').trim().toLowerCase();
  return estado === 'pendiente' && origen === 'web directa';
};
const resourceTimeMinutes = value => {
  const m = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};
const inferResourceRequirements = value => {
  const explicit = value?.resourceRequirements && typeof value.resourceRequirements === 'object' ? value.resourceRequirements : {};
  const text = utils.normalizeText([
    value?.servicio,
    value?.descripcionEvento,
    ...(Array.isArray(value?.serviciosSeleccionados) ? value.serviciosSeleccionados.flatMap(x => [x?.nombre, x?.descripcion, ...(Array.isArray(x?.incluye) ? x.incluye : [])]) : [])
  ].filter(Boolean).join(' '));
  const findCount = (word) => {
    const plural = word === 'animador' ? 'animadores?' : 'payasos?';
    const m = text.match(new RegExp(`(\\d+)\\s*${plural}\\b`));
    if (m) return Math.max(0, Number(m[1]) || 0);
    return new RegExp(`\\b${plural}\\b`).test(text) ? 1 : 0;
  };
  const serviceDurations = Array.isArray(value?.serviciosSeleccionados)
    ? value.serviciosSeleccionados.map(x => serviceDurationHours(x)).filter(Boolean)
    : [];
  const durationMinutes = Math.max(
    30,
    Math.round(Number(explicit.durationMinutes || value?.duracionMinutos) || ((serviceDurations.length ? Math.max(...serviceDurations) : 2) * 60))
  );
  const hasExplicitAnimadores = Object.prototype.hasOwnProperty.call(explicit, 'animadores');
  const hasExplicitPayasos = Object.prototype.hasOwnProperty.call(explicit, 'payasos');
  return {
    animadores: hasExplicitAnimadores ? Math.max(0, Math.round(Number(explicit.animadores) || 0)) : findCount('animador'),
    payasos: hasExplicitPayasos ? Math.max(0, Math.round(Number(explicit.payasos) || 0)) : findCount('payaso'),
    durationMinutes
  };
};
const resourcesOverlap = (a, b) => {
  if (!a?.fecha || !b?.fecha || String(a.fecha) !== String(b.fecha)) return false;
  const aStart = resourceTimeMinutes(a.hora), bStart = resourceTimeMinutes(b.hora);
  if (aStart === null || bStart === null) return false;
  const ar = inferResourceRequirements(a), br = inferResourceRequirements(b);
  return aStart < bStart + br.durationMinutes && bStart < aStart + ar.durationMinutes;
};
const getResourceAvailability = (request, rows, capacity) => {
  const needed = inferResourceRequirements(request);
  const cap = {
    animadores: Math.max(0, Math.round(Number(capacity?.animadores) || 0)),
    payasos: Math.max(0, Math.round(Number(capacity?.payasos) || 0))
  };
  const windows = (Array.isArray(rows) ? rows : []).filter(ev =>
    ev && ev.id !== request?.id && publicSlot(ev) && ev.esNavidad !== true &&
    !isPendingWebRequest(ev) && resourcesOverlap(request, ev)
  ).map(ev => ({ start:resourceTimeMinutes(ev.hora), ...inferResourceRequirements(ev) }))
    .map(window => ({...window, duration:window.durationMinutes}));
  const usage = peakResourceUsage(resourceTimeMinutes(request?.hora), needed.durationMinutes, windows);
  const available = {
    animadores: Math.max(0, cap.animadores - usage.animadores),
    payasos: Math.max(0, cap.payasos - usage.payasos)
  };
  return {
    needed, usage, available, capacity:cap,
    feasible: needed.animadores <= available.animadores && needed.payasos <= available.payasos
  };
};

const clientStatusRef = id => doc(db,'artifacts',appId,'public','data','reservas_cliente',id);
const clientStatus = value => Object.fromEntries(['ownerUid','cliente','telefono','fecha','hora','estado','servicio','total','abono'].map(key => [key,String(value[key] ?? '')]));
const projectEvent = (writer, ref, value) => {
  if (value.ownerUid) writer.set(clientStatusRef(ref.id), clientStatus(value));
  else writer.delete(clientStatusRef(ref.id));
  const portalRef = doc(db,'artifacts',appId,'public','data','portal_busqueda',ref.id);
  const index = portalIndex(value);
  if(index) writer.set(portalRef,index); else writer.delete(portalRef);
  const slot = publicSlot(value);
  if (slot) writer.set(availabilityRef(ref.id), slot);
  else writer.delete(availabilityRef(ref.id));
};
// Queue writes so event projections and both capacity locks can be read first.
// Firestore rejects reads made after the first write in a transaction.
const eventLock = value => {
  if (!value || !publicSlot(value) || !value.hora) return null;
  const santa = value.esNavidad === true || /entregas de nochebuena/i.test(String(value.servicio || ''));
  const key = `${String(value.fecha)}_${String(value.hora).replace(':','-')}`.replace(/[^0-9A-Za-z_-]/g,'');
  return { id: `${santa ? 'slot_santa_' : 'slot_'}${key}`, fecha: value.fecha, hora: value.hora };
};
const runTransaction = (database, callback) => rawRunTransaction(database, async tx => {
  const readValues = new Map(), writes = [], events = new Map();
  const read = async ref => {
    const snap = await tx.get(ref);
    readValues.set(ref.path, snap.exists() ? snap.data() : null);
    return snap;
  };
  const wrapped = {
    get: read,
    set: (ref, value, options) => {
      if (isEventRef(ref)) {
        if (options?.merge && !readValues.has(ref.path) && !events.has(ref.path)) throw new Error('EVENT_READ_REQUIRED');
        const previous = events.has(ref.path) ? events.get(ref.path).value : readValues.get(ref.path);
        events.set(ref.path, { ref, value: options?.merge ? {...previous, ...value} : value });
      }
      writes.push({ ref, value, options });
      return wrapped;
    },
    delete: ref => {
      writes.push({ ref, deleted: true });
      if (isEventRef(ref)) events.set(ref.path, { ref, value: null });
      return wrapped;
    }
  };
  const result = await callback(wrapped);
  const locks = new Map();
  const changeLock = (lock, id, add) => {
    if (!lock) return;
    if (!locks.has(lock.id)) locks.set(lock.id, {...lock, remove: new Set(), add: new Set()});
    locks.get(lock.id)[add ? 'add' : 'remove'].add(String(id));
  };
  for (const {ref, value} of events.values()) {
    if (!readValues.has(ref.path)) await read(ref);
    const oldLock = eventLock(readValues.get(ref.path)), newLock = eventLock(value);
    if (oldLock?.id === newLock?.id) continue;
    changeLock(oldLock, ref.id, false);
    changeLock(newLock, ref.id, true);
  }
  // Include locks already read by the callback without adding extra reads.
  for (const lock of locks.values()) {
    lock.ref = availabilityRef(lock.id);
    if (!readValues.has(lock.ref.path)) await read(lock.ref);
  }
  const controls = [];
  if (events.size) {
    const cfgRef = doc(database, 'artifacts', appId, 'public', 'data', 'config_web', 'global');
    const cfgSnap = await read(cfgRef);
    if (cfgSnap.data()?.centralBookingValidation === true) {
      const dates = new Set();
      for (const {ref, value} of events.values()) {
        bookingControlDates(readValues.get(ref.path)).forEach(d=>dates.add(d));
        bookingControlDates(value).forEach(d=>dates.add(d));
      }
      for (const date of dates) {
        const controlRef = doc(database, 'artifacts', appId, 'public', 'data', 'booking_control', date);
        const control = await read(controlRef);
        controls.push({ref:controlRef,revision:Number(control.data()?.revision||0)+1});
      }
    }
  }
  for (const write of writes) {
    if (write.deleted) tx.delete(write.ref);
    else if (write.options) tx.set(write.ref, write.value, write.options);
    else tx.set(write.ref, write.value);
  }
  for (const {ref, value} of events.values()) {
    if (value) projectEvent(tx, ref, value);
    else { tx.delete(availabilityRef(ref.id)); tx.delete(clientStatusRef(ref.id)); tx.delete(doc(db,'artifacts',appId,'public','data','portal_busqueda',ref.id)); }
  }
  for (const lock of locks.values()) {
    const old = readValues.get(lock.ref.path);
    let next;
    if (!old || Array.isArray(old.reservationIds)) {
      const ids = new Set((old?.reservationIds || []).map(String));
      lock.remove.forEach(id => ids.delete(id));
      lock.add.forEach(id => ids.add(id));
      next = {...old, fecha:lock.fecha, hora:lock.hora, count:ids.size, reservationIds:[...ids]};
    } else {
      // Legacy counters lack membership IDs: keep their unknown reservations.
      next = {...old, count:Math.max(0, (Number(old.count) || 0) - lock.remove.size) + lock.add.size};
    }
    if (next.count > 0) tx.set(lock.ref, {...next, updatedAt:new Date().toISOString()});
    else if (old) tx.delete(lock.ref);
  }
  controls.forEach(control=>tx.set(control.ref,{revision:control.revision,updatedAt:new Date().toISOString()}));
  return result;
});

export {runTransaction,inferResourceRequirements,getResourceAvailability,projectEvent,publicSlot,availabilityRef};
