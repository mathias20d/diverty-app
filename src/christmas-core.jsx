import {serviceDurationHours} from "./lib/service-duration.mjs";

import {portalIndex} from "./lib/customer-portal.mjs";

import {reservationGpsPoint} from "./lib/gps-point.mjs";

import React,{useState,useEffect,useRef,useMemo,useCallback,memo,useDeferredValue,useSyncExternalStore,lazy,Suspense} from "react";

import {Calendar,Users,Settings,Plus,Edit,Trash2,X,FileSignature,Clock,MapPin,Info,Download,Receipt,MessageCircle,RefreshCw,AlertTriangle,CheckCircle2,Cloud,Search,CalendarDays,ChevronRight,ChevronLeft,Star,BellRing,TrendingUp,DollarSign,Briefcase,Lock,Mail,Smartphone,FileText,Check,Sparkles,Map as MapIcon,Zap,PieChart,ChevronDown,Sun,Award,FileSpreadsheet,Copy,Share2,Home,Menu,BarChart3,ArrowUpRight,ArrowDownRight,ArrowDownWideNarrow,Save,Minus,Printer,ShieldCheck,Truck,Handshake,PenLine,Globe2} from "lucide-react";

import {getFirestore,collection,doc,setDoc as rawSetDoc,getDoc,getDocs,getDocsFromCache,query,where,onSnapshot,deleteDoc as rawDeleteDoc,enableIndexedDbPersistence,runTransaction as rawRunTransaction,writeBatch,orderBy,limit,startAfter,documentId} from "firebase/firestore";

import {app,auth,ADMIN_UID,LOGO_URL} from "./lib/firebase-auth.mjs";

import {hasPlaceDescription,needsPlaceReference} from "./lib/location-reference.mjs";

import {bookingControlDates} from "./lib/booking-control.mjs";

import {pendingRequests,requestReview,transportPending} from "./lib/web-request-review.mjs";

import {peakResourceUsage} from "./lib/resource-usage.mjs";

const confirmCentralRequest = async (...args) => args[0]?.centralBookingVersion === 1 ? (await import('./lib/central-booking.mjs')).confirmCentralRequest(...args) : null;

const db = getFirestore(app);

const appId = 'diverty-oficial';

const getDocRef = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'eventos', id);

const getConfigRef = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'configuracion', id);

const isEventRef = ref => ref.path.startsWith(`artifacts/${appId}/public/data/eventos/`);

const availabilityRef = id => doc(db, 'artifacts', appId, 'public', 'data', 'disponibilidad_web', id);

const CHRISTMAS_SERVICE_BUFFER_MINUTES = 30;

const christmasTimeMinutes = value => {
  const m = String(value || '').match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

const christmasEventGps = reservationGpsPoint;

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

const setDoc = async (ref, value, options) => {
  if (!isEventRef(ref)) return options ? rawSetDoc(ref, value, options) : rawSetDoc(ref, value);
  return runTransaction(db, async tx => {
    if (options?.merge) await tx.get(ref);
    tx.set(ref, value, options);
  });
};

const deleteDoc = async ref => {
  if (!isEventRef(ref)) return rawDeleteDoc(ref);
  return runTransaction(db, tx => { tx.delete(ref); });
};

const UI = {
  card: "bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(248,249,255,0.94))] backdrop-blur-2xl border border-slate-200/70 rounded-[26px] shadow-[0_8px_26px_rgba(15,23,42,0.065),inset_0_1px_0_rgba(255,255,255,0.95)] relative overflow-hidden group hover:shadow-[0_16px_42px_rgba(71,51,150,0.11)] hover:border-violet-200/80 transition-all duration-500",
  modal: "bg-white/[0.98] backdrop-blur-2xl rounded-t-[32px] sm:rounded-[32px] shadow-[0_30px_90px_rgba(8,15,35,0.30)] border border-white/80 transition-transform duration-300",
  input: "w-full bg-white/75 focus:bg-white border border-slate-200/80 focus:border-[#8B5CF6]/55 rounded-[16px] p-4 text-[15px] font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-[#8B5CF6]/10 transition-all placeholder:text-slate-400 shadow-[0_5px_18px_rgba(15,23,42,0.035),inset_0_1px_0_rgba(255,255,255,.9)]",
  label: "block text-[10px] uppercase text-slate-500 font-extrabold tracking-[0.18em] mb-2 ml-1",
  title: "text-3xl sm:text-5xl font-black text-slate-950 tracking-[-0.03em]",
  btnBase: "font-black rounded-[16px] transition-all duration-300 ease-out active:scale-[0.96] flex items-center justify-center gap-2.5 px-5 py-3.5 relative overflow-hidden group",
  btnPrimary: "bg-gradient-to-r from-[#FF3EA5] via-[#B83DFF] to-[#7657FF] bg-[length:200%_auto] hover:bg-[100%_center] text-white shadow-[0_9px_24px_rgba(184,61,255,0.24),inset_0_1px_0_rgba(255,255,255,.28)] hover:shadow-[0_14px_34px_rgba(184,61,255,0.32)] border border-white/25",
  btnDefault: "bg-white/90 text-slate-700 hover:text-slate-950 border border-slate-200/80 shadow-[0_5px_16px_rgba(15,23,42,0.045),inset_0_1px_0_rgba(255,255,255,.9)] hover:shadow-[0_10px_24px_rgba(71,51,150,.09)] hover:border-violet-200",
  flexBetween: "flex justify-between items-center"
};

const utils = {
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

const Confirm = memo(({ modal, setModal }) => { if (!modal.isOpen) return null; return (<div className="fixed inset-0 z-[100000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overscroll-none"><div className={`${UI.modal} max-w-md w-full text-center border-rose-200/50 p-8`}><div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-100"><AlertTriangle size={32} className="text-rose-500" /></div><h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">¿Estás seguro?</h3><p className="text-slate-500 font-medium mb-8 leading-relaxed">{modal.message}</p><div className="flex gap-4"><button type="button" onClick={() => setModal({ isOpen: false, message: '', onConfirm: null })} className="flex-1 py-3.5 rounded-xl font-bold uppercase tracking-wider text-slate-600 bg-slate-100/80 hover:bg-slate-200 transition-all border border-slate-200/50">Cancelar</button><button type="button" onClick={() => { if (modal.onConfirm) modal.onConfirm(); setModal({ isOpen: false, message: '', onConfirm: null }); }} className="flex-1 py-3.5 rounded-xl font-bold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 shadow-lg transition-all">Confirmar</button></div></div></div>); });

const NavigationChoiceModal = memo(function NavigationChoiceModal({ modal, onClose }) {
    if (!modal?.isOpen) return null;
    const open = url => { if (!url) return; utils.triggerHaptic('light'); window.open(url, '_blank', 'noopener,noreferrer'); onClose(); };
    return (
      <div className="fixed inset-0 z-[100010] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn" onClick={onClose}>
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
          <p className="text-[10px] font-semibold text-slate-400 text-center mt-4 leading-relaxed">Maps y Waze abrirán las coordenadas guardadas. Comprueba que el pin coincida con el lugar del evento.</p>
        </div>
      </div>
    );
});

const NotifModal = memo(function NotifModal({ onMapClick, isOpen, onClose, eventosActivos, onConfirmWebRequest, onRejectWebRequest, onUpdateWebRequest, staffCapacity, christmasSantaCapacity = 1, targetReservationId = '' }) {
    const [requestFilter, setRequestFilter] = useState('all');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [confirming, setConfirming] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [confirmedName, setConfirmedName] = useState('');
    const [rejectedName, setRejectedName] = useState('');
    const [santaAsignado, setSantaAsignado] = useState('Santa 1');
    const [transportDraft, setTransportDraft] = useState('');
    const [savingTransport, setSavingTransport] = useState(false);
    const [locationDraft,setLocationDraft]=useState('');
    const [savingLocation,setSavingLocation]=useState(false);
    const [referenceDraft,setReferenceDraft]=useState('');
    const [savingReference,setSavingReference]=useState(false);
    useEffect(()=>{setReferenceDraft(String(selectedRequest?.referenciaLugar||''));},[selectedRequest?.id,selectedRequest?.referenciaLugar]);
    const [resourceDraft, setResourceDraft] = useState({ animadores:0, payasos:0, durationMinutes:120 });
    const [savingResources, setSavingResources] = useState(false);
    useEffect(() => { if (!isOpen) { setSelectedRequest(null); setConfirming(false); setRejecting(false); setConfirmedName(''); setRejectedName(''); setSantaAsignado('Santa 1'); setTransportDraft(''); setSavingTransport(false); setResourceDraft({animadores:0,payasos:0,durationMinutes:120}); setSavingResources(false); } }, [isOpen]);
    useEffect(() => {
        if (selectedRequest) {
            setSantaAsignado(selectedRequest.santaAsignado || 'Santa 1');
            setTransportDraft(String(utils.safeNum(selectedRequest.transporte)));
            const gps=christmasEventGps(selectedRequest);
            setLocationDraft(gps?`${gps.lat},${gps.lng}`:'');
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
    const allRequests = pendingRequests(eventosActivos);
    const reqs = pendingRequests(eventosActivos, requestFilter);
    const requestFilters = [['all','Todas'],['review','Por revisar'],['soon','Próximas'],['deposit','Falta abono']];
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
    const needsTransportReview = transportPending(selectedRequest);
    const needsReferenceReview=needsPlaceReference(selectedRequest);
    const selectedGps=christmasEventGps(selectedRequest);
    const saveReference=async()=>{
        if(!selectedRequest || savingReference) return;
        const reference=referenceDraft.trim();
        if(!hasPlaceDescription(reference) || reference.length>500) return window.alert('Escribe el nombre de la barriada, PH o salón y una indicación para llegar (máximo 500 caracteres).');
        setSavingReference(true);
        try {
            const updated=await onUpdateWebRequest(selectedRequest,{referenciaLugar:reference});
            if(updated)setSelectedRequest(prev=>({...prev,...updated}));
        } finally {setSavingReference(false);}
    };
    const canAddLocation=isChristmasRequest && !selectedGps;
    const saveLocation=async()=>{
        if(!selectedRequest || savingLocation) return;
        const gps=christmasEventGps({direccion:locationDraft});
        if(!gps) return window.alert('Pega un enlace con coordenadas de Maps/Waze o escribe latitud,longitud válidas. Un enlace corto no contiene el punto exacto.');
        setSavingLocation(true);
        try {
            const updated=await onUpdateWebRequest(selectedRequest,{...gps});
            if(updated) setSelectedRequest(prev=>({...prev,...updated}));
        } finally {setSavingLocation(false);}
    };
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
        if(needsReferenceReview) return window.alert('Añade la barriada, PH o salón del evento antes de aceptar. El GPS solo marca el punto.');
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
            <div className="flex flex-wrap gap-1.5 mb-3">{requestReview(e).issues.map(issue=><span key={issue} className="rounded-lg bg-amber-50 text-amber-800 px-2 py-1 text-[10px] font-bold">Revisar {issue.toLowerCase()}</span>)}{requestReview(e).missingDeposit&&<span className="rounded-lg bg-slate-100 text-slate-600 px-2 py-1 text-[10px] font-bold">Falta abono</span>}</div>
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
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5"><div className="bg-white/80 rounded-[24px] p-2 mb-4 border border-white shadow-sm"><div className="grid grid-cols-2 gap-2"><div className="rounded-[18px] bg-gradient-to-r from-[#7657FF] to-[#9A5CFF] text-white px-4 py-3"><p className="text-[9px] uppercase tracking-[.15em] font-black opacity-75">Pendientes</p><p className="text-2xl font-black">{allRequests.length}</p></div><div className="rounded-[18px] bg-slate-50 px-4 py-3"><p className="text-[9px] uppercase tracking-[.15em] font-black text-slate-400">Canal</p><p className="text-sm font-black text-slate-700 mt-1">Página Web</p></div></div></div><div className="flex flex-wrap gap-2 mb-4" aria-label="Filtrar solicitudes">{requestFilters.map(([key,label])=><button key={key} type="button" aria-pressed={requestFilter===key} onClick={()=>setRequestFilter(key)} className={`rounded-full px-3 py-2 text-[11px] font-bold border ${requestFilter===key?'bg-[#7657FF] text-white border-[#7657FF]':'bg-white text-slate-600 border-slate-200'}`}>{label} ({pendingRequests(eventosActivos,key).length})</button>)}</div><div className="space-y-3">{reqs.length === 0 ? <div className="bg-white rounded-[28px] p-10 text-center border border-slate-200/70 shadow-sm mt-5"><div className="w-20 h-20 rounded-[26px] bg-emerald-50 mx-auto flex items-center justify-center"><CheckCircle2 size={38} className="text-emerald-500"/></div><p className="font-black text-[#10182D] text-xl mt-5">{allRequests.length?'Sin resultados en este filtro':'Todo al día'}</p><p className="font-semibold text-slate-400 text-sm mt-1">{allRequests.length?'Elige Todas para ver las demás solicitudes.':'No hay nuevas solicitudes web.'}</p></div> : reqs.map(webCard)}</div></div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 pb-8">
                        <div className="bg-white rounded-[28px] border border-white shadow-[0_16px_45px_rgba(15,23,42,.08)] overflow-hidden"><div className="p-5 bg-gradient-to-br from-[#F7F3FF] via-white to-[#FFF4FA] border-b border-slate-100"><div className="flex justify-between items-center gap-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] text-amber-600"><Zap size={11}/> Nueva solicitud</span><span className="text-[10px] font-black text-slate-500 bg-white px-3 py-1.5 rounded-full shadow-sm">{selectedRequest.fecha?.split('-').reverse().join('/')}</span></div><div className="mt-4 flex justify-between gap-3"><div><h4 className="font-black text-[27px] text-[#10182D] leading-tight">{selectedRequest.cliente}</h4><p className="text-xs font-bold text-slate-500 mt-1">Solicitud recibida directamente desde la página web</p></div>{phone && <div className="flex gap-2"><button type="button" onClick={()=>utils.openWhatsAppBusiness(phone,`Hola ${selectedRequest.cliente}, recibimos tu solicitud de reserva.`)} className="w-11 h-11 rounded-[15px] bg-emerald-50 text-emerald-500 flex items-center justify-center"><MessageCircle size={21}/></button><a href={`tel:${phone}`} className="w-11 h-11 rounded-[15px] bg-[#7657FF]/10 text-[#7657FF] flex items-center justify-center"><Smartphone size={21}/></a></div>}</div></div>
                            <div className="p-4 space-y-3"><div className="grid grid-cols-3 gap-2"><div className="rounded-[18px] bg-slate-50 p-3"><CalendarDays size={18} className="text-[#7657FF]"/><p className="text-[9px] uppercase font-black tracking-wider text-slate-400 mt-2">Fecha</p><p className="text-xs font-black text-slate-800 mt-1">{selectedRequest.fecha?.split('-').reverse().join('/') || '—'}</p></div><div className="rounded-[18px] bg-slate-50 p-3"><Clock size={18} className="text-[#7657FF]"/><p className="text-[9px] uppercase font-black tracking-wider text-slate-400 mt-2">Hora</p><p className="text-xs font-black text-slate-800 mt-1">{utils.formatTime12h(selectedRequest.hora)}</p></div><div className="rounded-[18px] bg-slate-50 p-3"><MapPin size={18} className="text-[#FF3EA5]"/><p className="text-[9px] uppercase font-black tracking-wider text-slate-400 mt-2">Ubicación</p><p className="text-[11px] font-black text-slate-800 mt-1 leading-tight">{selectedRequest.ubicacion || '—'}</p></div></div>
                            <div className="rounded-[20px] bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-2"><p className="text-[9px] uppercase tracking-[.14em] font-black text-slate-400">Lugar del evento</p><span className={`text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${selectedGps?'bg-emerald-50 text-emerald-600':'bg-amber-50 text-amber-600'}`}>{selectedGps?'GPS':'Dirección escrita'}</span></div>
                                <p className="font-bold text-slate-700 mt-2 whitespace-pre-wrap break-words">{selectedRequest.direccion || 'Dirección no indicada'}</p>
                                <button type="button" onClick={()=>onMapClick(selectedRequest.direccion,selectedRequest.ubicacion,selectedRequest)} className="w-full mt-3 min-h-[48px] rounded-[14px] bg-[#7657FF] text-white font-black text-xs flex items-center justify-center gap-2"><MapIcon size={18}/> Ver ubicación en el mapa</button>
                                {!selectedGps && <p className="text-[11px] text-slate-500 mt-2">El mapa buscará la dirección escrita. Verifica que sea el lugar del evento.</p>}
                                <label htmlFor="request-place-reference" className="block text-xs font-black text-slate-600 mt-4">Barriada, PH o salón de fiestas</label>
                                <textarea id="request-place-reference" value={referenceDraft} onChange={e=>setReferenceDraft(e.target.value)} maxLength={500} rows={2} placeholder="Ej.: PH Las Palmeras, Brisas del Golf, salón social, entrada por la garita" className="w-full mt-2 rounded-xl border border-slate-200 p-3 text-sm text-slate-800"/>
                                <p className={`text-[11px] mt-2 ${needsReferenceReview?'text-amber-700 font-bold':'text-slate-500'}`}>{needsReferenceReview?'Falta el nombre o una referencia del lugar. Confírmalo con el cliente antes de aceptar.':'El GPS y la referencia te ayudan a confirmar dónde debe llegar el equipo.'}</p>
                                <button type="button" disabled={savingReference} onClick={saveReference} className="mt-3 rounded-xl bg-slate-900 text-white px-4 py-3 text-xs font-black disabled:opacity-60">{savingReference?'Guardando…':'Guardar referencia'}</button>
                            </div>
                            <div className="rounded-[22px] bg-gradient-to-br from-[#F7F3FF] to-white p-4 border border-[#7657FF]/10"><div className="flex justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[.12em] font-black text-[#7657FF] flex items-center gap-1.5"><Sparkles size={14}/> Servicio solicitado</p><p className="font-black text-[#10182D] mt-2 whitespace-pre-wrap">{selectedRequest.servicio || '—'}</p></div><span className="shrink-0 h-fit rounded-full bg-[#7657FF]/10 px-3 py-1.5 font-black text-[#7657FF]">{money(selectedRequest.total)}</span></div>{selectedRequest.descripcionEvento && <p className="font-semibold text-slate-600 whitespace-pre-wrap mt-3 text-sm leading-relaxed">{selectedRequest.descripcionEvento}</p>}{selectedRequest.comentarios && <div className="mt-3 pt-3 border-t border-[#7657FF]/10"><p className="text-[9px] uppercase tracking-widest font-black text-slate-400">Comentarios</p><p className="font-semibold text-slate-600 whitespace-pre-wrap mt-1">{selectedRequest.comentarios}</p></div>}</div>
                            {(selectedRequest.esNavidad === true || /entregas de nochebuena/i.test(String(selectedRequest.servicio || ''))) && <div className="rounded-[22px] border border-red-100 bg-gradient-to-br from-red-50 via-white to-amber-50 p-4"><div className="flex items-center gap-3 mb-3"><div className="w-11 h-11 rounded-[15px] bg-red-100 flex items-center justify-center text-2xl">🎅</div><div><p className="text-[9px] uppercase tracking-[.14em] font-black text-red-500">Operación Navidad</p><p className="font-black text-[#10182D]">Santa asignado</p></div></div><select value={santaAsignado} onChange={e=>setSantaAsignado(e.target.value)} className="w-full rounded-[16px] border border-red-100 bg-white px-4 py-3 text-sm font-black text-slate-800 outline-none">{availableSantaNames.map(name=><option key={name} value={name}>{name}</option>)}</select><p className="mt-2 text-[10px] font-semibold text-slate-400">Selecciona quién atenderá esta entrega. La asignación quedará guardada en la reserva.</p></div>}
                            {showResourcePanel && resourceStatus && <div className={`rounded-[22px] border p-4 ${resourceStatus.feasible?'border-emerald-100 bg-emerald-50/70':'border-rose-200 bg-rose-50/80'}`}><div className="flex items-start justify-between gap-3"><div><p className={`text-[9px] uppercase tracking-[.14em] font-black ${resourceStatus.feasible?'text-emerald-600':'text-rose-600'}`}>Personal para esta reserva</p><p className="font-black text-slate-900 mt-1">{resourceStatus.feasible?'Sí puedes recibirla con el personal actual':'No hay suficiente personal en este horario'}</p><p className="text-[10px] font-semibold text-slate-500 mt-1">Puedes corregir aquí lo que realmente requiere el servicio antes de aceptar.</p></div>{resourceStatus.feasible?<CheckCircle2 size={24} className="text-emerald-500 shrink-0"/>:<AlertTriangle size={24} className="text-rose-500 shrink-0"/>}</div><div className="grid grid-cols-2 gap-2 mt-4"><div className="rounded-[16px] bg-white p-3 border border-slate-100"><p className="text-[8px] font-black uppercase text-slate-400">Animadores</p><div className="grid grid-cols-3 gap-1 mt-2 text-center"><div><p className="text-[8px] font-bold text-slate-400">Total</p><p className="font-black text-slate-800">{resourceStatus.capacity.animadores}</p></div><div><p className="text-[8px] font-bold text-slate-400">Ocupados</p><p className="font-black text-amber-600">{resourceStatus.usage.animadores}</p></div><div><p className="text-[8px] font-bold text-slate-400">Libres</p><p className="font-black text-emerald-600">{resourceStatus.available.animadores}</p></div></div><label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mt-3">Esta reserva necesita</label><input type="number" min="0" max="50" value={resourceDraft.animadores} onChange={e=>setResourceDraft(prev=>({...prev,animadores:Math.max(0,Math.min(50,Number(e.target.value)||0))}))} className="mt-1 w-full h-11 rounded-[13px] border border-slate-200 bg-slate-50 px-3 text-center font-black text-slate-900 outline-none focus:border-[#7657FF]/40"/></div><div className="rounded-[16px] bg-white p-3 border border-slate-100"><p className="text-[8px] font-black uppercase text-slate-400">Payasos</p><div className="grid grid-cols-3 gap-1 mt-2 text-center"><div><p className="text-[8px] font-bold text-slate-400">Total</p><p className="font-black text-slate-800">{resourceStatus.capacity.payasos}</p></div><div><p className="text-[8px] font-bold text-slate-400">Ocupados</p><p className="font-black text-amber-600">{resourceStatus.usage.payasos}</p></div><div><p className="text-[8px] font-bold text-slate-400">Libres</p><p className="font-black text-emerald-600">{resourceStatus.available.payasos}</p></div></div><label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mt-3">Esta reserva necesita</label><input type="number" min="0" max="50" value={resourceDraft.payasos} onChange={e=>setResourceDraft(prev=>({...prev,payasos:Math.max(0,Math.min(50,Number(e.target.value)||0))}))} className="mt-1 w-full h-11 rounded-[13px] border border-slate-200 bg-slate-50 px-3 text-center font-black text-slate-900 outline-none focus:border-[#7657FF]/40"/></div></div><div className="grid grid-cols-[1fr_auto] gap-2 mt-3 items-end"><div><label className="block text-[8px] font-black uppercase tracking-wider text-slate-400">Duración que ocupa al personal</label><div className="relative mt-1"><input type="number" min="30" max="720" step="15" value={resourceDraft.durationMinutes} onChange={e=>setResourceDraft(prev=>({...prev,durationMinutes:Math.max(30,Math.min(720,Number(e.target.value)||120))}))} className="w-full h-11 rounded-[13px] border border-slate-200 bg-white px-3 pr-12 font-black text-slate-900 outline-none focus:border-[#7657FF]/40"/><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">MIN</span></div></div><button type="button" disabled={savingResources} onClick={saveResources} className="h-11 px-4 rounded-[13px] bg-[#10182D] text-white text-[9px] font-black uppercase tracking-wider disabled:opacity-50">{savingResources?'Guardando':'Guardar personal'}</button></div>{!resourceStatus.feasible&&<div className="mt-3 rounded-[14px] bg-white/80 border border-rose-100 p-3 text-[10px] font-bold text-rose-600">No podrás aceptar la reserva hasta que haya personal suficiente o ajustes correctamente lo que necesita este servicio.</div>}</div>}
                            {canAddLocation && <details className="rounded-[20px] border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer text-xs font-black text-slate-600">Añadir GPS (opcional)</summary><p className="text-xs text-slate-500 mt-3">Puedes aceptar con la dirección guardada. Si añades un punto GPS, la ruta calculará mejor los traslados.</p><label className="block text-xs font-bold mt-3">Enlace de Maps/Waze con coordenadas o latitud,longitud<input value={locationDraft} onChange={e=>setLocationDraft(e.target.value)} placeholder="9.0123,-79.5012" className="w-full mt-2 rounded-xl border border-slate-200 p-3 text-sm"/></label><button type="button" disabled={savingLocation} onClick={saveLocation} className="mt-3 rounded-xl bg-slate-900 text-white px-4 py-3 text-xs font-black disabled:opacity-60">{savingLocation?'Guardando…':'Guardar GPS'}</button></details>}
                            <div className={`rounded-[22px] border p-4 ${needsTransportReview?'border-amber-200 bg-amber-50/80':'border-[#7657FF]/10 bg-[#F8F6FF]'}`}><div className="flex items-center justify-between gap-3"><div><p className={`text-[9px] uppercase tracking-[.14em] font-black ${needsTransportReview?'text-amber-600':'text-[#7657FF]'}`}>{needsTransportReview?'Transporte por confirmar':'Transporte de la solicitud'}</p><p className="text-[10px] font-semibold text-slate-500 mt-1">{needsTransportReview?'La ubicación quedó fuera del cálculo automático. Define el transporte final antes de aceptar.':'Si la zona o dirección no concuerda, corrige el monto antes de aceptar.'}</p></div><span className="text-xl font-black text-slate-900">{money(selectedRequest.transporte)}</span></div>{selectedRequest.transporteOriginalWeb!=null&&<p className="mt-2 text-[9px] font-bold text-slate-400">Calculado en web: {money(selectedRequest.transporteOriginalWeb)}</p>}<div className="grid grid-cols-[1fr_auto] gap-2 mt-3"><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">$</span><input type="number" min="0" step="0.01" value={transportDraft} onChange={e=>setTransportDraft(e.target.value)} className="w-full h-12 rounded-[14px] bg-white border border-slate-200 pl-8 pr-3 font-black text-slate-900 outline-none focus:border-[#7657FF]/40"/></div><button type="button" disabled={savingTransport} onClick={saveTransport} className="px-4 h-12 rounded-[14px] bg-[#7657FF] text-white font-black text-[9px] uppercase tracking-wider disabled:opacity-60">{savingTransport?'Guardando':needsTransportReview?'Confirmar transporte':'Aplicar'}</button></div></div>
                            <div className="grid grid-cols-3 gap-2"><div className="rounded-[18px] bg-slate-50 p-3"><p className="text-[9px] uppercase font-black text-slate-400">Transporte</p><p className="font-black text-slate-800 mt-1">{money(selectedRequest.transporte)}</p></div><div className="rounded-[18px] bg-slate-50 p-3"><p className="text-[9px] uppercase font-black text-slate-400">Descuento</p><p className="font-black text-slate-800 mt-1">{money(selectedRequest.descuento)}</p></div><div className="rounded-[18px] bg-emerald-50 p-3"><p className="text-[9px] uppercase font-black text-emerald-500">Total</p><p className="font-black text-emerald-600 mt-1">{money(selectedRequest.total)}</p></div></div></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4"><button type="button" disabled={rejecting || confirming} onClick={rejectSelected} className="py-4 rounded-[18px] border-2 border-rose-200 text-rose-600 font-black bg-white disabled:opacity-60 active:scale-[.98] flex items-center justify-center gap-2"><X size={20}/>{rejecting ? 'Rechazando...' : 'Rechazar reserva'}</button><button disabled={confirming || rejecting || savingReference || savingLocation || needsReferenceReview || needsTransportReview || (showResourcePanel && resourceStatus && !resourceStatus.feasible)} onClick={confirmSelected} className="py-4 rounded-[18px] bg-gradient-to-r from-[#FF2F9A] via-[#D52DDA] to-[#7657FF] disabled:opacity-60 text-white font-black shadow-[0_14px_30px_rgba(157,74,255,.25)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"><CheckCircle2 size={20}/>{confirming ? 'Confirmando...' : needsReferenceReview ? 'Añade referencia' : needsTransportReview ? 'Revisa transporte' : 'Aceptar reserva'}</button></div>
                    </div>
                )}
            </div>
        </div>
    );
});

export {React,utils,db,appId,getDocRef,getConfigRef,runTransaction,setDoc,deleteDoc,isPendingWebRequest,publicSlot,christmasInsertionPlan,christmasTimeMinutes,christmasEventGps,christmasLeg,NotifModal,Confirm,NavigationChoiceModal,confirmCentralRequest,needsPlaceReference,transportPending,inferResourceRequirements,availabilityRef};
export {ChevronLeft,Info,BellRing,MapIcon,ChevronDown,ChevronRight,CheckCircle2,MessageCircle,MapPin,RefreshCw,Trash2};

export function createChristmasStore(uid){
if(typeof uid!=='string'||!/^[-_A-Za-z0-9]{1,128}$/.test(uid))throw Error('ACCOUNT_REQUIRED');
const appId=uid===ADMIN_UID?'diverty-oficial':'navidad_'+uid;
const getDocRef = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'eventos', id);
const getConfigRef = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'configuracion', id);
const isEventRef = ref => ref.path.startsWith(`artifacts/${appId}/public/data/eventos/`);
const availabilityRef = id => doc(db, 'artifacts', appId, 'public', 'data', 'disponibilidad_web', id);
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
const setDoc = async (ref, value, options) => {
  if (!isEventRef(ref)) return options ? rawSetDoc(ref, value, options) : rawSetDoc(ref, value);
  return runTransaction(db, async tx => {
    if (options?.merge) await tx.get(ref);
    tx.set(ref, value, options);
  });
};
const deleteDoc = async ref => {
  if (!isEventRef(ref)) return rawDeleteDoc(ref);
  return runTransaction(db, tx => { tx.delete(ref); });
};
return {db,appId,getDocRef,getConfigRef,runTransaction,setDoc,deleteDoc,availabilityRef,legacy:uid===ADMIN_UID,uid};
}
