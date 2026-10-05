import React, { useState, useEffect, useRef, useMemo, useCallback, memo, useDeferredValue, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Users, Settings, Plus, Edit, Trash2, X, FileSignature, Clock, MapPin, Info, Download, Receipt, MessageCircle, RefreshCw, AlertTriangle, CheckCircle2, Cloud, Search, CalendarDays, ChevronRight, ChevronLeft, Star, BellRing, TrendingUp, DollarSign, Briefcase, Lock, Mail, Smartphone, FileText, Check, Sparkles, Map as MapIcon, Zap, PieChart, ChevronDown, Sun, Award, FileSpreadsheet, Copy, Share2, Home, Menu, BarChart3, ArrowUpRight, ArrowDownRight, ArrowDownWideNarrow, Save, Minus, Printer, ShieldCheck, Truck, Handshake, PenLine, Globe2 } from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc as rawSetDoc, getDoc, getDocs, getDocsFromCache, query, where, onSnapshot, deleteDoc as rawDeleteDoc, enableIndexedDbPersistence, runTransaction as rawRunTransaction, writeBatch, orderBy, limit, startAfter, documentId } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const WebAdmin = lazy(() => import('./modules/web/WebAdmin.jsx'));

// --- 1. CONFIGURACIÓN FIREBASE Y CONSTANTES ---
const firebaseConfig = { apiKey: "AIzaSyDxE2E1KMuZU523k8oWHabi1jDrFxPOD-0", authDomain: "diverty-eventos.firebaseapp.com", projectId: "diverty-eventos", storageBucket: "diverty-eventos.firebasestorage.app", messagingSenderId: "491130670516", appId: "1:491130670516:web:8c80abd09ccc92c194f6e1" };
const isNewApp = !getApps().length; const app = isNewApp ? initializeApp(firebaseConfig) : getApp(); const db = getFirestore(app); 
if (isNewApp) { enableIndexedDbPersistence(db).catch(() => {}); }
const auth = getAuth(app); const appId = "diverty-oficial"; const LOGO_URL = 'https://i.postimg.cc/GhFd4tcm/1000047880.png'; const META_MENSUAL = 1500;
const DATOS_EMPRESA = { nombreTitular: "AILEN DENNISKA CAMARENA MENDOZA", ruc: "Panamá RUC DV 79 8 957349", banco: "Banco General", tipoCuenta: "Cuenta de ahorros", numeroCuenta: "0472960083979", telefono: "6667-7965", email: "corporativo@divertyeventos.online", web: "Divertyeventos.online" };
const ZONAS_TRANSPORTE = { "Ciudad de Panamá": 0, "Panamá Centro": 0, "San Miguelito": 0, "Punta Pacífica": 5, "Costa del Este": 5, "Albrook / Clayton": 5, "Panamá Norte (hasta Villa Grecia)": 15, "Panamá Este (después de Megamall hasta Pacora)": 15, "Arraiján / Panamá Pacífico": 15, "Costa Verde / hasta 3 km": 20, "La Chorrera (fuera de 3 km de Costa Verde)": 25 };
const NAV_ITEMS = [ {id:'inicio', icon:Home, text:'Inicio'}, {id:'eventos', icon:Calendar, text:'Agenda'}, {id:'clientes', icon:Users, text:'Clientes'}, {id:'proveedores', icon:Truck, text:'Proveedores'}, {id:'finanzas', icon:PieChart, text:'Finanzas'}, {id:'web', icon:Globe2, text:'Web'}, {id:'config', icon:Settings, text:'Ajustes'} ];
const defaultFormData = Object.freeze({ cliente: '', ruc: '', email: '', telefono: '', tipoEvento: 'Cumpleaños', ninos: '', fecha: '', hora: '', ubicacion: 'Panamá Centro', direccion: '', comentarios: '', servicio: '', serviciosSeleccionados: [], transporte: '', gastos: '', detalleGastos: '', subcontratos: [], costosSeparados: true, total: '', abono: '', estado: 'Pendiente', colisionAprobada: false, vigenciaCotizacion: 7, fechaEmisionCotizacion: '' });
const NOMBRES_MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const getDocRef = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'eventos', id); const getConfigRef = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'configuracion', id); const getProvRef = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'proveedores', id);


const ADMIN_UID = 'OblqzhP2L3XulJ920O82jwd1Qrk1';
const isEventRef = ref => ref.path.startsWith(`artifacts/${appId}/public/data/eventos/`);
const availabilityRef = id => doc(db, 'artifacts', appId, 'public', 'data', 'disponibilidad_web', id);

// NAVIDAD — motor único de ruta usado por la asignación y por Operación Navidad.
// Cada visita reserva 25 min + 5 min de margen. El traslado se estima de forma
// conservadora a partir de la distancia GPS; si falta un pin se usan 15 min.
const CHRISTMAS_SERVICE_BUFFER_MINUTES = 30;
const christmasTimeMinutes = value => {
  const m = String(value || '').match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const christmasEventGps = value => {
  const lat = Number(value?.lat), lng = Number(value?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)) return {lat,lng};
  const raw = String(value?.direccion || '').trim();
  const q = raw.match(/[?&]q=(-?\d+(?:\.\d+)?)[,%2C\s]+(-?\d+(?:\.\d+)?)/i);
  if (q) return {lat:Number(q[1]),lng:Number(q[2])};
  const at = raw.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) return {lat:Number(at[1]),lng:Number(at[2])};
  return null;
};
const christmasDistanceKm = (a, b) => {
  if (!a || !b) return null;
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat-a.lat)*rad, dLng = (b.lng-a.lng)*rad;
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
};
const christmasTravelMinutes = km => {
  const d = Math.max(0, Number(km) || 0);
  if (d <= 2) return 10;
  if (d <= 5) return 15;
  if (d <= 8) return 22;
  if (d <= 12) return 30;
  if (d <= 18) return 40;
  return Math.min(70, 40 + Math.ceil((d - 18) * 2));
};
const christmasLeg = (from, to) => {
  const km = christmasDistanceKm(christmasEventGps(from), christmasEventGps(to));
  return { km, minutes: km === null ? 15 : christmasTravelMinutes(km), estimated: km === null };
};
const christmasInsertionPlan = (candidate, existingStops = []) => {
  const t = christmasTimeMinutes(candidate?.hora);
  if (t === null) return {feasible:false, score:9999, reason:'time'};
  const sameDate = existingStops
    .filter(x => x && x.id !== candidate?.id && String(x.fecha || '') === String(candidate?.fecha || ''))
    .filter(x => christmasTimeMinutes(x.hora) !== null)
    .sort((a,b)=>christmasTimeMinutes(a.hora)-christmasTimeMinutes(b.hora));
  if (sameDate.some(x => christmasTimeMinutes(x.hora) === t)) return {feasible:false, score:9999, reason:'same-time'};

  const previous = [...sameDate].filter(x => christmasTimeMinutes(x.hora) < t).pop() || null;
  const next = sameDate.find(x => christmasTimeMinutes(x.hora) > t) || null;
  const legPrev = previous ? christmasLeg(previous, candidate) : null;
  const legNext = next ? christmasLeg(candidate, next) : null;
  const fitsPrevious = !previous || christmasTimeMinutes(previous.hora) + CHRISTMAS_SERVICE_BUFFER_MINUTES + legPrev.minutes <= t;
  const fitsNext = !next || t + CHRISTMAS_SERVICE_BUFFER_MINUTES + legNext.minutes <= christmasTimeMinutes(next.hora);

  let addedTravel = 0;
  if (previous && next) {
    const direct = christmasLeg(previous, next).minutes;
    addedTravel = Math.max(0, legPrev.minutes + legNext.minutes - direct);
  } else if (previous) addedTravel = legPrev.minutes;
  else if (next) addedTravel = legNext.minutes;

  const kms = [legPrev?.km, legNext?.km].filter(v => Number.isFinite(v));
  const nearestKm = kms.length ? Math.min(...kms) : null;
  const hasGps = !!christmasEventGps(candidate);
  // Abrir una ruta nueva tiene una pequeña penalización. Esto hace que una entrega
  // cercana prefiera al Santa que ya trabaja en esa zona, sin forzar recorridos largos.
  const startRoutePenalty = sameDate.length ? 0 : 25;
  const gpsPenalty = hasGps ? 0 : 25;
  const nearbyBonus = nearestKm !== null && nearestKm <= 7 ? 8 : 0;
  const score = Math.max(0, addedTravel) + sameDate.length * 2 + startRoutePenalty + gpsPenalty - nearbyBonus;
  return {feasible:fitsPrevious && fitsNext, fitsPrevious, fitsNext, previous, next, legPrev, legNext, nearestKm, addedTravel, score, anchors:sameDate.length};
};
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
    ? value.serviciosSeleccionados.map(x => Math.max(0, Number(x?.duracionHoras) || 0)).filter(Boolean)
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
  const usage = { animadores:0, payasos:0 };
  (Array.isArray(rows) ? rows : []).forEach(ev => {
    if (!ev || ev.id === request?.id || isArchivedReservation(ev) || isPendingWebRequest(ev)) return;
    if (!resourcesOverlap(request, ev)) return;
    const r = inferResourceRequirements(ev);
    usage.animadores += r.animadores;
    usage.payasos += r.payasos;
  });
  const available = {
    animadores: Math.max(0, cap.animadores - usage.animadores),
    payasos: Math.max(0, cap.payasos - usage.payasos)
  };
  return {
    needed, usage, available, capacity:cap,
    feasible: needed.animadores <= available.animadores && needed.payasos <= available.payasos
  };
};

const isArchivedReservation = value => {
  const estado = String(value?.estado || '').trim().toLowerCase();
  return estado === 'cancelado' || estado === 'cancelada' || estado.includes('rechaz');
};

const NORMAL_OPERATION_STEPS = Object.freeze(['Confirmado', 'Preparando', 'En camino', 'En el evento', 'Completado']);
const getNextNormalOperationalState = value => {
  const estado = utils.normalizeText(value);
  if (estado === 'pendiente') return 'Confirmado';
  if (estado.startsWith('confirmad')) return 'Preparando';
  if (estado === 'preparando') return 'En camino';
  if (estado === 'en camino') return 'En el evento';
  if (estado === 'en el evento') return 'Completado';
  return null;
};
const getOperationalActionLabel = value => {
  const next = getNextNormalOperationalState(value);
  if (next === 'Confirmado') return 'Confirmar reserva';
  if (next === 'Preparando') return 'Iniciar preparación';
  if (next === 'En camino') return 'Salir al evento';
  if (next === 'En el evento') return 'Ya llegamos';
  if (next === 'Completado') return 'Marcar evento realizado';
  return '';
};
const getOperationalStatusMeta = value => {
  const estado = utils.normalizeText(value);
  if (estado === 'completado') return { label:'Realizado', cls:'bg-emerald-50 text-emerald-600 border-emerald-100' };
  if (estado === 'en el evento') return { label:'En el evento', cls:'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100' };
  if (estado === 'en camino') return { label:'En camino', cls:'bg-blue-50 text-blue-600 border-blue-100' };
  if (estado === 'preparando') return { label:'Preparando', cls:'bg-amber-50 text-amber-600 border-amber-100' };
  if (estado.startsWith('confirmad')) return { label:'Confirmado', cls:'bg-violet-50 text-[#7657FF] border-violet-100' };
  if (estado === 'pendiente') return { label:'Pendiente', cls:'bg-amber-50 text-amber-600 border-amber-100' };
  if (estado.includes('rechaz')) return { label:'Rechazada', cls:'bg-slate-100 text-slate-500 border-slate-200' };
  if (estado === 'cancelado' || estado === 'cancelada') return { label:'Cancelada', cls:'bg-rose-50 text-rose-600 border-rose-100' };
  return { label:String(value || 'Pendiente'), cls:'bg-slate-50 text-slate-600 border-slate-200' };
};
const clientStatusRef = id => doc(db,'artifacts',appId,'public','data','reservas_cliente',id);
const clientStatus = value => Object.fromEntries(['ownerUid','cliente','telefono','fecha','hora','estado','servicio','total','abono'].map(key => [key,String(value[key] ?? '')]));
const projectEvent = (writer, ref, value) => {
  if (value.ownerUid) writer.set(clientStatusRef(ref.id), clientStatus(value));
  else writer.delete(clientStatusRef(ref.id));
  const slot = publicSlot(value);
  if (slot) writer.set(availabilityRef(ref.id), slot);
  else writer.delete(availabilityRef(ref.id));
};
const runTransaction = (database, callback) => rawRunTransaction(database, async tx => {
  const readValues = new Map();
  const wrapped = {
    get: async ref => { const snap = await tx.get(ref); readValues.set(ref.path, snap.exists() ? snap.data() : {}); return snap; },
    set: (ref, value, options) => {
      if (options) tx.set(ref, value, options); else tx.set(ref, value);
      if (isEventRef(ref)) {
        if (options?.merge && !readValues.has(ref.path)) throw new Error('EVENT_READ_REQUIRED');
        projectEvent(tx, ref, options?.merge ? {...readValues.get(ref.path), ...value} : value);
      }
      return wrapped;
    },
    delete: ref => { tx.delete(ref); if (isEventRef(ref)) {tx.delete(availabilityRef(ref.id)); tx.delete(clientStatusRef(ref.id));} return wrapped; }
  };
  return callback(wrapped);
});
const setDoc = async (ref, value, options) => {
  if (!isEventRef(ref)) return options ? rawSetDoc(ref, value, options) : rawSetDoc(ref, value);
  return runTransaction(db, async tx => {
    if (options?.merge) await tx.get(ref);
    tx.set(ref, value, options);
  });
};
const deleteDoc = async ref => {
  if (!isEventRef(ref)) return rawDeleteDoc(ref);
  const batch = writeBatch(db); batch.delete(ref); batch.delete(availabilityRef(ref.id)); batch.delete(clientStatusRef(ref.id)); await batch.commit();
};
let preparationPromise = null;
let preparationComplete = false;
async function prepareDivertyData() {
  if (preparationComplete) return;
  if (preparationPromise) return preparationPromise;
  preparationPromise = (async () => {
    if (auth.currentUser?.uid !== ADMIN_UID) throw new Error('ADMIN_REQUIRED');
    // v2 also reconciles disponibilidad_web. This removes old test reservations and
    // orphan slot_* locks that could leave dates blocked on the public website.
    const marker = getConfigRef('migracion_segura_v2');
    if ((await getDoc(marker)).exists()) {preparationComplete=true; return;}

    // One intentional admin-only reconciliation read. `eventos` is the source of truth.
    const [snap, availabilitySnap, globalSnap] = await Promise.all([
      getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'eventos')),
      getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'disponibilidad_web')),
      getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config_web', 'global')).catch(() => null)
    ]);
    const max = {factura: 0, contrato: 0, cotizacion: 0};
    const fields = {factura: 'numeroFactura', contrato: 'numeroContrato', cotizacion: 'numeroCotizacion'};
    const prefixes = {factura: 'FAC', contrato: 'CON', cotizacion: 'COT'};
    const activeAvailabilityIds = new Set();
    const slotGroups = new Map();
    const globalConfig = globalSnap?.exists?.() ? (globalSnap.data() || {}) : {};
    const normalCapacity = Number.isInteger(Number(globalConfig.capacidadSimultanea)) && Number(globalConfig.capacidadSimultanea) >= 1
      ? Number(globalConfig.capacidadSimultanea) : 3;
    const santaCapacity = Number.isInteger(Number(globalConfig.capacidadSanta)) && Number(globalConfig.capacidadSanta) >= 1
      ? Number(globalConfig.capacidadSanta) : 1;

    let batch = writeBatch(db), size = 0;
    for (const row of snap.docs) {
      const ev = row.data();
      for (const type of Object.keys(fields)) {
        const match = String(ev[fields[type]] || '').match(new RegExp('^' + prefixes[type] + '-(\\d+)$', 'i'));
        if (match) max[type] = Math.max(max[type], Number(match[1]));
      }
      if (!ev._system) {
        projectEvent(batch, row.ref, ev);
        size += 2; // availability + client status (worst case)
        const slot = publicSlot(ev);
        if (slot) {
          activeAvailabilityIds.add(String(row.id));
          if (slot.fecha && slot.hora) {
            const isChristmas = ev.esNavidad === true || /entregas de nochebuena/i.test(String(ev.servicio || ''));
            const safeSlot = `${String(slot.fecha)}_${String(slot.hora).replace(':','-')}`.replace(/[^0-9A-Za-z_-]/g,'');
            const slotId = `${isChristmas ? 'slot_santa_' : 'slot_'}${safeSlot}`;
            if (!slotGroups.has(slotId)) slotGroups.set(slotId, {
              fecha: String(slot.fecha), hora: String(slot.hora), ids: [],
              capacity: isChristmas ? santaCapacity : normalCapacity
            });
            slotGroups.get(slotId).ids.push(String(row.id));
          }
        }
      }
      if (size >= 300) { await batch.commit(); batch = writeBatch(db); size = 0; }
    }
    if (size) await batch.commit();

    // Keep disponibilidad_web as an exact public projection of active reservations.
    // Internal slot_* documents are rebuilt from the real events, never treated as events.
    batch = writeBatch(db); size = 0;
    const flush = async () => { if (!size) return; await batch.commit(); batch = writeBatch(db); size = 0; };
    const queueDelete = async ref => { batch.delete(ref); size++; if (size >= 350) await flush(); };
    const queueSet = async (ref, data) => { batch.set(ref, data); size++; if (size >= 350) await flush(); };

    for (const row of availabilitySnap.docs) {
      const id = String(row.id);
      if (id.startsWith('slot_')) {
        if (!slotGroups.has(id)) await queueDelete(row.ref);
      } else if (!activeAvailabilityIds.has(id)) {
        await queueDelete(row.ref);
      }
    }
    for (const [slotId, info] of slotGroups) {
      const ids = Array.from(new Set(info.ids));
      await queueSet(availabilityRef(slotId), {
        fecha: info.fecha,
        hora: info.hora,
        count: ids.length,
        capacity: info.capacity,
        reservationIds: ids,
        updatedAt: new Date().toISOString()
      });
    }
    await flush();

    await rawRunTransaction(db, async tx => {
      const types = Object.keys(max);
      const refs = types.map(type => getConfigRef('contador_' + type));
      const values = [];
      for (const ref of refs) values.push(await tx.get(ref));
      refs.forEach((ref, i) => tx.set(ref, {ultimo: Math.max(max[types[i]], Number(values[i].data()?.ultimo) || 0)}));
      tx.set(marker, {completada: true, fecha: new Date().toISOString()});
      tx.set(doc(db, 'artifacts', appId, 'public', 'data', 'config_web', 'disponibilidad'), {lista: true});
    });
  })();
  try { await preparationPromise; preparationComplete=true; } finally { preparationPromise = null; }
}

// --- 2. DICCIONARIO DE ESTILOS PREMIUM ---
const UI = {
  card: "bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(248,249,255,0.94))] backdrop-blur-2xl border border-slate-200/70 rounded-[26px] shadow-[0_8px_26px_rgba(15,23,42,0.065),inset_0_1px_0_rgba(255,255,255,0.95)] relative overflow-hidden group hover:shadow-[0_16px_42px_rgba(71,51,150,0.11)] hover:border-violet-200/80 transition-all duration-500",
  modal: "bg-white/98 backdrop-blur-2xl rounded-t-[32px] sm:rounded-[32px] shadow-[0_30px_90px_rgba(8,15,35,0.30)] border border-white/80 transition-transform duration-300",
  input: "w-full bg-white/75 focus:bg-white border border-slate-200/80 focus:border-[#8B5CF6]/55 rounded-[16px] p-4 text-[15px] font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-[#8B5CF6]/10 transition-all placeholder:text-slate-400 shadow-[0_5px_18px_rgba(15,23,42,0.035),inset_0_1px_0_rgba(255,255,255,.9)]",
  label: "block text-[10px] uppercase text-slate-500 font-extrabold tracking-[0.18em] mb-2 ml-1",
  title: "text-3xl sm:text-5xl font-black text-slate-950 tracking-[-0.03em]",
  btnBase: "font-black rounded-[16px] transition-all duration-300 ease-out active:scale-[0.96] flex items-center justify-center gap-2.5 px-5 py-3.5 relative overflow-hidden group",
  btnPrimary: "bg-gradient-to-r from-[#FF3EA5] via-[#B83DFF] to-[#7657FF] bg-[length:200%_auto] hover:bg-[100%_center] text-white shadow-[0_9px_24px_rgba(184,61,255,0.24),inset_0_1px_0_rgba(255,255,255,.28)] hover:shadow-[0_14px_34px_rgba(184,61,255,0.32)] border border-white/25",
  btnDefault: "bg-white/90 text-slate-700 hover:text-slate-950 border border-slate-200/80 shadow-[0_5px_16px_rgba(15,23,42,0.045),inset_0_1px_0_rgba(255,255,255,.9)] hover:shadow-[0_10px_24px_rgba(71,51,150,.09)] hover:border-violet-200",
  flexBetween: "flex justify-between items-center"
};
const COLORS = { blue: 'bg-[#7657FF]/10 text-[#7657FF] border-[#7657FF]/20', rose: 'bg-[#FF3EA5]/10 text-[#FF3EA5] border-[#FF3EA5]/20', amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20', emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };

// DIVERTY_EARLY_NATIVE_SPLASH_HIDE
// Cierra el splash nativo tan pronto como este bundle comienza a ejecutarse.
try { window?.Capacitor?.Plugins?.SplashScreen?.hide?.(); } catch (_) {}

// --- 3. FUNCIONES UTILITARIAS ---
export const utils = {
  normalizeText: (t) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""), 
  getSafeLocal: (k) => { try { return localStorage.getItem(k); } catch(e) { return null; } }, 
  setSafeLocal: (k, v) => { try { localStorage.setItem(k, v); } catch(e) {} },
  triggerHaptic: (t = 'light') => { if (window?.navigator?.vibrate) try { window.navigator.vibrate(t === 'light' ? 30 : 50); } catch (e) {} }, 
  safeNum: (v) => { if (typeof v === 'number') return isNaN(v) ? 0 : v; if (!v) return 0; const p = parseFloat(String(v).replace(/[^0-9.-]/g, '')); return isNaN(p) ? 0 : p; },
  formatTime12h: (t) => { if (!t) return 'Por definir'; const [h, m] = String(t).split(':'); if (!h || !m) return t; let hrs = parseInt(h, 10); const suf = hrs >= 12 ? 'PM' : 'AM'; return `${hrs % 12 || 12}:${m} ${suf}`; },
  getLocalYYYYMMDD: (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  getWeekRange: (b = new Date()) => { const t = new Date(b), d = t.getDay() === 0 ? -6 : 1 - t.getDay(), s = new Date(t); s.setDate(t.getDate() + d); s.setHours(0, 0, 0, 0); const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999); return { start: s, end: e }; },
  openWhatsAppBusiness: (phone, msg) => { const clean = String(phone || '').replace(/\D/g, ''); const text = encodeURIComponent(msg || ''); const fallback = `https://api.whatsapp.com/send?phone=${clean}&text=${text}`; const isAndroid = /Android/i.test(navigator.userAgent || ''); if (isAndroid) { const intent = `intent://send?phone=${clean}&text=${text}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;S.browser_fallback_url=${encodeURIComponent(fallback)};end`; window.location.href = intent; return; } const link = document.createElement('a'); link.href = fallback; link.target = '_blank'; link.rel = 'noopener noreferrer'; document.body.appendChild(link); link.click(); document.body.removeChild(link); }
};

// CRM Clientes 2.1: agrupa el historial por nombre normalizado.
// El teléfono se conserva como dato de contacto, pero no separa al mismo cliente
// cuando aparece con números diferentes en reservas distintas.
const normalizeClientPhone = (phone) => String(phone || '').replace(/\D/g, '');
const normalizeClientName = (name) => utils.normalizeText(name || '').replace(/\s+/g, ' ').trim();
const getClientKey = (obj) => {
  const name = normalizeClientName(obj?.cliente || obj?.nombre);
  if (name) return `nom:${name}`;
  const phone = normalizeClientPhone(obj?.telefono);
  return phone ? `tel:${phone}` : '';
};

// Finanzas 3.0: separa gastos internos de costos de proveedores.
// Registros antiguos conservan su cálculo histórico porque antes los subcontratos ya se sumaban dentro de `gastos`.
const sumSubcontratos = (ev) => Array.isArray(ev?.subcontratos) ? ev.subcontratos.reduce((sum, sc) => sum + utils.safeNum(sc?.costo), 0) : 0;
const getGastosInternosEvento = (ev) => {
  const gastosGuardados = utils.safeNum(ev?.gastos);
  if (ev?.costosSeparados === true) return gastosGuardados;
  // Compatibilidad histórica: antes el costo de proveedores podía estar incluido dentro de `gastos`.
  return Math.max(0, gastosGuardados - sumSubcontratos(ev));
};
const getCostoProveedoresEvento = (ev) => sumSubcontratos(ev);
const getProveedoresPagadosEvento = (ev) => Array.isArray(ev?.subcontratos) ? ev.subcontratos.reduce((sum,sc)=>sum+(sc?.pagado===true||utils.normalizeText(sc?.estadoPago)==='pagado'?utils.safeNum(sc?.costo):0),0) : 0;
const getProveedoresPendientesEvento = (ev) => Math.max(0,getCostoProveedoresEvento(ev)-getProveedoresPagadosEvento(ev));
const getCostosEvento = (ev) => getGastosInternosEvento(ev) + getCostoProveedoresEvento(ev);
const normalizeLegacyCostsForEdit = (ev) => {
  if (!ev || ev.costosSeparados === true) return ev;
  const proveedores = sumSubcontratos(ev);
  return { ...ev, gastos: Math.max(0, utils.safeNum(ev.gastos) - proveedores).toString(), costosSeparados: true };
};

// Gastos rápidos 4.0: cada gasto puede registrarse desde la tarjeta de la reserva
// sin entrar al formulario completo. `gastos` sigue guardando el total para mantener
// compatibilidad con versiones anteriores y `gastosItems` conserva el desglose.
const EXPENSE_CATEGORIES = Object.freeze([
  { id: 'personal', label: 'Personal / animadores' },
  { id: 'transporte', label: 'Transporte' },
  { id: 'globos', label: 'Adicionales / materiales' },
  { id: 'otros', label: 'Otro gasto' }
]);
const getExpenseItems = (ev) => Array.isArray(ev?.gastosItems)
  ? ev.gastosItems.filter(item => item && utils.safeNum(item.monto) > 0)
  : [];
const getExpenseBreakdownEvento = (ev) => {
  const out = { personal: 0, transporte: 0, globos: 0, otros: 0 };
  const items = getExpenseItems(ev);
  let itemTotal = 0;
  items.forEach(item => {
    const monto = utils.safeNum(item.monto);
    itemTotal += monto;
    const categoria = ['personal','transporte','globos','otros'].includes(String(item.categoria || '').toLowerCase())
      ? String(item.categoria).toLowerCase()
      : 'otros';
    out[categoria] += monto;
  });
  const totalInterno = getGastosInternosEvento(ev);
  // Si un registro antiguo fue editado manualmente después de usar gastos rápidos,
  // ajustamos el desglose al total real para que Finanzas nunca muestre categorías
  // que sumen más que el gasto interno guardado.
  if (itemTotal > totalInterno && itemTotal > 0) {
    const factor = totalInterno / itemTotal;
    Object.keys(out).forEach(k => { out[k] *= factor; });
    return out;
  }
  // Todo gasto antiguo que no tenía categoría queda en "Otros", sin duplicarlo.
  out.otros += Math.max(0, totalInterno - itemTotal);
  return out;
};
const buildMonthlyFinanceReport = (rows, year, month) => {
  const monthRows = (Array.isArray(rows) ? rows : []).filter(e => {
    const parts = String(e?.fecha || '').split('-');
    return Number(parts[0]) === Number(year) && Number(parts[1]) === Number(month);
  });
  const active = monthRows.filter(e => {
    const es = utils.normalizeText(e?.estado);
    if (isArchivedReservation(e) || isPendingWebRequest(e) || es.includes('cotizaci') || es.includes('cot.')) return false;
    return true;
  });
  const breakdown = active.reduce((acc, ev) => {
    const b = getExpenseBreakdownEvento(ev);
    acc.personal += b.personal; acc.transporte += b.transporte; acc.globos += b.globos; acc.otros += b.otros;
    return acc;
  }, { personal:0, transporte:0, globos:0, otros:0 });
  const facturado = active.reduce((sum,e)=>sum+utils.safeNum(e.total),0);
  const cobrado = active.reduce((sum,e)=>sum+Math.min(utils.safeNum(e.abono),utils.safeNum(e.total)),0);
  const porCobrar = active.reduce((sum,e)=>sum+Math.max(utils.safeNum(e.total)-utils.safeNum(e.abono),0),0);
  const gastosInternos = active.reduce((sum,e)=>sum+getGastosInternosEvento(e),0);
  const proveedores = active.reduce((sum,e)=>sum+getCostoProveedoresEvento(e),0);
  const costosTotales = gastosInternos + proveedores;
  const ganancia = facturado - costosTotales;
  return {
    periodo: `${year}-${String(month).padStart(2,'0')}`,
    year:Number(year), month:Number(month),
    registrosMes:monthRows.length,
    reservas:active.length,
    completadas:active.filter(e=>utils.normalizeText(e.estado)==='completado').length,
    canceladas:monthRows.filter(e=>['cancelado','cancelada'].includes(utils.normalizeText(e.estado))).length,
    rechazadas:monthRows.filter(e=>utils.normalizeText(e.estado).includes('rechaz')).length,
    facturado, cobrado, porCobrar, gastosInternos, proveedores, costosTotales, ganancia,
    gastosPorCategoria: breakdown
  };
};

function getWhatsAppMessage(ev, type, empresa) {
    const tot = utils.safeNum(ev.total), abo = utils.safeNum(ev.abono), saldo = (tot - abo).toFixed(2), fec = String(ev.fecha||'').split('-').reverse().join('/'), hor = utils.formatTime12h(ev.hora);
    const vigDias = Math.max(1, Math.round(utils.safeNum(ev.vigenciaCotizacion) || 7));
    const vigHasta = (() => { try { const iso = String(ev.fechaEmisionCotizacion || utils.getLocalYYYYMMDD(new Date())).slice(0,10); const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate()+vigDias); return utils.getLocalYYYYMMDD(d).split('-').reverse().join('/'); } catch (_) { return ''; } })();
    switch(type) {
        case 'cotizacion': return `¡Hola *${ev.cliente}*! ✨\nTe comparto la cotización para tu evento el *${fec}*.\n🎉 *Paquetes:* ${ev.servicio}\n💰 *Inversión Total:* $${tot.toFixed(2)}\n📌 *Cotización válida hasta:* ${vigHasta}\n\n*He adjuntado el PDF con todos los detalles a este mensaje.*\n\nLa fecha se reserva al confirmar disponibilidad y realizar el abono acordado. ¡Estamos a la orden! 🥳`;
        case 'recibo': return `¡Hola *${ev.cliente}*! 🥳\nTu reserva está *Confirmada* ✅\n📅 *Fecha:* ${fec}\n⏰ *Hora:* ${hor}\n📍 *Lugar:* ${ev.ubicacion}\n💰 *Total:* $${tot.toFixed(2)}\n💳 *Abono recibido:* $${abo.toFixed(2)}\n⚠️ *Saldo a cancelar en evento:* $${saldo}\n\n*Te adjunto el recibo oficial en PDF.*\n¡Gracias por preferirnos! ✨`;
        case 'recordatorio': return `¡Hola *${ev.cliente}*! 🥳\n¡Se acerca tu gran día! Recuerda tu evento para el *${fec}* a las *${hor}*.\n📍 Llegaremos a *${ev.ubicacion}*.\n💰 Saldo pendiente: *$${saldo}*.\n¡Nos vemos pronto para la diversión! ✨`;
        case 'cobro': return `¡Hola *${ev.cliente}*! 👋\nTe contactamos de Diverty Eventos.\nTe recordamos amablemente que tienes un saldo pendiente de *$${saldo}* para asegurar tu fecha del *${fec}*.\n\nSi deseas realizar el abono mediante Yappy o Transferencia, por favor avísanos por aquí. ¡Estamos a tu disposición! ✨`;
        case 'banco': return `¡Hola *${ev.cliente}*! 👋\nNuestros datos bancarios:\n🏦 *Banco:* ${empresa.banco}\n📋 *Tipo:* ${empresa.tipoCuenta}\n🔢 *Cuenta:* ${empresa.numeroCuenta}\n👤 *Nombre:* ${empresa.nombreTitular}\nPor favor envía comprobante. ¡Gracias! ✨`;
        case 'contrato_prov': return `¡Hola *${ev.nombre}*! 👋\nTe comparto el Contrato de Prestación de Servicios de parte de Diverty Eventos.\nPor favor, revísalo y confirmamos detalles.\n¡Saludos! ✨`;
        case 'agradecimiento': default: return `¡Hola *${ev.cliente}*! 🌟\n¡GRACIAS por permitirnos estar en tu evento!\n¿Qué tal la pasaron? Nos encantaría ver fotitos 📸🎉\n¡Un abrazo mágico de todo el equipo! ✨`;
    }
}

// --- 4. COMPONENTES VISUALES Y MEMOIZACIÓN PARA OPTIMIZACIÓN ULTRA-RÁPIDA ---
const Bg = memo(() => (<div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#F4F6FB]"><div className="absolute top-[-18%] left-[-22%] w-[90vw] h-[55vh] bg-[#7657FF]/10 blur-[110px] rounded-full"></div><div className="absolute top-[8%] right-[-30%] w-[80vw] h-[45vh] bg-[#FF3EA5]/10 blur-[120px] rounded-full"></div><div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.025)_1px,transparent_1px)] bg-[size:28px_28px] opacity-40"></div></div>));
const Toast = memo(({ alert }) => { if (!alert.isOpen) return null; return (<div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100000] w-[90%] max-w-sm animate-fadeIn"><div className={`px-5 py-4 rounded-2xl shadow-xl flex items-center gap-3 border text-white backdrop-blur-md ${alert.success ? 'bg-emerald-500/95 border-emerald-400' : 'bg-rose-500/95 border-rose-400'}`}>{alert.success ? <CheckCircle2 size={24}/> : <AlertTriangle size={24}/>}<p className="font-bold text-sm tracking-wide">{alert.message}</p></div></div>); });
const Confirm = memo(({ modal, setModal }) => { if (!modal.isOpen) return null; return (<div className="fixed inset-0 z-[100000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overscroll-none"><div className={`${UI.modal} max-w-md w-full text-center border-rose-200/50 p-8`}><div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-100"><AlertTriangle size={32} className="text-rose-500" /></div><h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">¿Estás seguro?</h3><p className="text-slate-500 font-medium mb-8 leading-relaxed">{modal.message}</p><div className="flex gap-4"><button type="button" onClick={() => setModal({ isOpen: false, message: '', onConfirm: null })} className="flex-1 py-3.5 rounded-xl font-bold uppercase tracking-wider text-slate-600 bg-slate-100/80 hover:bg-slate-200 transition-all border border-slate-200/50">Cancelar</button><button type="button" onClick={() => { if (modal.onConfirm) modal.onConfirm(); setModal({ isOpen: false, message: '', onConfirm: null }); }} className="flex-1 py-3.5 rounded-xl font-bold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 shadow-lg transition-all">Confirmar</button></div></div></div>); });

const QuickExpenseModal = memo(function QuickExpenseModal({ modal, onClose, onSave }) {
    const ev = modal?.event;
    const makeLine = (categoria='personal') => ({ id:`tmp-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, categoria, monto:'', detalle:'' });
    const [lines, setLines] = useState([makeLine('personal')]);
    const [fecha, setFecha] = useState(utils.getLocalYYYYMMDD(new Date()));
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!modal?.isOpen) return;
        setLines([makeLine('personal')]);
        setFecha(utils.getLocalYYYYMMDD(new Date()));
        setSaving(false);
    }, [modal?.isOpen, ev?.id]);

    if (!modal?.isOpen || !ev) return null;

    const iconFor = id => id === 'personal' ? Users : id === 'transporte' ? Truck : id === 'globos' ? Sparkles : Receipt;
    const updateLine = (id, patch) => setLines(prev => prev.map(line => line.id === id ? { ...line, ...patch } : line));
    const addLine = (categoria = '') => {
        utils.triggerHaptic('light');
        setLines(prev => {
            const suggested = categoria || (prev.length === 1 ? 'transporte' : 'otros');
            return [...prev, makeLine(suggested)];
        });
        setTimeout(() => {
            try { document.getElementById('quick-expense-scroll-end')?.scrollIntoView({behavior:'smooth', block:'nearest'}); } catch (_) {}
        }, 80);
    };
    const removeLine = id => {
        utils.triggerHaptic('light');
        setLines(prev => prev.length <= 1 ? prev : prev.filter(line => line.id !== id));
    };
    const validLines = lines
      .map(line => ({...line, monto:Number(String(line.monto).replace(',','.'))}))
      .filter(line => Number.isFinite(line.monto) && line.monto > 0);
    const total = validLines.reduce((sum,line)=>sum+line.monto,0);

    const submit = async (e) => {
        e.preventDefault();
        if (!validLines.length || saving) return;
        setSaving(true);
        try {
            await onSave(ev, validLines.map(line => ({
                categoria:line.categoria,
                monto:line.monto,
                detalle:String(line.detalle || '').trim(),
                fecha
            })));
        } finally { setSaving(false); }
    };

    return (
      <div className="fixed inset-0 z-[100000] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn" onClick={onClose}>
        <form onSubmit={submit} onClick={e=>e.stopPropagation()} className="w-full sm:max-w-lg bg-white rounded-t-[30px] sm:rounded-[30px] shadow-[0_30px_80px_rgba(15,23,42,.28)] border border-white max-h-[94dvh] overflow-hidden flex flex-col">
          <div className="px-5 sm:px-6 pt-4 sm:pt-6">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden"></div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#7657FF]">Gastos de reserva</p>
                <h3 className="text-2xl font-black text-slate-950 mt-1">{ev.cliente || 'Reserva'}</h3>
                <p className="text-xs font-semibold text-slate-400 mt-1">{ev.fecha ? String(ev.fecha).split('-').reverse().join('/') : ''} · {ev.servicio || ev.tipoEvento || 'Evento'}</p>
              </div>
              <button type="button" onClick={onClose} className="w-10 h-10 rounded-[14px] bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><X size={19}/></button>
            </div>

            <div className="rounded-[17px] bg-[#F7F3FF] border border-[#7657FF]/10 p-3.5 flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-[12px] bg-white text-[#7657FF] flex items-center justify-center shadow-sm shrink-0"><Plus size={18}/></div>
              <div>
                <p className="text-[11px] font-black text-slate-800">Puedes registrar varios gastos de una sola vez</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-1 leading-relaxed">Ejemplo: pago de animadores + transporte + globos o cualquier gasto adicional.</p>
              </div>
            </div>

            <div className="flex items-end justify-between gap-3 mb-3">
              <div><label className={UI.label}>Fecha de los gastos</label><input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} className={`${UI.input} py-2.5`}/></div>
              <div className="text-right pb-1"><p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total a registrar</p><p className="text-xl font-black text-rose-500">${total.toFixed(2)}</p></div>
            </div>
          </div>

          <div className="px-5 sm:px-6 pb-2 overflow-y-auto overscroll-contain">
            <div className="space-y-3">
              {lines.map((line, idx) => {
                const Ic = iconFor(line.categoria);
                return (
                  <div key={line.id} className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-3.5 shadow-sm animate-fadeIn">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-[13px] bg-white text-[#7657FF] flex items-center justify-center border border-slate-100 shadow-sm"><Ic size={18}/></div>
                        <div><p className="text-[9px] font-black uppercase tracking-[.14em] text-slate-400">Gasto {idx+1}</p><p className="text-[12px] font-black text-slate-800">{EXPENSE_CATEGORIES.find(c=>c.id===line.categoria)?.label || 'Otro gasto'}</p></div>
                      </div>
                      {lines.length > 1 && <button type="button" onClick={()=>removeLine(line.id)} className="w-9 h-9 rounded-[12px] bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center"><Trash2 size={16}/></button>}
                    </div>
                    <div className="grid grid-cols-[1.2fr_.8fr] gap-2.5">
                      <div>
                        <label className={UI.label}>Tipo</label>
                        <select value={line.categoria} onChange={e=>updateLine(line.id,{categoria:e.target.value})} className={`${UI.input} py-2.5`}>
                          {EXPENSE_CATEGORIES.map(cat=><option key={cat.id} value={cat.id}>{cat.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={UI.label}>Monto *</label>
                        <div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span><input type="number" min="0.01" step="0.01" inputMode="decimal" value={line.monto} onChange={e=>updateLine(line.id,{monto:e.target.value})} placeholder="0.00" className={`${UI.input} pl-7 py-2.5 font-black text-rose-500`} /></div>
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <label className={UI.label}>Detalle opcional</label>
                      <input value={line.detalle} onChange={e=>updateLine(line.id,{detalle:e.target.value})} placeholder={line.categoria==='personal'?'Ej. Animador Juan / ayudante':line.categoria==='transporte'?'Ej. Combustible / taxi':line.categoria==='globos'?'Ej. Globos, hielo, materiales':'Ej. Compra imprevista'} className={`${UI.input} py-2.5`}/>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4">
              <p className="text-[9px] font-black uppercase tracking-[.14em] text-slate-400 mb-2">Agregar otro gasto rápido</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id:'personal', label:'Personal / animadores', icon:Users },
                  { id:'transporte', label:'Transporte', icon:Truck },
                  { id:'globos', label:'Adicionales / materiales', icon:Sparkles },
                  { id:'otros', label:'Otro gasto', icon:Receipt }
                ].map(opt => {
                  const Ic = opt.icon;
                  return <button key={opt.id} type="button" onClick={()=>addLine(opt.id)} className="min-h-[46px] rounded-[15px] border border-slate-200 bg-white text-slate-700 font-black text-[9px] uppercase tracking-[.08em] flex items-center justify-center gap-2 active:scale-[.98] shadow-sm"><Ic size={16} className="text-[#7657FF]"/>{opt.label}</button>;
                })}
              </div>
            </div>
            <div id="quick-expense-scroll-end"></div>

            <div className="mt-4 rounded-[16px] bg-amber-50 border border-amber-100 p-3 flex gap-2.5">
              <Info size={17} className="text-amber-500 shrink-0"/>
              <p className="text-[11px] font-semibold text-amber-800/80 leading-relaxed">Todos los gastos con monto se sumarán automáticamente a esta reserva y a Finanzas. Puedes repetir categorías, por ejemplo dos pagos de personal.</p>
            </div>
          </div>

          <div className="px-5 sm:px-6 pb-[max(18px,env(safe-area-inset-bottom))] pt-3 border-t border-slate-100 bg-white">
            <button type="submit" disabled={saving || !validLines.length} className="w-full h-14 rounded-[18px] bg-gradient-to-r from-[#FF2F9A] via-[#D52DDA] to-[#7657FF] text-white font-black text-[11px] uppercase tracking-[.14em] shadow-[0_14px_30px_rgba(157,74,255,.24)] disabled:opacity-50 flex items-center justify-center gap-2">
              <Receipt size={18}/>{saving?'Guardando...':validLines.length>1?`Registrar ${validLines.length} gastos · $${total.toFixed(2)}`:`Registrar gasto · $${total.toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    );
});

const NavigationChoiceModal = memo(function NavigationChoiceModal({ modal, onClose }) {
    if (!modal?.isOpen) return null;
    const open = url => { if (!url) return; utils.triggerHaptic('light'); window.open(url, '_blank'); onClose(); };
    return (
      <div className="fixed inset-0 z-[100000] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn" onClick={onClose}>
        <div onClick={e=>e.stopPropagation()} className="w-full sm:max-w-md bg-white rounded-t-[30px] sm:rounded-[30px] p-5 sm:p-6 shadow-[0_30px_80px_rgba(15,23,42,.28)]">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden"></div>
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#7657FF]">Navegación</p><h3 className="text-2xl font-black text-slate-950 mt-1">¿Con qué app quieres ir?</h3><p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">{modal.label || 'Ubicación de la reserva'}</p></div>
            <button type="button" onClick={onClose} className="w-10 h-10 rounded-[14px] bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><X size={19}/></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <button type="button" onClick={()=>open(modal.googleUrl)} className="min-h-[112px] rounded-[22px] bg-[#F7F3FF] border border-[#7657FF]/15 text-[#7657FF] flex flex-col items-center justify-center gap-1.5 active:scale-[.97] shadow-sm"><MapIcon size={30}/><span className="font-black text-[12px]">Google Maps</span><span className="text-[9px] font-bold opacity-70">Mapa y ruta</span></button>
            <button type="button" onClick={()=>open(modal.wazeUrl)} className="min-h-[112px] rounded-[22px] bg-sky-50 border border-sky-100 text-sky-600 flex flex-col items-center justify-center gap-1.5 active:scale-[.97] shadow-sm"><MapPin size={30}/><span className="font-black text-[12px]">Waze</span><span className="text-[9px] font-bold opacity-70">Navegar ahora</span></button>
          </div>
          <p className="text-[10px] font-semibold text-slate-400 text-center mt-4 leading-relaxed">Si la reserva tiene coordenadas GPS exactas, ambas aplicaciones abrirán el mismo punto.</p>
        </div>
      </div>
    );
});
const EmptyState = memo(function EmptyState({ icon: Icon, title, message, actionBtn }) { return (<div className={`${UI.card} bg-white/30 backdrop-blur-sm p-10 text-center flex flex-col items-center justify-center animate-fadeIn w-full border-dashed border-slate-300 min-h-[300px]`}><div className="w-24 h-24 rounded-[24px] flex justify-center items-center mb-6 border border-slate-200/50 relative overflow-hidden bg-white/80 rotate-3 transition-transform hover:rotate-0 duration-300 shadow-sm"><Icon size={48} strokeWidth={1.5} className="relative z-10 text-[#7657FF]/60" /></div><h3 className="text-xl font-bold text-slate-800 mb-3 tracking-tight">{title}</h3><p className="text-sm font-medium text-slate-500 max-w-md mb-8 leading-relaxed">{message}</p>{actionBtn}</div>); });
const IconBox = memo(function IconBox({ icon: Icon, color = 'blue', className = '' }) { const cMap = { blue: 'bg-[#7657FF]/10 text-[#7657FF] border-[#7657FF]/20', rose: 'bg-[#FF3EA5]/10 text-[#FF3EA5] border-[#FF3EA5]/20', amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20', emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }; return <div className={`p-2.5 rounded-xl border backdrop-blur-sm shadow-sm ${cMap[color]} ${className}`}><Icon size={20}/></div>; });
const Badge = memo(function Badge({ children, color = 'blue', className = '' }) { const bgColors = { blue: 'bg-[#7657FF]/10 text-[#7657FF] border-[#7657FF]/20', rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20', amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20', emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', gray: 'bg-slate-100 text-slate-600 border-slate-200/60' }; return <span className={`border px-3 py-1 rounded-[10px] text-[10px] sm:text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 shrink-0 shadow-sm backdrop-blur-sm ${bgColors[color]||bgColors.blue} ${className}`}>{children}</span>; });

const Field = memo(function Field({ label, as = 'input', className = '', innerRef, children, ...props }) { 
    return (<div className={className}>{label && <label className={UI.label}>{label}</label>}{as === 'input' && <input ref={innerRef} className={UI.input} {...props} />}{as === 'textarea' && <textarea ref={innerRef} className={`${UI.input} min-h-[80px] resize-none leading-relaxed`} {...props} />}{as === 'select' && <select ref={innerRef} className={`${UI.input} appearance-none cursor-pointer [&>option]:bg-white [&>option]:text-slate-900`} {...props}>{children}</select>}</div>); 
}, (prev, next) => {
    return prev.value === next.value && prev.label === next.label && prev.as === next.as && prev.className === next.className && prev.type === next.type && prev.placeholder === next.placeholder && prev.required === next.required && prev.disabled === next.disabled && prev.children === next.children;
});

const ActionBtn = memo(function ActionBtn({ icon: Icon, label, color = 'white', onClick }) { 
    const btnClasses = { 
        white: 'text-slate-600 hover:text-slate-900 bg-white/80 hover:bg-slate-50 border border-slate-200/80 hover:shadow-md hover:border-slate-300', 
        blue: 'text-[#7657FF] bg-[#7657FF]/10 hover:bg-[#7657FF]/20 border border-[#7657FF]/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.4)]', 
        rose: 'text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:shadow-[0_0_15px_rgba(244,63,94,0.4)]', 
        emerald: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
    }; 
    return (
        <button type="button" onClick={onClick} className={`flex-1 font-bold py-3 flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest active:scale-[0.96] transition-all duration-300 rounded-[14px] shadow-sm backdrop-blur-sm relative overflow-hidden group ${btnClasses[color]}`}>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            <Icon size={16} strokeWidth={2.5} className="relative z-10"/> 
            <span className="relative z-10">{label}</span>
        </button>
    ); 
});

const AppButton = memo(function AppButton({ children, variant = 'primary', icon: Icon, onClick, className = '', ...props }) { 
    let vClass = ""; 
    if (variant === 'primary') vClass = UI.btnPrimary; 
    else if (variant === 'success') vClass = "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_8px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_15px_30px_rgba(16,185,129,0.5)] border border-white/20 bg-[length:200%_auto] hover:bg-[100%_center]"; 
    else if (variant === 'default') vClass = UI.btnDefault; 
    return (
        <button type="button" onClick={onClick} className={`${UI.btnBase} ${vClass} ${className}`} {...props}>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
            {Icon && <Icon size={18} strokeWidth={2.5} className="shrink-0 relative z-10" />}
            <span className="truncate tracking-wide relative z-10">{children}</span>
        </button>
    ); 
});

const AppCard = memo(function AppCard({ children, title, icon: Icon, iconColor = 'primary', className = '' }) { 
    const bgHover = { primary: "group-hover:bg-[#7657FF]/5", success: "group-hover:bg-emerald-500/5", danger: "group-hover:bg-rose-500/5", warning: "group-hover:bg-amber-500/5" }; 
    const iconColors = { primary: "text-[#7657FF]", success: "text-emerald-500", danger: "text-rose-500", warning: "text-amber-500" }; 
    const iconBg = { primary: "bg-[#7657FF]/10", success: "bg-emerald-500/10", danger: "bg-rose-500/10", warning: "bg-amber-500/10" }; 
    return (
        <div className={`bg-white/95 backdrop-blur-2xl border border-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-[28px] p-6 sm:p-8 flex flex-col justify-center relative overflow-hidden transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] group ${bgHover[iconColor] || ''} ${className}`}>
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-[radial-gradient(circle,rgba(0,0,0,0.02)_0%,transparent_70%)] pointer-events-none group-hover:scale-150 transition-transform duration-700"></div>
            {(title || Icon) && (
                <div className="flex items-center gap-3 text-slate-500 mb-5 relative z-10">
                    {Icon && <div className={`p-2.5 rounded-[16px] ${iconBg[iconColor]}`}><Icon size={22} className={iconColors[iconColor] || "text-slate-600"} strokeWidth={2.5} /></div>}
                    {title && <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] opacity-80">{title}</span>}
                </div>
            )}
            <div className="relative z-10 text-slate-900">{children}</div>
        </div>
    ); 
});

function useCountUp(end, duration = 1000) { 
    const [count, setCount] = useState(0); 
    useEffect(() => { 
        if (end === 0) { setCount(0); return; } 
        let start = 0, stepTime = 16, steps = duration / stepTime, increment = end / steps, timer; 
        const delay = setTimeout(() => { timer = setInterval(() => { start += increment; if ((increment > 0 && start >= end) || (increment < 0 && start <= end)) { setCount(end); clearInterval(timer); } else { setCount(start); } }, stepTime); }, 200); 
        return () => { clearTimeout(delay); if (timer) clearInterval(timer); }; 
    }, [end, duration]); 
    return count; 
}

const AnimatedProgress = memo(function AnimatedProgress({ value }) { 
    const [width, setWidth] = useState(0); const barRef = useRef(null); 
    useEffect(() => { 
        const o = new IntersectionObserver((e) => { if (e[0].isIntersecting) { setTimeout(() => setWidth(value), 200); o.disconnect(); } }, { threshold: 0.1 }); 
        if (barRef.current) o.observe(barRef.current); 
        return () => o.disconnect(); 
    }, [value]); 
    return (
        <div ref={barRef} className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden bg-slate-200 shadow-inner" style={{ width: `${width}%` }}>
            <div className="absolute inset-0 bg-gradient-to-r from-[#7657FF] via-[#8B5CF6] to-[#FF3EA5]"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-[200%] animate-[shimmer_2s_infinite]"></div>
        </div>
    ); 
});

const SkeletonCard = memo(function SkeletonCard() { 
    return (
        <div className={`${UI.card} p-6 animate-pulse flex flex-col gap-4 h-[280px]`}>
            <div className="flex justify-between w-full"><div className="h-5 bg-slate-200 rounded-full w-1/3"></div><div className="h-6 bg-slate-200 rounded-xl w-16"></div></div>
            <div className="h-10 bg-slate-200 rounded-full w-3/4 mt-3"></div>
            <div className="space-y-4 mt-4"><div className="h-4 bg-slate-200 rounded-full w-1/2"></div><div className="h-4 bg-slate-200 rounded-full w-2/3"></div></div>
            <div className="mt-auto h-14 bg-slate-100/50 rounded-[16px] w-full border border-slate-200/50"></div>
        </div>
    ); 
});

const NotifModal = memo(function NotifModal({ isOpen, onClose, eventosActivos, onConfirmWebRequest, onRejectWebRequest, onUpdateWebRequest, staffCapacity, christmasSantaCapacity = 1, targetReservationId = '' }) {
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [confirming, setConfirming] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [confirmedName, setConfirmedName] = useState('');
    const [rejectedName, setRejectedName] = useState('');
    const [santaAsignado, setSantaAsignado] = useState('Santa 1');
    const [transportDraft, setTransportDraft] = useState('');
    const [savingTransport, setSavingTransport] = useState(false);
    const [resourceDraft, setResourceDraft] = useState({ animadores:0, payasos:0, durationMinutes:120 });
    const [savingResources, setSavingResources] = useState(false);
    useEffect(() => { if (!isOpen) { setSelectedRequest(null); setConfirming(false); setRejecting(false); setConfirmedName(''); setRejectedName(''); setSantaAsignado('Santa 1'); setTransportDraft(''); setSavingTransport(false); setResourceDraft({animadores:0,payasos:0,durationMinutes:120}); setSavingResources(false); } }, [isOpen]);
    useEffect(() => {
        if (selectedRequest) {
            setSantaAsignado(selectedRequest.santaAsignado || 'Santa 1');
            setTransportDraft(String(utils.safeNum(selectedRequest.transporte)));
            const req = inferResourceRequirements(selectedRequest);
            setResourceDraft({
                animadores: Math.max(0, Math.round(Number(req.animadores) || 0)),
                payasos: Math.max(0, Math.round(Number(req.payasos) || 0)),
                durationMinutes: Math.max(30, Math.round(Number(req.durationMinutes) || 120))
            });
        }
    }, [selectedRequest]);
    // Si la app se abrió desde una notificación, entra directamente a esa solicitud web.
    useEffect(() => {
        if (!isOpen || !targetReservationId) return;
        const target = (Array.isArray(eventosActivos) ? eventosActivos : []).find(e => String(e?.id || '') === String(targetReservationId));
        if (target && isPendingWebRequest(target)) setSelectedRequest(target);
    }, [isOpen, targetReservationId, eventosActivos]);
    useEffect(() => { const closeSelectedOnBack = (e) => { if (isOpen && (selectedRequest || confirmedName || rejectedName)) { setSelectedRequest(null); setConfirmedName(''); setRejectedName(''); if (e?.detail) e.detail.handled = true; } }; window.addEventListener('diverty:back-layer', closeSelectedOnBack); return () => window.removeEventListener('diverty:back-layer', closeSelectedOnBack); }, [isOpen, selectedRequest, confirmedName, rejectedName]);
    const availableSantaNames = Array.from({ length: Math.max(1, Number(christmasSantaCapacity) || 1) }, (_, i) => `Santa ${i + 1}`);
    useEffect(() => {
        if (!isOpen || !selectedRequest) return;
        const christmas = selectedRequest.esNavidad === true || /entregas de nochebuena/i.test(String(selectedRequest.servicio || ''));
        if (christmas && !availableSantaNames.includes(santaAsignado)) setSantaAsignado(availableSantaNames[0] || 'Santa 1');
    }, [isOpen, selectedRequest, christmasSantaCapacity, santaAsignado]);
    if (!isOpen) return null;
    const reqs = eventosActivos
        .filter(isPendingWebRequest)
        .sort((a,b) => new Date(b.createdAt||0).getTime() - new Date(a.createdAt||0).getTime());
    const money = v => `$${utils.safeNum(v).toFixed(2)}`;
    const phone = selectedRequest ? String(selectedRequest.telefono || '').replace(/\D/g,'') : '';
    const isChristmasRequest = !!(selectedRequest && (selectedRequest.esNavidad === true || /entregas de nochebuena/i.test(String(selectedRequest.servicio || ''))));
    const resourcePreviewRequest = selectedRequest ? {
        ...selectedRequest,
        resourceRequirements: {
            animadores: Math.max(0, Math.round(Number(resourceDraft.animadores) || 0)),
            payasos: Math.max(0, Math.round(Number(resourceDraft.payasos) || 0)),
            durationMinutes: Math.max(30, Math.round(Number(resourceDraft.durationMinutes) || 120))
        },
        duracionMinutos: Math.max(30, Math.round(Number(resourceDraft.durationMinutes) || 120))
    } : null;
    const resourceStatus = resourcePreviewRequest ? getResourceAvailability(resourcePreviewRequest, eventosActivos, staffCapacity || {}) : null;
    const showResourcePanel = !!(selectedRequest && !isChristmasRequest && resourceStatus);
    const inferredTransportReview = !!(selectedRequest && /por confirmar|por revisar|fuera del area|fuera del área|despues de|después de/i.test(String(selectedRequest.ubicacion || '')));
    const needsTransportReview = !!((selectedRequest?.requiereRevisionUbicacion === true || inferredTransportReview) && selectedRequest?.transporteRevisadoEnApp !== true);
    const saveResources = async () => {
        if (!selectedRequest || savingResources || typeof onUpdateWebRequest !== 'function') return;
        const next = {
            animadores: Math.max(0, Math.min(50, Math.round(Number(resourceDraft.animadores) || 0))),
            payasos: Math.max(0, Math.min(50, Math.round(Number(resourceDraft.payasos) || 0))),
            durationMinutes: Math.max(30, Math.min(720, Math.round(Number(resourceDraft.durationMinutes) || 120)))
        };
        setSavingResources(true);
        const updated = await onUpdateWebRequest(selectedRequest, {
            resourceRequirements: next,
            duracionMinutos: next.durationMinutes,
            recursosRevisadosEnApp: true
        });
        setSavingResources(false);
        if (updated) {
            setSelectedRequest(prev => ({...prev, ...updated}));
            setResourceDraft(next);
        }
    };
    const saveTransport = async () => {
        if (!selectedRequest || savingTransport || typeof onUpdateWebRequest !== 'function') return;
        const nextTransport = Math.max(0, utils.safeNum(transportDraft));
        const currentTransport = utils.safeNum(selectedRequest.transporte);
        const currentTotal = utils.safeNum(selectedRequest.total);
        const nextTotal = Math.max(0, currentTotal - currentTransport + nextTransport);
        setSavingTransport(true);
        const updated = await onUpdateWebRequest(selectedRequest, {
            transporte: String(nextTransport),
            total: String(nextTotal),
            transporteAjustadoEnApp: true,
            transporteRevisadoEnApp: true,
            transporteOriginalWeb: selectedRequest.transporteOriginalWeb ?? String(currentTransport)
        });
        setSavingTransport(false);
        if (updated) setSelectedRequest(prev => ({...prev, ...updated}));
    };
    const confirmSelected = async () => {
        if (!selectedRequest || confirming) return;
        if (showResourcePanel && resourceStatus && !resourceStatus.feasible) {
            window.alert('No hay suficiente personal disponible para este horario. Ajusta la reserva o el personal antes de aceptarla.');
            return;
        }
        if (needsTransportReview) {
            window.alert('Esta ubicación llegó con transporte por confirmar. Revisa el monto y pulsa “Confirmar transporte” antes de aceptar la reserva.');
            return;
        }
        setConfirming(true);
        const currentName = selectedRequest.cliente || 'Cliente';
        const esNavidad = selectedRequest.esNavidad === true || /entregas de nochebuena/i.test(String(selectedRequest.servicio || ''));
        const ok = await onConfirmWebRequest(selectedRequest, esNavidad ? santaAsignado : '');
        setConfirming(false);
        if (ok) { setSelectedRequest(null); setConfirmedName(currentName); }
    };
    const rejectSelected = async () => {
        if (!selectedRequest || rejecting) return;
        const currentName = selectedRequest.cliente || 'Cliente';
        if (!window.confirm(`¿Rechazar la solicitud de ${currentName}? El horario se liberará y quedará guardada en Canceladas / Rechazadas.`)) return;
        setRejecting(true);
        const ok = await onRejectWebRequest(selectedRequest);
        setRejecting(false);
        if (ok) { setSelectedRequest(null); setRejectedName(currentName); }
    };
    const webCard = (e) => (
        <button key={e.id} type="button" onClick={()=>setSelectedRequest(e)} className="w-full text-left bg-white rounded-[24px] p-5 border border-slate-200/80 shadow-[0_10px_30px_rgba(15,23,42,.055)] active:scale-[0.985] transition-all group relative overflow-hidden">
            <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-orange-400"/>
            <div className="flex justify-between items-center gap-3 mb-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] text-amber-600"><Zap size={11}/> Nueva solicitud</span><span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">{e.fecha?.split('-').reverse().join('/')}</span></div>
            <div className="flex items-center justify-between gap-3"><div className="min-w-0"><h4 className="font-black text-[19px] text-[#10182D] truncate">{e.cliente}</h4><p className="mt-2 text-xs font-bold text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1"><span className="inline-flex items-center gap-1.5"><Clock size={14} className="text-[#7657FF]"/>{utils.formatTime12h(e.hora)}</span><span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-[#FF3EA5]"/>{e.ubicacion || 'Sin ubicación'}</span></p>{e.servicio && <p className="mt-2 text-[11px] font-black uppercase tracking-wide text-slate-500 truncate">{e.servicio}</p>}</div><span className="shrink-0 w-11 h-11 rounded-full bg-[#7657FF]/10 text-[#7657FF] flex items-center justify-center group-active:translate-x-1 transition-transform"><ChevronRight size={21}/></span></div>
        </button>
    );
    return (
        <div className="fixed inset-0 z-[100000] bg-[#071225]/65 backdrop-blur-md flex justify-end animate-fadeIn">
            <div className="w-full sm:w-[430px] bg-[radial-gradient(circle_at_top_right,rgba(118,87,255,.09),transparent_25%),#F6F7FB] h-full flex flex-col shadow-2xl animate-slideLeft">
                <div className="px-5 py-5 bg-[#071126] border-b border-white/10 flex justify-between items-center shadow-lg relative z-10 text-white">
                    <div className="flex items-center gap-3">{(selectedRequest || confirmedName || rejectedName) && <button onClick={()=>{setSelectedRequest(null);setConfirmedName('');setRejectedName('')}} className="p-2 -ml-2 hover:bg-white/10 rounded-xl"><ChevronLeft size={21}/></button>}<div className="w-10 h-10 rounded-[14px] bg-white/10 flex items-center justify-center"><BellRing className="text-[#B7A5FF]" size={22}/></div><div><h3 className="font-black text-[21px] leading-tight">{selectedRequest ? 'Solicitud Web' : confirmedName ? 'Reserva confirmada' : rejectedName ? 'Reserva rechazada' : 'Alertas Web'}</h3>{!selectedRequest && !confirmedName && !rejectedName && <p className="text-[11px] text-white/55 font-semibold mt-0.5">Solicitudes recibidas desde tu página web</p>}</div></div>
                    <button onClick={onClose} className="p-2.5 hover:bg-white/10 rounded-xl transition-colors"><X size={21} className="text-white/65"/></button>
                </div>
                {(confirmedName || rejectedName) ? (
                    <div className="flex-1 p-5 flex items-center justify-center"><div className="w-full bg-white rounded-[30px] p-7 text-center shadow-[0_20px_55px_rgba(15,23,42,.12)] border border-white"><div className={`mx-auto w-24 h-24 rounded-[30px] flex items-center justify-center relative ${rejectedName ? 'bg-gradient-to-br from-rose-50 to-slate-100' : 'bg-gradient-to-br from-[#F3EEFF] to-[#E9E2FF]'}`}>{rejectedName ? <X size={46} className="text-rose-500"/> : <CalendarDays size={45} className="text-[#7657FF]"/>}<span className={`absolute -right-2 -bottom-2 w-10 h-10 rounded-full text-white flex items-center justify-center border-4 border-white ${rejectedName ? 'bg-rose-500' : 'bg-[#7657FF]'}`}>{rejectedName ? <X size={20}/> : <Check size={20}/>}</span></div><h4 className="font-black text-3xl text-[#10182D] mt-6">{rejectedName ? 'Reserva rechazada' : '¡Reserva confirmada!'}</h4><p className="text-slate-500 font-semibold mt-2">{rejectedName ? <>La solicitud de <b className="text-slate-700">{rejectedName}</b> se guardó en Canceladas / Rechazadas y el horario quedó liberado.</> : <>La reserva de <b className="text-slate-700">{confirmedName}</b> quedó confirmada correctamente y ya aparece en la agenda.</>}</p><button onClick={onClose} className={`mt-7 w-full py-4 rounded-[18px] text-white font-black shadow-[0_14px_30px_rgba(157,74,255,.18)] ${rejectedName ? 'bg-gradient-to-r from-rose-500 to-rose-600' : 'bg-gradient-to-r from-[#FF2F9A] via-[#D52DDA] to-[#7657FF]'}`}>Cerrar</button></div></div>
                ) : !selectedRequest ? (
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5"><div className="bg-white/80 rounded-[24px] p-2 mb-4 border border-white shadow-sm"><div className="grid grid-cols-2 gap-2"><div className="rounded-[18px] bg-gradient-to-r from-[#7657FF] to-[#9A5CFF] text-white px-4 py-3"><p className="text-[9px] uppercase tracking-[.15em] font-black opacity-75">Pendientes</p><p className="text-2xl font-black">{reqs.length}</p></div><div className="rounded-[18px] bg-slate-50 px-4 py-3"><p className="text-[9px] uppercase tracking-[.15em] font-black text-slate-400">Canal</p><p className="text-sm font-black text-slate-700 mt-1">Página Web</p></div></div></div><div className="space-y-3">{reqs.length === 0 ? <div className="bg-white rounded-[28px] p-10 text-center border border-slate-200/70 shadow-sm mt-5"><div className="w-20 h-20 rounded-[26px] bg-emerald-50 mx-auto flex items-center justify-center"><CheckCircle2 size={38} className="text-emerald-500"/></div><p className="font-black text-[#10182D] text-xl mt-5">Todo al día</p><p className="font-semibold text-slate-400 text-sm mt-1">No hay nuevas solicitudes web.</p></div> : reqs.map(webCard)}</div></div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 pb-8">
                        <div className="bg-white rounded-[28px] border border-white shadow-[0_16px_45px_rgba(15,23,42,.08)] overflow-hidden"><div className="p-5 bg-gradient-to-br from-[#F7F3FF] via-white to-[#FFF4FA] border-b border-slate-100"><div className="flex justify-between items-center gap-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] text-amber-600"><Zap size={11}/> Nueva solicitud</span><span className="text-[10px] font-black text-slate-500 bg-white px-3 py-1.5 rounded-full shadow-sm">{selectedRequest.fecha?.split('-').reverse().join('/')}</span></div><div className="mt-4 flex justify-between gap-3"><div><h4 className="font-black text-[27px] text-[#10182D] leading-tight">{selectedRequest.cliente}</h4><p className="text-xs font-bold text-slate-500 mt-1">Solicitud recibida directamente desde la página web</p></div>{phone && <div className="flex gap-2"><button type="button" onClick={()=>utils.openWhatsAppBusiness(phone,`Hola ${selectedRequest.cliente}, recibimos tu solicitud de reserva.`)} className="w-11 h-11 rounded-[15px] bg-emerald-50 text-emerald-500 flex items-center justify-center"><MessageCircle size={21}/></button><a href={`tel:${phone}`} className="w-11 h-11 rounded-[15px] bg-[#7657FF]/10 text-[#7657FF] flex items-center justify-center"><Smartphone size={21}/></a></div>}</div></div>
                            <div className="p-4 space-y-3"><div className="grid grid-cols-3 gap-2"><div className="rounded-[18px] bg-slate-50 p-3"><CalendarDays size={18} className="text-[#7657FF]"/><p className="text-[9px] uppercase font-black tracking-wider text-slate-400 mt-2">Fecha</p><p className="text-xs font-black text-slate-800 mt-1">{selectedRequest.fecha?.split('-').reverse().join('/') || '—'}</p></div><div className="rounded-[18px] bg-slate-50 p-3"><Clock size={18} className="text-[#7657FF]"/><p className="text-[9px] uppercase font-black tracking-wider text-slate-400 mt-2">Hora</p><p className="text-xs font-black text-slate-800 mt-1">{utils.formatTime12h(selectedRequest.hora)}</p></div><div className="rounded-[18px] bg-slate-50 p-3"><MapPin size={18} className="text-[#FF3EA5]"/><p className="text-[9px] uppercase font-black tracking-wider text-slate-400 mt-2">Ubicación</p><p className="text-[11px] font-black text-slate-800 mt-1 leading-tight">{selectedRequest.ubicacion || '—'}</p></div></div>
                            <div className="rounded-[20px] bg-slate-50 p-4"><div className="flex items-center justify-between gap-2"><p className="text-[9px] uppercase tracking-[.14em] font-black text-slate-400">Dirección / referencia</p><span className={`text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${utils.normalizeText(selectedRequest.ubicacionFuente||selectedRequest.locationSource||'').includes('gps')?'bg-emerald-50 text-emerald-600':'bg-amber-50 text-amber-600'}`}>{utils.normalizeText(selectedRequest.ubicacionFuente||selectedRequest.locationSource||'').includes('gps')?'GPS':'Manual'}</span></div><p className="font-bold text-slate-700 mt-1 whitespace-pre-wrap">{selectedRequest.direccion || 'No indicada'}</p>{selectedRequest.referenciaLugar&&<><p className="text-[9px] uppercase tracking-[.14em] font-black text-slate-400 mt-3">PH / barriada / referencia</p><p className="font-semibold text-slate-600 mt-1 whitespace-pre-wrap">{selectedRequest.referenciaLugar}</p></>}</div>
                            <div className="rounded-[22px] bg-gradient-to-br from-[#F7F3FF] to-white p-4 border border-[#7657FF]/10"><div className="flex justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[.12em] font-black text-[#7657FF] flex items-center gap-1.5"><Sparkles size={14}/> Servicio solicitado</p><p className="font-black text-[#10182D] mt-2 whitespace-pre-wrap">{selectedRequest.servicio || '—'}</p></div><span className="shrink-0 h-fit rounded-full bg-[#7657FF]/10 px-3 py-1.5 font-black text-[#7657FF]">{money(selectedRequest.total)}</span></div>{selectedRequest.descripcionEvento && <p className="font-semibold text-slate-600 whitespace-pre-wrap mt-3 text-sm leading-relaxed">{selectedRequest.descripcionEvento}</p>}{selectedRequest.comentarios && <div className="mt-3 pt-3 border-t border-[#7657FF]/10"><p className="text-[9px] uppercase tracking-widest font-black text-slate-400">Comentarios</p><p className="font-semibold text-slate-600 whitespace-pre-wrap mt-1">{selectedRequest.comentarios}</p></div>}</div>
                            {(selectedRequest.esNavidad === true || /entregas de nochebuena/i.test(String(selectedRequest.servicio || ''))) && <div className="rounded-[22px] border border-red-100 bg-gradient-to-br from-red-50 via-white to-amber-50 p-4"><div className="flex items-center gap-3 mb-3"><div className="w-11 h-11 rounded-[15px] bg-red-100 flex items-center justify-center text-2xl">🎅</div><div><p className="text-[9px] uppercase tracking-[.14em] font-black text-red-500">Operación Navidad</p><p className="font-black text-[#10182D]">Santa asignado</p></div></div><select value={santaAsignado} onChange={e=>setSantaAsignado(e.target.value)} className="w-full rounded-[16px] border border-red-100 bg-white px-4 py-3 text-sm font-black text-slate-800 outline-none">{availableSantaNames.map(name=><option key={name} value={name}>{name}</option>)}</select><p className="mt-2 text-[10px] font-semibold text-slate-400">Selecciona quién atenderá esta entrega. La asignación quedará guardada en la reserva.</p></div>}
                            {showResourcePanel && resourceStatus && <div className={`rounded-[22px] border p-4 ${resourceStatus.feasible?'border-emerald-100 bg-emerald-50/70':'border-rose-200 bg-rose-50/80'}`}><div className="flex items-start justify-between gap-3"><div><p className={`text-[9px] uppercase tracking-[.14em] font-black ${resourceStatus.feasible?'text-emerald-600':'text-rose-600'}`}>Personal para esta reserva</p><p className="font-black text-slate-900 mt-1">{resourceStatus.feasible?'Sí puedes recibirla con el personal actual':'No hay suficiente personal en este horario'}</p><p className="text-[10px] font-semibold text-slate-500 mt-1">Puedes corregir aquí lo que realmente requiere el servicio antes de aceptar.</p></div>{resourceStatus.feasible?<CheckCircle2 size={24} className="text-emerald-500 shrink-0"/>:<AlertTriangle size={24} className="text-rose-500 shrink-0"/>}</div><div className="grid grid-cols-2 gap-2 mt-4"><div className="rounded-[16px] bg-white p-3 border border-slate-100"><p className="text-[8px] font-black uppercase text-slate-400">Animadores</p><div className="grid grid-cols-3 gap-1 mt-2 text-center"><div><p className="text-[8px] font-bold text-slate-400">Total</p><p className="font-black text-slate-800">{resourceStatus.capacity.animadores}</p></div><div><p className="text-[8px] font-bold text-slate-400">Ocupados</p><p className="font-black text-amber-600">{resourceStatus.usage.animadores}</p></div><div><p className="text-[8px] font-bold text-slate-400">Libres</p><p className="font-black text-emerald-600">{resourceStatus.available.animadores}</p></div></div><label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mt-3">Esta reserva necesita</label><input type="number" min="0" max="50" value={resourceDraft.animadores} onChange={e=>setResourceDraft(prev=>({...prev,animadores:Math.max(0,Math.min(50,Number(e.target.value)||0))}))} className="mt-1 w-full h-11 rounded-[13px] border border-slate-200 bg-slate-50 px-3 text-center font-black text-slate-900 outline-none focus:border-[#7657FF]/40"/></div><div className="rounded-[16px] bg-white p-3 border border-slate-100"><p className="text-[8px] font-black uppercase text-slate-400">Payasos</p><div className="grid grid-cols-3 gap-1 mt-2 text-center"><div><p className="text-[8px] font-bold text-slate-400">Total</p><p className="font-black text-slate-800">{resourceStatus.capacity.payasos}</p></div><div><p className="text-[8px] font-bold text-slate-400">Ocupados</p><p className="font-black text-amber-600">{resourceStatus.usage.payasos}</p></div><div><p className="text-[8px] font-bold text-slate-400">Libres</p><p className="font-black text-emerald-600">{resourceStatus.available.payasos}</p></div></div><label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mt-3">Esta reserva necesita</label><input type="number" min="0" max="50" value={resourceDraft.payasos} onChange={e=>setResourceDraft(prev=>({...prev,payasos:Math.max(0,Math.min(50,Number(e.target.value)||0))}))} className="mt-1 w-full h-11 rounded-[13px] border border-slate-200 bg-slate-50 px-3 text-center font-black text-slate-900 outline-none focus:border-[#7657FF]/40"/></div></div><div className="grid grid-cols-[1fr_auto] gap-2 mt-3 items-end"><div><label className="block text-[8px] font-black uppercase tracking-wider text-slate-400">Duración que ocupa al personal</label><div className="relative mt-1"><input type="number" min="30" max="720" step="15" value={resourceDraft.durationMinutes} onChange={e=>setResourceDraft(prev=>({...prev,durationMinutes:Math.max(30,Math.min(720,Number(e.target.value)||120))}))} className="w-full h-11 rounded-[13px] border border-slate-200 bg-white px-3 pr-12 font-black text-slate-900 outline-none focus:border-[#7657FF]/40"/><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">MIN</span></div></div><button type="button" disabled={savingResources} onClick={saveResources} className="h-11 px-4 rounded-[13px] bg-[#10182D] text-white text-[9px] font-black uppercase tracking-wider disabled:opacity-50">{savingResources?'Guardando':'Guardar personal'}</button></div>{!resourceStatus.feasible&&<div className="mt-3 rounded-[14px] bg-white/80 border border-rose-100 p-3 text-[10px] font-bold text-rose-600">No podrás aceptar la reserva hasta que haya personal suficiente o ajustes correctamente lo que necesita este servicio.</div>}</div>}
                            <div className={`rounded-[22px] border p-4 ${needsTransportReview?'border-amber-200 bg-amber-50/80':'border-[#7657FF]/10 bg-[#F8F6FF]'}`}><div className="flex items-center justify-between gap-3"><div><p className={`text-[9px] uppercase tracking-[.14em] font-black ${needsTransportReview?'text-amber-600':'text-[#7657FF]'}`}>{needsTransportReview?'Transporte por confirmar':'Transporte de la solicitud'}</p><p className="text-[10px] font-semibold text-slate-500 mt-1">{needsTransportReview?'La ubicación quedó fuera del cálculo automático. Define el transporte final antes de aceptar.':'Si la zona o dirección no concuerda, corrige el monto antes de aceptar.'}</p></div><span className="text-xl font-black text-slate-900">{money(selectedRequest.transporte)}</span></div>{selectedRequest.transporteOriginalWeb!=null&&<p className="mt-2 text-[9px] font-bold text-slate-400">Calculado en web: {money(selectedRequest.transporteOriginalWeb)}</p>}<div className="grid grid-cols-[1fr_auto] gap-2 mt-3"><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">$</span><input type="number" min="0" step="0.01" value={transportDraft} onChange={e=>setTransportDraft(e.target.value)} className="w-full h-12 rounded-[14px] bg-white border border-slate-200 pl-8 pr-3 font-black text-slate-900 outline-none focus:border-[#7657FF]/40"/></div><button type="button" disabled={savingTransport} onClick={saveTransport} className="px-4 h-12 rounded-[14px] bg-[#7657FF] text-white font-black text-[9px] uppercase tracking-wider disabled:opacity-60">{savingTransport?'Guardando':needsTransportReview?'Confirmar transporte':'Aplicar'}</button></div></div>
                            <div className="grid grid-cols-3 gap-2"><div className="rounded-[18px] bg-slate-50 p-3"><p className="text-[9px] uppercase font-black text-slate-400">Transporte</p><p className="font-black text-slate-800 mt-1">{money(selectedRequest.transporte)}</p></div><div className="rounded-[18px] bg-slate-50 p-3"><p className="text-[9px] uppercase font-black text-slate-400">Descuento</p><p className="font-black text-slate-800 mt-1">{money(selectedRequest.descuento)}</p></div><div className="rounded-[18px] bg-emerald-50 p-3"><p className="text-[9px] uppercase font-black text-emerald-500">Total</p><p className="font-black text-emerald-600 mt-1">{money(selectedRequest.total)}</p></div></div></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4"><button type="button" disabled={rejecting || confirming} onClick={rejectSelected} className="py-4 rounded-[18px] border-2 border-rose-200 text-rose-600 font-black bg-white disabled:opacity-60 active:scale-[.98] flex items-center justify-center gap-2"><X size={20}/>{rejecting ? 'Rechazando...' : 'Rechazar reserva'}</button><button disabled={confirming || rejecting || needsTransportReview || (showResourcePanel && resourceStatus && !resourceStatus.feasible)} onClick={confirmSelected} className="py-4 rounded-[18px] bg-gradient-to-r from-[#FF2F9A] via-[#D52DDA] to-[#7657FF] disabled:opacity-60 text-white font-black shadow-[0_14px_30px_rgba(157,74,255,.25)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"><CheckCircle2 size={20}/>{confirming ? 'Confirmando...' : needsTransportReview ? 'Revisa transporte' : 'Aceptar reserva'}</button></div>
                    </div>
                )}
            </div>
        </div>
    );
});

const PdfTemplate = memo(function PdfTemplate({ printData, printType, pdfScale, onClose, onPrint, onShare, onDownload, appSettings, catalogoPaquetes = [] }) {
    const isC = printType === 'cotizacion', isContrato = printType === 'contrato', isContratoProv = printType === 'contrato_proveedor';
    const cli = String(printData.cliente || printData.nombre || ''), tel = String(printData.telefono || ''), emailStr = String(printData.email || ''), rucStr = String(printData.ruc || '');
    const ubi = String(printData.ubicacion || 'Por definir'), dir = String(printData.direccion || '');
    const fechaEvento = printData.fecha ? String(printData.fecha).split('-').reverse().join('/') : 'Por definir';
    const fechaEmisionISO = isC && printData.fechaEmisionCotizacion ? String(printData.fechaEmisionCotizacion).slice(0,10) : utils.getLocalYYYYMMDD(new Date());
    const fechaEmision = fechaEmisionISO.split('-').reverse().join('/');
    const vigenciaDias = Math.max(1, Math.round(utils.safeNum(printData.vigenciaCotizacion) || 7));
    const fechaValidaHasta = (() => { try { const d = new Date(`${fechaEmisionISO}T12:00:00`); d.setDate(d.getDate() + vigenciaDias); return utils.getLocalYYYYMMDD(d).split('-').reverse().join('/'); } catch (_) { return ''; } })();
    const horaStr = utils.formatTime12h(printData.hora), storedTotal = utils.safeNum(printData.total), trn = utils.safeNum(printData.transporte), abo = utils.safeNum(printData.abono);
    // PDF: la fuente de verdad son ÚNICAMENTE los servicios escogidos en esta reserva/cotización.
    // `catalogoPaquetes` se usa más abajo solo para completar descripciones/duración; nunca para sumar precios.
    const rawSelectedServices = Array.isArray(printData.serviciosSeleccionados)
      ? printData.serviciosSeleccionados.filter(s => s && String(s.nombre || '').trim())
      : [];
    const summaryNames = String(printData.servicio || '')
      .split(/\s+\+\s+/)
      .map(x => x.replace(/\s*\(x\d+\)\s*$/i, '').trim())
      .filter(Boolean)
      .map(x => utils.normalizeText(x));
    let selectedServices = rawSelectedServices;
    // Compatibilidad con datos antiguos donde, por error, pudo persistirse una lista mayor
    // que los servicios realmente indicados en el resumen de la reserva.
    // Si existe un resumen explícito, SIEMPRE manda ese resumen. Si ningún registro
    // coincide, preferimos una única línea de respaldo antes que imprimir el inventario completo.
    if (summaryNames.length) {
      const allowed = new Set(summaryNames);
      selectedServices = rawSelectedServices.filter(s => allowed.has(utils.normalizeText(s?.nombre || '').trim()));
    }
    const seenServices = new Set();
    selectedServices = selectedServices.filter(s => {
      const key = String(s?.id || '') || `${utils.normalizeText(s?.nombre || '')}|${Number(s?.cantidad)||1}|${utils.safeNum(s?.precio).toFixed(2)}`;
      if (seenServices.has(key)) return false;
      seenServices.add(key);
      return true;
    });
    const fallbackServiceSubtotal = Math.max(0, storedTotal - trn);
    const sA = selectedServices.length
      ? selectedServices
      : [{ nombre: String(printData.servicio || printData.especialidad || 'Servicio General'), precio: fallbackServiceSubtotal, cantidad: 1, descripcion: String(printData.comentarios || '') }];
    const selectedServicesSubtotal = sA.reduce((sum, s) => sum + Math.max(0, utils.safeNum(s?.precio)), 0);
    // En cotizaciones se recalcula el total desde los servicios seleccionados para impedir
    // que un valor antiguo/dañado del inventario termine impreso en la propuesta.
    const tot = isC ? selectedServicesSubtotal + trn : storedTotal;
    const subServicios = isC ? selectedServicesSubtotal : Math.max(0, tot - trn);
    const saldo = Math.max(0, tot - abo);
    const numRef = isC ? (printData.numeroCotizacion || 'COT-PENDIENTE') : isContratoProv ? (printData.numeroSubcontrato || 'SUB-PENDIENTE') : isContrato ? (printData.numeroContrato || 'CON-PENDIENTE') : (printData.numeroFactura || 'FAC-PENDIENTE');
    const docTitle = isC ? 'COTIZACIÓN' : isContratoProv ? (printData.contratoEvento === true || !!printData.eventoAsignado ? 'SUBCONTRATO DEL EVENTO' : 'ACUERDO MARCO DE PROVEEDOR') : isContrato ? 'CONTRATO DE SERVICIO' : 'FACTURA COMERCIAL';
    const providerId = String(printData.identificacion || printData.ruc || '').trim();
    const providerAddress = String(printData.direccion || '').trim();
    const providerEmail = String(printData.email || '').trim();
    const providerPaymentTerms = String(printData.condicionesPago || 'Pago contra prestación satisfactoria del servicio.').trim();
    // Subcontrato de proveedor: si el PDF corresponde a una reserva concreta,
    // la fuente de verdad son SOLO los servicios de ese proveedor seleccionados en esa reserva.
    // `printData.servicios` es el catálogo completo del proveedor y se usa únicamente para el contrato marco.
    const assignedProviderServices = Array.isArray(printData.serviciosAsignados)
      ? printData.serviciosAsignados.filter(x => x && String(x.nombre || x.servicio || '').trim())
      : [];
    const isProviderEventContract = isContratoProv && (assignedProviderServices.length > 0 || printData.contratoEvento === true || !!printData.eventoAsignado);
    const providerServices = isProviderEventContract
      ? assignedProviderServices.map((x,i) => ({
          id: x.id || `asig-${i}`,
          nombre: String(x.nombre || x.servicio || 'Servicio').trim(),
          costo: Math.max(0, utils.safeNum(x.costo ?? x.precio)),
          cantidad: Math.max(1, Number(x.cantidad) || 1)
        }))
      : (Array.isArray(printData.servicios) && printData.servicios.length
          ? printData.servicios.filter(x=>x && x.activo !== false)
          : [{ nombre: printData.especialidad || 'Servicios para eventos', costo: utils.safeNum(printData.costoBase), cantidad: 1 }]);
    const providerTotal = providerServices.reduce((sum, srv) => sum + Math.max(0, utils.safeNum(srv?.costo)), 0);
    const providerEvent = printData.eventoAsignado && typeof printData.eventoAsignado === 'object' ? printData.eventoAsignado : null;

    const serviceInfo = (servicio) => {
        const cant = Number(servicio.cantidad) || 1;
        const n = utils.normalizeText(servicio.nombre || '').trim();
        const catalogMatch = (Array.isArray(catalogoPaquetes) ? catalogoPaquetes : []).find(p => utils.normalizeText(p?.nombre || '').trim() === n) || {};
        const toLines = (value) => {
            if (Array.isArray(value)) return value.flatMap(toLines);
            if (value && typeof value === 'object') return Object.values(value).flatMap(toLines);
            return String(value || '').split(/\n|\r|\||;/).map(x => x.replace(/^(?:todo lo que incluye\s*:?|incluye\s*:?|[•\-–—*])\s*/i, '').trim()).filter(Boolean);
        };
        const includeCandidates = [
            servicio.incluye, servicio.serviciosLista, servicio.todoIncluido, servicio.todoLoIncluido, servicio.actividades, servicio.detalles, servicio.itemsIncluidos,
            catalogMatch.incluye, catalogMatch.serviciosLista, catalogMatch.todoIncluido, catalogMatch.todoLoIncluido, catalogMatch.actividades, catalogMatch.detalles, catalogMatch.itemsIncluidos
        ];
        const includeLines = includeCandidates.flatMap(toLines);
        const descLines = [servicio.descripcionCompleta, servicio.descripcion, catalogMatch.descripcionCompleta, catalogMatch.descripcion].flatMap(toLines);
        // Los campos de nivel superior solo se usan en documentos realmente antiguos que
        // no guardaban serviciosSeleccionados. Así una descripción histórica contaminada
        // tampoco puede volver a inyectar el inventario completo dentro del PDF.
        const topLevelLines = rawSelectedServices.length === 0 && sA.length === 1
          ? [printData.descripcionEvento, printData.todoIncluido, printData.todoLoIncluido, printData.serviciosLista].flatMap(toLines)
          : [];
        const rawDetails = [...includeLines, ...descLines, ...topLevelLines].filter(x => !/^\d+(?:[.,]\d+)?\s*(?:h|hr|hrs|hora|horas)(?:\s*\([^)]*\))?$/i.test(x));
        const detalles = [...new Map(rawDetails.map(x => [utils.normalizeText(x), x])).values()].slice(0, 12);
        const durationText = [servicio.duracion, servicio.duracionTexto, servicio.descripcion, catalogMatch.duracion, catalogMatch.duracionTexto, catalogMatch.descripcion, ...includeLines].filter(Boolean).join(' ');
        const m = durationText.match(/(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|hora|horas)\b/i);
        const fallback = n.includes('plan recreativo') ? 2 : (n.includes('plan diverty') ? 3 : 0);
        const hrs = utils.safeNum(servicio.duracionHoras) || utils.safeNum(catalogMatch.duracionHoras) || (m ? Number(String(m[1]).replace(',', '.')) : 0) || fallback;
        const hourly = utils.normalizeText(servicio.tipoCobro || catalogMatch.tipoCobro || '') === 'hora' || servicio.isHourly === true || catalogMatch.isHourly === true;
        const duracion = hourly ? `${cant} ${cant === 1 ? 'Hora' : 'Horas'}` : (hrs > 0 ? `${hrs} ${hrs === 1 ? 'Hora' : 'Horas'}` : '—');
        return { cant, duracion, detalles, precio: utils.safeNum(servicio.precio) };
    };

    const invoiceConceptDescription = (servicio, info) => {
        const n = utils.normalizeText(servicio?.nombre || '');
        if (n.includes('plan')) return 'Paquete de entretenimiento para evento.';
        if (n.includes('personaje')) return 'Servicio de personaje y entretenimiento para evento.';
        if (n.includes('show') || n.includes('animacion') || n.includes('animación')) return 'Servicio de entretenimiento para evento.';
        if (n.includes('brincolin') || n.includes('brincolín') || n.includes('inflable')) return 'Servicio recreativo para evento.';
        const first = Array.isArray(info?.detalles) ? info.detalles.find(Boolean) : '';
        return first ? String(first) : 'Servicio contratado para el evento.';
    };

    const BrandHeader = () => (<>
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#7657FF] via-[#8B5CF6] to-[#FF3EA5]" />
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-gradient-to-br from-[#FF3EA5]/10 via-[#8B5CF6]/8 to-[#7657FF]/5 pointer-events-none" />
        <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center gap-4">
                <div className="bg-white p-2.5 rounded-[18px] border border-slate-100 shadow-sm w-[138px]"><img src={LOGO_URL} alt="Diverty" className="h-12 w-full object-contain" crossOrigin="anonymous" /></div>
                <div><p className="text-[10px] font-black tracking-[0.23em] text-[#7657FF] uppercase">Diverty Eventos Panamá</p><p className="text-[9px] font-semibold text-slate-400 mt-1">{appSettings.empresa.email} · {appSettings.empresa.telefono}</p><p className="text-[9px] font-semibold text-slate-400">{appSettings.empresa.web}</p></div>
            </div>
            <div className="text-right relative z-20"><div className="inline-block border border-slate-200 px-4 py-2 rounded-xl" style={{backgroundColor:'#F8FAFC', color:'#0F172A'}}><p className="text-[8px] font-black tracking-[0.18em] uppercase" style={{color:'#94A3B8'}}>Nº Documento</p><p className="text-[14px] font-black mt-0.5" style={{color:'#0F172A', WebkitTextFillColor:'#0F172A'}}>{numRef}</p></div><p className="text-[9px] font-bold mt-2" style={{color:'#94A3B8'}}>Emisión: {fechaEmision}</p>{isC&&<p className="text-[9px] font-black mt-1" style={{color:'#8B5CF6'}}>Válida hasta: {fechaValidaHasta}</p>}</div>
        </div>
        <div className="mt-5 mb-5 relative z-10"><h1 className="text-[25px] font-black tracking-[0.16em] text-center" style={{color:'#5B4BE8', WebkitTextFillColor:'#5B4BE8', background:'transparent'}}>{docTitle}</h1>{isContrato && <p className="text-center text-[8px] font-black tracking-[0.3em] text-slate-400 uppercase mt-1">Eventos infantiles y sociales</p>}{isC && <p className="text-center text-[9px] font-bold text-slate-400 mt-1">Propuesta comercial sujeta a disponibilidad al momento de confirmar</p>}</div>
    </>);

    const InfoCards = ({ compact=false }) => (<div className={`grid grid-cols-2 gap-4 ${compact?'mb-4':'mb-5'} relative z-10`}>
        <div className="bg-slate-50/80 rounded-2xl border border-slate-100 p-4"><p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#8B5CF6] mb-3 flex items-center gap-1.5"><Users size={12}/> Datos del cliente</p><div className="space-y-1.5 text-[9.5px]"><p><span className="text-slate-400 font-bold">Nombre:</span> <strong className="float-right text-slate-800 max-w-[190px] truncate">{cli || '—'}</strong></p><p><span className="text-slate-400 font-bold">Teléfono:</span> <strong className="float-right text-slate-800">{tel || '—'}</strong></p>{emailStr&&<p><span className="text-slate-400 font-bold">Correo:</span> <strong className="float-right text-slate-800 max-w-[190px] truncate">{emailStr}</strong></p>}{rucStr&&<p><span className="text-slate-400 font-bold">RUC / ID fiscal:</span> <strong className="float-right text-slate-800 max-w-[180px] truncate">{rucStr}</strong></p>}</div></div>
        <div className="bg-slate-50/80 rounded-2xl border border-slate-100 p-4"><p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#7657FF] mb-3 flex items-center gap-1.5"><Calendar size={12}/> Detalles del evento</p><div className="space-y-1.5 text-[9.5px]"><p><span className="text-slate-400 font-bold">Fecha:</span> <strong className="float-right text-slate-800">{fechaEvento}</strong></p><p><span className="text-slate-400 font-bold">Horario:</span> <strong className="float-right text-slate-800">{horaStr || 'Por definir'}</strong></p><p><span className="text-slate-400 font-bold">Zona:</span> <strong className="float-right text-slate-800 max-w-[180px] truncate">{ubi}</strong></p>{dir&&<p className="pt-1 text-[8.5px] text-slate-500 italic line-clamp-2 text-right">{dir}</p>}</div></div>
    </div>);

    const FooterBrand = () => (<div className="mt-auto pt-3 relative z-10"><div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-3"/><div className="flex justify-between items-center"><p className="text-[8px] font-bold text-slate-400">Diverty Eventos Panamá · {appSettings.empresa.telefono}</p><p className="text-[10px] font-black italic text-[#8B5CF6]">¡Hacemos de tu evento un momento inolvidable!</p></div></div>);

    const Invoice = () => (<>
        <BrandHeader/><InfoCards/>
        <div className="relative z-10 border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-[10px]"><thead className="bg-gradient-to-r from-[#7657FF]/7 to-[#FF3EA5]/7"><tr className="text-[8px] uppercase tracking-wider text-slate-500"><th className="p-3 text-center w-[8%]">Cant.</th><th className="p-3 text-left w-[42%]">Concepto / Servicio</th><th className="p-3 text-center w-[16%]">Duración</th><th className="p-3 text-right w-[17%]">P. Unit.</th><th className="p-3 text-right w-[17%]">Total</th></tr></thead><tbody className="divide-y divide-slate-100">
            {sA.map((s,i)=>{const x=serviceInfo(s); return <tr key={i}><td className="p-3 text-center font-bold">{x.cant}</td><td className="p-3"><p className="font-black text-slate-900">{String(s.nombre)}</p><p className="text-[8.5px] text-slate-400 mt-1">{invoiceConceptDescription(s, x)}</p></td><td className="p-3 text-center font-bold text-[#8B5CF6]">{x.duracion}</td><td className="p-3 text-right font-bold">B/. {(x.precio/x.cant).toFixed(2)}</td><td className="p-3 text-right font-black">B/. {x.precio.toFixed(2)}</td></tr>})}
            {trn>0&&<tr><td className="p-3 text-center font-bold">1</td><td className="p-3"><p className="font-black">Viáticos / Transporte</p><p className="text-[8.5px] text-slate-400 mt-1">Cobertura logística a {ubi}.</p></td><td className="p-3 text-center">—</td><td className="p-3 text-right font-bold">B/. {trn.toFixed(2)}</td><td className="p-3 text-right font-black">B/. {trn.toFixed(2)}</td></tr>}
            </tbody></table>
        </div>
        <div className="grid grid-cols-[1.15fr_.85fr] gap-5 mt-5 relative z-10">
            <div className="space-y-4"><div className="bg-slate-50 rounded-2xl border border-slate-100 p-4"><p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#7657FF] mb-2 flex items-center gap-1.5"><Briefcase size={12}/> Datos para transferencia</p><div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px]"><p><b>Banco:</b> {appSettings.empresa.banco}</p><p><b>Tipo:</b> {appSettings.empresa.tipoCuenta}</p><p><b>Cuenta:</b> <span className="text-[#7657FF] font-black">{appSettings.empresa.numeroCuenta}</span></p><p><b>Yappy/Cel:</b> <span className="text-[#8B5CF6] font-black">{appSettings.empresa.telefono}</span></p><p className="col-span-2 truncate"><b>Titular:</b> {appSettings.empresa.nombreTitular}</p></div></div><div className="bg-blue-50/60 rounded-2xl border border-blue-100 p-4"><p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#7657FF] mb-2">Información del documento</p><p className="text-[9px] text-slate-500 leading-relaxed font-semibold">Factura correspondiente a los servicios reservados para el evento indicado. El detalle contractual completo y las condiciones del servicio se encuentran en el contrato asociado.</p></div></div>
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm h-fit"><div className="flex justify-between px-4 py-3 text-[10px] bg-slate-50"><b>Subtotal servicios</b><b>B/. {subServicios.toFixed(2)}</b></div>{trn>0&&<div className="flex justify-between px-4 py-3 text-[10px] border-t border-slate-100"><b>Transporte</b><b>B/. {trn.toFixed(2)}</b></div>}<div className="flex justify-between px-4 py-3 text-[11px] border-t border-slate-100"><b>TOTAL FACTURADO</b><b>B/. {tot.toFixed(2)}</b></div><div className="flex justify-between px-4 py-3 text-[10px] border-t border-slate-100 bg-emerald-50 text-emerald-700"><b>Abono recibido</b><b>- B/. {abo.toFixed(2)}</b></div><div className="bg-gradient-to-r from-[#7657FF] to-[#8B5CF6] text-white p-4 text-center"><p className="text-[8px] font-black tracking-[0.2em] uppercase">Saldo pendiente</p><p className="text-[27px] leading-none font-black mt-1">B/. {saldo.toFixed(2)}</p></div></div>
        </div><FooterBrand/>
    </>);

    const Quote = () => (<>
        <BrandHeader/><InfoCards compact/>
        <div className="relative z-10 border border-slate-100 rounded-2xl overflow-hidden shadow-sm"><table className="w-full text-[9px]"><thead className="bg-gradient-to-r from-[#7657FF]/7 to-[#FF3EA5]/7"><tr className="text-[7.5px] uppercase tracking-wider text-slate-500"><th className="p-2.5 text-left w-[28%]">Paquete / Servicio</th><th className="p-2.5 text-left w-[47%]">Qué incluye</th><th className="p-2.5 text-center w-[10%]">Duración</th><th className="p-2.5 text-right w-[15%]">Precio</th></tr></thead><tbody className="divide-y divide-slate-100">{sA.map((s,i)=>{const x=serviceInfo(s);return <tr key={i}><td className="p-3 align-top"><p className="font-black text-[10px] text-slate-900">{String(s.nombre)}</p>{x.cant>1&&<p className="text-[8px] text-slate-400 mt-1">Cantidad: {x.cant}</p>}</td><td className="p-3 align-top"><div className="grid grid-cols-1 gap-0.5">{(x.detalles.length?x.detalles:['Servicio personalizado según lo conversado.']).slice(0,6).map((d,j)=><p key={j} className="text-[8.2px] text-slate-600 flex gap-1"><span className="text-[#FF3EA5]">•</span><span>{d}</span></p>)}</div></td><td className="p-3 text-center align-middle font-black text-[#8B5CF6]">{x.duracion}</td><td className="p-3 text-right align-middle font-black text-[11px]">B/. {x.precio.toFixed(2)}</td></tr>})}{trn>0&&<tr><td className="p-3 font-black">Viáticos / Transporte</td><td className="p-3 text-slate-500">Traslado y cobertura logística a {ubi}.</td><td className="p-3 text-center">—</td><td className="p-3 text-right font-black">B/. {trn.toFixed(2)}</td></tr>}</tbody></table></div>
        <div className="grid grid-cols-[1.2fr_.8fr] gap-5 mt-5 relative z-10"><div className="bg-slate-50 rounded-2xl border border-slate-100 p-4"><p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#8B5CF6] mb-2">Condiciones de la propuesta</p><div className="text-[9px] text-slate-500 font-semibold leading-relaxed space-y-1"><p>• La fecha queda reservada únicamente al confirmarse el abono acordado.</p><p>• La disponibilidad se confirma al momento de aceptar esta cotización.</p><p>• Cambios de horario, ubicación o servicios pueden modificar el valor final.</p><p>• Esta cotización no constituye comprobante de pago.</p><p>• Vigencia: {vigenciaDias} {vigenciaDias===1?'día':'días'}, hasta el {fechaValidaHasta}.</p></div></div><div className="rounded-2xl overflow-hidden border border-slate-200 h-fit"><div className="px-4 py-3 flex justify-between text-[10px] bg-slate-50"><b>Servicios</b><b>B/. {subServicios.toFixed(2)}</b></div>{trn>0&&<div className="px-4 py-3 flex justify-between text-[10px] border-t border-slate-100"><b>Transporte</b><b>B/. {trn.toFixed(2)}</b></div>}<div className="bg-gradient-to-r from-[#7657FF] to-[#FF3EA5] text-white px-4 py-4 text-center"><p className="text-[8px] font-black tracking-[0.2em] uppercase">Inversión propuesta</p><p className="text-[26px] font-black leading-none mt-1">B/. {tot.toFixed(2)}</p></div></div></div>
        <div className="mt-5 bg-gradient-to-r from-[#7657FF]/5 via-[#8B5CF6]/5 to-[#FF3EA5]/5 border border-[#8B5CF6]/10 rounded-2xl p-4 text-center relative z-10"><p className="text-[11px] font-black text-slate-800">¿Deseas reservar esta experiencia?</p><p className="text-[9px] text-slate-500 font-semibold mt-1">Confírmanos por WhatsApp al {appSettings.empresa.telefono} para validar disponibilidad y abono.</p></div><FooterBrand/>
    </>);

    const Contract = () => (<>
        <BrandHeader/><InfoCards compact/>
        <div className="relative z-10 border border-slate-100 rounded-2xl overflow-hidden shadow-sm mb-4"><table className="w-full text-[8.5px]"><thead className="bg-gradient-to-r from-[#7657FF]/7 to-[#FF3EA5]/7"><tr className="text-[7px] uppercase tracking-wider text-slate-500"><th className="p-2 text-left w-[25%]">Servicio</th><th className="p-2 text-left w-[45%]">Todo lo contratado</th><th className="p-2 text-center w-[12%]">Duración</th><th className="p-2 text-right w-[18%]">Precio</th></tr></thead><tbody className="divide-y divide-slate-100">{sA.map((s,i)=>{const x=serviceInfo(s);return <tr key={i}><td className="p-2.5 align-top"><p className="font-black text-slate-900">{String(s.nombre)}</p>{x.cant>1&&<p className="text-[7px] text-slate-400 mt-1">Cant. {x.cant}</p>}</td><td className="p-2.5 align-top">{(x.detalles.length?x.detalles:['Servicio personalizado según lo acordado.']).map((d,j)=><p key={j} className="text-[7.6px] leading-[1.35] text-slate-600">• {d}</p>)}</td><td className="p-2.5 text-center align-middle font-black text-[#8B5CF6]">{x.duracion}</td><td className="p-2.5 text-right align-middle font-black">B/. {x.precio.toFixed(2)}</td></tr>})}{trn>0&&<tr><td className="p-2.5 font-black">Viáticos / Transporte</td><td className="p-2.5 text-slate-500">Traslado y cobertura logística a {ubi}.</td><td className="p-2.5 text-center">—</td><td className="p-2.5 text-right font-black">B/. {trn.toFixed(2)}</td></tr>}</tbody></table></div>
        <div className="grid grid-cols-[1.42fr_.58fr] gap-4 relative z-10">
            <div className="border border-slate-100 rounded-2xl p-4"><p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#7657FF] mb-2.5 flex items-center gap-1.5"><FileSignature size={12}/> Cláusulas y condiciones del servicio</p><div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[7.4px] leading-[1.34] text-slate-600 text-justify">
                <p><b className="text-slate-800">1. Objeto.</b> Diverty prestará los servicios descritos en este documento, en la fecha, horario y ubicación acordados.</p>
                <p><b className="text-slate-800">2. Reserva y pago.</b> La fecha se confirma mediante el abono acordado. El saldo pendiente deberá cancelarse conforme a las condiciones pactadas para el evento.</p>
                <p><b className="text-slate-800">3. Cancelación.</b> El abono no es reembolsable cuando la cancelación sea ajena a Diverty. Cualquier reprogramación estará sujeta a disponibilidad.</p>
                <p><b className="text-slate-800">4. Cambios.</b> Modificaciones de fecha, horario, dirección, cantidad o servicios pueden generar ajustes de precio, logística o disponibilidad.</p>
                <p><b className="text-slate-800">5. Obligaciones del cliente.</b> Garantizar acceso seguro, espacio adecuado, permisos del lugar y condiciones necesarias para montaje y operación.</p>
                <p><b className="text-slate-800">6. Obligaciones de Diverty.</b> Prestar los servicios contratados con personal y equipos adecuados y comunicar oportunamente cualquier situación operativa relevante.</p>
                <p><b className="text-slate-800">7. Horarios y retrasos.</b> El tiempo contratado corresponde al horario acordado. Retrasos imputables al cliente no obligan a extender el servicio.</p>
                <p><b className="text-slate-800">8. Seguridad y equipos.</b> El cliente y sus invitados deberán respetar las instrucciones del personal. Diverty podrá suspender una actividad ante condiciones inseguras.</p>
                <p><b className="text-slate-800">9. Daños.</b> Daños causados por uso indebido, negligencia de invitados o terceros podrán ser responsabilidad del cliente cuando corresponda.</p>
                <p><b className="text-slate-800">10. Clima y fuerza mayor.</b> Situaciones fuera del control razonable de las partes podrán requerir ajustes, suspensión o reprogramación según disponibilidad.</p>
                <p><b className="text-slate-800">11. Proveedores.</b> Diverty podrá apoyarse en personal o proveedores para ejecutar componentes del servicio, manteniendo la coordinación del evento.</p>
                <p><b className="text-slate-800">12. Aceptación.</b> La firma o aceptación del presente documento confirma que el cliente conoce el alcance, precio y condiciones aquí indicadas.</p>
            </div></div>
            <div className="space-y-3"><div className="rounded-2xl overflow-hidden border border-slate-200"><div className="p-3 bg-slate-50 flex justify-between text-[8.5px]"><b>Total contratado</b><b>B/. {tot.toFixed(2)}</b></div><div className="p-3 border-t border-slate-100 flex justify-between text-[8.5px] text-emerald-600"><b>Abono</b><b>B/. {abo.toFixed(2)}</b></div><div className="p-3 bg-gradient-to-r from-[#7657FF] to-[#8B5CF6] text-white text-center"><p className="text-[7px] font-black uppercase tracking-widest">Saldo</p><p className="text-[18px] font-black">B/. {saldo.toFixed(2)}</p></div></div><div className="bg-slate-50 border border-slate-100 rounded-2xl p-3"><p className="text-[7px] font-black uppercase tracking-wider text-[#FF3EA5] mb-2">Aceptación y firmas</p><div className="pt-5 border-b border-slate-300 mb-1"></div><p className="text-[7px] text-center font-black text-slate-700 truncate">{cli}</p><p className="text-[6.5px] text-center text-slate-400">Firma del cliente</p><div className="pt-5 border-b border-slate-300 mb-1 mt-2"></div><p className="text-[7px] text-center font-black text-slate-700 truncate">{appSettings.empresa.nombreTitular}</p><p className="text-[6.5px] text-center text-slate-400">Diverty Eventos</p></div></div>
        </div><FooterBrand/>
    </>);

    const ProviderContract = () => (<>
        <BrandHeader/>
        <div className="relative z-10 grid grid-cols-[1.15fr_.85fr] gap-4 mb-4">
            <div className="rounded-2xl border border-[#7657FF]/12 bg-gradient-to-br from-[#F7F4FF] via-white to-[#FFF7FB] p-4">
                <p className="text-[8px] font-black uppercase tracking-[.18em] text-[#7657FF]">Proveedor / contratista independiente</p>
                <p className="text-[18px] leading-tight font-black text-slate-900 mt-2">{cli || 'Proveedor'}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-[8.5px]">
                    <p><span className="text-slate-400 font-bold">WhatsApp:</span> <b className="text-slate-700">{tel || '—'}</b></p>
                    <p><span className="text-slate-400 font-bold">ID / RUC:</span> <b className="text-slate-700">{providerId || '—'}</b></p>
                    {providerEmail && <p className="col-span-2 truncate"><span className="text-slate-400 font-bold">Correo:</span> <b className="text-slate-700">{providerEmail}</b></p>}
                    {providerAddress && <p className="col-span-2"><span className="text-slate-400 font-bold">Dirección:</span> <b className="text-slate-700">{providerAddress}</b></p>}
                </div>
            </div>
            <div className="rounded-2xl bg-slate-950 text-white p-4">
                {isProviderEventContract ? <>
                    <p className="text-[8px] font-black uppercase tracking-[.18em] text-white/55">Asignación específica</p>
                    <p className="text-[12px] font-black mt-2">{providerEvent?.cliente || 'Evento asignado'}</p>
                    <div className="mt-2 space-y-1 text-[8.2px] text-white/72">
                        <p><b className="text-white">Fecha:</b> {providerEvent?.fecha ? String(providerEvent.fecha).split('-').reverse().join('/') : '—'}</p>
                        <p><b className="text-white">Hora:</b> {utils.formatTime12h(providerEvent?.hora || '')}</p>
                        <p><b className="text-white">Ubicación:</b> {providerEvent?.ubicacion || 'Por definir'}</p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-end justify-between gap-3"><div><p className="text-[7px] uppercase tracking-widest text-white/45 font-black">Emisión</p><p className="text-[10px] font-black">{fechaEmision}</p></div><div className="text-right"><p className="text-[7px] uppercase tracking-widest text-white/45 font-black">Total proveedor</p><p className="text-[16px] font-black">B/. {providerTotal.toFixed(2)}</p></div></div>
                </> : <>
                    <p className="text-[8px] font-black uppercase tracking-[.18em] text-white/55">Naturaleza del acuerdo</p>
                    <p className="text-[12px] font-black mt-2">Contrato marco de servicios</p>
                    <p className="text-[8.5px] leading-relaxed text-white/70 mt-2">Acuerdo general para futuras asignaciones independientes. Las tarifas listadas corresponden al perfil del proveedor y no representan una reserva concreta.</p>
                    <div className="mt-3 pt-3 border-t border-white/10"><p className="text-[7px] uppercase tracking-widest text-white/45 font-black">Emisión</p><p className="text-[10px] font-black">{fechaEmision}</p></div>
                </>}
            </div>
        </div>

        <div className="relative z-10 rounded-2xl border border-slate-100 overflow-hidden mb-4">
            <div className="px-4 py-2.5 bg-slate-50 flex items-center justify-between gap-3">
                <p className="text-[8px] font-black uppercase tracking-[.18em] text-[#7657FF]">{isProviderEventContract ? 'Servicios seleccionados para este evento' : 'Servicios y tarifas del proveedor'}</p>
                <p className="text-[7.5px] font-bold text-slate-400 text-right">{isProviderEventContract ? 'Solo se muestran los servicios asignados en la reserva.' : 'Catálogo general del proveedor.'}</p>
            </div>
            <table className="w-full text-[8.5px]"><thead className="bg-white"><tr className="text-[7px] uppercase tracking-wider text-slate-400"><th className="p-2.5 text-left">Servicio</th><th className="p-2.5 text-right w-[28%]">{isProviderEventContract ? 'Monto acordado' : 'Tarifa base'}</th></tr></thead><tbody className="divide-y divide-slate-100">
                {providerServices.length > 0 ? providerServices.map((srv,i)=><tr key={srv.id||i}><td className="p-2.5 font-bold text-slate-700">{srv.nombre || 'Servicio'}{Number(srv.cantidad)>1 ? ` ×${Number(srv.cantidad)}` : ''}</td><td className="p-2.5 text-right font-black text-slate-900">{utils.safeNum(srv.costo)>0?`B/. ${utils.safeNum(srv.costo).toFixed(2)}`:'Por acordar'}</td></tr>) : <tr><td colSpan="2" className="p-4 text-center text-[8px] font-bold text-rose-500">No hay servicios de este proveedor asignados a esta reserva.</td></tr>}
            </tbody>{isProviderEventContract && <tfoot><tr className="bg-[#7657FF]/5 border-t border-[#7657FF]/10"><td className="p-3 text-right text-[8px] uppercase tracking-[.14em] font-black text-[#7657FF]">Total a pagar</td><td className="p-3 text-right text-[13px] font-black text-slate-950">B/. {providerTotal.toFixed(2)}</td></tr></tfoot>}</table>
        </div>

        <div className="relative z-10 grid grid-cols-[1.35fr_.65fr] gap-4">
            <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-[8px] font-black uppercase tracking-[.18em] text-[#7657FF] mb-3 flex items-center gap-1.5"><FileSignature size={11}/> Condiciones del subcontrato</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[7.25px] leading-[1.34] text-slate-600 text-justify">
                    <p><b className="text-slate-800">1. Objeto.</b> El proveedor prestará de forma independiente los servicios que Diverty le asigne y que este acepte para eventos específicos.</p>
                    <p><b className="text-slate-800">2. Independencia.</b> Este acuerdo no crea relación laboral, subordinación, exclusividad, sociedad ni representación permanente entre las partes.</p>
                    <p><b className="text-slate-800">3. Asignaciones.</b> Fecha, horario, lugar, servicio, tarifa y condiciones particulares se comunicarán para cada evento y se entenderán aceptadas al confirmarlas.</p>
                    <p><b className="text-slate-800">4. Puntualidad.</b> El proveedor deberá presentarse con la anticipación acordada y cumplir íntegramente el horario, vestuario, materiales y funciones asignadas.</p>
                    <p><b className="text-slate-800">5. Calidad y conducta.</b> Mantendrá trato respetuoso, presentación adecuada y estándares compatibles con eventos infantiles y familiares.</p>
                    <p><b className="text-slate-800">6. Honorarios.</b> Diverty pagará la tarifa acordada para cada asignación, una vez verificada la prestación satisfactoria, salvo acuerdo escrito diferente.</p>
                    <p><b className="text-slate-800">7. Cancelaciones.</b> Reprogramaciones, ausencias o cancelaciones deberán comunicarse con la mayor anticipación posible. Los pagos dependerán del servicio efectivamente prestado y de lo acordado para el evento.</p>
                    <p><b className="text-slate-800">8. Confidencialidad.</b> El proveedor protegerá datos de clientes, precios internos, contactos, logística, fotografías no autorizadas y cualquier información comercial de Diverty.</p>
                    <p><b className="text-slate-800">9. Relación con clientes.</b> No utilizará una asignación de Diverty para captar directamente al cliente, negociar servicios paralelos o desviar futuras contrataciones sin autorización.</p>
                    <p><b className="text-slate-800">10. Seguridad y responsabilidad.</b> Cumplirá instrucciones razonables de seguridad y responderá por sus propios equipos, materiales, permisos y actuaciones durante la prestación.</p>
                    <p><b className="text-slate-800">11. Uso de imagen y marca.</b> No podrá usar el nombre, logotipo o material de Diverty para publicidad propia sin autorización previa.</p>
                    <p><b className="text-slate-800">12. Aceptación.</b> La firma confirma que las partes comprenden el carácter independiente del acuerdo y aceptan sus condiciones generales.</p>
                </div>
            </div>
            <div className="space-y-3">
                <div className="rounded-2xl bg-amber-50/70 border border-amber-100 p-3">
                    <p className="text-[7px] font-black uppercase tracking-wider text-amber-600">Condición de pago</p>
                    <p className="text-[8px] font-semibold text-slate-600 mt-1.5 leading-relaxed">{providerPaymentTerms}</p>
                    {isProviderEventContract && <div className="mt-2 pt-2 border-t border-amber-200/60 flex justify-between items-center gap-2"><span className="text-[7px] font-black uppercase tracking-wider text-amber-700">Total acordado</span><span className="text-[12px] font-black text-slate-900">B/. {providerTotal.toFixed(2)}</span></div>}
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                    <p className="text-[7px] font-black uppercase tracking-wider text-[#7657FF]">Coordinación</p>
                    <p className="text-[8px] font-semibold text-slate-600 mt-1.5 leading-relaxed">Cada evento podrá incluir instrucciones adicionales de horario, contacto, ubicación, uniforme, materiales o protocolo operativo.</p>
                </div>
                <div className="rounded-2xl border border-slate-100 p-3">
                    <p className="text-[7px] font-black uppercase tracking-wider text-slate-400">Firma Diverty</p>
                    <div className="h-9 border-b border-slate-300"></div>
                    <p className="text-[7.5px] text-center font-black text-slate-700 mt-1">{appSettings.empresa.nombreTitular}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 p-3">
                    <p className="text-[7px] font-black uppercase tracking-wider text-slate-400">Firma proveedor</p>
                    <div className="h-9 border-b border-slate-300"></div>
                    <p className="text-[7.5px] text-center font-black text-slate-700 mt-1">{cli || 'Proveedor'}</p>
                </div>
            </div>
        </div>
        <div className="relative z-10 mt-3 rounded-xl bg-[#7657FF]/5 border border-[#7657FF]/10 px-4 py-2 text-[7.4px] text-slate-500 font-semibold">{isProviderEventContract ? 'Este subcontrato corresponde exclusivamente a los servicios seleccionados para el evento indicado. Cualquier servicio adicional deberá acordarse y registrarse por separado.' : 'Documento marco de coordinación de servicios. Las condiciones particulares de cada evento prevalecen cuando hayan sido aceptadas expresamente por ambas partes.'}</div>
        <FooterBrand/>
    </>);

    return (<div className="bg-[#172235] min-h-screen text-slate-900 flex flex-col font-sans overflow-x-hidden animate-fadeIn relative z-[99999]">
        <style>{`@media print{body *{visibility:hidden;}#pdf-wrapper-scaler,#pdf-wrapper-scaler *{visibility:visible;}#pdf-wrapper-scaler{position:absolute;left:0;top:0;width:100%;transform:scale(1)!important;margin:0;}.print\\:hidden{display:none!important;}@page{size:A4;margin:0;}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}}`}</style>
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md shadow-lg flex flex-col sm:flex-row justify-between items-center z-50 print:hidden border-b border-slate-800 p-4 gap-4"><button type="button" onClick={onClose} className="text-white flex items-center font-bold hover:text-indigo-400 self-start sm:self-auto"><X size={20} className="mr-1"/> Atrás</button><div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto"><button type="button" onClick={onPrint} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center shadow-lg text-sm"><Printer size={16} className="mr-2"/> Imprimir PDF</button><button type="button" onClick={onShare} className="bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold flex items-center shadow-lg text-sm"><Share2 size={16} className="mr-2"/> Compartir</button><button type="button" onClick={onDownload} className="bg-violet-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center shadow-lg text-sm"><Download size={16} className="mr-2"/> Guardar</button></div></div>
        <div className="w-full flex-1 flex justify-center pb-12 pt-8 overflow-hidden"><div style={{width:`${794*pdfScale}px`,height:`${1123*pdfScale}px`,position:'relative'}}><div id="pdf-wrapper-scaler" style={{transform:`scale(${pdfScale})`,transformOrigin:'top left',width:'794px',position:'absolute',top:0,left:0}}><div id="pdf-content" className="bg-white w-[794px] h-[1123px] relative overflow-hidden font-sans text-slate-800 px-10 pt-9 pb-7 flex flex-col">{isContratoProv?<ProviderContract/>:isContrato?<Contract/>:isC?<Quote/>:<Invoice/>}</div></div></div></div>
    </div>);
});

const ClientEditModal = memo(function ClientEditModal({ isOpen, oldName, clientKey, onClose, onSave }) {
    const [newName, setNewName] = useState(''); useEffect(() => { if(isOpen) setNewName(oldName); }, [isOpen, oldName]); if (!isOpen) return null;
    return (<div className="fixed inset-0 z-[100000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"><div className={`${UI.modal} max-w-sm w-full p-8`}><div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4"><Edit size={24} className="text-[#7657FF]" /><h3 className="text-xl font-black text-slate-900">Editar Cliente</h3></div><p className="text-xs text-slate-500 mb-5 leading-relaxed font-medium">El cambio se aplicará únicamente a las reservas asociadas a este cliente, identificado principalmente por su teléfono.</p><div className="space-y-4 mb-8"><div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nombre Actual</label><input type="text" value={oldName} disabled className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-500 font-semibold text-sm cursor-not-allowed" /></div><div><label className="block text-[10px] font-bold text-[#7657FF] uppercase tracking-widest mb-1.5">Nuevo Nombre</label><input type="text" value={newName} onChange={e => setNewName(e.target.value)} autoFocus className="w-full bg-white border border-[#7657FF]/50 rounded-xl p-3 text-slate-900 font-bold text-base outline-none focus:ring-4 ring-[#7657FF]/10 shadow-sm" /></div></div><div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors">Cancelar</button><button type="button" onClick={() => onSave(oldName, newName, clientKey)} className="flex-1 py-3 bg-gradient-to-r from-[#7657FF] to-[#8B5CF6] text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-md transition-transform active:scale-95">Guardar</button></div></div></div>);
});

const ProveedorModal = memo(function ProveedorModal({ isOpen, data, onClose, onSave }) {
    const empty = { nombre: '', telefono: '', email: '', identificacion: '', direccion: '', especialidad: '', costoBase: '', condicionesPago: 'Pago contra prestación satisfactoria del servicio.', activo: true, servicios: [] };
    const [form, setForm] = useState(empty);
    const [srv, setSrv] = useState({ nombre: '', costo: '' });
    useEffect(() => { if (isOpen) { const base = data || empty; const legacy = (!base.servicios?.length && base.especialidad) ? [{ id:`srv-legacy`, nombre:base.especialidad, costo:utils.safeNum(base.costoBase), activo:true }] : (base.servicios || []); setForm({...empty, ...base, servicios:legacy}); setSrv({nombre:'',costo:''}); } }, [isOpen, data]);
    if (!isOpen) return null;
    const addSrv = () => { const nombre=srv.nombre.trim(), costo=utils.safeNum(srv.costo); if(!nombre) return; setForm(prev=>({...prev, servicios:[...(prev.servicios||[]),{id:`srv-${Date.now()}`,nombre,costo,activo:true}], especialidad:prev.especialidad||nombre, costoBase:prev.costoBase||String(costo)})); setSrv({nombre:'',costo:''}); };
    const removeSrv = id => setForm(prev=>({...prev,servicios:(prev.servicios||[]).filter(x=>x.id!==id)}));
    const handleSubmit = (e) => { e.preventDefault(); const servicios=form.servicios||[]; onSave({...form, especialidad:servicios.map(x=>x.nombre).join(', ') || form.especialidad, costoBase:servicios.length===1?String(servicios[0].costo):form.costoBase}); };
    return (<div className="fixed inset-0 z-[100000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"><div className={`${UI.modal} max-w-lg w-full p-8 max-h-[92vh] overflow-y-auto`}><div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4"><div className="flex items-center gap-3">{data ? <Edit size={24} className="text-[#7657FF]" /> : <Plus size={24} className="text-[#7657FF]" />}<h3 className="text-xl font-black text-slate-900">{data ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3></div><button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 bg-slate-100 rounded-lg"><X size={18}/></button></div><form onSubmit={handleSubmit} className="space-y-4"><Field label="Nombre Comercial / Proveedor *" required value={form.nombre} onChange={e=>setForm(prev=>({...prev,nombre:e.target.value}))}/><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="Número de WhatsApp *" required value={form.telefono} onChange={e=>setForm(prev=>({...prev,telefono:e.target.value}))}/><Field label="Correo" type="email" value={form.email||''} onChange={e=>setForm(prev=>({...prev,email:e.target.value}))}/></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="Cédula / RUC / Identificación" value={form.identificacion||''} onChange={e=>setForm(prev=>({...prev,identificacion:e.target.value}))}/><Field label="Dirección / zona" value={form.direccion||''} onChange={e=>setForm(prev=>({...prev,direccion:e.target.value}))}/></div><div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><div className="flex items-center justify-between mb-3"><div><p className="text-sm font-black text-slate-900">Servicios y tarifas</p><p className="text-[10px] font-semibold text-slate-400 mt-1">Agrega todos los servicios que este proveedor puede realizar.</p></div><Badge color="blue">{(form.servicios||[]).length}</Badge></div><div className="grid grid-cols-[1fr_110px_auto] gap-2 items-end"><Field label="Servicio" value={srv.nombre} onChange={e=>setSrv(x=>({...x,nombre:e.target.value}))} placeholder="Ej. Pintacaritas"/><Field label="Costo ($)" type="number" value={srv.costo} onChange={e=>setSrv(x=>({...x,costo:e.target.value}))} placeholder="0.00"/><button type="button" onClick={addSrv} className="h-[54px] w-[54px] rounded-xl bg-[#7657FF] text-white flex items-center justify-center"><Plus size={20}/></button></div><div className="space-y-2 mt-4">{(form.servicios||[]).map(x=><div key={x.id} className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-3"><div><p className="font-bold text-slate-800">{x.nombre}</p><p className="text-xs font-black text-emerald-600 mt-0.5">${utils.safeNum(x.costo).toFixed(2)}</p></div><button type="button" onClick={()=>removeSrv(x.id)} className="p-2 text-rose-500 bg-rose-50 rounded-lg"><Trash2 size={16}/></button></div>)}</div></div><Field as="textarea" label="Condiciones de pago / acuerdo" value={form.condicionesPago||''} onChange={e=>setForm(prev=>({...prev,condicionesPago:e.target.value}))} placeholder="Ej. Pago al finalizar el evento, contra prestación satisfactoria."/><label className="flex items-center justify-between rounded-xl border border-slate-200 p-4 bg-white"><span className="font-bold text-sm text-slate-700">Proveedor activo</span><input type="checkbox" checked={form.activo!==false} onChange={e=>setForm(prev=>({...prev,activo:e.target.checked}))}/></label><div className="pt-4"><AppButton type="submit" className="w-full text-xs uppercase tracking-widest">{data ? 'Guardar Cambios' : 'Registrar Proveedor'}</AppButton></div></form></div></div>);
});

const ProveedorCardItem = memo(function ProveedorCardItem({ p, idx, isExpanded, onToggleExpand, utils, onDelete, onEdit, onWhatsApp, onContrato, onContratoEvento, eventosActivos }) {
    const misEventos = useMemo(() => {
        return eventosActivos
          .filter(ev => ev.subcontratos && ev.subcontratos.some(sc => sc.proveedorId === p.id))
          .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
    }, [eventosActivos, p.id]);
    const pendientes = misEventos.filter(ev => !isArchivedReservation(ev) && utils.normalizeText(ev.estado) !== 'completado');
    const realizados = misEventos.filter(ev => utils.normalizeText(ev.estado) === 'completado');
    const phoneClean = String(p.telefono).replace(/\D/g, '');

    const EventAssignment = ({ ev, completed = false }) => {
        const assignments = (Array.isArray(ev.subcontratos) ? ev.subcontratos : []).filter(sc => sc.proveedorId === p.id);
        const totalAsignado = assignments.reduce((sum, sc) => sum + utils.safeNum(sc.costo), 0);
        const allPaid = assignments.length > 0 && assignments.every(sc => sc.pagado === true || utils.normalizeText(sc.estadoPago) === 'pagado');
        const nombres = assignments.map(sc => sc.servicio || 'Servicio').filter(Boolean);
        return <div className={`${completed ? 'bg-slate-100/50 border-slate-200/50' : 'bg-white border-slate-200/60'} p-3.5 rounded-xl border shadow-sm flex flex-col gap-2 transition-all hover:border-blue-200`}>
            <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                    <span className={`${completed ? 'font-bold text-slate-700 text-[12px]' : 'font-extrabold text-slate-900 text-[13px]'} capitalize truncate block`}>{ev.cliente}</span>
                    <p className="text-[10px] font-bold text-[#7657FF] mt-1 leading-snug">{nombres.join(' + ') || 'Servicio asignado'}</p>
                </div>
                {totalAsignado > 0 && <span className={`font-bold text-[10px] px-2 py-1 rounded-md border shrink-0 ${allPaid?'text-emerald-600 bg-emerald-50 border-emerald-100':'text-rose-500 bg-rose-50 border-rose-100'}`}>${totalAsignado.toFixed(2)} · {allPaid?'Pagado':'Pendiente'}</span>}
            </div>
            <div className="flex gap-3 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider flex-wrap">
                <span className="flex items-center gap-1"><Calendar size={11} className="text-[#7657FF]"/> {ev.fecha ? ev.fecha.split('-').reverse().join('/') : ''}</span>
                <span className="flex items-center gap-1"><Clock size={11} className="text-[#7657FF]"/> {utils.formatTime12h(ev.hora)}</span>
            </div>
            <div className="text-[10px] font-semibold text-slate-400 truncate flex items-center gap-1"><MapPin size={10}/> {ev.ubicacion}</div>
            <button type="button" onClick={(e)=>{e.stopPropagation();onContratoEvento?.(p,ev);}} className="mt-1 w-full min-h-[40px] rounded-[12px] bg-[#7657FF]/10 border border-[#7657FF]/15 text-[#7657FF] font-black text-[9px] uppercase tracking-[.12em] flex items-center justify-center gap-2 active:scale-[.98]"><FileSignature size={14}/> Contrato de este evento</button>
        </div>;
    };

    return (<div className={`${UI.card} flex flex-col relative overflow-hidden transition-all duration-500 hover:-translate-y-2 animate-fadeInUp`} style={{animationFillMode:'both',animationDelay:`${idx*20}ms`}}>
        <div onClick={(e) => { if(e){e.preventDefault();e.stopPropagation();} utils.triggerHaptic('light'); onToggleExpand(p.id); }} className="p-6 cursor-pointer flex flex-col gap-4 relative z-10 bg-transparent transition-colors duration-200">
            <div className="flex justify-between items-start">
                <div className="flex gap-3"><div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-[#7657FF] shadow-sm shrink-0"><Briefcase size={20}/></div><div className="flex-1 min-w-0"><h4 className="font-extrabold text-lg text-slate-900 tracking-tight capitalize leading-tight truncate">{p.nombre}</h4><span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 truncate block mt-0.5">{p.servicios?.length ? `${p.servicios.length} servicios disponibles` : p.especialidad}</span></div></div>
                <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(p.id); }} className="text-slate-300 hover:text-rose-500 transition-colors p-1"><Trash2 size={18}/></button>
            </div>
            <div className="flex justify-between items-center bg-slate-50/80 rounded-xl p-4 border border-slate-100"><div className="flex items-center gap-3"><Smartphone size={16} className="text-emerald-500"/><span className="font-bold text-slate-700 text-sm">{p.telefono || 'Sin teléfono'}</span></div>{p.costoBase && <span className="text-xs font-black text-slate-900 bg-emerald-100/50 px-2.5 py-1 rounded-lg border border-emerald-200/50">${p.costoBase}</span>}</div>
            <div className="flex gap-2.5 mt-2"><ActionBtn icon={MessageCircle} label="WhatsApp" color="emerald" onClick={(e) => { e.stopPropagation(); onWhatsApp(phoneClean, `¡Hola ${p.nombre}!`); }} /><ActionBtn icon={Handshake} label="Contrato" color="blue" onClick={(e) => { e.stopPropagation(); const eventosProveedor=[...pendientes,...realizados]; if(eventosProveedor.length===1){ onContratoEvento?.(p,eventosProveedor[0]); } else if(eventosProveedor.length>1){ onToggleExpand(p.id); } else { onContrato(p); } }} /><ActionBtn icon={PenLine} label="Editar" color="white" onClick={(e) => { e.stopPropagation(); onEdit(p); }} /></div>
            <p className="text-[9px] font-semibold text-slate-400 -mt-1">Si hay una sola reserva asignada, “Contrato” abre directamente ese evento. Si hay varias, despliega la lista para que elijas la reserva correcta.</p>
        </div>
        {isExpanded && (<div className="relative z-10 px-5 pb-5 animate-fadeIn border-t border-slate-100/50 mt-1 pt-5 bg-slate-50/50 rounded-b-[24px]">
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7657FF] mb-4 flex items-center gap-2"><CalendarDays size={14}/> Eventos Asignados</h5>
            <div className="space-y-5">
                <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pendientes ({pendientes.length})</p>{pendientes.length === 0 ? (<p className="text-[11px] text-slate-400 italic">No hay eventos pendientes.</p>) : (<div className="space-y-2">{pendientes.map(ev => <EventAssignment key={ev.id} ev={ev}/>)}</div>)}</div>
                <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Realizados ({realizados.length})</p>{realizados.length === 0 ? (<p className="text-[11px] text-slate-400 italic">No hay eventos completados.</p>) : (<div className="space-y-2 opacity-80">{realizados.map(ev => <EventAssignment key={ev.id} ev={ev} completed/>)}</div>)}</div>
                <button type="button" onClick={(e)=>{e.stopPropagation();onContrato(p);}} className="w-full min-h-[42px] rounded-[14px] bg-white border border-slate-200 text-slate-500 font-black text-[9px] uppercase tracking-[.12em] flex items-center justify-center gap-2 active:scale-[.98]"><Handshake size={14}/> Acuerdo marco general</button>
                <p className="text-[9px] font-semibold text-slate-400 text-center">El acuerdo marco es general y sí contiene el catálogo del proveedor. Para pagar una reserva usa el botón “Contrato de este evento”.</p>
            </div>
        </div>)}
    </div>);
});

const ClientCardItem = memo(function ClientCardItem({ c, idx, isExpanded, onToggleExpand, utils, openModal, onDeleteClient, onEditClient, historial = [] }) {
    const [showHistory, setShowHistory] = useState(false);
    const [showPending, setShowPending] = useState(false);
    const pendingHistory = useMemo(() => historial.filter(ev => {
      const est = utils.normalizeText(ev.estado);
      if (est === 'completado' || est === 'cobrado' || est === 'pagado' || est === 'cancelado' || est.includes('cotizaci') || est.includes('cot.')) return false;
      return Math.max(utils.safeNum(ev.total) - utils.safeNum(ev.abono), 0) > 0;
    }), [historial, utils]);
    const phoneClean=String(c.telefono).replace(/\D/g,'');
    const msgPromo=`¡Hola ${c.nombre}! 😊 Te saludamos de Diverty Eventos. Tenemos nuevas promociones exclusivas en nuestros paquetes infantiles. ¿Te gustaría conocerlas? 🎉`, msgRecordatorio=`¡Hola ${c.nombre}! 🥳 Te recordamos que en Diverty Eventos estamos listos para hacer de tu próxima celebración un día inolvidable. ¡Escríbenos cuando lo necesites! 🎈`;
    const grad=c.isVIP?'from-amber-400 via-orange-500 to-rose-500':'from-[#7657FF] to-[#8B5CF6]';

    return(<div className={`${UI.card} flex flex-col relative overflow-hidden transition-all duration-500 hover:-translate-y-2 animate-fadeInUp`} style={{animationFillMode:'both',animationDelay:`${idx*20}ms`}}>
      <div onClick={(e)=>{if(e){e.preventDefault();e.stopPropagation();}utils.triggerHaptic('light');onToggleExpand(c.clientKey);}} className="p-5 sm:p-6 cursor-pointer flex items-center justify-between gap-4 relative z-10 bg-transparent transition-colors duration-200">
        <div className="flex items-center gap-4 flex-1 min-w-0"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl text-white shrink-0 shadow-md bg-gradient-to-tr ${grad}`}>{c.isVIP ? <Award size={20} className="drop-shadow-md" /> : String(c.nombre).charAt(0).toUpperCase()}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 min-w-0"><h4 className="font-bold text-[17px] text-slate-900 capitalize truncate tracking-tight">{String(c.nombre)}</h4>{c.isVIP&&<span className="shrink-0 text-[8px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">VIP</span>}</div><p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mt-1"><Smartphone size={14} className="text-slate-400"/> {String(c.telefono)||'Sin número'}</p>{c.email&&<p className="text-[10px] font-semibold text-slate-400 truncate mt-1">{c.email}</p>}{(!c.telefono||!c.email)&&<p className="text-[9px] font-black uppercase tracking-wider text-rose-500 mt-1">Faltan datos de contacto</p>}</div></div>
        <div className="text-right shrink-0"><p className="text-xl font-bold text-emerald-500 leading-none tracking-tight">${c.totalCobrado.toFixed(0)}</p><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Cobrado</p><div className="flex justify-end gap-1.5 mt-2.5">{c.isVIP && <span className="w-2 h-2 rounded-full bg-amber-400" title="VIP"></span>}{c.isFrecuente && <span className="w-2 h-2 rounded-full bg-indigo-400" title="Frecuente"></span>}{c.isNuevo && <span className="w-2 h-2 rounded-full bg-emerald-400" title="Nuevo"></span>}{c.needsContact && <span className="w-2 h-2 rounded-full bg-rose-400" title="Contactar"></span>}</div></div>
      </div>
      {isExpanded && (<div className="relative z-10 px-5 pb-5 animate-fadeIn border-t border-slate-100/50 mt-1 pt-4 bg-slate-50/50 rounded-b-[24px]">
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button type="button" onClick={(e)=>{e.stopPropagation();utils.triggerHaptic('light');setShowHistory(v=>!v);}} className="text-left bg-white/90 rounded-[16px] p-4 border border-slate-200/60 shadow-sm hover:bg-blue-50/60 transition-colors">
            <p className="text-[9px] uppercase tracking-widest font-black text-[#7657FF] mb-1 flex items-center gap-1">Eventos <ChevronDown size={12} className={`transition-transform ${showHistory?'rotate-180':''}`}/></p><p className="font-black text-xl text-slate-900">{c.eventos}</p><p className="text-[9px] font-bold text-slate-400 mt-1">{c.eventosCompletados} completados</p>
          </button>
          <div className="bg-white/90 rounded-[16px] p-4 border border-slate-200/60 shadow-sm"><p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1">Facturado</p><p className="font-black text-xl text-slate-900">${c.totalFacturado.toFixed(0)}</p><p className="text-[9px] font-bold text-emerald-500 mt-1">Cobrado ${c.totalCobrado.toFixed(0)}</p></div>
          <button type="button" onClick={(e)=>{e.stopPropagation();utils.triggerHaptic('light');setShowPending(v=>!v);}} className="text-left bg-white/90 rounded-[16px] p-4 border border-slate-200/60 shadow-sm hover:bg-rose-50/40 transition-colors"><p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1 flex items-center gap-1">Pendiente <ChevronDown size={12} className={`transition-transform ${showPending?'rotate-180':''}`}/></p><p className={`font-black text-xl ${c.saldoPendiente>0?'text-rose-500':'text-emerald-500'}`}>${c.saldoPendiente.toFixed(0)}</p><p className="text-[9px] font-bold text-slate-400 mt-1">{c.saldoPendiente>0?'Toca para ver saldos':'Todo cobrado'}</p></button>
          <div className="bg-white/90 rounded-[16px] p-4 border border-slate-200/60 shadow-sm"><p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1">Próxima reserva</p><p className="font-black text-sm text-slate-900">{c.proximaReserva?.fecha?String(c.proximaReserva.fecha).split('-').reverse().join('/'):'Sin reserva'}</p><p className="text-[9px] font-bold text-slate-400 mt-1 truncate">{c.proximaReserva?.servicio || '—'}</p></div>
        </div>

        {showPending && (<div className="mb-5 animate-fadeIn bg-white rounded-[18px] border border-rose-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-rose-50 flex items-center justify-between"><div><p className="text-[11px] font-black uppercase tracking-[0.16em] text-rose-500">Saldos pendientes</p><p className="text-[10px] font-semibold text-slate-400 mt-0.5">Solo reservas realmente pendientes de cobro</p></div><DollarSign size={18} className="text-rose-500"/></div>
          <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
            {pendingHistory.length === 0 ? <div className="p-5 text-center"><CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2"/><p className="text-xs font-black text-emerald-600">Todo está cobrado</p><p className="text-[10px] font-semibold text-slate-400 mt-1">No hay reservas con saldo pendiente.</p></div> : pendingHistory.map(ev => {
              const total=utils.safeNum(ev.total); const abono=utils.safeNum(ev.abono); const saldo=Math.max(total-abono,0);
              return <button type="button" key={`pending-${ev.id}`} onClick={(e)=>{e.stopPropagation();utils.triggerHaptic('light');openModal(ev,false);}} className="w-full text-left p-4 hover:bg-rose-50/40 transition-colors"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-black text-slate-900 text-sm">{ev.fecha?String(ev.fecha).split('-').reverse().join('/'):'Sin fecha'}</p><p className="text-[11px] font-semibold text-slate-500 truncate mt-1">{String(ev.servicio||ev.tipoEvento||'Evento')}</p><p className="text-[9px] font-bold text-slate-400 mt-1">Total ${total.toFixed(0)} · Cobrado ${abono.toFixed(0)}</p></div><div className="text-right shrink-0"><p className="text-[9px] font-black uppercase tracking-wider text-rose-400">Falta</p><p className="font-black text-rose-500 text-base">${saldo.toFixed(0)}</p></div></div></button>;
            })}
          </div>
        </div>)}

        {showHistory && (<div className="mb-5 animate-fadeIn bg-white rounded-[18px] border border-slate-200/70 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between"><div><p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7657FF]">Historial de eventos</p><p className="text-[10px] font-semibold text-slate-400 mt-0.5">Más reciente → más antiguo</p></div><CalendarDays size={18} className="text-[#7657FF]"/></div>
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
            {historial.length === 0 ? <p className="p-5 text-center text-xs font-semibold text-slate-400">No hay eventos registrados.</p> : historial.map(ev => {
              const est=utils.normalizeText(ev.estado); const total=utils.safeNum(ev.total); const abono=utils.safeNum(ev.abono);
              return <button type="button" key={ev.id} onClick={(e)=>{e.stopPropagation();utils.triggerHaptic('light');openModal(ev,false);}} className="w-full text-left p-4 hover:bg-slate-50 active:bg-blue-50 transition-colors">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex items-center gap-2 flex-wrap"><span className="font-black text-slate-900 text-sm">{ev.fecha?String(ev.fecha).split('-').reverse().join('/'):'Sin fecha'}</span>{ev.hora&&<span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{utils.formatTime12h(ev.hora)}</span>}</div><p className="text-xs font-semibold text-slate-600 truncate mt-1.5">{String(ev.servicio||ev.tipoEvento||'Evento')}</p>{(ev.direccion||ev.ubicacion)&&<p className="text-[10px] font-medium text-slate-400 truncate mt-1 flex items-center gap-1"><MapPin size={10}/>{String(ev.direccion||ev.ubicacion)}</p>}</div><div className="text-right shrink-0"><p className="font-black text-emerald-500 text-sm">${total.toFixed(0)}</p><p className={`text-[9px] font-black uppercase tracking-wider mt-1 ${est==='completado'?'text-emerald-600':est==='cancelado'?'text-rose-500':'text-amber-600'}`}>{String(ev.estado||'Pendiente')}</p>{abono>0&&<p className="text-[9px] font-bold text-slate-400 mt-1">Abono ${abono.toFixed(0)}</p>}</div></div>
              </button>;
            })}
          </div>
        </div>)}

        <div className="grid grid-cols-2 gap-3 mb-4"><ActionBtn icon={MessageCircle} label="Contactar" color="emerald" onClick={(e)=>{e.stopPropagation();utils.openWhatsAppBusiness(phoneClean, `¡Hola ${c.nombre}!`);}} /><ActionBtn icon={Sparkles} label="Promo" color="white" onClick={(e)=>{e.stopPropagation();utils.openWhatsAppBusiness(phoneClean,msgPromo);}} /><ActionBtn icon={BellRing} label="Recordar" color="white" onClick={(e)=>{e.stopPropagation();utils.openWhatsAppBusiness(phoneClean,msgRecordatorio);}} /><ActionBtn icon={PenLine} label="Editar" color="white" onClick={(e)=>{e.stopPropagation(); onEditClient(c);}} /></div>
        <div className="flex gap-3"><AppButton variant="primary" icon={Plus} onClick={(e)=>{e.stopPropagation();openModal()}} className="flex-1 text-[13px] uppercase tracking-wider py-3.5 shadow-md">Reservar</AppButton><button type="button" onClick={(e)=>{e.stopPropagation();onDeleteClient(c,c.eventos)}} className="px-5 bg-rose-50 text-rose-500 rounded-[16px] hover:bg-rose-100 transition-colors border border-rose-100"><Trash2 size={20} /></button></div>
      </div>)}
    </div>);
});

const TransactionItem = memo(function TransactionItem({ ev, isExpanded, onToggleExpand, utils }) {
    const tot=utils.safeNum(ev.total),gas=utils.safeNum(ev.gastos),neta=tot-gas;
    return(<div className="group bg-white/80 backdrop-blur-sm rounded-[20px] mb-2 border border-slate-200/80 shadow-sm hover:border-slate-300 overflow-hidden transition-all"><button type="button" onClick={(e)=>{if(e){e.preventDefault();e.stopPropagation();}onToggleExpand(ev.id);}} className="w-full flex justify-between items-center p-5 bg-transparent hover:bg-slate-50/80 transition-colors duration-200 text-left active:scale-[0.99] text-slate-900"><div className="flex flex-col min-w-0 flex-1 pr-4"><p className="font-bold capitalize text-[16px] text-slate-900 truncate tracking-tight">{String(ev.cliente||'')}</p><p className="text-xs font-medium text-slate-500 mt-1.5">{ev.fecha?String(ev.fecha).split('-').reverse().join('/'):''} • {String(ev.tipoEvento||'').substring(0,15)}</p></div><div className="text-right shrink-0 flex items-center gap-4"><div className="flex flex-col items-end"><span className="font-bold text-emerald-500 text-lg leading-none block mb-2 tracking-tight">+${neta.toFixed(2)}</span>{gas>0&&<span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 leading-none px-2 py-1 bg-rose-50 rounded-lg border border-rose-100">Gastos: -${gas}</span>}</div><ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isExpanded?'rotate-180':''}`}/></div></button>{isExpanded&&(<div className="p-5 bg-slate-50/50 border-t border-slate-100/80 animate-fadeIn"><div className="flex justify-between items-center mb-3"><span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Ingreso Bruto</span><span className="font-bold text-[15px] text-slate-900">${tot.toFixed(2)}</span></div><div className="flex justify-between items-center mb-3"><span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Gastos Operativos</span><span className="font-bold text-[15px] text-rose-500">-${gas.toFixed(2)}</span></div>{ev.detalleGastos&&(<div className="mt-4 pt-4 border-t border-slate-200/60"><span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-2">Desglose:</span><p className="text-[13px] font-medium text-slate-600 italic leading-relaxed whitespace-pre-wrap">{String(ev.detalleGastos)}</p></div>)}</div>)}</div>);
});

const EventCardItem = memo(function EventCardItem({ ev, idx, todayTime, onWhatsApp, onViewDoc, onEdit, onDelete, onDuplicate, onMapClick, empresa, utils, onUpdateEstado, onConvertir, onRegistrarAbono, onAjustarCobro, onRegistrarGasto, forceExpanded = false }) {
    const [swipeX, setSwipeX] = useState(0), [isDragging, setIsDragging] = useState(false), [isExpanded, setIsExpanded] = useState(false); const startX = useRef(0); const cardRef = useRef(null);
    useEffect(() => { if (!forceExpanded) return; setIsExpanded(true); const timer = setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 180); return () => clearTimeout(timer); }, [forceExpanded]);
    useEffect(() => { const closeOnAppBack = (e) => { if (isExpanded) { setIsExpanded(false); if (e?.detail) e.detail.handled = true; } }; window.addEventListener('diverty:back-layer', closeOnAppBack); return () => window.removeEventListener('diverty:back-layer', closeOnAppBack); }, [isExpanded]);
    const handleTouchStart = useCallback((e) => { startX.current = e.touches[0].clientX; setIsDragging(true); }, []); const handleTouchMove = useCallback((e) => { if (!isDragging) return; const diffX = e.touches[0].clientX - startX.current; setSwipeX(diffX > 0 ? Math.min(diffX, 120) : 0); }, [isDragging]); const handleTouchEnd = useCallback(() => { setIsDragging(false); if (swipeX > 80) { utils.triggerHaptic('success'); onDelete(ev.id); } setSwipeX(0); }, [swipeX, ev.id, onDelete, utils]);
    const estNormalized=utils.normalizeText(ev.estado),isCotizacion=estNormalized.includes('cotizaci')||estNormalized.includes('cot.'); const tot=utils.safeNum(ev.total),abo=utils.safeNum(ev.abono),restante=Math.max(0,tot-abo),gastosInternos=getGastosInternosEvento(ev);
    const eventId = String(ev.id || '');
    const isWebReservation = !eventId.startsWith('man-') && !eventId.startsWith('cot-');
    let sideColor="bg-slate-200",dotColor="bg-slate-300",waType='agradecimiento'; if(estNormalized==='completado'){sideColor='bg-emerald-500';dotColor='bg-emerald-400';}else if(estNormalized.includes('aprobada')){sideColor='bg-teal-500';dotColor='bg-teal-400';}else if(estNormalized.includes('rechazada')){sideColor='bg-slate-400';dotColor='bg-slate-300';}else if(isCotizacion){sideColor='bg-amber-400';dotColor='bg-amber-400';waType='cotizacion';}else if(estNormalized==='en el evento'){sideColor='bg-fuchsia-500';dotColor='bg-fuchsia-400';waType='recordatorio';}else if(estNormalized==='en camino'){sideColor='bg-blue-500';dotColor='bg-blue-400';waType='recordatorio';}else if(estNormalized==='preparando'){sideColor='bg-orange-500';dotColor='bg-orange-400';waType='recordatorio';}else if(estNormalized.startsWith('confirmad')){sideColor='bg-[#7657FF]';dotColor='bg-[#7657FF]';waType='recordatorio';}else if(estNormalized==='pendiente'){sideColor='bg-amber-500';dotColor='bg-amber-500';waType='cobro';}else if(estNormalized==='cancelado'||estNormalized==='cancelada'){sideColor='bg-rose-500';dotColor='bg-rose-500';}
    let diff=null,dateBadgeContent=null; if(ev.fecha){const[y,m,d]=String(ev.fecha).split('-');if(y&&m&&d){diff=Math.ceil((new Date(parseInt(y,10),parseInt(m,10)-1,parseInt(d,10)).getTime()-todayTime)/(1000*60*60*24));}}
    if(diff===0&&!isCotizacion)dateBadgeContent=<Badge color="rose"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm"></div> HOY</Badge>;else if(diff===1&&!isCotizacion)dateBadgeContent=<Badge color="amber">MAÑANA</Badge>;else if(isCotizacion){ if(estNormalized.includes('aprobada'))dateBadgeContent=<Badge color="teal">COT. Aprobada</Badge>; else if(estNormalized.includes('rechazada'))dateBadgeContent=<Badge color="gray">COT. Rechazada</Badge>; else dateBadgeContent=<Badge color="amberSolid"><FileText size={12}/> Cotización</Badge>; }
    const operationalMeta = !isCotizacion ? getOperationalStatusMeta(ev.estado) : null;
    const nextOperationalState = !isCotizacion && !isArchivedReservation(ev) ? getNextNormalOperationalState(ev.estado) : null;
    const operationalActionLabel = nextOperationalState ? getOperationalActionLabel(ev.estado) : '';
    return (<div ref={cardRef} data-reservation-id={ev.id} className={`relative w-full ${UI.card} overflow-hidden`} style={{ animationFillMode: 'both', animationDelay: `${idx * 40}ms` }}><div className={`absolute inset-0 bg-gradient-to-r from-rose-500 to-rose-400 flex items-center pl-8 transition-opacity duration-200 ${swipeX > 20 ? 'opacity-100 z-0' : 'opacity-0 -z-10'}`}><Trash2 size={24} className="text-white" /><span className="text-white font-bold ml-3 text-sm uppercase tracking-wider">Eliminar</span></div><div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} className="relative p-5 sm:p-6 transition-transform duration-200 ease-out z-10 bg-white/95 cursor-pointer text-slate-900" style={{ transform: `translateX(${swipeX}px)`, transition: isDragging ? 'none' : 'transform 0.2s ease-out' }} onClick={(e) => { e.stopPropagation(); utils.triggerHaptic('light'); setIsExpanded(p => !p); }}><div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-r-full ${sideColor} z-20`}></div><div className="pl-3 relative z-10"><div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3"><div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-wrap flex-1"><div className="flex items-start gap-2 min-w-0 w-full"><div className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0 mt-2`}></div><h3 className="text-[19px] sm:text-lg font-black text-slate-950 leading-tight tracking-tight whitespace-normal break-words pr-1">{String(ev.cliente)}</h3></div><div className="flex items-center gap-2 flex-wrap mt-1 sm:mt-0">{isWebReservation && !isCotizacion && (<Badge color="blue"><Zap size={11}/> WEB</Badge>)}{!isCotizacion && estNormalized.includes('rechaz') && (<Badge color="gray">Rechazada</Badge>)}{!isCotizacion && (estNormalized==='cancelado' || estNormalized==='cancelada') && (<Badge color="rose">Cancelada</Badge>)}{dateBadgeContent}{!isCotizacion && !isArchivedReservation(ev) && operationalMeta && (<span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${operationalMeta.cls}`}>{operationalMeta.label}</span>)}{ev.hora && (<Badge color="gray"><Clock size={12} strokeWidth={2.5}/> {utils.formatTime12h(ev.hora)}</Badge>)}</div></div>{!isExpanded && (<div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pl-4 sm:pl-0"><span className="text-slate-950 font-black text-xl tracking-tight">${tot.toFixed(2)}</span>{isCotizacion ? null : (restante > 0 ? (<div className="bg-rose-50 text-rose-600 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-widest border border-rose-200 shadow-sm">Debe ${restante.toFixed(0)}</div>) : (<div className="flex items-center gap-1.5 text-emerald-500"><CheckCircle2 size={16} strokeWidth={2.5}/><span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Pagado</span></div>))}</div>)}</div>{!isExpanded && <div className="mt-4 pl-4 grid gap-2 text-[13px] font-semibold text-slate-500"><div className="flex items-center gap-2 min-w-0"><Sparkles size={15} className="text-[#7657FF] shrink-0"/><span className="whitespace-normal break-words">{String(ev.servicio || 'Sin paquete asignado')}</span></div>{(ev.ubicacion || ev.direccion) && <div className="flex items-center gap-2 min-w-0"><MapPin size={15} className="text-[#7657FF] shrink-0"/><span className="whitespace-normal break-words">{String(ev.ubicacion || ev.direccion)}</span></div>}</div>}<div className={`grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'}`}><div className="overflow-hidden"><div className="flex flex-col gap-2.5 mb-3 pt-1 text-slate-600"><div className="flex items-center gap-3"><Sparkles size={18} className="text-[#7657FF]/70 shrink-0" strokeWidth={2} /><span className="text-sm font-medium">{String(ev.servicio || 'Sin paquete asignado')}</span></div><div className="flex items-center gap-3"><Calendar size={18} className="text-[#7657FF]/70 shrink-0" strokeWidth={2} /><span className="text-sm font-medium">{ev.fecha ? String(ev.fecha).split('-').reverse().join('/') : 'Sin fecha'} • {ev.hora ? utils.formatTime12h(ev.hora) : 'Sin hora'}</span></div><div onClick={(e) => { e.stopPropagation(); onMapClick(ev.direccion, ev.ubicacion, ev); }} className="flex justify-between items-center gap-3 cursor-pointer hover:bg-slate-50 px-2 py-1 -mx-2 rounded-xl transition-colors active:scale-[0.98] border border-transparent hover:border-slate-100" title="Abrir en Google Maps"><div className="flex items-center gap-3 min-w-0"><MapPin size={18} className="text-[#7657FF]/70 shrink-0" strokeWidth={2} /><span className="text-sm font-medium truncate">{String(ev.ubicacion)} {ev.direccion ? `- ${String(ev.direccion)}` : ''}</span></div><div className="bg-slate-100 p-2 rounded-lg border border-slate-200"><MapIcon size={14} className="text-[#7657FF]" /></div></div><div className="flex items-center gap-3"><Smartphone size={18} className="text-[#7657FF]/70 shrink-0" strokeWidth={2} /><span className="text-sm font-medium">{String(ev.telefono || 'Sin teléfono')}</span></div></div><div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/50 mb-3 relative overflow-hidden"><div className="flex justify-between items-end mb-3"><div className="flex flex-col"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Total</span><span className="text-xl font-black text-slate-900 tracking-tight leading-none">${tot.toFixed(2)}</span></div><div className="flex flex-col items-end"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Pendiente</span><span className={`text-xl font-black tracking-tight leading-none ${restante > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>${restante.toFixed(2)}</span></div></div><div className="w-full bg-slate-200 rounded-full h-1.5 mb-2 overflow-hidden shadow-inner"><AnimatedProgress value={tot > 0 ? Math.min((abo / tot) * 100, 100) : 0} /></div><div className="flex justify-between items-center"><p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-widest">Recibido: <span className="text-slate-800">${abo.toFixed(2)}</span></p><p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{tot > 0 ? Math.round((abo/tot)*100) : 0}% pagado</p></div>{!isCotizacion && <><button type="button" onClick={(e)=>{e.stopPropagation();onAjustarCobro(ev);}} className="mt-2 text-[9px] font-black uppercase tracking-[.12em] text-[#7657FF] underline underline-offset-2">Corregir pago recibido</button><p className="mt-1 text-[8px] font-semibold text-slate-400">Este ajuste no cambia el precio de la reserva.</p></>}{!isCotizacion && (<div className="mt-3 pt-3 border-t border-slate-200/70"><div className="flex items-center justify-between mb-2.5"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gastos registrados</span><span className="text-sm font-black text-rose-500">-${gastosInternos.toFixed(2)}</span></div><div className={`grid gap-2 ${restante > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>{restante > 0 && <AppButton onClick={(e) => { e.stopPropagation(); onRegistrarAbono(ev); }} variant="primary" className="w-full py-2.5 px-2 text-[11px]" icon={DollarSign}>+ Abono</AppButton>}<AppButton onClick={(e) => { e.stopPropagation(); onRegistrarGasto(ev); }} variant="default" className="w-full py-2.5 px-2 text-[11px] bg-rose-50 text-rose-600 border-rose-100" icon={Receipt}>+ Gasto</AppButton></div></div>)}</div>{!isCotizacion && (<div className="mb-3 rounded-[18px] bg-white border border-slate-200/70 p-3.5" onClick={(e)=>e.stopPropagation()}><div className="flex items-center justify-between gap-3 mb-2.5"><div><label className="text-[9px] font-black text-slate-400 uppercase tracking-[.14em] block">Estado operativo</label><p className="text-[11px] font-semibold text-slate-500 mt-0.5">Actualiza el avance del evento sin entrar a Editar.</p></div>{operationalMeta&&<span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${operationalMeta.cls}`}>{operationalMeta.label}</span>}</div><select value={ev.estado || 'Pendiente'} onChange={(e)=>onUpdateEstado(ev.id,e.target.value)} className={`${UI.input} py-2.5 cursor-pointer`}><option value="Pendiente">Pendiente</option><option value="Confirmado">Confirmado</option><option value="Preparando">Preparando</option><option value="En camino">En camino</option><option value="En el evento">En el evento</option><option value="Completado">Realizado / Completado</option><option value="Cancelado">Cancelado</option><option value="Rechazada">Rechazada</option></select>{nextOperationalState&&<button type="button" onClick={()=>onUpdateEstado(ev.id,nextOperationalState)} className={`mt-2.5 w-full min-h-[46px] rounded-[14px] font-black text-[10px] uppercase tracking-[.11em] flex items-center justify-center gap-2 active:scale-[.98] transition-transform ${nextOperationalState==='Completado'?'bg-emerald-500 text-white shadow-[0_8px_20px_rgba(16,185,129,.18)]':'bg-[#10182D] text-white'}`}><ChevronRight size={16}/>{operationalActionLabel}</button>}</div>)}<div className="grid grid-cols-2 gap-2"><AppButton onClick={(e) => { e.stopPropagation(); onWhatsApp(ev, waType, empresa); }} className="col-span-2 w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 border-emerald-500 shadow-md text-white py-2.5" icon={MessageCircle}>WhatsApp Business</AppButton>{isCotizacion ? ( <AppButton onClick={(e) => { e.stopPropagation(); onViewDoc(ev, 'cotizacion'); }} variant="default" className="col-span-2 w-full py-2.5 text-[12px]" icon={FileText}>Ver PDF</AppButton> ) : ( <><AppButton onClick={(e) => { e.stopPropagation(); onViewDoc(ev, 'factura'); }} variant="default" className="w-full py-2.5 px-2 text-[12px] whitespace-nowrap" icon={Receipt}>Factura</AppButton><AppButton onClick={(e) => { e.stopPropagation(); onViewDoc(ev, 'contrato'); }} variant="default" className="w-full py-2.5 px-2 text-[12px] whitespace-nowrap" icon={FileSignature}>Contrato</AppButton></> )}</div>{isCotizacion && (<div className="flex gap-2 mt-3 pt-3 border-t border-slate-100/80">{estNormalized === 'cotizacion' && (<><AppButton onClick={(e) => { e.stopPropagation(); onUpdateEstado(ev.id, 'Cot. Aprobada'); }} variant="success" className="flex-1 text-[11px] py-3 bg-emerald-50 text-white">Aprobar</AppButton><AppButton onClick={(e) => { e.stopPropagation(); onUpdateEstado(ev.id, 'Cot. Rechazada'); }} variant="default" className="flex-1 text-[11px] py-3 text-slate-500 border-slate-200">Rechazar</AppButton></>)}{estNormalized.includes('aprobada') && (<AppButton onClick={(e) => { e.stopPropagation(); onConvertir(ev); }} variant="primary" className="w-full text-xs py-3.5 shadow-md">Convertir en Reserva</AppButton>)}</div>)}<div className="flex gap-2 mt-3 pt-3 border-t border-slate-100/80"><ActionBtn icon={Edit} label="Editar" onClick={(e) => { e.stopPropagation(); onEdit(ev, isCotizacion); }} /><ActionBtn icon={Copy} label="Duplicar" color="blue" onClick={(e) => { e.stopPropagation(); onDuplicate(ev); }} /><ActionBtn icon={Trash2} label="Eliminar" color="rose" onClick={(e) => { e.stopPropagation(); onDelete(ev.id); }} /></div></div></div></div></div></div>);
});

const EventFormModal = memo(function EventFormModal({ isOpen, initialData, isCotizacionMode, onClose, onSave, PAQUETES, onAddCustomService, showAlert, clientesRegistrados, listadoProveedores }) {
    const [formData, setFormData] = useState(initialData ? normalizeLegacyCostsForEdit(initialData) : { ...defaultFormData, fecha: utils.getLocalYYYYMMDD(new Date()) });
    const [searchTermService, setSearchTermService] = useState(''); const [showDropdown, setShowDropdown] = useState(false); const [isCustomOpen, setIsCustomOpen] = useState(false); const [customData, setCustomData] = useState({ nombre: '', precio: '' });
    const [showClientDropdown, setShowClientDropdown] = useState(false); const nameInputRef = useRef(null); const [selectedProv, setSelectedProv] = useState(''); const [selectedProvService, setSelectedProvService] = useState(''); const [provCosto, setProvCosto] = useState('');

    useEffect(()=>{ if(isOpen&&initialData){ setFormData(normalizeLegacyCostsForEdit(initialData)); setSearchTermService(''); setShowDropdown(false); setIsCustomOpen(false); setShowClientDropdown(false); setSelectedProv(''); setSelectedProvService(''); setProvCosto(''); } },[isOpen,initialData]);
    useEffect(()=>{ if(isOpen && nameInputRef.current && (!initialData || !initialData.id) && window.innerWidth > 768){ const t=setTimeout(()=>nameInputRef.current.focus(), 400); return ()=>clearTimeout(t); } },[isOpen,initialData]);
    useEffect(()=>{
        if(!isOpen || isCotizacionMode || (initialData && initialData.id)) return;
        // Rendimiento móvil: guardar el borrador solo cuando el navegador está libre.
        // Evita serializar el formulario mientras el usuario escribe o desplaza la pantalla.
        let cancelled = false;
        let idleId = null;
        const timer = setTimeout(() => {
            const saveDraft = () => { if (!cancelled) utils.setSafeLocal('diverty_form_draft', JSON.stringify(formData)); };
            if (typeof window !== 'undefined' && 'requestIdleCallback' in window) idleId = window.requestIdleCallback(saveDraft, { timeout: 1200 });
            else saveDraft();
        }, 1400);
        return () => {
            cancelled = true;
            clearTimeout(timer);
            if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId);
        };
    },[formData,isOpen,isCotizacionMode,initialData]);

    const deferredCliente = useDeferredValue(formData.cliente);
    const filteredClientes = useMemo(() => { if (!deferredCliente || typeof deferredCliente !== 'string') return []; const search = utils.normalizeText(deferredCliente); return (clientesRegistrados || []).filter(c => utils.normalizeText(c.nombre).includes(search) || (c.telefono && utils.normalizeText(c.telefono).includes(search)) ).slice(0, 5); }, [deferredCliente, clientesRegistrados]);
    
    const deferredSearchTermService = useDeferredValue(searchTermService);
    // Catálogo limpio: un solo registro visible por nombre. Si existen duplicados antiguos,
    // conservamos el más reciente (último en la lista) sin borrar nada de Firestore.
    const paquetesUnicos = useMemo(() => {
        const porNombre = new Map();
        (Array.isArray(PAQUETES) ? PAQUETES : []).forEach((p) => {
            const key = utils.normalizeText(p?.nombre || '').trim();
            if (!key) return;
            porNombre.set(key, p);
        });
        return Array.from(porNombre.values()).sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' }));
    }, [PAQUETES]);
    const filteredPaquetes = useMemo(() => {
        if (!deferredSearchTermService) return paquetesUnicos;
        const s = utils.normalizeText(deferredSearchTermService);
        return paquetesUnicos.filter(p => utils.normalizeText(p.nombre).includes(s) || utils.normalizeText(p.short || '').includes(s));
    }, [deferredSearchTermService, paquetesUnicos]);

    const handleSelectClient = useCallback((client) => { utils.triggerHaptic('light'); setFormData(prev => ({ ...prev, cliente: client.nombre || '', telefono: client.telefono || '', email: client.email || prev.email || '', ruc: client.ruc || prev.ruc || '' })); setShowClientDropdown(false); }, []);
    const procesarServicios = useCallback((prev, newSelected) => { const sumPrecios=newSelected.reduce((sum,s)=>sum+utils.safeNum(s.precio),0); const newTotal=sumPrecios+utils.safeNum(prev.transporte); const resumenServicios=newSelected.map(s=>s.cantidad>1?`${s.nombre} (x${s.cantidad})`:s.nombre).join(' + '); return{...prev,serviciosSeleccionados:newSelected,servicio:resumenServicios,total:newTotal>0?newTotal.toString():''}; }, []);
    const addService = useCallback((pkg) => { utils.triggerHaptic('light'); setFormData(prev=>{ const actuales=Array.isArray(prev.serviciosSeleccionados)?[...prev.serviciosSeleccionados]:[]; const existeIdx=actuales.findIndex(s=>s.nombre===pkg.nombre); if(existeIdx!==-1){actuales[existeIdx].cantidad+=1;actuales[existeIdx].precio=actuales[existeIdx].precioOriginal*actuales[existeIdx].cantidad;} else{actuales.push({...pkg,cantidad:1,precioOriginal:pkg.precio,precio:pkg.precio});} return procesarServicios(prev,actuales); }); }, [procesarServicios]);
    const updateServiceQuantity = useCallback((idx, delta) => { utils.triggerHaptic('light'); setFormData(prev=>{ const actuales=[...prev.serviciosSeleccionados], nuevoItem={...actuales[idx]}; nuevoItem.cantidad=Math.max(1,nuevoItem.cantidad+delta); nuevoItem.precio=nuevoItem.precioOriginal*nuevoItem.cantidad; actuales[idx]=nuevoItem; return procesarServicios(prev,actuales); }); }, [procesarServicios]);
    const removeService = useCallback((idx) => { utils.triggerHaptic('light'); setFormData(prev=>{ const ns=[...prev.serviciosSeleccionados]; ns.splice(idx,1); return procesarServicios(prev,ns); }); }, [procesarServicios]);
    const handleServiceEdit = useCallback((idx, field, val) => { setFormData(prev=>{ const actuales=[...prev.serviciosSeleccionados], nuevoItem={...actuales[idx]}; if(field==='precio'){ const nuevoPrecio=utils.safeNum(val); nuevoItem.precio=nuevoPrecio; nuevoItem.precioOriginal=nuevoPrecio/Math.max(1,nuevoItem.cantidad||1); }else if(field==='descripcion'){nuevoItem.descripcion=val;} actuales[idx]=nuevoItem; return procesarServicios(prev,actuales); }); }, [procesarServicios]);
    const handleCreateCustom = useCallback(async () => { const newSrv=await onAddCustomService(customData.nombre,customData.precio); if(newSrv){addService(newSrv);setIsCustomOpen(false);setCustomData({nombre:'',precio:''});} }, [customData.nombre, customData.precio, onAddCustomService, addService]);
    const handleZoneChange = useCallback((e) => { const z=e.target.value, cost=ZONAS_TRANSPORTE[z]||0; setFormData(p=>({...p,ubicacion:z,transporte:cost.toString(),total:((Array.isArray(p.serviciosSeleccionados)?p.serviciosSeleccionados:[]).reduce((s,x)=>s+utils.safeNum(x.precio),0)+cost).toString()})); }, []);
    
    const selectedProviderData = listadoProveedores?.find(x => x.id === selectedProv);
    const providerServices = selectedProviderData?.servicios?.length ? selectedProviderData.servicios.filter(x=>x.activo!==false) : (selectedProviderData ? [{id:'legacy',nombre:selectedProviderData.especialidad||'Servicio',costo:utils.safeNum(selectedProviderData.costoBase)}] : []);
    const handleProviderChange = (id) => { setSelectedProv(id); const p=listadoProveedores?.find(x=>x.id===id); const services=p?.servicios?.length?p.servicios.filter(x=>x.activo!==false):(p?[{id:'legacy',nombre:p.especialidad||'Servicio',costo:utils.safeNum(p.costoBase)}]:[]); const first=services[0]; setSelectedProvService(first?.id||''); setProvCosto(first?String(utils.safeNum(first.costo)):''); };
    const handleProviderServiceChange = (id) => { setSelectedProvService(id); const item=providerServices.find(x=>x.id===id); setProvCosto(item?String(utils.safeNum(item.costo)):''); };
    const handleAddSubcontrato = () => {
        const p = listadoProveedores.find(x => x.id === selectedProv);
        if(!p) return showAlert("Selecciona un proveedor válido");
        const servicio = providerServices.find(x=>x.id===selectedProvService) || providerServices[0];
        if(!servicio) return showAlert("Este proveedor no tiene servicios configurados");
        const cost = utils.safeNum(provCosto);
        if(cost <= 0) return showAlert("El costo del proveedor debe ser mayor a 0");
        utils.triggerHaptic('success');
        setFormData(prev => ({ ...prev, costosSeparados: true, subcontratos: [...(prev.subcontratos || []), { id:`sub-${Date.now()}`, proveedorId:p.id, nombre:p.nombre, servicioId:servicio.id, servicio:servicio.nombre, costo:cost, estadoPago:'pendiente', pagado:false }] }));
        setSelectedProv(''); setSelectedProvService(''); setProvCosto(''); showAlert("Proveedor y servicio añadidos al costo del evento", true);
    };

    const handleClearDraft = useCallback(() => { if(window.confirm("¿Deseas limpiar el formulario y empezar de cero?")){ setFormData({...defaultFormData,fecha:utils.getLocalYYYYMMDD(new Date())});utils.setSafeLocal('diverty_form_draft',''); } }, []);
    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        if(!formData.cliente?.trim()) return showAlert("El nombre del cliente es obligatorio.");
        if(!formData.telefono?.trim()) return showAlert("El teléfono es obligatorio.");
        if(!formData.fecha) return showAlert("La fecha del evento es obligatoria.");
        if (!isCotizacionMode) {
            const total = utils.safeNum(formData.total);
            const abono = utils.safeNum(formData.abono);
            if (total <= 0) return showAlert("El total de la reserva debe ser mayor que $0.", false);
            if (abono < 0) return showAlert("El total recibido no puede ser negativo.", false);
            if (abono > total) return showAlert(`El total recibido ($${abono.toFixed(2)}) no puede ser mayor que el total de la reserva ($${total.toFixed(2)}). Corrige uno de los dos valores antes de guardar.`, false);
        }
        onSave(formData,isCotizacionMode);
    }, [formData, isCotizacionMode, onSave, showAlert]);

    if (!isOpen) return null; const opcionesEstado = isCotizacionMode ? ['Cotización', 'Cot. Aprobada', 'Cot. Rechazada'] : ['Pendiente', 'Confirmado', 'Completado'];
    return (
        <div className="fixed inset-0 z-[9998] bg-[#071225]/55 sm:backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 animate-fadeIn">
            <div className={`${UI.modal} w-full h-[94vh] sm:h-auto sm:max-h-[92vh] sm:max-w-2xl flex flex-col overflow-hidden p-0 sm:p-0 rounded-t-[34px] sm:rounded-[34px] border border-white/70 shadow-[0_-12px_50px_rgba(31,41,55,.18)]`}>
                 <div className="px-5 py-5 sm:px-7 sm:py-6 border-b border-slate-200/60 flex justify-between items-center z-20 bg-white"><h3 className="font-black text-slate-900 text-2xl flex items-center gap-3 tracking-tight">{isCotizacionMode ? <FileText className="text-amber-500 drop-shadow-sm"/> : (initialData?.id && !initialData?.isDuplicated ? <Edit className="text-[#7657FF] drop-shadow-sm"/> : <Plus className="text-[#7657FF] drop-shadow-sm"/>)} {isCotizacionMode ? (initialData?.id ? 'Editar Cotización' : 'Nueva Cotización') : (initialData?.id && !initialData?.isDuplicated ? 'Editar Reserva' : 'Nueva Reserva')}</h3><div className="flex gap-2">{(!initialData?.id || initialData?.isDuplicated) && (<button onClick={handleClearDraft} type="button" className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 active:scale-[0.98] transition-colors border border-rose-200 shadow-sm"><Trash2 size={20}/></button>)}<button onClick={onClose} type="button" className="p-2.5 bg-slate-100 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-200 active:scale-[0.98] transition-colors border border-slate-200 shadow-sm"><X size={20}/></button></div></div>
                 <div className="overflow-y-auto flex-1 px-4 py-5 sm:p-7 bg-[radial-gradient(circle_at_top_left,rgba(255,47,154,.06),transparent_30%),radial-gradient(circle_at_top_right,rgba(118,87,255,.09),transparent_34%),#F7F8FC]"><form onSubmit={handleSubmit} className="max-w-xl mx-auto pb-28 space-y-4">
                     {!isCotizacionMode && <div className="rounded-[24px] bg-[linear-gradient(100deg,#FF2F9A_0%,#D52DDA_48%,#7657FF_100%)] p-[1px] shadow-[0_16px_36px_rgba(157,74,255,.18)]"><div className="rounded-[23px] bg-white/95 px-4 py-3"><div className="flex items-center justify-between gap-2 text-[9px] font-black uppercase tracking-[.13em]"><span className="text-[#7657FF]">1 Cliente</span><span className="h-px flex-1 bg-slate-200"/><span className="text-[#FF2F9A]">2 Evento</span><span className="h-px flex-1 bg-slate-200"/><span className="text-amber-500">3 Servicio</span><span className="h-px flex-1 bg-slate-200"/><span className="text-emerald-500">4 Cobro</span></div></div></div>}
                     <div className="bg-white/95 border border-white rounded-[26px] p-5 sm:p-6 mb-4 shadow-[0_10px_32px_rgba(15,23,42,.06)] ring-1 ring-slate-100"><div className="flex items-center gap-3 mb-5"><IconBox icon={Users} color="blue" /><h4 className="font-extrabold text-slate-900 text-lg tracking-tight">Datos del Cliente</h4></div><div className="space-y-5"><div className="relative z-40"><Field innerRef={nameInputRef} label="Nombre *" required value={formData.cliente} onChange={e => { const val = e.target.value; setFormData(prev => ({...prev, cliente: val})); setShowClientDropdown(true);}} onFocus={() => setShowClientDropdown(true)} onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)} autoComplete="off" />{showClientDropdown && filteredClientes.length > 0 && (<div className="mt-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl max-h-48 overflow-y-auto shadow-xl">{filteredClientes.map((c, idx) => (<button type="button" key={idx} onMouseDown={(e) => { e.preventDefault(); handleSelectClient(c); }} className="w-full text-left px-5 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex flex-col transition-colors"><span className="font-bold text-slate-900">{c.nombre}</span>{c.telefono && <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Smartphone size={12}/> {c.telefono}</span>}</button>))}</div>)}</div><div className="grid grid-cols-2 gap-3"><Field label="Teléfono *" required value={formData.telefono} onChange={e=>setFormData(prev=>({...prev,telefono:e.target.value}))} /><Field label="Correo" value={formData.email} onChange={e=>setFormData(prev=>({...prev,email:e.target.value}))} /></div><Field label="RUC / Identificación fiscal de empresa (opcional)" value={formData.ruc || ''} onChange={e=>setFormData(prev=>({...prev,ruc:e.target.value}))} placeholder="Ej. 1556789-1-123456 DV 00" /></div></div>
                     <div className="bg-white/95 border border-white rounded-[26px] p-5 sm:p-6 mb-4 shadow-[0_10px_32px_rgba(15,23,42,.06)] ring-1 ring-slate-100"><div className="flex items-center gap-3 mb-5"><IconBox icon={MapPin} color="rose" /><h4 className="font-extrabold text-slate-900 text-lg tracking-tight">Logística</h4></div><div className="grid grid-cols-2 gap-3 mb-4"><Field label="Fecha *" type="date" required value={formData.fecha} onChange={e=>setFormData(prev=>({...prev,fecha:e.target.value}))} /><Field label="Hora *" type="time" required value={formData.hora} onChange={e=>setFormData(prev=>({...prev,hora:e.target.value}))} /></div><div className="mb-5"><Field as="select" label="Zona" value={formData.ubicacion} onChange={handleZoneChange}>{Object.keys(ZONAS_TRANSPORTE).map(z => <option key={z} value={z} className="bg-white text-slate-900">{z}</option>)}</Field></div><Field label="Dirección Exacta" value={formData.direccion} onChange={e=>setFormData(prev=>({...prev,direccion:e.target.value}))} /></div>
                     <div className="bg-white/95 border border-white rounded-[26px] p-5 sm:p-6 mb-4 shadow-[0_10px_32px_rgba(15,23,42,.06)] ring-1 ring-slate-100"><div className="flex items-center gap-3 mb-5"><IconBox icon={Sparkles} color="amber" /><h4 className="font-extrabold text-slate-900 text-lg tracking-tight">Servicios</h4></div><div className="mb-6"><div className="flex items-center relative group"><Search className="absolute left-4 text-slate-400 group-focus-within:text-[#7657FF] transition-colors" size={18} /><input type="text" value={searchTermService} onChange={(e) => { setSearchTermService(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} onBlur={() => setTimeout(() => setShowDropdown(false), 200)} placeholder="Buscar o agregar servicio..." className={`${UI.input} pl-12`} />{searchTermService && (<button type="button" onMouseDown={() => { setSearchTermService(''); setShowDropdown(false); }} className="absolute right-4 text-slate-400 hover:text-slate-900 transition-colors"><X size={16}/></button>)}</div>{showDropdown && (<div className="mt-3 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-xl"><div className="max-h-48 overflow-y-auto">{filteredPaquetes.map(p => (<button type="button" key={p.id} onMouseDown={(e) => { e.preventDefault(); addService(p); setSearchTermService(''); setShowDropdown(false); }} className="w-full text-left px-5 py-4 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex justify-between items-center transition-colors"><span className="font-bold text-slate-900">{String(p.nombre)}</span><span className="text-emerald-500 font-extrabold">${utils.safeNum(p.precio)}</span></button>))}{filteredPaquetes.length === 0 && <div className="px-5 py-6 text-center text-slate-500 text-sm font-medium">No se encontraron servicios.</div>}</div><div className="p-3 border-t border-slate-100 bg-slate-50"><button type="button" onMouseDown={(e) => { e.preventDefault(); setIsCustomOpen(true); setShowDropdown(false); setSearchTermService(''); }} className="w-full py-3.5 bg-[#7657FF]/10 text-[#7657FF] rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#7657FF]/20 transition-colors active:scale-[0.98] border border-[#7657FF]/20 shadow-sm flex items-center justify-center gap-2"><Plus size={16} /> Crear nuevo servicio</button></div></div>)}</div>{isCustomOpen && (<div className="mb-6 p-5 sm:p-6 bg-blue-50/50 backdrop-blur-md border border-[#7657FF]/30 rounded-2xl animate-fadeIn shadow-sm"><h5 className="font-bold text-[#7657FF] text-sm mb-5 uppercase tracking-widest flex items-center gap-2"><Plus size={18} /> Crear Servicio Personalizado</h5><div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6"><Field label="Nombre del Servicio" value={customData.nombre} onChange={e=>setCustomData(prev=>({...prev, nombre: e.target.value}))} placeholder="Ej. Hora extra" className="bg-white" /><Field label="Precio ($)" type="number" value={customData.precio} onChange={e=>setCustomData(prev=>({...prev, precio: e.target.value}))} placeholder="0.00" className="bg-white" /></div><div className="flex gap-4 justify-end"><button type="button" onClick={() => setIsCustomOpen(false)} className="px-6 py-3 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors">Cancelar</button><button type="button" onClick={handleCreateCustom} className="px-6 py-3 bg-gradient-to-r from-[#7657FF] to-[#8B5CF6] text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-[0.98] shadow-[0_8px_20px_rgba(37,99,235,0.25)]">Agregar a lista</button></div></div>)}{formData.serviciosSeleccionados.length > 0 && (<div className="space-y-4 mb-2 pt-2 border-t border-slate-100/80"><label className={UI.label}>Servicios Agregados ({formData.serviciosSeleccionados.length})</label>{formData.serviciosSeleccionados.map((s, idx) => (<div key={idx} className="flex flex-col gap-4 p-5 bg-slate-50/80 backdrop-blur-sm rounded-[20px] border border-slate-200/80 relative group hover:border-slate-300 transition-colors duration-200 shadow-sm"><button type="button" onClick={()=>removeService(idx)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 transition-colors p-1.5"><X size={16}/></button><div className="flex justify-between items-center pr-8"><span className="font-extrabold text-[15px] text-slate-900 truncate">{String(s.nombre)}</span><div className="flex items-center bg-white rounded-xl p-1 border border-slate-200 shadow-sm"><button type="button" onClick={()=>updateServiceQuantity(idx,-1)} className="w-8 h-8 flex justify-center items-center hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-900 transition-colors active:scale-[0.95]"><Minus size={14}/></button><span className="w-8 text-center font-bold text-slate-900">{s.cantidad}</span><button type="button" onClick={()=>updateServiceQuantity(idx,1)} className="w-8 h-8 flex justify-center items-center hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-900 transition-colors active:scale-[0.95]"><Plus size={14}/></button></div></div><div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4"><Field label="Precio Modificable ($)" type="number" value={s.precio} onChange={(e) => handleServiceEdit(idx, 'precio', e.target.value)} className="bg-white" /><Field as="textarea" label="Descripción para el PDF" value={s.descripcion || ''} onChange={(e) => handleServiceEdit(idx, 'descripcion', e.target.value)} rows={2} placeholder="Detalles, viñetas, cambios..." className="bg-white"/></div></div>))}</div>)}</div>
                     <div className="bg-white/95 border border-white rounded-[26px] p-5 sm:p-6 mb-4 shadow-[0_10px_32px_rgba(15,23,42,.06)] ring-1 ring-slate-100"><div className="flex items-center gap-3 mb-5"><IconBox icon={Receipt} color="emerald" /><div><h4 className="font-extrabold text-slate-900 text-lg tracking-tight">Finanzas</h4>{!isCotizacionMode && <p className="text-[10px] font-semibold text-slate-400 mt-1">El total contratado y el dinero recibido son valores independientes.</p>}</div></div>{!isCotizacionMode && (<div className="mb-6"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Field label="Total recibido / abonado ($)" type="number" min="0" value={formData.abono} onChange={e=>setFormData(prev=>({...prev,abono:e.target.value}))} className="text-emerald-500 font-bold bg-emerald-50/50" /><Field label="Transporte / viáticos ($)" type="number" min="0" value={formData.transporte} onChange={e=>{ const newTransporte = e.target.value; setFormData(prev => { const subtotalServicios=(Array.isArray(prev.serviciosSeleccionados)?prev.serviciosSeleccionados:[]).reduce((sum,x)=>sum+utils.safeNum(x.precio),0); return {...prev, transporte:newTransporte, total:(subtotalServicios+utils.safeNum(newTransporte)).toString()}; }); }} /></div><div className="mt-3 rounded-[16px] bg-slate-50 border border-slate-200/70 p-3 flex items-center justify-between gap-3"><div><p className="text-[8px] font-black uppercase tracking-[.14em] text-slate-400">Saldo calculado</p><p className={`text-lg font-black mt-0.5 ${Math.max(utils.safeNum(formData.total)-utils.safeNum(formData.abono),0)>0?'text-rose-500':'text-emerald-500'}`}>${Math.max(utils.safeNum(formData.total)-utils.safeNum(formData.abono),0).toFixed(2)}</p></div>{utils.safeNum(formData.abono)>0&&<button type="button" onClick={()=>setFormData(prev=>({...prev,abono:'0'}))} className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-500 active:scale-[.98]">Corregir pago a $0</button>}</div></div>)}{isCotizacionMode && (<div className="mb-6 space-y-5"><Field label="Viáticos Adicionales ($)" type="number" value={formData.transporte} onChange={e=>{ const newTransporte = e.target.value; setFormData(prev => ({...prev, transporte: newTransporte, total: ((Array.isArray(prev.serviciosSeleccionados) ? prev.serviciosSeleccionados : []).reduce((sum, s) => sum + utils.safeNum(s.precio), 0) + utils.safeNum(newTransporte)).toString()})); }} /><Field label="Vigencia de la cotización (días)" type="number" min="1" value={formData.vigenciaCotizacion || 7} onChange={e=>setFormData(prev=>({...prev,vigenciaCotizacion:Math.max(1,parseInt(e.target.value||'7',10))}))} /><p className="text-[10px] font-semibold text-slate-400 -mt-2">Se mostrará en el PDF como “Válida hasta”. La fecha queda reservada únicamente cuando el cliente confirma y realiza el abono acordado.</p></div>)}{!isCotizacionMode && (<div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 mb-6 relative overflow-hidden"><h5 className="text-[10px] uppercase font-extrabold text-slate-400 tracking-[0.2em] mb-4 flex items-center gap-2"><Truck size={14}/> Subcontratos / Proveedores</h5><div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_110px_auto] gap-3 items-end mb-4"><Field as="select" label="Proveedor" value={selectedProv} onChange={e=>handleProviderChange(e.target.value)} className="bg-white border-slate-200"><option value="">Selecciona...</option>{listadoProveedores?.filter(p=>p.activo!==false).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</Field><Field as="select" label="Servicio" value={selectedProvService} onChange={e=>handleProviderServiceChange(e.target.value)} disabled={!selectedProv} className="bg-white border-slate-200"><option value="">Servicio...</option>{providerServices.map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}</Field><Field label="Costo" type="number" placeholder="0.00" value={provCosto} onChange={e=>setProvCosto(e.target.value)} className="bg-white border-slate-200 text-rose-500 font-bold"/><button type="button" onClick={handleAddSubcontrato} className="bg-slate-900 text-white p-3.5 rounded-xl hover:bg-slate-800 transition-colors shadow-md h-[56px] w-[56px] flex items-center justify-center shrink-0"><Plus size={20}/></button></div><p className="text-[10px] font-semibold text-slate-400 -mt-2 mb-4">El costo se carga desde la tarifa del proveedor. Puedes modificarlo solo si este evento tiene un acuerdo diferente.</p>{formData.subcontratos?.length > 0 && (<div className="space-y-2 mt-4 pt-4 border-t border-slate-200">{formData.subcontratos.map((sc, i) => (<div key={sc.id||i} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 shadow-sm text-sm"><div><span className="font-bold text-slate-800">{sc.nombre}</span><span className="text-slate-400 text-xs block">{sc.servicio}</span><span className={`text-[9px] font-black uppercase ${sc.pagado?'text-emerald-500':'text-amber-500'}`}>{sc.pagado?'Pagado':'Pendiente de pago'}</span></div><div className="flex items-center gap-2"><span className="font-extrabold text-rose-500">-${utils.safeNum(sc.costo).toFixed(2)}</span><button type="button" onClick={()=>setFormData(prev=>({...prev,subcontratos:(prev.subcontratos||[]).filter((_,idx)=>idx!==i)}))} className="p-1.5 rounded-lg bg-rose-50 text-rose-500"><X size={14}/></button></div></div>))}</div>)}</div>)}{!isCotizacionMode && (<div className="mb-6 space-y-5"><Field label="Gastos operativos totales ($)" type="number" value={formData.gastos} onChange={e=>{ const newGastos = e.target.value; setFormData(prev => ({...prev, gastos: newGastos, costosSeparados: true})); }} className="text-rose-500 bg-rose-50/50" /><Field as="textarea" label="Detalle de gastos internos" value={formData.detalleGastos} onChange={e=>setFormData(prev=>({...prev,detalleGastos:e.target.value}))} placeholder="Ej. Transporte, hielo, ayudante..." /></div>)}<div className="mb-6 border-t border-slate-100 pt-6 mt-2"><label className={UI.label}>Estado {isCotizacionMode ? 'Cotización' : 'Reserva'}</label><div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">{opcionesEstado.map(est => (<button type="button" key={est} onClick={() => setFormData(prev => ({ ...prev, estado: est }))} className={`shrink-0 flex-1 py-3.5 px-4 text-[10px] font-bold uppercase tracking-widest rounded-xl border transition-colors active:scale-[0.98] ${formData.estado===est ? 'bg-gradient-to-r from-[#7657FF] to-[#8B5CF6] text-white border-transparent shadow-[0_8px_15px_rgba(37,99,235,0.25)]' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-700'}`}>{est}</button>))}</div></div><div className="bg-slate-100/80 p-6 rounded-2xl flex justify-between items-center border border-slate-200/80 mt-2 shadow-sm"><span className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">{isCotizacionMode ? 'TOTAL CALCULADO' : 'TOTAL FINAL'}</span><div className="flex items-center"><span className="text-3xl font-extrabold text-[#7657FF] mr-2">$</span><input type="number" value={formData.total} readOnly={isCotizacionMode} onChange={e=>{ if(!isCotizacionMode) setFormData(prev=>({...prev,total:e.target.value})); }} className={`bg-transparent text-right text-4xl font-black text-slate-900 outline-none w-32 tracking-tight ${isCotizacionMode?'cursor-not-allowed':''}`} /></div></div></div>
                     <div className="sticky bottom-0 z-30 -mx-4 sm:-mx-7 px-4 sm:px-7 pt-3 pb-4 bg-gradient-to-t from-[#F7F8FC] via-[#F7F8FC]/95 to-transparent"><AppButton variant="primary" icon={Check} onClick={handleSubmit} className="w-full py-4.5 text-sm uppercase tracking-[0.16em] rounded-[20px] shadow-[0_16px_35px_rgba(218,42,216,.30)]">{isCotizacionMode ? 'Guardar Cotización' : (initialData?.id && !initialData?.isDuplicated ? 'Actualizar Reserva' : 'Guardar Reserva')}</AppButton></div>
                  </form></div>
              </div>
        </div>
    );
});

// --- APP COMPONENT ---
export default function App() {
  const lastActivityRef = useRef(Date.now()); 
  const [currentTime, setCurrentTime] = useState(new Date());
  const [appSettings, setAppSettings] = useState(() => { const saved = utils.getSafeLocal('diverty_settings'); return saved ? JSON.parse(saved) : { metaMensual: META_MENSUAL, empresa: DATOS_EMPRESA }; });
  // Mantiene día/mes financiero vivo aunque la app permanezca abierta durante medianoche.
  useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date()), 60000);
      return () => clearInterval(timer);
  }, []);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false); 
  const [isAuthLoading, setIsAuthLoading] = useState(true); 
  const [emailInput, setEmailInput] = useState(''); 
  const [passwordInput, setPasswordInput] = useState('');
  const [firebaseUser, setFirebaseUser] = useState(null); 
  
  const [activeTab, setActiveTab] = useState('inicio');
  const [configView, setConfigView] = useState('home'); 
  const [isDBReady, setIsDBReady] = useState(false); 
  const [eventos, setEventos] = useState([]); 
  // Firestore optimizado: el historial completo se carga solo cuando una sección lo necesita.
  const historyLoadedRef = useRef(false);
  const historyLoadingRef = useRef(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [catalogoPaquetes, setCatalogoPaquetes] = useState([]); 
  const [hiddenClients, setHiddenClients] = useState([]); 
  const [filterDate, setFilterDate] = useState(''); 
  const [viewMode, setViewMode] = useState('semana'); 
  const [calMonth, setCalMonth] = useState(currentTime.getMonth()); 
  const [calYear, setCalYear] = useState(currentTime.getFullYear()); 
  
  const [globalSearch, setGlobalSearch] = useState('');
  const deferredGlobalSearch = useDeferredValue(globalSearch);

  const [proveedores, setProveedores] = useState([]); 
  const [proveedorModal, setProveedorModal] = useState({ isOpen: false, data: null }); 
  const [expandedProvId, setExpandedProvId] = useState(null);
  const [providerFilter, setProviderFilter] = useState('todos');
  const [providerCategory, setProviderCategory] = useState('');
  
  const handleToggleProv = useCallback((id) => setExpandedProvId(prev => prev === id ? null : id), []);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, initialData: defaultFormData, isCotizacion: false }); 
  const [expenseModal, setExpenseModal] = useState({ isOpen: false, event: null });
  const [navigationModal, setNavigationModal] = useState({ isOpen:false, googleUrl:'', wazeUrl:'', label:'' });
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [monthlyReportLoading, setMonthlyReportLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null }); 
  const [clientEditModal, setClientEditModal] = useState({ isOpen: false, oldName: '', clientKey: '' });
  const [toastAlert, setToastAlert] = useState({ isOpen: false, message: '', success: false }); 
  const [isModoOperativo, setIsModoOperativo] = useState(false); 
  const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState(null); 
  const [printType, setPrintType] = useState(null); 
  const [pdfScale, setPdfScale] = useState(1); 
  
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const [clientSort, setClientSort] = useState('gasto'); 
  const [financePeriod, setFinancePeriod] = useState('mes'); 
  const [selectedFinanceMonth, setSelectedFinanceMonth] = useState(currentTime.getMonth() + 1); 
  const [selectedFinanceYear, setSelectedFinanceYear] = useState(currentTime.getFullYear());
  const [expandedFinanceId, setExpandedFinanceId] = useState(null); 
  const [expandedClientId, setExpandedClientId] = useState(null); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [messaging, setMessaging] = useState(null);
  const [clientFilter, setClientFilter] = useState('todos');
  const [clientVisibleCount, setClientVisibleCount] = useState(10);
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [financeFocus, setFinanceFocus] = useState(null);
  const [isAgendaSummaryOpen, setIsAgendaSummaryOpen] = useState(false);
  const [isChristmasOpsOpen, setIsChristmasOpsOpen] = useState(false);
  const [christmasSantaCapacity, setChristmasSantaCapacity] = useState(1);
  const [staffCapacity, setStaffCapacity] = useState({ animadores: 3, payasos: 1 });
  const [normalSimultaneousCapacity, setNormalSimultaneousCapacity] = useState(3);
  const [christmasModuleVisible, setChristmasModuleVisible] = useState(() => utils.getSafeLocal('diverty_christmas_module_visible') !== 'false');
  const setChristmasVisibility = useCallback((visible) => {
      const next = !!visible;
      setChristmasModuleVisible(next);
      utils.setSafeLocal('diverty_christmas_module_visible', next ? 'true' : 'false');
      if (!next) { setExpandedChristmasId(null); setChristmasDayFilter('all'); setIsChristmasOpsOpen(false); }
  }, []);
  const christmasAutoAssignBusyRef = useRef(false);

  // Operación Navidad es una pantalla completa: bloquea el documento inferior para que
  // Agenda nunca aparezca detrás durante scroll/rebote en Android o iOS Safari.
  useEffect(() => {
      if (!isChristmasOpsOpen || typeof document === 'undefined') return;
      const body = document.body;
      const html = document.documentElement;
      const prevBodyOverflow = body.style.overflow;
      const prevBodyOverscroll = body.style.overscrollBehavior;
      const prevHtmlOverscroll = html.style.overscrollBehavior;
      body.style.overflow = 'hidden';
      body.style.overscrollBehavior = 'none';
      html.style.overscrollBehavior = 'none';
      return () => {
          body.style.overflow = prevBodyOverflow;
          body.style.overscrollBehavior = prevBodyOverscroll;
          html.style.overscrollBehavior = prevHtmlOverscroll;
      };
  }, [isChristmasOpsOpen]);
  const [expandedChristmasId, setExpandedChristmasId] = useState(null);
  const [christmasDayFilter, setChristmasDayFilter] = useState('all');
  const [notificationReservationId, setNotificationReservationId] = useState('');
  const [notificationPendingId, setNotificationPendingId] = useState('');
  const [notificationIntent, setNotificationIntent] = useState(() => {
      if (typeof window === 'undefined') return null;
      try {
          const params = new URLSearchParams(window.location.search);
          const reservationId = String(
              params.get('reservationId') || params.get('reservaId') || params.get('eventoId') ||
              params.get('eventId') || params.get('requestId') || params.get('id') || ''
          ).trim();
          const fromNotification = reservationId || params.get('fromNotification') === '1' || params.get('notification') === '1';
          if (!fromNotification) return null;
          return {
              reservationId,
              title: String(params.get('notificationTitle') || '').trim(),
              body: String(params.get('notificationBody') || '').trim()
          };
      } catch (_) { return null; }
  });

  // NOTIFICACIONES -> RESERVA EXACTA
  // 1) Si el push trae el ID, abrimos ese documento.
  // 2) Si el proveedor del push no incluyó el ID, usamos título/cuerpo para identificar
  //    la solicitud y, como último respaldo, abrimos la solicitud web pendiente más reciente.
  // Las solicitudes PENDIENTES se abren dentro de Notificaciones (Aceptar/Rechazar);
  // las ya aceptadas se abren en su fecha exacta de Agenda y con la tarjeta expandida.
  useEffect(() => {
      if (!firebaseUser || !notificationIntent || typeof window === 'undefined') return;
      let cancelled = false;

      const clearNotificationUrl = () => {
          try { window.history.replaceState(window.history.state, '', window.location.pathname + window.location.hash); } catch (_) {}
      };
      const mergeEvent = (ev) => setEventos(prev => {
          const map = new Map(prev.map(item => [String(item.id), item]));
          map.set(String(ev.id), ev);
          return [...map.values()];
      });
      const openResolvedReservation = (ev) => {
          if (!ev || cancelled) return;
          mergeEvent(ev);
          setGlobalSearch('');
          setActiveTab('eventos');
          setIsSidebarOpen(false);

          if (isPendingWebRequest(ev)) {
              // Una solicitud aún no aceptada NO pertenece a Agenda activa: se abre
              // directamente en la pantalla donde están Aceptar / Rechazar.
              setFilterDate('');
              setViewMode('pendientes');
              setNotificationReservationId('');
              setNotificationPendingId(String(ev.id));
              setIsNotifOpen(true);
          } else {
              setIsNotifOpen(false);
              setNotificationPendingId('');
              setFilterDate(String(ev.fecha || ''));
              setViewMode('');
              setNotificationReservationId(String(ev.id));
          }

          clearNotificationUrl();
          setNotificationIntent(null);
      };

      (async () => {
          try {
              const explicitId = String(notificationIntent.reservationId || '').trim();
              if (explicitId) {
                  const snap = await getDoc(getDocRef(explicitId));
                  if (cancelled) return;
                  if (snap.exists()) {
                      openResolvedReservation({ ...snap.data(), id: snap.id });
                      return;
                  }
              }

              const allRows = (Array.isArray(eventos) ? eventos : [])
                  .filter(ev => ev && ev.deletedLocally !== true)
                  .sort((a,b) => new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime());
              const pending = allRows.filter(isPendingWebRequest);
              if (!allRows.length) return; // Espera al snapshot de Firestore si aún está cargando.

              // Si el push no trajo ID, intenta reconocer la reserva por el contenido de
              // la notificación. Ya no se limita a solicitudes pendientes: también puede
              // abrir una reserva que ya fue aceptada y está en Agenda.
              const notificationText = utils.normalizeText(`${notificationIntent.title || ''} ${notificationIntent.body || ''}`);
              let target = null;
              if (notificationText) {
                  target = allRows.find(ev => {
                      const name = utils.normalizeText(ev?.cliente || '');
                      const phone = String(ev?.telefono || '').replace(/\D/g,'');
                      const service = utils.normalizeText(ev?.servicio || '');
                      const date = String(ev?.fecha || '').trim();
                      return (name && notificationText.includes(name)) ||
                          (phone.length >= 6 && notificationText.includes(phone.slice(-6))) ||
                          (service.length >= 8 && notificationText.includes(service)) ||
                          (date && notificationText.includes(date));
                  }) || null;
              }
              // Último respaldo: la solicitud web pendiente más reciente. Esto conserva
              // el comportamiento anterior cuando el proveedor de push envía un mensaje genérico.
              openResolvedReservation(target || pending[0] || null);
          } catch (err) {
              console.error('No se pudo abrir la reserva desde la notificación:', err);
          }
      })();

      return () => { cancelled = true; };
  }, [firebaseUser, notificationIntent, eventos]);

  // MULTIDISPOSITIVO: cada instalación tiene un identificador local. Firestore sigue siendo
  // la fuente oficial; este ID solo evita que un dispositivo procese su propia señal dos veces.
  const deviceIdRef = useRef((() => {
      try {
          let id = localStorage.getItem('diverty_device_id');
          if (!id) { id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; localStorage.setItem('diverty_device_id', id); }
          return id;
      } catch { return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
  })());

  const publishSync = useCallback(async (entityType, entityId, action = 'update') => {
      if (!firebaseUser) return;
      try {
          await setDoc(getConfigRef('syncBus'), {
              entityType, entityId: entityId || '', action,
              deviceId: deviceIdRef.current,
              changedAt: new Date().toISOString(),
              nonce: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          });
      } catch (err) { console.warn('No se pudo publicar señal de sincronización:', err); }
  }, [firebaseUser]);

  // Parche atómico para campos pequeños de una reserva. Incrementa revisión para detectar
  // si otro teléfono cambió la misma reserva mientras alguien la estaba editando.
  const patchEventoAtomic = useCallback(async (id, patch) => {
      let saved = null;
      await runTransaction(db, async (tx) => {
          const ref = getDocRef(id);
          const snap = await tx.get(ref);
          if (!snap.exists()) throw new Error('EVENT_NOT_FOUND');
          const current = snap.data();
          saved = { ...patch, _rev: (Number(current._rev) || 0) + 1, updatedAt: new Date().toISOString() };
          tx.set(ref, saved, { merge: true });
      });
      await publishSync('evento', id, 'update');
      return saved;
  }, [publishSync]);

  useEffect(() => {
      if (!firebaseUser || firebaseUser.uid !== ADMIN_UID) return;
      prepareDivertyData().catch(err => console.warn('No se pudo reconciliar la disponibilidad pública:', err));
  }, [firebaseUser]);

  useEffect(() => {
      if (!firebaseUser) return;
      let alive = true;
      (async () => {
          try {
              const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config_web', 'global'));
              const cfg = snap.exists() ? (snap.data() || {}) : {};
              const n = Number(cfg.capacidadSanta ?? 1);
              const simultaneous = Number(cfg.capacidadSimultanea ?? 3);
              const resources = cfg.recursosDisponibles && typeof cfg.recursosDisponibles === 'object' ? cfg.recursosDisponibles : {};
              if (alive) {
                  setChristmasSantaCapacity(Number.isInteger(n) && n >= 1 && n <= 20 ? n : 1);
                  setNormalSimultaneousCapacity(Number.isInteger(simultaneous) && simultaneous >= 1 && simultaneous <= 100 ? simultaneous : 3);
                  setStaffCapacity({
                      animadores: Math.max(0, Math.min(50, Math.round(Number(resources.animadores) || 3))),
                      payasos: Math.max(0, Math.min(50, Math.round(Number(resources.payasos) || 1)))
                  });
              }
          } catch (err) {
              console.warn('No se pudo leer configuración de recursos:', err);
              if (alive) {
                  setChristmasSantaCapacity(1);
                  setNormalSimultaneousCapacity(3);
                  setStaffCapacity({animadores:3,payasos:1});
              }
          }
      })();
      return () => { alive = false; };
  }, [firebaseUser]);

  useEffect(() => {
      // Si la app corre dentro de un contenedor Android/Capacitor, libera el splash nativo
      // apenas React ya montó. En navegador/PWA no hace nada.
      try { window?.Capacitor?.Plugins?.SplashScreen?.hide?.(); } catch (e) {}
  }, []);

  useEffect(() => { 
      const handleOnline = () => setIsOnline(true); 
      const handleOffline = () => setIsOnline(false); 
      window.addEventListener('online', handleOnline); 
      window.addEventListener('offline', handleOffline); 
      return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); }; 
  }, []);

  const tabHistoryRef = useRef(['inicio']);
  const navigatingBackRef = useRef(false);
  const stateRef = useRef({ modalConfig, expenseModal, navigationModal, clientEditModal, proveedorModal, isModoOperativo, isPrinting, activeTab, isNotifOpen, confirmModal, expandedClientId, expandedProvId, expandedFinanceId, financeFocus, isChristmasOpsOpen });
  useEffect(() => { 
      stateRef.current = { modalConfig, expenseModal, navigationModal, clientEditModal, proveedorModal, isModoOperativo, isPrinting, activeTab, isNotifOpen, confirmModal, expandedClientId, expandedProvId, expandedFinanceId, financeFocus, isChristmasOpsOpen }; 
  });
  
  useEffect(() => {
    // Una sola entrada centinela: Atrás consume capas internas; en Inicio sin capas no se repone y el navegador/app puede salir.
    window.history.pushState({ divertyApp: true }, '', window.location.href);
    const handleBack = () => {
        const s = stateRef.current;
        let blocked = false;
        
        if (s.isChristmasOpsOpen) { setIsChristmasOpsOpen(false); blocked = true; }
        else if (s.confirmModal?.isOpen) { setConfirmModal({ isOpen: false, message: '', onConfirm: null }); blocked = true; }
        else if (s.isPrinting) { setIsPrinting(false); blocked = true; }
        else if (s.navigationModal?.isOpen) { setNavigationModal({ isOpen:false, googleUrl:'', wazeUrl:'', label:'' }); blocked = true; }
        else if (s.expenseModal?.isOpen) { setExpenseModal({ isOpen:false, event:null }); blocked = true; }
        else if (s.modalConfig?.isOpen) { setModalConfig(p => ({...p, isOpen: false})); blocked = true; }
        else if (s.clientEditModal?.isOpen) { setClientEditModal({ isOpen: false, oldName: '', clientKey: '' }); blocked = true; }
        else if (s.proveedorModal?.isOpen) { setProveedorModal({ isOpen: false, data: null }); blocked = true; }
        else {
            // Las tarjetas de Agenda y el detalle de una Solicitud Web manejan primero su propio nivel abierto.
            const detail = { handled: false };
            window.dispatchEvent(new CustomEvent('diverty:back-layer', { detail }));
            if (detail.handled) blocked = true;
            else if (s.expandedClientId) { setExpandedClientId(null); blocked = true; }
            else if (s.expandedProvId) { setExpandedProvId(null); blocked = true; }
            else if (s.expandedFinanceId) { setExpandedFinanceId(null); blocked = true; }
            else if (s.isNotifOpen) { setIsNotifOpen(false); blocked = true; }
            else if (s.isModoOperativo) { setIsModoOperativo(false); blocked = true; }
            else if (s.financeFocus) { setFinanceFocus(null); blocked = true; }
            else if (tabHistoryRef.current.length > 1) {
                tabHistoryRef.current.pop();
                const previousTab = tabHistoryRef.current[tabHistoryRef.current.length - 1] || 'inicio';
                navigatingBackRef.current = true;
                setActiveTab(previousTab);
                setIsSidebarOpen(false);
                blocked = true;
            }
        }
        /* handled above */ if (false) { setIsNotifOpen(false); blocked = true; }
        
        if (blocked) {
            window.history.pushState({ divertyApp: true }, '', window.location.href);
        }
    };
    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
  }, []);

  useEffect(() => {
    let inactivityTimer; 
    const INACTIVITY_LIMIT = 10 * 60 * 1000; 
    const resetTimer = () => { lastActivityRef.current = Date.now(); };
    const checkActivity = () => { if (Date.now() - lastActivityRef.current > INACTIVITY_LIMIT) signOut(auth); };
    const evts = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']; 
    evts.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    inactivityTimer = setInterval(checkActivity, 30000); 
    const handleVisibility = () => { if (document.visibilityState === 'visible') checkActivity(); }; 
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { evts.forEach(e => window.removeEventListener(e, resetTimer)); clearInterval(inactivityTimer); document.removeEventListener('visibilitychange', handleVisibility); };
  }, []);

  useEffect(() => { 
      if (typeof window !== 'undefined' && !window.html2pdf && !document.getElementById('html2pdf-script')) { 
          const script = document.createElement('script'); script.id = 'html2pdf-script'; script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'; script.async = true; document.body.appendChild(script); 
      } 
  }, []);

  useEffect(() => { 
      isSupported().then(s => { if(s) setMessaging(getMessaging(app)); }).catch(()=>{}); 
  }, []);

  // NOTIFICACIONES: conserva el flujo que ya funcionaba y repara silenciosamente
  // el token FCM si Android/Chrome lo renueva después de una actualización de la PWA.
  // No pide permisos nuevos ni requiere cambios manuales en Firebase.
  useEffect(() => {
      if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
      const respondToDisplayModeQuery = (event) => {
          if (event?.data?.type !== 'DIVERTY_QUERY_DISPLAY_MODE') return;
          const standalone = !!(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator?.standalone === true);
          try { event.ports?.[0]?.postMessage({ standalone, url: window.location.href }); } catch (_) {}
      };
      navigator.serviceWorker.addEventListener('message', respondToDisplayModeQuery);
      return () => navigator.serviceWorker.removeEventListener('message', respondToDisplayModeQuery);
  }, []);

  useEffect(() => {
      if (!messaging || !firebaseUser || typeof window === 'undefined') return;
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      if (!('serviceWorker' in navigator)) return;
      let cancelled = false;
      (async () => {
          try {
              const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { updateViaCache: 'none' });
              await swRegistration.update().catch(() => {});
              await navigator.serviceWorker.ready;
              if (cancelled) return;
              const token = await getToken(messaging, {
                  vapidKey: "BEmGfQ2ANNd-fwu25Nd7OyRnzCbX8pdIoYxreafTsk5R5PKoAIfom-tDJIMS4Slpu5XjK0vvwLxHCS5_09B8YrQ",
                  serviceWorkerRegistration: swRegistration
              });
              if (!token || cancelled) return;
              await setDoc(doc(db, 'tokens', token), {
                  token,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  userAgent: navigator.userAgent || '',
                  enabled: true
              }, { merge: true });
          } catch (error) {
              // No interrumpe el uso de la app: el botón manual de notificaciones
              // continúa disponible con el mismo comportamiento anterior.
              console.warn('No se pudo renovar el token de notificaciones:', error);
          }
      })();
      return () => { cancelled = true; };
  }, [messaging, firebaseUser]);
  
  useEffect(() => {
    const fallbackTimer = setTimeout(() => setIsAuthLoading(false), 8000); 
    const unsubscribe = onAuthStateChanged(auth, (user) => { 
        clearTimeout(fallbackTimer); 
        if (user?.uid === ADMIN_UID) { setFirebaseUser(user); setIsAuthenticated(true); } 
        else { setFirebaseUser(null); setIsAuthenticated(false); setEventos([]); if (user) signOut(auth); } 
        setIsAuthLoading(false); 
    }, () => { 
        clearTimeout(fallbackTimer); setIsAuthLoading(false); 
    }); 
    return () => { clearTimeout(fallbackTimer); unsubscribe(); };
  }, []);

  useEffect(() => { 
      const handleResize = () => { if (window.innerWidth < 820) { setPdfScale((window.innerWidth - 32) / 794); } else { setPdfScale(1); } }; 
      if (isPrinting) { handleResize(); window.addEventListener('resize', handleResize); } 
      return () => window.removeEventListener('resize', handleResize); 
  }, [isPrinting]);

  const handleTabChange = useCallback((tabId) => { 
      utils.triggerHaptic('light');
      const currentTab = stateRef.current.activeTab;
      if (tabId !== currentTab) {
          if (navigatingBackRef.current) navigatingBackRef.current = false;
          else {
              const history = tabHistoryRef.current;
              if (history[history.length - 1] !== currentTab) history.push(currentTab);
              if (history[history.length - 1] !== tabId) history.push(tabId);
          }
      }
      setActiveTab(tabId); setIsSidebarOpen(false); 
      // En móvil, cada sección debe abrir siempre desde su encabezado, sin heredar scroll previo.
      requestAnimationFrame(() => {
          const mainEl = document.getElementById('main-content');
          if (mainEl) { mainEl.scrollTop = 0; mainEl.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }
      });
      setTimeout(() => {
          const mainEl = document.getElementById('main-content');
          if (mainEl) mainEl.scrollTop = 0;
      }, 80);
  }, []);
  
  const openCuentasPorCobrar = useCallback(() => {
      // El acceso rápido de Inicio representa siempre el mes actual, igual que su tarjeta.
      setFinancePeriod('mes');
      setFinanceFocus('cobros');
      handleTabChange('finanzas');
      setTimeout(() => {
          const target = document.getElementById('cuentas-por-cobrar');
          const mainEl = document.getElementById('main-content');
          if (target && mainEl) {
              const top = Math.max(0, target.offsetTop - 20);
              mainEl.scrollTo({ top, behavior: 'smooth' });
          } else if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 180);
  }, [handleTabChange]);



  const updateSettings = useCallback((newSettings) => { 
      setAppSettings(prev => {
         const updated = typeof newSettings === 'function' ? newSettings(prev) : newSettings;
         utils.setSafeLocal('diverty_settings', JSON.stringify(updated));
         return updated;
      });
  }, []); 
  
  const showAlert = useCallback((message, success = false) => { 
      setToastAlert({ isOpen: true, message: String(message), success }); 
      setTimeout(() => setToastAlert({ isOpen: false, message: '', success: false }), 5000); 
  }, []);

  const saveStaffCapacity = useCallback(async (next, nextSimultaneous, nextSanta) => {
      const normalized = {
          animadores: Math.max(0, Math.min(50, Math.round(Number(next?.animadores) || 0))),
          payasos: Math.max(0, Math.min(50, Math.round(Number(next?.payasos) || 0)))
      };
      const simultaneous = Math.max(1, Math.min(100, Math.round(Number(nextSimultaneous) || 3)));
      const santas = Math.max(1, Math.min(20, Math.round(Number(nextSanta) || 1)));
      setStaffCapacity(normalized);
      setNormalSimultaneousCapacity(simultaneous);
      setChristmasSantaCapacity(santas);
      try {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config_web', 'global'), {
              recursosDisponibles: normalized,
              capacidadSimultanea: simultaneous,
              capacidadSanta: santas,
              updatedAt: new Date().toISOString()
          }, { merge:true });
          showAlert('Capacidad operativa actualizada en la web.', true);
      } catch (err) {
          console.error('No se pudo guardar la capacidad operativa:', err);
          showAlert('No se pudo guardar la capacidad operativa.', false);
      }
  }, [showAlert]);

  const handleMarcarCobrado = useCallback((ev) => {
      const total = utils.safeNum(ev?.total);
      const pendiente = Math.max(total - utils.safeNum(ev?.abono), 0);
      if (!ev?.id || pendiente <= 0) return;
      utils.triggerHaptic('light');
      setConfirmModal({
          isOpen: true,
          message: `¿Marcar como cobrado el saldo de $${pendiente.toFixed(2)} de ${ev.cliente || 'esta reserva'}?`,
          onConfirm: async () => {
              try {
                  await patchEventoAtomic(ev.id, { abono: total });
                  setEventos(prev => prev.map(item => item.id === ev.id ? { ...item, abono: total } : item));
                  setConfirmModal({ isOpen: false, message: '', onConfirm: null });
                  showAlert('Pago marcado como cobrado.', true);
              } catch (err) {
                  console.error('Error marcando cobro:', err);
                  setConfirmModal({ isOpen: false, message: '', onConfirm: null });
                  showAlert('No se pudo actualizar el cobro. Intenta nuevamente.', false);
              }
          }
      });
  }, [patchEventoAtomic, showAlert]);

  const handleEstadoPagoProveedor = useCallback((ev, subIndex, marcarPagado = true) => {
      const sc = ev?.subcontratos?.[subIndex];
      if (!ev?.id || !sc) return;
      const accion = marcarPagado ? 'pagar' : 'reabrir';
      const monto = utils.safeNum(sc.costo);
      utils.triggerHaptic('light');
      setConfirmModal({
          isOpen: true,
          message: marcarPagado
            ? `¿Registrar el pago de $${monto.toFixed(2)} a ${sc.nombre || 'este proveedor'} por ${sc.servicio || 'el servicio'}?`
            : `¿Marcar nuevamente como pendiente el pago a ${sc.nombre || 'este proveedor'}?`,
          onConfirm: async () => {
              try {
                  const nuevos = (ev.subcontratos || []).map((item, idx) => idx === subIndex ? {
                      ...item,
                      pagado: marcarPagado,
                      estadoPago: marcarPagado ? 'Pagado' : 'Pendiente',
                      fechaPago: marcarPagado ? new Date().toISOString() : ''
                  } : item);
                  await patchEventoAtomic(ev.id, { subcontratos: nuevos, costosSeparados: true });
                  setEventos(prev => prev.map(item => item.id === ev.id ? { ...item, subcontratos: nuevos, costosSeparados: true } : item));
                  setConfirmModal({ isOpen: false, message: '', onConfirm: null });
                  showAlert(marcarPagado ? 'Pago al proveedor registrado.' : 'Pago del proveedor marcado como pendiente.', true);
              } catch (err) {
                  console.error(`Error al ${accion} proveedor:`, err);
                  setConfirmModal({ isOpen: false, message: '', onConfirm: null });
                  showAlert('No se pudo actualizar el pago del proveedor.', false);
              }
          }
      });
  }, [patchEventoAtomic, showAlert]);
  
  const showConfirm = useCallback((message, onConfirm) => { 
      setConfirmModal({ isOpen: true, message: String(message), onConfirm: () => { onConfirm(); setConfirmModal({ isOpen: false, message: '', onConfirm: null }); } }); 
  }, []); 

  const loadFullHistory = useCallback(async (silent = true) => {
      if (!db || !appId || !firebaseUser || historyLoadedRef.current || historyLoadingRef.current) return;
      historyLoadingRef.current = true;
      setIsHistoryLoading(true);
      try {
          const eventosRef = collection(db, 'artifacts', appId, 'public', 'data', 'eventos');
          let cursor = null; const fullData = [];
          do {
            const page = await getDocs(query(eventosRef, orderBy(documentId()), ...(cursor ? [startAfter(cursor)] : []), limit(200)));
            fullData.push(...page.docs.filter(d => !d.data()?._system).map(d => ({...d.data(), id:d.id})));
            cursor = page.size === 200 ? page.docs[page.docs.length-1] : null;
          } while (cursor);
          // La consulta completa es autoritativa. Reemplazar en lugar de mezclar evita
          // que una reserva ya borrada siga reapareciendo desde IndexedDB/estado local
          // dentro de Finanzas o del historial.
          setEventos(fullData);
          historyLoadedRef.current = true;
      } catch (error) {
          console.warn('No se pudo cargar el historial completo:', error);
          if (!silent) showAlert('No se pudo cargar el historial completo. Revisa tu conexión.', false);
      } finally {
          historyLoadingRef.current = false;
          setIsHistoryLoading(false);
      }
  }, [firebaseUser, showAlert]);

  useEffect(() => {
    const needsHistory = activeTab === 'clientes' || activeTab === 'proveedores' ||
      (activeTab === 'finanzas' && financePeriod === 'todos') ||
      (activeTab === 'eventos' && (viewMode === 'todas' || viewMode === 'pendientes' || viewMode === 'completadas' || viewMode === 'canceladas' || !!deferredGlobalSearch || !!filterDate));
    if (needsHistory) loadFullHistory(false);
  }, [activeTab, viewMode, deferredGlobalSearch, filterDate, loadFullHistory, financePeriod]);

  const [financeLoadError, setFinanceLoadError] = useState('');
  const [financeLoading, setFinanceLoading] = useState(false);
  useEffect(() => {
    if (!firebaseUser || activeTab !== 'finanzas' || financePeriod === 'todos') return;
    let cancelled = false;
    const now = new Date();
    const year = financePeriod === 'mes' ? now.getFullYear() : selectedFinanceYear;
    const month = financePeriod === 'mes' ? now.getMonth()+1 : selectedFinanceMonth;
    const start = financePeriod === 'anio' ? `${year}-01-01` : `${year}-${String(month).padStart(2,'0')}-01`;
    const end = financePeriod === 'anio' ? `${year}-12-31` : `${year}-${String(month).padStart(2,'0')}-${new Date(year,month,0).getDate()}`;
    setFinanceLoading(true); setFinanceLoadError('');
    getDocs(query(collection(db,'artifacts',appId,'public','data','eventos'),where('fecha','>=',start),where('fecha','<=',end)))
      .then(snap => { if (!cancelled) setEventos(prev => {
        const map = new Map(prev.filter(e => e.fecha < start || e.fecha > end).map(e => [e.id,e]));
        snap.docs.filter(d => !d.data()?._system).forEach(d => map.set(d.id,{...d.data(),id:d.id}));
        return [...map.values()];
      }); })
      .catch(() => { if (!cancelled) setFinanceLoadError('No se pudo actualizar el período. Vuelve a seleccionarlo para reintentar.'); })
      .finally(() => { if (!cancelled) setFinanceLoading(false); });
    return () => { cancelled = true; };
  }, [firebaseUser,activeTab,financePeriod,selectedFinanceMonth,selectedFinanceYear]);


  useEffect(() => {
    if (!messaging) return;
    const unsubscribe = onMessage(messaging, (payload) => {
      const title = payload.notification?.title || payload.data?.title || "Notificación Diverty";
      const body = payload.notification?.body || payload.data?.body || "Tienes un nuevo mensaje"; 
      showAlert(`🔔 ${title}: ${body}`, true); utils.triggerHaptic('success');
    }); return () => unsubscribe();
  }, [messaging, showAlert]);

  const handleToggleClient = useCallback((clientKey) => { setExpandedClientId(prev => prev === clientKey ? null : clientKey); }, []); 
  const handleToggleFinance = useCallback((id) => { setExpandedFinanceId(prev => prev === id ? null : id); }, []);
  
  const todayObj = currentTime;
  const todayStr = useMemo(() => utils.getLocalYYYYMMDD(currentTime), [currentTime]);
  const tomorrowStr = useMemo(() => utils.getLocalYYYYMMDD(new Date(currentTime.getTime() + 86400000)), [currentTime]);
  const { start: weekStart, end: weekEnd } = useMemo(() => utils.getWeekRange(currentTime), [currentTime]);
  const todayTime = useMemo(() => new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate()).getTime(), [currentTime]);
  
  const eventosActivos = useMemo(() => {
    return eventos.filter(ev => !ev.deletedLocally).sort((a,b) => String(a.fecha).localeCompare(String(b.fecha)) || String(a.hora).localeCompare(String(b.hora)));
  }, [eventos]);


  // NAVIDAD: asignación automática con la capacidad configurada. No crea listeners nuevos:
  // reutiliza los eventos que ya llegan por el listener operativo del CRM.
  // Si se reduce la cantidad de Santas, también reasigna reservas que hayan quedado
  // apuntando a un Santa desactivado (por ejemplo, Santa 2 cuando solo queda Santa 1).
  useEffect(() => {
    if (!firebaseUser || christmasAutoAssignBusyRef.current) return;
    const isChristmas = e => (e.esNavidad === true || /entregas de nochebuena/i.test(String(e.servicio || ''))) && ['2026-12-24','2026-12-25'].includes(String(e.fecha || '')) && !isPendingWebRequest(e) && !/cancelado|rechazada|cot/i.test(String(e.estado || ''));
    const capacity = Math.max(1, Number(christmasSantaCapacity) || 1);
    const santaNames = Array.from({length: capacity}, (_, i) => `Santa ${i + 1}`);
    const pending = eventosActivos.filter(e => {
      const a=String(e.santaAsignado || '').trim();
      return isChristmas(e) && (!a || a === 'Sin asignar' || !santaNames.includes(a));
    });
    if (!pending.length) return;

    const working = eventosActivos.filter(e => {
      const a=String(e.santaAsignado || '').trim();
      return isChristmas(e) && santaNames.includes(a);
    });

    christmasAutoAssignBusyRef.current = true;
    (async () => {
      try {
        for (const ev of pending.sort((a,b)=>String(a.fecha||'').localeCompare(String(b.fecha||'')) || String(a.hora||'').localeCompare(String(b.hora||'')))) {
          const scored = santaNames.map(name => {
            const sameSanta = working.filter(x => String(x.santaAsignado || '').trim() === name && String(x.fecha || '') === String(ev.fecha || ''));
            const plan = christmasInsertionPlan(ev, sameSanta);
            return { name, load:sameSanta.length, ...plan };
          }).filter(x => x.feasible).sort((a,b)=>a.score-b.score || a.load-b.load || a.name.localeCompare(b.name, undefined, {numeric:true}));

          const chosen = scored[0]?.name;
          if (!chosen) continue; // Ningún Santa puede insertar la visita respetando servicio + traslado.
          await patchEventoAtomic(ev.id, { santaAsignado: chosen, esNavidad: true, recursoNavidad: 'Santa' });
          working.push({ ...ev, santaAsignado: chosen, esNavidad: true, recursoNavidad: 'Santa' });
          setEventos(prev => prev.map(x => x.id === ev.id ? { ...x, santaAsignado: chosen, esNavidad: true, recursoNavidad: 'Santa' } : x));
        }
      } catch (err) {
        console.warn('Asignación inteligente de Santa pendiente:', err);
      } finally {
        christmasAutoAssignBusyRef.current = false;
      }
    })();
  }, [eventosActivos, christmasSantaCapacity, firebaseUser, patchEventoAtomic]);

  // Índices derivados: se calculan una sola vez cuando cambian los eventos.
  // Evitan recorrer toda la base repetidamente en Calendario y Clientes.
  const eventosAgendaPorFecha = useMemo(() => {
    const map = new Map();
    eventosActivos.forEach(e => {
      const es = utils.normalizeText(e.estado);
      if (!e.fecha || isArchivedReservation(e) || isPendingWebRequest(e) || es.includes('cotizaci') || es.includes('cot.')) return;
      // Normaliza fechas que puedan venir como YYYY-MM-DD, ISO o con espacios.
      const fechaKey = String(e.fecha).trim().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaKey)) return;
      if (!map.has(fechaKey)) map.set(fechaKey, []);
      map.get(fechaKey).push(e);
    });
    return map;
  }, [eventosActivos]);

  const historialClientesMap = useMemo(() => {
    const map = new Map();
    eventosActivos.forEach(ev => {
      const es = utils.normalizeText(ev.estado);
      if (es.includes('cotizaci') || es.includes('cot.')) return;
      const key = getClientKey(ev);
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    });
    map.forEach(arr => arr.sort((a,b) => `${String(b.fecha||'')} ${String(b.hora||'')}`.localeCompare(`${String(a.fecha||'')} ${String(a.hora||'')}`)));
    return map;
  }, [eventosActivos]);
  
  // Fuente única para el resumen financiero del mes actual.
  // Inicio reutiliza exactamente el mismo motor financiero que el módulo Finanzas,
  // evitando diferencias entre las dos pantallas.
  const currentMonthFinanceReport = useMemo(() => {
     const [year, month] = String(todayStr || '').split('-').map(Number);
     return buildMonthlyFinanceReport(eventosActivos, year || todayObj.getFullYear(), month || (todayObj.getMonth() + 1));
  }, [eventosActivos, todayStr, todayObj]);

  const stats = useMemo(() => {
     let gananciaHoy = 0, gananciaSemana = 0, ingresosEsteMes = 0; 
     const eventosHoy = [], eventosManana = [], alertasOperativas = [], currYear = todayObj.getFullYear(), currMonth = todayObj.getMonth() + 1;
     
     eventosActivos.forEach(e => {
        const es = utils.normalizeText(e.estado);
        const isHoy = e.fecha === todayStr;
        const isManana = e.fecha === tomorrowStr;
        
        if(!isArchivedReservation(e) && !isPendingWebRequest(e) && !es.includes('cotizaci') && !es.includes('cot.')) {
            const t = utils.safeNum(e.total), a = utils.safeNum(e.abono), g = getCostosEvento(e), p = t - g;  
            let evYear = 0, evMonth = 0, evDay = 0;
            
            if(e.fecha) { 
                const parts = String(e.fecha).trim().split('-'); 
                if(parts.length >= 2) { evYear = parseInt(parts[0], 10); evMonth = parseInt(parts[1], 10); evDay = parseInt(parts[2] || 0, 10); } 
            }
            
            const isEsteMes = (evYear === currYear && evMonth === currMonth);
            if(isHoy) gananciaHoy += p; 
            if(isEsteMes) ingresosEsteMes += p;
            if(evYear && evMonth && evDay) { const eD = new Date(evYear, evMonth - 1, evDay); if (eD >= weekStart && eD <= weekEnd) gananciaSemana += p; } 
            if(isHoy) eventosHoy.push(e); 
            if(isManana) eventosManana.push(e);
            
            if (es !== 'completado' && (isHoy || isManana)) { 
                const pr = isHoy ? 1 : 2;
                const st = isHoy ? {c:'text-rose-500',b:'bg-rose-50 border-rose-200',t:'HOY URGENTE'} : {c:'text-amber-500',b:'bg-amber-50 border-amber-200',t:'MAÑANA'}; 
                
                if (utils.safeNum(e.abono) <= 0) alertasOperativas.push({ id: `abo-${e.id}`, pr: pr, e: e, icon: DollarSign, ...st, txt: `Sin abono: ${String(e.cliente)}` }); 
                if (!e.direccion || String(e.direccion).trim() === '') alertasOperativas.push({ id: `dir-${e.id}`, pr: pr, e: e, icon: MapPin, ...st, txt: `Falta dirección: ${String(e.cliente)}` }); 
                if (!e.hora || String(e.hora).trim() === '') alertasOperativas.push({ id: `hor-${e.id}`, pr: pr, e: e, icon: Clock, ...st, txt: `Falta hora: ${String(e.cliente)}` }); 
            }
        }
     });
     
     eventosHoy.sort((a,b) => String(a.hora).localeCompare(String(b.hora))); 
     eventosManana.sort((a,b) => String(a.hora).localeCompare(String(b.hora))); 
     alertasOperativas.sort((a, b) => a.pr - b.pr); 
     
     return {
       gananciaHoy,
       gananciaSemana,
       deudaTotal: currentMonthFinanceReport.porCobrar,
       ingresosEsteMes,
       eventosHoy,
       eventosManana,
       alertasOperativas
     };
  }, [eventosActivos, todayStr, tomorrowStr, weekStart, weekEnd, todayObj, currentMonthFinanceReport]);

  const clientsList = useMemo(() => {
     const clientsMap = new Map();
     eventosActivos.forEach(e => {
         const es = utils.normalizeText(e.estado);
         if(isArchivedReservation(e) || isPendingWebRequest(e) || es.includes('cotizaci') || es.includes('cot.')) return;

         const clientKey = getClientKey(e);
         if(!clientKey) return;

         if(!clientsMap.has(clientKey)) clientsMap.set(clientKey, {
             clientKey, nombre: e.cliente || 'Cliente', telefono: e.telefono || '', email: e.email || '',
             totalFacturado: 0, totalCobrado: 0, saldoPendiente: 0, eventos: 0, eventosCompletados: 0,
             ultimoEventoFecha: '', ultimoEstado: '', ultimoRealizadoFecha: '', proximaReserva: null
         });

         const c = clientsMap.get(clientKey);
         const total = utils.safeNum(e.total);
         // En Clientes, una reserva marcada como Completada/Cobrada se considera liquidada.
         // Esto evita arrastrar saldos antiguos cuando el evento ya fue cerrado como cobrado.
         const liquidado = es === 'completado' || es === 'cobrado' || es === 'pagado';
         const abonoGuardado = utils.safeNum(e.abono);
         const cobrado = liquidado ? total : Math.max(0, Math.min(abonoGuardado, total || abonoGuardado));
         const saldo = liquidado ? 0 : Math.max(total - abonoGuardado, 0);
         c.totalFacturado += total;
         c.totalCobrado += cobrado;
         c.saldoPendiente += saldo;
         c.eventos += 1;
         if (es === 'completado') c.eventosCompletados += 1;

         // Conserva los datos más recientes disponibles del cliente.
         if (e.telefono) c.telefono = e.telefono;
         if (e.email) c.email = e.email;
         if (e.cliente) c.nombre = e.cliente;

         if (e.fecha && (!c.ultimoEventoFecha || e.fecha > c.ultimoEventoFecha)) {
             c.ultimoEventoFecha = e.fecha;
             c.ultimoEstado = e.estado;
         }
         if (es === 'completado' && e.fecha && (!c.ultimoRealizadoFecha || e.fecha > c.ultimoRealizadoFecha)) c.ultimoRealizadoFecha = e.fecha;
         if (e.fecha && e.fecha >= todayStr && es !== 'completado') {
             if (!c.proximaReserva || `${e.fecha} ${e.hora || ''}` < `${c.proximaReserva.fecha} ${c.proximaReserva.hora || ''}`) c.proximaReserva = e;
         }
     });
     return Array.from(clientsMap.values()).filter(c => !hiddenClients.includes(c.nombre) && !hiddenClients.includes(`key:${c.clientKey}`));
  }, [eventosActivos, hiddenClients, todayStr]);

  const enrichedClients = useMemo(() => {
      return clientsList.map(c => {
          let daysSince = 0;
          const referenceDate = c.ultimoRealizadoFecha || (c.ultimoEventoFecha && c.ultimoEventoFecha < todayStr ? c.ultimoEventoFecha : '');
          if (referenceDate) {
              const [y, m, d] = referenceDate.split('-');
              if (y && m && d) {
                  const lastDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)).getTime();
                  daysSince = Math.max(0, Math.floor((todayTime - lastDate) / (1000 * 60 * 60 * 24)));
              }
          }
          const isVIP = c.eventosCompletados >= 3 || c.totalCobrado >= 300;
          return {
              ...c, totalGastado: c.totalFacturado, daysSince, isVIP,
              isFrecuente: c.eventosCompletados === 2,
              isNuevo: c.eventos === 1 && (!referenceDate || daysSince <= 180),
              isInactivo: !!referenceDate && daysSince > 180 && !c.proximaReserva,
              needsContact: !!referenceDate && daysSince > 60 && daysSince <= 365 && !c.proximaReserva
          };
      });
  }, [clientsList, todayTime, todayStr]);

  const animatedGananciaHoy = useCountUp(stats.gananciaHoy);
  
  const agendaFiltrados = useMemo(() => { 
      return eventosActivos.filter(e => { 
          const es = utils.normalizeText(e.estado);
          const archivada = isArchivedReservation(e);
          const solicitudWebPendiente = isPendingWebRequest(e);
          if (es.includes('cotizaci') || es.includes('cot.')) return false;

          // Las solicitudes web todavía no aceptadas viven únicamente en Notificaciones.
          // Solo entran a la Agenda cuando se aceptan desde la app.
          if (solicitudWebPendiente) return false;

          // Canceladas y rechazadas tienen su propio archivo y no ensucian la agenda activa.
          if (viewMode === 'canceladas') {
              if (!archivada) return false;
          } else if (archivada) return false;

          if (deferredGlobalSearch && !String(`${e.cliente} ${e.servicio} ${e.ubicacion} ${e.direccion} ${e.telefono}`).toLowerCase().includes(deferredGlobalSearch.toLowerCase())) return false; 
          if (filterDate && e.fecha !== filterDate) return false; 
          
          if (!filterDate && !deferredGlobalSearch) { 
              // Una reserva completada sale de la operación diaria inmediatamente.
              // Sigue disponible en Completadas y en el historial.
              if (viewMode !== 'todas' && viewMode !== 'completadas' && viewMode !== 'canceladas' && es === 'completado') return false;
              if (viewMode === 'hoy') return e.fecha === todayStr; 
              let dt; 
              if (e.fecha) { const parts = String(e.fecha).split('-'); if (parts.length === 3) dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)); } 
              if (viewMode === 'semana') return dt ? (dt >= weekStart && dt <= weekEnd) : false; 
              if (viewMode === 'mes') return dt ? (dt.getFullYear() === todayObj.getFullYear() && dt.getMonth() === todayObj.getMonth()) : false; 
              if (viewMode === 'findesemana') return dt ? (dt.getDay() === 0 || dt.getDay() === 6) : false; 
              if (viewMode === 'pendientes') return (utils.safeNum(e.total) - utils.safeNum(e.abono)) > 0 && es !== 'completado'; 
              if (viewMode === 'completadas') return es === 'completado';
              if (viewMode === 'canceladas') return archivada;
              if (viewMode === 'todas') return true; 
          } 
          return true; 
      }); 
  }, [eventosActivos, deferredGlobalSearch, filterDate, viewMode, todayStr, todayObj, weekStart, weekEnd]);

  const filteredClients = useMemo(() => enrichedClients.filter(c => { 
      if (clientFilter === 'vip' && !c.isVIP) return false; 
      if (clientFilter === 'retomar' && !c.needsContact) return false; 
      if (!deferredSearchTerm) return true; 
      const s = deferredSearchTerm.toLowerCase(); 
      return String(c.nombre).toLowerCase().includes(s) || String(c.telefono).includes(s) || String(c.email || '').toLowerCase().includes(s); 
  }), [enrichedClients, deferredSearchTerm, clientFilter]);

  const sortedFilteredClients = useMemo(() => [...filteredClients].sort((a, b) => {
      if (clientFilter === 'recientes' || clientSort === 'recientes') return new Date(b.ultimoEventoFecha || 0) - new Date(a.ultimoEventoFecha || 0);
      if (clientSort === 'gasto') return b.totalCobrado - a.totalCobrado;
      return 0;
  }), [filteredClients, clientSort, clientFilter]);

  useEffect(() => { setClientVisibleCount(10); }, [clientFilter, deferredSearchTerm, clientSort]);
  const visibleClients = useMemo(() => sortedFilteredClients.slice(0, clientVisibleCount), [sortedFilteredClients, clientVisibleCount]);
  
  const contactCandidates = useMemo(() => enrichedClients.filter(c => c.needsContact).slice(0, 5), [enrichedClients]);
  const financeYear = useMemo(() => financePeriod === 'mes' ? todayObj.getFullYear() : selectedFinanceYear, [financePeriod, todayObj, selectedFinanceYear]);
  const financeMonth = useMemo(() => financePeriod === 'mes' ? (todayObj.getMonth() + 1) : selectedFinanceMonth, [financePeriod, todayObj, selectedFinanceMonth]);

  const evtCalculoBase = useMemo(() => {
    return eventosActivos.filter(e => {
      const es = utils.normalizeText(e.estado);
      if (isArchivedReservation(e) || isPendingWebRequest(e) || es.includes('cotizaci') || es.includes('cot.')) return false;
      if (financePeriod === 'todos') return true;
      if (!e.fecha) return false;
      const parts = String(e.fecha).trim().split('-');
      if (parts.length < 2) return false;
      const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10);
      if (financePeriod === 'anio') return y === financeYear;
      return y === financeYear && m === financeMonth;
    });
  }, [eventosActivos, financePeriod, financeYear, financeMonth]);

  const finanzasData = useMemo(() => {
      const facturado = evtCalculoBase.reduce((a, e) => a + utils.safeNum(e.total), 0);
      const cobrado = evtCalculoBase.reduce((a, e) => a + Math.min(utils.safeNum(e.abono), utils.safeNum(e.total)), 0);
      const porCobrar = evtCalculoBase.reduce((a, e) => a + Math.max(utils.safeNum(e.total) - utils.safeNum(e.abono), 0), 0);
      const gastosInternos = evtCalculoBase.reduce((a, e) => a + getGastosInternosEvento(e), 0);
      const proveedores = evtCalculoBase.reduce((a, e) => a + getCostoProveedoresEvento(e), 0);
      const proveedoresPagados = evtCalculoBase.reduce((a,e)=>a+getProveedoresPagadosEvento(e),0);
      const proveedoresPendientes = evtCalculoBase.reduce((a,e)=>a+getProveedoresPendientesEvento(e),0);
      const costosTotales = gastosInternos + proveedores;
      const ganancia = facturado - costosTotales;
      const roi = facturado > 0 ? ((ganancia / facturado) * 100).toFixed(0) : 0;
      return {
        facturado, cobrado, porCobrar, gastosInternos, proveedores, proveedoresPagados, proveedoresPendientes, costosTotales, ganancia, roi,
        // Alias para mantener compatibilidad con componentes existentes.
        tI: facturado, tG: costosTotales, bT: ganancia, deudaTotalGlobal: porCobrar
      };
  }, [evtCalculoBase]);

  const gastosPorCategoria = useMemo(() => evtCalculoBase.reduce((acc, ev) => {
      const b = getExpenseBreakdownEvento(ev);
      acc.personal += b.personal; acc.transporte += b.transporte; acc.globos += b.globos; acc.otros += b.otros;
      return acc;
  }, { personal:0, transporte:0, globos:0, otros:0 }), [evtCalculoBase]);
  
  const finanzasMes = useMemo(() => { 
    const ingresosEsteMesGlobal = eventosActivos.filter(e => { 
      const es = utils.normalizeText(e.estado); 
      if (isArchivedReservation(e) || isPendingWebRequest(e) || es.includes('cotizaci') || es.includes('cot.')) return false; 
      if (!e.fecha) return false; 
      const parts = String(e.fecha).trim().split('-'); 
      return parseInt(parts[0], 10) === financeYear && parseInt(parts[1], 10) === financeMonth; 
    }).reduce((acc, e) => acc + (utils.safeNum(e.total) - getCostosEvento(e)), 0); 
    
    const esMesActual = financeYear === todayObj.getFullYear() && financeMonth === (todayObj.getMonth() + 1);
    const diasTranscurridos = esMesActual ? new Date(todayTime).getDate() : new Date(financeYear, financeMonth, 0).getDate();
    const diasTotales = new Date(financeYear, financeMonth, 0).getDate(); 
    const promedioDiario = diasTranscurridos > 0 ? ingresosEsteMesGlobal / diasTranscurridos : 0; 
    const proyeccion = promedioDiario * diasTotales; 
    const progresoMeta = Math.min((ingresosEsteMesGlobal / appSettings.metaMensual) * 100, 100); 
    
    return { ingresosEsteMesGlobal, diasTranscurridos, diasTotales, proyeccion, progresoMeta }; 
  }, [eventosActivos, financeYear, financeMonth, todayObj, todayTime, appSettings.metaMensual]);

  const chartData = useMemo(() => {
    if (financePeriod === 'anio') {
      return NOMBRES_MESES.map((nombre, idx) => {
        const month = idx + 1;
        const value = eventosActivos.filter(e => {
          if (!e.fecha || isArchivedReservation(e) || isPendingWebRequest(e) || utils.normalizeText(e.estado).includes('cot')) return false;
          const parts = String(e.fecha).split('-');
          return parseInt(parts[0], 10) === financeYear && parseInt(parts[1], 10) === month;
        }).reduce((acc, ev) => acc + (utils.safeNum(ev.total) - getCostosEvento(ev)), 0);
        return { date: nombre.substring(0,3), value };
      });
    }
    if (financePeriod === 'todos') {
      const mesesLabels = []; const d = new Date(todayTime);
      for (let i = 5; i >= 0; i--) { const temp = new Date(d.getFullYear(), d.getMonth() - i, 1); mesesLabels.push({ label: NOMBRES_MESES[temp.getMonth()].substring(0,3), year: temp.getFullYear(), month: temp.getMonth() + 1 }); }
      return mesesLabels.map(m => {
        const val = eventosActivos.filter(e => { if (!e.fecha || isArchivedReservation(e) || isPendingWebRequest(e) || utils.normalizeText(e.estado).includes('cot')) return false; const parts = e.fecha.split('-'); return parseInt(parts[0], 10) === m.year && parseInt(parts[1], 10) === m.month; }).reduce((acc, ev) => acc + (utils.safeNum(ev.total) - getCostosEvento(ev)), 0);
        return { date: m.label, value: val };
      });
    }

    const semanas = [ { label: 'Sem 1', start: 1, end: 7 }, { label: 'Sem 2', start: 8, end: 14 }, { label: 'Sem 3', start: 15, end: 21 }, { label: 'Sem 4', start: 22, end: 28 }, { label: 'Sem 5', start: 29, end: 31 } ];
    return semanas.map(s => {
      const value = eventosActivos.filter(e => {
        if (!e.fecha || isArchivedReservation(e) || isPendingWebRequest(e) || utils.normalizeText(e.estado).includes('cot')) return false;
        const parts = e.fecha.split('-'); const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
        return y === financeYear && m === financeMonth && d >= s.start && d <= s.end;
      }).reduce((acc, ev) => acc + (utils.safeNum(ev.total) - getCostosEvento(ev)), 0);
      return { date: s.label, value };
    });
  }, [eventosActivos, financePeriod, financeYear, financeMonth, todayTime]);

  const maxChartVal = useMemo(() => Math.max(...chartData.map(d => d.value), 100), [chartData]); 
  const cotizacionesActivas = useMemo(() => eventosActivos.filter(e => { const es = utils.normalizeText(e.estado); return es === 'cotizacion' || es === 'cot. aprobada'; }), [eventosActivos]); 
  const proximasReservas = useMemo(() => [...stats.eventosHoy, ...stats.eventosManana].filter(e => utils.normalizeText(e.estado) !== 'completado'), [stats.eventosHoy, stats.eventosManana]);
  const todayOperations = useMemo(() => {
    const rows = stats.eventosHoy
      .filter(e => !(e.esNavidad === true || /entregas de nochebuena/i.test(String(e.servicio || ''))))
      .slice()
      .sort((a,b)=>String(a.hora||'99:99').localeCompare(String(b.hora||'99:99')));
    const completed = rows.filter(e => utils.normalizeText(e.estado) === 'completado');
    const pending = rows.filter(e => utils.normalizeText(e.estado) !== 'completado');
    const activePriority = pending.find(e => ['en el evento','en camino','preparando'].includes(utils.normalizeText(e.estado)));
    const next = activePriority || pending[0] || null;
    const resourceStatus = next ? getResourceAvailability(next, eventosActivos, staffCapacity) : null;
    return { rows, completed, pending, next, resourceStatus };
  }, [stats.eventosHoy, eventosActivos, staffCapacity]);

  const handleAddCustomService = useCallback(async (nombre, precio) => { 
      if (!nombre?.trim()) { showAlert("Ingresa un nombre para el servicio.", false); return null; }
      const nombreLimpio = nombre.trim();
      const claveNombre = utils.normalizeText(nombreLimpio).trim();
      const existente = [...(Array.isArray(catalogoPaquetes) ? catalogoPaquetes : [])].reverse().find(p => utils.normalizeText(p?.nombre || '').trim() === claveNombre);
      if (existente) {
          showAlert(`"${existente.nombre}" ya existe. Lo agregué sin crear otro duplicado.`, true);
          return existente;
      }
      const newSrv = { id: 'c-'+Date.now(), nombre: nombreLimpio, precio: utils.safeNum(precio), short: nombreLimpio.substring(0,12)+'...', descripcion: 'Servicio personalizado.', isCustom: true }; 
      const nuevosPaquetes = [...catalogoPaquetes, newSrv]; 
      setCatalogoPaquetes(nuevosPaquetes); 
      if (firebaseUser) await setDoc(getConfigRef('serviciosCustom'), { paquetes: nuevosPaquetes }, { merge: true }); 
      return newSrv; 
  }, [catalogoPaquetes, firebaseUser, showAlert]);
  
  const openModal = useCallback((e = null, isCot = false) => { 
      try { 
          utils.triggerHaptic('light'); 
          let initial = { ...defaultFormData, fecha: filterDate || todayStr }; 
          if (e && typeof e === 'object' && 'id' in e && typeof e.preventDefault !== 'function') { 
              let srvs = Array.isArray(e.serviciosSeleccionados) ? e.serviciosSeleccionados.map((srv) => { const incluye = Array.isArray(srv?.incluye) ? srv.incluye.map(x => String(x || '').trim()).filter(Boolean) : []; const descripcionActual = String(srv?.descripcion || '').trim(); const descripcionSincronizada = descripcionActual || (incluye.length ? `Todo lo que incluye:\n${incluye.map(x => `• ${x}`).join('\n')}` : ''); return { ...srv, descripcion: descripcionSincronizada, incluye }; }) : []; 
              if (!srvs.length && e.servicio) {
                  // Reservas antiguas no siempre guardaban `serviciosSeleccionados`.
                  // El servicio sintético representa solo el servicio, sin volver a sumar
                  // el transporte que ya forma parte del total contratado.
                  const subtotalServicio = Math.max(0, utils.safeNum(e.total) - utils.safeNum(e.transporte));
                  srvs.push({ nombre: e.servicio, precio: subtotalServicio, cantidad: 1, precioOriginal: subtotalServicio, descripcion: String(e.descripcionEvento || '').trim() });
              } 
              initial = { ...defaultFormData, ...e, serviciosSeleccionados: srvs }; 
          } else if (!isCot) { 
              const draftStr = utils.getSafeLocal('diverty_form_draft'); 
              if (draftStr) { try { const draftObj = JSON.parse(draftStr); if (draftObj && (draftObj.cliente || draftObj.telefono || draftObj.serviciosSeleccionados?.length > 0)) { initial = draftObj; showAlert("Borrador recuperado", true); } } catch(err) {} } 
          } 
          setModalConfig({ isOpen: true, isCotizacion: isCot === true, initialData: initial }); 
      } catch (err) { 
          console.error(err); 
          setModalConfig({ isOpen: true, isCotizacion: isCot === true, initialData: { ...defaultFormData, fecha: filterDate || todayStr } }); 
      } 
  }, [filterDate, todayStr, showAlert]);
  
  const closeModal = useCallback(() => { utils.triggerHaptic('light'); setModalConfig({ isOpen: false, initialData: defaultFormData, isCotizacion: false }); }, []);
  
  const handleDuplicateEvento = useCallback((e) => { 
      utils.triggerHaptic('light'); const { id, createdAt, deletedLocally, colisionAprobada, numeroFactura, numeroContrato, numeroCotizacion, ownerUid, _rev, ...rest } = e; const isCotizacionOrig = utils.normalizeText(e.estado).includes('cot'); 
      setModalConfig({ isOpen: true, isCotizacion: isCotizacionOrig, initialData: { ...rest, abono: '', estado: isCotizacionOrig ? 'Cotización' : 'Pendiente', isDuplicated: true } }); 
      showAlert("Evento duplicado. Verifica los datos y guarda.", true); 
  }, [showAlert]);
  
  const transitionEventStatus = useCallback(async (id, nuevoEstado, { requirePendingWeb = false, extra = {} } = {}) => {
      if (!id) throw new Error('EVENT_ID_REQUIRED');
      let updatedData = null;
      await runTransaction(db, async tx => {
          const ref = getDocRef(id);
          const snap = await tx.get(ref);
          if (!snap.exists()) throw new Error('EVENT_NOT_FOUND');
          const current = snap.data() || {};
          if (requirePendingWeb) {
              if (utils.normalizeText(current.origen) !== 'web directa') throw new Error('NOT_WEB_REQUEST');
              if (utils.normalizeText(current.estado) !== 'pendiente') throw new Error('ALREADY_PROCESSED');
          }

          const nextState = utils.normalizeText(nuevoEstado);
          const releasesCapacity = nextState === 'cancelado' || nextState === 'cancelada' || nextState.includes('rechaz');
          let slotRef = null;
          let slotSnap = null;
          if (releasesCapacity && current.fecha && current.hora) {
              const esNavidad = current.esNavidad === true || /entregas de nochebuena/i.test(String(current.servicio || ''));
              const safeSlot = `${String(current.fecha)}_${String(current.hora).replace(':','-')}`.replace(/[^0-9A-Za-z_-]/g,'');
              slotRef = availabilityRef(`${esNavidad ? 'slot_santa_' : 'slot_'}${safeSlot}`);
              slotSnap = await tx.get(slotRef);
          }

          const nowIso = new Date().toISOString();
          const stateMeta = nextState.includes('rechaz')
              ? { rejectedAt: nowIso }
              : (nextState === 'cancelado' || nextState === 'cancelada'
                  ? { cancelledAt: nowIso }
                  : nextState === 'preparando'
                      ? { preparingAt: nowIso, estadoOperativoActualizadoAt: nowIso }
                      : nextState === 'en camino'
                          ? { enCaminoAt: nowIso, estadoOperativoActualizadoAt: nowIso }
                          : nextState === 'en el evento'
                              ? { enEventoAt: nowIso, estadoOperativoActualizadoAt: nowIso }
                              : nextState === 'completado'
                                  ? { completedAt: nowIso, estadoOperativoActualizadoAt: nowIso }
                                  : nextState.startsWith('confirmad')
                                      ? { confirmedAt: current.confirmedAt || nowIso, estadoOperativoActualizadoAt: nowIso }
                                      : {});
          const patch = {
              estado: nuevoEstado,
              ...stateMeta,
              ...extra,
              _rev: (Number(current._rev) || 0) + 1,
              updatedAt: nowIso
          };
          updatedData = { ...current, ...patch, id };
          tx.set(ref, patch, { merge: true });

          // Al cancelar o rechazar, libera también el candado interno del horario.
          // El registro principal se conserva para el archivo de Canceladas / Rechazadas.
          if (releasesCapacity && slotRef && slotSnap?.exists()) {
              const slot = slotSnap.data() || {};
              if (Array.isArray(slot.reservationIds)) {
                  const ids = slot.reservationIds.map(String).filter(x => x !== String(id));
                  if (ids.length <= 0) tx.delete(slotRef);
                  else tx.set(slotRef, { ...slot, count: ids.length, reservationIds: ids, updatedAt: nowIso });
              } else {
                  const nextCount = Math.max(0, (Number(slot.count) || 1) - 1);
                  if (nextCount <= 0) tx.delete(slotRef);
                  else tx.set(slotRef, { ...slot, count: nextCount, updatedAt: nowIso });
              }
          }
      });
      await publishSync('evento', id, 'update');
      setEventos(prev => prev.map(e => e.id === id ? updatedData : e));
      return updatedData;
  }, [publishSync]);

  const handleUpdateEstado = useCallback(async (id, nuevoEstado) => {
      const applyStatus = async () => {
          utils.triggerHaptic('light');
          const anterior = eventos.find(e => e.id === id)?.estado || 'Pendiente';
          const nowIso = new Date().toISOString();
          setEventos(prev => prev.map(e => e.id === id ? { ...e, estado: nuevoEstado, updatedAt: nowIso } : e));
          try {
              await transitionEventStatus(id, nuevoEstado);
              showAlert(`Estado actualizado a ${nuevoEstado}`, true);
          } catch (err) {
              console.error("Error actualizando estado:", err);
              setEventos(prev => prev.map(e => e.id === id ? { ...e, estado: anterior } : e));
              showAlert("No se pudo actualizar el estado de la reserva.", false);
          }
      };

      const normalized = utils.normalizeText(nuevoEstado);
      const isArchiveAction = normalized === 'cancelado' || normalized === 'cancelada' || normalized.includes('rechaz');
      if (isArchiveAction) {
          const ev = eventos.find(e => e.id === id);
          const label = normalized.includes('rechaz') ? 'rechazada' : 'cancelada';
          showConfirm(`¿Marcar la reserva de ${ev?.cliente || 'este cliente'} como ${label}? Quedará guardada en Canceladas / Rechazadas y el horario se liberará.`, applyStatus);
          return;
      }
      await applyStatus();
  }, [eventos, showAlert, transitionEventStatus, showConfirm]);
  
  const handleAdvanceOperational = useCallback((ev) => {
      if (!ev?.id) return;
      const next = getNextNormalOperationalState(ev.estado);
      if (!next) return;
      if (next === 'Completado') {
          showConfirm(`¿Marcar el evento de ${ev.cliente || 'este cliente'} como realizado?`, () => handleUpdateEstado(ev.id, next));
          return;
      }
      handleUpdateEstado(ev.id, next);
  }, [handleUpdateEstado, showConfirm]);

  const handleRegistrarAbono = useCallback(async (ev) => {
      utils.triggerHaptic('light');
      const totalVista = utils.safeNum(ev.total);
      const recibidoVista = utils.safeNum(ev.abono);
      const pendienteVista = Math.max(0, totalVista - recibidoVista);
      if (pendienteVista <= 0) return showAlert("Esta reserva ya está pagada por completo.", true);
      const entrada = window.prompt(`Monto del nuevo abono (pendiente: $${pendienteVista.toFixed(2)}):`);
      if (entrada === null) return;
      const monto = Number(String(entrada).replace(',', '.').trim());
      if (!Number.isFinite(monto) || monto <= 0) return showAlert("Ingresa un monto válido mayor que 0.", false);
      try {
          let nuevoAbono = 0;
          let nuevoRev = 0;
          let nuevosPagosItems = null;
          await runTransaction(db, async (tx) => {
              const ref = getDocRef(ev.id);
              const snap = await tx.get(ref);
              if (!snap.exists()) throw new Error('EVENT_NOT_FOUND');
              const actual = snap.data();
              const totalActual = utils.safeNum(actual.total);
              const recibidoActual = utils.safeNum(actual.abono);
              const pendienteActual = Math.max(0, totalActual - recibidoActual);
              if (monto > pendienteActual) {
                  const error = new Error('PAYMENT_EXCEEDS_BALANCE');
                  error.pendiente = pendienteActual;
                  throw error;
              }
              nuevoAbono = Number((recibidoActual + monto).toFixed(2));
              nuevoRev = (Number(actual._rev) || 0) + 1;
              const nowIso = new Date().toISOString();
              const pagosItems = [...(Array.isArray(actual.pagosItems) ? actual.pagosItems : []), {
                  id:`pago-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
                  monto:Number(monto.toFixed(2)),
                  fecha:utils.getLocalYYYYMMDD(new Date()),
                  createdAt:nowIso,
                  origen:'abono_rapido'
              }];
              nuevosPagosItems = pagosItems;
              tx.set(ref, { abono: nuevoAbono, pagosItems, _rev: nuevoRev, updatedAt: nowIso }, { merge: true });
          });
          await publishSync('evento', ev.id, 'update');
          setEventos(prev => prev.map(item => item.id === ev.id ? { ...item, abono: nuevoAbono, ...(nuevosPagosItems ? {pagosItems:nuevosPagosItems} : {}), _rev: nuevoRev, updatedAt: new Date().toISOString() } : item));
          showAlert(`Abono de $${monto.toFixed(2)} registrado correctamente.`, true);
      } catch (err) {
          console.error("Error registrando abono:", err);
          if (err?.message === 'PAYMENT_EXCEEDS_BALANCE') return showAlert(`Otro dispositivo actualizó esta reserva. El saldo actual es $${utils.safeNum(err.pendiente).toFixed(2)}.`, false);
          showAlert("No se pudo registrar el abono. Verifica tu conexión e intenta nuevamente.", false);
      }
  }, [showAlert, publishSync]);

  // Corrección rápida de pagos: NUNCA modifica el precio contratado.
  // El total de la reserva solo se cambia desde Editar reserva; este control sirve
  // exclusivamente para corregir cuánto dinero se ha recibido si se registró mal.
  const handleAjustarCobro = useCallback(async (ev) => {
      if (!ev?.id) return;
      utils.triggerHaptic('light');
      const totalActualVista = utils.safeNum(ev.total);
      const abonoActualVista = Math.min(utils.safeNum(ev.abono), totalActualVista);
      const abonoInput = window.prompt(
          `Corrige únicamente el TOTAL RECIBIDO hasta ahora.\nEl precio de la reserva seguirá siendo $${totalActualVista.toFixed(2)}:`,
          abonoActualVista.toFixed(2)
      );
      if (abonoInput === null) return;
      const nextAbono = Number(String(abonoInput).replace(',', '.').trim());
      if (!Number.isFinite(nextAbono) || nextAbono < 0) return showAlert('Ingresa un monto recibido válido.', false);
      if (nextAbono > totalActualVista) return showAlert(`El dinero recibido no puede ser mayor que el total de la reserva ($${totalActualVista.toFixed(2)}).`, false);
      try {
          let patch = null;
          await runTransaction(db, async tx => {
              const ref = getDocRef(ev.id);
              const snap = await tx.get(ref);
              if (!snap.exists()) throw new Error('EVENT_NOT_FOUND');
              const actual = snap.data() || {};
              const totalActual = utils.safeNum(actual.total);
              if (nextAbono > totalActual) {
                  const error = new Error('PAYMENT_EXCEEDS_BALANCE');
                  error.total = totalActual;
                  throw error;
              }
              const nowIso = new Date().toISOString();
              const ajustesFinancieros = [...(Array.isArray(actual.ajustesFinancieros) ? actual.ajustesFinancieros : []), {
                  createdAt:nowIso,
                  totalAnterior:totalActual,
                  abonoAnterior:utils.safeNum(actual.abono),
                  totalNuevo:totalActual,
                  abonoNuevo:Number(nextAbono.toFixed(2)),
                  origen:'correccion_pago_recibido_app'
              }];
              patch = {
                  abono:Number(nextAbono.toFixed(2)),
                  ajustesFinancieros,
                  _rev:(Number(actual._rev)||0)+1,
                  updatedAt:nowIso
              };
              tx.set(ref, patch, {merge:true});
          });
          await publishSync('evento', ev.id, 'update');
          setEventos(prev=>prev.map(item=>item.id===ev.id?{...item,...patch}:item));
          const saldo = Math.max(totalActualVista - nextAbono, 0);
          showAlert(`Pago recibido corregido a $${nextAbono.toFixed(2)}. Saldo pendiente: $${saldo.toFixed(2)}.`, true);
      } catch (err) {
          console.error('Error corrigiendo pago recibido:', err);
          if (err?.message === 'PAYMENT_EXCEEDS_BALANCE') return showAlert(`El total actual de esta reserva es $${utils.safeNum(err.total).toFixed(2)}. El recibido no puede superarlo.`, false);
          showAlert('No se pudo corregir el pago recibido. Intenta nuevamente.', false);
      }
  }, [publishSync, showAlert]);

  const handleOpenExpense = useCallback((ev) => {
      if (!ev?.id) return;
      utils.triggerHaptic('light');
      setExpenseModal({ isOpen:true, event:ev });
  }, []);

  const handleSaveQuickExpense = useCallback(async (ev, expenseOrList) => {
      if (!ev?.id) return;
      const inputList = Array.isArray(expenseOrList) ? expenseOrList : [expenseOrList];
      const nowIso = new Date().toISOString();
      const cleanExpenses = inputList.map((expense, index) => {
          const monto = utils.safeNum(expense?.monto);
          const categoriaRaw = String(expense?.categoria || '').toLowerCase();
          const categoria = ['personal','transporte','globos','otros'].includes(categoriaRaw) ? categoriaRaw : 'otros';
          return {
              id:`gas-${Date.now()}-${index}-${Math.random().toString(36).slice(2,7)}`,
              categoria,
              monto:Number(monto.toFixed(2)),
              detalle:String(expense?.detalle || '').trim(),
              fecha:String(expense?.fecha || utils.getLocalYYYYMMDD(new Date())),
              createdAt:nowIso
          };
      }).filter(item => Number.isFinite(item.monto) && item.monto > 0);
      if (!cleanExpenses.length) return;
      const totalAgregado = Number(cleanExpenses.reduce((sum,item)=>sum+item.monto,0).toFixed(2));

      try {
          let savedPatch = null;
          await runTransaction(db, async tx => {
              const ref = getDocRef(ev.id);
              const snap = await tx.get(ref);
              if (!snap.exists()) throw new Error('EVENT_NOT_FOUND');
              const actual = snap.data() || {};
              const baseInterno = getGastosInternosEvento(actual);
              const nuevoTotal = Number((baseInterno + totalAgregado).toFixed(2));
              const items = [...getExpenseItems(actual), ...cleanExpenses];
              const nuevasLineas = cleanExpenses.map(item => {
                  const label = EXPENSE_CATEGORIES.find(x=>x.id===item.categoria)?.label || 'Otro gasto';
                  return `${item.fecha} · ${label}: $${item.monto.toFixed(2)}${item.detalle ? ` · ${item.detalle}` : ''}`;
              });
              const detalleGastos = [String(actual.detalleGastos || '').trim(), ...nuevasLineas].filter(Boolean).join('\n');
              savedPatch = {
                  gastos:nuevoTotal,
                  gastosItems:items,
                  detalleGastos,
                  costosSeparados:true,
                  _rev:(Number(actual._rev)||0)+1,
                  updatedAt:nowIso
              };
              tx.set(ref, savedPatch, { merge:true });
          });
          await publishSync('evento', ev.id, 'update');
          setEventos(prev=>prev.map(item=>item.id===ev.id?{...item,...savedPatch}:item));
          setExpenseModal({ isOpen:false, event:null });
          showAlert(cleanExpenses.length > 1 ? `${cleanExpenses.length} gastos por $${totalAgregado.toFixed(2)} registrados.` : `Gasto de $${totalAgregado.toFixed(2)} registrado.`, true);
      } catch (err) {
          console.error('Error registrando gasto rápido:', err);
          showAlert('No se pudieron registrar los gastos. Revisa la conexión e intenta nuevamente.', false);
          throw err;
      }
  }, [publishSync, showAlert]);

  const generateMonthlyReport = useCallback(async (year, month, finalized = false) => {
      const y = Number(year), m = Number(month);
      if (!firebaseUser || !Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return null;
      const start = `${y}-${String(m).padStart(2,'0')}-01`;
      const end = `${y}-${String(m).padStart(2,'0')}-${String(new Date(y,m,0).getDate()).padStart(2,'0')}`;
      const snap = await getDocs(query(collection(db,'artifacts',appId,'public','data','eventos'), where('fecha','>=',start), where('fecha','<=',end)));
      const rows = snap.docs.filter(d=>!d.data()?._system).map(d=>({...d.data(),id:d.id}));
      const base = buildMonthlyFinanceReport(rows,y,m);
      const payload = {
          ...base,
          finalized:finalized === true,
          generadoAt:new Date().toISOString(),
          tipo:'reporte_mensual_finanzas',
          version:1
      };
      await setDoc(getConfigRef(`reporte_mensual_${y}_${String(m).padStart(2,'0')}`), payload, { merge:true });
      return payload;
  }, [firebaseUser]);

  // Cierre mensual sin servidor: el último día prepara el reporte y, si la app no estuvo
  // abierta, la primera apertura del mes siguiente lo genera/finaliza automáticamente.
  useEffect(() => {
      if (!firebaseUser) return;
      let cancelled = false;
      (async () => {
          try {
              const now = new Date(`${todayStr}T12:00:00`);
              const y = now.getFullYear(), m = now.getMonth()+1;
              const lastDay = new Date(y,m,0).getDate();
              if (now.getDate() === lastDay) await generateMonthlyReport(y,m,false);

              const prev = new Date(y, m-2, 1);
              const py = prev.getFullYear(), pm = prev.getMonth()+1;
              const ref = getConfigRef(`reporte_mensual_${py}_${String(pm).padStart(2,'0')}`);
              const existing = await getDoc(ref);
              if (!existing.exists() || existing.data()?.finalized !== true) await generateMonthlyReport(py,pm,true);
          } catch (err) {
              if (!cancelled) console.warn('No se pudo completar el cierre mensual automático:', err);
          }
      })();
      return () => { cancelled = true; };
  }, [firebaseUser, todayStr, generateMonthlyReport]);

  useEffect(() => {
      if (!firebaseUser || activeTab !== 'finanzas' || financePeriod === 'anio' || financePeriod === 'todos') { setMonthlyReport(null); return; }
      let cancelled = false;
      setMonthlyReportLoading(true);
      const y = financeYear, m = financeMonth;
      const ref = getConfigRef(`reporte_mensual_${y}_${String(m).padStart(2,'0')}`);
      getDoc(ref).then(async snap => {
          if (cancelled) return;
          if (snap.exists()) { setMonthlyReport(snap.data()); return; }
          const currentKey = todayStr.slice(0,7), targetKey = `${y}-${String(m).padStart(2,'0')}`;
          if (targetKey < currentKey) {
              const generated = await generateMonthlyReport(y,m,true);
              if (!cancelled) setMonthlyReport(generated);
          } else setMonthlyReport(null);
      }).catch(err=>{ console.warn('No se pudo leer el reporte mensual:',err); if(!cancelled)setMonthlyReport(null); })
        .finally(()=>{ if(!cancelled)setMonthlyReportLoading(false); });
      return () => { cancelled = true; };
  }, [firebaseUser, activeTab, financePeriod, financeYear, financeMonth, todayStr, generateMonthlyReport]);

  // Counters and event numbers are committed together; no guessed fallback numbers.
  const ensureDocumentNumber = useCallback(async (eventData, type) => {
    if (!eventData?.id || type === 'contrato_proveedor') return eventData;
    const config = {factura: ['numeroFactura','FAC'], contrato:['numeroContrato','CON'], cotizacion:['numeroCotizacion','COT']}[type];
    if (!config) return eventData;
    await prepareDivertyData();
    const result = await rawRunTransaction(db, async tx => {
      const eventRef = getDocRef(eventData.id), counterRef = getConfigRef('contador_' + type);
      const eventSnap = await tx.get(eventRef);
      if (!eventSnap.exists()) throw new Error('EVENT_NOT_FOUND');
      const current = eventSnap.data();
      if (current[config[0]]) return {...current, id: eventData.id};
      const counter = await tx.get(counterRef);
      if (!counter.exists()) throw new Error('COUNTER_NOT_READY');
      const next = (Number(counter.data().ultimo) || 0) + 1;
      const patch = {[config[0]]: `${config[1]}-${String(next).padStart(5,'0')}`, updatedAt: new Date().toISOString(), _rev: (Number(current._rev)||0)+1};
      tx.set(counterRef, {ultimo: next}); tx.set(eventRef, patch, {merge:true});
      return {...current, ...patch, id: eventData.id};
    });
    setEventos(prev => prev.map(ev => ev.id === result.id ? result : ev));
    return result;
  }, []);

  const ensureProviderContractNumber = useCallback(async (providerData) => {
    if (!providerData?.id) return providerData;
    const result = await rawRunTransaction(db, async tx => {
      const providerRef = getProvRef(providerData.id);
      const counterRef = getConfigRef('contador_subcontrato');
      const providerSnap = await tx.get(providerRef);
      if (!providerSnap.exists()) throw new Error('PROVIDER_NOT_FOUND');
      const current = providerSnap.data();
      if (current.numeroSubcontrato) return { ...current, id: providerData.id };
      const counterSnap = await tx.get(counterRef);
      const next = (Number(counterSnap.data()?.ultimo) || 0) + 1;
      const patch = {
        numeroSubcontrato: `SUB-${String(next).padStart(5,'0')}`,
        updatedAt: new Date().toISOString()
      };
      tx.set(counterRef, { ultimo: next }, { merge:true });
      tx.set(providerRef, patch, { merge:true });
      return { ...current, ...patch, id: providerData.id };
    });
    setProveedores(prev => prev.map(p => p.id === result.id ? result : p));
    return result;
  }, []);


  // Subcontrato POR EVENTO: usa exclusivamente los servicios de este proveedor
  // que fueron agregados a `subcontratos` dentro de la reserva. Si hay varios,
  // todos aparecen en el mismo PDF y el total a pagar es la suma de esos costos.
  const ensureProviderEventContractNumber = useCallback(async (providerData, eventData) => {
    if (!providerData?.id || !eventData?.id) throw new Error('PROVIDER_EVENT_REQUIRED');
    const result = await rawRunTransaction(db, async tx => {
      const eventRef = getDocRef(eventData.id);
      const counterRef = getConfigRef('contador_subcontrato');
      const eventSnap = await tx.get(eventRef);
      if (!eventSnap.exists()) throw new Error('EVENT_NOT_FOUND');
      const current = eventSnap.data();
      const currentSubs = Array.isArray(current.subcontratos) ? current.subcontratos : [];
      const providerSubs = currentSubs.filter(sc => sc?.proveedorId === providerData.id);
      if (!providerSubs.length) throw new Error('PROVIDER_NOT_ASSIGNED');

      let numero = providerSubs.map(sc => String(sc?.numeroSubcontratoEvento || '').trim()).find(Boolean) || '';
      if (!numero) {
        const counterSnap = await tx.get(counterRef);
        const next = (Number(counterSnap.data()?.ultimo) || 0) + 1;
        numero = `SUB-${String(next).padStart(5,'0')}`;
        tx.set(counterRef, { ultimo: next }, { merge:true });
      }

      const patchedSubs = currentSubs.map(sc => sc?.proveedorId === providerData.id
        ? { ...sc, numeroSubcontratoEvento: numero }
        : sc);
      const patch = { subcontratos: patchedSubs, updatedAt: new Date().toISOString(), _rev: (Number(current._rev)||0)+1 };
      tx.set(eventRef, patch, { merge:true });
      return { event: { ...current, ...patch, id:eventData.id }, numero };
    });

    setEventos(prev => prev.map(ev => ev.id === result.event.id ? result.event : ev));
    const asignados = (Array.isArray(result.event.subcontratos) ? result.event.subcontratos : [])
      .filter(sc => sc?.proveedorId === providerData.id)
      .map((sc, i) => ({
        id: sc.id || `asig-${i}`,
        nombre: sc.servicio || 'Servicio',
        costo: Math.max(0, utils.safeNum(sc.costo)),
        cantidad: 1,
        estadoPago: sc.estadoPago || (sc.pagado ? 'Pagado' : 'Pendiente')
      }));

    return {
      ...providerData,
      numeroSubcontrato: result.numero,
      contratoEvento: true,
      serviciosAsignados: asignados,
      totalAsignado: asignados.reduce((sum, x) => sum + utils.safeNum(x.costo), 0),
      eventoAsignado: {
        id: result.event.id,
        cliente: result.event.cliente || '',
        fecha: result.event.fecha || '',
        hora: result.event.hora || '',
        ubicacion: result.event.ubicacion || '',
        direccion: result.event.direccion || '',
        referenciaLugar: result.event.referenciaLugar || '',
        tipoEvento: result.event.tipoEvento || '',
        servicioCliente: result.event.servicio || ''
      }
    };
  }, []);

  const handleConvertirReserva = useCallback((e) => { 
      utils.triggerHaptic('light'); setModalConfig({ isOpen: true, isCotizacion: false, initialData: { ...e, estado: 'Pendiente' } }); showAlert("Confirma los datos para crear la reserva.", true); 
  }, [showAlert]);

  const handleConfirmWebRequest = useCallback(async (event, santaAsignado = '') => {
      if (!event?.id || utils.normalizeText(event.origen) !== 'web directa') return false;
      const needsTransportReview = event?.requiereRevisionUbicacion === true || /por confirmar|por revisar|fuera del area|fuera del área|despues de|después de/i.test(String(event?.ubicacion || ''));
      if (needsTransportReview && event?.transporteRevisadoEnApp !== true) {
          showAlert('Revisa y confirma el transporte de esta ubicación antes de aceptar la reserva.', false);
          return false;
      }
      try {
          utils.triggerHaptic('light');
          let confirmedData = null;
          await runTransaction(db, async tx => {
              const ref = getDocRef(event.id);
              const snap = await tx.get(ref);
              if (!snap.exists()) throw new Error('EVENT_NOT_FOUND');
              const remote = snap.data();
              if (utils.normalizeText(remote.origen) !== 'web directa') throw new Error('NOT_WEB_REQUEST');
              if (utils.normalizeText(remote.estado) !== 'pendiente') throw new Error('ALREADY_PROCESSED');
              const esNavidad = remote.esNavidad === true || /entregas de nochebuena/i.test(String(remote.servicio || ''));
              const normalResources = esNavidad ? null : inferResourceRequirements(remote);
              confirmedData = {
                  ...remote,
                  estado: 'Confirmado',
                  ...(esNavidad
                    ? { esNavidad: true, recursoNavidad: 'Santa', santaAsignado: santaAsignado || remote.santaAsignado || 'Santa 1' }
                    : { resourceRequirements: normalResources, duracionMinutos: normalResources.durationMinutes, recursosRevisadosEnApp: remote.recursosRevisadosEnApp === true }),
                  _rev: (Number(remote._rev) || 0) + 1,
                  updatedAt: new Date().toISOString()
              };
              tx.set(ref, confirmedData);
          });
          await publishSync('evento', event.id, 'update');
          setEventos(prev => prev.map(ev => ev.id === event.id ? confirmedData : ev));
          showAlert('¡Reserva web confirmada!', true);
          return true;
      } catch (err) {
          console.error('Error confirmando solicitud web:', err);
          if (err?.message === 'ALREADY_PROCESSED') showAlert('Esta solicitud ya fue procesada en otro dispositivo.', false);
          else showAlert('No se pudo confirmar la reserva. Revisa la conexión e intenta nuevamente.', false);
          return false;
      }
  }, [publishSync, showAlert]);


  const handleRejectWebRequest = useCallback(async (event) => {
      if (!event?.id || utils.normalizeText(event.origen) !== 'web directa') return false;
      try {
          utils.triggerHaptic('light');
          await transitionEventStatus(event.id, 'Rechazada', { requirePendingWeb: true, extra: { decisionSource: 'app' } });
          showAlert('Solicitud rechazada. El horario quedó liberado.', true);
          return true;
      } catch (err) {
          console.error('Error rechazando solicitud web:', err);
          if (err?.message === 'ALREADY_PROCESSED') showAlert('Esta solicitud ya fue procesada en otro dispositivo.', false);
          else showAlert('No se pudo rechazar la reserva. Revisa la conexión e intenta nuevamente.', false);
          return false;
      }
  }, [transitionEventStatus, showAlert]);

  const handleUpdateWebRequest = useCallback(async (event, patch) => {
      if (!event?.id || utils.normalizeText(event.origen) !== 'web directa') return null;
      try {
          const saved = await patchEventoAtomic(event.id, {
              ...patch,
              decisionSource: 'app',
              updatedAt: new Date().toISOString()
          });
          const merged = { ...event, ...saved, ...patch };
          setEventos(prev => prev.map(ev => ev.id === event.id ? merged : ev));
          showAlert('Solicitud actualizada.', true);
          return merged;
      } catch (err) {
          console.error('Error actualizando solicitud web:', err);
          showAlert('No se pudo actualizar la solicitud.', false);
          return null;
      }
  }, [patchEventoAtomic, showAlert]);

  const handleSaveFromModal = useCallback(async (formDataToSave, isCotizacionMode) => {
    if (!formDataToSave.cliente?.trim()) return showAlert("Por favor, ingresa el nombre del cliente."); 
    if (!formDataToSave.fecha) return showAlert("Por favor, selecciona la fecha."); 
    
    utils.triggerHaptic('light'); 
    const evtId = (formDataToSave.id && !formDataToSave.isDuplicated) ? formDataToSave.id : (isCotizacionMode ? `cot-${Date.now()}` : `man-${Date.now()}`); 
    const { isDuplicated, ...cleanFormData } = formDataToSave; 

    // Cotizaciones: nunca se toma el total desde el catálogo completo ni desde un total
    // arrastrado por una edición anterior. Se calcula solo con los servicios seleccionados.
    if (isCotizacionMode) {
        const summaryBeforeSave = String(cleanFormData.servicio || '')
            .split(/\s+\+\s+/)
            .map(x => x.replace(/\s*\(x\d+\)\s*$/i, '').trim())
            .filter(Boolean)
            .map(x => utils.normalizeText(x));
        let selected = (Array.isArray(cleanFormData.serviciosSeleccionados) ? cleanFormData.serviciosSeleccionados : [])
            .filter(s => s && String(s.nombre || '').trim())
            .map(s => ({ ...s, cantidad: Math.max(1, Number(s.cantidad) || 1), precio: Math.max(0, utils.safeNum(s.precio)) }));
        // Si una cotización antigua quedó contaminada con artículos del inventario,
        // conserva únicamente los nombres que el propio documento decía haber seleccionado.
        if (summaryBeforeSave.length && selected.length) {
            const allowed = new Set(summaryBeforeSave);
            selected = selected.filter(s => allowed.has(utils.normalizeText(s?.nombre || '').trim()));
        }
        if (!selected.length) return showAlert('Agrega al menos un servicio a la cotización.', false);
        cleanFormData.serviciosSeleccionados = selected;
        cleanFormData.servicio = selected.map(s => s.cantidad > 1 ? `${s.nombre} (x${s.cantidad})` : s.nombre).join(' + ');
        // Regenerar la descripción desde la selección actual impide que texto viejo del
        // inventario completo reaparezca en el PDF al editar una cotización antigua.
        cleanFormData.descripcionEvento = selected.map(s => {
            const detalles = Array.isArray(s.incluye) ? s.incluye.map(x => String(x || '').trim()).filter(Boolean) : [];
            return [String(s.nombre || '').trim(), String(s.descripcion || '').trim(), detalles.length ? `Todo lo que incluye:\n${detalles.map(x => `• ${x}`).join('\n')}` : ''].filter(Boolean).join('\n');
        }).join('\n\n');
        const quoteSubtotal = selected.reduce((sum, s) => sum + utils.safeNum(s.precio), 0);
        cleanFormData.total = Number((quoteSubtotal + Math.max(0, utils.safeNum(cleanFormData.transporte))).toFixed(2));
    }
    
    if (!formDataToSave.id || isDuplicated) { 
        if (isCotizacionMode && !cleanFormData.estado.includes('Cot')) cleanFormData.estado = 'Cotización';
        if (isCotizacionMode && !cleanFormData.fechaEmisionCotizacion) cleanFormData.fechaEmisionCotizacion = utils.getLocalYYYYMMDD(new Date());
        if (isCotizacionMode) cleanFormData.vigenciaCotizacion = Math.max(1, Math.round(utils.safeNum(cleanFormData.vigenciaCotizacion) || 7)); 
        if (!isCotizacionMode && cleanFormData.estado.includes('Cot')) cleanFormData.estado = 'Pendiente'; 
    } 
    
    const safeData = JSON.parse(JSON.stringify({ ...cleanFormData, id: evtId, createdAt: cleanFormData.createdAt || new Date().toISOString(), deletedLocally: false, costosSeparados: true })); 
    if (modalConfig.initialData?.fecha !== safeData.fecha || modalConfig.initialData?.hora !== safeData.hora) safeData.colisionAprobada = false;
    
    const estNormal = utils.normalizeText(safeData.estado);
    const isCotiz = estNormal.includes('cotizaci') || estNormal.includes('cot.'); 
    const hasCollision = !isCotiz && eventosActivos.some(e => { 
        if (e.id === evtId || isArchivedReservation(e) || utils.normalizeText(e.estado).includes('cotizaci') || utils.normalizeText(e.estado).includes('cot.') || e.fecha !== safeData.fecha) return false; 
        if (!e.hora || !safeData.hora) return false; 
        const [h1, m1] = e.hora.split(':').map(Number), [h2, m2] = safeData.hora.split(':').map(Number); 
        return Math.abs((h1 * 60 + m1) - (h2 * 60 + m2)) < 180; 
    });
    
    const guardarReservaFinal = async (id, dataToSave) => {
        try {
            let savedData = dataToSave;
            const isExisting = Boolean(formDataToSave.id && !formDataToSave.isDuplicated);
            if (isExisting) {
                await runTransaction(db, async (tx) => {
                    const ref = getDocRef(id);
                    const snap = await tx.get(ref);
                    if (!snap.exists()) throw new Error('EVENT_NOT_FOUND');
                    const remote = snap.data();
                    const remoteRev = Number(remote._rev) || 0;
                    const openedRev = Number(modalConfig.initialData?._rev) || 0;
                    if (remoteRev !== openedRev) throw new Error('EDIT_CONFLICT');
                    savedData = {
                        ...dataToSave,
                        total:Number(utils.safeNum(dataToSave.total).toFixed(2)),
                        abono:Number(utils.safeNum(dataToSave.abono).toFixed(2)),
                        _rev: remoteRev + 1,
                        updatedAt: new Date().toISOString()
                    };
                    // Merge protege metadatos/bitácoras creados por otros flujos y, sobre todo,
                    // evita que una edición de datos generales reemplace información financiera.
                    tx.set(ref, savedData, {merge:true});
                });
            } else {
                savedData = { ...dataToSave, total:Number(utils.safeNum(dataToSave.total).toFixed(2)), abono:Number(utils.safeNum(dataToSave.abono).toFixed(2)), _rev: 1, updatedAt: new Date().toISOString() };
                await setDoc(getDocRef(id), savedData);
            }
            await publishSync('evento', id, 'update');
            setEventos(prev => { const arr = [...prev]; const i = arr.findIndex(x=>x.id===id); if(i>-1) arr[i]=savedData; else arr.push(savedData); return arr; });
            closeModal();
            utils.setSafeLocal('diverty_form_draft', '');
            showAlert(isCotizacionMode ? "¡Cotización guardada!" : "¡Reserva guardada!", true);
            if (isCotizacionMode && (!formDataToSave.id || formDataToSave.isDuplicated)) { try { const numberedQuote = await ensureDocumentNumber({ ...savedData }, 'cotizacion'); setPrintData(numberedQuote); setPrintType('cotizacion'); setIsPrinting(true); } catch (_) {} }
        } catch (err) {
            console.error("Error guardando reserva:", err);
            if (err?.message === 'EDIT_CONFLICT') {
                showAlert("Esta reserva cambió en otro dispositivo mientras la editabas. Ciérrala, vuelve a abrirla y aplica tu cambio sobre la versión actualizada.", false);
                return;
            }
            showAlert("No se pudo guardar en Firebase. Revisa tu conexión e intenta nuevamente.", false);
        }
    };
    
    if (hasCollision && !safeData.colisionAprobada) showConfirm("Hay otro evento con menos de 3 horas de diferencia. ¿Guardar de todos modos?", () => { safeData.colisionAprobada = true; guardarReservaFinal(evtId, safeData); }); 
    else guardarReservaFinal(evtId, safeData);
  }, [eventosActivos, closeModal, showAlert, modalConfig, showConfirm, publishSync, ensureDocumentNumber]);

  // NAVIDAD: `slot_santa_*` es un contador auxiliar para evitar sobreventas en la web.
  // Si una reserva de prueba fue movida/eliminada con una versión anterior de la app,
  // puede quedar un contador huérfano y bloquear un horario aunque ya no exista la reserva.
  // Esta reconciliación toma `eventos` como fuente de verdad y reconstruye únicamente
  // los cupos del 24 y 25 de diciembre, sin tocar reservas de otras fechas.
  const reconcileChristmasAvailability = useCallback(async () => {
      if (!firebaseUser) return;
      const eventsRef = collection(db, 'artifacts', appId, 'public', 'data', 'eventos');
      const availabilityCol = collection(db, 'artifacts', appId, 'public', 'data', 'disponibilidad_web');
      const [eventsSnap, availabilitySnap] = await Promise.all([
          getDocs(query(eventsRef, where('fecha','>=','2026-12-24'), where('fecha','<=','2026-12-25'))),
          getDocs(query(availabilityCol, where('fecha','>=','2026-12-24'), where('fecha','<=','2026-12-25')))
      ]);

      const eventRows = eventsSnap.docs.filter(d => !d.data()?._system).map(d => ({ id:d.id, ...d.data() }));
      const eventById = new Map(eventRows.map(ev => [String(ev.id), ev]));
      const isChristmas = ev =>
          (ev?.esNavidad === true || /entregas de nochebuena/i.test(String(ev?.servicio || ''))) &&
          ['2026-12-24','2026-12-25'].includes(String(ev?.fecha || ''));
      const isActiveChristmas = ev => isChristmas(ev) && publicSlot(ev) !== null;
      const activeChristmas = eventRows.filter(isActiveChristmas);
      const capacity = Math.max(1, Number(christmasSantaCapacity) || 1);

      const grouped = new Map();
      activeChristmas.forEach(ev => {
          if (!ev.hora) return;
          const safeSlot = `${String(ev.fecha)}_${String(ev.hora).replace(':','-')}`.replace(/[^0-9A-Za-z_-]/g,'');
          const key = `slot_santa_${safeSlot}`;
          if (!grouped.has(key)) grouped.set(key, { fecha:String(ev.fecha), hora:String(ev.hora), ids:[] });
          grouped.get(key).ids.push(String(ev.id));
      });

      let batch = writeBatch(db);
      let writes = 0;
      const commitIfNeeded = async (force = false) => {
          if (!writes) return;
          if (!force && writes < 400) return;
          await batch.commit();
          batch = writeBatch(db);
          writes = 0;
      };
      const queueSet = async (ref, data) => { batch.set(ref, data); writes++; await commitIfNeeded(false); };
      const queueDelete = async ref => { batch.delete(ref); writes++; await commitIfNeeded(false); };

      // Repara también los documentos individuales que la web usa para rutas y cupos.
      for (const ev of eventRows) {
          const slot = publicSlot(ev);
          const ref = availabilityRef(ev.id);
          if (slot) await queueSet(ref, slot);
          else await queueDelete(ref);
      }

      // Borra documentos individuales huérfanos del 24/25 que ya no tienen evento.
      for (const row of availabilitySnap.docs) {
          if (row.id.startsWith('slot_')) continue;
          if (!eventById.has(String(row.id))) await queueDelete(row.ref);
      }

      // Reconstruye los contadores de Santa y elimina contadores fantasmas.
      const existingSantaSlots = new Map(availabilitySnap.docs
          .filter(d => d.id.startsWith('slot_santa_'))
          .map(d => [d.id, d]));
      for (const [slotId, info] of grouped) {
          const ids = Array.from(new Set(info.ids));
          await queueSet(availabilityRef(slotId), {
              fecha: info.fecha,
              hora: info.hora,
              count: ids.length,
              capacity,
              reservationIds: ids,
              updatedAt: new Date().toISOString()
          });
          existingSantaSlots.delete(slotId);
      }
      for (const stale of existingSantaSlots.values()) await queueDelete(stale.ref);
      await commitIfNeeded(true);
  }, [firebaseUser, christmasSantaCapacity]);

  useEffect(() => {
      if (!firebaseUser || !isChristmasOpsOpen) return;
      reconcileChristmasAvailability().catch(err => console.warn('No se pudo reconciliar disponibilidad de Navidad:', err));
  }, [firebaseUser, isChristmasOpsOpen, reconcileChristmasAvailability]);

  const deleteEventoSynced = useCallback(async (id) => {
      if (!id) throw new Error('EVENT_ID_REQUIRED');
      let deletedWasChristmas = false;
      await rawRunTransaction(db, async tx => {
          const eventRef = getDocRef(id);
          const eventSnap = await tx.get(eventRef);
          if (!eventSnap.exists()) return;
          const ev = eventSnap.data() || {};
          const esNavidad = ev.esNavidad === true || /entregas de nochebuena/i.test(String(ev.servicio || ''));
          deletedWasChristmas = esNavidad;
          let slotRef = null;
          let slotSnap = null;
          if (ev.fecha && ev.hora) {
              const safeSlot = `${String(ev.fecha)}_${String(ev.hora).replace(':','-')}`.replace(/[^0-9A-Za-z_-]/g,'');
              slotRef = availabilityRef(`${esNavidad ? 'slot_santa_' : 'slot_'}${safeSlot}`);
              slotSnap = await tx.get(slotRef);
          }
          tx.delete(eventRef);
          tx.delete(availabilityRef(id));
          tx.delete(clientStatusRef(id));
          // Remove this reservation from the internal capacity lock as well. Old versions
          // only did this for Santa, which left normal dates blocked after deleting tests.
          if (slotRef && slotSnap?.exists()) {
              const slot = slotSnap.data() || {};
              const ids = Array.isArray(slot.reservationIds)
                  ? slot.reservationIds.map(String).filter(x => x !== String(id))
                  : [];
              if (ids.length <= 0) tx.delete(slotRef);
              else tx.set(slotRef, { ...slot, count: ids.length, reservationIds: ids, updatedAt: new Date().toISOString() });
          }
      });
      // Christmas also keeps its dedicated route/capacity reconciliation.
      if (deletedWasChristmas) {
          try { await reconcileChristmasAvailability(); }
          catch (err) { console.warn('Reserva eliminada; quedó pendiente reconciliar cupos de Navidad:', err); }
      }
  }, [reconcileChristmasAvailability]);

  const handleDeleteEvento = useCallback((id) => showConfirm("¿Eliminar registro permanentemente?", async () => {
      utils.triggerHaptic('light');
      try {
          // Eliminación real: evita que registros borrados sigan ocupando la colección
          // y vuelvan a descargarse en futuras sincronizaciones de Firestore.
          await deleteEventoSynced(id);
          await publishSync('evento', id, 'delete');
          setEventos(prev => prev.filter(e => e.id !== id));
          historyLoadedRef.current = false;
          closeModal();
          showAlert("Registro eliminado.", true);
      } catch (err) {
          console.error("Error eliminando registro:", err);
          showAlert("No se pudo eliminar el registro. Intenta nuevamente.", false);
      }
  }), [closeModal, showConfirm, showAlert, publishSync, deleteEventoSynced]);
  const handleDeleteClient = useCallback((client, eventCount) => { const clientName = client?.nombre || 'Cliente'; const mensaje = eventCount > 0 ? `¿Seguro que deseas ocultar este cliente? Tiene ${eventCount} evento(s) asociado(s).` : `¿Seguro que deseas ocultar este cliente?`; showConfirm(mensaje, async () => { utils.triggerHaptic('light'); const marker = client?.clientKey ? `key:${client.clientKey}` : clientName; const newHidden = [...new Set([...hiddenClients, marker])]; setHiddenClients(newHidden); if (firebaseUser) await setDoc(getConfigRef('clientesOcultos'), { clients: newHidden }, { merge: true }); showAlert("Cliente ocultado del CRM. Sus eventos se conservan.", true); }); }, [hiddenClients, firebaseUser, showConfirm, showAlert]);
  const handleWipeAll = useCallback(() => showConfirm("⚠️ ¿Limpiar toda la base de datos?", async () => {
      utils.triggerHaptic('light');
      try {
          // Para una purga total sí se consulta explícitamente toda la colección.
          const [allSnap, availabilitySnap] = await Promise.all([
              getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'eventos')),
              getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'disponibilidad_web'))
          ]);
          await Promise.all(allSnap.docs.filter(d => !d.data()?._system).map(d => deleteDoc(getDocRef(d.id))));
          // A total wipe must also remove transaction locks (slot_*), otherwise the
          // public calendar can keep showing dates as occupied with no events left.
          let cleanupBatch = writeBatch(db), cleanupWrites = 0;
          for (const row of availabilitySnap.docs) {
              cleanupBatch.delete(row.ref); cleanupWrites++;
              if (cleanupWrites >= 350) { await cleanupBatch.commit(); cleanupBatch = writeBatch(db); cleanupWrites = 0; }
          }
          if (cleanupWrites) await cleanupBatch.commit();
          historyLoadedRef.current = true;
          setEventos([]);
          utils.triggerHaptic('success');
          showAlert("Base de datos limpiada.", true);
      } catch (err) {
          console.error("Error limpiando base de datos:", err);
          showAlert("No se pudo completar la limpieza. Intenta nuevamente.", false);
      }
  }), [eventosActivos, showConfirm, showAlert]);
  const handleViewDoc = useCallback(async (e, type) => {
      try {
          utils.triggerHaptic('light');
          const numbered = await ensureDocumentNumber(e, type);
          setPrintData(numbered);
          setPrintType(type);
          setIsPrinting(true);
      } catch (err) { console.error(err); showAlert("No se pudo asignar el número. Revisa la conexión y vuelve a intentar.", false); }
  }, [ensureDocumentNumber, showAlert]);
  
  const handleSaveClientName = useCallback(async (oldName, newName, clientKey) => {
      const newKey = utils.normalizeText(newName);
      if(!newName.trim() || utils.normalizeText(oldName) === newKey) { setClientEditModal({ isOpen: false, oldName: '', clientKey: '' }); return; }
      const eventsToUpdate = eventosActivos.filter(e => clientKey ? getClientKey(e) === clientKey : utils.normalizeText(e.cliente) === utils.normalizeText(oldName));
      try {
          await Promise.all(eventsToUpdate.map(e => patchEventoAtomic(e.id, { cliente: newName.trim() })));
          const ids = new Set(eventsToUpdate.map(e => e.id));
          setEventos(prev => prev.map(e => ids.has(e.id) ? { ...e, cliente: newName.trim() } : e));
          utils.triggerHaptic('success');
          showAlert(`Cliente actualizado en ${eventsToUpdate.length} evento(s).`, true);
          setClientEditModal({ isOpen: false, oldName: '', clientKey: '' });
      } catch (err) {
          console.error("Error actualizando cliente:", err);
          showAlert("No se pudo actualizar el cliente en Firebase.", false);
      }
  }, [eventosActivos, showAlert, patchEventoAtomic]);

  const handleSaveProveedor = useCallback(async (data) => {
      const provId = data.id || `prov-${Date.now()}`; const payload = { ...data, id: provId };
      try {
          await setDoc(getProvRef(provId), { ...payload, updatedAt: new Date().toISOString() });
          await publishSync('proveedor', provId, 'update');
          setProveedores(prev => { const next = prev.filter(p => p.id !== provId); next.push(payload); return next; });
          utils.triggerHaptic('success');
          showAlert(data.id ? "Proveedor actualizado" : "Proveedor registrado", true);
          setProveedorModal({ isOpen: false, data: null });
      } catch (err) {
          console.error("Error guardando proveedor:", err);
          showAlert("No se pudo guardar el proveedor. Intenta nuevamente.", false);
      }
  }, [showAlert, publishSync]);

  const handleDeleteProveedor = useCallback((id) => { showConfirm("¿Eliminar este proveedor de la agenda?", async () => {
      utils.triggerHaptic('light');
      try { await deleteDoc(getProvRef(id)); await publishSync('proveedor', id, 'delete'); setProveedores(prev => prev.filter(p => p.id !== id)); showAlert("Proveedor eliminado", true); }
      catch (err) { console.error("Error eliminando proveedor:", err); showAlert("No se pudo eliminar el proveedor.", false); }
  }); }, [showConfirm, showAlert, publishSync]);
  const sendWhatsAppCall = useCallback((e, type, empresaSettings) => { utils.triggerHaptic('success'); const msg = getWhatsAppMessage(e, type, empresaSettings || appSettings.empresa), phoneClean = String(e.telefono).replace(/\D/g,''); utils.openWhatsAppBusiness(phoneClean, msg); }, [appSettings.empresa]);
  const openGoogleMaps = useCallback((dir, ubi, eventData = null) => {
    utils.triggerHaptic('light');
    const rawDir = String(dir || '').trim();
    const rawUbi = String(ubi || '').trim();
    const mapUrlMatch = rawDir.match(/https?:\/\/(?:www\.)?(?:(?:google\.[^\s/]+\/maps|maps\.google\.[^\s/]+)|maps\.app\.goo\.gl)[^\s]*/i);
    const gps = christmasEventGps(eventData || { direccion:rawDir });
    const queryText = [rawDir.replace(/https?:\/\/\S+/g,'').trim(), rawUbi, 'Panamá'].filter(Boolean).join(' ').trim();

    let googleUrl = '';
    let wazeUrl = '';
    if (gps) {
        googleUrl = mapUrlMatch?.[0] || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${gps.lat},${gps.lng}`)}`;
        wazeUrl = `https://www.waze.com/ul?ll=${encodeURIComponent(`${gps.lat},${gps.lng}`)}&navigate=yes`;
    } else {
        googleUrl = mapUrlMatch?.[0] || `https://maps.google.com/maps?q=${encodeURIComponent(queryText || rawDir || rawUbi)}`;
        wazeUrl = `https://www.waze.com/ul?q=${encodeURIComponent(queryText || rawUbi || rawDir)}&navigate=yes`;
    }

    setNavigationModal({
        isOpen:true,
        googleUrl,
        wazeUrl,
        label: rawUbi || String(eventData?.referenciaLugar || '').trim() || 'Ubicación de la reserva'
    });
  }, []);
  const printNativePDF = useCallback(() => { utils.triggerHaptic('success'); window.print(); }, []);

  const downloadPDF = useCallback(async () => {
    utils.triggerHaptic('success'); if (!window.html2pdf) { showAlert("El generador de PDF aún está cargando. Intenta en unos segundos.", false); return; }
    const element = document.getElementById('pdf-content'), wrapper = document.getElementById('pdf-wrapper-scaler'); if (!element) { showAlert("Error al localizar el documento para PDF.", false); return; }
    showAlert("Generando PDF... por favor espera.", true); 
    let oldTransform = '', oldPosition = ''; 
    if (wrapper) { oldTransform = wrapper.style.transform; oldPosition = wrapper.style.position; wrapper.style.transform = 'scale(1)'; wrapper.style.position = 'relative'; }
    const oldScrollY = window.scrollY; window.scrollTo(0, 0);
    try {
        if (document.fonts?.ready) { try { await document.fonts.ready; } catch (_) {} }
        const imgs = Array.from(element.querySelectorAll('img'));
        await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(resolve => { img.onload = resolve; img.onerror = resolve; })));
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const docName = printData?.cliente ? String(printData.cliente).replace(/[^a-z0-9]/gi, '_') : (printData?.nombre ? String(printData.nombre).replace(/[^a-z0-9]/gi, '_') : 'Documento'); 
        const filePrefix = printType === 'cotizacion' ? 'Cotizacion' : (printType === 'contrato' ? 'Contrato' : (printType === 'contrato_proveedor' ? 'Subcontrato' : 'Factura'));
        const fileName = `${filePrefix}_Diverty_${docName}.pdf`;
        const opt = { margin: 0, filename: fileName, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff", windowWidth: 794, width: 794 }, jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' } };
        await window.html2pdf().set(opt).from(element).save(); showAlert("¡PDF descargado con éxito!", true); 
    } catch (error) { console.error("Error PDF:", error); showAlert("Hubo un error de procesamiento. Mostrando diálogo de impresión nativo...", false); printNativePDF(); } finally { if (wrapper) { wrapper.style.transform = oldTransform; wrapper.style.position = oldPosition; } window.scrollTo(0, oldScrollY); }
  }, [printData, printType, showAlert, printNativePDF]);

  const handleSharePDF = useCallback(async () => {
    utils.triggerHaptic('success'); if (!window.html2pdf) { showAlert("Cargando generador...", false); return; }
    const element = document.getElementById('pdf-content'), wrapper = document.getElementById('pdf-wrapper-scaler'); if (!element) return; showAlert("Preparando PDF para compartir...", true);
    let oldTransform = '', oldPosition = ''; 
    if (wrapper) { oldTransform = wrapper.style.transform; oldPosition = wrapper.style.position; wrapper.style.transform = 'scale(1)'; wrapper.style.position = 'relative'; } 
    const oldScrollY = window.scrollY; window.scrollTo(0, 0);
    try {
        if (document.fonts?.ready) { try { await document.fonts.ready; } catch (_) {} }
        const imgs = Array.from(element.querySelectorAll('img'));
        await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(resolve => { img.onload = resolve; img.onerror = resolve; })));
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); 
        const docName = printData?.cliente ? String(printData.cliente).replace(/[^a-z0-9]/gi, '_') : (printData?.nombre ? String(printData.nombre).replace(/[^a-z0-9]/gi, '_') : 'Documento'); 
        const filePrefix = printType === 'cotizacion' ? 'Cotizacion' : (printType === 'contrato' ? 'Contrato' : (printType === 'contrato_proveedor' ? 'Subcontrato' : 'Factura'));
        const fileName = `${filePrefix}_Diverty_${docName}.pdf`;
        const opt = { margin: 0, filename: fileName, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff", windowWidth: 794, width: 794 }, jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' } };
        const pdfBlob = await window.html2pdf().set(opt).from(element).output('blob'); if (!pdfBlob) throw new Error("Blob vacío");
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        let msgType = 'recibo';
        if (printType === 'cotizacion') msgType = 'cotizacion';
        if (printType === 'contrato_proveedor') msgType = 'contrato_prov';
        const msg = getWhatsAppMessage(printData, msgType, appSettings.empresa);
        if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: fileName, text: msg }); } else { showAlert("No se pudo compartir en tu dispositivo. Descargando...", false); await window.html2pdf().set(opt).from(element).save(); const phoneClean = String(printData?.telefono || '').replace(/\D/g,''); utils.openWhatsAppBusiness(phoneClean, msg); }
    } catch (error) { console.error("Share error:", error); if (error?.name !== 'AbortError') { showAlert("Error al compartir. Usa el botón Guardar.", false); } } finally { if (wrapper) { wrapper.style.transform = oldTransform; wrapper.style.position = oldPosition; } window.scrollTo(0, oldScrollY); }
  }, [printData, printType, appSettings, showAlert]);

  const downloadExcel = useCallback(() => {
    utils.triggerHaptic('success'); const filteredForExport = eventosActivos.filter(e => { const est = utils.normalizeText(e.estado); if (isArchivedReservation(e) || isPendingWebRequest(e) || est.includes('cotizaci') || est.includes('cot.') || utils.safeNum(e.total) <= 0) return false; if (financePeriod === 'todos') return true; const fStr = String(e.fecha || ''); if (fStr) { const [ey, em] = fStr.split('-'); if (financePeriod === 'anio') return parseInt(ey) === financeYear; return parseInt(ey) === financeYear && parseInt(em) === financeMonth; } return false; });
    let csv = 'Fecha,Cliente,Tipo Evento,Ubicacion,Facturado,Cobrado,Por Cobrar,Gastos Internos,Personal,Transporte,Globos-Materiales,Otros,Proveedores,Costos Totales,Ganancia Estimada,Estado\n'; filteredForExport.forEach(e => { const t = utils.safeNum(e.total), cobrado = Math.min(utils.safeNum(e.abono), t), pendiente = Math.max(t - utils.safeNum(e.abono), 0), gi = getGastosInternosEvento(e), gb = getExpenseBreakdownEvento(e), prov = getCostoProveedoresEvento(e), g = gi + prov; csv += `"${e.fecha||''}","${String(e.cliente||'').replace(/,/g,'')}","${String(e.tipoEvento||'').replace(/,/g,'')}","${String(e.ubicacion||'').replace(/,/g,'')}",${t},${cobrado},${pendiente},${gi},${gb.personal},${gb.transporte},${gb.globos},${gb.otros},${prov},${g},${t-g},"${e.estado||''}"\n`; });
    const blob = new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' }), url = URL.createObjectURL(blob), link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `Reporte_Finanzas_Diverty_${financePeriod === 'todos' ? 'Historico' : financePeriod === 'anio' ? `Anual_${financeYear}` : `${NOMBRES_MESES[financeMonth - 1]}_${financeYear}`}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }, [eventosActivos, financePeriod, financeYear, financeMonth]);

  const handleLogin = useCallback(async (e) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, emailInput, passwordInput); utils.triggerHaptic('success'); setEmailInput(''); setPasswordInput(''); } catch (error) { utils.triggerHaptic('warning'); showAlert("Credenciales incorrectas", false); } }, [emailInput, passwordInput, showAlert]);
  const handleLogout = useCallback(async () => { try { await signOut(auth); } catch (error) { showAlert("Error al cerrar sesión"); } }, [showAlert]);
  const handleCopiarCobros = useCallback(() => { utils.triggerHaptic('success'); let text = "📋 *REPORTE DE COBROS PENDIENTES* 📋\n\n"; eventosActivos.filter(e => { const est = utils.normalizeText(e.estado); return (utils.safeNum(e.total) - utils.safeNum(e.abono)) > 0 && !isArchivedReservation(e) && !isPendingWebRequest(e) && !est.includes('cotizaci') && !est.includes('cot.'); }).forEach(e => { text += `👤 *${e.cliente}*\n📅 Fecha: ${e.fecha}\n💰 Debe: $${(utils.safeNum(e.total) - utils.safeNum(e.abono)).toFixed(2)}\n📞 WA: ${e.telefono}\n\n`; }); navigator.clipboard.writeText(text); showAlert("Lista de cobros copiada al portapapeles", true); }, [eventosActivos, showAlert]);

  const activarNotificaciones = useCallback(async () => {
    if (!messaging) { showAlert("Notificaciones no disponibles.", false); return; }
    try { if (!('Notification' in window)) { showAlert("Navegador no soporta notificaciones.", false); return; } if (!('serviceWorker' in navigator)) { showAlert("Service Worker no disponible.", false); return; } const permiso = await Notification.requestPermission(); if (permiso !== "granted") { showAlert("Debes permitir notificaciones", false); return; } showAlert("Generando token, espera...", true); const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { updateViaCache: 'none' }); await swRegistration.update().catch(() => {}); await navigator.serviceWorker.ready; const token = await getToken(messaging, { vapidKey: "BEmGfQ2ANNd-fwu25Nd7OyRnzCbX8pdIoYxreafTsk5R5PKoAIfom-tDJIMS4Slpu5XjK0vvwLxHCS5_09B8YrQ", serviceWorkerRegistration: swRegistration }); if (token) { await setDoc(doc(db, "tokens", token), { token: token, createdAt: new Date(), updatedAt: new Date(), userAgent: navigator.userAgent || '', enabled: true }); console.log("Token guardado:", token); showAlert("✅ ¡Notificaciones activadas!", true); } else { showAlert("No se generó ningún token.", false); } } catch (error) { console.error("Error obteniendo token:", error); const detalle = error?.code || error?.name || error?.message || "desconocido"; showAlert(`Error al obtener token: ${detalle}`, false); }
  }, [messaging, showAlert]);

  useEffect(() => {
    if (!db || !appId || !firebaseUser) return; historyLoadedRef.current = false; const timeoutId = setTimeout(() => { setIsDBReady(true); }, 3500); 
    const eventosRef = collection(db, 'artifacts', appId, 'public', 'data', 'eventos');
    const provRef = collection(db, 'artifacts', appId, 'public', 'data', 'proveedores');

    // TIEMPO REAL OPERATIVO: Diverty trabaja con HOY + reservas futuras.
    // Las reservas completadas/pasadas quedan en segundo plano y el historial completo
    // solo se carga cuando el usuario entra a Clientes, Finanzas, Proveedores o Historial.
    const hoyOperativo = new Date();
    hoyOperativo.setHours(0, 0, 0, 0);
    const hoyOperativoStr = utils.getLocalYYYYMMDD(hoyOperativo);
    const eventosOperativosQuery = query(eventosRef, where('fecha', '>=', hoyOperativoStr));
    // Cotizaciones activas deben seguir visibles aunque su fecha haya pasado.
    // Es una consulta pequeña por estado; no descarga el historial de cotizaciones rechazadas/completadas.
    const cotizacionesActivasQuery = query(eventosRef, where('estado', 'in', ['Cotización', 'Cot. Aprobada']));

    // Reutilizar historial que ya exista en IndexedDB sin generar lecturas facturables.
    getDocsFromCache(eventosRef).then(cacheSnap => {
        if (cacheSnap.empty) return;
        const cached = cacheSnap.docs.filter(d => !d.data()?._system).map(d => ({ id: d.id, ...d.data() }));
        setEventos(prev => {
            const map = new Map(prev.map(e => [e.id, e]));
            cached.forEach(e => map.set(e.id, e));
            return Array.from(map.values());
        });
    }).catch(() => {});

    const unsubscribeEventos = onSnapshot(eventosOperativosQuery, (snapshot) => { 
        clearTimeout(timeoutId);
        snapshot.docChanges().forEach((change) => { 
            if (change.type === "added") { 
                const data = change.doc.data();
                const estadoNormal = utils.normalizeText(data.estado);
                const esCotizacion = estadoNormal.includes('cotizaci') || estadoNormal.includes('cot.');
                const esWeb = utils.normalizeText(data.origen) === 'web directa';
                const createdMs = data.createdAt ? new Date(data.createdAt).getTime() : NaN;
                const esReciente = Number.isFinite(createdMs) && Math.abs(Date.now() - createdMs) < 300000;
                if (!esCotizacion && esWeb && esReciente) {
                    utils.triggerHaptic('success');
                    showAlert(`🔔 Nueva solicitud web: ${data.cliente}`, true);
                } 
            } 
        });

        setEventos(prev => {
            const map = new Map(prev.map(e => [e.id, e]));
            snapshot.docChanges().forEach(change => {
                const id = change.doc.id;
                if (change.type === 'removed') {
                    map.delete(id);
                } else {
                    map.set(id, { id, ...change.doc.data() });
                }
            });
            return Array.from(map.values());
        });
        setIsDBReady(true); 
    }, (error) => { 
        console.warn("Firestore offline:", error); clearTimeout(timeoutId); setIsDBReady(true); 
    });

    // TIEMPO REAL DE COTIZACIONES ACTIVAS: mantiene pendientes/aprobadas visibles
    // incluso si la fecha del evento ya pasó. Al rechazarlas dejan de ser operativas.
    const unsubscribeCotizaciones = onSnapshot(cotizacionesActivasQuery, (snapshot) => {
        setEventos(prev => {
            const map = new Map(prev.map(e => [e.id, e]));
            snapshot.docChanges().forEach(change => {
                if (change.type !== 'removed') {
                    const id = change.doc.id;
                    map.set(id, { id, ...change.doc.data() });
                }
                // No borramos aquí un 'removed': puede haberse convertido en reserva
                // y el listener de reservas futuras pasa a ser su fuente en tiempo real.
            });
            return Array.from(map.values());
        });
    }, (error) => console.warn('No se pudieron sincronizar cotizaciones activas:', error));
    
    // Proveedores cambian desde esta misma app: una lectura inicial es suficiente.
    // Guardar/eliminar actualiza el estado local, evitando otro listener permanente.
    getDocs(provRef).then((snapshot) => {
        setProveedores(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
    }).catch(error => console.warn('No se pudieron cargar proveedores:', error));

    getDoc(getConfigRef('serviciosCustom')).then((docSnap) => { if (docSnap.exists()) { setCatalogoPaquetes(docSnap.data().paquetes || []); } }); 
    getDoc(getConfigRef('clientesOcultos')).then((docSnap) => { if (docSnap.exists()) { setHiddenClients(docSnap.data().clients || []); } }); 

    // BUS MULTIDISPOSITIVO: un solo documento avisa qué registro cambió. Los otros equipos
    // descargan únicamente ese documento, en vez de volver a leer colecciones completas.
    let syncInitialized = false;
    const unsubscribeSyncBus = onSnapshot(getConfigRef('syncBus'), async (syncSnap) => {
        if (!syncSnap.exists()) return;
        const signal = syncSnap.data() || {};
        if (!syncInitialized) { syncInitialized = true; return; }
        if (!signal.entityType || signal.deviceId === deviceIdRef.current) return;
        try {
            if (signal.entityType === 'evento') {
                if (signal.action === 'delete') {
                    setEventos(prev => prev.filter(e => e.id !== signal.entityId));
                } else if (signal.entityId) {
                    const changed = await getDoc(getDocRef(signal.entityId));
                    if (changed.exists()) {
                        const fresh = { id: changed.id, ...changed.data() };
                        setEventos(prev => { const map = new Map(prev.map(e => [e.id, e])); map.set(fresh.id, fresh); return Array.from(map.values()); });
                    } else setEventos(prev => prev.filter(e => e.id !== signal.entityId));
                }
            } else if (signal.entityType === 'proveedor') {
                if (signal.action === 'delete') setProveedores(prev => prev.filter(p => p.id !== signal.entityId));
                else if (signal.entityId) {
                    const changed = await getDoc(getProvRef(signal.entityId));
                    if (changed.exists()) {
                        const fresh = { id: changed.id, ...changed.data() };
                        setProveedores(prev => { const map = new Map(prev.map(p => [p.id, p])); map.set(fresh.id, fresh); return Array.from(map.values()); });
                    }
                }
            }
        } catch (err) { console.warn('Error sincronizando cambio de otro dispositivo:', err); }
    }, (err) => console.warn('Sync multidispositivo no disponible:', err));
    
    return () => { unsubscribeEventos(); unsubscribeCotizaciones(); unsubscribeSyncBus(); clearTimeout(timeoutId); };
  }, [db, appId, firebaseUser, showAlert]);

  const renderInicio = () => {
     if (isModoOperativo) {
        const faltanAbono = stats.eventosHoy.filter(e => utils.safeNum(e.abono) <= 0 && utils.normalizeText(e.estado) !== 'completado'), 
              faltanDireccion = stats.eventosHoy.filter(e => (!e.direccion || String(e.direccion).trim() === '') && utils.normalizeText(e.estado) !== 'completado'), 
              faltanHora = stats.eventosHoy.filter(e => (!e.hora || String(e.hora).trim() === '') && utils.normalizeText(e.estado) !== 'completado');
        return (
          <div className="animate-fadeIn p-4 md:p-10 max-w-2xl mx-auto space-y-6 pb-32 relative z-50">
             <div className="fixed inset-0 bg-[#F4F6FB] -z-10 animate-fadeIn"></div>
             <div className="flex justify-between items-center bg-gradient-to-r from-[#7657FF] to-[#8B5CF6] text-white p-6 rounded-[24px] shadow-lg">
                 <div>
                     <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-blue-100 mb-1">Modo En Terreno</p>
                     <h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2 tracking-tight"><Zap size={28} className="fill-white"/> Operativa de Hoy</h2>
                 </div>
                 <button type="button" onClick={() => setIsModoOperativo(false)} className="bg-white/20 hover:bg-white/30 p-3.5 rounded-xl transition-all shadow-sm backdrop-blur-md cursor-pointer"><X size={24} /></button>
             </div>
             {(faltanAbono.length > 0 || faltanDireccion.length > 0 || faltanHora.length > 0) && (
                 <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200">
                     <h3 className="text-slate-900 font-bold text-sm uppercase tracking-[0.1em] mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-rose-500"/> Checklist de Alertas</h3>
                     <div className="space-y-4">
                         {faltanAbono.length > 0 && (<div className="flex items-center gap-4 bg-rose-50 border border-rose-100 p-4 rounded-xl shadow-sm"><IconBox icon={DollarSign} color="rose" className="border-0 p-2.5"/><div><p className="text-slate-900 font-bold text-[15px] leading-tight">Falta abono ({faltanAbono.length})</p><p className="text-rose-500 text-xs font-bold uppercase tracking-[0.1em] truncate max-w-[200px] mt-1">{faltanAbono.map(e=>String(e.cliente).split(' ')[0]).join(', ')}</p></div></div>)}
                         {faltanDireccion.length > 0 && (<div className="flex items-center gap-4 bg-amber-50 border border-amber-100 p-4 rounded-xl shadow-sm"><IconBox icon={MapPin} color="amber" className="border-0 p-2.5"/><div><p className="text-slate-900 font-bold text-[15px] leading-tight">Falta dirección ({faltanDireccion.length})</p><p className="text-amber-500 text-xs font-bold uppercase tracking-[0.1em] truncate max-w-[200px] mt-1">{faltanDireccion.map(e=>String(e.cliente).split(' ')[0]).join(', ')}</p></div></div>)}
                         {faltanHora.length > 0 && (<div className="flex items-center gap-4 bg-[#7657FF]/5 border border-[#7657FF]/10 p-4 rounded-xl shadow-sm"><IconBox icon={Clock} color="blue" className="border-0 p-2.5"/><div><p className="text-slate-900 font-bold text-[15px] leading-tight">Falta hora ({faltanHora.length})</p><p className="text-[#7657FF] text-xs font-bold uppercase tracking-[0.1em] truncate max-w-[200px] mt-1">{faltanHora.map(e=>String(e.cliente).split(' ')[0]).join(', ')}</p></div></div>)}
                     </div>
                 </div>
             )}
             <div className="space-y-6">
                 {stats.eventosHoy.length === 0 ? (
                     <div className="text-center py-16 bg-white/80 backdrop-blur-md rounded-[24px] border border-slate-200/50 shadow-sm"><Sun size={56} className="mx-auto text-slate-300 mb-5" strokeWidth={1.5}/><p className="text-slate-900 font-extrabold text-xl mb-2 tracking-tight">¡Todo Despejado!</p><p className="text-slate-500 font-medium text-sm">No hay eventos operativos para hoy.</p></div>
                 ) : (
                     stats.eventosHoy.map((e,i)=><EventCardItem key={e.id} ev={e} idx={i} todayTime={todayTime} onWhatsApp={sendWhatsAppCall} onViewDoc={handleViewDoc} onEdit={openModal} onDelete={handleDeleteEvento} onDuplicate={handleDuplicateEvento} onMapClick={openGoogleMaps} empresa={appSettings.empresa} utils={utils} onUpdateEstado={handleUpdateEstado} onConvertir={handleConvertirReserva} onRegistrarAbono={handleRegistrarAbono} onAjustarCobro={handleAjustarCobro} onRegistrarGasto={handleOpenExpense} forceExpanded={String(e.id) === String(notificationReservationId)} />)
                 )}
             </div>
          </div>
        );
     }
     const reservasSemanaCount = eventosActivos.filter(e => {
        const estado = utils.normalizeText(e.estado);
        if (!e.fecha || isArchivedReservation(e) || isPendingWebRequest(e) || estado === 'completado' || estado.includes('cotizaci') || estado.includes('cot.')) return false;
        const key = String(e.fecha).trim().slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
        const [y,m,d] = key.split('-').map(Number);
        const fecha = new Date(y, m - 1, d, 12, 0, 0, 0);
        return fecha >= weekStart && fecha <= weekEnd;
     }).length;

     return (
       <div className="animate-fadeIn min-h-full px-3.5 pt-3.5 md:p-6 lg:p-10 max-w-6xl mx-auto space-y-4 pb-32 md:pb-10 relative z-10">
          <div className="absolute inset-x-0 top-0 h-[340px] -z-10 pointer-events-none overflow-hidden">
             <div className="absolute -top-24 left-[-18%] w-[72%] h-[360px] rounded-full bg-[#7657FF]/15 blur-[90px]"></div>
             <div className="absolute top-8 right-[-22%] w-[68%] h-[330px] rounded-full bg-[#FF3EA5]/12 blur-[100px]"></div>
          </div>

          <div className="bg-[linear-gradient(138deg,#07162F_0%,#0A1A3A_46%,#25104B_100%)] rounded-[30px] p-5 sm:p-8 shadow-[0_28px_70px_rgba(7,22,47,0.32)] relative overflow-hidden group border border-white/10">
             <div className="absolute inset-0 opacity-100 bg-[radial-gradient(circle_at_15%_0%,rgba(118,87,255,.48),transparent_34%),radial-gradient(circle_at_86%_20%,rgba(59,130,246,.18),transparent_26%),radial-gradient(circle_at_100%_100%,rgba(255,62,165,.34),transparent_42%)] pointer-events-none"></div>
             <div className="absolute inset-[1px] rounded-[29px] border border-white/[0.07] pointer-events-none"></div>
             <div className="absolute top-0 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-white/45 to-transparent"></div>
             <div className="relative z-10 flex flex-col sm:flex-row items-start justify-between gap-7">
                 <div className="text-left max-w-xl">
                     <p className="text-white/70 text-[13px] sm:text-sm font-bold mb-1.5 tracking-wide">Buenas tardes ☀️</p>
                     <h1 className="text-[34px] leading-none sm:text-5xl font-black mb-2 tracking-[-0.045em] text-white">Hola Diverty <span className="inline-block">👋</span></h1>
                     <p className="text-slate-300/90 font-semibold text-[13px] sm:text-base leading-relaxed max-w-md">Gestiona tus reservas, contratos y finanzas al instante.</p>
                 </div>
                 <div className="hidden sm:flex w-28 h-28 rounded-[30px] bg-white/[0.07] border border-white/10 items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,.10),0_18px_40px_rgba(118,87,255,.18)]"><CalendarDays size={56} className="text-fuchsia-300 drop-shadow-[0_0_18px_rgba(232,121,249,.45)]" strokeWidth={1.8}/></div>
             </div>
             <button type="button" onClick={() => openModal()} className="relative z-10 mt-5 w-full rounded-[18px] py-3.5 px-5 bg-[linear-gradient(90deg,#FF2F9A_0%,#E42AD8_45%,#8A3DFF_100%)] text-white font-black text-[14px] sm:text-base tracking-wide shadow-[0_14px_34px_rgba(218,42,216,.34)] border border-white/20 flex items-center justify-center gap-3 active:scale-[0.99] transition-transform"><Plus size={22} strokeWidth={3}/> Nueva Reserva <ChevronRight size={20} className="absolute right-5"/></button>
          </div>

          {christmasModuleVisible && <button type="button" onClick={() => { utils.triggerHaptic('light'); handleTabChange('eventos'); setIsChristmasOpsOpen(true); window.scrollTo(0,0); }} className="w-full rounded-[22px] bg-gradient-to-r from-[#D91F2D] via-[#EF3F2F] to-[#F59E0B] p-4 text-white shadow-[0_14px_32px_rgba(217,31,45,.22)] border border-white/20 flex items-center gap-3 active:scale-[.985] transition-transform"><div className="w-11 h-11 rounded-[15px] bg-white/15 border border-white/20 flex items-center justify-center text-2xl shrink-0">🎅</div><div className="text-left min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[.16em] text-white/70">Temporada navideña</p><p className="text-[17px] font-black leading-tight">Operación Navidad</p><p className="text-[10px] font-bold text-white/80 mt-0.5">24–25 dic · Santas · rutas · reservas</p></div><ChevronRight size={21} className="shrink-0"/></button>}
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <button type="button" className="text-left group" onClick={() => { handleTabChange('eventos'); setViewMode('hoy'); }}>
                 <div className="h-full min-h-[118px] rounded-[22px] p-3.5 sm:p-4 bg-white/[0.94] backdrop-blur-2xl border border-white shadow-[0_16px_38px_rgba(15,23,42,.09)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_20px_45px_rgba(118,87,255,.14)] relative overflow-hidden">
                    <div className="absolute top-0 inset-x-5 h-px bg-gradient-to-r from-transparent via-[#7657FF]/60 to-transparent"></div>
                    <div className="flex items-start justify-between gap-2"><div className="w-10 h-10 rounded-[14px] bg-[#7657FF]/10 text-[#7657FF] border border-[#7657FF]/10 flex items-center justify-center"><Calendar size={19} strokeWidth={2.4}/></div><ArrowUpRight size={16} className="text-slate-300 group-hover:text-[#7657FF] transition-colors"/></div>
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 mt-3">Eventos Hoy</p><p className="text-[34px] sm:text-[40px] leading-none font-black text-slate-950 tracking-[-0.05em] mt-1.5">{stats.eventosHoy.length}</p>
                 </div>
              </button>
              <button type="button" className="text-left group" onClick={() => handleTabChange('finanzas')}>
                 <div className="h-full min-h-[118px] rounded-[22px] p-3.5 sm:p-4 bg-white/[0.94] backdrop-blur-2xl border border-white shadow-[0_16px_38px_rgba(15,23,42,.09)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_20px_45px_rgba(16,185,129,.12)] relative overflow-hidden">
                    <div className="absolute top-0 inset-x-5 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent"></div>
                    <div className="flex items-start justify-between gap-2"><div className="w-10 h-10 rounded-[14px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 flex items-center justify-center"><DollarSign size={19} strokeWidth={2.4}/></div><ArrowUpRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors"/></div>
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 mt-3">Ingresos Mes</p><p className="text-[30px] sm:text-[36px] leading-none font-black text-emerald-500 tracking-[-0.05em] mt-2">${stats.ingresosEsteMes.toFixed(0)}</p>
                 </div>
              </button>
              <button type="button" className="text-left group" onClick={() => handleTabChange('clientes')}>
                 <div className="h-full min-h-[118px] rounded-[22px] p-3.5 sm:p-4 bg-white/[0.94] backdrop-blur-2xl border border-white shadow-[0_16px_38px_rgba(15,23,42,.09)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_20px_45px_rgba(245,158,11,.12)] relative overflow-hidden">
                    <div className="absolute top-0 inset-x-5 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent"></div>
                    <div className="flex items-start justify-between gap-2"><div className="w-10 h-10 rounded-[14px] bg-amber-500/10 text-amber-500 border border-amber-500/10 flex items-center justify-center"><Users size={19} strokeWidth={2.4}/></div><ArrowUpRight size={16} className="text-slate-300 group-hover:text-amber-500 transition-colors"/></div>
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 mt-3">Clientes Activos</p><p className="text-[34px] sm:text-[40px] leading-none font-black text-slate-950 tracking-[-0.05em] mt-1.5">{clientsList.length}</p>
                 </div>
              </button>
              <button type="button" className="text-left group" onClick={openCuentasPorCobrar}>
                 <div className="h-full min-h-[118px] rounded-[22px] p-3.5 sm:p-4 bg-white/[0.94] backdrop-blur-2xl border border-white shadow-[0_16px_38px_rgba(15,23,42,.09)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_20px_45px_rgba(244,63,94,.12)] relative overflow-hidden">
                    <div className="absolute top-0 inset-x-5 h-px bg-gradient-to-r from-transparent via-rose-400/70 to-transparent"></div>
                    <div className="flex items-start justify-between gap-2"><div className="w-10 h-10 rounded-[14px] bg-rose-500/10 text-rose-500 border border-rose-500/10 flex items-center justify-center"><TrendingUp size={19} strokeWidth={2.4}/></div><ArrowUpRight size={16} className="text-slate-300 group-hover:text-rose-500 transition-colors"/></div>
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 mt-3">Por cobrar este mes</p><p className="text-[30px] sm:text-[36px] leading-none font-black text-rose-500 tracking-[-0.05em] mt-2">${currentMonthFinanceReport.porCobrar.toFixed(0)}</p>
                 </div>
              </button>
          </div>
          
          <div className="grid grid-cols-[1fr_1.15fr_auto] gap-2.5 rounded-[24px] bg-[linear-gradient(135deg,#07162F,#111B3D)] p-2.5 shadow-[0_18px_42px_rgba(7,22,47,.18)] border border-white/10">
            <button type="button" onClick={() => openModal(null, true)} className="min-w-0 bg-white/[0.07] backdrop-blur-xl border border-white/10 shadow-inner text-white rounded-[17px] py-3.5 px-3 sm:px-5 font-black flex items-center justify-center gap-2.5 hover:bg-white hover:-translate-y-0.5 transition-all group">
                <div className="bg-amber-400/15 p-2 rounded-[12px] text-amber-300 shrink-0"><FileText size={19} strokeWidth={2.5}/></div> 
                <span className="hidden sm:inline tracking-wide text-sm">Crear Cotización</span><span className="sm:hidden text-[10px] uppercase tracking-wide">Cotización</span>
            </button>
            <button type="button" onClick={() => {utils.triggerHaptic('light'); setIsModoOperativo(true); window.scrollTo(0,0);}} className="min-w-0 bg-[linear-gradient(135deg,#7657FF,#9B4DFF_52%,#FF3EA5)] text-white rounded-[18px] py-3.5 px-3 sm:px-5 font-black flex items-center justify-center gap-2.5 transition-all shadow-[0_12px_28px_rgba(118,87,255,.25)] hover:-translate-y-0.5 relative overflow-hidden group border border-white/20">
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <div className="bg-white/15 p-2 rounded-[12px] text-white relative z-10 shrink-0"><Zap size={19} strokeWidth={2.5} className="fill-white"/></div> 
                <span className="hidden sm:inline relative z-10 tracking-wide text-sm">Modo Operativo</span><span className="sm:hidden relative z-10 text-[10px] uppercase tracking-wide">Operativo</span>
            </button>
            <button type="button" onClick={() => { window.location.reload(); }} className="bg-white/[0.07] backdrop-blur-xl border border-white/10 shadow-inner text-fuchsia-300 rounded-[17px] py-3.5 px-4 flex items-center justify-center hover:bg-white transition-all hover:-translate-y-0.5 group" title="Refrescar vista">
                <RefreshCw size={21} strokeWidth={2.5} className="group-hover:rotate-180 transition-transform duration-500" />
            </button>
          </div>

          <div className="grid grid-cols-3 overflow-hidden rounded-[22px] bg-white/85 backdrop-blur-2xl border border-white shadow-[0_14px_34px_rgba(15,23,42,.07)]">
             <button type="button" onClick={() => { handleTabChange('eventos'); setViewMode('hoy'); }} className="px-2.5 py-3.5 flex items-center justify-center gap-2 border-r border-slate-200/70 active:bg-violet-50 transition-colors">
                <div className="w-8 h-8 rounded-[11px] bg-[#7657FF]/10 text-[#7657FF] flex items-center justify-center shrink-0"><CalendarDays size={16}/></div>
                <div className="text-left min-w-0"><p className="text-[8px] font-black tracking-[0.14em] text-slate-400 uppercase">Hoy</p><p className="text-[12px] sm:text-sm font-black text-slate-950 whitespace-nowrap">{stats.eventosHoy.length} {stats.eventosHoy.length === 1 ? 'evento' : 'eventos'}</p></div>
             </button>
             <button type="button" onClick={() => handleTabChange('eventos')} className="px-2.5 py-3.5 flex items-center justify-center gap-2 border-r border-slate-200/70 active:bg-rose-50 transition-colors">
                <div className="w-8 h-8 rounded-[11px] bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0"><CalendarDays size={16}/></div>
                <div className="text-left min-w-0"><p className="text-[8px] font-black tracking-[0.14em] text-slate-400 uppercase">Mañana</p><p className="text-[12px] sm:text-sm font-black text-slate-950 whitespace-nowrap">{stats.eventosManana.length} {stats.eventosManana.length === 1 ? 'evento' : 'eventos'}</p></div>
             </button>
             <button type="button" onClick={() => handleTabChange('eventos')} className="px-2.5 py-3.5 flex items-center justify-center gap-2 active:bg-emerald-50 transition-colors">
                <div className="w-8 h-8 rounded-[11px] bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0"><CalendarDays size={16}/></div>
                <div className="text-left min-w-0"><p className="text-[8px] font-black tracking-[0.14em] text-slate-400 uppercase">Semana</p><p className="text-[12px] sm:text-sm font-black text-slate-950 whitespace-nowrap">{reservasSemanaCount} {reservasSemanaCount === 1 ? 'evento' : 'eventos'}</p></div>
             </button>
          </div>
          
          <div className="rounded-[26px] bg-white/92 backdrop-blur-2xl border border-white shadow-[0_16px_42px_rgba(15,23,42,.08)] overflow-hidden">
             <div className="p-4 sm:p-5 bg-[linear-gradient(135deg,#0B1735_0%,#182A58_58%,#4C1D95_100%)] text-white">
                <div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/60">Centro de operaciones</p><h3 className="text-xl sm:text-2xl font-black mt-1">Hoy</h3><p className="text-[11px] font-semibold text-white/70 mt-1">{todayOperations.rows.length ? `${todayOperations.completed.length} de ${todayOperations.rows.length} realizados` : 'No tienes eventos normales para hoy'}</p></div><div className="w-11 h-11 rounded-[15px] bg-white/10 border border-white/10 flex items-center justify-center"><Zap size={21} className="text-fuchsia-200"/></div></div>
                {todayOperations.rows.length>0&&<div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300 transition-all duration-500" style={{width:`${Math.round((todayOperations.completed.length/todayOperations.rows.length)*100)}%`}}></div></div>}
             </div>
             {todayOperations.next ? (()=>{ const ev=todayOperations.next, meta=getOperationalStatusMeta(ev.estado), req=inferResourceRequirements(ev), saldo=Math.max(0,utils.safeNum(ev.total)-utils.safeNum(ev.abono)); return <div className="p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#7657FF]">Siguiente / en curso</p><h4 className="text-xl font-black text-slate-950 truncate mt-1">{ev.cliente||'Reserva'}</h4><p className="text-[11px] font-semibold text-slate-500 mt-1 truncate">{ev.servicio||ev.tipoEvento||'Evento'}</p></div><span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${meta.cls}`}>{meta.label}</span></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4"><div className="rounded-[15px] bg-slate-50 border border-slate-100 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Hora</p><p className="font-black text-slate-950 mt-1">{ev.hora?utils.formatTime12h(ev.hora):'Sin hora'}</p></div><div className="rounded-[15px] bg-slate-50 border border-slate-100 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Saldo</p><p className={`font-black mt-1 ${saldo>0?'text-rose-500':'text-emerald-500'}`}>{saldo>0?`$${saldo.toFixed(0)}`:'Pagado'}</p></div><div className="rounded-[15px] bg-slate-50 border border-slate-100 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Animadores</p><p className="font-black text-slate-950 mt-1">{req.animadores}</p></div><div className="rounded-[15px] bg-slate-50 border border-slate-100 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Payasos</p><p className="font-black text-slate-950 mt-1">{req.payasos}</p></div></div>{(ev.direccion||ev.ubicacion)&&<button type="button" onClick={()=>openGoogleMaps(ev.direccion,ev.ubicacion,ev)} className="mt-3 w-full rounded-[15px] bg-blue-50 border border-blue-100 px-3.5 py-3 text-left flex items-center gap-3 active:scale-[.99]"><MapPin size={18} className="text-blue-600 shrink-0"/><div className="min-w-0 flex-1"><p className="text-[8px] uppercase tracking-wider font-black text-blue-500">Ubicación · Maps / Waze</p><p className="text-[11px] font-bold text-slate-700 truncate mt-0.5">{String(ev.direccion||ev.ubicacion)}</p></div><ChevronRight size={17} className="text-blue-500"/></button>}<div className="grid grid-cols-[1fr_auto] gap-2 mt-3"><button type="button" onClick={()=>handleAdvanceOperational(ev)} className={`min-h-[48px] rounded-[15px] font-black text-[10px] uppercase tracking-[.11em] flex items-center justify-center gap-2 active:scale-[.98] ${getNextNormalOperationalState(ev.estado)==='Completado'?'bg-emerald-500 text-white':'bg-[#10182D] text-white'}`}><CheckCircle2 size={17}/>{getOperationalActionLabel(ev.estado)||'Ver evento'}</button><button type="button" onClick={()=>sendWhatsAppCall(ev,'recordatorio',appSettings.empresa)} className="px-4 min-h-[48px] rounded-[15px] bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center active:scale-[.98]" title="WhatsApp"><MessageCircle size={19}/></button></div>{todayOperations.resourceStatus&&!todayOperations.resourceStatus.feasible&&<div className="mt-3 rounded-[14px] bg-rose-50 border border-rose-100 p-3 text-[10px] font-bold text-rose-600 flex gap-2"><AlertTriangle size={15} className="shrink-0"/> Revisa el personal: esta reserva supera la disponibilidad simultánea configurada.</div>}</div> })() : <div className="p-5 flex items-center gap-3"><div className="w-12 h-12 rounded-[16px] bg-emerald-50 text-emerald-500 flex items-center justify-center"><CheckCircle2 size={24}/></div><div><p className="font-black text-slate-950">{todayOperations.rows.length?'¡Jornada completada!':'Agenda operativa despejada'}</p><p className="text-[11px] font-semibold text-slate-500 mt-1">{todayOperations.rows.length?'Todos los eventos de hoy están marcados como realizados.':'Cuando tengas eventos hoy, el siguiente aparecerá aquí.'}</p></div></div>}
          </div>

          {stats.alertasOperativas.length > 0 && (
             <div className="animate-slideDown mt-9">
                <div className="flex items-center justify-between mb-4 px-1"><h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 flex items-center gap-2"><span className="w-7 h-7 rounded-[10px] bg-rose-500/10 text-rose-500 flex items-center justify-center"><AlertTriangle size={14}/></span> Urgencias ({stats.alertasOperativas.length})</h3></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {stats.alertasOperativas.map((al, i) => { 
                      const AlIcon = al.icon; 
                      return (
                         <div key={al.id} onClick={() => openModal(al.e)} className="p-4 sm:p-5 rounded-[22px] border border-white flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all duration-300 bg-white/90 backdrop-blur-xl hover:border-rose-200 shadow-[0_10px_30px_rgba(15,23,42,.07)] hover:shadow-[0_16px_36px_rgba(244,63,94,.10)]" style={{animationDelay: `${i*100}ms`}}>
                            <div className="flex items-center gap-3.5 min-w-0"><div className={`p-3 rounded-[14px] shrink-0 ${al.b}`}><AlIcon size={21} strokeWidth={2.5}/></div><div className="flex flex-col items-start min-w-0"><p className="text-[14px] font-extrabold text-slate-900 leading-tight capitalize truncate max-w-full">{al.txt}</p><p className="text-[9px] font-black uppercase tracking-[0.14em] text-rose-500 mt-1.5">{al.t}</p></div></div><ChevronRight size={18} className="text-slate-300 shrink-0" />
                         </div>
                      );
                   })}
                </div>
             </div>
          )}
          
          {cotizacionesActivas.length > 0 && (
              <div className="mt-5 pt-5 border-t border-slate-200/60 relative">
                  <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-amber-400/15 to-orange-500/10 text-amber-500 border border-amber-400/15 flex items-center justify-center shadow-sm"><FileText size={20}/></div><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Seguimiento</p><h3 className="font-black text-xl sm:text-2xl text-slate-950 tracking-[-0.02em]">Cotizaciones Activas</h3></div></div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {cotizacionesActivas.map((e,i)=><EventCardItem key={e.id} ev={e} idx={i} todayTime={todayTime} onWhatsApp={sendWhatsAppCall} onViewDoc={handleViewDoc} onEdit={openModal} onDelete={handleDeleteEvento} onDuplicate={handleDuplicateEvento} onMapClick={openGoogleMaps} empresa={appSettings.empresa} utils={utils} onUpdateEstado={handleUpdateEstado} onConvertir={handleConvertirReserva} onRegistrarAbono={handleRegistrarAbono} onAjustarCobro={handleAjustarCobro} onRegistrarGasto={handleOpenExpense} forceExpanded={String(e.id) === String(notificationReservationId)} />)}
                  </div>
              </div>
          )}
          
          <div className="mt-5 pt-5 border-t border-slate-200/60 relative">
              <div className={UI.flexBetween + " mb-3 gap-3"}>
                  <div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 rounded-[14px] bg-[#7657FF]/10 text-[#7657FF] border border-[#7657FF]/10 flex items-center justify-center shrink-0"><CalendarDays size={20}/></div><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Agenda</p><h3 className="font-black text-xl sm:text-2xl text-slate-950 tracking-[-0.02em] truncate">Próximas Reservas</h3></div></div>
                  <button type="button" onClick={() => handleTabChange('eventos')} className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 hover:text-[#7657FF] transition-colors shrink-0 bg-white/70 border border-white px-3 py-2 rounded-xl shadow-sm">Ver Todas <ChevronRight size={13} className="inline"/></button>
              </div>
              {proximasReservas.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {proximasReservas.map((e,i)=><EventCardItem key={e.id} ev={e} idx={i} todayTime={todayTime} onWhatsApp={sendWhatsAppCall} onViewDoc={handleViewDoc} onEdit={openModal} onDelete={handleDeleteEvento} onDuplicate={handleDuplicateEvento} onMapClick={openGoogleMaps} empresa={appSettings.empresa} utils={utils} onUpdateEstado={handleUpdateEstado} onConvertir={handleConvertirReserva} onRegistrarAbono={handleRegistrarAbono} onAjustarCobro={handleAjustarCobro} onRegistrarGasto={handleOpenExpense} forceExpanded={String(e.id) === String(notificationReservationId)} />)}
                  </div>
              ) : (
                  <div className="relative overflow-hidden rounded-[24px] border border-white/90 bg-white/90 backdrop-blur-2xl px-4 py-4 shadow-[0_16px_40px_rgba(15,23,42,.07)]">
                     <div className="absolute -right-10 -top-12 w-32 h-32 rounded-full bg-[#7657FF]/10 blur-3xl pointer-events-none"></div>
                     <div className="relative flex items-center gap-3">
                        <div className="w-12 h-12 rounded-[17px] bg-gradient-to-br from-[#7657FF]/15 to-[#C62FFF]/10 text-[#7657FF] border border-[#7657FF]/10 flex items-center justify-center shrink-0 shadow-sm"><CalendarDays size={23}/></div>
                        <div className="min-w-0 flex-1 text-left">
                           <h4 className="font-black text-[16px] text-slate-950 tracking-tight">Agenda Despejada</h4>
                           <p className="text-slate-500 text-[11px] sm:text-xs font-semibold mt-0.5 leading-snug">Sin reservas para hoy ni mañana.</p>
                        </div>
                        <button type="button" onClick={()=>openModal()} className="shrink-0 h-11 px-4 rounded-[15px] bg-gradient-to-r from-[#FF2F92] via-[#D72DD8] to-[#8A3FFC] text-white font-black text-[10px] uppercase tracking-[0.08em] shadow-[0_10px_24px_rgba(214,45,216,.24)] active:scale-[.97] transition-transform flex items-center gap-1.5"><Plus size={16}/> Crear</button>
                     </div>
                  </div>
              )}
          </div>
       </div>
     );
  };

  const renderEventos = () => {
    const renderCalendarGrid = () => {
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate(), firstDayIndex = new Date(calYear, calMonth, 1).getDay(), days = Array.from({length: daysInMonth}, (_, i) => i + 1), blanks = Array.from({length: firstDayIndex}, (_, i) => i), weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        return (
            <div className="bg-white/95 backdrop-blur-2xl border border-white rounded-[28px] p-5 sm:p-8 mb-8 transition-all duration-500 shadow-[0_14px_42px_rgba(15,23,42,0.08)] relative overflow-hidden">
               <div className="absolute -top-24 -right-20 w-56 h-56 rounded-full bg-[#7657FF]/10 blur-3xl pointer-events-none"></div><div className="flex flex-col sm:flex-row justify-between items-center gap-5 mb-8 border-b border-slate-200/70 pb-6 relative z-10"><h3 className="text-2xl font-black text-slate-950 capitalize flex items-center gap-3 tracking-tight"><IconBox icon={CalendarDays} color="blue" /> {NOMBRES_MESES[calMonth]} {calYear}</h3><div className="flex gap-2 bg-[#F6F7FB] p-1.5 rounded-[16px] border border-slate-200/80 w-full sm:w-auto justify-between sm:justify-start shadow-sm"><button type="button" onClick={() => { utils.triggerHaptic('light'); setCalMonth(calMonth === 0 ? 11 : calMonth - 1); setCalYear(calMonth === 0 ? calYear - 1 : calYear); }} className="p-3 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-[#7657FF] shadow-sm"><ChevronLeft size={18}/></button><button type="button" onClick={() => { utils.triggerHaptic('light'); setCalMonth(todayObj.getMonth()); setCalYear(todayObj.getFullYear()); setFilterDate(todayStr); }} className="px-6 py-2 hover:bg-white shadow-sm text-[#7657FF] font-bold text-xs uppercase tracking-[0.1em] rounded-xl transition-all">HOY</button><button type="button" onClick={() => { utils.triggerHaptic('light'); setCalMonth(calMonth === 11 ? 0 : calMonth + 1); setCalYear(calMonth === 11 ? calYear + 1 : calYear); }} className="p-3 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-[#7657FF] shadow-sm"><ChevronRight size={18}/></button></div></div>
               <div className="grid grid-cols-7 gap-2 sm:gap-4 text-center mb-4">{weekDays.map(d => <div key={d} className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{d.substring(0,3)}</div>)}</div>
               <div className="grid grid-cols-7 gap-2 sm:gap-4">
                  {blanks.map(b => <div key={`b-${b}`} className="min-h-[70px] sm:min-h-[130px] bg-transparent"></div>)}
                  {days.map(d => {
                     const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                     const dayEvents = eventosAgendaPorFecha.get(dateStr) || [];
                     const isToday = dateStr === todayStr, isSelected = filterDate === dateStr, hasEvents = dayEvents.length > 0;
                     return (
                         <div key={d} onClick={() => { utils.triggerHaptic('light'); setFilterDate(dateStr); setViewMode(''); }} className={`min-h-[70px] sm:min-h-[130px] p-2 sm:p-3 rounded-[16px] border transition-all duration-300 ease-out cursor-pointer flex flex-col justify-start items-center sm:items-start hover:-translate-y-1 active:scale-[0.98] ${isSelected ? 'border-[#8B5CF6]/45 bg-[#8B5CF6]/10 shadow-[0_10px_24px_rgba(118,87,255,.10)]' : isToday ? 'bg-[#FF3EA5]/8 border-[#FF3EA5]/30' : 'bg-white/[0.035] border-white/[0.08] hover:border-white/20 hover:bg-white/[0.07] shadow-sm'}`}>
                            <p className={`text-xs sm:text-sm font-bold sm:self-end w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg sm:rounded-xl transition-all ${isSelected ? 'bg-gradient-to-br from-[#A855F7] to-[#4F7CFF] text-white shadow-[0_0_20px_rgba(118,87,255,.35)]' : isToday ? 'bg-[#FF3EA5] text-white shadow-[0_0_18px_rgba(255,62,165,.3)]' : 'text-slate-600 bg-white border border-slate-200/80'}`}>{d}</p>
                            <div className="mt-2 sm:mt-3 flex flex-wrap sm:flex-col gap-1 sm:gap-1.5 w-full justify-center sm:justify-start flex-1 overflow-hidden">{hasEvents && <div className="hidden sm:flex flex-col gap-1.5 w-full">{dayEvents.slice(0, 2).map((ev, i) => (<div key={i} className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-[8px] truncate bg-white border border-slate-200/80 text-slate-600 w-full shadow-sm" title={ev.cliente}>{String(ev.cliente).split(' ')[0]}</div>))}{dayEvents.length > 2 && <div className="text-[9px] text-[#C8B8FF] font-bold uppercase tracking-wider mt-0.5 text-center w-full">+{dayEvents.length - 2}</div>}</div>}{hasEvents && <div className="sm:hidden flex gap-1.5 mt-1 justify-center flex-wrap">{dayEvents.slice(0, 3).map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#C084FC]' : 'bg-[#7657FF] shadow-[0_0_6px_rgba(118,87,255,.45)]'}`}></div>)}{dayEvents.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-[#FF3EA5]/70"></div>}</div>}</div>
                         </div>
                     );
                  })}
               </div>
            </div>
        );
    };

    const renderListView = () => {
        const grouped = agendaFiltrados.reduce((acc, ev) => { if(!acc[ev.fecha]) acc[ev.fecha] = []; acc[ev.fecha].push(ev); return acc; }, {});
        const reverseHistory = viewMode === 'completadas' || viewMode === 'canceladas';
        const fechasOrdenadas = Object.keys(grouped).sort((a, b) => reverseHistory ? String(b).localeCompare(String(a)) : String(a).localeCompare(String(b)));
        if (reverseHistory) {
            Object.values(grouped).forEach(items => items.sort((a, b) => String(b.hora || '').localeCompare(String(a.hora || ''))));
        }
        return (
            <div className="mt-7 space-y-9 relative z-10">
                {fechasOrdenadas.map(fecha => (
                    <div key={fecha} className="flex flex-col">
                        <div className="flex items-center justify-between gap-3 mb-5">
                            <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-[15px] bg-gradient-to-br from-[#EEF2FF] to-[#F6EEFF] border border-[#7657FF]/15 flex items-center justify-center shadow-sm"><CalendarDays size={20} className="text-[#7657FF]" strokeWidth={2.5}/></div><div><p className="text-[10px] uppercase tracking-[0.18em] font-black text-slate-400">{viewMode === 'canceladas' ? 'Canceladas / Rechazadas' : (fecha === todayStr ? 'Hoy' : 'Agenda')}</p><h3 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">{fecha ? String(fecha).split('-').reverse().join('/') : 'Sin fecha'}</h3></div></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7657FF] bg-[#7657FF]/8 border border-[#7657FF]/10 px-3 py-2 rounded-full">{grouped[fecha].length} {grouped[fecha].length === 1 ? 'evento' : 'eventos'}</span>
                        </div>
                        <div className="space-y-4">{grouped[fecha].map((e,i)=><div key={e.id} className="grid grid-cols-[44px_1fr] sm:grid-cols-[66px_1fr] gap-2 sm:gap-3 items-stretch"><div className="relative flex flex-col items-center pt-4"><div className="text-center leading-none"><p className="text-[13px] sm:text-sm font-black text-slate-900">{String(e.hora || '--:--').slice(0,5)}</p></div><div className="mt-3 w-3 h-3 rounded-full bg-gradient-to-br from-[#FF3EA5] to-[#7657FF] ring-4 ring-[#F3ECFF] shadow-[0_0_16px_rgba(118,87,255,.28)] z-10"></div>{i < grouped[fecha].length - 1 && <div className="absolute top-[58px] bottom-[-22px] w-px bg-gradient-to-b from-[#CDBDFF] via-[#E8E1FF] to-transparent"></div>}</div><div className="min-w-0"><EventCardItem ev={e} idx={i} todayTime={todayTime} onWhatsApp={sendWhatsAppCall} onViewDoc={handleViewDoc} onEdit={openModal} onDelete={handleDeleteEvento} onDuplicate={handleDuplicateEvento} onMapClick={openGoogleMaps} empresa={appSettings.empresa} utils={utils} onUpdateEstado={handleUpdateEstado} onConvertir={handleConvertirReserva} onRegistrarAbono={handleRegistrarAbono} onAjustarCobro={handleAjustarCobro} onRegistrarGasto={handleOpenExpense} /></div></div>)}</div>
                    </div>
                ))}
            </div>
        );
    };

    return (
      <div className={`${isChristmasOpsOpen ? '' : 'animate-fadeIn'} min-h-full p-4 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-8 pb-32 relative text-slate-900 bg-[radial-gradient(circle_at_10%_0%,rgba(118,87,255,.08),transparent_30%),radial-gradient(circle_at_95%_14%,rgba(255,62,165,.06),transparent_28%),linear-gradient(180deg,#F7F8FC_0%,#F4F6FB_100%)]`}>
        <div className="pt-1 sm:pt-3 mb-6 sm:mb-8 flex flex-col gap-3 relative z-10">
            <div className="flex flex-col gap-4"><div><div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#7657FF] mb-1.5"><Sparkles size={14}/> Centro de operaciones</div><h2 className="text-4xl sm:text-5xl font-black text-slate-950 tracking-[-0.04em]">Agenda</h2><p className="text-sm sm:text-base font-medium text-slate-500 mt-1.5">Organiza tus eventos con precisión</p></div><button type="button" onClick={()=>{utils.triggerHaptic('light');setIsAgendaSummaryOpen(true)}} className="w-full flex items-center gap-4 rounded-[24px] bg-gradient-to-r from-[#FF3EA5] via-[#B83DFF] to-[#7657FF] px-5 py-3.5 text-white shadow-[0_16px_34px_rgba(184,61,255,.26)] active:scale-[.985] border border-white/30"><div className="w-12 h-12 shrink-0 rounded-[16px] bg-white/15 border border-white/15 flex items-center justify-center shadow-inner"><CalendarDays size={27}/></div><div className="text-left min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/75">Resumen de agenda</p><p className="text-2xl font-black leading-tight mt-1">{eventosActivos.filter(e=>{const d=String(e.fecha||''); const start=new Date(todayStr+'T00:00:00'); const end=new Date(start); end.setDate(end.getDate()+6); const ds=new Date(d+'T00:00:00'); return ds>=start&&ds<=end&&!isPendingWebRequest(e)&&!/cancelado|rechaz|cot/i.test(String(e.estado||''));}).length} eventos <span className="text-base font-bold text-white/80">esta semana</span></p></div><div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0"><ChevronRight size={21}/></div></button></div>
            {christmasModuleVisible && <button type="button" onClick={()=>{utils.triggerHaptic('light');setIsChristmasOpsOpen(true)}} className="w-full mt-1 flex items-center gap-4 rounded-[24px] bg-gradient-to-r from-[#D91F2D] via-[#EF3F2F] to-[#F59E0B] px-5 py-4 text-white shadow-[0_16px_34px_rgba(217,31,45,.22)] active:scale-[.985] border border-white/30"><div className="w-12 h-12 shrink-0 rounded-[16px] bg-white/16 border border-white/20 flex items-center justify-center text-2xl">🎅</div><div className="text-left min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/75">24 y 25 de diciembre</p><p className="text-xl font-black leading-tight mt-0.5">Operación Navidad</p><p className="text-[11px] font-bold text-white/80 mt-0.5">Santas · horarios · clientes · GPS</p></div><div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0"><ChevronRight size={21}/></div></button>}
            <div className="flex flex-col lg:flex-row gap-4 mt-3 sm:mt-5">
                 <div className="relative flex-1 group"><div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-20"><Search size={22} strokeWidth={2.6} className="text-[#7657FF] group-focus-within:text-[#7657FF] transition-colors" /></div><input type="text" value={globalSearch} onChange={e=>setGlobalSearch(e.target.value)} placeholder="Buscar cliente, lugar, paquete..." className="w-full h-[56px] bg-white/95 backdrop-blur-xl border border-white rounded-[20px] pl-12 pr-12 text-[15px] font-semibold text-slate-900 outline-none focus:border-[#8B5CF6]/50 focus:ring-4 focus:ring-[#7657FF]/10 transition-all duration-300 shadow-[0_10px_28px_rgba(15,23,42,.06)] placeholder:text-slate-400" />{globalSearch && <button type="button" onClick={() => setGlobalSearch('')} className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-400 hover:text-slate-700 transition-colors"><X size={18}/></button>}</div>
                 <div className="flex gap-2 overflow-x-auto scrollbar-hide p-1.5 items-center bg-white/70 backdrop-blur-xl rounded-[20px] border border-white shadow-[0_10px_30px_rgba(15,23,42,.05)]">
                     {[{id:'hoy',label:'Hoy'},{id:'semana',label:'Semana'},{id:'mes',label:'Mes'},{id:'pendientes',label:'Pendientes'},{id:'canceladas',label:'Canceladas / Rechazadas'}].map(item => (<button key={item.id} type="button" onClick={()=>{setFilterDate(''); setViewMode(item.id)}} className={`px-5 py-3.5 rounded-[14px] text-[10px] uppercase tracking-[0.1em] font-bold transition-all duration-300 ease-out whitespace-nowrap shadow-sm border active:scale-[0.98] ${viewMode===item.id&&!filterDate?'bg-gradient-to-r from-[#FF3EA5] via-[#B83DFF] to-[#7657FF] text-white border-transparent shadow-[0_10px_26px_rgba(184,61,255,0.30)]':'bg-white/90 backdrop-blur-xl text-slate-500 hover:text-slate-900 hover:bg-white border-slate-200/90'}`}>{item.label}</button>))}
                     <div className={`flex items-center justify-between px-5 py-3 rounded-[14px] transition-all duration-300 ease-out cursor-text focus-within:border-[#7657FF]/50 bg-white/90 backdrop-blur-xl border ${filterDate ? 'border-[#8B5CF6]/45 text-[#7657FF] shadow-md bg-[#7657FF]/8' : 'border-slate-200/90 shadow-sm text-slate-500 hover:bg-white'} shrink-0`}><div className="flex items-center flex-1 relative"><CalendarDays size={18} className={`mr-2.5 transition-colors duration-200`} /><input type="date" value={filterDate} onChange={(e) => { utils.triggerHaptic('light'); setFilterDate(e.target.value); }} className={`bg-transparent text-[11px] uppercase tracking-[0.1em] font-bold outline-none w-full flex-1 cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 absolute inset-0 opacity-0 z-20`} /><span className={`text-[11px] uppercase tracking-[0.1em] font-bold pointer-events-none relative z-10`}>{filterDate ? String(filterDate).split('-').reverse().join('/') : 'Fecha'}</span></div>{filterDate && <button type="button" onClick={() => {utils.triggerHaptic('light'); setFilterDate('');}} className="text-slate-400 hover:text-[#FF3EA5] ml-3 z-30 transition-all cursor-pointer"><X size={16}/></button>}</div>
                 </div>
            </div>
        </div>
        <div className="relative z-10">
            {viewMode === 'mes' && renderCalendarGrid()}
            {(!isDBReady && !deferredGlobalSearch && !filterDate && eventosActivos.length === 0) ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8"><SkeletonCard /><SkeletonCard /></div>
            ) : agendaFiltrados.length === 0 ? (
                <div className="mt-6 rounded-[26px] border border-slate-200/80 bg-white/90 backdrop-blur-xl px-5 py-5 shadow-[0_14px_38px_rgba(15,23,42,.06)] flex items-center gap-4"><div className="w-14 h-14 shrink-0 rounded-[18px] bg-gradient-to-br from-[#F2EEFF] to-[#FFF0F8] flex items-center justify-center border border-[#7657FF]/10"><Search size={25} className="text-[#7657FF]"/></div><div className="min-w-0 flex-1"><h3 className="text-lg font-black text-slate-950">Sin resultados</h3><p className="text-sm font-medium text-slate-500 mt-0.5">No se encontraron reservas para este filtro.</p></div>{(!!deferredGlobalSearch || !!filterDate) && <button type="button" onClick={()=>{setGlobalSearch(''); setFilterDate(''); setViewMode('todas');}} className="shrink-0 text-white font-black px-4 py-3 rounded-[14px] bg-gradient-to-r from-[#FF3EA5] to-[#7657FF] shadow-[0_8px_20px_rgba(184,61,255,.22)] uppercase tracking-wider text-[9px]">Limpiar</button>}</div>
            ) : (!!deferredGlobalSearch || !!filterDate) ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">{agendaFiltrados.map((e,i)=><EventCardItem key={e.id} ev={e} idx={i} todayTime={todayTime} onWhatsApp={sendWhatsAppCall} onViewDoc={handleViewDoc} onEdit={openModal} onDelete={handleDeleteEvento} onDuplicate={handleDuplicateEvento} onMapClick={openGoogleMaps} empresa={appSettings.empresa} utils={utils} onUpdateEstado={handleUpdateEstado} onConvertir={handleConvertirReserva} onRegistrarAbono={handleRegistrarAbono} onAjustarCobro={handleAjustarCobro} onRegistrarGasto={handleOpenExpense} forceExpanded={String(e.id) === String(notificationReservationId)} />)}</div>
            ) : ( renderListView() )}
        </div>
        {isChristmasOpsOpen && christmasModuleVisible && (()=>{
          const isChristmasDateEvent = e => (e.esNavidad === true || /entregas de nochebuena/i.test(String(e.servicio || ''))) && ['2026-12-24','2026-12-25'].includes(String(e.fecha || ''));
          const isDelivered = e => e?.entregaNavidadRealizada === true || utils.normalizeText(e?.estado) === 'completado';
          const christmasEventsAll = eventosActivos
            .filter(e => isChristmasDateEvent(e) && !isPendingWebRequest(e) && !/cancelado|rechazada|cot/i.test(String(e.estado || '')))
            .sort((a,b)=>String(a.fecha||'').localeCompare(String(b.fecha||''))||String(a.hora||'').localeCompare(String(b.hora||'')));
          const selectedChristmasDate = christmasDayFilter === '24' ? '2026-12-24' : christmasDayFilter === '25' ? '2026-12-25' : '';
          const christmasEvents = selectedChristmasDate ? christmasEventsAll.filter(e=>String(e.fecha||'')===selectedChristmasDate) : christmasEventsAll;
          const pendingChristmasRequestsAll = eventosActivos.filter(e => isChristmasDateEvent(e) && isPendingWebRequest(e));
          const pendingChristmasRequests = selectedChristmasDate ? pendingChristmasRequestsAll.filter(e=>String(e.fecha||'')===selectedChristmasDate) : pendingChristmasRequestsAll;
          const deliveredCount = christmasEvents.filter(isDelivered).length;
          const pendingDeliveryCount = Math.max(0, christmasEvents.length - deliveredCount);
          const closeChristmas = ()=>{utils.triggerHaptic('light');setExpandedChristmasId(null);setChristmasDayFilter('all');setIsChristmasOpsOpen(false)};
          const enabledSantas = Array.from({length: Math.max(1, christmasSantaCapacity)}, (_,i)=>`Santa ${i+1}`);
          const assignedNames = Array.from(new Set(christmasEvents.map(e=>String(e.santaAsignado||'Sin asignar').trim()||'Sin asignar')));
          const santaNames = Array.from(new Set([...enabledSantas, ...assignedNames])).sort((a,b)=>a==='Sin asignar'?1:b==='Sin asignar'?-1:a.localeCompare(b,undefined,{numeric:true}));
          const hasScheduleConflict = (ev, list) => {
            if (isDelivered(ev)) return false;
            if ((String(ev.santaAsignado||'Sin asignar').trim()||'Sin asignar') === 'Sin asignar') return true;
            return !christmasInsertionPlan(ev, list.filter(other=>other.id!==ev.id && !isDelivered(other))).feasible;
          };
          const reassignSanta = async (ev, santa) => {
            if (!ev?.id || !santa) return;
            const sameSantaStops = christmasEventsAll.filter(x=>String(x.id)!==String(ev.id) && String(x.santaAsignado||'').trim()===santa && !isDelivered(x));
            const routePlan = christmasInsertionPlan({...ev, santaAsignado:santa}, sameSantaStops);
            if (!routePlan.feasible && !window.confirm(`${santa} ya tiene una ruta que puede chocar con este horario. ¿Deseas asignarlo de todas formas?`)) return;
            try {
              utils.triggerHaptic('light');
              await patchEventoAtomic(ev.id, { santaAsignado: santa, esNavidad: true, recursoNavidad: 'Santa' });
              setEventos(prev=>prev.map(x=>String(x.id)===String(ev.id)?{...x,santaAsignado:santa,esNavidad:true,recursoNavidad:'Santa'}:x));
              showAlert(`Reserva reasignada a ${santa}.`, true);
            } catch (err) { console.error(err); showAlert('No se pudo reasignar el Santa. Intenta nuevamente.', false); }
          };
          const formatChristmasTime = t => utils.formatTime12h(t).replace(' AM','AM').replace(' PM','PM');
          const money = v => `$${utils.safeNum(v).toFixed(2)}`;
          const mapTarget = ev => { const gps=christmasEventGps(ev); if(gps) return `${gps.lat},${gps.lng}`; const raw=String(ev.direccion||'').trim(); return raw || String(ev.referenciaLugar||ev.ubicacion||'').trim(); };
          const openSantaRoute = stops => {
            const pendingStops = stops.filter(e=>!isDelivered(e));
            const nextDate = pendingStops[0]?.fecha || '';
            const routeStops = nextDate ? pendingStops.filter(e=>String(e.fecha||'')===String(nextDate)) : pendingStops;
            const targets=routeStops.map(mapTarget).filter(Boolean);
            if(!targets.length) return showAlert('No quedan entregas pendientes con GPS en esta ruta.', true);
            utils.triggerHaptic('light');
            if(targets.length===1){ openGoogleMaps(routeStops[0]?.direccion, routeStops[0]?.ubicacion, routeStops[0]); return; }
            const destination=targets[targets.length-1];
            const waypoints=targets.slice(0,-1).join('|');
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`,'_blank');
          };
          const markChristmasDelivered = async (ev) => {
            if (!ev?.id || isDelivered(ev)) return;
            try {
              utils.triggerHaptic('success');
              const completedAt = new Date().toISOString();
              const patch = { entregaNavidadRealizada: true, entregaNavidadRealizadaAt: completedAt, estado: 'Completado', esNavidad: true, recursoNavidad: 'Santa' };
              await patchEventoAtomic(ev.id, patch);
              setEventos(prev=>prev.map(x=>String(x.id)===String(ev.id)?{...x,...patch}:x));
              const santa = String(ev.santaAsignado||'Sin asignar').trim()||'Sin asignar';
              const sameSanta = christmasEvents.filter(x=>String(x.id)!==String(ev.id) && (String(x.santaAsignado||'Sin asignar').trim()||'Sin asignar')===santa && !isDelivered(x));
              const currentMinutes = christmasTimeMinutes(ev.hora) ?? -1;
              const next = sameSanta.find(x=>(christmasTimeMinutes(x.hora) ?? 9999) > currentMinutes) || sameSanta[0] || null;
              setExpandedChristmasId(next?.id || null);
              showAlert(next ? `Entrega realizada. Siguiente: ${next.cliente || 'cliente'} · ${formatChristmasTime(next.hora)}.` : `Entrega realizada. ${santa} terminó sus entregas pendientes.`, true);
            } catch (err) { console.error(err); showAlert('No se pudo marcar la entrega como realizada.', false); }
          };
          const reopenChristmasDelivery = async (ev) => {
            if (!ev?.id || !isDelivered(ev)) return;
            try {
              const patch = { entregaNavidadRealizada: false, entregaNavidadRealizadaAt: '', estado: 'Confirmado' };
              await patchEventoAtomic(ev.id, patch);
              setEventos(prev=>prev.map(x=>String(x.id)===String(ev.id)?{...x,...patch}:x));
              showAlert('Entrega devuelta a pendiente.', true);
            } catch (err) { console.error(err); showAlert('No se pudo devolver la entrega a pendiente.', false); }
          };
          const deleteChristmas = ev => showConfirm(`¿Eliminar la reserva navideña de ${ev.cliente || 'este cliente'}? El horario se liberará automáticamente en la web.`, async()=>{ try { utils.triggerHaptic('light'); await deleteEventoSynced(ev.id); await publishSync('evento', ev.id, 'delete'); setEventos(prev=>prev.filter(x=>x.id!==ev.id)); setExpandedChristmasId(null); showAlert('Reserva eliminada y cupo liberado en la web.', true); } catch(err){ console.error(err); showAlert('No se pudo eliminar la reserva. Intenta nuevamente.', false); } });
          const finishChristmasSeason = () => showConfirm('¿Ocultar Operación Navidad al terminar la temporada? No se borrará ninguna reserva y podrás volver a mostrarla desde Ajustes > Herramientas.', ()=>{ setChristmasVisibility(false); showAlert('Operación Navidad quedó oculta. Tus reservas se conservaron.', true); });

          return <div className="fixed left-0 top-0 right-0 bottom-0 w-screen h-[100dvh] max-w-none z-[78] bg-[#F6F7FB] overflow-y-auto overscroll-none [-webkit-overflow-scrolling:touch] pb-[calc(92px+env(safe-area-inset-bottom))] isolate" style={{backgroundColor:'#F6F7FB',backgroundImage:'radial-gradient(circle at top, rgba(239,68,68,.08), transparent 26%)'}}>
            <div className="relative z-20 bg-[linear-gradient(135deg,#7F1D1D_0%,#C62828_42%,#EA580C_100%)] text-white shadow-[0_10px_28px_rgba(127,29,29,.22)] pt-[max(52px,calc(env(safe-area-inset-top)+40px))]">
              <div className="max-w-4xl mx-auto px-4 pb-4">
                <button type="button" onClick={closeChristmas} className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/25 px-4 py-3 text-[11px] font-black uppercase tracking-[.12em] active:scale-[.97]"><ChevronLeft size={18}/> Agenda</button>
                <div className="mt-3 flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-white/65">24 y 25 de diciembre</p><h2 className="text-3xl sm:text-4xl font-black tracking-[-.035em] mt-1">Operación Navidad</h2><p className="text-sm font-bold text-white/75 mt-1">Entregas, siguiente parada y rutas por Santa</p></div><div className="w-14 h-14 rounded-[19px] bg-white/12 border border-white/20 flex items-center justify-center text-3xl shrink-0">🎅</div></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                  <div className="rounded-[18px] bg-white/10 border border-white/10 p-3"><p className="text-2xl font-black">{pendingDeliveryCount}</p><p className="text-[8px] uppercase font-black tracking-wider text-white/65">Pendientes</p></div>
                  <div className="rounded-[18px] bg-emerald-300/15 border border-emerald-100/20 p-3"><p className="text-2xl font-black">{deliveredCount}</p><p className="text-[8px] uppercase font-black tracking-wider text-white/75">Realizadas</p></div>
                  <button type="button" onClick={()=>{utils.triggerHaptic('light');setIsNotifOpen(true)}} className={`text-left rounded-[18px] border p-3 active:scale-[.98] ${pendingChristmasRequests.length?'bg-amber-300/20 border-amber-200/35':'bg-white/10 border-white/10'}`}><p className="text-2xl font-black">{pendingChristmasRequests.length}</p><p className="text-[8px] uppercase font-black tracking-wider text-white/75">Por revisar</p></button>
                  <div className="rounded-[18px] bg-white/10 border border-white/10 p-3"><p className="text-2xl font-black">{christmasSantaCapacity}</p><p className="text-[8px] uppercase font-black tracking-wider text-white/65">Santas</p></div>
                </div>
              </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
              <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm p-4 flex items-start gap-3"><div className="w-11 h-11 rounded-[15px] bg-red-50 text-red-600 flex items-center justify-center shrink-0"><Info size={21}/></div><div><p className="font-black text-slate-950">Modo operativo</p><p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">Marca cada visita como <b>Entrega realizada</b>. La ruta deja de incluirla y la siguiente parada queda resaltada automáticamente.</p></div></div>

              <div className="grid grid-cols-3 gap-2 rounded-[22px] bg-white border border-slate-100 shadow-sm p-2">{[{id:'all',label:'24 + 25'},{id:'24',label:'24 Dic'},{id:'25',label:'25 Dic'}].map(day=><button key={day.id} type="button" onClick={()=>{utils.triggerHaptic('light');setExpandedChristmasId(null);setChristmasDayFilter(day.id)}} className={`min-h-[44px] rounded-[14px] text-[9px] font-black uppercase tracking-[.1em] border transition-all ${christmasDayFilter===day.id?'bg-red-600 text-white border-red-600 shadow-sm':'bg-slate-50 text-slate-500 border-slate-100'}`}>{day.label}</button>)}</div>

              {christmasEvents.length===0 ? <div className="rounded-[28px] bg-white border border-slate-100 shadow-sm px-6 py-12 text-center"><div className="text-5xl mb-4">🎄</div><h3 className="text-xl font-black text-slate-950">Aún no hay entregas confirmadas</h3><p className="text-sm font-semibold text-slate-500 mt-2">{pendingChristmasRequests.length ? `Tienes ${pendingChristmasRequests.length} ${pendingChristmasRequests.length===1?'solicitud':'solicitudes'} por revisar. Sus horarios permanecen apartados hasta aceptar o rechazar.` : 'Las reservas aceptadas del 24 y 25 aparecerán aquí.'}</p>{pendingChristmasRequests.length>0&&<button type="button" onClick={()=>{utils.triggerHaptic('light');setIsNotifOpen(true)}} className="mt-5 inline-flex items-center justify-center gap-2 rounded-[15px] bg-amber-500 px-5 py-3 text-[10px] font-black uppercase tracking-[.1em] text-white shadow-sm active:scale-[.98]"><BellRing size={16}/> Revisar solicitudes</button>}</div> :
              <div className="space-y-4">{santaNames.map(santa=>{
                const stops=christmasEvents.filter(e=>(String(e.santaAsignado||'Sin asignar').trim()||'Sin asignar')===santa);
                if(!stops.length && santa==='Sin asignar') return null;
                const pendingStops=stops.filter(e=>!isDelivered(e));
                const completedStops=stops.filter(isDelivered);
                const nextStop=pendingStops[0] || null;
                return <section key={santa} className="rounded-[26px] bg-white border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,.065)] overflow-hidden">
                  <div className={`p-4 border-b flex items-center justify-between gap-3 ${santa==='Sin asignar'?'bg-amber-50 border-amber-100':'bg-gradient-to-r from-red-50 to-orange-50 border-red-100'}`}>
                    <div className="flex items-center gap-3 min-w-0"><div className="w-11 h-11 rounded-[15px] bg-white shadow-sm flex items-center justify-center text-2xl shrink-0">{santa==='Sin asignar'?'⚠️':'🎅'}</div><div className="min-w-0"><p className="font-black text-slate-950 truncate">{santa}</p><p className="text-[10px] font-bold text-slate-500">{pendingStops.length} pendientes · {completedStops.length} realizadas</p></div></div>
                    {santa!=='Sin asignar' && pendingStops.length>0 ? <button type="button" onClick={()=>openSantaRoute(pendingStops)} className="shrink-0 rounded-[13px] bg-slate-950 text-white px-3 py-2.5 text-[9px] font-black uppercase tracking-wider active:scale-[.97] flex items-center gap-1.5"><MapIcon size={14}/> Ruta pendiente</button> : <span className="shrink-0 rounded-[13px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-2.5 text-[9px] font-black uppercase tracking-wider">Ruta completa</span>}
                  </div>
                  <div className="p-2.5 space-y-2">{stops.length===0 ? <p className="text-center text-xs font-bold text-slate-400 py-5">Sin entregas asignadas.</p> : stops.map((ev,idx)=>{
                    const expanded=expandedChristmasId===ev.id;
                    const delivered=isDelivered(ev);
                    const isNext=!delivered && nextStop?.id===ev.id;
                    const conflict=hasScheduleConflict(ev,stops);
                    const phone=String(ev.telefono||'').replace(/\D/g,'');
                    const saldo=Math.max(0,utils.safeNum(ev.total)-utils.safeNum(ev.abono));
                    return <article key={ev.id} className={`rounded-[21px] border transition-all overflow-hidden ${delivered?'border-emerald-200 bg-emerald-50/45':isNext?'border-amber-300 shadow-[0_10px_28px_rgba(245,158,11,.10)] bg-amber-50/30':expanded?'border-red-200 shadow-[0_12px_30px_rgba(127,29,29,.10)] bg-white':'border-slate-200/80 bg-[#FCFCFD]'}`}>
                      <button type="button" onClick={()=>{utils.triggerHaptic('light');setExpandedChristmasId(expanded?null:ev.id)}} className="w-full text-left px-3.5 py-3.5 active:bg-slate-50">
                        <div className="flex items-center gap-3"><div className={`w-[78px] h-[58px] rounded-[17px] text-white flex flex-col items-center justify-center shrink-0 shadow-sm px-1 ${delivered?'bg-emerald-600':isNext?'bg-amber-500':'bg-slate-950'}`}><span className="text-[8px] font-black uppercase text-white/65">Hora</span><span className="text-[12px] leading-none font-black whitespace-nowrap tracking-[-.02em]">{formatChristmasTime(ev.hora)}</span></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2 flex-wrap"><span className={`text-[9px] font-black uppercase tracking-wider ${delivered?'text-emerald-600':isNext?'text-amber-600':'text-red-500'}`}>Parada {idx+1}</span>{delivered?<span className="text-[8px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">✓ Entregada</span>:isNext?<span className="text-[8px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">Siguiente</span>:<span className="text-[8px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-full">Pendiente</span>}{conflict&&<span className="text-[8px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">Revisar tiempo</span>}</div><p className={`font-black text-[17px] truncate mt-1 ${delivered?'text-slate-500 line-through decoration-emerald-400/50':'text-slate-950'}`}>{ev.cliente||'Cliente'}</p><p className="text-[10px] font-bold text-slate-500 truncate mt-1">{ev.referenciaLugar||ev.ubicacion||'Ubicación por revisar'}</p></div><ChevronDown size={20} className={`text-slate-400 shrink-0 transition-transform ${expanded?'rotate-180':''}`}/></div>
                      </button>
                      {expanded&&<div className="px-4 pb-4 border-t border-slate-100">
                        {isNext && <div className="mt-4 rounded-[16px] bg-amber-50 border border-amber-200 p-3 flex items-center gap-3"><div className="w-9 h-9 rounded-[12px] bg-amber-500 text-white flex items-center justify-center"><ChevronRight size={20}/></div><div><p className="text-[9px] font-black uppercase tracking-wider text-amber-600">Vamos con la siguiente</p><p className="text-sm font-black text-slate-900 mt-0.5">{ev.cliente} · {formatChristmasTime(ev.hora)}</p></div></div>}
                        {delivered && <div className="mt-4 rounded-[16px] bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-3"><CheckCircle2 size={24} className="text-emerald-500"/><div><p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">Entrega realizada</p><p className="text-[11px] font-semibold text-slate-600 mt-0.5">Esta parada ya no se incluye en la ruta pendiente.</p></div></div>}
                        <div className="grid grid-cols-2 gap-2 mt-4"><div className="rounded-[15px] bg-slate-50 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Fecha</p><p className="font-black text-slate-800 mt-1 text-sm">{String(ev.fecha||'').split('-').reverse().join('/')||'—'}</p></div><div className="rounded-[15px] bg-slate-50 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Niños</p><p className="font-black text-slate-800 mt-1 text-sm">{ev.ninos||'No indicado'}</p></div>{(()=>{const n=Number(String(ev.ninos||'').match(/\d+/)?.[0]||0);return n>2?<div className="col-span-2 rounded-[15px] bg-amber-50 border border-amber-200 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-amber-700">⚠ Revisar cantidad de niños</p><p className="text-[11px] font-semibold text-amber-700 mt-1">Navidad admite máximo 2 niños por reserva. Esta reserva indica {n}.</p></div>:null})()}<div className="rounded-[15px] bg-slate-50 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Total</p><p className="font-black text-slate-800 mt-1 text-sm">{money(ev.total)}</p></div><div className={`rounded-[15px] p-3 ${saldo>0?'bg-rose-50':'bg-emerald-50'}`}><p className={`text-[8px] font-black uppercase tracking-wider ${saldo>0?'text-rose-400':'text-emerald-500'}`}>Saldo</p><p className={`font-black mt-1 text-sm ${saldo>0?'text-rose-600':'text-emerald-600'}`}>{saldo>0?money(saldo):'Pagado'}</p></div></div>
                        <div className="mt-2 rounded-[16px] bg-[#F7F3FF] border border-[#7657FF]/10 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-[#7657FF]">Servicio</p><p className="text-sm font-black text-slate-900 mt-1 whitespace-pre-wrap">{ev.servicio||'Entrega de Nochebuena'}</p>{ev.descripcionEvento&&<p className="text-[11px] font-semibold text-slate-600 mt-2 whitespace-pre-wrap leading-relaxed">{ev.descripcionEvento}</p>}</div>
                        <div className="mt-2 rounded-[16px] bg-slate-50 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Dirección / GPS</p><p className="text-[11px] font-bold text-slate-700 mt-1 break-words whitespace-pre-wrap">{ev.direccion||'No indicada'}</p>{ev.referenciaLugar&&<><p className="text-[8px] font-black uppercase tracking-wider text-slate-400 mt-3">Referencia</p><p className="text-[11px] font-bold text-slate-700 mt-1 whitespace-pre-wrap">{ev.referenciaLugar}</p></>}{ev.comentarios&&<><p className="text-[8px] font-black uppercase tracking-wider text-slate-400 mt-3">Comentarios</p><p className="text-[11px] font-semibold text-slate-600 mt-1 whitespace-pre-wrap">{ev.comentarios}</p></>}</div>
                        <div className="mt-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-400 mb-2">Santa asignado</p><div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">{enabledSantas.map(name=><button key={name} type="button" onClick={()=>reassignSanta(ev,name)} className={`shrink-0 px-3 py-2.5 rounded-[13px] text-[9px] font-black uppercase tracking-wider border ${String(ev.santaAsignado||'')===name?'bg-red-600 text-white border-red-600':'bg-white text-slate-600 border-slate-200'}`}>{name}</button>)}</div></div>
                        <div className="grid grid-cols-2 gap-2 mt-3">{phone?<button type="button" onClick={()=>utils.openWhatsAppBusiness(phone,`Hola ${ev.cliente||''}, te contactamos de Diverty Eventos sobre tu entrega de Navidad.`)} className="min-h-[46px] rounded-[14px] bg-emerald-50 text-emerald-600 border border-emerald-100 font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-2"><MessageCircle size={16}/> WhatsApp</button>:<div/>}<button type="button" onClick={()=>openGoogleMaps(ev.direccion, ev.ubicacion, ev)} className="min-h-[46px] rounded-[14px] bg-[#7657FF]/10 text-[#7657FF] border border-[#7657FF]/15 font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-2"><MapPin size={16}/> GPS / Waze</button></div>
                        {!delivered ? <button type="button" onClick={()=>markChristmasDelivered(ev)} className="mt-2 w-full min-h-[52px] rounded-[15px] bg-emerald-500 text-white border border-emerald-500 font-black text-[10px] uppercase tracking-[.12em] flex items-center justify-center gap-2 shadow-[0_10px_24px_rgba(16,185,129,.18)] active:scale-[.98]"><CheckCircle2 size={18}/> Marcar entrega realizada</button> : <button type="button" onClick={()=>reopenChristmasDelivery(ev)} className="mt-2 w-full min-h-[46px] rounded-[15px] bg-white text-slate-500 border border-slate-200 font-black text-[9px] uppercase tracking-[.1em] flex items-center justify-center gap-2 active:scale-[.98]"><RefreshCw size={15}/> Volver a pendiente</button>}
                        <button type="button" onClick={()=>deleteChristmas(ev)} className="mt-2 w-full min-h-[48px] rounded-[15px] bg-rose-50 text-rose-600 border border-rose-200 font-black text-[10px] uppercase tracking-[.12em] flex items-center justify-center gap-2 active:scale-[.98]"><Trash2 size={17}/> Eliminar reserva y liberar cupo</button>
                      </div>}
                    </article>;
                  })}</div>
                </section>;
              })}</div>}

              <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm p-4"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-[14px] bg-slate-100 flex items-center justify-center text-xl">🎄</div><div className="min-w-0 flex-1"><p className="font-black text-slate-950">Cuando termine la temporada</p><p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">Puedes quitar Operación Navidad de Inicio y Agenda sin borrar las reservas ni el historial.</p></div></div><button type="button" onClick={finishChristmasSeason} className="mt-4 w-full min-h-[48px] rounded-[15px] bg-slate-950 text-white font-black text-[10px] uppercase tracking-[.12em] active:scale-[.98]">Finalizar temporada y ocultar módulo</button></div>
            </div>
          </div>;
        })()}
        {isAgendaSummaryOpen && (()=>{
          const start=new Date(todayStr+'T00:00:00'); const end=new Date(start); end.setDate(end.getDate()+6);
          const weekEvents=eventosActivos.filter(e=>{const ds=new Date(String(e.fecha||'')+'T00:00:00'); return ds>=start&&ds<=end&&!isPendingWebRequest(e)&&!/cancelado|rechaz|cot/i.test(String(e.estado||''));}).sort((a,b)=>String(a.fecha||'').localeCompare(String(b.fecha||''))||String(a.hora||'').localeCompare(String(b.hora||'')));
          const pendientes=weekEvents.reduce((n,e)=>n+Math.max(utils.safeNum(e.total)-utils.safeNum(e.abono),0),0);
          const cobrado=weekEvents.reduce((n,e)=>n+utils.safeNum(e.abono),0);
          return <div className="fixed inset-0 z-[80] bg-slate-950/35 backdrop-blur-sm flex items-end sm:items-center justify-center px-0 sm:px-5 pt-4 pb-[calc(78px+env(safe-area-inset-bottom))] sm:py-5" onClick={()=>setIsAgendaSummaryOpen(false)}><div onClick={e=>e.stopPropagation()} className="w-full sm:max-w-lg h-auto max-h-[calc(100dvh-110px-env(safe-area-inset-bottom))] sm:max-h-[82vh] flex flex-col overflow-hidden rounded-t-[32px] sm:rounded-[32px] bg-[#F8F7FC] shadow-[0_-20px_60px_rgba(15,23,42,.22)] border border-white">
            <div className="sticky top-0 z-10 p-5 bg-gradient-to-r from-[#FF3EA5] via-[#B83DFF] to-[#7657FF] text-white rounded-t-[32px]"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-white/70">Resumen de agenda</p><h3 className="text-2xl font-black mt-1">Esta semana</h3></div><button type="button" onClick={()=>setIsAgendaSummaryOpen(false)} className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center"><X size={20}/></button></div><div className="grid grid-cols-3 gap-2 mt-5"><div className="rounded-[18px] bg-white/12 p-3"><p className="text-2xl font-black">{weekEvents.length}</p><p className="text-[8px] uppercase font-black tracking-wider text-white/70">Eventos</p></div><div className="rounded-[18px] bg-white/12 p-3"><p className="text-lg font-black">${cobrado.toFixed(0)}</p><p className="text-[8px] uppercase font-black tracking-wider text-white/70">Cobrado</p></div><div className="rounded-[18px] bg-white/12 p-3"><p className="text-lg font-black">${pendientes.toFixed(0)}</p><p className="text-[8px] uppercase font-black tracking-wider text-white/70">Pendiente</p></div></div></div>
            <div className="p-4 pb-6 space-y-3 overflow-y-auto overscroll-contain flex-1 min-h-0 [-webkit-overflow-scrolling:touch]">{weekEvents.length===0?<div className="py-10 text-center"><CalendarDays size={30} className="mx-auto text-[#7657FF] mb-3"/><p className="font-black text-slate-900">No hay eventos esta semana</p></div>:weekEvents.map(ev=><button key={ev.id} type="button" onClick={()=>{setIsAgendaSummaryOpen(false);setFilterDate(ev.fecha);setViewMode('');}} className="w-full text-left rounded-[22px] bg-white border border-slate-100 p-4 shadow-[0_10px_26px_rgba(15,23,42,.06)] flex items-center gap-4"><div className="w-12 h-12 rounded-[16px] bg-[#F2EEFF] text-[#7657FF] flex flex-col items-center justify-center"><span className="text-[9px] font-black uppercase">{String(ev.fecha||'').slice(8,10)}</span><span className="text-[10px] font-black">{String(ev.hora||'').slice(0,5)}</span></div><div className="min-w-0 flex-1"><p className="font-black text-slate-950 truncate">{ev.cliente||'Reserva'}</p><p className="text-[10px] font-bold text-slate-400 mt-1 truncate">{ev.servicio||ev.paquete||'Evento'} · {ev.lugar||'Sin lugar'}</p></div><ChevronRight size={19} className="text-[#7657FF]"/></button>)}</div>
          </div></div>
        })()}
        <button type="button" onClick={()=>{utils.triggerHaptic('light');openModal();}} aria-label="Nueva reserva" className="fixed right-4 bottom-[82px] z-[49] h-14 w-14 sm:w-auto sm:px-5 rounded-[19px] bg-gradient-to-br from-[#FF2F9A] via-[#D72DD8] to-[#7657FF] text-white flex items-center gap-2 justify-center shadow-[0_16px_36px_rgba(184,61,255,.40)] border border-white/50 active:scale-[.94] transition-transform"><Plus size={28} strokeWidth={2.8}/><span className="hidden sm:inline text-[10px] font-black uppercase tracking-[0.14em]">Reserva</span></button>
      </div>
    );
  };

  const renderClientes = () => {
     const totalClientes = enrichedClients.length;
     const totalVip = enrichedClients.filter(c => c.isVIP).length;
     const totalRetomar = enrichedClients.filter(c => c.needsContact).length;
     const filterButton = (id, label, Icon, accent='violet') => {
        const active = clientFilter === id;
        const activeClass = 'bg-gradient-to-r from-[#FF3EA5] via-[#C13BFF] to-[#7657FF] text-white border-transparent shadow-[0_10px_24px_rgba(184,61,255,.24)]';
        return <button type="button" onClick={()=>{utils.triggerHaptic('light');setClientFilter(id);if(id==='recientes')setClientSort('recientes');}} className={`shrink-0 px-4 py-3 rounded-[15px] border flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.08em] transition-all active:scale-[.97] ${active?activeClass:'bg-white/90 border-slate-200/80 text-slate-500 shadow-sm'}`}><Icon size={16}/>{label}</button>;
     };

     return (
       <div className="animate-fadeIn min-h-full p-4 md:p-8 lg:p-10 max-w-7xl mx-auto pb-32 relative z-10 text-slate-900 bg-[radial-gradient(circle_at_10%_0%,rgba(118,87,255,.08),transparent_30%),radial-gradient(circle_at_95%_14%,rgba(255,62,165,.06),transparent_28%),linear-gradient(180deg,#F7F8FC_0%,#F4F6FB_100%)]">
          <div className="pt-2 sm:pt-3 mb-6">
             <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#7657FF] mb-1.5"><Users size={15}/> CRM de clientes</div>
             <h2 className="text-4xl sm:text-5xl font-black text-slate-950 tracking-[-0.04em]">Clientes</h2>
             <p className="text-sm sm:text-base font-medium text-slate-500 mt-1.5">Fideliza y administra a tus clientes.</p>
          </div>

          <div className="mb-8 rounded-[30px] overflow-hidden bg-gradient-to-br from-[#111B35] via-[#27205A] to-[#7657FF] p-[1px] shadow-[0_22px_48px_rgba(76,55,160,.20)]">
            <div className="rounded-[29px] bg-gradient-to-br from-[#111B35] via-[#27205A] to-[#7657FF] p-5 text-white relative overflow-hidden">
              <div className="absolute -right-12 -top-16 w-44 h-44 rounded-full bg-[#FF3EA5]/20 blur-2xl"></div>
              <div className="flex items-center justify-between mb-5 relative"><div><p className="text-[9px] uppercase tracking-[.2em] font-black text-white/55">Cartera de clientes</p><p className="text-xl font-black mt-1">Tu comunidad Diverty</p></div><div className="w-11 h-11 rounded-[15px] bg-white/10 border border-white/10 flex items-center justify-center"><Users size={22}/></div></div>
              <div className="grid grid-cols-3 gap-2 relative">
                <button type="button" onClick={()=>setClientFilter('todos')} className={`rounded-[20px] p-3.5 text-left border transition-all ${clientFilter==='todos'?'bg-white text-slate-950 border-white shadow-lg':'bg-white/8 text-white border-white/10'}`}><Users size={18} className={clientFilter==='todos'?'text-[#7657FF]':'text-white/70'}/><p className="text-2xl font-black mt-3">{totalClientes}</p><p className={`text-[8px] font-black uppercase tracking-[.13em] mt-1 ${clientFilter==='todos'?'text-slate-400':'text-white/55'}`}>Clientes</p></button>
                <button type="button" onClick={()=>setClientFilter('vip')} className={`rounded-[20px] p-3.5 text-left border transition-all ${clientFilter==='vip'?'bg-white text-slate-950 border-white shadow-lg':'bg-white/8 text-white border-white/10'}`}><Award size={18} className="text-amber-400"/><p className="text-2xl font-black mt-3">{totalVip}</p><p className={`text-[8px] font-black uppercase tracking-[.13em] mt-1 ${clientFilter==='vip'?'text-slate-400':'text-white/55'}`}>VIP</p></button>
                <button type="button" onClick={()=>setClientFilter('retomar')} className={`rounded-[20px] p-3.5 text-left border transition-all ${clientFilter==='retomar'?'bg-white text-slate-950 border-white shadow-lg':'bg-white/8 text-white border-white/10'}`}><BellRing size={18} className="text-[#FF69B4]"/><p className="text-2xl font-black mt-3">{totalRetomar}</p><p className={`text-[8px] font-black uppercase tracking-[.13em] mt-1 ${clientFilter==='retomar'?'text-slate-400':'text-white/55'}`}>Retomar</p></button>
              </div>
            </div>
          </div>

          {contactCandidates.length > 0 && !deferredSearchTerm && clientFilter === 'todos' && (
             <div className="mb-8 animate-slideDown rounded-[28px] bg-white/55 border border-white p-4 shadow-[0_16px_40px_rgba(15,23,42,.05)]">
                 <div className="flex items-center justify-between mb-4"><h3 className="text-[11px] font-black text-[#7657FF] uppercase tracking-[0.18em] flex items-center gap-2"><Zap size={18} className="text-amber-500 fill-amber-500"/> Oportunidades de venta</h3><span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Desliza →</span></div>
                 <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                     {contactCandidates.map((c, idx) => {
                         const phoneClean = String(c.telefono).replace(/\D/g,'');
                         const msg = `¡Hola ${c.nombre}! 👋 Te saludamos de Diverty Eventos. Ha pasado un tiempo desde tu última fiesta. ¿Tienes alguna celebración próxima? ¡Tenemos nuevas promociones! 🎉`;
                         return <div key={`contact-${c.clientKey}`} className="snap-center shrink-0 w-[84%] sm:w-80 rounded-[26px] bg-white border border-[#7657FF]/10 p-5 shadow-[0_16px_34px_rgba(69,51,135,.10)]"><div className="flex items-center gap-3 mb-4"><div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-[#7657FF] to-[#D62CFF] text-white flex items-center justify-center font-black">{String(c.nombre||'?').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()}</div><div className="min-w-0 flex-1"><p className="font-black text-slate-950 text-lg truncate">{c.nombre}</p><span className="inline-flex mt-1 items-center gap-1 text-[9px] font-black uppercase tracking-wider text-rose-500 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full"><Clock size={11}/> Sin compras hace {c.daysSince} días</span></div></div><button type="button" onClick={()=>utils.openWhatsAppBusiness(phoneClean,msg)} className="w-full py-3.5 rounded-[16px] bg-gradient-to-r from-[#7657FF] via-[#A843F3] to-[#FF3EA5] text-white font-black text-[11px] uppercase tracking-[.1em] flex items-center justify-center gap-2 shadow-[0_10px_24px_rgba(118,87,255,.22)]"><MessageCircle size={17}/> Enviar promo</button></div>;
                     })}
                 </div>
             </div>
          )}

          <div className="relative mb-3"><Search size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#7657FF]"/><input type="text" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Buscar cliente..." className="w-full h-[62px] rounded-[22px] bg-white/95 border border-white pl-14 pr-12 text-[15px] font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-[#7657FF]/10 shadow-[0_12px_32px_rgba(15,23,42,.06)] placeholder:text-slate-400"/>{searchTerm&&<button type="button" onClick={()=>setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400"><X size={17}/></button>}</div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2 mb-5">
             {filterButton('todos','Todos',Users)}{filterButton('vip','VIP',Award)}{filterButton('retomar','Por retomar',BellRing)}{filterButton('recientes','Recientes',Clock)}
             <button type="button" onClick={()=>setClientSort(clientSort==='gasto'?'recientes':'gasto')} className="shrink-0 px-4 py-3 rounded-[15px] border border-slate-200/80 bg-white/90 text-slate-500 shadow-sm flex items-center gap-2 text-[10px] font-black uppercase tracking-[.08em]"><ArrowDownWideNarrow size={16}/>{clientSort==='gasto'?'Mayor cobrado':'Más recientes'}</button>
          </div>

          <div className="space-y-4">
            {sortedFilteredClients.length === 0 ? <div className="rounded-[26px] bg-white/90 border border-slate-200/70 p-6 text-center shadow-sm"><Users size={28} className="text-[#7657FF] mx-auto mb-2"/><p className="font-black text-slate-950">Sin clientes para este filtro</p><p className="text-sm font-medium text-slate-400 mt-1">Prueba otra búsqueda o categoría.</p></div> : visibleClients.map((c,i)=><ClientCardItem key={c.clientKey} c={c} idx={i} isExpanded={expandedClientId===c.clientKey} onToggleExpand={handleToggleClient} utils={utils} openModal={openModal} onDeleteClient={handleDeleteClient} onEditClient={(client)=>setClientEditModal({isOpen:true,oldName:client.nombre,clientKey:client.clientKey})} historial={historialClientesMap.get(c.clientKey)||[]}/>) }
          </div>

          {visibleClients.length < sortedFilteredClients.length && <button type="button" onClick={()=>setClientVisibleCount(v=>v+10)} className="mt-6 w-full h-[58px] rounded-[20px] bg-white/95 border border-[#7657FF]/15 text-[#7657FF] font-black uppercase tracking-[.12em] text-[10px] shadow-[0_12px_30px_rgba(15,23,42,.06)] active:scale-[.99]">Cargar 10 más · {sortedFilteredClients.length-visibleClients.length} restantes</button>}
          {sortedFilteredClients.length>0 && <p className="text-center text-[10px] font-bold text-slate-400 mt-4">Mostrando {visibleClients.length} de {sortedFilteredClients.length} clientes</p>}
       </div>
     );
  };

  const renderProveedores = () => {
      const term = (deferredSearchTerm || '').trim().toLowerCase();
      const providerIsActive = (p) => {
          const raw = utils.normalizeText(p?.estado || '');
          if (p?.activo === false || p?.inactivo === true || raw === 'inactivo' || raw === 'inactiva') return false;
          return true;
      };
      const categorias = [...new Set(proveedores.map(p => String(p.especialidad || '').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
      const activosCount = proveedores.filter(providerIsActive).length;
      const inactivosCount = proveedores.length - activosCount;
      const asignadosCount = proveedores.filter(p => eventosActivos.some(ev => Array.isArray(ev.subcontratos) && ev.subcontratos.some(sc => sc.proveedorId === p.id))).length;
      const provFiltered = proveedores.filter(p => {
          const matchesTerm = !term || String(p.nombre || '').toLowerCase().includes(term) || String(p.especialidad || '').toLowerCase().includes(term) || String(p.telefono || '').toLowerCase().includes(term);
          const active = providerIsActive(p);
          const matchesStatus = providerFilter === 'todos' || (providerFilter === 'activos' && active) || (providerFilter === 'inactivos' && !active) || providerFilter === 'categoria';
          const matchesCategory = providerFilter !== 'categoria' || !providerCategory || String(p.especialidad || '').trim() === providerCategory;
          return matchesTerm && matchesStatus && matchesCategory;
      });
      const filterBtn = (id, label, Icon) => (
          <button type="button" onClick={()=>{ setProviderFilter(id); if(id !== 'categoria') setProviderCategory(''); }} className={`shrink-0 h-[52px] px-5 rounded-[17px] border flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[.11em] transition-all ${providerFilter===id ? 'bg-gradient-to-r from-[#FF2A9D] via-[#D72BD8] to-[#7657FF] text-white border-transparent shadow-[0_12px_25px_rgba(118,87,255,.22)]' : 'bg-white/95 text-slate-500 border-slate-200/80 shadow-[0_7px_18px_rgba(15,23,42,.05)]'}`}>
              {Icon && <Icon size={16}/>} {label}
          </button>
      );
      return (
        <div className="animate-fadeIn px-4 pt-8 md:p-8 lg:p-10 max-w-7xl mx-auto pb-32 relative z-10">
           <div className="mb-7">
             <div className="flex items-center gap-3 mb-2"><Truck size={34} className="text-[#7657FF]"/><h2 className="text-[38px] leading-none font-black tracking-[-.045em] text-slate-950">Proveedores</h2></div>
             <p className="text-slate-500 text-[15px] font-medium">Gestiona subcontratos, contactos y acuerdos de servicio.</p>
           </div>

           <button type="button" onClick={() => setProveedorModal({ isOpen: true, data: null })} className="w-full h-[64px] rounded-[22px] bg-gradient-to-r from-[#FF2A9D] via-[#D72BD8] to-[#7657FF] text-white font-black text-[16px] flex items-center justify-center gap-3 shadow-[0_16px_32px_rgba(215,43,216,.22)] active:scale-[.99] mb-7"><Plus size={23}/> Nuevo Proveedor</button>

           <div className="grid grid-cols-3 gap-3 mb-7">
             <div className="rounded-[24px] bg-white/95 border border-[#7657FF]/10 p-4 shadow-[0_12px_30px_rgba(15,23,42,.05)]"><div className="w-10 h-10 rounded-2xl bg-violet-50 text-[#7657FF] flex items-center justify-center mb-4"><Truck size={19}/></div><p className="text-3xl font-black text-slate-950">{proveedores.length}</p><p className="text-[9px] font-black uppercase tracking-[.15em] text-slate-400 mt-1">Total</p></div>
             <div className="rounded-[24px] bg-white/95 border border-emerald-100 p-4 shadow-[0_12px_30px_rgba(15,23,42,.05)]"><div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4"><Smartphone size={19}/></div><p className="text-3xl font-black text-slate-950">{activosCount}</p><p className="text-[9px] font-black uppercase tracking-[.15em] text-slate-400 mt-1">Activos</p></div>
             <div className="rounded-[24px] bg-white/95 border border-fuchsia-100 p-4 shadow-[0_12px_30px_rgba(15,23,42,.05)]"><div className="w-10 h-10 rounded-2xl bg-fuchsia-50 text-fuchsia-500 flex items-center justify-center mb-4"><CalendarDays size={19}/></div><p className="text-3xl font-black text-slate-950">{asignadosCount}</p><p className="text-[9px] font-black uppercase tracking-[.15em] text-slate-400 mt-1">Asignados</p></div>
           </div>

           <div className="rounded-[24px] bg-white/95 border border-slate-200/70 shadow-[0_12px_30px_rgba(15,23,42,.05)] h-[68px] flex items-center relative mb-4"><Search size={25} className="absolute left-6 text-[#7657FF]"/><input type="text" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Buscar proveedor o servicio..." className="w-full h-full bg-transparent pl-16 pr-12 outline-none font-bold text-slate-900 placeholder:text-slate-400"/>{searchTerm && <button type="button" onClick={()=>setSearchTerm('')} className="absolute right-5 text-slate-400"><X size={18}/></button>}</div>

           <div className="flex gap-2.5 overflow-x-auto pb-3 scrollbar-hide mb-2">
             {filterBtn('todos','Todos',Users)}
             {filterBtn('activos','Activos',CheckCircle2)}
             {filterBtn('inactivos','Inactivos',Clock)}
             {filterBtn('categoria','Categoría',Briefcase)}
           </div>

           {providerFilter === 'categoria' && <div className="mb-5"><select value={providerCategory} onChange={e=>setProviderCategory(e.target.value)} className="w-full h-[54px] rounded-[18px] bg-white border border-[#7657FF]/15 px-5 text-sm font-bold text-slate-700 outline-none shadow-sm"><option value="">Todas las categorías</option>{categorias.map(cat=><option key={cat} value={cat}>{cat}</option>)}</select></div>}

           <div className="flex items-center justify-between mt-5 mb-4"><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Directorio de proveedores</p><span className="text-[10px] font-black text-[#7657FF] bg-violet-50 px-3 py-1.5 rounded-full">{provFiltered.length} {provFiltered.length===1?'proveedor':'proveedores'}</span></div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
               {provFiltered.length === 0 ? (
                   <div className="col-span-full rounded-[30px] bg-white/95 border border-dashed border-slate-300 p-10 text-center shadow-sm"><div className="w-20 h-20 rounded-[24px] bg-violet-50 text-[#7657FF] flex items-center justify-center mx-auto mb-5"><Truck size={36}/></div><h3 className="text-2xl font-black text-slate-950">Sin Proveedores</h3><p className="text-slate-500 font-medium mt-2">No hay proveedores para este filtro.</p><button type="button" onClick={()=>setProveedorModal({isOpen:true,data:null})} className="mt-6 h-[54px] px-8 rounded-[18px] bg-gradient-to-r from-[#FF2A9D] to-[#7657FF] text-white font-black"><Plus size={18} className="inline mr-2"/> Registrar Ahora</button></div>
               ) : provFiltered.map((p, idx) => (
                   <ProveedorCardItem
                     key={p.id}
                     p={p}
                     idx={idx}
                     isExpanded={expandedProvId === p.id}
                     onToggleExpand={handleToggleProv}
                     utils={utils}
                     onDelete={handleDeleteProveedor}
                     onEdit={(data)=>setProveedorModal({isOpen:true,data})}
                     onWhatsApp={utils.openWhatsAppBusiness}
                     onContrato={async (prov)=>{try{const numbered=await ensureProviderContractNumber(prov);setPrintData(numbered);setPrintType('contrato_proveedor');setIsPrinting(true);}catch(err){console.error('No se pudo numerar el contrato marco:',err);showAlert('No se pudo preparar el contrato marco del proveedor. Intenta nuevamente.',false);}}}
                     onContratoEvento={async (prov,ev)=>{try{const selected=(Array.isArray(ev?.subcontratos)?ev.subcontratos:[]).filter(sc=>sc?.proveedorId===prov?.id && String(sc?.servicio||'').trim());if(!selected.length){showAlert('Esta reserva no tiene servicios seleccionados de este proveedor.',false);return;}const numbered=await ensureProviderEventContractNumber(prov,ev);setPrintData(numbered);setPrintType('contrato_proveedor');setIsPrinting(true);}catch(err){console.error('No se pudo preparar el subcontrato del evento:',err);showAlert('No se pudo preparar el subcontrato de este evento. Verifica que el proveedor tenga servicios asignados en la reserva.',false);}}}
                     eventosActivos={eventosActivos}
                   />
               ))}
           </div>
           {providerFilter === 'inactivos' && inactivosCount === 0 && proveedores.length > 0 && <p className="text-center text-[10px] font-bold text-slate-400 mt-4">No hay proveedores marcados como inactivos.</p>}
        </div>
      );
  };

  const renderFinanzas = () => {
      const deudasPendientes = evtCalculoBase.filter(e => (utils.safeNum(e.total) - utils.safeNum(e.abono)) > 0);
      const tieneDeudas = deudasPendientes.length > 0;
      const ingresosRecibidos = evtCalculoBase.filter(e => Math.min(utils.safeNum(e.abono), utils.safeNum(e.total)) > 0).sort((a,b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
      const tieneIngresos = ingresosRecibidos.length > 0;
      const cuentasProveedores = evtCalculoBase.flatMap(ev => (ev.subcontratos || []).map((sc, subIndex) => ({ ev, sc, subIndex }))).filter(x => utils.safeNum(x.sc.costo) > 0).sort((a,b) => String(b.ev.fecha || '').localeCompare(String(a.ev.fecha || '')));
      const cuentasProveedoresPendientes = cuentasProveedores.filter(x => !(x.sc.pagado === true || utils.normalizeText(x.sc.estadoPago) === 'pagado'));
      const totalGanancia = chartData.reduce((s,d) => s + d.value, 0);

      return (
          <div className="animate-fadeIn p-4 md:p-7 lg:p-8 max-w-5xl mx-auto space-y-5 pb-32 relative z-10">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
               <div><h2 className={UI.title}>Finanzas</h2><p className="text-slate-500 text-sm mt-2 font-medium">Facturación, cobros pendientes, costos internos, proveedores y ganancia.</p></div>
               <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center bg-white/95 backdrop-blur-md p-2 rounded-[24px] border border-slate-200/80 shadow-md w-full sm:w-auto">
                 <div className="flex gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/50">
                   <button type="button" onClick={() => {utils.triggerHaptic('light'); setFinancePeriod('mes');}} className={`px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all duration-300 ease-out active:scale-[0.98] ${financePeriod === 'mes' ? 'bg-gradient-to-r from-[#7657FF] to-[#8B5CF6] text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>Este Mes</button>
                   <button type="button" onClick={() => {utils.triggerHaptic('light'); setFinancePeriod('anio'); setSelectedFinanceYear(todayObj.getFullYear());}} className={`px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all duration-300 ease-out active:scale-[0.98] ${financePeriod === 'anio' ? 'bg-gradient-to-r from-[#7657FF] to-[#8B5CF6] text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>Año</button>
                   <button type="button" onClick={() => {utils.triggerHaptic('light'); setFinancePeriod('todos');}} className={`px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all duration-300 ease-out active:scale-[0.98] ${financePeriod === 'todos' ? 'bg-gradient-to-r from-[#7657FF] to-[#8B5CF6] text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>Histórico</button>
                   <button type="button" onClick={() => {utils.triggerHaptic('light'); setFinancePeriod('seleccionado');}} className={`px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all duration-300 ease-out active:scale-[0.98] ${financePeriod === 'seleccionado' ? 'bg-gradient-to-r from-[#7657FF] to-[#8B5CF6] text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>Otro Mes</button>
                 </div>
                 {financePeriod === 'seleccionado' && (
                   <div className="flex gap-2 items-center animate-fadeIn py-1 px-2 border-l border-slate-200">
                     <select value={selectedFinanceMonth} onChange={(e) => { utils.triggerHaptic('light'); setSelectedFinanceMonth(parseInt(e.target.value)); }} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#7657FF] cursor-pointer">{NOMBRES_MESES.map((name, idx) => (<option key={idx} value={idx + 1}>{name}</option>))}</select>
                     <select value={selectedFinanceYear} onChange={(e) => { utils.triggerHaptic('light'); setSelectedFinanceYear(parseInt(e.target.value)); }} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#7657FF] cursor-pointer">{[2024, 2025, 2026, 2027, 2028].map(y => (<option key={y} value={y}>{y}</option>))}</select>
                   </div>
                 )}
                 {financePeriod === 'anio' && (
                   <div className="flex gap-2 items-center animate-fadeIn py-1 px-2 border-l border-slate-200">
                     <select value={selectedFinanceYear} onChange={(e) => { utils.triggerHaptic('light'); setSelectedFinanceYear(parseInt(e.target.value)); }} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#7657FF] cursor-pointer">{[2024, 2025, 2026, 2027, 2028].map(y => (<option key={y} value={y}>{y}</option>))}</select>
                   </div>
                 )}
                 <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
                 <button type="button" onClick={downloadExcel} className="p-2.5 sm:px-4 sm:py-2.5 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all duration-300 ease-out active:scale-[0.98] flex items-center justify-center gap-2 border border-transparent hover:border-emerald-200" title="Exportar a Excel"><Download size={18} strokeWidth={2.5}/> <span className="hidden sm:inline text-[11px] font-bold uppercase tracking-widest">Excel</span></button>
               </div>
             </div>

             <div className="bg-gradient-to-br from-[#17142B] via-[#34256B] to-[#7657FF] rounded-[30px] p-5 sm:p-8 shadow-[0_24px_60px_rgba(118,87,255,0.24)] relative overflow-hidden border border-white/10 animate-slideDown">
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-[radial-gradient(circle,rgba(37,99,235,0.08)_0%,transparent_60%)] pointer-events-none transform-gpu"></div>
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-[radial-gradient(circle,rgba(124,58,237,0.08)_0%,transparent_60%)] pointer-events-none transform-gpu"></div>
                <div className="text-center relative z-10">
                  <p className="text-white/60 font-bold uppercase tracking-[0.25em] text-[10px] mb-2 flex justify-center items-center gap-2"><Star size={16} className="text-amber-400 fill-amber-400 animate-spin-slow"/> GANANCIA ESTIMADA DE {financePeriod === 'mes' ? 'ESTE MES' : financePeriod === 'anio' ? `AÑO ${financeYear}` : financePeriod === 'todos' ? 'HISTÓRICO' : `${NOMBRES_MESES[financeMonth - 1].toUpperCase()} ${financeYear}`}</p>
                  <h1 className={`text-5xl sm:text-6xl md:text-7xl font-black mb-5 tracking-tighter ${finanzasData.bT >= 0 ? 'text-white' : 'text-rose-300'}`}>${finanzasData.bT.toFixed(0)}<span className="text-2xl sm:text-3xl text-white/40">.{(finanzasData.bT % 1).toFixed(2).substring(2)}</span></h1>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 border-t border-slate-200/60 pt-4 mt-1">
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-left"><p className="text-white/55 font-bold text-[9px] uppercase tracking-widest mb-1.5">Facturado</p><p className="text-emerald-300 font-black text-xl sm:text-2xl tracking-tight">${finanzasData.facturado.toFixed(2)}</p></div>
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-left"><p className="text-white/55 font-bold text-[9px] uppercase tracking-widest mb-1.5">Cobrado</p><p className="text-white font-black text-xl sm:text-2xl tracking-tight">${finanzasData.cobrado.toFixed(2)}</p></div>
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-left"><p className="text-white/55 font-bold text-[9px] uppercase tracking-widest mb-1.5">Por cobrar</p><p className="text-rose-300 font-black text-xl sm:text-2xl tracking-tight">${finanzasData.porCobrar.toFixed(2)}</p></div>
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-left"><p className="text-white/55 font-bold text-[9px] uppercase tracking-widest mb-1.5">Gastos internos</p><p className="text-amber-300 font-black text-xl sm:text-2xl tracking-tight">-${finanzasData.gastosInternos.toFixed(2)}</p></div>
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-left"><p className="text-white/55 font-bold text-[9px] uppercase tracking-widest mb-1.5">Costo proveedores</p><p className="text-purple-200 font-black text-xl sm:text-2xl tracking-tight">-${finanzasData.proveedores.toFixed(2)}</p><p className="text-[8px] font-bold text-white/45 mt-1">Pendiente: ${finanzasData.proveedoresPendientes.toFixed(2)}</p></div>
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-left"><p className="text-white/55 font-bold text-[9px] uppercase tracking-widest mb-1.5">Margen estimado</p><p className="text-white font-black text-xl sm:text-2xl tracking-tight">{finanzasData.roi}%</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 mt-4 pt-4 border-t border-white/10">
                    <button type="button" onClick={() => { setFinanceFocus('cobros'); setTimeout(() => document.getElementById('cuentas-por-cobrar')?.scrollIntoView({behavior:'smooth', block:'start'}), 50); }} className="py-3.5 px-4 rounded-2xl bg-white text-[#5B3FD6] font-black text-[10px] uppercase tracking-[0.16em] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg"><Clock size={16}/> Ver por cobrar</button>
                    <button type="button" onClick={downloadExcel} className="py-3.5 px-4 rounded-2xl bg-white/10 text-white border border-white/15 font-black text-[10px] uppercase tracking-[0.16em] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"><Download size={16}/> Exportar balance</button>
                  </div>
                </div>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 animate-fadeInUp" style={{animationDelay: '100ms'}}>
               <div className={`${UI.card} p-4 sm:p-5 flex flex-col justify-center`}><p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-2.5">Ganancia Hoy</p><p className="text-3xl font-extrabold text-emerald-500 tracking-tight">${animatedGananciaHoy.toFixed(0)}</p></div>
               <div className={`${UI.card} p-4 sm:p-5 flex flex-col justify-center`}><p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-2.5">Por Cobrar Período</p><p className="text-3xl font-extrabold text-rose-500 tracking-tight">${finanzasData.deudaTotalGlobal.toFixed(0)}</p></div>
               <div className={`col-span-2 ${UI.card} p-4 sm:p-5 flex items-end justify-between gap-3 h-[105px]`}>
                 <div className="flex-1 flex justify-between items-end h-full gap-2 sm:gap-3">
                   {chartData.map((d, i) => { const hPercent = (d.value / maxChartVal) * 100; return (<div key={i} className="w-full flex flex-col items-center justify-end h-full gap-1.5 group relative"><div className="absolute -top-7 hidden sm:block bg-slate-900 text-white text-[9px] font-extrabold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap shadow-md">${d.value.toFixed(0)}</div><div className="w-full bg-slate-100/50 rounded-md relative overflow-hidden transition-all duration-300 ease-out group-hover:bg-slate-200/80 h-[58px]"><div className="absolute bottom-0 w-full bg-gradient-to-t from-[#7657FF] to-[#8B5CF6] transition-all duration-1000 ease-out" style={{height: `${hPercent}%`}}></div></div><span className="text-[9px] font-bold uppercase text-slate-400 tracking-[0.15em]">{d.date}</span></div>) })}
                 </div>
                 <div className="pl-6 border-l border-slate-200/80 flex flex-col justify-center h-full"><p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-2 leading-none">Ganancia Período</p><p className="text-2xl font-black text-slate-900 tracking-tight leading-none">${totalGanancia.toFixed(0)}</p></div>
               </div>
             </div>

             <div className={`${UI.card} p-4 sm:p-6 animate-fadeInUp`} style={{animationDelay: '170ms'}}>
               <div className="flex items-start justify-between gap-3 mb-4"><div><h4 className="font-extrabold text-xl text-slate-900 tracking-tight flex items-center gap-2"><Receipt size={21} className="text-rose-500"/> Gastos del período</h4><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 mt-1">Registro rápido por categoría</p></div><div className="text-right"><p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total interno</p><p className="text-xl font-black text-rose-500">-${finanzasData.gastosInternos.toFixed(2)}</p></div></div>
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                 <div className="rounded-[16px] bg-violet-50 border border-violet-100 p-3"><div className="flex items-center gap-2 text-violet-600"><Users size={16}/><span className="text-[9px] font-black uppercase tracking-wider">Personal</span></div><p className="text-xl font-black text-slate-900 mt-2">${gastosPorCategoria.personal.toFixed(2)}</p></div>
                 <div className="rounded-[16px] bg-blue-50 border border-blue-100 p-3"><div className="flex items-center gap-2 text-blue-600"><Truck size={16}/><span className="text-[9px] font-black uppercase tracking-wider">Transporte</span></div><p className="text-xl font-black text-slate-900 mt-2">${gastosPorCategoria.transporte.toFixed(2)}</p></div>
                 <div className="rounded-[16px] bg-pink-50 border border-pink-100 p-3"><div className="flex items-center gap-2 text-pink-600"><Sparkles size={16}/><span className="text-[9px] font-black uppercase tracking-wider">Globos / mat.</span></div><p className="text-xl font-black text-slate-900 mt-2">${gastosPorCategoria.globos.toFixed(2)}</p></div>
                 <div className="rounded-[16px] bg-slate-50 border border-slate-200 p-3"><div className="flex items-center gap-2 text-slate-600"><Receipt size={16}/><span className="text-[9px] font-black uppercase tracking-wider">Otros</span></div><p className="text-xl font-black text-slate-900 mt-2">${gastosPorCategoria.otros.toFixed(2)}</p></div>
               </div>
             </div>

             {financePeriod !== 'anio' && financePeriod !== 'todos' && (
             <div className="rounded-[26px] bg-white border border-slate-200/80 shadow-[0_12px_34px_rgba(15,23,42,.06)] p-4 sm:p-5 animate-fadeInUp" style={{animationDelay:'185ms'}}>
               <div className="flex items-start justify-between gap-3"><div className="flex gap-3"><div className="w-11 h-11 rounded-[15px] bg-emerald-50 text-emerald-600 flex items-center justify-center"><FileSpreadsheet size={20}/></div><div><h4 className="font-black text-lg text-slate-900">Cierre mensual automático</h4><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400 mt-1">{NOMBRES_MESES[financeMonth-1]} {financeYear}</p></div></div>{monthlyReport?.finalized && <Badge color="emerald">Cerrado</Badge>}</div>
               {monthlyReportLoading ? <p className="text-sm font-semibold text-slate-400 mt-4">Revisando reporte…</p> : monthlyReport?.finalized ? <div className="mt-4"><div className="grid grid-cols-3 gap-2"><div className="rounded-[14px] bg-slate-50 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Reservas</p><p className="text-xl font-black text-slate-900 mt-1">{monthlyReport.reservas||0}</p></div><div className="rounded-[14px] bg-emerald-50 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-emerald-500">Facturado</p><p className="text-xl font-black text-emerald-600 mt-1">${utils.safeNum(monthlyReport.facturado).toFixed(0)}</p></div><div className="rounded-[14px] bg-violet-50 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-violet-500">Ganancia</p><p className="text-xl font-black text-violet-600 mt-1">${utils.safeNum(monthlyReport.ganancia).toFixed(0)}</p></div></div><p className="text-[10px] font-semibold text-slate-400 mt-3">Reporte archivado automáticamente en la nube. Puedes volver a este mes desde “Otro Mes”.</p></div> : <div className="mt-4 rounded-[16px] bg-blue-50 border border-blue-100 p-3 flex gap-2.5"><Clock size={17} className="text-[#7657FF] shrink-0"/><p className="text-[11px] font-semibold text-slate-600 leading-relaxed">Mes en curso. El reporte se prepara el último día y queda finalizado automáticamente al abrir la app después del cambio de mes.</p></div>}
             </div>
             )}

             {financePeriod !== 'anio' && financePeriod !== 'todos' && (
             <div className={`${UI.card} p-4 sm:p-6 animate-fadeInUp`} style={{animationDelay: '200ms'}}>
               <div className="flex justify-between items-end mb-3"><div><h4 className="font-extrabold text-xl text-slate-900 tracking-tight flex items-center gap-2"><Award size={22} className="text-amber-500"/> Meta del Período</h4><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 mt-1">{financePeriod === 'todos' ? 'Progreso histórico acumulado' : `Día ${finanzasMes.diasTranscurridos} de ${finanzasMes.diasTotales} del mes`}</p></div><div className="text-right"><span className="text-3xl font-black text-emerald-500 tracking-tight">${finanzasMes.ingresosEsteMesGlobal.toFixed(0)} <span className="text-base font-bold text-slate-400">/ ${appSettings.metaMensual}</span></span></div></div>
               <div className="w-full bg-slate-200/80 rounded-full h-2.5 mb-3 overflow-hidden"><AnimatedProgress value={finanzasMes.progresoMeta} /></div>
               <div className={UI.flexBetween}><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600 bg-slate-100/80 px-3.5 py-1.5 rounded-[10px] border border-slate-200/50 shadow-sm">{finanzasMes.progresoMeta.toFixed(1)}% Alcanzado</p>{financePeriod !== 'todos' && (<p className={`text-[11px] font-bold uppercase tracking-[0.1em] px-3.5 py-1.5 rounded-[10px] border shadow-sm ${finanzasMes.proyeccion >= appSettings.metaMensual ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-500 border-rose-200'}`}>Faltan: $${Math.max(utils.safeNum(appSettings.metaMensual) - finanzasMes.ingresosEsteMesGlobal, 0).toFixed(0)}</p>)}</div>
             </div>

             )}

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div id="cuentas-por-cobrar" className={`flex flex-col gap-3 animate-fadeInUp scroll-mt-6 ${financeFocus === 'cobros' ? 'ring-2 ring-[#FF3EA5]/25 rounded-[30px] p-2 -m-2' : ''}`} style={{animationDelay: '300ms'}}>
                  <div className="rounded-[28px] bg-white border border-slate-200/80 shadow-[0_16px_42px_rgba(15,23,42,0.07)] overflow-hidden">
                    <div className="p-5 bg-gradient-to-r from-[#7657FF]/[0.08] via-white to-[#FF3EA5]/[0.08] border-b border-slate-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><div className="flex items-center gap-2.5"><div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-[#7657FF] to-[#FF3EA5] text-white flex items-center justify-center shadow-[0_8px_20px_rgba(118,87,255,0.24)]"><Clock size={19}/></div><div><h4 className="font-black text-[20px] text-slate-900 tracking-tight leading-tight">Cuentas por cobrar</h4><p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 mt-1">{financePeriod === 'todos' ? 'Histórico' : financePeriod === 'anio' ? `Año ${financeYear}` : `${NOMBRES_MESES[financeMonth - 1]} ${financeYear}`}</p></div></div></div>
                        {tieneDeudas && <button type="button" onClick={handleCopiarCobros} className="shrink-0 text-[9px] font-black uppercase tracking-[0.14em] text-[#6547D9] bg-white hover:bg-[#7657FF]/5 py-2.5 px-3 rounded-[13px] border border-[#7657FF]/20 shadow-sm flex items-center gap-1.5 active:scale-[0.98] transition-all"><Copy size={14}/> Copiar</button>}
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 mt-4">
                        <div className="rounded-[16px] bg-white/90 border border-white p-3 shadow-sm"><p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">Saldo pendiente</p><p className="text-2xl font-black text-rose-500 tracking-tight mt-1">${finanzasData.deudaTotalGlobal.toFixed(2)}</p></div>
                        <div className="rounded-[16px] bg-white/90 border border-white p-3 shadow-sm"><p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">Clientes pendientes</p><p className="text-2xl font-black text-[#7657FF] tracking-tight mt-1">{deudasPendientes.length}</p></div>
                      </div>
                    </div>
                    {!tieneDeudas ? <div className="min-h-[260px] flex flex-col items-center justify-center p-8 text-center"><div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4"><CheckCircle2 size={28}/></div><p className="font-extrabold text-slate-900">Todo está cobrado</p><p className="text-[11px] font-medium text-slate-400 mt-2">No hay saldos pendientes en este período.</p></div> : <div className="p-3 space-y-3 max-h-[520px] overflow-y-auto scrollbar-hide">{deudasPendientes.map((ev) => { const total=utils.safeNum(ev.total); const recibido=Math.min(utils.safeNum(ev.abono),total); const pendiente=Math.max(total-recibido,0); const avance=total>0?Math.min((recibido/total)*100,100):0; return <div key={ev.id} className="rounded-[22px] bg-white border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.05)] p-4">
                      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-black text-[16px] text-slate-900 truncate capitalize">{String(ev.cliente || 'Cliente')}</p><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 mt-1">{ev.fecha ? String(ev.fecha).split('-').reverse().join('/') : 'Sin fecha'} · {String(ev.servicio || 'Reserva')}</p></div><div className="text-right shrink-0"><p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Pendiente</p><p className="text-xl font-black text-rose-500 tracking-tight">${pendiente.toFixed(2)}</p></div></div>
                      <div className="mt-3"><div className="flex justify-between text-[9px] font-bold mb-1.5"><span className="text-slate-400">Recibido ${recibido.toFixed(2)}</span><span className="text-[#7657FF]">{avance.toFixed(0)}% pagado</span></div><div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-[#7657FF] to-[#FF3EA5] transition-all" style={{width:`${avance}%`}}></div></div></div>
                      <div className="grid grid-cols-[1fr_auto] gap-2 mt-3"><button type="button" onClick={() => handleMarcarCobrado(ev)} className="min-h-[44px] rounded-[14px] bg-gradient-to-r from-[#7657FF] to-[#8B5CF6] text-white font-black text-[9px] uppercase tracking-[0.13em] flex items-center justify-center gap-2 shadow-[0_8px_18px_rgba(118,87,255,0.22)] active:scale-[0.98] transition-transform"><CheckCircle2 size={15}/> Marcar cobrado</button><button type="button" onClick={() => sendWhatsAppCall(ev, 'recordatorio', appSettings.empresa)} className="w-12 min-h-[44px] rounded-[14px] bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center active:scale-[0.98] transition-transform" title="Enviar recordatorio por WhatsApp"><MessageCircle size={19}/></button></div>
                    </div>})}</div>}
                  </div>
                </div>

                <div className="flex flex-col gap-3 animate-fadeInUp" style={{animationDelay: '350ms'}}>
                  <div className="rounded-[28px] bg-white border border-slate-200/80 shadow-[0_16px_42px_rgba(15,23,42,0.07)] overflow-hidden">
                    <div className="p-5 bg-gradient-to-r from-amber-50/90 via-white to-rose-50/50 border-b border-slate-100">
                      <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2.5"><div className="w-10 h-10 rounded-[14px] bg-amber-500 text-white flex items-center justify-center shadow-sm"><Truck size={19}/></div><div><h4 className="font-black text-[20px] text-slate-900 tracking-tight">Cuentas por pagar</h4><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 mt-1">Servicios de proveedores asignados</p></div></div><div className="text-right"><p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Pendiente</p><p className="text-xl font-black text-amber-500">${finanzasData.proveedoresPendientes.toFixed(2)}</p></div></div>
                      <div className="grid grid-cols-2 gap-2.5 mt-4"><div className="rounded-[16px] bg-white p-3 shadow-sm"><p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Pagado</p><p className="text-2xl font-black text-emerald-500 mt-1">${finanzasData.proveedoresPagados.toFixed(2)}</p></div><div className="rounded-[16px] bg-white p-3 shadow-sm"><p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Pendientes</p><p className="text-2xl font-black text-amber-500 mt-1">{cuentasProveedoresPendientes.length}</p></div></div>
                    </div>
                    {cuentasProveedores.length === 0 ? <div className="p-8 text-center text-sm font-semibold text-slate-400">No hay costos de proveedores en este período.</div> : <div className="p-3 space-y-3 max-h-[520px] overflow-y-auto scrollbar-hide">{cuentasProveedores.map(({ev,sc,subIndex}) => { const pagado=sc.pagado===true||utils.normalizeText(sc.estadoPago)==='pagado'; return <div key={`${ev.id}-${sc.id||subIndex}`} className="rounded-[22px] bg-white border border-slate-200/80 shadow-sm p-4"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="font-black text-slate-900 truncate">{sc.nombre || 'Proveedor'}</p><p className="text-[10px] font-bold text-slate-500 mt-1">{sc.servicio || 'Servicio'} · {ev.cliente || 'Cliente'}</p><p className="text-[9px] font-semibold text-slate-400 mt-1">{ev.fecha ? String(ev.fecha).split('-').reverse().join('/') : 'Sin fecha'}</p></div><div className="text-right shrink-0"><p className={`text-[8px] font-black uppercase tracking-widest ${pagado?'text-emerald-500':'text-amber-500'}`}>{pagado?'Pagado':'Por pagar'}</p><p className={`text-xl font-black ${pagado?'text-emerald-500':'text-rose-500'}`}>${utils.safeNum(sc.costo).toFixed(2)}</p></div></div><button type="button" onClick={()=>handleEstadoPagoProveedor(ev,subIndex,!pagado)} className={`mt-3 w-full min-h-[43px] rounded-[14px] font-black text-[9px] uppercase tracking-[.13em] flex items-center justify-center gap-2 active:scale-[.98] transition-all ${pagado?'bg-slate-100 text-slate-600':'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'}`}>{pagado?<><RefreshCw size={14}/> Marcar pendiente</>:<><CheckCircle2 size={15}/> Registrar pago</>}</button></div>})}</div>}
                  </div>
                </div>

                <div className="flex flex-col gap-3 animate-fadeInUp" style={{animationDelay: '400ms'}}>
                  <div className="rounded-[28px] bg-white border border-slate-200/80 shadow-[0_16px_42px_rgba(15,23,42,0.07)] overflow-hidden">
                    <div className="p-5 bg-gradient-to-r from-emerald-50/80 via-white to-[#7657FF]/[0.06] border-b border-slate-100">
                      <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2.5 min-w-0"><div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-emerald-400 to-emerald-500 text-white flex items-center justify-center shadow-[0_8px_20px_rgba(16,185,129,0.20)]"><FileSpreadsheet size={19}/></div><div><h4 className="font-black text-[20px] text-slate-900 tracking-tight leading-tight">Ingresos del período</h4><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 mt-1">Dinero realmente recibido</p></div></div><div className="text-right shrink-0"><p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Cobrado</p><p className="text-xl font-black text-emerald-500 tracking-tight">${finanzasData.cobrado.toFixed(2)}</p></div></div>
                      <div className="grid grid-cols-2 gap-2.5 mt-4"><div className="rounded-[16px] bg-white/90 border border-white p-3 shadow-sm"><p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">Movimientos</p><p className="text-2xl font-black text-slate-900 mt-1">{ingresosRecibidos.length}</p></div><div className="rounded-[16px] bg-white/90 border border-white p-3 shadow-sm"><p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">Por cobrar</p><p className="text-2xl font-black text-rose-500 mt-1">${finanzasData.porCobrar.toFixed(2)}</p></div></div>
                    </div>
                    {!tieneIngresos ? <div className="min-h-[260px] flex flex-col items-center justify-center p-8 text-center"><div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4"><FileSpreadsheet size={28}/></div><p className="font-extrabold text-slate-900">Aún no hay cobros recibidos</p><p className="text-[11px] font-medium text-slate-400 mt-2 max-w-[240px]">Los abonos y pagos registrados aparecerán aquí.</p></div> : <div className="p-3 space-y-3 max-h-[520px] overflow-y-auto scrollbar-hide">{ingresosRecibidos.map((e) => { const total=utils.safeNum(e.total); const recibido=Math.min(utils.safeNum(e.abono),total); const pendiente=Math.max(total-recibido,0); const avance=total>0?Math.min((recibido/total)*100,100):0; return <button type="button" key={e.id} onClick={() => openModal(e, false)} className="w-full text-left rounded-[22px] bg-white border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.05)] p-4 active:scale-[0.99] transition-transform">
                      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-black text-[16px] text-slate-900 truncate capitalize">{String(e.cliente || 'Cliente')}</p><p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 mt-1 line-clamp-2">{e.fecha ? String(e.fecha).split('-').reverse().join('/') : 'Sin fecha'} · {String(e.servicio || 'Reserva')}</p></div><div className="text-right shrink-0"><p className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Recibido</p><p className="text-xl font-black text-emerald-500 tracking-tight">+${recibido.toFixed(2)}</p></div></div>
                      <div className="grid grid-cols-2 gap-2 mt-3"><div className="rounded-[13px] bg-slate-50 p-2.5"><p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total reserva</p><p className="text-[13px] font-black text-slate-700 mt-0.5">${total.toFixed(2)}</p></div><div className={`rounded-[13px] p-2.5 ${pendiente>0?'bg-rose-50':'bg-emerald-50'}`}><p className={`text-[8px] font-black uppercase tracking-widest ${pendiente>0?'text-rose-400':'text-emerald-500'}`}>{pendiente>0?'Saldo pendiente':'Estado'}</p><p className={`text-[13px] font-black mt-0.5 ${pendiente>0?'text-rose-500':'text-emerald-600'}`}>{pendiente>0?`$${pendiente.toFixed(2)}`:'Pagado'}</p></div></div>
                      <div className="mt-3"><div className="flex justify-between text-[9px] font-bold mb-1.5"><span className="text-slate-400">Progreso del pago</span><span className="text-[#7657FF]">{avance.toFixed(0)}%</span></div><div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-[#7657FF]" style={{width:`${avance}%`}}></div></div></div>
                    </button>})}</div>}
                  </div>
                </div>
             </div>
          </div>
      );
  };

  const renderConfig = () => {
    const meta = Math.max(utils.safeNum(appSettings.metaMensual), 0);
    const mesActual = eventosActivos.filter(e => {
      const d = String(e.fecha || '');
      const estado = utils.normalizeText(e.estado || '');
      return d.startsWith(todayStr.slice(0,7)) && !isPendingWebRequest(e) && !/cancelado|rechazada|cot/.test(estado) && e.deletedLocally !== true;
    });
    const facturadoMes = mesActual.reduce((s,e)=>s+utils.safeNum(e.total),0);
    const avanceMeta = meta > 0 ? Math.min((facturadoMes/meta)*100,100) : 0;
    const empresa = appSettings.empresa || {};
    const go = (view) => { utils.triggerHaptic('light'); setConfigView(view); };
    const back = () => { utils.triggerHaptic('light'); setConfigView('home'); };
    const sectionShell = (children) => (
      <div className="animate-fadeIn min-h-full p-4 md:p-8 lg:p-10 max-w-4xl mx-auto pb-32 relative z-10 text-slate-900 bg-[radial-gradient(circle_at_10%_0%,rgba(118,87,255,.08),transparent_30%),radial-gradient(circle_at_95%_14%,rgba(255,62,165,.06),transparent_28%),linear-gradient(180deg,#F7F8FC_0%,#F4F6FB_100%)]">
        {children}
      </div>
    );
    const subHeader = (title, subtitle, Icon, accent='text-[#7657FF]') => (
      <div className="mb-6">
        <button type="button" onClick={back} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-slate-500 bg-white/90 border border-white px-3 py-2 rounded-[13px] shadow-sm active:scale-[.97]"><ChevronLeft size={16}/> Ajustes</button>
        <div className="flex items-center gap-3 mt-5"><div className="w-12 h-12 rounded-[17px] bg-white border border-white shadow-[0_10px_28px_rgba(15,23,42,.07)] flex items-center justify-center"><Icon size={23} className={accent}/></div><div><h2 className="text-2xl sm:text-3xl font-black tracking-[-.035em] text-slate-950">{title}</h2><p className="text-sm font-medium text-slate-500 mt-1">{subtitle}</p></div></div>
      </div>
    );
    const menuItem = (view, Icon, title, desc, iconClass, iconBg, extra=null, danger=false) => (
      <button type="button" onClick={()=>go(view)} className={`w-full text-left rounded-[23px] p-4 flex items-center gap-3 border shadow-[0_10px_28px_rgba(15,23,42,.055)] active:scale-[.985] transition-all ${danger?'bg-rose-50/90 border-rose-200':'bg-white/95 border-white'}`}>
        <div className={`w-12 h-12 shrink-0 rounded-[16px] flex items-center justify-center ${iconBg}`}><Icon size={22} className={iconClass}/></div>
        <div className="min-w-0 flex-1"><p className={`font-black text-[16px] tracking-tight ${danger?'text-rose-600':'text-slate-950'}`}>{title}</p><p className={`text-[11px] font-medium mt-0.5 leading-snug ${danger?'text-rose-400':'text-slate-500'}`}>{desc}</p>{extra}</div>
        <ChevronRight size={20} className={danger?'text-rose-500':'text-slate-400'}/>
      </button>
    );

    if (configView === 'business') return sectionShell(<>
      {subHeader('Mi negocio','Información general de tu empresa.',Briefcase,'text-[#FF3EA5]')}
      <div className="rounded-[30px] bg-white/95 border border-white shadow-[0_18px_48px_rgba(15,23,42,.07)] p-5 sm:p-7">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100"><div className="w-24 h-24 rounded-[25px] bg-gradient-to-br from-[#FF3EA5] via-[#B83DFF] to-[#7657FF] p-[3px] shadow-[0_14px_32px_rgba(184,61,255,.22)]"><img src={LOGO_URL} alt="Diverty" className="w-full h-full object-contain bg-white rounded-[22px] p-3"/></div><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Identidad</p><h3 className="text-2xl font-black text-slate-950 mt-1">Diverty Eventos</h3><p className={`inline-flex items-center gap-1.5 mt-2 text-[10px] font-black uppercase tracking-wider ${isOnline?'text-emerald-500':'text-amber-500'}`}><Cloud size={14}/>{isOnline?'Firebase conectado':'Modo offline'}</p></div></div>
        <div className="mt-6 rounded-[20px] bg-gradient-to-r from-[#F6F2FF] to-[#FFF1F8] border border-[#7657FF]/10 p-4"><p className="text-[10px] uppercase tracking-[.15em] font-black text-[#7657FF]">Administrador</p><p className="font-black text-slate-900 mt-1">Administrador Global</p><p className="text-xs text-slate-500 mt-1">La identidad visual actual se utiliza en el CRM y documentos.</p></div>
      </div>
    </>);

    if (configView === 'billing') return sectionShell(<>
      {subHeader('Facturación y Banco','Datos usados en contratos, facturas y WhatsApp.',Briefcase)}
      <div className="rounded-[30px] bg-white/95 border border-white shadow-[0_18px_48px_rgba(15,23,42,.07)] p-5 sm:p-7">
        <div className="mb-6 rounded-[18px] bg-emerald-50 border border-emerald-100 p-4 flex gap-3"><Save size={20} className="text-emerald-500 shrink-0"/><div><p className="font-black text-emerald-700">Datos autoguardados</p><p className="text-xs font-medium text-emerald-600/80 mt-1">Los cambios se guardan automáticamente.</p></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">{[
          ['nombreTitular','Nombre del titular o empresa'],['ruc','RUC / Identificación'],['banco','Entidad bancaria'],['tipoCuenta','Tipo de cuenta'],['numeroCuenta','Número de cuenta'],['telefono','Teléfono (Yappy / Contacto)']
        ].map(([key,label])=><Field key={key} label={label} value={empresa[key]||''} onChange={e=>updateSettings({...appSettings,empresa:{...empresa,[key]:e.target.value}})}/>)}</div>
        <div className="mt-6 bg-blue-50/80 p-4 rounded-[18px] border border-blue-100 flex items-start gap-3"><Info size={19} className="text-[#7657FF] shrink-0 mt-0.5"/><p className="text-xs font-medium text-slate-600 leading-relaxed">Estos datos se insertan automáticamente en contratos, facturas y mensajes de WhatsApp.</p></div>
      </div>
    </>);

    if (configView === 'goal') return sectionShell(<>
      {subHeader('Meta mensual','Define tu objetivo de ventas mensual.',Award,'text-amber-500')}
      <div className="rounded-[30px] bg-white/95 border border-white shadow-[0_18px_48px_rgba(15,23,42,.07)] overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-[#7657FF] via-[#A33CFF] to-[#FF3EA5] text-white"><p className="text-[10px] font-black uppercase tracking-[.18em] text-white/75">Meta actual</p><div className="flex items-end gap-2 mt-2"><span className="text-4xl font-black">${meta.toFixed(0)}</span><span className="text-white/70 font-bold mb-1">mensual</span></div></div>
        <div className="p-5 sm:p-6"><div className="flex justify-between text-xs font-black"><span className="text-[#7657FF]">{avanceMeta.toFixed(0)}% alcanzado</span><span className="text-slate-500">${facturadoMes.toFixed(0)} / ${meta.toFixed(0)}</span></div><div className="h-3 bg-slate-100 rounded-full overflow-hidden mt-3"><div className="h-full rounded-full bg-gradient-to-r from-[#7657FF] to-[#FF3EA5]" style={{width:`${avanceMeta}%`}}></div></div>
          <div className="mt-6"><label className="text-[10px] font-black text-slate-400 uppercase tracking-[.18em]">Editar objetivo ($)</label><input type="number" value={appSettings.metaMensual} onChange={e=>updateSettings({...appSettings,metaMensual:utils.safeNum(e.target.value)})} className="mt-2 w-full h-16 rounded-[19px] border border-slate-200 bg-slate-50 px-5 text-2xl font-black outline-none focus:ring-4 focus:ring-[#7657FF]/10 focus:border-[#7657FF]/40"/></div>
        </div>
      </div>
    </>);

    if (configView === 'notifications') return sectionShell(<>
      {subHeader('Notificaciones','Alertas importantes y token Push.',BellRing,'text-[#FF3EA5]')}
      <div className="rounded-[30px] bg-white/95 border border-white shadow-[0_18px_48px_rgba(15,23,42,.07)] p-5">
        <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-[16px] bg-emerald-50 flex items-center justify-center"><BellRing size={22} className="text-emerald-500"/></div><div className="flex-1"><p className="font-black text-slate-950">Notificaciones Push</p><p className="text-xs text-slate-500 mt-1">Obtén o renueva el token de este dispositivo.</p></div></div>
        <button type="button" onClick={activarNotificaciones} className="mt-5 w-full h-14 rounded-[18px] bg-gradient-to-r from-[#FF3EA5] via-[#B83DFF] to-[#7657FF] text-white font-black text-[11px] uppercase tracking-[.13em] shadow-[0_12px_28px_rgba(184,61,255,.25)] active:scale-[.98]"><span className="inline-flex items-center gap-2"><BellRing size={18}/> Obtener Token Push</span></button>
        <div className="mt-4 rounded-[18px] bg-blue-50 border border-blue-100 p-4 flex gap-3"><Info size={18} className="text-[#7657FF] shrink-0"/><p className="text-xs font-medium text-slate-600 leading-relaxed">Las alertas web de reservas continúan apareciendo en la campana superior del CRM.</p></div>
      </div>
    </>);

    if (configView === 'documents') return sectionShell(<>
      {subHeader('Documentos','Información utilizada en contratos y facturas.',FileSpreadsheet,'text-blue-500')}
      <div className="rounded-[30px] bg-white/95 border border-white shadow-[0_18px_48px_rgba(15,23,42,.07)] p-5 sm:p-6"><div className="rounded-[20px] bg-gradient-to-br from-blue-50 to-[#F4F0FF] border border-blue-100 p-5"><FileSpreadsheet size={28} className="text-[#7657FF]"/><h3 className="font-black text-xl text-slate-950 mt-4">Datos centralizados</h3><p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">Los contratos y facturas toman automáticamente la información guardada en Facturación y Banco.</p><button type="button" onClick={()=>go('billing')} className="mt-5 px-4 py-3 rounded-[15px] bg-white text-[#7657FF] border border-[#7657FF]/15 font-black text-[10px] uppercase tracking-wider shadow-sm">Revisar datos</button></div></div>
    </>);

    if (configView === 'resources') return sectionShell(<>
      {subHeader('Personal disponible','Define tu capacidad simultánea. La app descontará automáticamente el personal ocupado por reservas que se cruzan en fecha y horario.',Users,'text-amber-500')}
      <div className="rounded-[30px] bg-white/95 border border-white shadow-[0_18px_48px_rgba(15,23,42,.07)] p-5 sm:p-7">
        <div className="rounded-[22px] bg-gradient-to-br from-amber-50 via-white to-violet-50 border border-amber-100 p-5 mb-5"><p className="font-black text-slate-950">Capacidad operativa</p><p className="text-xs font-medium text-slate-500 mt-2 leading-relaxed">La página compara estos límites con las reservas confirmadas que se cruzan en fecha y horario. Las solicitudes pendientes no descuentan personal hasta que las aceptes; antes de aceptar la app vuelve a comprobar la disponibilidad.</p></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[22px] border border-violet-100 bg-violet-50/70 p-4"><div className="w-11 h-11 rounded-[15px] bg-white text-[#7657FF] flex items-center justify-center shadow-sm"><Users size={20}/></div><label className="block mt-4 text-[9px] font-black uppercase tracking-[.15em] text-slate-400">Animadores</label><input type="number" min="0" max="50" value={staffCapacity.animadores} onChange={e=>setStaffCapacity(prev=>({...prev,animadores:Math.max(0,Math.min(50,Number(e.target.value)||0))}))} className="mt-2 w-full h-14 rounded-[16px] bg-white border border-violet-100 px-4 text-2xl font-black text-slate-950 outline-none"/></div>
          <div className="rounded-[22px] border border-amber-100 bg-amber-50/70 p-4"><div className="w-11 h-11 rounded-[15px] bg-white text-amber-500 flex items-center justify-center shadow-sm"><Sparkles size={20}/></div><label className="block mt-4 text-[9px] font-black uppercase tracking-[.15em] text-slate-400">Payasos</label><input type="number" min="0" max="50" value={staffCapacity.payasos} onChange={e=>setStaffCapacity(prev=>({...prev,payasos:Math.max(0,Math.min(50,Number(e.target.value)||0))}))} className="mt-2 w-full h-14 rounded-[16px] bg-white border border-amber-100 px-4 text-2xl font-black text-slate-950 outline-none"/></div>
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/70 p-4"><div className="w-11 h-11 rounded-[15px] bg-white text-blue-500 flex items-center justify-center shadow-sm"><CalendarDays size={20}/></div><label className="block mt-4 text-[9px] font-black uppercase tracking-[.15em] text-slate-400">Eventos simultáneos</label><input type="number" min="1" max="100" value={normalSimultaneousCapacity} onChange={e=>setNormalSimultaneousCapacity(Math.max(1,Math.min(100,Number(e.target.value)||1)))} className="mt-2 w-full h-14 rounded-[16px] bg-white border border-blue-100 px-4 text-2xl font-black text-slate-950 outline-none"/></div>
          <div className="rounded-[22px] border border-rose-100 bg-rose-50/70 p-4"><div className="w-11 h-11 rounded-[15px] bg-white flex items-center justify-center shadow-sm text-2xl">🎅</div><label className="block mt-4 text-[9px] font-black uppercase tracking-[.15em] text-slate-400">Santas Navidad</label><input type="number" min="1" max="20" value={christmasSantaCapacity} onChange={e=>setChristmasSantaCapacity(Math.max(1,Math.min(20,Number(e.target.value)||1)))} className="mt-2 w-full h-14 rounded-[16px] bg-white border border-rose-100 px-4 text-2xl font-black text-slate-950 outline-none"/></div>
        </div>
        <button type="button" onClick={()=>saveStaffCapacity(staffCapacity,normalSimultaneousCapacity,christmasSantaCapacity)} className="mt-5 w-full h-14 rounded-[18px] bg-gradient-to-r from-[#FF3EA5] via-[#B83DFF] to-[#7657FF] text-white font-black text-[11px] uppercase tracking-[.13em] shadow-[0_12px_28px_rgba(184,61,255,.22)] active:scale-[.98]"><span className="inline-flex items-center gap-2"><Save size={18}/> Guardar capacidad operativa</span></button>
        <div className="mt-4 rounded-[18px] bg-blue-50 border border-blue-100 p-4 flex gap-3"><Info size={18} className="text-[#7657FF] shrink-0"/><p className="text-xs font-medium text-slate-600 leading-relaxed">La web usa estos límites para evitar solicitudes imposibles y para controlar los cupos simultáneos. En cada solicitud podrás revisar total, ocupados y libres, y corregir manualmente el personal requerido antes de aceptarla. La cantidad de Santas también se administra aquí, no desde el administrador visual de la web.</p></div>
      </div>
    </>);

    if (configView === 'tools') return sectionShell(<>
      {subHeader('Herramientas del sistema','Funciones administrativas de uso ocasional.',Settings,'text-[#7657FF]')}
      <div className="space-y-4">
        <div className="rounded-[30px] bg-white/95 border border-white shadow-[0_18px_48px_rgba(15,23,42,.07)] p-5 sm:p-6"><div className="rounded-[22px] border border-[#7657FF]/15 bg-[#F7F4FF] p-5"><p className="font-black text-slate-950">Preparación de disponibilidad pública y numeración</p><p className="text-xs font-medium text-slate-500 mt-2 leading-relaxed">Ejecutar una vez después de actualizar los archivos y las reglas, sin otros equipos editando.</p><button type="button" className="mt-5 w-full h-13 py-3.5 rounded-[16px] bg-gradient-to-r from-[#7657FF] to-[#A33CFF] text-white font-black text-[10px] uppercase tracking-[.12em] shadow-[0_10px_24px_rgba(118,87,255,.22)]" onClick={async e=>{const b=e.currentTarget;b.disabled=true;try{await prepareDivertyData();showAlert('Preparación completada.',true);}catch(err){console.error(err);showAlert('Preparación incompleta. Reintenta con conexión.',false);}finally{b.disabled=false;}}}>Preparar actualización</button></div></div>
        <div className="rounded-[30px] bg-white/95 border border-white shadow-[0_18px_48px_rgba(15,23,42,.07)] p-5 sm:p-6">
          <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-[16px] bg-red-50 flex items-center justify-center text-2xl">🎅</div><div className="min-w-0 flex-1"><p className="font-black text-slate-950">Operación Navidad</p><p className="text-xs font-medium text-slate-500 mt-1">Oculta el acceso al terminar la temporada sin borrar ninguna reserva.</p></div></div>
          <button type="button" onClick={()=>setChristmasVisibility(!christmasModuleVisible)} className={`mt-5 w-full min-h-[52px] rounded-[16px] font-black text-[10px] uppercase tracking-[.12em] border active:scale-[.98] ${christmasModuleVisible?'bg-rose-50 text-rose-600 border-rose-200':'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>{christmasModuleVisible?'Ocultar módulo de Navidad':'Mostrar módulo de Navidad'}</button>
        </div>
      </div>
    </>);

    if (configView === 'security') return sectionShell(<>
      {subHeader('Seguridad y sesión','Control de acceso a este dispositivo.',Lock,'text-emerald-500')}
      <div className="rounded-[30px] bg-white/95 border border-white shadow-[0_18px_48px_rgba(15,23,42,.07)] p-5"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-[16px] bg-emerald-50 flex items-center justify-center"><Lock size={22} className="text-emerald-500"/></div><div><p className="font-black text-slate-950">Sesión del administrador</p><p className="text-xs text-slate-500 mt-1">Cierra la sesión actual de Diverty CRM.</p></div></div><button type="button" onClick={handleLogout} className="mt-5 w-full h-14 rounded-[18px] bg-slate-950 text-white font-black text-[11px] uppercase tracking-[.13em] active:scale-[.98]">Cerrar sesión</button></div>
    </>);

    if (configView === 'danger') return sectionShell(<>
      {subHeader('Zona de peligro','Acciones avanzadas del sistema.',AlertTriangle,'text-rose-500')}
      <div className="rounded-[30px] bg-rose-50/90 border border-rose-200 shadow-[0_18px_48px_rgba(244,63,94,.08)] p-5 sm:p-6"><div className="flex gap-4"><div className="w-12 h-12 rounded-[16px] bg-white flex items-center justify-center shrink-0"><Trash2 size={22} className="text-rose-500"/></div><div><h3 className="font-black text-xl text-rose-600">Purgar sistema</h3><p className="text-sm font-medium text-rose-500/85 mt-2 leading-relaxed">Eliminará permanentemente reservas, historial de clientes y registros financieros locales y en la nube.</p></div></div><button type="button" onClick={handleWipeAll} className="mt-6 w-full h-14 rounded-[18px] bg-rose-600 text-white font-black text-[11px] uppercase tracking-[.15em] shadow-[0_12px_28px_rgba(225,29,72,.20)] active:scale-[.98]"><span className="inline-flex items-center gap-2"><Trash2 size={18}/> Purgar sistema</span></button></div>
    </>);

    return sectionShell(<>
      <div className="pt-2 mb-6"><div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-[#7657FF]"><Settings size={15}/> Centro de control</div><h2 className="text-4xl sm:text-5xl font-black tracking-[-.045em] text-slate-950 mt-2">Ajustes</h2><p className="text-sm sm:text-base font-medium text-slate-500 mt-1.5">Configura tu negocio y personaliza tu sistema.</p></div>
      <div className="rounded-[30px] bg-gradient-to-r from-[#FF3EA5] via-[#B83DFF] to-[#7657FF] p-[1px] shadow-[0_18px_44px_rgba(184,61,255,.24)] mb-6"><div className="rounded-[29px] bg-gradient-to-r from-[#FF3EA5] via-[#B83DFF] to-[#7657FF] p-5 text-white flex items-center gap-4"><div className="w-20 h-20 rounded-[22px] bg-white p-2.5 shadow-lg shrink-0"><img src={LOGO_URL} alt="Diverty" className="w-full h-full object-contain"/></div><div className="min-w-0 flex-1"><p className="text-xl font-black">Diverty Eventos</p><p className="text-sm font-medium text-white/85 mt-1">Administrador Global</p><span className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider ${isOnline?'bg-emerald-400/20 text-emerald-50':'bg-amber-400/20 text-amber-50'}`}><Cloud size={12}/>{isOnline?'En línea con Firebase':'Modo offline'}</span></div><ChevronRight size={22} className="text-white/75"/></div></div>
      <div className="space-y-3">
        {menuItem('business',Briefcase,'Mi negocio','Logo, identidad e información general.','text-[#FF3EA5]','bg-rose-50')}
        {menuItem('billing',FileSpreadsheet,'Facturación y banco','Datos fiscales y cuenta bancaria para documentos.','text-[#7657FF]','bg-[#F2EEFF]',<span className="inline-flex mt-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-wider">Completo</span>)}
        {menuItem('goal',Award,'Meta mensual','Objetivo de ventas y seguimiento.','text-amber-500','bg-amber-50',<div className="mt-2 flex items-center gap-2"><div className="h-1.5 flex-1 max-w-[140px] bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#7657FF] to-[#FF3EA5] rounded-full" style={{width:`${avanceMeta}%`}}></div></div><span className="text-[9px] font-black text-slate-400">{avanceMeta.toFixed(0)}%</span></div>)}
        {menuItem('notifications',BellRing,'Notificaciones','Push, alertas web y permisos.','text-[#FF3EA5]','bg-rose-50')}
        {menuItem('resources',Users,'Personal disponible','Animadores y payasos disponibles por horario.','text-amber-500','bg-amber-50',<span className="inline-flex mt-2 px-2.5 py-1 rounded-full bg-violet-50 text-[#7657FF] text-[8px] font-black uppercase tracking-wider">{staffCapacity.animadores} anim. · {staffCapacity.payasos} pay.</span>)}
        {menuItem('documents',FileSpreadsheet,'Documentos','Información para contratos y facturas.','text-blue-500','bg-blue-50')}
        {menuItem('tools',Settings,'Herramientas del sistema','Mantenimiento y numeración.','text-[#7657FF]','bg-[#F2EEFF]')}
        {menuItem('security',Lock,'Seguridad y sesión','Cerrar sesión y gestión de acceso.','text-emerald-500','bg-emerald-50')}
        {menuItem('danger',AlertTriangle,'Zona de peligro','Acciones avanzadas del sistema.','text-rose-500','bg-rose-100',null,true)}
      </div>
    </>);
  };
  if (isAuthLoading) return (
    <div className="font-outfit min-h-[100dvh] relative overflow-hidden flex items-center justify-center bg-[linear-gradient(155deg,#F8F8FF_0%,#F4F6FF_48%,#FFF8FC_100%)]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');.font-outfit{font-family:'Outfit',sans-serif}@keyframes splashFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.015)}}@keyframes splashLoad{0%{width:8%}55%{width:64%}100%{width:88%}}@keyframes splashGlow{0%,100%{opacity:.28;transform:scale(.94)}50%{opacity:.48;transform:scale(1.06)}}.splash-logo{animation:splashFloat 3.2s ease-in-out infinite}.splash-load{animation:splashLoad 1.6s ease-in-out forwards}.splash-glow{animation:splashGlow 2.4s ease-in-out infinite}`}</style>
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#7657FF]/15 blur-2xl"></div>
      <div className="absolute -top-28 left-20 w-72 h-64 rounded-[45%] bg-[#FF3EA5]/10 blur-2xl rotate-12"></div>
      <div className="absolute -bottom-28 -right-24 w-96 h-80 rounded-[45%] bg-gradient-to-tr from-[#7657FF]/25 via-[#FF3EA5]/16 to-amber-300/18 blur-xl"></div>
      <Star className="absolute top-[12%] left-[18%] text-amber-300 fill-amber-200/70 rotate-12" size={28}/>
      <Star className="absolute top-[27%] right-[14%] text-[#7657FF]/35 fill-[#7657FF]/10 -rotate-12" size={24}/>
      <Sparkles className="absolute bottom-[20%] right-[18%] text-[#FF3EA5]/35" size={28}/>
      <div className="relative z-10 w-full max-w-[430px] px-8 text-center">
        <div className="relative mx-auto w-[82%] max-w-[330px] splash-logo">
          <div className="absolute inset-x-[10%] bottom-0 h-14 bg-[#7657FF]/25 blur-2xl rounded-full splash-glow"></div>
          <img src={LOGO_URL} alt="Diverty Recreación y eventos" className="relative w-full h-auto object-contain drop-shadow-[0_18px_28px_rgba(118,87,255,.12)]" crossOrigin="anonymous"/>
        </div>
        <div className="mt-20 mx-auto max-w-[250px]">
          <div className="h-[7px] rounded-full bg-slate-200/80 overflow-hidden shadow-inner"><div className="splash-load h-full rounded-full bg-gradient-to-r from-[#7657FF] via-[#B83DFF] to-[#FF3EA5] shadow-[0_0_16px_rgba(184,61,255,.35)]"></div></div>
          <p className="mt-4 text-[13px] font-semibold tracking-wide text-slate-500">Cargando tu experiencia...</p>
        </div>
      </div>
    </div>
  );

  if (!isAuthenticated) return (
    <div className="font-outfit min-h-[100dvh] flex items-center justify-center px-5 py-8 relative overflow-hidden bg-[linear-gradient(155deg,#F8F9FF_0%,#F4F6FF_48%,#FFF8FC_100%)]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');.font-outfit{font-family:'Outfit',sans-serif}@keyframes portalFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes portalGlow{0%,100%{opacity:.2;transform:scale(.94)}50%{opacity:.42;transform:scale(1.06)}}.portal-logo{animation:portalFloat 4s ease-in-out infinite}.portal-glow{animation:portalGlow 3s ease-in-out infinite}`}</style>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-28 -left-24 w-80 h-80 rounded-full bg-[#7657FF]/18 blur-2xl"></div>
        <div className="absolute top-16 left-[18%] w-64 h-44 rounded-full bg-[#FF3EA5]/9 blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[#FF3EA5]/12 blur-2xl"></div>
        <div className="absolute -bottom-28 -right-20 w-80 h-80 rounded-full bg-[#7657FF]/16 blur-2xl"></div>
        <div className="absolute top-[8%] right-[7%] text-amber-300/80 rotate-12"><Star size={44}/></div>
        <div className="absolute top-[19%] right-[4%] text-[#FF3EA5]/35 -rotate-12"><Star size={72}/></div>
        <div className="absolute top-[15%] left-[8%] text-amber-300/70"><Sparkles size={27}/></div>
      </div>
      <div className="w-full max-w-[440px] relative z-10 rounded-[38px] bg-white/76 backdrop-blur-2xl border border-white shadow-[0_30px_80px_rgba(76,67,144,.13),inset_0_1px_0_rgba(255,255,255,.95)] px-6 sm:px-9 py-8 sm:py-10 animate-fadeInUp">
        <div className="flex justify-center">
          <div className="relative portal-logo">
            <div className="portal-glow absolute -inset-5 rounded-[34px] bg-gradient-to-tr from-[#7657FF] via-[#B83DFF] to-[#FF3EA5] blur-2xl"></div>
            <div className="relative w-[122px] h-[122px] rounded-[31px] bg-white/95 p-4 border border-white shadow-[0_18px_38px_rgba(118,87,255,.20)] flex items-center justify-center">
              <img src={LOGO_URL} alt="Diverty" className="w-full h-full object-contain" crossOrigin="anonymous"/>
            </div>
            <div className="absolute -bottom-3 -right-3 w-12 h-12 rounded-[17px] bg-gradient-to-br from-amber-400 to-orange-500 border-[3px] border-white shadow-lg flex items-center justify-center rotate-12"><Star size={22} className="text-white fill-white"/></div>
          </div>
        </div>
        <div className="text-center mt-8 mb-8">
          <h1 className="text-[34px] sm:text-[38px] leading-none font-black tracking-[-.045em] text-slate-950">Portal <span className="bg-gradient-to-r from-[#7657FF] to-[#FF3EA5] bg-clip-text text-transparent">Diverty</span></h1>
          <p className="mt-4 text-[10px] sm:text-[11px] font-bold uppercase tracking-[.28em] text-slate-500">Gestión de Eventos Premium</p>
          <div className="w-16 h-1 rounded-full bg-gradient-to-r from-[#7657FF] to-[#FF3EA5] mx-auto mt-5"></div>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><Mail size={21} className="text-[#7657FF]/75 group-focus-within:text-[#7657FF]"/></div>
            <input type="email" required value={emailInput} onChange={(e)=>setEmailInput(e.target.value)} placeholder="Correo Electrónico" className="w-full h-[62px] rounded-[19px] bg-white/88 border border-slate-200/90 pl-14 pr-5 text-[16px] font-semibold text-slate-900 placeholder:text-slate-400 outline-none shadow-[0_7px_20px_rgba(15,23,42,.05)] focus:border-[#7657FF]/55 focus:ring-4 focus:ring-[#7657FF]/10 transition-all"/>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><Lock size={21} className="text-[#7657FF]/70 group-focus-within:text-[#7657FF]"/></div>
            <input type="password" required value={passwordInput} onChange={(e)=>setPasswordInput(e.target.value)} placeholder="Contraseña" className="w-full h-[62px] rounded-[19px] bg-white/88 border border-slate-200/90 pl-14 pr-5 text-[16px] font-semibold text-slate-900 placeholder:text-slate-400 outline-none shadow-[0_7px_20px_rgba(15,23,42,.05)] focus:border-[#7657FF]/55 focus:ring-4 focus:ring-[#7657FF]/10 transition-all"/>
          </div>
          <button type="submit" className="w-full h-[62px] mt-3 rounded-[20px] bg-gradient-to-r from-[#6D4BFF] via-[#A43BFA] to-[#F12BB5] text-white font-black uppercase tracking-[.14em] shadow-[0_16px_34px_rgba(164,59,250,.28)] active:scale-[.975] transition-transform flex items-center justify-center gap-3">Ingresar <Sparkles size={22}/><span className="w-8 h-8 rounded-full bg-white/16 flex items-center justify-center"><ChevronRight size={18}/></span></button>
        </form>
        <div className="mt-7 pt-5 border-t border-slate-200/70 flex items-center justify-center gap-2 text-slate-400"><ShieldCheck size={16} className="text-[#7657FF]/70"/><span className="text-[10px] font-semibold">Acceso seguro y confiable</span></div>
      </div>
    </div>
  );

  return (
    <div className="font-outfit min-h-[100dvh] flex overflow-hidden selection:bg-[#FF3EA5]/30 transition-colors duration-200 relative bg-[#F4F6FB] text-slate-900">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap'); .font-outfit{font-family:'Outfit',sans-serif;} @keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideLeft{from{transform:translateX(100%)}to{transform:translateX(0)}} @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}} .animate-fadeIn{animation:fadeIn 0.3s ease-out forwards;} .animate-slideLeft{animation:slideLeft 0.3s cubic-bezier(0.16,1,0.3,1) forwards;} .animate-slideUp{animation:slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards;} .animate-fadeInUp{animation:fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards;} @keyframes pulse-slow{0%,100%{opacity:0.04;transform:scale(1);}50%{opacity:0.06;transform:scale(1.05);}} .animate-pulse-slow{animation:pulse-slow 10s ease-in-out infinite;} @keyframes spin-slow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} .animate-spin-slow{animation:spin-slow 15s linear infinite;} ::-webkit-scrollbar{display:none;} input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;} .pb-safe{padding-bottom: env(safe-area-inset-bottom);} button{-webkit-tap-highlight-color:transparent;} @media(max-width:640px){#main-content{background:radial-gradient(circle at 85% 8%,rgba(255,62,165,.055),transparent 24%),radial-gradient(circle at 10% 28%,rgba(118,87,255,.06),transparent 28%),linear-gradient(180deg,#F5F6FB 0%,#FAFAFD 48%,#F4F6FB 100%);} #main-content>div{padding-left:14px;padding-right:14px;} input,select,textarea{font-size:16px!important;} button{touch-action:manipulation;} .animate-fadeIn{animation-duration:.14s!important;} .animate-slideLeft{animation-duration:.18s!important;} .animate-slideUp{animation-duration:.2s!important;} .animate-fadeInUp{animation-duration:.22s!important;} }`}</style>
      <Bg /><Toast alert={toastAlert} /><Confirm modal={confirmModal} setModal={setConfirmModal} />
      <QuickExpenseModal modal={expenseModal} onClose={()=>setExpenseModal({isOpen:false,event:null})} onSave={handleSaveQuickExpense} />
      <NavigationChoiceModal modal={navigationModal} onClose={()=>setNavigationModal({isOpen:false,googleUrl:'',wazeUrl:'',label:''})} />
      <NotifModal isOpen={isNotifOpen} onClose={()=>{setIsNotifOpen(false);setNotificationPendingId('')}} eventosActivos={eventosActivos} onConfirmWebRequest={handleConfirmWebRequest} onRejectWebRequest={handleRejectWebRequest} onUpdateWebRequest={handleUpdateWebRequest} staffCapacity={staffCapacity} christmasSantaCapacity={christmasSantaCapacity} targetReservationId={notificationPendingId} />
      <EventFormModal isOpen={modalConfig.isOpen} initialData={modalConfig.initialData} isCotizacionMode={modalConfig.isCotizacion} onClose={closeModal} onSave={handleSaveFromModal} PAQUETES={catalogoPaquetes} onAddCustomService={handleAddCustomService} showAlert={showAlert} clientesRegistrados={clientsList} listadoProveedores={proveedores} />
      <ClientEditModal isOpen={clientEditModal.isOpen} oldName={clientEditModal.oldName} clientKey={clientEditModal.clientKey} onClose={() => setClientEditModal({isOpen:false, oldName:'', clientKey:''})} onSave={handleSaveClientName} />
      <ProveedorModal isOpen={proveedorModal.isOpen} data={proveedorModal.data} onClose={() => setProveedorModal({isOpen:false, data:null})} onSave={handleSaveProveedor} />
      
      {isPrinting && printData && (
        <PdfTemplate
          printData={printData}
          printType={printType}
          pdfScale={pdfScale}
          onClose={() => { setIsPrinting(false); setPrintData(null); setPrintType(null); }}
          onPrint={printNativePDF}
          onShare={handleSharePDF}
          onDownload={downloadPDF}
          appSettings={appSettings}
          eventosActivos={eventosActivos}
          catalogoPaquetes={catalogoPaquetes}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 relative z-10 h-[100dvh] overflow-hidden">
          <header style={{backgroundColor:'rgba(7,17,38,0.985)'}} className="backdrop-blur-2xl border-b border-white/10 px-4 sm:px-6 py-3 flex justify-between items-center z-40 sticky top-0 shadow-[0_10px_28px_rgba(2,6,23,0.22)]">
             <div className="flex items-center gap-3"><div className="bg-white/[0.08] p-1.5 rounded-[13px] border border-white/10 shadow-sm ring-1 ring-white/[0.03]"><img src={LOGO_URL} alt="Logo" className="h-7 w-7 object-contain" /></div><h1 className="text-[19px] sm:text-xl font-black text-white tracking-[-0.025em] flex items-center gap-2">Diverty CRM {!isOnline && <Cloud size={18} className="text-amber-500 animate-pulse"/>}</h1></div>
             <button onClick={() => setIsNotifOpen(true)} className="relative p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-[14px] transition-all">
                <BellRing size={22} />
                {eventosActivos.filter(e => utils.normalizeText(e.estado) === 'pendiente' && utils.normalizeText(e.origen) === 'web directa').length > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[#FF2F9A] text-white text-[9px] font-black rounded-full border-2 border-[#071126] flex items-center justify-center shadow-md">{Math.min(99,eventosActivos.filter(e => utils.normalizeText(e.estado) === 'pendiente' && utils.normalizeText(e.origen) === 'web directa').length)}</span>}
             </button>
          </header>
          <main id="main-content" className="flex-1 overflow-y-auto scroll-smooth pb-24 overscroll-y-none relative">
            {activeTab === 'inicio' && renderInicio()}
            {activeTab === 'eventos' && renderEventos()}
            {activeTab === 'clientes' && renderClientes()}
            {activeTab === 'proveedores' && renderProveedores()}
            {activeTab === 'finanzas' && (financeLoading || isHistoryLoading ? <p className="p-6">Actualizando período…</p> : financeLoadError ? <p className="p-6 text-red-600">{financeLoadError}</p> : renderFinanzas())}
            {activeTab === 'web' && <Suspense fallback={<div className="py-16 text-center text-slate-400 font-bold">Cargando administrador web…</div>}><WebAdmin db={db} appId={appId} currentUser={firebaseUser} showAlert={showAlert} /></Suspense>}
            {activeTab === 'config' && renderConfig()}
          </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 w-full bg-white/[0.965] backdrop-blur-2xl border-t border-white flex justify-around items-center pb-safe pt-1.5 px-1.5 z-50 shadow-[0_-10px_30px_rgba(15,23,42,0.075),inset_0_1px_0_rgba(139,92,246,.08)] h-[70px]">
         {NAV_ITEMS.map(i => {
            const Ic = i.icon; const a = activeTab === i.id;
            return (
              <button key={i.id} onClick={() => handleTabChange(i.id)} className={`relative flex flex-1 min-w-0 flex-col items-center justify-center gap-1 h-[58px] rounded-[14px] transition-all duration-300 ${a ? 'text-[#FF3EA5] -translate-y-0.5 bg-gradient-to-b from-[#FF3EA5]/[0.055] to-[#7657FF]/[0.035]' : 'text-slate-400 hover:text-slate-700'}`}>
                 {a && <span className="absolute top-0 w-7 h-[3px] rounded-full bg-gradient-to-r from-[#FF3EA5] to-[#7657FF] shadow-[0_3px_10px_rgba(255,62,165,.28)]"></span>}<Ic size={a?23:21} strokeWidth={a?2.6:2.1} className={a ? 'drop-shadow-sm' : ''}/>
                 <span className={`max-w-full truncate text-[8px] sm:text-[9px] uppercase tracking-[0.04em] ${a?'font-black':'font-bold'}`}>{i.text}</span>
              </button>
            )
         })}
      </nav>
    </div>
  );
}
