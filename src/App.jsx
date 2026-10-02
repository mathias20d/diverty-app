import React, { useState, useEffect, useRef, useMemo, useCallback, memo, useDeferredValue } from 'react';
import { Calendar, Users, Settings, Plus, Edit, Trash2, X, FileSignature, Clock, MapPin, Info, Download, Receipt, MessageCircle, RefreshCw, AlertTriangle, CheckCircle2, Cloud, Search, CalendarDays, ChevronRight, ChevronLeft, Star, BellRing, TrendingUp, DollarSign, Briefcase, Lock, Mail, Smartphone, FileText, Check, Sparkles, Map as MapIcon, Zap, PieChart, ChevronDown, Sun, Award, FileSpreadsheet, Copy, Share2, Home, Menu, BarChart3, ArrowUpRight, ArrowDownRight, ArrowDownWideNarrow, Save, Minus, Printer, ShieldCheck, Truck, Handshake, PenLine } from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc as rawSetDoc, getDoc, getDocs, getDocsFromCache, query, where, onSnapshot, deleteDoc as rawDeleteDoc, enableIndexedDbPersistence, runTransaction as rawRunTransaction, writeBatch, orderBy, limit, startAfter, documentId } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

// --- 1. CONFIGURACIÓN FIREBASE Y CONSTANTES ---
const firebaseConfig = { apiKey: "AIzaSyDxE2E1KMuZU523k8oWHabi1jDrFxPOD-0", authDomain: "diverty-eventos.firebaseapp.com", projectId: "diverty-eventos", storageBucket: "diverty-eventos.firebasestorage.app", messagingSenderId: "491130670516", appId: "1:491130670516:web:8c80abd09ccc92c194f6e1" };
const isNewApp = !getApps().length; const app = isNewApp ? initializeApp(firebaseConfig) : getApp(); const db = getFirestore(app); 
if (isNewApp) { enableIndexedDbPersistence(db).catch(() => {}); }
const auth = getAuth(app); const appId = "diverty-oficial"; const LOGO_URL = 'https://i.postimg.cc/GhFd4tcm/1000047880.png'; const META_MENSUAL = 1500;
const DATOS_EMPRESA = { nombreTitular: "AILEN DENNISKA CAMARENA MENDOZA", ruc: "Panamá RUC DV 79 8 957349", banco: "Banco General", tipoCuenta: "Cuenta de ahorros", numeroCuenta: "0472960083979", telefono: "6667-7965", email: "corporativo@divertyeventos.online", web: "Divertyeventos.online" };
const ZONAS_TRANSPORTE = { "Panamá Centro": 0, "San Miguelito": 5, "Panamá Norte": 10, "Panamá Este": 10, "Arraiján / Chorrera": 15, "Colón": 25 };
const NAV_ITEMS = [ {id:'inicio', icon:Home, text:'Inicio'}, {id:'eventos', icon:Calendar, text:'Agenda'}, {id:'clientes', icon:Users, text:'Clientes'}, {id:'proveedores', icon:Truck, text:'Proveedores'}, {id:'finanzas', icon:PieChart, text:'Finanzas'}, {id:'config', icon:Settings, text:'Ajustes'} ];
const defaultFormData = Object.freeze({ cliente: '', ruc: '', email: '', telefono: '', tipoEvento: 'Cumpleaños', ninos: '', fecha: '', hora: '', ubicacion: 'Panamá Centro', direccion: '', comentarios: '', servicio: '', serviciosSeleccionados: [], transporte: '', gastos: '', detalleGastos: '', subcontratos: [], costosSeparados: true, total: '', abono: '', estado: 'Pendiente', colisionAprobada: false, vigenciaCotizacion: 7, fechaEmisionCotizacion: '' });
const NOMBRES_MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const getDocRef = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'eventos', id); const getConfigRef = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'configuracion', id); const getProvRef = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'proveedores', id);


const ADMIN_UID = 'OblqzhP2L3XulJ920O82jwd1Qrk1';
const isEventRef = ref => ref.path.startsWith(`artifacts/${appId}/public/data/eventos/`);
const availabilityRef = id => doc(db, 'artifacts', appId, 'public', 'data', 'disponibilidad_web', id);
const publicSlot = value => {
  const state = String(value?.estado || '').toLowerCase();
  if (!value?.fecha || value.deletedLocally === true || /cancelado|rechazada|cot/.test(state)) return null;
  return { fecha: String(value.fecha), hora: String(value.hora || '') };
};
const slotDocRef = value => {
  const slot = publicSlot(value);
  if (!slot) return null;
  const safeSlot = `${slot.fecha}_${String(slot.hora || '').replace(':','-')}`.replace(/[^0-9A-Za-z_-]/g,'');
  return doc(db, 'artifacts', appId, 'public', 'data', 'disponibilidad_web', `slot_${safeSlot}`);
};
const samePublicSlot = (a,b) => {
  const x=publicSlot(a), y=publicSlot(b);
  return Boolean(x && y && x.fecha===y.fecha && x.hora===y.hora);
};
const writeSlotMembership = (writer, ref, snap, eventId, direction, eventValue) => {
  if (!ref) return;
  const current = snap?.exists() ? (snap.data() || {}) : {};
  let ids = Array.isArray(current.reservationIds) ? current.reservationIds.map(String) : [];
  let count = Math.max(Number(current.count || 0), ids.length);
  if (direction < 0) {
    const hadId = ids.includes(String(eventId));
    ids = ids.filter(x => x !== String(eventId));
    // Los slots antiguos podían tener count sin todos los IDs. Al borrar una reserva
    // del horario igualmente se libera exactamente un cupo.
    count = Math.max(0, count - 1);
    if (!hadId) count = Math.max(count, ids.length);
  } else if (!ids.includes(String(eventId))) {
    ids.push(String(eventId));
    count = Math.max(count + 1, ids.length);
  }
  if (count <= 0 && ids.length === 0) { writer.delete(ref); return; }
  const slot = publicSlot(eventValue) || {fecha:String(current.fecha||''),hora:String(current.hora||'')};
  writer.set(ref, {
    fecha: slot.fecha, hora: slot.hora, count,
    capacity: Math.max(1, Number(current.capacity || 3)),
    reservationIds: ids, updatedAt: new Date().toISOString()
  });
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
  return rawRunTransaction(db, async tx => {
    const currentSnap = await tx.get(ref);
    const current = currentSnap.exists() ? currentSnap.data() : {};
    const next = options?.merge ? {...current, ...value} : value;
    const oldSlotRef = slotDocRef(current);
    const newSlotRef = slotDocRef(next);
    const oldSlotSnap = oldSlotRef ? await tx.get(oldSlotRef) : null;
    const newSlotSnap = newSlotRef && (!oldSlotRef || newSlotRef.path !== oldSlotRef.path) ? await tx.get(newSlotRef) : oldSlotSnap;
    if (options) tx.set(ref, value, options); else tx.set(ref, value);
    projectEvent(tx, ref, next);
    if (!samePublicSlot(current, next)) {
      if (oldSlotRef) writeSlotMembership(tx, oldSlotRef, oldSlotSnap, ref.id, -1, current);
      if (newSlotRef) writeSlotMembership(tx, newSlotRef, newSlotSnap, ref.id, 1, next);
    }
  });
};
const deleteDoc = async ref => {
  if (!isEventRef(ref)) return rawDeleteDoc(ref);
  return rawRunTransaction(db, async tx => {
    const currentSnap = await tx.get(ref);
    const current = currentSnap.exists() ? currentSnap.data() : {};
    const oldSlotRef = slotDocRef(current);
    const oldSlotSnap = oldSlotRef ? await tx.get(oldSlotRef) : null;
    tx.delete(ref);
    tx.delete(availabilityRef(ref.id));
    tx.delete(clientStatusRef(ref.id));
    if (oldSlotRef) writeSlotMembership(tx, oldSlotRef, oldSlotSnap, ref.id, -1, current);
  });
};
let preparationPromise = null;
let preparationComplete = false;
async function prepareDivertyData() {
  if (preparationComplete) return;
  if (preparationPromise) return preparationPromise;
  preparationPromise = (async () => {
    if (auth.currentUser?.uid !== ADMIN_UID) throw new Error('ADMIN_REQUIRED');
    const marker = getConfigRef('migracion_segura_v1');
    if ((await getDoc(marker)).exists()) {preparationComplete=true; return;}
    // One intentional migration read, never executed by public visitors.
    const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'eventos'));
    const max = {factura: 0, contrato: 0, cotizacion: 0};
    const fields = {factura: 'numeroFactura', contrato: 'numeroContrato', cotizacion: 'numeroCotizacion'};
    const prefixes = {factura: 'FAC', contrato: 'CON', cotizacion: 'COT'};
    let batch = writeBatch(db), size = 0;
    for (const row of snap.docs) {
      const ev = row.data();
      for (const type of Object.keys(fields)) {
        const match = String(ev[fields[type]] || '').match(new RegExp('^' + prefixes[type] + '-(\\d+)$', 'i'));
        if (match) max[type] = Math.max(max[type], Number(match[1]));
      }
      if (!ev._system) { projectEvent(batch, row.ref, ev); size++; }
      if (size >= 150) { await batch.commit(); batch = writeBatch(db); size = 0; }
    }
    if (size) await batch.commit();
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

const NotifModal = memo(function NotifModal({ isOpen, onClose, eventosActivos, onConfirmWebRequest }) {
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [confirming, setConfirming] = useState(false);
    const [confirmedName, setConfirmedName] = useState('');
    useEffect(() => { if (!isOpen) { setSelectedRequest(null); setConfirming(false); setConfirmedName(''); } }, [isOpen]);
    useEffect(() => { const closeSelectedOnBack = (e) => { if (isOpen && (selectedRequest || confirmedName)) { setSelectedRequest(null); setConfirmedName(''); if (e?.detail) e.detail.handled = true; } }; window.addEventListener('diverty:back-layer', closeSelectedOnBack); return () => window.removeEventListener('diverty:back-layer', closeSelectedOnBack); }, [isOpen, selectedRequest, confirmedName]);
    if (!isOpen) return null;
    const reqs = eventosActivos
        .filter(e => utils.normalizeText(e.estado) === 'pendiente' && utils.normalizeText(e.origen) === 'web directa')
        .sort((a,b) => new Date(b.createdAt||0).getTime() - new Date(a.createdAt||0).getTime());
    const money = v => `$${utils.safeNum(v).toFixed(2)}`;
    const phone = selectedRequest ? String(selectedRequest.telefono || '').replace(/\D/g,'') : '';
    const confirmSelected = async () => {
        if (!selectedRequest || confirming) return;
        setConfirming(true);
        const currentName = selectedRequest.cliente || 'Cliente';
        const ok = await onConfirmWebRequest(selectedRequest);
        setConfirming(false);
        if (ok) { setSelectedRequest(null); setConfirmedName(currentName); }
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
                    <div className="flex items-center gap-3">{(selectedRequest || confirmedName) && <button onClick={()=>{setSelectedRequest(null);setConfirmedName('')}} className="p-2 -ml-2 hover:bg-white/10 rounded-xl"><ChevronLeft size={21}/></button>}<div className="w-10 h-10 rounded-[14px] bg-white/10 flex items-center justify-center"><BellRing className="text-[#B7A5FF]" size={22}/></div><div><h3 className="font-black text-[21px] leading-tight">{selectedRequest ? 'Solicitud Web' : confirmedName ? 'Reserva confirmada' : 'Alertas Web'}</h3>{!selectedRequest && !confirmedName && <p className="text-[11px] text-white/55 font-semibold mt-0.5">Solicitudes recibidas desde tu página web</p>}</div></div>
                    <button onClick={onClose} className="p-2.5 hover:bg-white/10 rounded-xl transition-colors"><X size={21} className="text-white/65"/></button>
                </div>
                {confirmedName ? (
                    <div className="flex-1 p-5 flex items-center justify-center"><div className="w-full bg-white rounded-[30px] p-7 text-center shadow-[0_20px_55px_rgba(15,23,42,.12)] border border-white"><div className="mx-auto w-24 h-24 rounded-[30px] bg-gradient-to-br from-[#F3EEFF] to-[#E9E2FF] flex items-center justify-center relative"><CalendarDays size={45} className="text-[#7657FF]"/><span className="absolute -right-2 -bottom-2 w-10 h-10 rounded-full bg-[#7657FF] text-white flex items-center justify-center border-4 border-white"><Check size={20}/></span></div><h4 className="font-black text-3xl text-[#10182D] mt-6">¡Reserva confirmada!</h4><p className="text-slate-500 font-semibold mt-2">La reserva de <b className="text-slate-700">{confirmedName}</b> quedó confirmada correctamente.</p><button onClick={onClose} className="mt-7 w-full py-4 rounded-[18px] bg-gradient-to-r from-[#FF2F9A] via-[#D52DDA] to-[#7657FF] text-white font-black shadow-[0_14px_30px_rgba(157,74,255,.25)]">Cerrar</button></div></div>
                ) : !selectedRequest ? (
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5"><div className="bg-white/80 rounded-[24px] p-2 mb-4 border border-white shadow-sm"><div className="grid grid-cols-2 gap-2"><div className="rounded-[18px] bg-gradient-to-r from-[#7657FF] to-[#9A5CFF] text-white px-4 py-3"><p className="text-[9px] uppercase tracking-[.15em] font-black opacity-75">Pendientes</p><p className="text-2xl font-black">{reqs.length}</p></div><div className="rounded-[18px] bg-slate-50 px-4 py-3"><p className="text-[9px] uppercase tracking-[.15em] font-black text-slate-400">Canal</p><p className="text-sm font-black text-slate-700 mt-1">Página Web</p></div></div></div><div className="space-y-3">{reqs.length === 0 ? <div className="bg-white rounded-[28px] p-10 text-center border border-slate-200/70 shadow-sm mt-5"><div className="w-20 h-20 rounded-[26px] bg-emerald-50 mx-auto flex items-center justify-center"><CheckCircle2 size={38} className="text-emerald-500"/></div><p className="font-black text-[#10182D] text-xl mt-5">Todo al día</p><p className="font-semibold text-slate-400 text-sm mt-1">No hay nuevas solicitudes web.</p></div> : reqs.map(webCard)}</div></div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 pb-8">
                        <div className="bg-white rounded-[28px] border border-white shadow-[0_16px_45px_rgba(15,23,42,.08)] overflow-hidden"><div className="p-5 bg-gradient-to-br from-[#F7F3FF] via-white to-[#FFF4FA] border-b border-slate-100"><div className="flex justify-between items-center gap-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] text-amber-600"><Zap size={11}/> Nueva solicitud</span><span className="text-[10px] font-black text-slate-500 bg-white px-3 py-1.5 rounded-full shadow-sm">{selectedRequest.fecha?.split('-').reverse().join('/')}</span></div><div className="mt-4 flex justify-between gap-3"><div><h4 className="font-black text-[27px] text-[#10182D] leading-tight">{selectedRequest.cliente}</h4><p className="text-xs font-bold text-slate-500 mt-1">Solicitud recibida directamente desde la página web</p></div>{phone && <div className="flex gap-2"><button type="button" onClick={()=>utils.openWhatsAppBusiness(phone,`Hola ${selectedRequest.cliente}, recibimos tu solicitud de reserva.`)} className="w-11 h-11 rounded-[15px] bg-emerald-50 text-emerald-500 flex items-center justify-center"><MessageCircle size={21}/></button><a href={`tel:${phone}`} className="w-11 h-11 rounded-[15px] bg-[#7657FF]/10 text-[#7657FF] flex items-center justify-center"><Smartphone size={21}/></a></div>}</div></div>
                            <div className="p-4 space-y-3"><div className="grid grid-cols-3 gap-2"><div className="rounded-[18px] bg-slate-50 p-3"><CalendarDays size={18} className="text-[#7657FF]"/><p className="text-[9px] uppercase font-black tracking-wider text-slate-400 mt-2">Fecha</p><p className="text-xs font-black text-slate-800 mt-1">{selectedRequest.fecha?.split('-').reverse().join('/') || '—'}</p></div><div className="rounded-[18px] bg-slate-50 p-3"><Clock size={18} className="text-[#7657FF]"/><p className="text-[9px] uppercase font-black tracking-wider text-slate-400 mt-2">Hora</p><p className="text-xs font-black text-slate-800 mt-1">{utils.formatTime12h(selectedRequest.hora)}</p></div><div className="rounded-[18px] bg-slate-50 p-3"><MapPin size={18} className="text-[#FF3EA5]"/><p className="text-[9px] uppercase font-black tracking-wider text-slate-400 mt-2">Ubicación</p><p className="text-[11px] font-black text-slate-800 mt-1 leading-tight">{selectedRequest.ubicacion || '—'}</p></div></div>
                            <div className="rounded-[20px] bg-slate-50 p-4"><p className="text-[9px] uppercase tracking-[.14em] font-black text-slate-400">Dirección</p><p className="font-bold text-slate-700 mt-1 whitespace-pre-wrap">{selectedRequest.direccion || 'No indicada'}</p></div>
                            <div className="rounded-[22px] bg-gradient-to-br from-[#F7F3FF] to-white p-4 border border-[#7657FF]/10"><div className="flex justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[.12em] font-black text-[#7657FF] flex items-center gap-1.5"><Sparkles size={14}/> Servicio solicitado</p><p className="font-black text-[#10182D] mt-2 whitespace-pre-wrap">{selectedRequest.servicio || '—'}</p></div><span className="shrink-0 h-fit rounded-full bg-[#7657FF]/10 px-3 py-1.5 font-black text-[#7657FF]">{money(selectedRequest.total)}</span></div>{selectedRequest.descripcionEvento && <p className="font-semibold text-slate-600 whitespace-pre-wrap mt-3 text-sm leading-relaxed">{selectedRequest.descripcionEvento}</p>}{selectedRequest.comentarios && <div className="mt-3 pt-3 border-t border-[#7657FF]/10"><p className="text-[9px] uppercase tracking-widest font-black text-slate-400">Comentarios</p><p className="font-semibold text-slate-600 whitespace-pre-wrap mt-1">{selectedRequest.comentarios}</p></div>}</div>
                            <div className="grid grid-cols-3 gap-2"><div className="rounded-[18px] bg-slate-50 p-3"><p className="text-[9px] uppercase font-black text-slate-400">Transporte</p><p className="font-black text-slate-800 mt-1">{money(selectedRequest.transporte)}</p></div><div className="rounded-[18px] bg-slate-50 p-3"><p className="text-[9px] uppercase font-black text-slate-400">Descuento</p><p className="font-black text-slate-800 mt-1">{money(selectedRequest.descuento)}</p></div><div className="rounded-[18px] bg-emerald-50 p-3"><p className="text-[9px] uppercase font-black text-emerald-500">Total</p><p className="font-black text-emerald-600 mt-1">{money(selectedRequest.total)}</p></div></div></div>
                        </div>
                        <div className="grid grid-cols-[.8fr_1.2fr] gap-3 mt-4"><button type="button" onClick={()=>setSelectedRequest(null)} className="py-4 rounded-[18px] border-2 border-rose-200 text-rose-500 font-black bg-white active:scale-[.98]">Volver</button><button disabled={confirming} onClick={confirmSelected} className="py-4 rounded-[18px] bg-gradient-to-r from-[#FF2F9A] via-[#D52DDA] to-[#7657FF] disabled:opacity-60 text-white font-black shadow-[0_14px_30px_rgba(157,74,255,.25)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"><CheckCircle2 size={20}/>{confirming ? 'Confirmando...' : 'Confirmar reserva'}</button></div>
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
    const horaStr = utils.formatTime12h(printData.hora), tot = utils.safeNum(printData.total), trn = utils.safeNum(printData.transporte), abo = utils.safeNum(printData.abono);
    const saldo = Math.max(0, tot - abo), subServicios = Math.max(0, tot - trn);
    const sA = printData.serviciosSeleccionados?.length > 0 ? printData.serviciosSeleccionados : [{ nombre: String(printData.servicio || printData.especialidad || 'Servicio General'), precio: subServicios, cantidad: 1, descripcion: String(printData.comentarios || '') }];
    const numRef = isC ? (printData.numeroCotizacion || 'COT-PENDIENTE') : isContratoProv ? (printData.numeroSubcontrato || 'SUB-PENDIENTE') : isContrato ? (printData.numeroContrato || 'CON-PENDIENTE') : (printData.numeroFactura || 'FAC-PENDIENTE');
    const docTitle = isC ? 'COTIZACIÓN' : isContratoProv ? 'SUBCONTRATO DE SERVICIOS' : isContrato ? 'CONTRATO DE SERVICIO' : 'FACTURA COMERCIAL';

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
        const topLevelLines = sA.length === 1 ? [printData.descripcionEvento, printData.todoIncluido, printData.todoLoIncluido, printData.serviciosLista].flatMap(toLines) : [];
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

    const ProviderContract = () => (<><BrandHeader/><div className="relative z-10 bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-5"><p className="text-[10px] font-black text-[#7657FF] uppercase tracking-widest mb-3">Proveedor contratado</p><p className="text-lg font-black">{cli}</p><p className="text-[10px] text-slate-500 mt-1">{printData.especialidad || 'Servicios para eventos'} · {tel}</p></div><div className="relative z-10 border border-slate-100 rounded-2xl p-5 text-[10px] leading-relaxed text-slate-600 space-y-3"><p><b>1. Objeto:</b> prestación independiente de los servicios formalmente asignados por Diverty Eventos.</p><p><b>2. Independencia:</b> no existe relación laboral, subordinación ni exclusividad entre las partes.</p><p><b>3. Honorarios:</b> se pagará la tarifa acordada para cada evento tras la prestación satisfactoria del servicio.</p><p><b>4. Puntualidad y calidad:</b> el proveedor deberá cumplir horarios, presentación y estándares acordados.</p><p><b>5. Confidencialidad comercial:</b> el proveedor respetará la relación comercial entre Diverty y el cliente final.</p></div><div className="grid grid-cols-2 gap-8 mt-10 relative z-10"><div className="border-t border-slate-300 pt-2 text-center text-[9px] font-black">DIVERTY EVENTOS</div><div className="border-t border-slate-300 pt-2 text-center text-[9px] font-black">{cli}</div></div><FooterBrand/></>);

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
    const empty = { nombre: '', telefono: '', especialidad: '', costoBase: '', activo: true, servicios: [] };
    const [form, setForm] = useState(empty);
    const [srv, setSrv] = useState({ nombre: '', costo: '' });
    useEffect(() => { if (isOpen) { const base = data || empty; const legacy = (!base.servicios?.length && base.especialidad) ? [{ id:`srv-legacy`, nombre:base.especialidad, costo:utils.safeNum(base.costoBase), activo:true }] : (base.servicios || []); setForm({...empty, ...base, servicios:legacy}); setSrv({nombre:'',costo:''}); } }, [isOpen, data]);
    if (!isOpen) return null;
    const addSrv = () => { const nombre=srv.nombre.trim(), costo=utils.safeNum(srv.costo); if(!nombre) return; setForm(prev=>({...prev, servicios:[...(prev.servicios||[]),{id:`srv-${Date.now()}`,nombre,costo,activo:true}], especialidad:prev.especialidad||nombre, costoBase:prev.costoBase||String(costo)})); setSrv({nombre:'',costo:''}); };
    const removeSrv = id => setForm(prev=>({...prev,servicios:(prev.servicios||[]).filter(x=>x.id!==id)}));
    const handleSubmit = (e) => { e.preventDefault(); const servicios=form.servicios||[]; onSave({...form, especialidad:servicios.map(x=>x.nombre).join(', ') || form.especialidad, costoBase:servicios.length===1?String(servicios[0].costo):form.costoBase}); };
    return (<div className="fixed inset-0 z-[100000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"><div className={`${UI.modal} max-w-lg w-full p-8 max-h-[92vh] overflow-y-auto`}><div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4"><div className="flex items-center gap-3">{data ? <Edit size={24} className="text-[#7657FF]" /> : <Plus size={24} className="text-[#7657FF]" />}<h3 className="text-xl font-black text-slate-900">{data ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3></div><button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 bg-slate-100 rounded-lg"><X size={18}/></button></div><form onSubmit={handleSubmit} className="space-y-4"><Field label="Nombre Comercial / Proveedor *" required value={form.nombre} onChange={e=>setForm(prev=>({...prev,nombre:e.target.value}))}/><Field label="Número de WhatsApp *" required value={form.telefono} onChange={e=>setForm(prev=>({...prev,telefono:e.target.value}))}/><div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><div className="flex items-center justify-between mb-3"><div><p className="text-sm font-black text-slate-900">Servicios y tarifas</p><p className="text-[10px] font-semibold text-slate-400 mt-1">Agrega todos los servicios que este proveedor puede realizar.</p></div><Badge color="blue">{(form.servicios||[]).length}</Badge></div><div className="grid grid-cols-[1fr_110px_auto] gap-2 items-end"><Field label="Servicio" value={srv.nombre} onChange={e=>setSrv(x=>({...x,nombre:e.target.value}))} placeholder="Ej. Pintacaritas"/><Field label="Costo ($)" type="number" value={srv.costo} onChange={e=>setSrv(x=>({...x,costo:e.target.value}))} placeholder="0.00"/><button type="button" onClick={addSrv} className="h-[54px] w-[54px] rounded-xl bg-[#7657FF] text-white flex items-center justify-center"><Plus size={20}/></button></div><div className="space-y-2 mt-4">{(form.servicios||[]).map(x=><div key={x.id} className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-3"><div><p className="font-bold text-slate-800">{x.nombre}</p><p className="text-xs font-black text-emerald-600 mt-0.5">${utils.safeNum(x.costo).toFixed(2)}</p></div><button type="button" onClick={()=>removeSrv(x.id)} className="p-2 text-rose-500 bg-rose-50 rounded-lg"><Trash2 size={16}/></button></div>)}</div></div><label className="flex items-center justify-between rounded-xl border border-slate-200 p-4 bg-white"><span className="font-bold text-sm text-slate-700">Proveedor activo</span><input type="checkbox" checked={form.activo!==false} onChange={e=>setForm(prev=>({...prev,activo:e.target.checked}))}/></label><div className="pt-4"><AppButton type="submit" className="w-full text-xs uppercase tracking-widest">{data ? 'Guardar Cambios' : 'Registrar Proveedor'}</AppButton></div></form></div></div>);
});

const ProveedorCardItem = memo(function ProveedorCardItem({ p, idx, isExpanded, onToggleExpand, utils, onDelete, onEdit, onWhatsApp, onContrato, eventosActivos }) {
    const misEventos = useMemo(() => { return eventosActivos.filter(ev => ev.subcontratos && ev.subcontratos.some(sc => sc.proveedorId === p.id)).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))); }, [eventosActivos, p.id]); const pendientes = misEventos.filter(ev => utils.normalizeText(ev.estado) !== 'completado' && utils.normalizeText(ev.estado) !== 'cancelado'); const realizados = misEventos.filter(ev => utils.normalizeText(ev.estado) === 'completado'); const phoneClean = String(p.telefono).replace(/\D/g, '');
    return (<div className={`${UI.card} flex flex-col relative overflow-hidden transition-all duration-500 hover:-translate-y-2 animate-fadeInUp`} style={{animationFillMode:'both',animationDelay:`${idx*20}ms`}}><div onClick={(e) => { if(e){e.preventDefault();e.stopPropagation();} utils.triggerHaptic('light'); onToggleExpand(p.id); }} className="p-6 cursor-pointer flex flex-col gap-4 relative z-10 bg-transparent transition-colors duration-200"><div className="flex justify-between items-start"><div className="flex gap-3"><div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-[#7657FF] shadow-sm shrink-0"><Briefcase size={20}/></div><div className="flex-1 min-w-0"><h4 className="font-extrabold text-lg text-slate-900 tracking-tight capitalize leading-tight truncate">{p.nombre}</h4><span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 truncate block mt-0.5">{p.servicios?.length ? `${p.servicios.length} servicios` : p.especialidad}</span></div></div><button type="button" onClick={(e) => { e.stopPropagation(); onDelete(p.id); }} className="text-slate-300 hover:text-rose-500 transition-colors p-1"><Trash2 size={18}/></button></div><div className="flex justify-between items-center bg-slate-50/80 rounded-xl p-4 border border-slate-100"><div className="flex items-center gap-3"><Smartphone size={16} className="text-emerald-500"/><span className="font-bold text-slate-700 text-sm">{p.telefono || 'Sin teléfono'}</span></div>{p.costoBase && <span className="text-xs font-black text-slate-900 bg-emerald-100/50 px-2.5 py-1 rounded-lg border border-emerald-200/50">${p.costoBase}</span>}</div><div className="flex gap-2.5 mt-2"><ActionBtn icon={MessageCircle} label="WhatsApp" color="emerald" onClick={(e) => { e.stopPropagation(); onWhatsApp(phoneClean, `¡Hola ${p.nombre}!`); }} /><ActionBtn icon={Handshake} label="Contrato" color="blue" onClick={(e) => { e.stopPropagation(); onContrato(p); }} /><ActionBtn icon={PenLine} label="Editar" color="white" onClick={(e) => { e.stopPropagation(); onEdit(p); }} /></div></div>{isExpanded && (<div className="relative z-10 px-5 pb-5 animate-fadeIn border-t border-slate-100/50 mt-1 pt-5 bg-slate-50/50 rounded-b-[24px]"><h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7657FF] mb-4 flex items-center gap-2"><CalendarDays size={14}/> Eventos Asignados</h5><div className="space-y-5"><div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pendientes ({pendientes.length})</p>{pendientes.length === 0 ? (<p className="text-[11px] text-slate-400 italic">No hay eventos pendientes.</p>) : (<div className="space-y-2">{pendientes.map(ev => { const subC = ev.subcontratos?.find(sc => sc.proveedorId === p.id); return (<div key={ev.id} className="bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-sm flex flex-col gap-1.5 transition-all hover:border-blue-200"><div className="flex justify-between items-start"><span className="font-extrabold text-slate-900 text-[13px] capitalize truncate max-w-[160px]">{ev.cliente}</span>{subC?.costo && <span className={`font-bold text-[11px] px-2 py-0.5 rounded-md border ${(subC.pagado===true||utils.normalizeText(subC.estadoPago)==='pagado')?'text-emerald-600 bg-emerald-50 border-emerald-100':'text-rose-500 bg-rose-50 border-rose-100'}`}>${subC.costo} · {(subC.pagado===true||utils.normalizeText(subC.estadoPago)==='pagado')?'Pagado':'Pendiente'}</span>}</div><div className="flex gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider"><span className="flex items-center gap-1"><Calendar size={11} className="text-[#7657FF]"/> {ev.fecha ? ev.fecha.split('-').reverse().join('/') : ''}</span><span className="flex items-center gap-1"><Clock size={11} className="text-[#7657FF]"/> {utils.formatTime12h(ev.hora)}</span></div><div className="text-[10px] font-semibold text-slate-400 truncate flex items-center gap-1 mt-0.5"><MapPin size={10}/> {ev.ubicacion}</div></div>); })}</div>)}</div><div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Realizados ({realizados.length})</p>{realizados.length === 0 ? (<p className="text-[11px] text-slate-400 italic">No hay eventos completados.</p>) : (<div className="space-y-2 opacity-75">{realizados.map(ev => { const subC = ev.subcontratos?.find(sc => sc.proveedorId === p.id); return (<div key={ev.id} className="bg-slate-100/50 p-3 rounded-xl border border-slate-200/50 flex flex-col gap-1.5"><div className="flex justify-between items-start"><span className="font-bold text-slate-700 text-[12px] capitalize truncate">{ev.cliente}</span>{subC?.costo && <span className={`font-bold text-[10px] ${(subC.pagado===true||utils.normalizeText(subC.estadoPago)==='pagado')?'text-emerald-600':'text-amber-600'}`}>${subC.costo} · {(subC.pagado===true||utils.normalizeText(subC.estadoPago)==='pagado')?'Pagado':'Pendiente'}</span>}</div><div className="flex gap-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider"><span>{ev.fecha ? ev.fecha.split('-').reverse().join('/') : ''}</span><span>{utils.formatTime12h(ev.hora)}</span></div></div>); })}</div>)}</div></div></div>)}</div>);
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

const EventCardItem = memo(function EventCardItem({ ev, idx, todayTime, onWhatsApp, onViewDoc, onEdit, onDelete, onDuplicate, onMapClick, empresa, utils, onUpdateEstado, onConvertir, onRegistrarAbono }) {
    const [swipeX, setSwipeX] = useState(0), [isDragging, setIsDragging] = useState(false), [isExpanded, setIsExpanded] = useState(false); const startX = useRef(0);
    useEffect(() => { const closeOnAppBack = (e) => { if (isExpanded) { setIsExpanded(false); if (e?.detail) e.detail.handled = true; } }; window.addEventListener('diverty:back-layer', closeOnAppBack); return () => window.removeEventListener('diverty:back-layer', closeOnAppBack); }, [isExpanded]);
    const handleTouchStart = useCallback((e) => { startX.current = e.touches[0].clientX; setIsDragging(true); }, []); const handleTouchMove = useCallback((e) => { if (!isDragging) return; const diffX = e.touches[0].clientX - startX.current; setSwipeX(diffX > 0 ? Math.min(diffX, 120) : 0); }, [isDragging]); const handleTouchEnd = useCallback(() => { setIsDragging(false); if (swipeX > 80) { utils.triggerHaptic('success'); onDelete(ev.id); } setSwipeX(0); }, [swipeX, ev.id, onDelete, utils]);
    const estNormalized=utils.normalizeText(ev.estado),isCotizacion=estNormalized.includes('cotizaci')||estNormalized.includes('cot.'); const tot=utils.safeNum(ev.total),abo=utils.safeNum(ev.abono),restante=Math.max(0,tot-abo);
    const eventId = String(ev.id || '');
    const isWebReservation = !eventId.startsWith('man-') && !eventId.startsWith('cot-');
    let sideColor="bg-slate-200",dotColor="bg-slate-300",waType='agradecimiento'; if(estNormalized==='completado'){sideColor='bg-emerald-500';dotColor='bg-emerald-400';}else if(estNormalized.includes('aprobada')){sideColor='bg-teal-500';dotColor='bg-teal-400';}else if(estNormalized.includes('rechazada')){sideColor='bg-slate-400';dotColor='bg-slate-300';}else if(isCotizacion){sideColor='bg-amber-400';dotColor='bg-amber-400';waType='cotizacion';}else if(estNormalized==='confirmado'){sideColor='bg-[#7657FF]';dotColor='bg-[#7657FF]';waType='recordatorio';}else if(estNormalized==='pendiente'){sideColor='bg-amber-500';dotColor='bg-amber-500';waType='cobro';}else if(estNormalized==='cancelado'){sideColor='bg-rose-500';dotColor='bg-rose-500';}
    let diff=null,dateBadgeContent=null; if(ev.fecha){const[y,m,d]=String(ev.fecha).split('-');if(y&&m&&d){diff=Math.ceil((new Date(parseInt(y,10),parseInt(m,10)-1,parseInt(d,10)).getTime()-todayTime)/(1000*60*60*24));}}
    if(diff===0&&!isCotizacion)dateBadgeContent=<Badge color="rose"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm"></div> HOY</Badge>;else if(diff===1&&!isCotizacion)dateBadgeContent=<Badge color="amber">MAÑANA</Badge>;else if(isCotizacion){ if(estNormalized.includes('aprobada'))dateBadgeContent=<Badge color="teal">COT. Aprobada</Badge>; else if(estNormalized.includes('rechazada'))dateBadgeContent=<Badge color="gray">COT. Rechazada</Badge>; else dateBadgeContent=<Badge color="amberSolid"><FileText size={12}/> Cotización</Badge>; }
    return (<div className={`relative w-full ${UI.card} overflow-hidden`} style={{ animationFillMode: 'both', animationDelay: `${idx * 40}ms` }}><div className={`absolute inset-0 bg-gradient-to-r from-rose-500 to-rose-400 flex items-center pl-8 transition-opacity duration-200 ${swipeX > 20 ? 'opacity-100 z-0' : 'opacity-0 -z-10'}`}><Trash2 size={24} className="text-white" /><span className="text-white font-bold ml-3 text-sm uppercase tracking-wider">Eliminar</span></div><div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} className="relative p-5 sm:p-6 transition-transform duration-200 ease-out z-10 bg-white/95 cursor-pointer text-slate-900" style={{ transform: `translateX(${swipeX}px)`, transition: isDragging ? 'none' : 'transform 0.2s ease-out' }} onClick={(e) => { e.stopPropagation(); utils.triggerHaptic('light'); setIsExpanded(p => !p); }}><div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-r-full ${sideColor} z-20`}></div><div className="pl-3 relative z-10"><div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3"><div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-wrap flex-1"><div className="flex items-start gap-2 min-w-0 w-full"><div className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0 mt-2`}></div><h3 className="text-[19px] sm:text-lg font-black text-slate-950 leading-tight tracking-tight whitespace-normal break-words pr-1">{String(ev.cliente)}</h3></div><div className="flex items-center gap-2 flex-wrap mt-1 sm:mt-0">{isWebReservation && !isCotizacion && (<Badge color="blue"><Zap size={11}/> WEB</Badge>)}{dateBadgeContent}{ev.hora && (<Badge color="gray"><Clock size={12} strokeWidth={2.5}/> {utils.formatTime12h(ev.hora)}</Badge>)}</div></div>{!isExpanded && (<div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pl-4 sm:pl-0"><span className="text-slate-950 font-black text-xl tracking-tight">${tot.toFixed(2)}</span>{isCotizacion ? null : (restante > 0 ? (<div className="bg-rose-50 text-rose-600 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-widest border border-rose-200 shadow-sm">Debe ${restante.toFixed(0)}</div>) : (<div className="flex items-center gap-1.5 text-emerald-500"><CheckCircle2 size={16} strokeWidth={2.5}/><span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Pagado</span></div>))}</div>)}</div>{!isExpanded && <div className="mt-4 pl-4 grid gap-2 text-[13px] font-semibold text-slate-500"><div className="flex items-center gap-2 min-w-0"><Sparkles size={15} className="text-[#7657FF] shrink-0"/><span className="whitespace-normal break-words">{String(ev.servicio || 'Sin paquete asignado')}</span></div>{(ev.ubicacion || ev.direccion) && <div className="flex items-center gap-2 min-w-0"><MapPin size={15} className="text-[#7657FF] shrink-0"/><span className="whitespace-normal break-words">{String(ev.ubicacion || ev.direccion)}</span></div>}</div>}<div className={`grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'}`}><div className="overflow-hidden"><div className="flex flex-col gap-2.5 mb-3 pt-1 text-slate-600"><div className="flex items-center gap-3"><Sparkles size={18} className="text-[#7657FF]/70 shrink-0" strokeWidth={2} /><span className="text-sm font-medium">{String(ev.servicio || 'Sin paquete asignado')}</span></div><div className="flex items-center gap-3"><Calendar size={18} className="text-[#7657FF]/70 shrink-0" strokeWidth={2} /><span className="text-sm font-medium">{ev.fecha ? String(ev.fecha).split('-').reverse().join('/') : 'Sin fecha'} • {ev.hora ? utils.formatTime12h(ev.hora) : 'Sin hora'}</span></div><div onClick={(e) => { e.stopPropagation(); onMapClick(ev.direccion, ev.ubicacion); }} className="flex justify-between items-center gap-3 cursor-pointer hover:bg-slate-50 px-2 py-1 -mx-2 rounded-xl transition-colors active:scale-[0.98] border border-transparent hover:border-slate-100" title="Abrir en Google Maps"><div className="flex items-center gap-3 min-w-0"><MapPin size={18} className="text-[#7657FF]/70 shrink-0" strokeWidth={2} /><span className="text-sm font-medium truncate">{String(ev.ubicacion)} {ev.direccion ? `- ${String(ev.direccion)}` : ''}</span></div><div className="bg-slate-100 p-2 rounded-lg border border-slate-200"><MapIcon size={14} className="text-[#7657FF]" /></div></div><div className="flex items-center gap-3"><Smartphone size={18} className="text-[#7657FF]/70 shrink-0" strokeWidth={2} /><span className="text-sm font-medium">{String(ev.telefono || 'Sin teléfono')}</span></div></div><div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/50 mb-3 relative overflow-hidden"><div className="flex justify-between items-end mb-3"><div className="flex flex-col"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Total</span><span className="text-xl font-black text-slate-900 tracking-tight leading-none">${tot.toFixed(2)}</span></div><div className="flex flex-col items-end"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Pendiente</span><span className={`text-xl font-black tracking-tight leading-none ${restante > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>${restante.toFixed(2)}</span></div></div><div className="w-full bg-slate-200 rounded-full h-1.5 mb-2 overflow-hidden shadow-inner"><AnimatedProgress value={tot > 0 ? Math.min((abo / tot) * 100, 100) : 0} /></div><div className="flex justify-between items-center"><p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-widest">Recibido: <span className="text-slate-800">${abo.toFixed(2)}</span></p><p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{tot > 0 ? Math.round((abo/tot)*100) : 0}% pagado</p></div>{!isCotizacion && restante > 0 && (<AppButton onClick={(e) => { e.stopPropagation(); onRegistrarAbono(ev); }} variant="primary" className="w-full mt-3 py-2.5" icon={DollarSign}>+ Registrar abono</AppButton>)}</div>{!isCotizacion && (<div className="mb-3" onClick={(e)=>e.stopPropagation()}><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Estado de la reserva</label><select value={ev.estado || 'Pendiente'} onChange={(e)=>onUpdateEstado(ev.id,e.target.value)} className={`${UI.input} py-2.5 cursor-pointer`}><option value="Pendiente">Pendiente</option><option value="Confirmado">Confirmado</option><option value="Completado">Completado</option><option value="Cancelado">Cancelado</option></select></div>)}<div className="grid grid-cols-2 gap-2"><AppButton onClick={(e) => { e.stopPropagation(); onWhatsApp(ev, waType, empresa); }} className="col-span-2 w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 border-emerald-500 shadow-md text-white py-2.5" icon={MessageCircle}>WhatsApp Business</AppButton>{isCotizacion ? ( <AppButton onClick={(e) => { e.stopPropagation(); onViewDoc(ev, 'cotizacion'); }} variant="default" className="col-span-2 w-full py-2.5 text-[12px]" icon={FileText}>Ver PDF</AppButton> ) : ( <><AppButton onClick={(e) => { e.stopPropagation(); onViewDoc(ev, 'factura'); }} variant="default" className="w-full py-2.5 px-2 text-[12px] whitespace-nowrap" icon={Receipt}>Factura</AppButton><AppButton onClick={(e) => { e.stopPropagation(); onViewDoc(ev, 'contrato'); }} variant="default" className="w-full py-2.5 px-2 text-[12px] whitespace-nowrap" icon={FileSignature}>Contrato</AppButton></> )}</div>{isCotizacion && (<div className="flex gap-2 mt-3 pt-3 border-t border-slate-100/80">{estNormalized === 'cotizacion' && (<><AppButton onClick={(e) => { e.stopPropagation(); onUpdateEstado(ev.id, 'Cot. Aprobada'); }} variant="success" className="flex-1 text-[11px] py-3 bg-emerald-50 text-white">Aprobar</AppButton><AppButton onClick={(e) => { e.stopPropagation(); onUpdateEstado(ev.id, 'Cot. Rechazada'); }} variant="default" className="flex-1 text-[11px] py-3 text-slate-500 border-slate-200">Rechazar</AppButton></>)}{estNormalized.includes('aprobada') && (<AppButton onClick={(e) => { e.stopPropagation(); onConvertir(ev); }} variant="primary" className="w-full text-xs py-3.5 shadow-md">Convertir en Reserva</AppButton>)}</div>)}<div className="flex gap-2 mt-3 pt-3 border-t border-slate-100/80"><ActionBtn icon={Edit} label="Editar" onClick={(e) => { e.stopPropagation(); onEdit(ev, isCotizacion); }} /><ActionBtn icon={Copy} label="Duplicar" color="blue" onClick={(e) => { e.stopPropagation(); onDuplicate(ev); }} /><ActionBtn icon={Trash2} label="Eliminar" color="rose" onClick={(e) => { e.stopPropagation(); onDelete(ev.id); }} /></div></div></div></div></div></div>);
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
    const handleSubmit = useCallback((e) => { e.preventDefault(); if(!formData.cliente?.trim())return showAlert("El nombre del cliente es obligatorio."); if(!formData.telefono?.trim())return showAlert("El teléfono es obligatorio."); if(!formData.fecha)return showAlert("La fecha del evento es obligatoria."); onSave(formData,isCotizacionMode); }, [formData, isCotizacionMode, onSave, showAlert]);

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
                     <div className="bg-white/95 border border-white rounded-[26px] p-5 sm:p-6 mb-4 shadow-[0_10px_32px_rgba(15,23,42,.06)] ring-1 ring-slate-100"><div className="flex items-center gap-3 mb-5"><IconBox icon={Receipt} color="emerald" /><h4 className="font-extrabold text-slate-900 text-lg tracking-tight">Finanzas</h4></div>{!isCotizacionMode && (<div className="grid grid-cols-2 gap-5 mb-6"><Field label="Abono" type="number" value={formData.abono} onChange={e=>setFormData(prev=>({...prev,abono:e.target.value}))} className="text-emerald-500 font-bold bg-emerald-50/50" /><Field label="Viáticos" type="number" value={formData.transporte} onChange={e=>{ const newTransporte = e.target.value; setFormData(prev => ({...prev, transporte: newTransporte, total: ((Array.isArray(prev.serviciosSeleccionados) ? prev.serviciosSeleccionados : []).reduce((sum, s) => sum + utils.safeNum(s.precio), 0) + utils.safeNum(newTransporte)).toString()})); }} /></div>)}{isCotizacionMode && (<div className="mb-6 space-y-5"><Field label="Viáticos Adicionales ($)" type="number" value={formData.transporte} onChange={e=>{ const newTransporte = e.target.value; setFormData(prev => ({...prev, transporte: newTransporte, total: ((Array.isArray(prev.serviciosSeleccionados) ? prev.serviciosSeleccionados : []).reduce((sum, s) => sum + utils.safeNum(s.precio), 0) + utils.safeNum(newTransporte)).toString()})); }} /><Field label="Vigencia de la cotización (días)" type="number" min="1" value={formData.vigenciaCotizacion || 7} onChange={e=>setFormData(prev=>({...prev,vigenciaCotizacion:Math.max(1,parseInt(e.target.value||'7',10))}))} /><p className="text-[10px] font-semibold text-slate-400 -mt-2">Se mostrará en el PDF como “Válida hasta”. La fecha queda reservada únicamente cuando el cliente confirma y realiza el abono acordado.</p></div>)}{!isCotizacionMode && (<div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 mb-6 relative overflow-hidden"><h5 className="text-[10px] uppercase font-extrabold text-slate-400 tracking-[0.2em] mb-4 flex items-center gap-2"><Truck size={14}/> Subcontratos / Proveedores</h5><div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_110px_auto] gap-3 items-end mb-4"><Field as="select" label="Proveedor" value={selectedProv} onChange={e=>handleProviderChange(e.target.value)} className="bg-white border-slate-200"><option value="">Selecciona...</option>{listadoProveedores?.filter(p=>p.activo!==false).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</Field><Field as="select" label="Servicio" value={selectedProvService} onChange={e=>handleProviderServiceChange(e.target.value)} disabled={!selectedProv} className="bg-white border-slate-200"><option value="">Servicio...</option>{providerServices.map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}</Field><Field label="Costo" type="number" placeholder="0.00" value={provCosto} onChange={e=>setProvCosto(e.target.value)} className="bg-white border-slate-200 text-rose-500 font-bold"/><button type="button" onClick={handleAddSubcontrato} className="bg-slate-900 text-white p-3.5 rounded-xl hover:bg-slate-800 transition-colors shadow-md h-[56px] w-[56px] flex items-center justify-center shrink-0"><Plus size={20}/></button></div><p className="text-[10px] font-semibold text-slate-400 -mt-2 mb-4">El costo se carga desde la tarifa del proveedor. Puedes modificarlo solo si este evento tiene un acuerdo diferente.</p>{formData.subcontratos?.length > 0 && (<div className="space-y-2 mt-4 pt-4 border-t border-slate-200">{formData.subcontratos.map((sc, i) => (<div key={sc.id||i} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 shadow-sm text-sm"><div><span className="font-bold text-slate-800">{sc.nombre}</span><span className="text-slate-400 text-xs block">{sc.servicio}</span><span className={`text-[9px] font-black uppercase ${sc.pagado?'text-emerald-500':'text-amber-500'}`}>{sc.pagado?'Pagado':'Pendiente de pago'}</span></div><div className="flex items-center gap-2"><span className="font-extrabold text-rose-500">-${utils.safeNum(sc.costo).toFixed(2)}</span><button type="button" onClick={()=>setFormData(prev=>({...prev,subcontratos:(prev.subcontratos||[]).filter((_,idx)=>idx!==i)}))} className="p-1.5 rounded-lg bg-rose-50 text-rose-500"><X size={14}/></button></div></div>))}</div>)}</div>)}{!isCotizacionMode && (<div className="mb-6 space-y-5"><Field label="Gastos operativos totales ($)" type="number" value={formData.gastos} onChange={e=>{ const newGastos = e.target.value; setFormData(prev => ({...prev, gastos: newGastos, costosSeparados: true})); }} className="text-rose-500 bg-rose-50/50" /><Field as="textarea" label="Detalle de gastos internos" value={formData.detalleGastos} onChange={e=>setFormData(prev=>({...prev,detalleGastos:e.target.value}))} placeholder="Ej. Transporte, hielo, ayudante..." /></div>)}<div className="mb-6 border-t border-slate-100 pt-6 mt-2"><label className={UI.label}>Estado {isCotizacionMode ? 'Cotización' : 'Reserva'}</label><div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">{opcionesEstado.map(est => (<button type="button" key={est} onClick={() => setFormData(prev => ({ ...prev, estado: est }))} className={`shrink-0 flex-1 py-3.5 px-4 text-[10px] font-bold uppercase tracking-widest rounded-xl border transition-colors active:scale-[0.98] ${formData.estado===est ? 'bg-gradient-to-r from-[#7657FF] to-[#8B5CF6] text-white border-transparent shadow-[0_8px_15px_rgba(37,99,235,0.25)]' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-700'}`}>{est}</button>))}</div></div><div className="bg-slate-100/80 p-6 rounded-2xl flex justify-between items-center border border-slate-200/80 mt-2 shadow-sm"><span className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">TOTAL FINAL</span><div className="flex items-center"><span className="text-3xl font-extrabold text-[#7657FF] mr-2">$</span><input type="number" value={formData.total} onChange={e=>setFormData(prev=>({...prev,total:e.target.value}))} className="bg-transparent text-right text-4xl font-black text-slate-900 outline-none w-32 tracking-tight" /></div></div></div>
                     <div className="sticky bottom-0 z-30 -mx-4 sm:-mx-7 px-4 sm:px-7 pt-3 pb-4 bg-gradient-to-t from-[#F7F8FC] via-[#F7F8FC]/95 to-transparent"><AppButton variant="primary" icon={Check} onClick={handleSubmit} className="w-full py-4.5 text-sm uppercase tracking-[0.16em] rounded-[20px] shadow-[0_16px_35px_rgba(218,42,216,.30)]">{isCotizacionMode ? 'Guardar Cotización' : (initialData?.id && !initialData?.isDuplicated ? 'Actualizar Reserva' : 'Guardar Reserva')}</AppButton></div>
                  </form></div>
              </div>
        </div>
    );
});

// --- APP COMPONENT ---
export default function App() {
  const lastActivityRef = useRef(Date.now()); 
  const [currentTime] = useState(new Date());
  const [appSettings, setAppSettings] = useState(() => { const saved = utils.getSafeLocal('diverty_settings'); return saved ? JSON.parse(saved) : { metaMensual: META_MENSUAL, empresa: DATOS_EMPRESA }; });
  
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
  const stateRef = useRef({ modalConfig, clientEditModal, proveedorModal, isModoOperativo, isPrinting, activeTab, isNotifOpen, confirmModal, expandedClientId, expandedProvId, expandedFinanceId, financeFocus });
  useEffect(() => { 
      stateRef.current = { modalConfig, clientEditModal, proveedorModal, isModoOperativo, isPrinting, activeTab, isNotifOpen, confirmModal, expandedClientId, expandedProvId, expandedFinanceId, financeFocus }; 
  });
  
  useEffect(() => {
    // Una sola entrada centinela: Atrás consume capas internas; en Inicio sin capas no se repone y el navegador/app puede salir.
    window.history.pushState({ divertyApp: true }, '', window.location.href);
    const handleBack = () => {
        const s = stateRef.current;
        let blocked = false;
        
        if (s.confirmModal?.isOpen) { setConfirmModal({ isOpen: false, message: '', onConfirm: null }); blocked = true; }
        else if (s.isPrinting) { setIsPrinting(false); blocked = true; }
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
          setEventos(prev => {
              const map = new Map(prev.map(e => [e.id, e]));
              fullData.forEach(e => map.set(e.id, e));
              return Array.from(map.values());
          });
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
      (activeTab === 'eventos' && (viewMode === 'todas' || viewMode === 'pendientes' || viewMode === 'completadas' || !!deferredGlobalSearch || !!filterDate));
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

  // Índices derivados: se calculan una sola vez cuando cambian los eventos.
  // Evitan recorrer toda la base repetidamente en Calendario y Clientes.
  const eventosAgendaPorFecha = useMemo(() => {
    const map = new Map();
    eventosActivos.forEach(e => {
      const es = utils.normalizeText(e.estado);
      if (!e.fecha || es === 'cancelado' || es.includes('cotizaci') || es.includes('cot.')) return;
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
  
  const stats = useMemo(() => {
     let gananciaHoy = 0, gananciaSemana = 0, deudaTotal = 0, ingresosEsteMes = 0; 
     const eventosHoy = [], eventosManana = [], alertasOperativas = [], currYear = todayObj.getFullYear(), currMonth = todayObj.getMonth() + 1;
     
     eventosActivos.forEach(e => {
        const es = utils.normalizeText(e.estado);
        const isHoy = e.fecha === todayStr;
        const isManana = e.fecha === tomorrowStr;
        
        if(es !== 'cancelado' && !es.includes('cotizaci') && !es.includes('cot.')) {
            const t = utils.safeNum(e.total), a = utils.safeNum(e.abono), g = getCostosEvento(e), p = t - g;  
            let evYear = 0, evMonth = 0, evDay = 0;
            
            if(e.fecha) { 
                const parts = String(e.fecha).trim().split('-'); 
                if(parts.length >= 2) { evYear = parseInt(parts[0], 10); evMonth = parseInt(parts[1], 10); evDay = parseInt(parts[2] || 0, 10); } 
            }
            
            const isEsteMes = (evYear === currYear && evMonth === currMonth);
            const isPastOrCurrentMonth = evYear < currYear || (evYear === currYear && evMonth <= currMonth);
            
            if ((t - a) > 0 && isPastOrCurrentMonth) deudaTotal += (t - a); 
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
     
     return { gananciaHoy, gananciaSemana, deudaTotal, ingresosEsteMes, eventosHoy, eventosManana, alertasOperativas };
  }, [eventosActivos, todayStr, tomorrowStr, weekStart, weekEnd, todayObj]);

  const clientsList = useMemo(() => {
     const clientsMap = new Map();
     eventosActivos.forEach(e => {
         const es = utils.normalizeText(e.estado);
         if(es === 'cancelado' || es.includes('cotizaci') || es.includes('cot.')) return;

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
          if (es.includes('cotizaci') || es.includes('cot.')) return false; 
          if (deferredGlobalSearch && !String(`${e.cliente} ${e.servicio} ${e.ubicacion} ${e.direccion} ${e.telefono}`).toLowerCase().includes(deferredGlobalSearch.toLowerCase())) return false; 
          if (filterDate && e.fecha !== filterDate) return false; 
          
          if (!filterDate && !deferredGlobalSearch) { 
              // Una reserva completada sale de la operación diaria inmediatamente.
              // Sigue disponible en "Completadas", "Todas", Clientes y Finanzas cuando se carga el historial.
              if (viewMode !== 'todas' && viewMode !== 'completadas' && es === 'completado') return false;
              if (viewMode === 'hoy') return e.fecha === todayStr; 
              let dt; 
              if (e.fecha) { const parts = String(e.fecha).split('-'); if (parts.length === 3) dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)); } 
              if (viewMode === 'semana') return dt ? (dt >= weekStart && dt <= weekEnd) : false; 
              if (viewMode === 'mes') return dt ? (dt.getFullYear() === todayObj.getFullYear() && dt.getMonth() === todayObj.getMonth()) : false; 
              if (viewMode === 'findesemana') return dt ? (dt.getDay() === 0 || dt.getDay() === 6) : false; 
              if (viewMode === 'pendientes') return (utils.safeNum(e.total) - utils.safeNum(e.abono)) > 0 && es !== 'completado'; 
              if (viewMode === 'completadas') return es === 'completado';
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
      if (es === 'cancelado' || es.includes('cotizaci') || es.includes('cot.')) return false;
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
  
  const finanzasMes = useMemo(() => { 
    const ingresosEsteMesGlobal = eventosActivos.filter(e => { 
      const es = utils.normalizeText(e.estado); 
      if (es === 'cancelado' || es.includes('cotizaci') || es.includes('cot.')) return false; 
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
          if (!e.fecha || utils.normalizeText(e.estado) === 'cancelado' || utils.normalizeText(e.estado).includes('cot')) return false;
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
        const val = eventosActivos.filter(e => { if (!e.fecha || utils.normalizeText(e.estado) === 'cancelado' || utils.normalizeText(e.estado).includes('cot')) return false; const parts = e.fecha.split('-'); return parseInt(parts[0], 10) === m.year && parseInt(parts[1], 10) === m.month; }).reduce((acc, ev) => acc + (utils.safeNum(ev.total) - getCostosEvento(ev)), 0);
        return { date: m.label, value: val };
      });
    }

    const semanas = [ { label: 'Sem 1', start: 1, end: 7 }, { label: 'Sem 2', start: 8, end: 14 }, { label: 'Sem 3', start: 15, end: 21 }, { label: 'Sem 4', start: 22, end: 28 }, { label: 'Sem 5', start: 29, end: 31 } ];
    return semanas.map(s => {
      const value = eventosActivos.filter(e => {
        if (!e.fecha || utils.normalizeText(e.estado) === 'cancelado' || utils.normalizeText(e.estado).includes('cot')) return false;
        const parts = e.fecha.split('-'); const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
        return y === financeYear && m === financeMonth && d >= s.start && d <= s.end;
      }).reduce((acc, ev) => acc + (utils.safeNum(ev.total) - getCostosEvento(ev)), 0);
      return { date: s.label, value };
    });
  }, [eventosActivos, financePeriod, financeYear, financeMonth, todayTime]);

  const maxChartVal = useMemo(() => Math.max(...chartData.map(d => d.value), 100), [chartData]); 
  const cotizacionesActivas = useMemo(() => eventosActivos.filter(e => { const es = utils.normalizeText(e.estado); return es === 'cotizacion' || es === 'cot. aprobada'; }), [eventosActivos]); 
  const proximasReservas = useMemo(() => [...stats.eventosHoy, ...stats.eventosManana].filter(e => utils.normalizeText(e.estado) !== 'completado'), [stats.eventosHoy, stats.eventosManana]);

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
              if (!srvs.length && e.servicio) { srvs.push({ nombre: e.servicio, precio: utils.safeNum(e.total), cantidad: 1, precioOriginal: utils.safeNum(e.total), descripcion: String(e.descripcionEvento || '').trim() }); } 
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
  
  const handleUpdateEstado = useCallback(async (id, nuevoEstado) => {
      utils.triggerHaptic('light');
      const anterior = eventos.find(e => e.id === id)?.estado || 'Pendiente';
      const nowIso = new Date().toISOString();
      setEventos(prev => prev.map(e => e.id === id ? { ...e, estado: nuevoEstado, updatedAt: nowIso } : e));
      try {
          await setDoc(getDocRef(id), { estado: nuevoEstado, updatedAt: nowIso }, { merge: true });
          publishSync('evento', id, 'update').catch(() => {});
          showAlert(`Estado actualizado a ${nuevoEstado}`, true);
      } catch (err) {
          console.error("Error actualizando estado:", err);
          setEventos(prev => prev.map(e => e.id === id ? { ...e, estado: anterior } : e));
          showAlert("No se pudo actualizar el estado de la reserva.", false);
      }
  }, [eventos, showAlert, publishSync]);
  
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
              tx.set(ref, { abono: nuevoAbono, _rev: nuevoRev, updatedAt: new Date().toISOString() }, { merge: true });
          });
          await publishSync('evento', ev.id, 'update');
          setEventos(prev => prev.map(item => item.id === ev.id ? { ...item, abono: nuevoAbono, _rev: nuevoRev, updatedAt: new Date().toISOString() } : item));
          showAlert(`Abono de $${monto.toFixed(2)} registrado correctamente.`, true);
      } catch (err) {
          console.error("Error registrando abono:", err);
          if (err?.message === 'PAYMENT_EXCEEDS_BALANCE') return showAlert(`Otro dispositivo actualizó esta reserva. El saldo actual es $${utils.safeNum(err.pendiente).toFixed(2)}.`, false);
          showAlert("No se pudo registrar el abono. Verifica tu conexión e intenta nuevamente.", false);
      }
  }, [showAlert, publishSync]);

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

  const handleConvertirReserva = useCallback((e) => { 
      utils.triggerHaptic('light'); setModalConfig({ isOpen: true, isCotizacion: false, initialData: { ...e, estado: 'Pendiente' } }); showAlert("Confirma los datos para crear la reserva.", true); 
  }, [showAlert]);

  const handleConfirmWebRequest = useCallback(async (event) => {
      if (!event?.id || utils.normalizeText(event.origen) !== 'web directa') return false;
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
              confirmedData = { ...remote, estado: 'Confirmada', _rev: (Number(remote._rev) || 0) + 1, updatedAt: new Date().toISOString() };
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

  const handleSaveFromModal = useCallback(async (formDataToSave, isCotizacionMode) => {
    if (!formDataToSave.cliente?.trim()) return showAlert("Por favor, ingresa el nombre del cliente."); 
    if (!formDataToSave.fecha) return showAlert("Por favor, selecciona la fecha."); 
    
    utils.triggerHaptic('light'); 
    const evtId = (formDataToSave.id && !formDataToSave.isDuplicated) ? formDataToSave.id : (isCotizacionMode ? `cot-${Date.now()}` : `man-${Date.now()}`); 
    const { isDuplicated, ...cleanFormData } = formDataToSave; 
    
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
        if (e.id === evtId || utils.normalizeText(e.estado) === 'cancelado' || utils.normalizeText(e.estado).includes('cotizaci') || utils.normalizeText(e.estado).includes('cot.') || e.fecha !== safeData.fecha) return false; 
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
                    savedData = { ...dataToSave, _rev: remoteRev + 1, updatedAt: new Date().toISOString() };
                    const oldSlotRef = slotDocRef(remote);
                    const newSlotRef = slotDocRef(savedData);
                    const oldSlotSnap = oldSlotRef ? await tx.get(oldSlotRef) : null;
                    const newSlotSnap = newSlotRef && (!oldSlotRef || newSlotRef.path !== oldSlotRef.path) ? await tx.get(newSlotRef) : oldSlotSnap;
                    tx.set(ref, savedData);
                    if (!samePublicSlot(remote, savedData)) {
                        if (oldSlotRef) writeSlotMembership(tx, oldSlotRef, oldSlotSnap, id, -1, remote);
                        if (newSlotRef) writeSlotMembership(tx, newSlotRef, newSlotSnap, id, 1, savedData);
                    }
                });
            } else {
                savedData = { ...dataToSave, _rev: 1, updatedAt: new Date().toISOString() };
                await setDoc(getDocRef(id), savedData);
            }
            await publishSync('evento', id, 'update');

            // NOTIFICACIONES PUSH: avisar solo al crear una reserva nueva.
            // No bloquea ni revierte el guardado si el servicio de notificaciones falla.
            const isNewReservation = !isExisting && !isCotizacionMode;
            if (isNewReservation) {
                try {
                    const notifyResponse = await fetch('https://diverty-notificaciones.divertypty.workers.dev', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reservationId: id })
                    });
                    if (!notifyResponse.ok) {
                        console.warn('Reserva guardada, pero el Worker de notificaciones respondió:', notifyResponse.status);
                    }
                } catch (notifyErr) {
                    console.warn('Reserva guardada, pero no se pudo enviar la notificación push:', notifyErr);
                }
            }

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

  const handleDeleteEvento = useCallback((id) => showConfirm("¿Eliminar registro permanentemente?", async () => {
      utils.triggerHaptic('light');
      try {
          // Eliminación real: evita que registros borrados sigan ocupando la colección
          // y vuelvan a descargarse en futuras sincronizaciones de Firestore.
          await deleteDoc(getDocRef(id));
          await publishSync('evento', id, 'delete');
          setEventos(prev => prev.filter(e => e.id !== id));
          closeModal();
          showAlert("Registro eliminado.", true);
      } catch (err) {
          console.error("Error eliminando registro:", err);
          showAlert("No se pudo eliminar el registro. Intenta nuevamente.", false);
      }
  }), [closeModal, showConfirm, showAlert, publishSync]);
  const handleDeleteClient = useCallback((client, eventCount) => { const clientName = client?.nombre || 'Cliente'; const mensaje = eventCount > 0 ? `¿Seguro que deseas ocultar este cliente? Tiene ${eventCount} evento(s) asociado(s).` : `¿Seguro que deseas ocultar este cliente?`; showConfirm(mensaje, async () => { utils.triggerHaptic('light'); const marker = client?.clientKey ? `key:${client.clientKey}` : clientName; const newHidden = [...new Set([...hiddenClients, marker])]; setHiddenClients(newHidden); if (firebaseUser) await setDoc(getConfigRef('clientesOcultos'), { clients: newHidden }, { merge: true }); showAlert("Cliente ocultado del CRM. Sus eventos se conservan.", true); }); }, [hiddenClients, firebaseUser, showConfirm, showAlert]);
  const handleWipeAll = useCallback(() => showConfirm("⚠️ ¿Limpiar toda la base de datos?", async () => {
      utils.triggerHaptic('light');
      try {
          // Para una purga total sí se consulta explícitamente toda la colección.
          const allSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'eventos'));
          await Promise.all(allSnap.docs.filter(d => !d.data()?._system).map(d => deleteDoc(getDocRef(d.id))));
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
  const openGoogleMaps = useCallback((dir, ubi) => { utils.triggerHaptic('light'); window.open(`https://maps.google.com/maps?q=${encodeURIComponent(`${dir || ''} ${ubi || ''} Panamá`)}`, '_blank'); }, []);
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
    utils.triggerHaptic('success'); const filteredForExport = eventosActivos.filter(e => { const est = utils.normalizeText(e.estado); if (est === 'cancelado' || est.includes('cotizaci') || est.includes('cot.') || utils.safeNum(e.total) <= 0) return false; if (financePeriod === 'todos') return true; const fStr = String(e.fecha || ''); if (fStr) { const [ey, em] = fStr.split('-'); if (financePeriod === 'anio') return parseInt(ey) === financeYear; return parseInt(ey) === financeYear && parseInt(em) === financeMonth; } return false; });
    let csv = 'Fecha,Cliente,Tipo Evento,Ubicacion,Facturado,Cobrado,Por Cobrar,Gastos Internos,Proveedores,Costos Totales,Ganancia Estimada,Estado\n'; filteredForExport.forEach(e => { const t = utils.safeNum(e.total), cobrado = Math.min(utils.safeNum(e.abono), t), pendiente = Math.max(t - utils.safeNum(e.abono), 0), gi = getGastosInternosEvento(e), prov = getCostoProveedoresEvento(e), g = gi + prov; csv += `"${e.fecha||''}","${String(e.cliente||'').replace(/,/g,'')}","${String(e.tipoEvento||'').replace(/,/g,'')}","${String(e.ubicacion||'').replace(/,/g,'')}",${t},${cobrado},${pendiente},${gi},${prov},${g},${t-g},"${e.estado||''}"\n`; });
    const blob = new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' }), url = URL.createObjectURL(blob), link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `Reporte_Finanzas_Diverty_${financePeriod === 'todos' ? 'Historico' : financePeriod === 'anio' ? `Anual_${financeYear}` : `${NOMBRES_MESES[financeMonth - 1]}_${financeYear}`}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }, [eventosActivos, financePeriod, financeYear, financeMonth]);

  const handleLogin = useCallback(async (e) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, emailInput, passwordInput); utils.triggerHaptic('success'); setEmailInput(''); setPasswordInput(''); } catch (error) { utils.triggerHaptic('warning'); showAlert("Credenciales incorrectas", false); } }, [emailInput, passwordInput, showAlert]);
  const handleLogout = useCallback(async () => { try { await signOut(auth); } catch (error) { showAlert("Error al cerrar sesión"); } }, [showAlert]);
  const handleCopiarCobros = useCallback(() => { utils.triggerHaptic('success'); let text = "📋 *REPORTE DE COBROS PENDIENTES* 📋\n\n"; eventosActivos.filter(e => { const est = utils.normalizeText(e.estado); return (utils.safeNum(e.total) - utils.safeNum(e.abono)) > 0 && est !== 'cancelado' && !est.includes('cotizaci') && !est.includes('cot.'); }).forEach(e => { text += `👤 *${e.cliente}*\n📅 Fecha: ${e.fecha}\n💰 Debe: $${(utils.safeNum(e.total) - utils.safeNum(e.abono)).toFixed(2)}\n📞 WA: ${e.telefono}\n\n`; }); navigator.clipboard.writeText(text); showAlert("Lista de cobros copiada al portapapeles", true); }, [eventosActivos, showAlert]);

  const activarNotificaciones = useCallback(async () => {
    if (!messaging) { showAlert("Notificaciones no disponibles.", false); return; }
    try { if (!('Notification' in window)) { showAlert("Navegador no soporta notificaciones.", false); return; } if (!('serviceWorker' in navigator)) { showAlert("Service Worker no disponible.", false); return; } const permiso = await Notification.requestPermission(); if (permiso !== "granted") { showAlert("Debes permitir notificaciones", false); return; } showAlert("Generando token, espera...", true); const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js'); await navigator.serviceWorker.ready; const token = await getToken(messaging, { vapidKey: "BEmGfQ2ANNd-fwu25Nd7OyRnzCbX8pdIoYxreafTsk5R5PKoAIfom-tDJIMS4Slpu5XjK0vvwLxHCS5_09B8YrQ", serviceWorkerRegistration: swRegistration }); if (token) { await setDoc(doc(db, "tokens", token), { token: token, createdAt: new Date(), updatedAt: new Date(), userAgent: navigator.userAgent || '', enabled: true }); console.log("Token guardado:", token); showAlert("✅ ¡Notificaciones activadas!", true); } else { showAlert("No se generó ningún token.", false); } } catch (error) { console.error("Error obteniendo token:", error); const detalle = error?.code || error?.name || error?.message || "desconocido"; showAlert(`Error al obtener token: ${detalle}`, false); }
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
                     stats.eventosHoy.map((e,i)=><EventCardItem key={e.id} ev={e} idx={i} todayTime={todayTime} onWhatsApp={sendWhatsAppCall} onViewDoc={handleViewDoc} onEdit={openModal} onDelete={handleDeleteEvento} onDuplicate={handleDuplicateEvento} onMapClick={openGoogleMaps} empresa={appSettings.empresa} utils={utils} onUpdateEstado={handleUpdateEstado} onConvertir={handleConvertirReserva} onRegistrarAbono={handleRegistrarAbono} />)
                 )}
             </div>
          </div>
        );
     }
     const reservasSemanaCount = eventosActivos.filter(e => {
        const estado = utils.normalizeText(e.estado);
        if (!e.fecha || estado === 'cancelado' || estado === 'completado' || estado.includes('cotizaci') || estado.includes('cot.')) return false;
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
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 mt-3">Por Cobrar</p><p className="text-[30px] sm:text-[36px] leading-none font-black text-rose-500 tracking-[-0.05em] mt-2">${stats.deudaTotal.toFixed(0)}</p>
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
                      {cotizacionesActivas.map((e,i)=><EventCardItem key={e.id} ev={e} idx={i} todayTime={todayTime} onWhatsApp={sendWhatsAppCall} onViewDoc={handleViewDoc} onEdit={openModal} onDelete={handleDeleteEvento} onDuplicate={handleDuplicateEvento} onMapClick={openGoogleMaps} empresa={appSettings.empresa} utils={utils} onUpdateEstado={handleUpdateEstado} onConvertir={handleConvertirReserva} onRegistrarAbono={handleRegistrarAbono} />)}
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
                      {proximasReservas.map((e,i)=><EventCardItem key={e.id} ev={e} idx={i} todayTime={todayTime} onWhatsApp={sendWhatsAppCall} onViewDoc={handleViewDoc} onEdit={openModal} onDelete={handleDeleteEvento} onDuplicate={handleDuplicateEvento} onMapClick={openGoogleMaps} empresa={appSettings.empresa} utils={utils} onUpdateEstado={handleUpdateEstado} onConvertir={handleConvertirReserva} onRegistrarAbono={handleRegistrarAbono} />)}
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
        const fechasOrdenadas = Object.keys(grouped).sort((a, b) => viewMode === 'completadas' ? String(b).localeCompare(String(a)) : String(a).localeCompare(String(b)));
        if (viewMode === 'completadas') {
            Object.values(grouped).forEach(items => items.sort((a, b) => String(b.hora || '').localeCompare(String(a.hora || ''))));
        }
        return (
            <div className="mt-7 space-y-9 relative z-10">
                {fechasOrdenadas.map(fecha => (
                    <div key={fecha} className="flex flex-col">
                        <div className="flex items-center justify-between gap-3 mb-5">
                            <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-[15px] bg-gradient-to-br from-[#EEF2FF] to-[#F6EEFF] border border-[#7657FF]/15 flex items-center justify-center shadow-sm"><CalendarDays size={20} className="text-[#7657FF]" strokeWidth={2.5}/></div><div><p className="text-[10px] uppercase tracking-[0.18em] font-black text-slate-400">{fecha === todayStr ? 'Hoy' : 'Agenda'}</p><h3 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">{fecha ? String(fecha).split('-').reverse().join('/') : 'Sin fecha'}</h3></div></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7657FF] bg-[#7657FF]/8 border border-[#7657FF]/10 px-3 py-2 rounded-full">{grouped[fecha].length} {grouped[fecha].length === 1 ? 'evento' : 'eventos'}</span>
                        </div>
                        <div className="space-y-4">{grouped[fecha].map((e,i)=><div key={e.id} className="grid grid-cols-[58px_1fr] sm:grid-cols-[74px_1fr] gap-3 sm:gap-4 items-stretch"><div className="relative flex flex-col items-center pt-4"><div className="text-center leading-none"><p className="text-[13px] sm:text-sm font-black text-slate-900">{String(e.hora || '--:--').slice(0,5)}</p></div><div className="mt-3 w-3 h-3 rounded-full bg-gradient-to-br from-[#FF3EA5] to-[#7657FF] ring-4 ring-[#F3ECFF] shadow-[0_0_16px_rgba(118,87,255,.28)] z-10"></div>{i < grouped[fecha].length - 1 && <div className="absolute top-[58px] bottom-[-22px] w-px bg-gradient-to-b from-[#CDBDFF] via-[#E8E1FF] to-transparent"></div>}</div><div className="min-w-0"><EventCardItem ev={e} idx={i} todayTime={todayTime} onWhatsApp={sendWhatsAppCall} onViewDoc={handleViewDoc} onEdit={openModal} onDelete={handleDeleteEvento} onDuplicate={handleDuplicateEvento} onMapClick={openGoogleMaps} empresa={appSettings.empresa} utils={utils} onUpdateEstado={handleUpdateEstado} onConvertir={handleConvertirReserva} onRegistrarAbono={handleRegistrarAbono} /></div></div>)}</div>
                    </div>
                ))}
            </div>
        );
    };

    return (
      <div className="animate-fadeIn min-h-full p-4 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-8 pb-32 relative text-slate-900 bg-[radial-gradient(circle_at_10%_0%,rgba(118,87,255,.08),transparent_30%),radial-gradient(circle_at_95%_14%,rgba(255,62,165,.06),transparent_28%),linear-gradient(180deg,#F7F8FC_0%,#F4F6FB_100%)]">
        <div className="pt-1 sm:pt-3 mb-6 sm:mb-8 flex flex-col gap-3 relative z-10">
            <div className="flex flex-col gap-4"><div><div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#7657FF] mb-1.5"><Sparkles size={14}/> Centro de operaciones</div><h2 className="text-4xl sm:text-5xl font-black text-slate-950 tracking-[-0.04em]">Agenda</h2><p className="text-sm sm:text-base font-medium text-slate-500 mt-1.5">Organiza tus eventos con precisión</p></div><button type="button" onClick={()=>{utils.triggerHaptic('light');setIsAgendaSummaryOpen(true)}} className="w-full flex items-center gap-4 rounded-[24px] bg-gradient-to-r from-[#FF3EA5] via-[#B83DFF] to-[#7657FF] px-5 py-3.5 text-white shadow-[0_16px_34px_rgba(184,61,255,.26)] active:scale-[.985] border border-white/30"><div className="w-12 h-12 shrink-0 rounded-[16px] bg-white/15 border border-white/15 flex items-center justify-center shadow-inner"><CalendarDays size={27}/></div><div className="text-left min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/75">Resumen de agenda</p><p className="text-2xl font-black leading-tight mt-1">{eventosActivos.filter(e=>{const d=String(e.fecha||''); const start=new Date(todayStr+'T00:00:00'); const end=new Date(start); end.setDate(end.getDate()+6); const ds=new Date(d+'T00:00:00'); return ds>=start&&ds<=end&&!/cancelado|cot/i.test(String(e.estado||''));}).length} eventos <span className="text-base font-bold text-white/80">esta semana</span></p></div><div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0"><ChevronRight size={21}/></div></button></div>
            <div className="flex flex-col lg:flex-row gap-4 mt-3 sm:mt-5">
                 <div className="relative flex-1 group"><div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-20"><Search size={22} strokeWidth={2.6} className="text-[#7657FF] group-focus-within:text-[#7657FF] transition-colors" /></div><input type="text" value={globalSearch} onChange={e=>setGlobalSearch(e.target.value)} placeholder="Buscar cliente, lugar, paquete..." className="w-full h-[56px] bg-white/95 backdrop-blur-xl border border-white rounded-[20px] pl-12 pr-12 text-[15px] font-semibold text-slate-900 outline-none focus:border-[#8B5CF6]/50 focus:ring-4 focus:ring-[#7657FF]/10 transition-all duration-300 shadow-[0_10px_28px_rgba(15,23,42,.06)] placeholder:text-slate-400" />{globalSearch && <button type="button" onClick={() => setGlobalSearch('')} className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-400 hover:text-slate-700 transition-colors"><X size={18}/></button>}</div>
                 <div className="flex gap-2 overflow-x-auto scrollbar-hide p-1.5 items-center bg-white/70 backdrop-blur-xl rounded-[20px] border border-white shadow-[0_10px_30px_rgba(15,23,42,.05)]">
                     {['hoy','semana','mes','pendientes'].map(v => (<button key={v} type="button" onClick={()=>{setFilterDate(''); setViewMode(v)}} className={`px-5 py-3.5 rounded-[14px] text-[10px] uppercase tracking-[0.1em] font-bold transition-all duration-300 ease-out whitespace-nowrap shadow-sm border active:scale-[0.98] ${viewMode===v&&!filterDate?'bg-gradient-to-r from-[#FF3EA5] via-[#B83DFF] to-[#7657FF] text-white border-transparent shadow-[0_10px_26px_rgba(184,61,255,0.30)]':'bg-white/90 backdrop-blur-xl text-slate-500 hover:text-slate-900 hover:bg-white border-slate-200/90'}`}>{v}</button>))}
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">{agendaFiltrados.map((e,i)=><EventCardItem key={e.id} ev={e} idx={i} todayTime={todayTime} onWhatsApp={sendWhatsAppCall} onViewDoc={handleViewDoc} onEdit={openModal} onDelete={handleDeleteEvento} onDuplicate={handleDuplicateEvento} onMapClick={openGoogleMaps} empresa={appSettings.empresa} utils={utils} onUpdateEstado={handleUpdateEstado} onConvertir={handleConvertirReserva} onRegistrarAbono={handleRegistrarAbono} />)}</div>
            ) : ( renderListView() )}
        </div>
        {isAgendaSummaryOpen && (()=>{
          const start=new Date(todayStr+'T00:00:00'); const end=new Date(start); end.setDate(end.getDate()+6);
          const weekEvents=eventosActivos.filter(e=>{const ds=new Date(String(e.fecha||'')+'T00:00:00'); return ds>=start&&ds<=end&&!/cancelado|cot/i.test(String(e.estado||''));}).sort((a,b)=>String(a.fecha||'').localeCompare(String(b.fecha||''))||String(a.hora||'').localeCompare(String(b.hora||'')));
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
                   <ProveedorCardItem key={p.id} p={p} idx={idx} isExpanded={expandedProvId === p.id} onToggleExpand={handleToggleProv} utils={utils} onDelete={handleDeleteProveedor} onEdit={(data)=>setProveedorModal({isOpen:true,data})} onWhatsApp={utils.openWhatsAppBusiness} onContrato={(prov)=>{setPrintData(prov);setPrintType('contrato_proveedor');setIsPrinting(true);}} eventosActivos={eventosActivos}/>
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
      return d.startsWith(todayStr.slice(0,7)) && !/cancelado|rechazada|cot/.test(estado) && e.deletedLocally !== true;
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

    if (configView === 'tools') return sectionShell(<>
      {subHeader('Herramientas del sistema','Funciones administrativas de uso ocasional.',Settings,'text-[#7657FF]')}
      <div className="rounded-[30px] bg-white/95 border border-white shadow-[0_18px_48px_rgba(15,23,42,.07)] p-5 sm:p-6"><div className="rounded-[22px] border border-[#7657FF]/15 bg-[#F7F4FF] p-5"><p className="font-black text-slate-950">Preparación de disponibilidad pública y numeración</p><p className="text-xs font-medium text-slate-500 mt-2 leading-relaxed">Ejecutar una vez después de actualizar los archivos y las reglas, sin otros equipos editando.</p><button type="button" className="mt-5 w-full h-13 py-3.5 rounded-[16px] bg-gradient-to-r from-[#7657FF] to-[#A33CFF] text-white font-black text-[10px] uppercase tracking-[.12em] shadow-[0_10px_24px_rgba(118,87,255,.22)]" onClick={async e=>{const b=e.currentTarget;b.disabled=true;try{await prepareDivertyData();showAlert('Preparación completada.',true);}catch(err){console.error(err);showAlert('Preparación incompleta. Reintenta con conexión.',false);}finally{b.disabled=false;}}}>Preparar actualización</button></div></div>
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
      <NotifModal isOpen={isNotifOpen} onClose={()=>setIsNotifOpen(false)} eventosActivos={eventosActivos} onConfirmWebRequest={handleConfirmWebRequest} />
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
            {activeTab === 'config' && renderConfig()}
          </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 w-full bg-white/[0.965] backdrop-blur-2xl border-t border-white flex justify-around items-center pb-safe pt-1.5 px-1.5 z-50 shadow-[0_-10px_30px_rgba(15,23,42,0.075),inset_0_1px_0_rgba(139,92,246,.08)] h-[70px]">
         {NAV_ITEMS.map(i => {
            const Ic = i.icon; const a = activeTab === i.id;
            return (
              <button key={i.id} onClick={() => handleTabChange(i.id)} className={`relative flex flex-col items-center justify-center gap-1 w-16 h-[58px] rounded-[16px] transition-all duration-300 ${a ? 'text-[#FF3EA5] -translate-y-0.5 bg-gradient-to-b from-[#FF3EA5]/[0.055] to-[#7657FF]/[0.035]' : 'text-slate-400 hover:text-slate-700'}`}>
                 {a && <span className="absolute top-0 w-7 h-[3px] rounded-full bg-gradient-to-r from-[#FF3EA5] to-[#7657FF] shadow-[0_3px_10px_rgba(255,62,165,.28)]"></span>}<Ic size={a?23:21} strokeWidth={a?2.6:2.1} className={a ? 'drop-shadow-sm' : ''}/>
                 <span className={`text-[9px] uppercase tracking-[0.08em] ${a?'font-black':'font-bold'}`}>{i.text}</span>
              </button>
            )
         })}
      </nav>
    </div>
  );
}
