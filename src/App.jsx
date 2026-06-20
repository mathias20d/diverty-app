import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Calendar, Users, Settings, Plus, Edit, Trash2, X, FileSignature, Clock, MapPin, Info, Download, Receipt, MessageCircle, RefreshCw, AlertTriangle, CheckCircle2, Cloud, Search, CalendarDays, ChevronRight, ChevronLeft, Star, BellRing, TrendingUp, DollarSign, Briefcase, Lock, Smartphone, FileText, Check, Sparkles, Map as MapIcon, Zap, PieChart, ChevronDown, Sun, Award, FileSpreadsheet, Copy, Share2, Home, Menu, BarChart3, ArrowUpRight, ArrowDownRight, ArrowDownWideNarrow, Save, Minus, Printer, ShieldCheck, Truck, UserPen, Handshake, PenLine } from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, deleteDoc, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

// --- CONFIGURACIÓN FIREBASE Y CONSTANTES ---
const firebaseConfig = { apiKey: "AIzaSyDxE2E1KMuZU523k8oWHabi1jDrFxPOD-0", authDomain: "diverty-eventos.firebaseapp.com", projectId: "diverty-eventos", storageBucket: "diverty-eventos.firebasestorage.app", messagingSenderId: "491130670516", appId: "1:491130670516:web:8c80abd09ccc92c194f6e1" };
const isNewApp = !getApps().length;
const app = isNewApp ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app); 

if (isNewApp) {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') console.warn("Offline: Múltiples pestañas.");
    else if (err.code === 'unimplemented') console.warn("El navegador no soporta offline.");
  });
}

const auth = getAuth(app);
const appId = "diverty-oficial";
const LOGO_URL = 'https://i.postimg.cc/GhFd4tcm/1000047880.png';

const META_MENSUAL = 1500;
const DATOS_EMPRESA = { nombreTitular: "AILEN DENNISKA CAMARENA MENDOZA", ruc: "Panamá RUC DV 79 8 957349", banco: "Banco General", tipoCuenta: "Cuenta de ahorros", numeroCuenta: "0472960083979", telefono: "6667-7965", email: "corporativo@divertyeventos.online", web: "Divertyeventos.online" };
const ZONAS_TRANSPORTE = { "Panamá Centro": 0, "San Miguelito": 5, "Panamá Norte": 10, "Panamá Este": 10, "Arraiján / Chorrera": 15, "Colón": 25 };
const NAV_ITEMS = [ {id:'inicio', icon:Home, text:'Inicio'}, {id:'eventos', icon:Calendar, text:'Agenda'}, {id:'clientes', icon:Users, text:'Clientes'}, {id:'proveedores', icon:Truck, text:'Proveedores'}, {id:'finanzas', icon:PieChart, text:'Finanzas'}, {id:'config', icon:Settings, text:'Ajustes'} ];
const defaultFormData = Object.freeze({ cliente: '', ruc: '', email: '', telefono: '', tipoEvento: 'Cumpleaños', ninos: '', fecha: '', hora: '', ubicacion: 'Panamá Centro', direccion: '', comentarios: '', servicio: '', serviciosSeleccionados: [], transporte: '', gastos: '', detalleGastos: '', subcontratos: [], total: '', abono: '', estado: 'Pendiente', colisionAprobada: false });
const NOMBRES_MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const getDocRef = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'eventos', id);
const getConfigRef = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'configuracion', id);
const getProvRef = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'proveedores', id);

// --- ESTILOS VISUALES (UI) ---
const UI = {
  card: "bg-white/85 backdrop-blur-xl border border-slate-200/60 rounded-[24px] shadow-sm relative overflow-hidden group hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] hover:border-slate-300/80 transition-all duration-500",
  modal: "bg-white/95 backdrop-blur-2xl rounded-t-[32px] sm:rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-slate-200/50 transition-transform duration-300", 
  input: "w-full bg-slate-50/50 backdrop-blur-sm focus:bg-white border border-slate-200 focus:border-[#2563FF]/50 rounded-2xl p-4 text-[15px] font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-[#2563FF]/10 transition-all placeholder:text-slate-400 shadow-sm", 
  label: "block text-[10px] uppercase text-slate-500 font-extrabold tracking-[0.2em] mb-2 ml-1", 
  title: "text-4xl sm:text-5xl font-black text-slate-900 tracking-tight drop-shadow-sm",
  btnBase: "font-black rounded-[16px] transition-all duration-300 ease-out active:scale-[0.96] flex items-center justify-center gap-2.5 px-5 py-3.5 relative overflow-hidden group",
  btnPrimary: "bg-gradient-to-r from-[#2563FF] via-[#7C3AED] to-[#FF3EA5] bg-[length:200%_auto] hover:bg-[100%_center] text-white shadow-[0_8px_20px_rgba(124,58,237,0.3)] hover:shadow-[0_15px_35px_rgba(124,58,237,0.5)] border border-white/20",
  btnDefault: "bg-white/80 backdrop-blur-md text-slate-700 hover:text-slate-900 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300"
};

export const utils = {
  normalizeText: (t) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""), 
  norm: (t) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""), 
  getSafeLocal: (k) => { try { return localStorage.getItem(k); } catch(e) { return null; } }, 
  getLoc: (k) => { try { return localStorage.getItem(k); } catch(e) { return null; } }, 
  setSafeLocal: (k, v) => { try { localStorage.setItem(k, v); } catch(e) {} },
  setLoc: (k, v) => { try { localStorage.setItem(k, v); } catch(e) {} },
  triggerHaptic: (t = 'light') => { if (window?.navigator?.vibrate) try { window.navigator.vibrate(t === 'light' ? 30 : 50); } catch (e) {} }, 
  vib: (t = 'light') => { if (window?.navigator?.vibrate) try { window.navigator.vibrate(t === 'light' ? 30 : 50); } catch (e) {} }, 
  safeNum: (v) => { if (typeof v === 'number') return isNaN(v) ? 0 : v; if (!v) return 0; const p = parseFloat(String(v).replace(/[^0-9.-]/g, '')); return isNaN(p) ? 0 : p; },
  num: (v) => { if (typeof v === 'number') return isNaN(v) ? 0 : v; if (!v) return 0; const p = parseFloat(String(v).replace(/[^0-9.-]/g, '')); return isNaN(p) ? 0 : p; },
  formatTime12h: (t) => { if (!t) return 'Por definir'; const [h, m] = String(t).split(':'); if (!h || !m) return t; let hrs = parseInt(h, 10); const suf = hrs >= 12 ? 'PM' : 'AM'; return `${hrs % 12 || 12}:${m} ${suf}`; },
  fmt12: (t) => { if (!t) return 'Por definir'; const [h, m] = String(t).split(':'); if (!h || !m) return t; let hrs = parseInt(h, 10); const suf = hrs >= 12 ? 'PM' : 'AM'; return `${hrs % 12 || 12}:${m} ${suf}`; },
  getLocalYYYYMMDD: (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  getYMD: (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  getWeekRange: (b = new Date()) => { const t = new Date(b), d = t.getDay() === 0 ? -6 : 1 - t.getDay(), s = new Date(t); s.setDate(t.getDate() + d); s.setHours(0, 0, 0, 0); const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999); return { start: s, end: e }; },
  getWeek: (b = new Date()) => { const t = new Date(b), d = t.getDay() === 0 ? -6 : 1 - t.getDay(), s = new Date(t); s.setDate(t.getDate() + d); s.setHours(0, 0, 0, 0); const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999); return { start: s, end: e }; },
  openWhatsAppBusiness: (phone, msg) => { const text = encodeURIComponent(msg); const url = `https://api.whatsapp.com/send?phone=${phone}&text=${text}`; const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; document.body.appendChild(link); link.click(); document.body.removeChild(link); },
  wa: (phone, msg) => { const text = encodeURIComponent(msg); const url = `https://api.whatsapp.com/send?phone=${phone}&text=${text}`; const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; document.body.appendChild(link); link.click(); document.body.removeChild(link); }
};

function getWhatsAppMessage(ev, type, empresa) {
    const tot = utils.safeNum(ev.total), abo = utils.safeNum(ev.abono), saldo = (tot - abo).toFixed(2), fec = String(ev.fecha||'').split('-').reverse().join('/'), hor = utils.formatTime12h(ev.hora);
    switch(type) {
        case 'cotizacion': return `¡Hola *${ev.cliente}*! ✨\nTe comparto la cotización para tu evento el *${fec}*.\n🎉 *Paquetes:* ${ev.servicio}\n💰 *Inversión Total:* $${tot.toFixed(2)}\n\n*He adjuntado el PDF con todos los detalles a este mensaje.*\n\nSi deseas agendar, puedes confirmarnos por aquí. ¡Estamos a la orden! 🥳`;
        case 'recibo': return `¡Hola *${ev.cliente}*! 🥳\nTu reserva está *Confirmada* ✅\n📅 *Fecha:* ${fec}\n⏰ *Hora:* ${hor}\n📍 *Lugar:* ${ev.ubicacion}\n💰 *Total:* $${tot.toFixed(2)}\n💳 *Abono recibido:* $${abo.toFixed(2)}\n⚠️ *Saldo a cancelar en evento:* $${saldo}\n\n*Te adjunto el recibo oficial en PDF.*\n¡Gracias por preferirnos! ✨`;
        case 'recordatorio': return `¡Hola *${ev.cliente}*! 🥳\n¡Se acerca tu gran día! Recuerda tu evento para el *${fec}* a las *${hor}*.\n📍 Llegaremos a *${ev.ubicacion}*.\n💰 Saldo pendiente: *$${saldo}*.\n¡Nos vemos pronto para la diversión! ✨`;
        case 'cobro': return `¡Hola *${ev.cliente}*! 👋\nTe contactamos de Diverty Eventos.\nTe recordamos amablemente que tienes un saldo pendiente de *$${saldo}* para asegurar tu fecha del *${fec}*.\n\nSi deseas realizar el abono mediante Yappy o Transferencia, por favor avísanos por aquí. ¡Estamos a tu disposición! ✨`;
        case 'banco': return `¡Hola *${ev.cliente}*! 👋\nNuestros datos bancarios:\n🏦 *Banco:* ${empresa.banco}\n📋 *Tipo:* ${empresa.tipoCuenta}\n🔢 *Cuenta:* ${empresa.numeroCuenta}\n👤 *Nombre:* ${empresa.nombreTitular}\nPor favor envía comprobante. ¡Gracias! ✨`;
        case 'contrato_prov': return `¡Hola *${ev.nombre}*! 👋\nTe comparto el Contrato de Prestación de Servicios de parte de Diverty Eventos.\nPor favor, revísalo y confirmamos detalles.\n¡Saludos! ✨`;
        case 'agradecimiento': default: return `¡Hola *${ev.cliente}*! 🌟\n¡GRACIAS por permitirnos estar en tu evento!\n¿Qué tal la pasaron? Nos encantaría ver fotitos 📸🎉\n¡Un abrazo mágico de todo el equipo! ✨`;
    }
}

// --- MICRO COMPONENTES ---
const Bg = () => (
  <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#F8FAFC]">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:32px_32px] opacity-40"></div>
    <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-[#2563FF] opacity-[0.04] blur-[120px] rounded-full mix-blend-multiply animate-[pulse_10s_ease-in-out_infinite]"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-[#7C3AED] opacity-[0.04] blur-[120px] rounded-full mix-blend-multiply animate-[pulse_12s_ease-in-out_infinite]"></div>
  </div>
);

const Toast = ({ alert }) => { 
  if (!alert.isOpen) return null; 
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100000] w-[90%] max-w-sm animate-fadeIn">
      <div className={`px-5 py-4 rounded-2xl shadow-xl flex items-center gap-3 border text-white backdrop-blur-md ${alert.success ? 'bg-emerald-500/95 border-emerald-400' : 'bg-rose-500/95 border-rose-400'}`}>
        {alert.success ? <CheckCircle2 size={24}/> : <AlertTriangle size={24}/>}
        <p className="font-bold text-sm tracking-wide">{alert.message}</p>
      </div>
    </div>
  ); 
};

const Confirm = ({ modal, setModal }) => { 
  if (!modal.isOpen) return null; 
  return (
    <div className="fixed inset-0 z-[100000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overscroll-none">
      <div className={`${UI.modal} max-w-md w-full text-center border-rose-200/50 p-8`}>
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-100">
          <AlertTriangle size={32} className="text-rose-500" />
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">¿Estás seguro?</h3>
        <p className="text-slate-500 font-medium mb-8 leading-relaxed">{modal.message}</p>
        <div className="flex gap-4">
          <button type="button" onClick={() => setModal({ isOpen: false, message: '', onConfirm: null })} className="flex-1 py-3.5 rounded-xl font-bold uppercase tracking-wider text-slate-600 bg-slate-100/80 hover:bg-slate-200 transition-all border border-slate-200/50">Cancelar</button>
          <button type="button" onClick={() => { if (modal.onConfirm) modal.onConfirm(); setModal({ isOpen: false, message: '', onConfirm: null }); }} className="flex-1 py-3.5 rounded-xl font-bold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 shadow-lg transition-all">Confirmar</button>
        </div>
      </div>
    </div>
  ); 
};

function EmptyState({ icon: Icon, title, message, actionBtn }) { 
  return (
    <div className={`${UI.card} bg-white/30 backdrop-blur-sm p-10 text-center flex flex-col items-center justify-center animate-fadeIn w-full border-dashed border-slate-300 min-h-[300px]`}>
      <div className="w-24 h-24 rounded-[24px] flex justify-center items-center mb-6 border border-slate-200/50 relative overflow-hidden bg-white/80 rotate-3 transition-transform hover:rotate-0 duration-300 shadow-sm">
        <Icon size={48} strokeWidth={1.5} className="relative z-10 text-[#2563FF]/60" />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-3 tracking-tight">{title}</h3>
      <p className="text-sm font-medium text-slate-500 max-w-md mb-8 leading-relaxed">{message}</p>
      {actionBtn}
    </div>
  ); 
}

function IconBox({ icon: Icon, color = 'blue', className = '' }) { 
  const cMap = { 
    blue: 'bg-[#2563FF]/10 text-[#2563FF] border-[#2563FF]/20', 
    rose: 'bg-[#FF3EA5]/10 text-[#FF3EA5] border-[#FF3EA5]/20', 
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20', 
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
  };
  return <div className={`p-2.5 rounded-xl border backdrop-blur-sm shadow-sm ${cMap[color]} ${className}`}><Icon size={20}/></div>; 
}

function Badge({ children, color = 'blue', className = '' }) { 
  const bgColors = { 
    blue: 'bg-[#2563FF]/10 text-[#2563FF] border-[#2563FF]/20', 
    rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20', 
    amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20', 
    emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', 
    gray: 'bg-slate-100 text-slate-600 border-slate-200/60' 
  }; 
  return <span className={`border px-3 py-1 rounded-[10px] text-[10px] sm:text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 shrink-0 shadow-sm backdrop-blur-sm ${bgColors[color]||bgColors.blue} ${className}`}>{children}</span>; 
}

function Field({ label, as = 'input', className = '', innerRef, children, ...props }) { 
  return (
    <div className={className}>
      {label && <label className={UI.label}>{label}</label>}
      {as === 'input' && <input ref={innerRef} className={UI.input} {...props} />}
      {as === 'textarea' && <textarea ref={innerRef} className={`${UI.input} min-h-[80px] resize-none leading-relaxed`} {...props} />}
      {as === 'select' && <select ref={innerRef} className={`${UI.input} appearance-none cursor-pointer [&>option]:bg-white [&>option]:text-slate-900`} {...props}>{children}</select>}
    </div>
  ); 
}

function ActionBtn({ icon: Icon, label, color = 'white', onClick }) { 
    const btnClasses = { 
        white: 'text-slate-600 hover:text-slate-900 bg-white/80 hover:bg-slate-50 border border-slate-200/80 hover:shadow-md hover:border-slate-300', 
        blue: 'text-[#2563FF] bg-[#2563FF]/10 hover:bg-[#2563FF]/20 border border-[#2563FF]/20 hover:shadow-[0_0_15px_rgba(37,99,235,0.4)]', 
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
}

function AppButton({ children, variant = 'primary', icon: Icon, onClick, className = '', ...props }) { 
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
}

function AppCard({ children, title, icon: Icon, iconColor = 'primary', className = '' }) { 
    const bgHover = { primary: "group-hover:bg-[#2563FF]/5", success: "group-hover:bg-emerald-500/5", danger: "group-hover:bg-rose-500/5", warning: "group-hover:bg-amber-500/5" }; 
    const iconColors = { primary: "text-[#2563FF]", success: "text-emerald-500", danger: "text-rose-500", warning: "text-amber-500" }; 
    const iconBg = { primary: "bg-[#2563FF]/10", success: "bg-emerald-500/10", danger: "bg-rose-500/10", warning: "bg-amber-500/10" }; 
    return (
        <div className={`bg-white/60 backdrop-blur-2xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] p-6 sm:p-8 flex flex-col justify-center relative overflow-hidden transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] group ${bgHover[iconColor] || ''} ${className}`}>
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
}

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

function AnimatedProgress({ value }) { 
    const [width, setWidth] = useState(0); const barRef = useRef(null); 
    useEffect(() => { 
        const o = new IntersectionObserver((e) => { if (e[0].isIntersecting) { setTimeout(() => setWidth(value), 200); o.disconnect(); } }, { threshold: 0.1 }); 
        if (barRef.current) o.observe(barRef.current); 
        return () => o.disconnect(); 
    }, [value]); 
    return (
        <div ref={barRef} className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden bg-slate-200 shadow-inner" style={{ width: `${width}%` }}>
            <div className="absolute inset-0 bg-gradient-to-r from-[#2563FF] via-[#7C3AED] to-[#FF3EA5]"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-[200%] animate-[shimmer_2s_infinite]"></div>
        </div>
    ); 
}

function SkeletonCard() { 
    return (
        <div className={`${UI.card} p-6 animate-pulse flex flex-col gap-4 h-[280px]`}>
            <div className="flex justify-between w-full"><div className="h-5 bg-slate-200 rounded-full w-1/3"></div><div className="h-6 bg-slate-200 rounded-xl w-16"></div></div>
            <div className="h-10 bg-slate-200 rounded-full w-3/4 mt-3"></div>
            <div className="space-y-4 mt-4"><div className="h-4 bg-slate-200 rounded-full w-1/2"></div><div className="h-4 bg-slate-200 rounded-full w-2/3"></div></div>
            <div className="mt-auto h-14 bg-slate-100/50 rounded-[16px] w-full border border-slate-200/50"></div>
        </div>
    ); 
}

// --- MODAL DE NOTIFICACIONES ---
function NotifModal({ isOpen, onClose, eventosActivos, openModal }) {
    if (!isOpen) return null;
    const reqs = eventosActivos.filter(e => utils.normalizeText(e.estado) === 'pendiente').sort((a,b) => new Date(b.createdAt||0).getTime() - new Date(a.createdAt||0).getTime());
    return (
        <div className="fixed inset-0 z-[100000] bg-slate-900/60 backdrop-blur-sm flex justify-end animate-fadeIn">
            <div className="w-full sm:w-96 bg-slate-50 h-full flex flex-col shadow-2xl animate-slideLeft">
                <div className="p-6 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm relative z-10">
                    <h3 className="font-black text-xl flex items-center gap-3 text-slate-900"><BellRing className="text-[#2563FF]"/> Alertas Web</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X size={20} className="text-slate-500"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {reqs.length === 0 ? (
                        <div className="text-center mt-12 opacity-60">
                            <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4"/>
                            <p className="font-bold text-slate-500 text-sm">Todo al día. No hay nuevas solicitudes.</p>
                        </div>
                    ) : (
                        reqs.map(e => (
                            <div key={e.id} onClick={()=>{openModal(e); onClose();}} className="bg-white p-5 rounded-[20px] shadow-sm border border-slate-200 cursor-pointer hover:border-[#2563FF]/50 hover:shadow-md transition-all active:scale-[0.98] group">
                                <div className="flex justify-between items-start mb-3">
                                    <Badge color="amber"><Zap size={10}/> Nueva Solicitud</Badge>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">{e.fecha?.split('-').reverse().join('/')}</span>
                                </div>
                                <h4 className="font-extrabold text-slate-900 text-lg mb-1">{e.cliente}</h4>
                                <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Clock size={12} className="text-[#2563FF]"/> {utils.formatTime12h(e.hora)} &nbsp; <MapPin size={12} className="text-rose-500"/> {e.ubicacion}</p>
                                <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] font-bold text-[#2563FF] flex justify-between items-center group-hover:translate-x-1 transition-transform">Ver detalles <ChevronRight size={14}/></div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// --- PLANTILLA DE GENERACIÓN DE PDF ---
function PdfTemplate({ printData, printType, pdfScale, onClose, onPrint, onShare, onDownload, appSettings, eventosActivos }) {
    const isC = printType === 'cotizacion', isContrato = printType === 'contrato', isContratoProv = printType === 'contrato_proveedor';
    const cli = String(printData.cliente || printData.nombre || ''), tel = String(printData.telefono || ''), emailStr = String(printData.email || ''), rucStr = String(printData.ruc || ''), ubi = String(printData.ubicacion || 'Por definir'), dir = String(printData.direccion || '');
    const fechaDoc = printData.fecha ? String(printData.fecha).split('-').reverse().join('/') : utils.getLocalYYYYMMDD(new Date()).split('-').reverse().join('/'), horaStr = utils.formatTime12h(printData.hora);
    const tot = utils.safeNum(printData.total), trn = utils.safeNum(printData.transporte), abo = utils.safeNum(printData.abono), sub = (tot - trn).toFixed(2);
    const sA = printData.serviciosSeleccionados?.length > 0 ? printData.serviciosSeleccionados : [{ nombre: String(printData.servicio || printData.especialidad || 'Servicio General'), precio: sub, cantidad: 1, descripcion: String(printData.comentarios || '') }];
    const idx = isContratoProv ? 1 : [...eventosActivos].sort((a,b)=>new Date(a.createdAt||0).getTime()-new Date(b.createdAt||0).getTime()).findIndex(ev=>ev.id===printData.id);
    const numRef = isC ? `COT-${String(idx!==-1?idx+1:1).padStart(5,'0')}` : (isContratoProv ? `SUB-${String(Math.floor(Math.random()*9000)+1000)}` : (isContrato ? `CON-${String(idx!==-1?idx+1:1).padStart(5,'0')}` : `FAC-${String(idx!==-1?idx+1:1).padStart(5,'0')}`));

    return (
      <div className="bg-[#1E293B] min-h-screen text-slate-900 flex flex-col font-sans overflow-x-hidden animate-fadeIn relative z-[99999]">
        <style>{`@media print{body *{visibility:hidden;}#pdf-wrapper-scaler,#pdf-wrapper-scaler *{visibility:visible;}#pdf-wrapper-scaler{position:absolute;left:0;top:0;width:100%;transform:scale(1)!important;margin:0;}.print\\:hidden{display:none!important;}@page{size:auto;margin:0mm;}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}}.avoid-break{page-break-inside:avoid;break-inside:avoid;}`}</style>
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md shadow-lg flex flex-col sm:flex-row justify-between items-center z-50 print:hidden border-b border-slate-800 p-4 gap-4">
            <button type="button" onClick={onClose} className="text-white flex items-center font-bold hover:text-indigo-400 self-start sm:self-auto transition-colors"><X size={20} className="mr-1"/> Atrás</button>
            <div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto">
                <button type="button" onClick={onPrint} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center shadow-lg text-sm mr-2 transition-all active:scale-95"><Printer size={16} className="mr-2"/> Imprimir PDF</button>
                <button type="button" onClick={onShare} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white px-4 py-2.5 rounded-xl font-bold flex items-center shadow-lg text-sm transition-all active:scale-95"><Share2 size={16} className="mr-2"/> Compartir</button>
                <button type="button" onClick={onDownload} className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold flex items-center shadow-lg text-sm ml-2 transition-all active:scale-95"><Download size={16} className="mr-2"/> Guardar</button>
            </div>
        </div>
        <div className="w-full flex-1 flex justify-center pb-12 pt-8 overflow-hidden">
            <div style={{ width: `${794 * pdfScale}px`, height: `${1123 * pdfScale}px`, position: 'relative' }}>
                <div id="pdf-wrapper-scaler" style={{ transform: `scale(${pdfScale})`, transformOrigin: 'top left', width: '794px', position: 'absolute', top: 0, left: 0 }}>
                    <div id="pdf-content" className="bg-[#FFFFFF] w-[794px] min-h-[1123px] h-auto relative overflow-hidden font-sans text-slate-800 p-12 flex flex-col shadow-2xl rounded-sm">
                        <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-gradient-to-bl from-[#2563FF]/8 to-[#7C3AED]/8 rounded-bl-[180px] z-0 pointer-events-none" />
                        <div className="absolute top-[280px] left-[-100px] w-[300px] h-[300px] bg-radial-gradient(circle,rgba(255,62,165,0.04)_0%,transparent_70%) z-0 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-[#7C3AED]/5 to-[#2563FF]/5 rounded-tr-[240px] z-0 pointer-events-none" />
                        
                        <div className="flex flex-col mb-8 relative z-10">
                            <div className="flex justify-between items-start w-full">
                                <div className="flex flex-col gap-3">
                                    <div className="bg-white/80 p-3.5 rounded-[22px] shadow-sm border border-slate-100 inline-block w-40">
                                        <img src={LOGO_URL} alt="Diverty" className="h-12 w-full object-contain" crossOrigin="anonymous" />
                                    </div>
                                    <div>
                                        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-[#2563FF] mb-0.5">Diverty Eventos Panamá</h2>
                                        <p className="text-[10px] text-slate-500 font-semibold">{appSettings.empresa.email} &nbsp;|&nbsp; {appSettings.empresa.telefono}</p>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <div className="bg-[#2563FF]/5 border border-[#2563FF]/15 px-4 py-2 rounded-2xl mb-2">
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2563FF]">Nº Documento</span>
                                        <p className="text-base font-black text-slate-900 leading-none mt-1">{numRef}</p>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-bold tracking-wide">Fecha de Emisión: {fechaDoc}</p>
                                </div>
                            </div>
                            <div className="relative mt-8">
                                <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-slate-100"></div></div>
                                <div className="relative flex justify-center">
                                    <span className="bg-white px-6 text-2xl font-black text-slate-900 tracking-[0.2em] uppercase bg-gradient-to-r from-[#2563FF] to-[#7C3AED] bg-clip-text text-transparent">
                                        {isC ? 'COTIZACIÓN' : (isContratoProv ? 'SUBCONTRATO SERVICIOS' : (isContrato ? 'CONTRATO DE SERVICIO' : 'FACTURA COMERCIAL'))}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between gap-6 mb-8 relative z-10">
                            <div className="w-1/2 bg-slate-50/70 p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                                <div>
                                    <h3 className="text-[10px] font-black text-[#7C3AED] uppercase tracking-[0.2em] mb-4 pb-2 border-b border-slate-200/60 flex items-center gap-2">
                                        {isContratoProv ? <Briefcase size={14} className="text-[#7C3AED]"/> : <Users size={14} className="text-[#7C3AED]"/>} 
                                        {isContratoProv ? 'Datos del Contratante' : 'Información del Cliente'}
                                    </h3>
                                    <div className="space-y-2.5 text-[12px] font-semibold text-slate-600">
                                        <div className="flex justify-between gap-4"><span className="text-slate-400">Nombre:</span><span className="text-slate-950 font-extrabold truncate w-40 text-right capitalize">{isContratoProv ? 'DIVERTY EVENTOS PANAMÁ' : cli}</span></div>
                                        <div className="flex justify-between gap-4"><span className="text-slate-400">Teléfono:</span><span className="text-slate-950 font-extrabold text-right">{isContratoProv ? appSettings.empresa.telefono : tel}</span></div>
                                        {(isContratoProv ? appSettings.empresa.email : emailStr) && <div className="flex justify-between gap-4"><span className="text-slate-400">Email:</span><span className="text-slate-950 font-extrabold truncate w-40 text-right break-all">{isContratoProv ? appSettings.empresa.email : emailStr}</span></div>}
                                        {(isContratoProv ? appSettings.empresa.ruc : rucStr) && <div className="flex justify-between gap-4"><span className="text-slate-400">RUC / DV:</span><span className="text-slate-950 font-extrabold text-right">{isContratoProv ? appSettings.empresa.ruc : rucStr}</span></div>}
                                    </div>
                                </div>
                            </div>
                            <div className="w-1/2 bg-slate-50/70 p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                                <div>
                                    <h3 className="text-[10px] font-black text-[#2563FF] uppercase tracking-[0.2em] mb-4 pb-2 border-b border-slate-200/60 flex items-center gap-2">
                                        {isContratoProv ? <Truck size={14} className="text-[#2563FF]"/> : <MapPin size={14} className="text-[#2563FF]"/>} 
                                        {isContratoProv ? 'Datos del Proveedor' : 'Logística de Celebración'}
                                    </h3>
                                    <div className="space-y-2.5 text-[12px] font-semibold text-slate-600">
                                        {isContratoProv ? (
                                            <>
                                                <div className="flex justify-between gap-4"><span className="text-slate-400">Nombre/Empresa:</span><span className="text-slate-950 font-extrabold text-right">{cli}</span></div>
                                                <div className="flex justify-between gap-4"><span className="text-slate-400">Especialidad:</span><span className="text-slate-950 font-extrabold text-right">{printData.especialidad || 'Servicios Varios'}</span></div>
                                                <div className="flex justify-between gap-4"><span className="text-slate-400">WhatsApp:</span><span className="text-slate-950 font-extrabold truncate w-32 text-right">{tel}</span></div>
                                                {printData.costoBase && <div className="flex justify-between gap-4"><span className="text-slate-400">Costo Acordado:</span><span className="text-slate-950 font-extrabold text-right">${printData.costoBase}</span></div>}
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex justify-between gap-4"><span className="text-slate-400">Fecha del Evento:</span><span className="text-slate-950 font-extrabold text-right">{fechaDoc}</span></div>
                                                <div className="flex justify-between gap-4"><span className="text-slate-400">Horario Reservado:</span><span className="text-slate-950 font-extrabold text-right">{horaStr}</span></div>
                                                <div className="flex justify-between gap-4"><span className="text-slate-400">Zona / Ciudad:</span><span className="text-slate-950 font-extrabold truncate w-32 text-right">{ubi}</span></div>
                                                {dir && <div className="text-[11px] text-slate-500 italic mt-1 line-clamp-2 text-right">{dir}</div>}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {isContratoProv ? (
                            <div className="mb-6 flex-1 relative z-10 bg-slate-50/50 p-6 border border-slate-100 rounded-2xl">
                                <h4 className="font-black text-slate-900 uppercase tracking-widest mb-4 text-[11px] flex items-center gap-2"><Handshake size={16} className="text-[#2563FF]"/> Acuerdos y Condiciones de Subcontratación</h4>
                                <div className="space-y-4 text-[11px] text-slate-700 leading-relaxed text-justify">
                                    <p>1. <strong>OBJETO DEL CONTRATO:</strong> DIVERTY EVENTOS contrata los servicios de <strong>{cli}</strong> en calidad de proveedor independiente para prestar servicios de {printData.especialidad || 'entretenimiento/logística'} en los eventos que le sean formalmente asignados.</p>
                                    <p>2. <strong>INDEPENDENCIA:</strong> El PROVEEDOR actúa de manera independiente y no existe relación laboral, de subordinación, ni exclusividad entre las partes. El proveedor utilizará sus propios equipos y personal si aplica.</p>
                                    <p>3. <strong>PAGOS Y HONORARIOS:</strong> Los pagos se realizarán de acuerdo a la tarifa acordada previamente para cada evento específico. DIVERTY EVENTOS se compromete a cancelar el monto acordado según las políticas de la empresa (transferencia o efectivo) tras la culminación satisfactoria del servicio.</p>
                                    <p>4. <strong>PUNTUALIDAD Y CALIDAD:</strong> El PROVEEDOR se compromete a llegar con al menos 30 minutos de anticipación a la hora estipulada de cada evento y mantener el estándar de calidad, respeto y animación que caracteriza a DIVERTY EVENTOS ante el cliente final.</p>
                                    <p>5. <strong>CONFIDENCIALIDAD:</strong> Queda estrictamente prohibido que el PROVEEDOR comparta sus contactos directos (tarjetas, redes sociales personales) con el cliente final durante un evento de DIVERTY EVENTOS, para proteger la relación comercial de la empresa.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-6 flex-1 relative z-10">
                                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                                    <table className="w-full text-left text-[12px]">
                                        <thead className="bg-gradient-to-r from-slate-50 to-[#2563FF]/5 border-b border-slate-100 text-slate-700">
                                            <tr>
                                                <th className="py-4 px-5 font-black uppercase text-center tracking-widest w-1/3 text-[9px] text-slate-500">Paquete / Servicio</th>
                                                <th className="py-4 px-5 font-black uppercase tracking-widest text-left border-l border-slate-100 w-1/2 text-[9px] text-slate-500">Especificaciones y Actividades</th>
                                                <th className="py-4 px-5 font-black uppercase text-center tracking-widest border-l border-slate-100 w-1/6 text-[9px] text-slate-500">Precio Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {sA.map((s, i) => { 
                                                const cant = Number(s.cantidad) || 1, precioUnitario = utils.safeNum(s.precio) / cant; 
                                                return (
                                                    <tr key={i} className="avoid-break hover:bg-slate-50/50 transition-colors">
                                                        <td className="py-5 px-5 text-center border-r border-slate-100 align-top">
                                                            <div className="flex justify-center mb-2.5 text-[#2563FF]"><Star size={24} className="fill-[#2563FF]/10" strokeWidth={1.8}/></div>
                                                            <p className="font-extrabold text-slate-900 text-[13px] leading-tight">{String(s.nombre)}</p>
                                                            {cant > 0 && (<p className="font-bold text-[#7C3AED] text-[10px] mt-2 bg-[#7C3AED]/8 py-1 rounded-md inline-block px-2.5">{cant} {cant === 1 ? 'Hora' : 'Horas'}</p>)}
                                                        </td>
                                                        <td className="py-5 px-6 border-r border-slate-100 align-top">
                                                            <div className="text-slate-600 text-[11px] leading-relaxed space-y-2">
                                                                {String(s.descripcion || 'Diversión premium para tu fiesta.').split('\n').map((line, j) => { 
                                                                    const tLine = String(line).trim(); 
                                                                    if(tLine.startsWith('•') || tLine.startsWith('-')) { 
                                                                        return (<div key={j} className="flex items-start gap-2 font-semibold"><CheckCircle2 size={13} className="text-[#2563FF] shrink-0 mt-[2px]"/> <span className="text-slate-700">{tLine.replace(/^[•-]\s*/, '')}</span></div>); 
                                                                    } 
                                                                    return <div key={j} className="mb-1.5 font-medium">{tLine}</div>; 
                                                                })}
                                                            </div>
                                                        </td>
                                                        <td className="py-5 px-5 text-center align-middle">
                                                            <p className="font-black text-slate-900 text-[15px]">B/. {utils.safeNum(s.precio).toFixed(2)}</p>
                                                            <p className="text-[10px] text-slate-400 mt-1 font-semibold">{cant} x B/. {precioUnitario.toFixed(2)}</p>
                                                        </td>
                                                    </tr>
                                                ); 
                                            })}
                                            {trn > 0 && (
                                                <tr className="avoid-break bg-[#2563FF]/3">
                                                    <td className="py-4 px-5 text-center border-r border-slate-100 align-middle">
                                                        <div className="flex justify-center mb-1 text-[#2563FF]"><MapIcon size={22} strokeWidth={1.8}/></div>
                                                        <p className="font-extrabold text-slate-900 text-[13px]">Viáticos de Ruta</p>
                                                    </td>
                                                    <td className="py-4 px-6 border-r border-slate-100 align-middle text-[11px] text-slate-600 font-bold">
                                                        <div className="flex items-center gap-2"><CheckCircle2 size={13} className="text-[#2563FF] shrink-0"/> <span>Desplazamiento operativo y cobertura logística a zona: {ubi}</span></div>
                                                    </td>
                                                    <td className="py-4 px-5 text-center align-middle"><p className="font-black text-slate-900 text-[15px]">B/. {trn.toFixed(2)}</p></td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {!isContratoProv && (
                            <div className="px-0 mt-2 flex justify-between gap-6 avoid-break relative z-10">
                                <div className="w-[53%]">
                                    <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100 shadow-sm h-full flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-3 text-slate-800 border-b border-slate-200/60 pb-2"><Info size={16} className="text-[#2563FF]"/><h3 className="font-black uppercase tracking-widest text-[10px]">Políticas y Condiciones</h3></div>
                                            <div className="text-[10px] font-bold text-slate-500 leading-relaxed space-y-1.5"><p className="flex items-start gap-1"><span className="text-[#2563FF]">•</span> Para garantizar la fecha del evento, se requiere confirmación formal mediante abono.</p><p className="flex items-start gap-1"><span className="text-[#2563FF]">•</span> El abono inicial no es reembolsable por cancelación ajena a Diverty.</p><p className="flex items-start gap-1"><span className="text-[#2563FF]">•</span> El saldo restante debe ser cancelado al culminar el show.</p></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-[43%] flex flex-col items-end">
                                    <div className="w-full border border-slate-200/60 rounded-2xl overflow-hidden bg-slate-50 shadow-sm flex flex-col">
                                        <div className="flex justify-between items-center py-3 px-5 border-b border-slate-200/60 text-[12px]"><span className="font-extrabold text-slate-500">Inversión Show:</span><span className="font-black text-slate-900">B/. {tot.toFixed(2)}</span></div>
                                        {!isC && abo > 0 && (<div className="flex justify-between items-center py-3 px-5 border-b border-slate-200/60 text-[12px] bg-emerald-500/5"><span className="font-extrabold text-emerald-600">Abono Confirmado:</span><span className="font-black text-emerald-600">- B/. {abo.toFixed(2)}</span></div>)}
                                        <div className="bg-gradient-to-r from-[#2563FF] to-[#7C3AED] text-white py-4.5 px-5 text-center"><span className="block text-[10px] uppercase tracking-[0.2em] font-extrabold mb-1 opacity-90">{isC ? 'TOTAL PROPUESTO:' : 'SALDO PENDIENTE:'}</span><span className="block text-3xl font-black leading-none">B/. {isC ? tot.toFixed(2) : (tot - abo).toFixed(2)}</span></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {(!isC || isContratoProv) && (
                            <div className="mt-6 pb-2 avoid-break relative z-10">
                                {(isContrato || isContratoProv) ? (
                                    <div className="bg-slate-50/70 rounded-2xl border border-slate-100 p-5 flex flex-col gap-5 shadow-sm">
                                        {!isContratoProv && (<div className="text-[10px] text-slate-500 leading-relaxed border-b border-slate-200/60 pb-3"><h4 className="font-black text-slate-900 uppercase tracking-widest mb-1.5 text-[9px] flex items-center gap-1.5"><FileSignature size={13} className="text-[#7C3AED]"/> Compromiso y Mutuo Acuerdo</h4><p className="font-bold">Las partes aceptan y se comprometen a respetar todas las cláusulas, tiempos de montaje y logística establecidos en el presente acuerdo para dar inicio al evento programado.</p></div>)}
                                        <div className="flex justify-around items-end pt-4 pb-2">
                                            <div className="w-[42%] text-center"><div className="border-b border-slate-300 w-full mb-2 h-10 flex items-end justify-center"><span className="text-[13px] font-semibold text-slate-400 italic">DIVERTY EVENTOS</span></div><p className="font-black text-slate-800 text-[10px] uppercase truncate">{isContratoProv ? 'DIVERTY EVENTOS PANAMÁ' : appSettings.empresa.nombreTitular}</p><p className="text-slate-400 text-[9px] font-extrabold uppercase tracking-widest">{isContratoProv ? 'El Contratante' : 'Diverty Eventos'}</p></div>
                                            <div className="w-[42%] text-center"><div className="border-b border-slate-300 w-full mb-2 h-10"></div><p className="font-black text-slate-800 text-[10px] uppercase truncate">{cli}</p><p className="text-slate-400 text-[9px] font-extrabold uppercase tracking-widest">{isContratoProv ? 'Firma del Proveedor' : 'Firma del Cliente'}</p></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50/70 rounded-2xl border border-slate-100 p-5 flex justify-between items-center text-[11px] shadow-sm">
                                        <div className="flex gap-4 border-r border-slate-200/60 pr-6 w-[55%]">
                                            <div className="text-[#2563FF] shrink-0 mt-1"><Briefcase size={20} strokeWidth={1.8}/></div>
                                            <div className="leading-snug space-y-1 font-bold text-slate-600">
                                                <h4 className="font-black text-slate-900 uppercase tracking-widest mb-2 text-[9px]">Instrucciones de Transferencia</h4>
                                                <p className="text-slate-950 font-extrabold flex justify-between">Banco: <span className="text-slate-700 font-semibold">{appSettings.empresa.banco}</span></p>
                                                <p className="text-slate-950 font-extrabold flex justify-between">Tipo: <span className="text-slate-700 font-semibold">{appSettings.empresa.tipoCuenta}</span></p>
                                                <p className="text-slate-950 font-extrabold flex justify-between">Cuenta: <span className="text-[#2563FF] font-black">{appSettings.empresa.numeroCuenta}</span></p>
                                                <p className="text-slate-950 font-extrabold flex justify-between">Titular: <span className="text-slate-700 font-semibold truncate w-32 uppercase">{appSettings.empresa.nombreTitular}</span></p>
                                                <p className="text-slate-950 font-extrabold flex justify-between">Yappy/Cel: <span className="text-[#7C3AED] font-black">{appSettings.empresa.telefono}</span></p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center justify-center pl-6 w-[40%]">
                                            <div className="text-[#2563FF] flex items-center gap-1.5 mb-2 font-black text-[12px] uppercase tracking-widest"><ShieldCheck size={18} /> ¡Garantía Diverty!</div>
                                            <p className="text-[10px] text-slate-400 font-bold text-center leading-normal mb-3">Envía el comprobante para procesar y agendar.</p>
                                            <h3 className="text-xl text-[#2563FF] font-black italic tracking-wider">Diverty Eventos</h3>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
}

// --- MODALES Y TARJETAS ---
function ClientEditModal({ isOpen, oldName, onClose, onSave }) {
    const [newName, setNewName] = useState(''); useEffect(() => { if(isOpen) setNewName(oldName); }, [isOpen, oldName]); if (!isOpen) return null;
    return (<div className="fixed inset-0 z-[100000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"><div className={`${UI.modal} max-w-sm w-full p-8`}><div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4"><UserPen size={24} className="text-[#2563FF]" /><h3 className="text-xl font-black text-slate-900">Editar Cliente</h3></div><p className="text-xs text-slate-500 mb-5 leading-relaxed font-medium">Al cambiar este nombre, todos los eventos asociados se actualizarán y se unificarán si el nuevo nombre ya existe en el sistema.</p><div className="space-y-4 mb-8"><div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nombre Actual</label><input type="text" value={oldName} disabled className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-500 font-semibold text-sm cursor-not-allowed" /></div><div><label className="block text-[10px] font-bold text-[#2563FF] uppercase tracking-widest mb-1.5">Nuevo Nombre</label><input type="text" value={newName} onChange={e => setNewName(e.target.value)} autoFocus className="w-full bg-white border border-[#2563FF]/50 rounded-xl p-3 text-slate-900 font-bold text-base outline-none focus:ring-4 ring-[#2563FF]/10 shadow-sm" /></div></div><div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors">Cancelar</button><button type="button" onClick={() => onSave(oldName, newName)} className="flex-1 py-3 bg-gradient-to-r from-[#2563FF] to-[#7C3AED] text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-md transition-transform active:scale-95">Guardar</button></div></div></div>);
}

function ProveedorModal({ isOpen, data, onClose, onSave }) {
    const [form, setForm] = useState({ nombre: '', telefono: '', especialidad: '', costoBase: '' }); useEffect(() => { if (isOpen) setForm(data || { nombre: '', telefono: '', especialidad: '', costoBase: '' }); }, [isOpen, data]); if (!isOpen) return null; const handleSubmit = (e) => { e.preventDefault(); onSave(form); };
    return (<div className="fixed inset-0 z-[100000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"><div className={`${UI.modal} max-w-md w-full p-8`}><div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4"><div className="flex items-center gap-3">{data ? <Edit size={24} className="text-[#2563FF]" /> : <Plus size={24} className="text-[#2563FF]" />}<h3 className="text-xl font-black text-slate-900">{data ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3></div><button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 bg-slate-100 rounded-lg"><X size={18}/></button></div><form onSubmit={handleSubmit} className="space-y-4"><Field label="Nombre Comercial / Payasito *" required value={form.nombre} onChange={e=>setForm({...form, nombre: e.target.value})} placeholder="Ej. Sonrisas Party" /><Field label="Número de WhatsApp *" required value={form.telefono} onChange={e=>setForm({...form, telefono: e.target.value})} placeholder="Ej. 6000-0000" /><Field label="Especialidad / Servicio" required value={form.especialidad} onChange={e=>setForm({...form, especialidad: e.target.value})} placeholder="Ej. Pinta Caritas, Transporte" /><Field label="Costo del Servicio ($)" type="number" value={form.costoBase} onChange={e=>setForm({...form, costoBase: e.target.value})} placeholder="0.00" /><div className="pt-4"><AppButton type="submit" className="w-full text-xs uppercase tracking-widest">{data ? 'Guardar Cambios' : 'Registrar Proveedor'}</AppButton></div></form></div></div>);
}

function ProveedorCardItem({ p, idx, isExpanded, onToggleExpand, utils, onDelete, onEdit, onWhatsApp, onContrato, eventosActivos }) {
    const misEventos = useMemo(() => { return eventosActivos.filter(ev => ev.subcontratos && ev.subcontratos.some(sc => sc.proveedorId === p.id)).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))); }, [eventosActivos, p.id]); const pendientes = misEventos.filter(ev => utils.normalizeText(ev.estado) !== 'completado' && utils.normalizeText(ev.estado) !== 'cancelado'); const realizados = misEventos.filter(ev => utils.normalizeText(ev.estado) === 'completado'); const phoneClean = String(p.telefono).replace(/\D/g, '');
    return (<div className={`${UI.card} flex flex-col relative overflow-hidden transition-all duration-500 hover:-translate-y-2 animate-fadeInUp`} style={{animationFillMode:'both',animationDelay:`${idx*20}ms`}}><div onClick={(e) => { if(e){e.preventDefault();e.stopPropagation();} utils.triggerHaptic('light'); onToggleExpand(p.id); }} className="p-6 cursor-pointer flex flex-col gap-4 relative z-10 bg-transparent transition-colors duration-200"><div className="flex justify-between items-start"><div className="flex gap-3"><div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-[#2563FF] shadow-sm shrink-0"><Briefcase size={20}/></div><div className="flex-1 min-w-0"><h4 className="font-extrabold text-lg text-slate-900 tracking-tight capitalize leading-tight truncate">{p.nombre}</h4><span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 truncate block mt-0.5">{p.especialidad}</span></div></div><button type="button" onClick={(e) => { e.stopPropagation(); onDelete(p.id); }} className="text-slate-300 hover:text-rose-500 transition-colors p-1"><Trash2 size={18}/></button></div><div className="flex justify-between items-center bg-slate-50/80 rounded-xl p-4 border border-slate-100"><div className="flex items-center gap-3"><Smartphone size={16} className="text-emerald-500"/><span className="font-bold text-slate-700 text-sm">{p.telefono || 'Sin teléfono'}</span></div>{p.costoBase && <span className="text-xs font-black text-slate-900 bg-emerald-100/50 px-2.5 py-1 rounded-lg border border-emerald-200/50">${p.costoBase}</span>}</div><div className="flex gap-2.5 mt-2"><ActionBtn icon={MessageCircle} label="WhatsApp" color="emerald" onClick={(e) => { e.stopPropagation(); onWhatsApp(phoneClean, `¡Hola ${p.nombre}!`); }} /><ActionBtn icon={Handshake} label="Contrato" color="blue" onClick={(e) => { e.stopPropagation(); onContrato(p); }} /><ActionBtn icon={PenLine} label="Editar" color="white" onClick={(e) => { e.stopPropagation(); onEdit(p); }} /></div></div>{isExpanded && (<div className="relative z-10 px-5 pb-5 animate-fadeIn border-t border-slate-100/50 mt-1 pt-5 bg-slate-50/50 rounded-b-[24px]"><h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2563FF] mb-4 flex items-center gap-2"><CalendarDays size={14}/> Eventos Asignados</h5><div className="space-y-5"><div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pendientes ({pendientes.length})</p>{pendientes.length === 0 ? (<p className="text-[11px] text-slate-400 italic">No hay eventos pendientes.</p>) : (<div className="space-y-2">{pendientes.map(ev => { const subC = ev.subcontratos?.find(sc => sc.proveedorId === p.id); return (<div key={ev.id} className="bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-sm flex flex-col gap-1.5 transition-all hover:border-blue-200"><div className="flex justify-between items-start"><span className="font-extrabold text-slate-900 text-[13px] capitalize truncate max-w-[160px]">{ev.cliente}</span>{subC?.costo && <span className="text-rose-500 font-bold text-[11px] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">${subC.costo}</span>}</div><div className="flex gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider"><span className="flex items-center gap-1"><Calendar size={11} className="text-[#2563FF]"/> {ev.fecha ? ev.fecha.split('-').reverse().join('/') : ''}</span><span className="flex items-center gap-1"><Clock size={11} className="text-[#2563FF]"/> {utils.formatTime12h(ev.hora)}</span></div><div className="text-[10px] font-semibold text-slate-400 truncate flex items-center gap-1 mt-0.5"><MapPin size={10}/> {ev.ubicacion}</div></div>); })}</div>)}</div><div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Realizados ({realizados.length})</p>{realizados.length === 0 ? (<p className="text-[11px] text-slate-400 italic">No hay eventos completados.</p>) : (<div className="space-y-2 opacity-75">{realizados.map(ev => { const subC = ev.subcontratos?.find(sc => sc.proveedorId === p.id); return (<div key={ev.id} className="bg-slate-100/50 p-3 rounded-xl border border-slate-200/50 flex flex-col gap-1.5"><div className="flex justify-between items-start"><span className="font-bold text-slate-700 text-[12px] capitalize truncate">{ev.cliente}</span>{subC?.costo && <span className="text-slate-500 font-bold text-[10px]">${subC.costo}</span>}</div><div className="flex gap-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider"><span>{ev.fecha ? ev.fecha.split('-').reverse().join('/') : ''}</span><span>{utils.formatTime12h(ev.hora)}</span></div></div>); })}</div>)}</div></div></div>)}</div>);
}

function ClientCardItem({ c, idx, isExpanded, onToggleExpand, utils, openModal, onDeleteClient, onEditClient }) {
    const phoneClean=String(c.telefono).replace(/\D/g,''); const msgPromo=`¡Hola ${c.nombre}! 😊 Te saludamos de Diverty Eventos. Tenemos nuevas promociones exclusivas en nuestros paquetes infantiles. ¿Te gustaría conocerlas? 🎉`, msgRecordatorio=`¡Hola ${c.nombre}! 🥳 Te recordamos que en Diverty Eventos estamos listos para hacer de tu próxima celebración un día inolvidable. ¡Escríbenos cuando lo necesites! 🎈`; const grad=c.isVIP?'from-amber-400 via-orange-500 to-rose-500':'from-[#2563FF] to-[#7C3AED]';
    return(<div className={`${UI.card} flex flex-col relative overflow-hidden transition-all duration-500 hover:-translate-y-2 animate-fadeInUp`} style={{animationFillMode:'both',animationDelay:`${idx*20}ms`}}><div onClick={(e)=>{if(e){e.preventDefault();e.stopPropagation();}utils.triggerHaptic('light');onToggleExpand(c.nombre);}} className="p-5 sm:p-6 cursor-pointer flex items-center justify-between gap-4 relative z-10 bg-transparent transition-colors duration-200"><div className="flex items-center gap-4 flex-1 min-w-0"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl text-white shrink-0 shadow-md bg-gradient-to-tr ${grad}`}>{c.isVIP ? <Award size={20} className="drop-shadow-md" /> : String(c.nombre).charAt(0).toUpperCase()}</div><div className="flex-1 min-w-0"><h4 className="font-bold text-[17px] text-slate-900 capitalize truncate tracking-tight mb-1">{String(c.nombre)}</h4><p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Smartphone size={14} className="text-slate-400"/> {String(c.telefono)||'Sin número'}</p></div></div><div className="text-right shrink-0"><p className="text-xl font-bold text-emerald-500 leading-none tracking-tight">${c.totalGastado.toFixed(0)}</p><div className="flex justify-end gap-1.5 mt-2.5">{c.isVIP && <span className="w-2 h-2 rounded-full bg-amber-400" title="VIP"></span>}{c.isFrecuente && <span className="w-2 h-2 rounded-full bg-indigo-400" title="Frecuente"></span>}{c.isNuevo && <span className="w-2 h-2 rounded-full bg-emerald-400" title="Nuevo"></span>}{c.needsContact && <span className="w-2 h-2 rounded-full bg-rose-400" title="Contactar"></span>}</div></div></div>{isExpanded && (<div className="relative z-10 px-5 pb-5 animate-fadeIn border-t border-slate-100/50 mt-1 pt-4 bg-slate-50/50 rounded-b-[24px]"><div className="flex justify-between items-center bg-white/80 p-4 rounded-[16px] mb-5 border border-slate-200/50 shadow-sm"><div className="text-center flex-1 border-r border-slate-100"><p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1.5">Eventos</p><p className="font-bold text-base text-slate-800">{c.eventos}</p></div><div className="text-center flex-1 border-r border-slate-100"><p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1.5">Último</p><p className="font-bold text-base text-slate-800">{c.ultimoEventoFecha?String(c.ultimoEventoFecha).split('-').reverse().join('/'):'N/A'}</p></div><div className="text-center flex-1"><p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1.5">Estado</p><p className="font-bold text-base text-slate-800 capitalize flex justify-center items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${String(c.ultimoEstado).toLowerCase()==='completado'?'bg-emerald-400':'bg-amber-400'}`}></span>{String(c.ultimoEstado).substring(0,4)}.</p></div></div><div className="grid grid-cols-2 gap-3 mb-4"><ActionBtn icon={MessageCircle} label="Contactar" color="emerald" onClick={(e)=>{e.stopPropagation();utils.openWhatsAppBusiness(phoneClean, `¡Hola ${c.nombre}!`);}} /><ActionBtn icon={Sparkles} label="Promo" color="white" onClick={(e)=>{e.stopPropagation();utils.openWhatsAppBusiness(phoneClean,msgPromo);}} /><ActionBtn icon={BellRing} label="Recordar" color="white" onClick={(e)=>{e.stopPropagation();utils.openWhatsAppBusiness(phoneClean,msgRecordatorio);}} /><ActionBtn icon={UserPen} label="Editar" color="white" onClick={(e)=>{e.stopPropagation(); onEditClient(c.nombre);}} /></div><div className="flex gap-3"><AppButton variant="primary" icon={Plus} onClick={(e)=>{e.stopPropagation();openModal()}} className="flex-1 text-[13px] uppercase tracking-wider py-3.5 shadow-md">Reservar</AppButton><button type="button" onClick={(e)=>{e.stopPropagation();onDeleteClient(c.nombre,c.eventos)}} className="px-5 bg-rose-50 text-rose-500 rounded-[16px] hover:bg-rose-100 transition-colors border border-rose-100"><Trash2 size={20} /></button></div></div>)}</div>);
}

function TransactionItem({ ev, isExpanded, onToggleExpand, utils }) {
    const tot=utils.safeNum(ev.total),gas=utils.safeNum(ev.gastos),neta=tot-gas;
    return(<div className="group bg-white/80 backdrop-blur-sm rounded-[20px] mb-2 border border-slate-200/80 shadow-sm hover:border-slate-300 overflow-hidden transition-all"><button type="button" onClick={(e)=>{if(e){e.preventDefault();e.stopPropagation();}onToggleExpand(ev.id);}} className="w-full flex justify-between items-center p-5 bg-transparent hover:bg-slate-50/80 transition-colors duration-200 text-left active:scale-[0.99] text-slate-900"><div className="flex flex-col min-w-0 flex-1 pr-4"><p className="font-bold capitalize text-[16px] text-slate-900 truncate tracking-tight">{String(ev.cliente||'')}</p><p className="text-xs font-medium text-slate-500 mt-1.5">{ev.fecha?String(ev.fecha).split('-').reverse().join('/'):''} • {String(ev.tipoEvento||'').substring(0,15)}</p></div><div className="text-right shrink-0 flex items-center gap-4"><div className="flex flex-col items-end"><span className="font-bold text-emerald-500 text-lg leading-none block mb-2 tracking-tight">+${neta.toFixed(2)}</span>{gas>0&&<span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 leading-none px-2 py-1 bg-rose-50 rounded-lg border border-rose-100">Gastos: -${gas}</span>}</div><ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isExpanded?'rotate-180':''}`}/></div></button>{isExpanded&&(<div className="p-5 bg-slate-50/50 border-t border-slate-100/80 animate-fadeIn"><div className="flex justify-between items-center mb-3"><span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Ingreso Bruto</span><span className="font-bold text-[15px] text-slate-900">${tot.toFixed(2)}</span></div><div className="flex justify-between items-center mb-3"><span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Gastos Operativos</span><span className="font-bold text-[15px] text-rose-500">-${gas.toFixed(2)}</span></div>{ev.detalleGastos&&(<div className="mt-4 pt-4 border-t border-slate-200/60"><span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-2">Desglose:</span><p className="text-[13px] font-medium text-slate-600 italic leading-relaxed whitespace-pre-wrap">{String(ev.detalleGastos)}</p></div>)}</div>)}</div>);
}

function EventCardItem({ ev, idx, todayTime, onWhatsApp, onViewDoc, onEdit, onDelete, onDuplicate, onMapClick, empresa, utils, onUpdateEstado, onConvertir }) {
    const [swipeX, setSwipeX] = useState(0), [isDragging, setIsDragging] = useState(false), [isExpanded, setIsExpanded] = useState(false); const startX = useRef(0);
    const handleTouchStart = useCallback((e) => { startX.current = e.touches[0].clientX; setIsDragging(true); }, []); const handleTouchMove = useCallback((e) => { if (!isDragging) return; const diffX = e.touches[0].clientX - startX.current; setSwipeX(diffX > 0 ? Math.min(diffX, 120) : 0); }, [isDragging]); const handleTouchEnd = useCallback(() => { setIsDragging(false); if (swipeX > 80) { utils.triggerHaptic('success'); onDelete(ev.id); } setSwipeX(0); }, [swipeX, ev.id, onDelete, utils]);
    const estNormalized=utils.normalizeText(ev.estado),isCotizacion=estNormalized.includes('cotizaci')||estNormalized.includes('cot.'); const tot=utils.safeNum(ev.total),abo=utils.safeNum(ev.abono),restante=Math.max(0,tot-abo);
    let sideColor="bg-slate-200",dotColor="bg-slate-300",waType='agradecimiento'; if(estNormalized==='completado'){sideColor='bg-emerald-500';dotColor='bg-emerald-400';}else if(estNormalized.includes('aprobada')){sideColor='bg-teal-500';dotColor='bg-teal-400';}else if(estNormalized.includes('rechazada')){sideColor='bg-slate-400';dotColor='bg-slate-300';}else if(isCotizacion){sideColor='bg-amber-400';dotColor='bg-amber-400';waType='cotizacion';}else if(estNormalized==='confirmado'){sideColor='bg-[#2563FF]';dotColor='bg-[#2563FF]';waType='recordatorio';}else if(estNormalized==='pendiente'){sideColor='bg-amber-500';dotColor='bg-amber-500';waType='cobro';}else if(estNormalized==='cancelado'){sideColor='bg-rose-500';dotColor='bg-rose-500';}
    let diff=null,dateBadgeContent=null; if(ev.fecha){const[y,m,d]=String(ev.fecha).split('-');if(y&&m&&d){diff=Math.ceil((new Date(parseInt(y,10),parseInt(m,10)-1,parseInt(d,10)).getTime()-todayTime)/(1000*60*60*24));}}
    if(diff===0&&!isCotizacion)dateBadgeContent=<Badge color="rose"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm"></div> HOY</Badge>;else if(diff===1&&!isCotizacion)dateBadgeContent=<Badge color="amber">MAÑANA</Badge>;else if(isCotizacion){ if(estNormalized.includes('aprobada'))dateBadgeContent=<Badge color="teal">COT. Aprobada</Badge>; else if(estNormalized.includes('rechazada'))dateBadgeContent=<Badge color="gray">COT. Rechazada</Badge>; else dateBadgeContent=<Badge color="amberSolid"><FileText size={12}/> Cotización</Badge>; }
    return (<div className={`relative w-full ${UI.card} overflow-hidden`} style={{ animationFillMode: 'both', animationDelay: `${idx * 40}ms` }}><div className={`absolute inset-0 bg-gradient-to-r from-rose-500 to-rose-400 flex items-center pl-8 transition-opacity duration-200 ${swipeX > 20 ? 'opacity-100 z-0' : 'opacity-0 -z-10'}`}><Trash2 size={24} className="text-white" /><span className="text-white font-bold ml-3 text-sm uppercase tracking-wider">Eliminar</span></div><div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} className="relative p-5 sm:p-6 transition-transform duration-200 ease-out z-10 bg-white/95 cursor-pointer text-slate-900" style={{ transform: `translateX(${swipeX}px)`, transition: isDragging ? 'none' : 'transform 0.2s ease-out' }} onClick={(e) => { e.stopPropagation(); utils.triggerHaptic('light'); setIsExpanded(p => !p); }}><div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-r-full ${sideColor} z-20`}></div><div className="pl-3 relative z-10"><div className="flex justify-between items-center gap-4"><div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap"><div className="flex items-center gap-2 min-w-0"><div className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`}></div><h3 className="text-lg font-bold text-slate-900 truncate tracking-tight">{String(ev.cliente)}</h3></div><div className="flex items-center gap-2 shrink-0 mt-1 sm:mt-0">{dateBadgeContent}{ev.hora && (<Badge color="gray"><Clock size={12} strokeWidth={2.5}/> {utils.formatTime12h(ev.hora)}</Badge>)}</div></div>{!isExpanded && (<div className="flex items-center gap-4 shrink-0"><span className="text-slate-900 font-bold text-lg tracking-tight">${tot.toFixed(2)}</span>{isCotizacion ? null : (restante > 0 ? (<div className="bg-rose-50 text-rose-600 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-widest border border-rose-200 shadow-sm">Debe ${restante.toFixed(0)}</div>) : (<div className="flex items-center gap-1.5 text-emerald-500"><CheckCircle2 size={16} strokeWidth={2.5}/><span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Pagado</span></div>))}</div>)}</div><div className={`grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-6' : 'grid-rows-[0fr] opacity-0 mt-0'}`}><div className="overflow-hidden"><div className="flex flex-col gap-4 mb-6 pt-2 text-slate-600"><div className="flex items-center gap-4"><Sparkles size={18} className="text-[#2563FF]/70 shrink-0" strokeWidth={2} /><span className="text-sm font-medium">{String(ev.servicio || 'Sin paquete asignado')}</span></div><div className="flex items-center gap-4"><Calendar size={18} className="text-[#2563FF]/70 shrink-0" strokeWidth={2} /><span className="text-sm font-medium">{ev.fecha ? String(ev.fecha).split('-').reverse().join('/') : 'Sin fecha'} • {ev.hora ? utils.formatTime12h(ev.hora) : 'Sin hora'}</span></div><div onClick={(e) => { e.stopPropagation(); onMapClick(ev.direccion, ev.ubicacion); }} className="flex justify-between items-center gap-4 cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-xl transition-colors active:scale-[0.98] border border-transparent hover:border-slate-100" title="Abrir en Google Maps"><div className="flex items-center gap-4 min-w-0"><MapPin size={18} className="text-[#2563FF]/70 shrink-0" strokeWidth={2} /><span className="text-sm font-medium truncate">{String(ev.ubicacion)} {ev.direccion ? `- ${String(ev.direccion)}` : ''}</span></div><div className="bg-slate-100 p-2 rounded-lg border border-slate-200"><MapIcon size={14} className="text-[#2563FF]" /></div></div><div className="flex items-center gap-4"><Smartphone size={18} className="text-[#2563FF]/70 shrink-0" strokeWidth={2} /><span className="text-sm font-medium">{String(ev.telefono || 'Sin teléfono')}</span></div></div><div className="bg-slate-50/80 rounded-2xl p-5 sm:p-6 border border-slate-200/50 mb-6 relative overflow-hidden"><div className="flex justify-between items-end mb-5"><div className="flex flex-col"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Total</span><span className="text-2xl font-black text-slate-900 tracking-tight leading-none">${tot.toFixed(2)}</span></div><div className="flex flex-col items-end"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Pendiente</span><span className={`text-2xl font-black tracking-tight leading-none ${restante > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>${restante.toFixed(2)}</span></div></div><div className="w-full bg-slate-200 rounded-full h-2 mb-3 overflow-hidden shadow-inner"><AnimatedProgress value={tot > 0 ? Math.min((abo / tot) * 100, 100) : 0} /></div><div className="flex justify-between items-center"><p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-widest">Recibido: <span className="text-slate-800">${abo.toFixed(2)}</span></p><p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{tot > 0 ? Math.round((abo/tot)*100) : 0}% pagado</p></div></div><div className="flex flex-col sm:flex-row gap-3"><AppButton onClick={(e) => { e.stopPropagation(); onWhatsApp(ev, waType, empresa); }} className="w-full sm:flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 border-emerald-500 shadow-md text-white" icon={MessageCircle}>Contactar</AppButton>{isCotizacion ? ( <div className="flex gap-3 w-full sm:flex-1"><AppButton onClick={(e) => { e.stopPropagation(); onViewDoc(ev, 'cotizacion'); }} variant="default" className="w-full" icon={FileText}>Ver PDF</AppButton></div> ) : ( <div className="flex gap-3 w-full sm:flex-1"><AppButton onClick={(e) => { e.stopPropagation(); onViewDoc(ev, 'factura'); }} variant="default" className="flex-1" icon={Receipt}>Factura</AppButton><AppButton onClick={(e) => { e.stopPropagation(); onViewDoc(ev, 'contrato'); }} variant="default" className="flex-1" icon={FileSignature}>Contrato</AppButton></div> )}</div>{isCotizacion && (<div className="flex gap-3 mt-4 pt-4 border-t border-slate-100/80">{estNormalized === 'cotizacion' && (<><AppButton onClick={(e) => { e.stopPropagation(); onUpdateEstado(ev.id, 'Cot. Aprobada'); }} variant="success" className="flex-1 text-[11px] py-3 bg-emerald-500 text-white">Aprobar</AppButton><AppButton onClick={(e) => { e.stopPropagation(); onUpdateEstado(ev.id, 'Cot. Rechazada'); }} variant="default" className="flex-1 text-[11px] py-3 text-slate-500 border-slate-200">Rechazar</AppButton></>)}{estNormalized.includes('aprobada') && (<AppButton onClick={(e) => { e.stopPropagation(); onConvertir(ev); }} variant="primary" className="w-full text-xs py-3.5 shadow-md">Convertir en Reserva</AppButton>)}</div>)}<div className="flex gap-3 mt-4 pt-4 border-t border-slate-100/80"><ActionBtn icon={Edit} label="Editar" onClick={(e) => { e.stopPropagation(); onEdit(ev, isCotizacion); }} /><ActionBtn icon={Copy} label="Duplicar" color="blue" onClick={(e) => { e.stopPropagation(); onDuplicate(ev); }} /><ActionBtn icon={Trash2} label="Eliminar" color="rose" onClick={(e) => { e.stopPropagation(); onDelete(ev.id); }} /></div></div></div></div></div></div>);
}

function EventFormModal({ isOpen, initialData, isCotizacionMode, onClose, onSave, PAQUETES, onAddCustomService, showAlert, clientesRegistrados, listadoProveedores }) {
    const [formData, setFormData] = useState(initialData || { ...defaultFormData, fecha: utils.getLocalYYYYMMDD(new Date()) });
    const [searchTermService, setSearchTermService] = useState(''); const [showDropdown, setShowDropdown] = useState(false); const [isCustomOpen, setIsCustomOpen] = useState(false); const [customData, setCustomData] = useState({ nombre: '', precio: '' });
    const [showClientDropdown, setShowClientDropdown] = useState(false); const nameInputRef = useRef(null); const [selectedProv, setSelectedProv] = useState(''); const [provCosto, setProvCosto] = useState('');

    useEffect(()=>{ if(isOpen&&initialData){ setFormData(initialData); setSearchTermService(''); setShowDropdown(false); setIsCustomOpen(false); setShowClientDropdown(false); setSelectedProv(''); setProvCosto(''); } },[isOpen,initialData]);
    useEffect(()=>{ if(isOpen && nameInputRef.current && (!initialData || !initialData.id) && window.innerWidth > 768){ const t=setTimeout(()=>nameInputRef.current.focus(), 400); return ()=>clearTimeout(t); } },[isOpen,initialData]);
    useEffect(()=>{ if(isOpen&&!isCotizacionMode&&(!initialData||!initialData.id)){const timer=setTimeout(()=>{utils.setSafeLocal('diverty_form_draft',JSON.stringify(formData));},800);return()=>clearTimeout(timer);} },[formData,isOpen,isCotizacionMode,initialData]);

    const filteredClientes = useMemo(() => { if (!formData.cliente || typeof formData.cliente !== 'string') return []; const search = utils.normalizeText(formData.cliente); return (clientesRegistrados || []).filter(c => utils.normalizeText(c.nombre).includes(search) || (c.telefono && utils.normalizeText(c.telefono).includes(search)) ).slice(0, 5); }, [formData.cliente, clientesRegistrados]);
    const filteredPaquetes = useMemo(() => { if(!searchTermService)return PAQUETES; const s=utils.normalizeText(searchTermService); return PAQUETES.filter(p=>utils.normalizeText(p.nombre).includes(s)||utils.normalizeText(p.short||'').includes(s)); }, [searchTermService, PAQUETES]);

    const handleSelectClient = useCallback((client) => { utils.triggerHaptic('light'); setFormData(prev => ({ ...prev, cliente: client.nombre || '', telefono: client.telefono || '', email: client.email || prev.email || '' })); setShowClientDropdown(false); }, []);
    const procesarServicios = useCallback((prev, newSelected) => { const sumPrecios=newSelected.reduce((sum,s)=>sum+utils.safeNum(s.precio),0); const newTotal=sumPrecios+utils.safeNum(prev.transporte)+utils.safeNum(prev.gastos); const resumenServicios=newSelected.map(s=>s.cantidad>1?`${s.nombre} (x${s.cantidad})`:s.nombre).join(' + '); return{...prev,serviciosSeleccionados:newSelected,servicio:resumenServicios,total:newTotal>0?newTotal.toString():''}; }, []);
    const addService = useCallback((pkg) => { utils.triggerHaptic('light'); setFormData(prev=>{ const actuales=Array.isArray(prev.serviciosSeleccionados)?[...prev.serviciosSeleccionados]:[]; const existeIdx=actuales.findIndex(s=>s.nombre===pkg.nombre); if(existeIdx!==-1){actuales[existeIdx].cantidad+=1;actuales[existeIdx].precio=actuales[existeIdx].precioOriginal*actuales[existeIdx].cantidad;} else{actuales.push({...pkg,cantidad:1,precioOriginal:pkg.precio,precio:pkg.precio});} return procesarServicios(prev,actuales); }); }, [procesarServicios]);
    const updateServiceQuantity = useCallback((idx, delta) => { utils.triggerHaptic('light'); setFormData(prev=>{ const actuales=[...prev.serviciosSeleccionados], nuevoItem={...actuales[idx]}; nuevoItem.cantidad=Math.max(1,nuevoItem.cantidad+delta); nuevoItem.precio=nuevoItem.precioOriginal*nuevoItem.cantidad; actuales[idx]=nuevoItem; return procesarServicios(prev,actuales); }); }, [procesarServicios]);
    const removeService = useCallback((idx) => { utils.triggerHaptic('light'); setFormData(prev=>{ const ns=[...prev.serviciosSeleccionados]; ns.splice(idx,1); return procesarServicios(prev,ns); }); }, [procesarServicios]);
    const handleServiceEdit = useCallback((idx, field, val) => { setFormData(prev=>{ const actuales=[...prev.serviciosSeleccionados], nuevoItem={...actuales[idx]}; if(field==='precio'){ const nuevoPrecio=utils.safeNum(val); nuevoItem.precio=nuevoPrecio; nuevoItem.precioOriginal=nuevoPrecio/Math.max(1,nuevoItem.cantidad||1); }else if(field==='descripcion'){nuevoItem.descripcion=val;} actuales[idx]=nuevoItem; return procesarServicios(prev,actuales); }); }, [procesarServicios]);
    const handleCreateCustom = useCallback(async () => { const newSrv=await onAddCustomService(customData.nombre,customData.precio); if(newSrv){addService(newSrv);setIsCustomOpen(false);setCustomData({nombre:'',precio:''});} }, [customData.nombre, customData.precio, onAddCustomService, addService]);
    const handleZoneChange = useCallback((e) => { const z=e.target.value, cost=ZONAS_TRANSPORTE[z]||0; setFormData(p=>({...p,ubicacion:z,transporte:cost.toString(),total:((Array.isArray(p.serviciosSeleccionados)?p.serviciosSeleccionados:[]).reduce((s,x)=>s+utils.safeNum(x.precio),0)+cost+utils.safeNum(p.gastos)).toString()})); }, []);
    
    const handleAddSubcontrato = () => {
        const p = listadoProveedores.find(x => x.id === selectedProv);
        if(!p) return showAlert("Selecciona un proveedor válido");
        const cost = utils.safeNum(provCosto);
        if(cost <= 0) return showAlert("El costo del subcontrato debe ser mayor a 0");
        utils.triggerHaptic('success');
        setFormData(prev => {
            const currentGastos = utils.safeNum(prev.gastos);
            const appendDetalle = prev.detalleGastos ? `${prev.detalleGastos}\n- Pago a ${p.nombre} (${p.especialidad}): $${cost}` : `- Pago a ${p.nombre} (${p.especialidad}): $${cost}`;
            return { ...prev, gastos: (currentGastos + cost).toString(), detalleGastos: appendDetalle, subcontratos: [...(prev.subcontratos || []), { proveedorId: p.id, nombre: p.nombre, servicio: p.especialidad, costo: cost }] };
        });
        setSelectedProv(''); setProvCosto(''); showAlert("Subcontrato añadido y gastos actualizados", true);
    };

    const handleClearDraft = useCallback(() => { if(window.confirm("¿Deseas limpiar el formulario y empezar de cero?")){ setFormData({...defaultFormData,fecha:utils.getLocalYYYYMMDD(new Date())});utils.setSafeLocal('diverty_form_draft',''); } }, []);
    const handleSubmit = useCallback((e) => { e.preventDefault(); if(!formData.cliente?.trim())return showAlert("El nombre del cliente es obligatorio."); if(!formData.telefono?.trim())return showAlert("El teléfono es obligatorio."); if(!formData.fecha)return showAlert("La fecha del evento es obligatoria."); onSave(formData,isCotizacionMode); }, [formData, isCotizacionMode, onSave, showAlert]);

    if (!isOpen) return null; const opcionesEstado = isCotizacionMode ? ['Cotización', 'Cot. Aprobada', 'Cot. Rechazada'] : ['Pendiente', 'Confirmado', 'Completado'];
    return (
        <div className="fixed inset-0 z-[9998] bg-slate-900/40 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 animate-fadeIn">
            <div className={`${UI.modal} w-full h-[92vh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl flex flex-col overflow-hidden p-0 sm:p-0`}>
                 <div className="p-6 sm:p-8 border-b border-slate-200/50 flex justify-between items-center z-20 bg-white/95"><h3 className="font-black text-slate-900 text-2xl flex items-center gap-3 tracking-tight">{isCotizacionMode ? <FileText className="text-amber-500 drop-shadow-sm"/> : (initialData?.id && !initialData?.isDuplicated ? <Edit className="text-[#2563FF] drop-shadow-sm"/> : <Plus className="text-[#2563FF] drop-shadow-sm"/>)} {isCotizacionMode ? (initialData?.id ? 'Editar Cotización' : 'Nueva Cotización') : (initialData?.id && !initialData?.isDuplicated ? 'Editar Reserva' : 'Nueva Reserva')}</h3><div className="flex gap-3">{(!initialData?.id || initialData?.isDuplicated) && (<button onClick={handleClearDraft} type="button" className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 active:scale-[0.98] transition-colors border border-rose-200 shadow-sm"><Trash2 size={20}/></button>)}<button onClick={onClose} type="button" className="p-2.5 bg-slate-100 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-200 active:scale-[0.98] transition-colors border border-slate-200 shadow-sm"><X size={20}/></button></div></div>
                 <div className="overflow-y-auto flex-1 p-5 sm:p-8 bg-slate-50/90"><form onSubmit={handleSubmit} className="max-w-xl mx-auto pb-8 space-y-6">
                     <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-5 sm:p-6 mb-6 shadow-sm"><div className="flex items-center gap-3 mb-6"><IconBox icon={Users} color="blue" /><h4 className="font-extrabold text-slate-900 text-lg tracking-tight">Datos del Cliente</h4></div><div className="space-y-5"><div className="relative z-40"><Field innerRef={nameInputRef} label="Nombre *" required value={formData.cliente} onChange={e => {setFormData({...formData, cliente: e.target.value});setShowClientDropdown(true);}} onFocus={() => setShowClientDropdown(true)} onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)} autoComplete="off" />{showClientDropdown && filteredClientes.length > 0 && (<div className="mt-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl max-h-48 overflow-y-auto shadow-xl">{filteredClientes.map((c, idx) => (<button type="button" key={idx} onMouseDown={(e) => { e.preventDefault(); handleSelectClient(c); }} className="w-full text-left px-5 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex flex-col transition-colors"><span className="font-bold text-slate-900">{c.nombre}</span>{c.telefono && <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Smartphone size={12}/> {c.telefono}</span>}</button>))}</div>)}</div><div className="grid grid-cols-2 gap-5"><Field label="Teléfono *" required value={formData.telefono} onChange={e=>setFormData({...formData,telefono:e.target.value})} /><Field label="Correo" value={formData.email} onChange={e=>setFormData({...formData,email:e.target.value})} /></div></div></div>
                     <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-5 sm:p-6 mb-6 shadow-sm"><div className="flex items-center gap-3 mb-6"><IconBox icon={MapPin} color="rose" /><h4 className="font-extrabold text-slate-900 text-lg tracking-tight">Logística</h4></div><div className="grid grid-cols-2 gap-5 mb-5"><Field label="Fecha *" type="date" required value={formData.fecha} onChange={e=>setFormData({...formData,fecha:e.target.value})} /><Field label="Hora *" type="time" required value={formData.hora} onChange={e=>setFormData({...formData,hora:e.target.value})} /></div><div className="mb-5"><Field as="select" label="Zona" value={formData.ubicacion} onChange={handleZoneChange}>{Object.keys(ZONAS_TRANSPORTE).map(z => <option key={z} value={z} className="bg-white text-slate-900">{z}</option>)}</Field></div><Field label="Dirección Exacta" value={formData.direccion} onChange={e=>setFormData({...formData,direccion:e.target.value})} /></div>
                     <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-5 sm:p-6 mb-6 shadow-sm"><div className="flex items-center gap-3 mb-6"><IconBox icon={Sparkles} color="amber" /><h4 className="font-extrabold text-slate-900 text-lg tracking-tight">Servicios</h4></div><div className="mb-6"><div className="flex items-center relative group"><Search className="absolute left-4 text-slate-400 group-focus-within:text-[#2563FF] transition-colors" size={18} /><input type="text" value={searchTermService} onChange={(e) => { setSearchTermService(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} onBlur={() => setTimeout(() => setShowDropdown(false), 200)} placeholder="Buscar o agregar servicio..." className={`${UI.input} pl-12`} />{searchTermService && (<button type="button" onMouseDown={() => { setSearchTermService(''); setShowDropdown(false); }} className="absolute right-4 text-slate-400 hover:text-slate-900 transition-colors"><X size={16}/></button>)}</div>{showDropdown && (<div className="mt-3 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-xl"><div className="max-h-48 overflow-y-auto">{filteredPaquetes.map(p => (<button type="button" key={p.id} onMouseDown={(e) => { e.preventDefault(); addService(p); setSearchTermService(''); setShowDropdown(false); }} className="w-full text-left px-5 py-4 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex justify-between items-center transition-colors"><span className="font-bold text-slate-900">{String(p.nombre)}</span><span className="text-emerald-500 font-extrabold">${utils.safeNum(p.precio)}</span></button>))}{filteredPaquetes.length === 0 && <div className="px-5 py-6 text-center text-slate-500 text-sm font-medium">No se encontraron servicios.</div>}</div><div className="p-3 border-t border-slate-100 bg-slate-50"><button type="button" onMouseDown={(e) => { e.preventDefault(); setIsCustomOpen(true); setShowDropdown(false); setSearchTermService(''); }} className="w-full py-3.5 bg-[#2563FF]/10 text-[#2563FF] rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#2563FF]/20 transition-colors active:scale-[0.98] border border-[#2563FF]/20 shadow-sm flex items-center justify-center gap-2"><Plus size={16} /> Crear nuevo servicio</button></div></div>)}</div>{isCustomOpen && (<div className="mb-6 p-5 sm:p-6 bg-blue-50/50 backdrop-blur-md border border-[#2563FF]/30 rounded-2xl animate-fadeIn shadow-sm"><h5 className="font-bold text-[#2563FF] text-sm mb-5 uppercase tracking-widest flex items-center gap-2"><Plus size={18} /> Crear Servicio Personalizado</h5><div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6"><Field label="Nombre del Servicio" value={customData.nombre} onChange={e=>setCustomData({...customData, nombre: e.target.value})} placeholder="Ej. Hora extra" className="bg-white" /><Field label="Precio ($)" type="number" value={customData.precio} onChange={e=>setCustomData({...customData, precio: e.target.value})} placeholder="0.00" className="bg-white" /></div><div className="flex gap-4 justify-end"><button type="button" onClick={() => setIsCustomOpen(false)} className="px-6 py-3 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors">Cancelar</button><button type="button" onClick={handleCreateCustom} className="px-6 py-3 bg-gradient-to-r from-[#2563FF] to-[#7C3AED] text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-[0.98] shadow-[0_8px_20px_rgba(37,99,235,0.25)]">Agregar a lista</button></div></div>)}{formData.serviciosSeleccionados.length > 0 && (<div className="space-y-4 mb-2 pt-2 border-t border-slate-100/80"><label className={UI.label}>Servicios Agregados ({formData.serviciosSeleccionados.length})</label>{formData.serviciosSeleccionados.map((s, idx) => (<div key={idx} className="flex flex-col gap-4 p-5 bg-slate-50/80 backdrop-blur-sm rounded-[20px] border border-slate-200/80 relative group hover:border-slate-300 transition-colors duration-200 shadow-sm"><button type="button" onClick={()=>removeService(idx)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 transition-colors p-1.5"><X size={16}/></button><div className="flex justify-between items-center pr-8"><span className="font-extrabold text-[15px] text-slate-900 truncate">{String(s.nombre)}</span><div className="flex items-center bg-white rounded-xl p-1 border border-slate-200 shadow-sm"><button type="button" onClick={()=>updateServiceQuantity(idx,-1)} className="w-8 h-8 flex justify-center items-center hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-900 transition-colors active:scale-[0.95]"><Minus size={14}/></button><span className="w-8 text-center font-bold text-slate-900">{s.cantidad}</span><button type="button" onClick={()=>updateServiceQuantity(idx,1)} className="w-8 h-8 flex justify-center items-center hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-900 transition-colors active:scale-[0.95]"><Plus size={14}/></button></div></div><div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4"><Field label="Precio Modificable ($)" type="number" value={s.precio} onChange={(e) => handleServiceEdit(idx, 'precio', e.target.value)} className="bg-white" /><Field as="textarea" label="Descripción para el PDF" value={s.descripcion || ''} onChange={(e) => handleServiceEdit(idx, 'descripcion', e.target.value)} rows={2} placeholder="Detalles, viñetas, cambios..." className="bg-white"/></div></div>))}</div>)}</div>
                     <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-5 sm:p-6 mb-6 shadow-sm"><div className="flex items-center gap-3 mb-6"><IconBox icon={Receipt} color="emerald" /><h4 className="font-extrabold text-slate-900 text-lg tracking-tight">Finanzas</h4></div>{!isCotizacionMode && (<div className="grid grid-cols-2 gap-5 mb-6"><Field label="Abono" type="number" value={formData.abono} onChange={e=>setFormData({...formData,abono:e.target.value})} className="text-emerald-500 font-bold bg-emerald-50/50" /><Field label="Viáticos" type="number" value={formData.transporte} onChange={e=>{ const newTransporte = e.target.value; setFormData(prev => ({...prev, transporte: newTransporte, total: ((Array.isArray(prev.serviciosSeleccionados) ? prev.serviciosSeleccionados : []).reduce((sum, s) => sum + utils.safeNum(s.precio), 0) + utils.safeNum(newTransporte) + utils.safeNum(prev.gastos)).toString()})); }} /></div>)}{isCotizacionMode && (<div className="mb-6"><Field label="Viáticos Adicionales ($)" type="number" value={formData.transporte} onChange={e=>{ const newTransporte = e.target.value; setFormData(prev => ({...prev, transporte: newTransporte, total: ((Array.isArray(prev.serviciosSeleccionados) ? prev.serviciosSeleccionados : []).reduce((sum, s) => sum + utils.safeNum(s.precio), 0) + utils.safeNum(newTransporte) + utils.safeNum(prev.gastos)).toString()})); }} /></div>)}{!isCotizacionMode && (<div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 mb-6 relative overflow-hidden"><h5 className="text-[10px] uppercase font-extrabold text-slate-400 tracking-[0.2em] mb-4 flex items-center gap-2"><Truck size={14}/> Subcontratos / Proveedores</h5><div className="flex items-end gap-3 mb-4"><div className="flex-1"><Field as="select" value={selectedProv} onChange={e=>setSelectedProv(e.target.value)} className="bg-white border-slate-200"><option value="">Selecciona Proveedor...</option>{listadoProveedores?.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.especialidad})</option>)}</Field></div><div className="w-24"><Field type="number" placeholder="Costo" value={provCosto} onChange={e=>setProvCosto(e.target.value)} className="bg-white border-slate-200 text-rose-500 font-bold"/></div><button type="button" onClick={handleAddSubcontrato} className="bg-slate-900 text-white p-3.5 rounded-xl hover:bg-slate-800 transition-colors shadow-md h-[56px] w-[56px] flex items-center justify-center shrink-0"><Plus size={20}/></button></div>{formData.subcontratos?.length > 0 && (<div className="space-y-2 mt-4 pt-4 border-t border-slate-200">{formData.subcontratos.map((sc, i) => (<div key={i} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 shadow-sm text-sm"><div><span className="font-bold text-slate-800">{sc.nombre}</span> <span className="text-slate-400 text-xs">- {sc.servicio}</span></div><span className="font-extrabold text-rose-500">-${sc.costo}</span></div>))}</div>)}</div>)}{!isCotizacionMode && (<div className="mb-6 space-y-5"><Field label="Gastos operativos totales ($)" type="number" value={formData.gastos} onChange={e=>{ const newGastos = e.target.value; setFormData(prev => ({...prev, gastos: newGastos, total: ((Array.isArray(prev.serviciosSeleccionados) ? prev.serviciosSeleccionados : []).reduce((sum, s) => sum + utils.safeNum(s.precio), 0) + utils.safeNum(prev.transporte) + utils.safeNum(newGastos)).toString()})); }} className="text-rose-500 bg-rose-50/50" /><Field as="textarea" label="Detalle de gastos internos" value={formData.detalleGastos} onChange={e=>setFormData({...formData,detalleGastos:e.target.value})} placeholder="Ej. Transporte, hielo, ayudante..." /></div>)}<div className="mb-6 border-t border-slate-100 pt-6 mt-2"><label className={UI.label}>Estado {isCotizacionMode ? 'Cotización' : 'Reserva'}</label><div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">{opcionesEstado.map(est => (<button type="button" key={est} onClick={() => setFormData(prev => { let nuevoAbono = prev.abono; if (est === 'Completado') { nuevoAbono = prev.total; } else if (est === 'Pendiente') { nuevoAbono = ''; } return { ...prev, estado: est, abono: nuevoAbono }; })} className={`shrink-0 flex-1 py-3.5 px-4 text-[10px] font-bold uppercase tracking-widest rounded-xl border transition-colors active:scale-[0.98] ${formData.estado===est ? 'bg-gradient-to-r from-[#2563FF] to-[#7C3AED] text-white border-transparent shadow-[0_8px_15px_rgba(37,99,235,0.25)]' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-700'}`}>{est}</button>))}</div></div><div className="bg-slate-100/80 p-6 rounded-2xl flex justify-between items-center border border-slate-200/80 mt-2 shadow-sm"><span className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">TOTAL FINAL</span><div className="flex items-center"><span className="text-3xl font-extrabold text-[#2563FF] mr-2">$</span><input type="number" value={formData.total} onChange={e=>setFormData({...formData,total:e.target.value})} className="bg-transparent text-right text-4xl font-black text-slate-900 outline-none w-32 tracking-tight" /></div></div></div>
                     <AppButton variant="primary" icon={Check} onClick={handleSubmit} className="w-full py-4 text-sm uppercase tracking-widest mt-2 mb-4 shadow-xl">{isCotizacionMode ? 'Guardar Cotización' : 'Guardar Reserva'}</AppButton>
                  </form></div>
              </div>
        </div>
    );
}

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
  const [isDBReady, setIsDBReady] = useState(false); 
  const [eventosActivos, setEventosActivos] = useState([]); 
  const [catalogoPaquetes, setCatalogoPaquetes] = useState([]); 
  const [hiddenClients, setHiddenClients] = useState([]); 
  const [filterDate, setFilterDate] = useState(''); 
  const [viewMode, setViewMode] = useState('semana'); 
  const [calMonth, setCalMonth] = useState(currentTime.getMonth()); 
  const [calYear, setCalYear] = useState(currentTime.getFullYear()); 
  const [globalSearch, setGlobalSearch] = useState('');
  const [proveedores, setProveedores] = useState([]); 
  const [proveedorModal, setProveedorModal] = useState({ isOpen: false, data: null }); 
  const [expandedProvId, setExpandedProvId] = useState(null);
  
  const handleToggleProv = useCallback((id) => setExpandedProvId(prev => prev === id ? null : id), []);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, initialData: defaultFormData, isCotizacion: false }); 
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null }); 
  const [clientEditModal, setClientEditModal] = useState({ isOpen: false, oldName: '' });
  const [toastAlert, setToastAlert] = useState({ isOpen: false, message: '', success: false }); 
  const [isModoOperativo, setIsModoOperativo] = useState(false); 
  const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState(null); 
  const [printType, setPrintType] = useState(null); 
  const [pdfScale, setPdfScale] = useState(1); 
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSort, setClientSort] = useState('gasto'); 
  const [financePeriod, setFinancePeriod] = useState('mes'); 
  const [selectedFinanceMonth, setSelectedFinanceMonth] = useState(currentTime.getMonth() + 1); 
  const [selectedFinanceYear, setSelectedFinanceYear] = useState(currentTime.getFullYear());
  const [expandedFinanceId, setExpandedFinanceId] = useState(null); 
  const [expandedClientId, setExpandedClientId] = useState(null); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [messaging, setMessaging] = useState(null);
  const [clientFilter, setClientFilter] = useState('todos'); 
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => { 
      const handleOnline = () => setIsOnline(true); 
      const handleOffline = () => setIsOnline(false); 
      window.addEventListener('online', handleOnline); 
      window.addEventListener('offline', handleOffline); 
      return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); }; 
  }, []);

  // --- SOPORTE NATIVO PARA BOTÓN "ATRÁS" DEL CELULAR ---
  const stateRef = useRef({ modalConfig, clientEditModal, proveedorModal, isModoOperativo, isPrinting, activeTab, isNotifOpen, confirmModal });
  useEffect(() => { 
      stateRef.current = { modalConfig, clientEditModal, proveedorModal, isModoOperativo, isPrinting, activeTab, isNotifOpen, confirmModal }; 
  });
  
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handleBack = () => {
        const s = stateRef.current;
        let blocked = false;
        
        if (s.confirmModal?.isOpen) { setConfirmModal({ isOpen: false, message: '', onConfirm: null }); blocked = true; }
        else if (s.isPrinting) { setIsPrinting(false); blocked = true; }
        else if (s.modalConfig?.isOpen) { setModalConfig(p => ({...p, isOpen: false})); blocked = true; }
        else if (s.clientEditModal?.isOpen) { setClientEditModal({ isOpen: false, oldName: '' }); blocked = true; }
        else if (s.proveedorModal?.isOpen) { setProveedorModal({ isOpen: false, data: null }); blocked = true; }
        else if (s.isNotifOpen) { setIsNotifOpen(false); blocked = true; }
        else if (s.isModoOperativo) { setIsModoOperativo(false); blocked = true; }
        else if (s.activeTab !== 'inicio') { setActiveTab('inicio'); blocked = true; }
        
        if (blocked) {
            window.history.pushState(null, '', window.location.href);
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
    const fallbackTimer = setTimeout(() => setIsAuthLoading(false), 500); 
    const unsubscribe = onAuthStateChanged(auth, (user) => { 
        clearTimeout(fallbackTimer); 
        if (user) { setFirebaseUser(user); setIsAuthenticated(true); } 
        else { setFirebaseUser(null); setIsAuthenticated(false); } 
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
      utils.triggerHaptic('light'); setActiveTab(tabId); setIsSidebarOpen(false); 
      setTimeout(() => { const mainEl = document.getElementById('main-content'); if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' }); }, 50); 
  }, []);
  
  const updateSettings = useCallback((newSettings) => { 
      setAppSettings(newSettings); utils.setSafeLocal('diverty_settings', JSON.stringify(newSettings)); 
  }, []); 
  
  const showAlert = useCallback((message, success = false) => { 
      setToastAlert({ isOpen: true, message: String(message), success }); 
      setTimeout(() => setToastAlert({ isOpen: false, message: '', success: false }), 5000); 
  }, []);
  
  const showConfirm = useCallback((message, onConfirm) => { 
      setConfirmModal({ isOpen: true, message: String(message), onConfirm: () => { onConfirm(); setConfirmModal({ isOpen: false, message: '', onConfirm: null }); } }); 
  }, []); 

  useEffect(() => {
    if (!messaging) return;
    const unsubscribe = onMessage(messaging, (payload) => {
      const title = payload.notification?.title || payload.data?.title || "Notificación Diverty";
      const body = payload.notification?.body || payload.data?.body || "Tienes un nuevo mensaje"; 
      showAlert(`🔔 ${title}: ${body}`, true); utils.triggerHaptic('success');
    }); return () => unsubscribe();
  }, [messaging, showAlert]);

  const handleToggleClient = useCallback((nombre) => { setExpandedClientId(prev => prev === nombre ? null : nombre); }, []); 
  const handleToggleFinance = useCallback((id) => { setExpandedFinanceId(prev => prev === id ? null : id); }, []);
  
  const todayObj = currentTime;
  const todayStr = useMemo(() => utils.getLocalYYYYMMDD(currentTime), [currentTime]);
  const tomorrowStr = useMemo(() => utils.getLocalYYYYMMDD(new Date(currentTime.getTime() + 86400000)), [currentTime]);
  const { start: weekStart, end: weekEnd } = useMemo(() => utils.getWeekRange(currentTime), [currentTime]);
  const todayTime = useMemo(() => new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate()).getTime(), [currentTime]);
  
  const stats = useMemo(() => {
     let gananciaHoy = 0, gananciaSemana = 0, deudaTotal = 0, ingresosEsteMes = 0; 
     const eventosHoy = [], eventosManana = [], alertasOperativas = [], currYear = todayObj.getFullYear(), currMonth = todayObj.getMonth() + 1;
     
     eventosActivos.forEach(e => {
        const es = utils.normalizeText(e.estado);
        const isHoy = e.fecha === todayStr;
        const isManana = e.fecha === tomorrowStr;
        
        if(es !== 'cancelado' && !es.includes('cotizaci') && !es.includes('cot.')) {
            const t = utils.safeNum(e.total), a = utils.safeNum(e.abono), g = utils.safeNum(e.gastos), p = t - g;  
            let evYear = 0, evMonth = 0, evDay = 0;
            
            if(e.fecha) { 
                const parts = String(e.fecha).trim().split('-'); 
                if(parts.length >= 2) { evYear = parseInt(parts[0], 10); evMonth = parseInt(parts[1], 10); evDay = parseInt(parts[2] || 0, 10); } 
            }
            
            const isEsteMes = (evYear === currYear && evMonth === currMonth);
            const isPastOrCurrentMonth = evYear < currYear || (evYear === currYear && evMonth <= currMonth);
            
            if (es !== 'completado' && (t - a) > 0 && isPastOrCurrentMonth) deudaTotal += (t - a); 
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
     const clientsMap = {}; 
     eventosActivos.forEach(e => { 
         const es = utils.normalizeText(e.estado); 
         if(es === 'cancelado' || es.includes('cotizaci') || es.includes('cot.')) return; 
         
         const key = String(e.cliente || '').trim().toLowerCase(); 
         if(!key) return; 
         
         if(!clientsMap[key]) clientsMap[key] = { nombre: e.cliente, telefono: e.telefono, email: e.email, totalGastado: 0, eventos: 0, ultimoEventoFecha: e.fecha, ultimoEstado: e.estado }; 
         clientsMap[key].totalGastado += utils.safeNum(e.total); 
         clientsMap[key].eventos += 1; 
         
         if (e.fecha && (!clientsMap[key].ultimoEventoFecha || e.fecha > clientsMap[key].ultimoEventoFecha)) { 
             clientsMap[key].ultimoEventoFecha = e.fecha; 
             clientsMap[key].ultimoEstado = e.estado; 
         } 
     }); 
     return Object.values(clientsMap).filter(c => !hiddenClients.includes(c.nombre));
  }, [eventosActivos, hiddenClients]);

  const enrichedClients = useMemo(() => { 
      return clientsList.map(c => { 
          let daysSince = 0; 
          if (c.ultimoEventoFecha) { 
              const [y, m, d] = c.ultimoEventoFecha.split('-'); 
              if (y && m && d) { 
                  const lastDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)).getTime(); 
                  daysSince = Math.floor((todayTime - lastDate) / (1000 * 60 * 60 * 24)); 
              } 
          } 
          return { ...c, daysSince, isVIP: c.eventos >= 3 || c.totalGastado >= 300, isFrecuente: c.eventos === 2, isNuevo: c.eventos === 1 && daysSince <= 180, isInactivo: daysSince > 180, needsContact: daysSince > 60 && daysSince <= 365 }; 
      }); 
  }, [clientsList, todayTime]);
  
  const animatedGananciaHoy = useCountUp(stats.gananciaHoy);
  
  const agendaFiltrados = useMemo(() => { 
      return eventosActivos.filter(e => { 
          const es = utils.normalizeText(e.estado); 
          if (es.includes('cotizaci') || es.includes('cot.')) return false; 
          if (globalSearch && !String(`${e.cliente} ${e.servicio} ${e.ubicacion} ${e.direccion} ${e.telefono}`).toLowerCase().includes(globalSearch.toLowerCase())) return false; 
          if (filterDate && e.fecha !== filterDate) return false; 
          
          if (!filterDate && !globalSearch) { 
              if (viewMode === 'hoy') return e.fecha === todayStr; 
              let dt; 
              if (e.fecha) { const parts = String(e.fecha).split('-'); if (parts.length === 3) dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)); } 
              if (viewMode === 'semana') return dt ? (dt >= weekStart && dt <= weekEnd) : false; 
              if (viewMode === 'mes') return dt ? (dt.getFullYear() === todayObj.getFullYear() && dt.getMonth() === todayObj.getMonth()) : false; 
              if (viewMode === 'findesemana') return dt ? (dt.getDay() === 0 || dt.getDay() === 6) : false; 
              if (viewMode === 'pendientes') return (utils.safeNum(e.total) - utils.safeNum(e.abono)) > 0 && es !== 'completado'; 
              if (viewMode === 'todas') return true; 
          } 
          return true; 
      }); 
  }, [eventosActivos, globalSearch, filterDate, viewMode, todayStr, todayObj, weekStart, weekEnd]);

  const filteredClients = useMemo(() => enrichedClients.filter(c => { 
      if (clientFilter === 'vip' && !c.isVIP) return false; 
      if (clientFilter === 'retomar' && !c.needsContact) return false; 
      if (!searchTerm) return true; 
      const s = searchTerm.toLowerCase(); 
      return String(c.nombre).toLowerCase().includes(s) || String(c.telefono).includes(s); 
  }), [enrichedClients, searchTerm, clientFilter]);

  const sortedFilteredClients = useMemo(() => [...filteredClients].sort((a, b) => { 
      if (clientSort === 'gasto') return b.totalGastado - a.totalGastado; 
      if (clientSort === 'recientes') return new Date(b.ultimoEventoFecha || 0) - new Date(a.ultimoEventoFecha || 0); 
      return 0; 
  }), [filteredClients, clientSort]);
  
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
      return parseInt(parts[0], 10) === financeYear && parseInt(parts[1], 10) === financeMonth;
    });
  }, [eventosActivos, financePeriod, financeYear, financeMonth]);

  const finanzasData = useMemo(() => { 
      const tI = evtCalculoBase.reduce((a, e) => a + utils.safeNum(e.total), 0), 
            tG = evtCalculoBase.reduce((a, e) => a + utils.safeNum(e.gastos), 0), 
            bT = tI - tG, 
            roi = tI > 0 ? ((bT / tI) * 100).toFixed(0) : 0, 
            deudaTotalGlobal = evtCalculoBase.reduce((acc, e) => { 
                const pendiente = utils.safeNum(e.total) - utils.safeNum(e.abono); 
                return (pendiente > 0 && utils.normalizeText(e.estado) !== 'completado') ? acc + pendiente : acc; 
            }, 0); 
      return { tI, tG, bT, roi, deudaTotalGlobal }; 
  }, [evtCalculoBase]);
  
  const finanzasMes = useMemo(() => { 
    const ingresosEsteMesGlobal = eventosActivos.filter(e => { 
      const es = utils.normalizeText(e.estado); 
      if (es === 'cancelado' || es.includes('cotizaci') || es.includes('cot.')) return false; 
      if (!e.fecha) return false; 
      const parts = String(e.fecha).trim().split('-'); 
      return parseInt(parts[0], 10) === financeYear && parseInt(parts[1], 10) === financeMonth; 
    }).reduce((acc, e) => acc + (utils.safeNum(e.total) - utils.safeNum(e.gastos)), 0); 
    
    const esMesActual = financeYear === todayObj.getFullYear() && financeMonth === (todayObj.getMonth() + 1);
    const diasTranscurridos = esMesActual ? new Date(todayTime).getDate() : new Date(financeYear, financeMonth, 0).getDate();
    const diasTotales = new Date(financeYear, financeMonth, 0).getDate(); 
    const promedioDiario = diasTranscurridos > 0 ? ingresosEsteMesGlobal / diasTranscurridos : 0; 
    const proyeccion = promedioDiario * diasTotales; 
    const progresoMeta = Math.min((ingresosEsteMesGlobal / appSettings.metaMensual) * 100, 100); 
    
    return { ingresosEsteMesGlobal, diasTranscurridos, diasTotales, proyeccion, progresoMeta }; 
  }, [eventosActivos, financeYear, financeMonth, todayObj, todayTime, appSettings.metaMensual]);

  const chartData = useMemo(() => { 
    if (financePeriod === 'todos') {
      const mesesLabels = []; const d = new Date(todayTime);
      for (let i = 5; i >= 0; i--) { const temp = new Date(d.getFullYear(), d.getMonth() - i, 1); mesesLabels.push({ label: NOMBRES_MESES[temp.getMonth()].substring(0,3), year: temp.getFullYear(), month: temp.getMonth() + 1 }); }
      return mesesLabels.map(m => {
        const val = eventosActivos.filter(e => { if (!e.fecha || utils.normalizeText(e.estado) === 'cancelado' || utils.normalizeText(e.estado).includes('cot')) return false; const parts = e.fecha.split('-'); return parseInt(parts[0], 10) === m.year && parseInt(parts[1], 10) === m.month; }).reduce((acc, ev) => acc + (utils.safeNum(ev.total) - utils.safeNum(ev.gastos)), 0);
        return { date: m.label, value: val };
      });
    }

    const semanas = [ { label: 'Sem 1', start: 1, end: 7 }, { label: 'Sem 2', start: 8, end: 14 }, { label: 'Sem 3', start: 15, end: 21 }, { label: 'Sem 4', start: 22, end: 28 }, { label: 'Sem 5', start: 29, end: 31 } ];
    return semanas.map(s => {
      const value = eventosActivos.filter(e => {
        if (!e.fecha || utils.normalizeText(e.estado) === 'cancelado' || utils.normalizeText(e.estado).includes('cot')) return false;
        const parts = e.fecha.split('-'); const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
        return y === financeYear && m === financeMonth && d >= s.start && d <= s.end;
      }).reduce((acc, ev) => acc + (utils.safeNum(ev.total) - utils.safeNum(ev.gastos)), 0);
      return { date: s.label, value };
    });
  }, [eventosActivos, financePeriod, financeYear, financeMonth, todayTime]);

  const maxChartVal = useMemo(() => Math.max(...chartData.map(d => d.value), 100), [chartData]); 
  const cotizacionesActivas = useMemo(() => eventosActivos.filter(e => utils.normalizeText(e.estado).includes('cotizaci') || utils.normalizeText(e.estado).includes('cot.')), [eventosActivos]); 
  const proximasReservas = useMemo(() => [...stats.eventosHoy, ...stats.eventosManana].filter(e => utils.normalizeText(e.estado) !== 'completado'), [stats.eventosHoy, stats.eventosManana]);

  const handleAddCustomService = useCallback(async (nombre, precio) => { 
      if (!nombre?.trim()) { showAlert("Ingresa un nombre para el servicio.", false); return null; } 
      const newSrv = { id: 'c-'+Date.now(), nombre: nombre.trim(), precio: utils.safeNum(precio), short: nombre.substring(0,12)+'...', descripcion: 'Servicio personalizado.', isCustom: true }; 
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
              let srvs = Array.isArray(e.serviciosSeleccionados) ? [...e.serviciosSeleccionados] : []; 
              if (!srvs.length && e.servicio) { srvs.push({ nombre: e.servicio, precio: utils.safeNum(e.total), cantidad: 1, precioOriginal: utils.safeNum(e.total) }); } 
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
      utils.triggerHaptic('light'); const { id, createdAt, deletedLocally, colisionAprobada, ...rest } = e; const isCotizacionOrig = utils.normalizeText(e.estado).includes('cot'); 
      setModalConfig({ isOpen: true, isCotizacion: isCotizacionOrig, initialData: { ...rest, abono: '', estado: isCotizacionOrig ? 'Cotización' : 'Pendiente', isDuplicated: true } }); 
      showAlert("Evento duplicado. Verifica los datos y guarda.", true); 
  }, [showAlert]);
  
  const handleUpdateEstado = useCallback((id, nuevoEstado) => { 
      utils.triggerHaptic('light'); setEventosActivos(prev => prev.map(e => e.id === id ? { ...e, estado: nuevoEstado } : e)); 
      setDoc(getDocRef(id), { estado: nuevoEstado }, { merge: true }).catch(err=>console.warn(err)); showAlert(`Estado actualizado a ${nuevoEstado}`, true); 
  }, [showAlert]);
  
  const handleConvertirReserva = useCallback((e) => { 
      utils.triggerHaptic('light'); setModalConfig({ isOpen: true, isCotizacion: false, initialData: { ...e, estado: 'Pendiente' } }); showAlert("Confirma los datos para crear la reserva.", true); 
  }, [showAlert]);

  const handleSaveFromModal = useCallback(async (formDataToSave, isCotizacionMode) => {
    if (!formDataToSave.cliente?.trim()) return showAlert("Por favor, ingresa el nombre del cliente."); 
    if (!formDataToSave.fecha) return showAlert("Por favor, selecciona la fecha."); 
    
    utils.triggerHaptic('light'); 
    const evtId = (formDataToSave.id && !formDataToSave.isDuplicated) ? formDataToSave.id : (isCotizacionMode ? `cot-${Date.now()}` : `man-${Date.now()}`); 
    const { isDuplicated, ...cleanFormData } = formDataToSave; 
    
    if (!formDataToSave.id || isDuplicated) { 
        if (isCotizacionMode && !cleanFormData.estado.includes('Cot')) cleanFormData.estado = 'Cotización'; 
        if (!isCotizacionMode && cleanFormData.estado.includes('Cot')) cleanFormData.estado = 'Pendiente'; 
    } 
    
    const safeData = JSON.parse(JSON.stringify({ ...cleanFormData, id: evtId, createdAt: cleanFormData.createdAt || new Date().toISOString(), deletedLocally: false })); 
    if (modalConfig.initialData?.fecha !== safeData.fecha || modalConfig.initialData?.hora !== safeData.hora) safeData.colisionAprobada = false;
    
    const estNormal = utils.normalizeText(safeData.estado);
    const isCotiz = estNormal.includes('cotizaci') || estNormal.includes('cot.'); 
    const hasCollision = !isCotiz && eventosActivos.some(e => { 
        if (e.id === evtId || utils.normalizeText(e.estado) === 'cancelado' || utils.normalizeText(e.estado).includes('cotizaci') || utils.normalizeText(e.estado).includes('cot.') || e.fecha !== safeData.fecha) return false; 
        if (!e.hora || !safeData.hora) return false; 
        const [h1, m1] = e.hora.split(':').map(Number), [h2, m2] = safeData.hora.split(':').map(Number); 
        return Math.abs((h1 * 60 + m1) - (h2 * 60 + m2)) < 180; 
    });
    
    const guardarReservaFinal = (id, dataToSave) => { 
        closeModal(); utils.setSafeLocal('diverty_form_draft', ''); 
        setEventosActivos(prev => { const arr = [...prev]; const i = arr.findIndex(x=>x.id===id); if(i>-1) arr[i]=dataToSave; else arr.push(dataToSave); return arr; }); 
        setDoc(getDocRef(id), dataToSave).catch(err=>console.warn(err)); showAlert(isCotizacionMode ? "¡Cotización guardada!" : "¡Reserva guardada!", true); 
        if (isCotizacionMode && (!formDataToSave.id || formDataToSave.isDuplicated)) { setPrintData({ ...dataToSave }); setPrintType('cotizacion'); setIsPrinting(true); } 
    };
    
    if (hasCollision && !safeData.colisionAprobada) showConfirm("Hay otro evento con menos de 3 horas de diferencia. ¿Guardar de todos modos?", () => { safeData.colisionAprobada = true; guardarReservaFinal(evtId, safeData); }); 
    else guardarReservaFinal(evtId, safeData);
  }, [eventosActivos, closeModal, showAlert, modalConfig, showConfirm]);

  const handleDeleteEvento = useCallback((id) => showConfirm("¿Eliminar registro permanentemente?", async () => { utils.triggerHaptic('light'); setEventosActivos(prev => { const arr = [...prev]; const i = arr.findIndex(x=>x.id===id); if(i>-1) arr[i].deletedLocally=true; return arr; }); setDoc(getDocRef(id), { deletedLocally: true }, { merge: true }).catch(err=>console.warn(err)); closeModal(); }), [closeModal, showConfirm]);
  const handleDeleteClient = useCallback((clientName, eventCount) => { const mensaje = eventCount > 0 ? `¿Seguro que deseas eliminar este cliente? Tiene ${eventCount} evento(s) asociado(s).` : `¿Seguro que deseas eliminar este cliente?`; showConfirm(mensaje, async () => { utils.triggerHaptic('light'); const newHidden = [...hiddenClients, clientName]; setHiddenClients(newHidden); if (firebaseUser) await setDoc(getConfigRef('clientesOcultos'), { clients: newHidden }, { merge: true }); showAlert("Cliente eliminado exitosamente.", true); }); }, [hiddenClients, firebaseUser, showConfirm, showAlert]);
  const handleWipeAll = useCallback(() => showConfirm("⚠️ ¿Limpiar toda la base de datos?", async () => { utils.triggerHaptic('light'); setEventosActivos([]); Promise.all(eventosActivos.map(e => setDoc(getDocRef(e.id), { deletedLocally: true }, { merge: true }))).catch(err=>console.warn(err)); utils.triggerHaptic('success'); showAlert("Base de datos limpiada.", true); }), [eventosActivos, showConfirm, showAlert]);
  const handleViewDoc = useCallback((e, type) => { try { utils.triggerHaptic('light'); setPrintData(e); setPrintType(type); setIsPrinting(true); } catch (err) { showAlert("Error al procesar."); } }, [showAlert]);
  
  const handleSaveClientName = useCallback((oldName, newName) => {
      const oldKey = utils.normalizeText(oldName); const newKey = utils.normalizeText(newName);
      if(!newName.trim() || oldKey === newKey) { setClientEditModal({ isOpen: false, oldName: '' }); return; }
      utils.triggerHaptic('success'); const eventsToUpdate = eventosActivos.filter(e => utils.normalizeText(e.cliente) === oldKey);
      setEventosActivos(prev => prev.map(e => { if (utils.normalizeText(e.cliente) === oldKey) { return { ...e, cliente: newName.trim() }; } return e; }));
      eventsToUpdate.forEach(e => { setDoc(getDocRef(e.id), { cliente: newName.trim() }, { merge: true }).catch(console.warn); });
      showAlert(`Cliente actualizado. Se unificaron ${eventsToUpdate.length} eventos.`, true); setClientEditModal({ isOpen: false, oldName: '' });
  }, [eventosActivos, showAlert]);

  const handleSaveProveedor = useCallback((data) => {
      utils.triggerHaptic('success'); const provId = data.id || `prov-${Date.now()}`; const payload = { ...data, id: provId };
      setDoc(getProvRef(provId), payload).catch(console.warn); showAlert(data.id ? "Proveedor actualizado" : "Proveedor registrado", true); setProveedorModal({ isOpen: false, data: null });
  }, [showAlert]);

  const handleDeleteProveedor = useCallback((id) => { showConfirm("¿Eliminar este proveedor de la agenda?", () => { utils.triggerHaptic('light'); deleteDoc(getProvRef(id)).catch(console.warn); showAlert("Proveedor eliminado", true); }); }, [showConfirm, showAlert]);
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
        await new Promise(resolve => setTimeout(resolve, 300));
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
        await new Promise(resolve => setTimeout(resolve, 300)); 
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
    utils.triggerHaptic('success'); const filteredForExport = eventosActivos.filter(e => { const est = utils.normalizeText(e.estado); if (est === 'cancelado' || est.includes('cotizaci') || est.includes('cot.') || utils.safeNum(e.total) <= 0) return false; if (financePeriod === 'todos') return true; const fStr = String(e.fecha || ''); if (fStr) { const [ey, em] = fStr.split('-'); return parseInt(ey) === financeYear && parseInt(em) === financeMonth; } return false; });
    let csv = 'Fecha,Cliente,Tipo Evento,Ubicacion,Ingreso Bruto,Gastos,Ganancia Neta,Estado\n'; filteredForExport.forEach(e => { const t = utils.safeNum(e.total), g = utils.safeNum(e.gastos); csv += `"${e.fecha||''}","${String(e.cliente||'').replace(/,/g,'')}","${String(e.tipoEvento||'').replace(/,/g,'')}","${String(e.ubicacion||'').replace(/,/g,'')}",${t},${g},${t-g},"${e.estado||''}"\n`; });
    const blob = new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' }), url = URL.createObjectURL(blob), link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `Reporte_Finanzas_Diverty_${financePeriod === 'todos' ? 'Historico' : `${NOMBRES_MESES[financeMonth - 1]}_${financeYear}`}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }, [eventosActivos, financePeriod, financeYear, financeMonth]);

  const handleLogin = useCallback(async (e) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, emailInput, passwordInput); utils.triggerHaptic('success'); setEmailInput(''); setPasswordInput(''); } catch (error) { utils.triggerHaptic('warning'); showAlert("Credenciales incorrectas", false); } }, [emailInput, passwordInput, showAlert]);
  const handleLogout = useCallback(async () => { try { await signOut(auth); } catch (error) { showAlert("Error al cerrar sesión"); } }, [showAlert]);
  const handleCopiarCobros = useCallback(() => { utils.triggerHaptic('success'); let text = "📋 *REPORTE DE COBROS PENDIENTES* 📋\n\n"; eventosActivos.filter(e => { const est = utils.normalizeText(e.estado); return (utils.safeNum(e.total) - utils.safeNum(e.abono)) > 0 && est !== 'cancelado' && est !== 'completado' && !est.includes('cotizaci') && !est.includes('cot.'); }).forEach(e => { text += `👤 *${e.cliente}*\n📅 Fecha: ${e.fecha}\n💰 Debe: $${(utils.safeNum(e.total) - utils.safeNum(e.abono)).toFixed(2)}\n📞 WA: ${e.telefono}\n\n`; }); navigator.clipboard.writeText(text); showAlert("Lista de cobros copiada al portapapeles", true); }, [eventosActivos, showAlert]);

  const activarNotificaciones = useCallback(async () => {
    if (!messaging) { showAlert("Notificaciones no disponibles.", false); return; }
    try { if (!('Notification' in window)) { showAlert("Navegador no soporta notificaciones.", false); return; } const permiso = await Notification.requestPermission(); if (permiso !== "granted") { showAlert("Debes permitir notificaciones", false); return; } showAlert("Generando token, espera...", true); const token = await getToken(messaging, { vapidKey: "BEmGfQ2ANNd-fwu25Nd7OyRnzCbX8pdIoYxreafTsk5R5PKoAIfom-tDJIMS4Slpu5XjK0vvwLxHCS5_09B8YrQ" }); if (token) { await setDoc(doc(db, "tokens", token), { token: token, createdAt: new Date() }); console.log("Token guardado:", token); showAlert("✅ ¡Token generado y guardado!", true); } else { showAlert("No se generó ningún token.", false); } } catch (error) { console.error("Error obteniendo token:", error); showAlert("Error al obtener token", false); }
  }, [messaging, showAlert]);

  const renderInicio = () => {
     if (isModoOperativo) {
        const faltanAbono = stats.eventosHoy.filter(e => utils.safeNum(e.abono) <= 0 && utils.normalizeText(e.estado) !== 'completado'), 
              faltanDireccion = stats.eventosHoy.filter(e => (!e.direccion || String(e.direccion).trim() === '') && utils.normalizeText(e.estado) !== 'completado'), 
              faltanHora = stats.eventosHoy.filter(e => (!e.hora || String(e.hora).trim() === '') && utils.normalizeText(e.estado) !== 'completado');
        return (
          <div className="animate-fadeIn p-4 md:p-10 max-w-2xl mx-auto space-y-6 pb-32 relative z-50">
             <div className="fixed inset-0 bg-[#F8FAFC] -z-10 animate-fadeIn"></div>
             <div className="flex justify-between items-center bg-gradient-to-r from-[#2563FF] to-[#7C3AED] text-white p-6 rounded-[24px] shadow-lg">
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
                         {faltanHora.length > 0 && (<div className="flex items-center gap-4 bg-[#2563FF]/5 border border-[#2563FF]/10 p-4 rounded-xl shadow-sm"><IconBox icon={Clock} color="blue" className="border-0 p-2.5"/><div><p className="text-slate-900 font-bold text-[15px] leading-tight">Falta hora ({faltanHora.length})</p><p className="text-[#2563FF] text-xs font-bold uppercase tracking-[0.1em] truncate max-w-[200px] mt-1">{faltanHora.map(e=>String(e.cliente).split(' ')[0]).join(', ')}</p></div></div>)}
                     </div>
                 </div>
             )}
             <div className="space-y-6">
                 {stats.eventosHoy.length === 0 ? (
                     <div className="text-center py-16 bg-white/80 backdrop-blur-md rounded-[24px] border border-slate-200/50 shadow-sm"><Sun size={56} className="mx-auto text-slate-300 mb-5" strokeWidth={1.5}/><p className="text-slate-900 font-extrabold text-xl mb-2 tracking-tight">¡Todo Despejado!</p><p className="text-slate-500 font-medium text-sm">No hay eventos operativos para hoy.</p></div>
                 ) : (
                     stats.eventosHoy.map((e,i)=><EventCardItem key={e.id} ev={e} idx={i} todayTime={todayTime} onWhatsApp={sendWhatsAppCall} onViewDoc={handleViewDoc} onEdit={openModal} onDelete={handleDeleteEvento} onDuplicate={handleDuplicateEvento} onMapClick={openGoogleMaps} empresa={appSettings.empresa} utils={utils} onUpdateEstado={handleUpdateEstado} onConvertir={handleConvertirReserva} />)
                 )}
             </div>
          </div>
        );
     }
     return (
       <div className="animate-fadeIn p-4 md:p-6 lg:p-10 max-w-5xl mx-auto space-y-8 pb-32 md:pb-10 relative z-10">
          <div className="bg-gradient-to-br from-[#2563FF] via-[#7C3AED] to-[#FF3EA5] rounded-[40px] p-8 sm:p-12 shadow-[0_20px_50px_rgba(124,58,237,0.3)] relative overflow-hidden group animate-fadeInUp border border-white/20">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.1] mix-blend-overlay pointer-events-none"></div>
             <div className="absolute -top-24 -right-24 w-96 h-96 bg-[radial-gradient(circle,rgba(255,255,255,0.3)_0%,transparent_60%)] pointer-events-none blur-2xl group-hover:scale-110 transition-transform duration-1000"></div>
             <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[radial-gradient(circle,rgba(255,255,255,0.2)_0%,transparent_60%)] pointer-events-none blur-2xl"></div>
             <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
                 <div className="text-center sm:text-left">
                     <h1 className="text-4xl sm:text-6xl font-black mb-4 flex items-center justify-center sm:justify-start gap-3 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-white/80 drop-shadow-md">Hola Diverty 👋</h1>
                     <p className="text-white/90 font-semibold text-sm sm:text-lg tracking-wide max-w-md drop-shadow-sm">Gestiona tus reservas, contratos y finanzas al instante.</p>
                 </div>
                 <div className="w-full sm:w-auto relative z-10 mt-4 sm:mt-0 flex shrink-0">
                     <AppButton onClick={() => openModal()} variant="primary" icon={Plus} className="w-full sm:w-auto py-4 px-8 text-[15px]">Nueva Reserva</AppButton>
                 </div>
             </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="cursor-pointer" onClick={() => { handleTabChange('eventos'); setViewMode('hoy'); }}>
                 <AppCard title="Eventos Hoy" icon={Calendar} iconColor="primary"><p className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tighter drop-shadow-sm">{stats.eventosHoy.length}</p></AppCard>
              </div>
              <div className="cursor-pointer" onClick={() => handleTabChange('finanzas')}>
                 <AppCard title="Ingresos Mes" icon={DollarSign} iconColor="success"><p className="text-5xl sm:text-6xl font-black text-emerald-500 tracking-tighter drop-shadow-sm">${stats.ingresosEsteMes.toFixed(0)}</p></AppCard>
              </div>
              <div className="cursor-pointer" onClick={() => handleTabChange('clientes')}>
                 <AppCard title="Clientes Activos" icon={Users} iconColor="warning"><p className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tighter drop-shadow-sm">{clientsList.length}</p></AppCard>
              </div>
              <div className="cursor-pointer" onClick={() => handleTabChange('finanzas')}>
                 <AppCard title="Por Cobrar" icon={TrendingUp} iconColor="danger"><p className="text-5xl sm:text-6xl font-black text-rose-500 tracking-tighter drop-shadow-sm">${stats.deudaTotal.toFixed(0)}</p></AppCard>
              </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <button type="button" onClick={() => openModal(null, true)} className="flex-1 bg-white/70 backdrop-blur-2xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-slate-800 rounded-[24px] py-5 font-black flex items-center justify-center gap-3 hover:bg-white hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all group">
                <div className="bg-amber-500/10 p-2 rounded-xl text-amber-500"><FileText size={22} strokeWidth={2.5}/></div> 
                <span className="hidden sm:inline tracking-wide">Crear Cotización</span>
            </button>
            <button type="button" onClick={() => {utils.triggerHaptic('light'); setIsModoOperativo(true); window.scrollTo(0,0);}} className="flex-1 bg-gradient-to-r from-[#2563FF] to-[#7C3AED] text-white rounded-[24px] py-5 font-black flex items-center justify-center gap-3 transition-all shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_15px_30px_rgba(124,58,237,0.35)] hover:-translate-y-1 relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <div className="bg-white/20 p-2 rounded-xl text-white relative z-10"><Zap size={22} strokeWidth={2.5} className="fill-white"/></div> 
                <span className="hidden sm:inline relative z-10 tracking-wide">Modo Operativo</span>
            </button>
            <button type="button" onClick={() => window.location.reload()} className="bg-white/70 backdrop-blur-2xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-[#2563FF] rounded-[24px] py-5 px-6 flex items-center justify-center hover:bg-white transition-all hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 group" title="Refrescar vista">
                <div className="bg-[#2563FF]/10 p-2 rounded-xl"><RefreshCw size={24} strokeWidth={2.5} className="group-hover:rotate-180 transition-transform duration-500" /></div>
            </button>
          </div>
          
          {stats.alertasOperativas.length > 0 && (
             <div className="animate-slideDown mt-10">
                <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400 flex items-center gap-2 mb-5">
                   <AlertTriangle size={16} className="text-rose-500 animate-pulse"/> Urgencias ({stats.alertasOperativas.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                   {stats.alertasOperativas.map((al, i) => { 
                      const AlIcon = al.icon; 
                      return (
                         <div key={al.id} onClick={() => openModal(al.e)} className={`p-5 sm:p-6 rounded-[24px] border border-slate-200/60 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all duration-500 ease-out bg-white/90 backdrop-blur-md hover:border-rose-300 shadow-sm hover:shadow-lg animate-fadeInUp`} style={{animationDelay: `${i*100}ms`}}>
                            <div className="flex items-center gap-4">
                               <div className={`p-3.5 rounded-xl ${al.b}`}><AlIcon size={24} strokeWidth={2.5}/></div>
                               <div className="flex flex-col items-start"><p className={`text-[15px] font-bold text-slate-900 leading-tight capitalize`}>{al.txt}</p><p className="text-[10px] font-bold uppercase tracking-wider text-rose-500 mt-1.5">{al.t}</p></div>
                            </div>
                            <ChevronRight size={20} className="text-slate-300" />
                         </div>
                      );
                   })}
                </div>
             </div>
          )}
          
          {cotizacionesActivas.length > 0 && (
              <div className="mt-14 pt-10 border-t border-slate-200/50 relative">
                  <h3 className="font-extrabold text-2xl text-slate-900 flex items-center gap-3 mb-6 tracking-tight"><FileText className="text-amber-500" size={24} /> Cotizaciones Activas</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {cotizacionesActivas.map((e,i)=><EventCardItem key={e.id} ev={e} idx={i} todayTime={todayTime} onWhatsApp={sendWhatsAppCall} onViewDoc={handleViewDoc} onEdit={openModal} onDelete={handleDeleteEvento} onDuplicate={handleDuplicateEvento} onMapClick={openGoogleMaps} empresa={appSettings.empresa} utils={utils} onUpdateEstado={handleUpdateEstado} onConvertir={handleConvertirReserva} />)}
                  </div>
              </div>
          )}
          
          <div className="mt-14 pt-10 border-t border-slate-200/50 relative">
              <div className={UI.flexBetween + " mb-6"}>
                  <h3 className="font-extrabold text-2xl text-slate-900 flex items-center gap-3 tracking-tight"><CalendarDays className="text-[#2563FF]" size={24} /> Próximas Reservas</h3>
                  <button type="button" onClick={() => handleTabChange('eventos')} className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-[#2563FF] transition-colors">Ver Todas <ChevronRight size={14} className="inline"/></button>
              </div>
              {proximasReservas.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {proximasReservas.map((e,i)=><EventCardItem key={e.id} ev={e} idx={i} todayTime={todayTime} onWhatsApp={sendWhatsAppCall} onViewDoc={handleViewDoc} onEdit={openModal} onDelete={handleDeleteEvento} onDuplicate={handleDuplicateEvento} onMapClick={openGoogleMaps} empresa={appSettings.empresa} utils={utils} onUpdateEstado={handleUpdateEstado} onConvertir={handleConvertirReserva} />)}
                  </div>
              ) : (
                  <EmptyState icon={CalendarDays} title="Agenda Despejada" message="No tienes reservas programadas para hoy ni mañana. ¡Aprovecha para crear nuevas cotizaciones!" actionBtn={<AppButton onClick={()=>openModal()} variant="primary" icon={Plus} className="mt-4 px-8 py-4 shadow-md">Crear Reserva</AppButton>} />
              )}
          </div>
       </div>
     );
  };

  const renderEventos = () => {
    const renderCalendarGrid = () => {
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate(), firstDayIndex = new Date(calYear, calMonth, 1).getDay(), days = Array.from({length: daysInMonth}, (_, i) => i + 1), blanks = Array.from({length: firstDayIndex}, (_, i) => i), weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        return (
            <div className={`bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-[32px] p-5 sm:p-8 mb-8 animate-fadeIn transition-all duration-500 shadow-[0_10px_30px_rgba(0,0,0,0.05)]`}>
               <div className="flex flex-col sm:flex-row justify-between items-center gap-5 mb-8 border-b border-slate-100 pb-6"><h3 className="text-2xl font-black text-slate-900 capitalize flex items-center gap-3 tracking-tight"><IconBox icon={CalendarDays} color="blue" /> {NOMBRES_MESES[calMonth]} {calYear}</h3><div className="flex gap-2 bg-slate-50/80 p-1.5 rounded-[16px] border border-slate-200/50 w-full sm:w-auto justify-between sm:justify-start shadow-sm"><button type="button" onClick={() => { utils.triggerHaptic('light'); setCalMonth(calMonth === 0 ? 11 : calMonth - 1); setCalYear(calMonth === 0 ? calYear - 1 : calYear); }} className="p-3 hover:bg-white rounded-xl transition-all text-slate-500 hover:text-slate-900 shadow-sm"><ChevronLeft size={18}/></button><button type="button" onClick={() => { utils.triggerHaptic('light'); setCalMonth(todayObj.getMonth()); setCalYear(todayObj.getFullYear()); setFilterDate(todayStr); }} className="px-6 py-2 hover:bg-white shadow-sm text-[#2563FF] font-bold text-xs uppercase tracking-[0.1em] rounded-xl transition-all">HOY</button><button type="button" onClick={() => { utils.triggerHaptic('light'); setCalMonth(calMonth === 11 ? 0 : calMonth + 1); setCalYear(calMonth === 11 ? calYear + 1 : calYear); }} className="p-3 hover:bg-white rounded-xl transition-all text-slate-500 hover:text-slate-900 shadow-sm"><ChevronRight size={18}/></button></div></div>
               <div className="grid grid-cols-7 gap-2 sm:gap-4 text-center mb-4">{weekDays.map(d => <div key={d} className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{d.substring(0,3)}</div>)}</div>
               <div className="grid grid-cols-7 gap-2 sm:gap-4">
                  {blanks.map(b => <div key={`b-${b}`} className="min-h-[70px] sm:min-h-[130px] bg-transparent"></div>)}
                  {days.map(d => {
                     const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                     const dayEvents = eventosActivos.filter(e => e.fecha === dateStr && !utils.normalizeText(e.estado).includes('cotizaci') && !utils.normalizeText(e.estado).includes('cot.') && utils.normalizeText(e.estado) !== 'cancelado');
                     const isToday = dateStr === todayStr, isSelected = filterDate === dateStr, hasEvents = dayEvents.length > 0;
                     return (
                         <div key={d} onClick={() => { utils.triggerHaptic('light'); setFilterDate(dateStr); setViewMode(''); }} className={`min-h-[70px] sm:min-h-[130px] p-2 sm:p-3 rounded-[16px] border transition-all duration-300 ease-out cursor-pointer flex flex-col justify-start items-center sm:items-start hover:-translate-y-1 active:scale-[0.98] ${isSelected ? 'border-[#2563FF]/50 bg-[#2563FF]/5 shadow-md' : isToday ? 'bg-rose-50/80 border-rose-200' : 'bg-white/50 border-slate-100 hover:border-slate-300 hover:bg-white shadow-sm'}`}>
                            <p className={`text-xs sm:text-sm font-bold sm:self-end w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg sm:rounded-xl transition-all ${isSelected ? 'bg-gradient-to-br from-[#2563FF] to-[#7C3AED] text-white shadow-md' : isToday ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 bg-slate-50 border border-slate-200'}`}>{d}</p>
                            <div className="mt-2 sm:mt-3 flex flex-wrap sm:flex-col gap-1 sm:gap-1.5 w-full justify-center sm:justify-start flex-1 overflow-hidden">{hasEvents && <div className="hidden sm:flex flex-col gap-1.5 w-full">{dayEvents.slice(0, 2).map((ev, i) => (<div key={i} className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-[8px] truncate bg-white border border-slate-200 text-slate-700 w-full shadow-sm" title={ev.cliente}>{String(ev.cliente).split(' ')[0]}</div>))}{dayEvents.length > 2 && <div className="text-[9px] text-[#2563FF] font-bold uppercase tracking-wider mt-0.5 text-center w-full">+{dayEvents.length - 2}</div>}</div>}{hasEvents && <div className="sm:hidden flex gap-1.5 mt-1 justify-center flex-wrap">{dayEvents.slice(0, 3).map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#2563FF]' : 'bg-slate-400'}`}></div>)}{dayEvents.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>}</div>}</div>
                         </div>
                     );
                  })}
               </div>
            </div>
        );
    };

    const renderListView = () => {
        const grouped = agendaFiltrados.reduce((acc, ev) => { if(!acc[ev.fecha]) acc[ev.fecha] = []; acc[ev.fecha].push(ev); return acc; }, {});
        return (
            <div className="mt-8 space-y-10 animate-fadeIn relative z-10">
                {Object.keys(grouped).sort().map(fecha => (
                    <div key={fecha} className="flex flex-col">
                        <div className="flex items-center gap-4 mb-6"><div className="bg-white/90 backdrop-blur-sm text-slate-900 px-6 py-3.5 rounded-xl font-bold text-sm flex items-center gap-3 shadow-sm border border-slate-200/80"><CalendarDays size={18} className="text-[#2563FF]" strokeWidth={2.5}/> {fecha ? String(fecha).split('-').reverse().join('/') : 'Sin Fecha'}</div><div className="flex-1 h-px bg-slate-200/80"></div></div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{grouped[fecha].map((e,i)=><EventCardItem key={e.id} ev={e} idx={i} todayTime={todayTime} onWhatsApp={sendWhatsAppCall} onViewDoc={handleViewDoc} onEdit={openModal} onDelete={handleDeleteEvento} onDuplicate={handleDuplicateEvento} onMapClick={openGoogleMaps} empresa={appSettings.empresa} utils={utils} onUpdateEstado={handleUpdateEstado} onConvertir={handleConvertirReserva} />)}</div>
                    </div>
                ))}
            </div>
        );
    };

    return (
      <div className="animate-fadeIn p-4 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-8 pb-32 relative">
        <div className="mb-10 flex flex-col gap-4 relative z-10">
            <div className={UI.flexBetween}><div><h2 className={UI.title}>Agenda</h2><p className="text-base font-medium text-slate-500 mt-2">Organiza tus eventos con precisión</p></div></div>
            <div className="flex flex-col lg:flex-row gap-5 mt-6">
                 <div className="relative flex-1 group"><div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><Search size={20} className="text-slate-400 group-focus-within:text-[#2563FF] transition-colors" /></div><input type="text" value={globalSearch} onChange={e=>setGlobalSearch(e.target.value)} placeholder="Buscar cliente, lugar, paquete..." className="w-full h-[56px] bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-[16px] pl-12 pr-12 text-[15px] font-semibold text-slate-900 outline-none focus:border-[#2563FF]/50 focus:ring-4 focus:ring-[#2563FF]/10 transition-all duration-300 shadow-sm placeholder:text-slate-400" />{globalSearch && <button type="button" onClick={() => setGlobalSearch('')} className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-400 hover:text-[#2563FF] transition-colors"><X size={18}/></button>}</div>
                 <div className="flex gap-3 overflow-x-auto scrollbar-hide py-1 items-center">
                     {['hoy','semana','mes','pendientes','todas'].map(v => (<button key={v} type="button" onClick={()=>{setFilterDate(''); setViewMode(v)}} className={`px-5 py-3.5 rounded-[14px] text-[10px] uppercase tracking-[0.1em] font-bold transition-all duration-300 ease-out whitespace-nowrap shadow-sm border active:scale-[0.98] ${viewMode===v&&!filterDate?'bg-gradient-to-r from-[#2563FF] to-[#7C3AED] text-white border-transparent shadow-[0_8px_20px_rgba(37,99,235,0.25)]':'bg-white/80 backdrop-blur-sm text-slate-600 hover:text-slate-900 hover:bg-white border-slate-200/80'}`}>{v}</button>))}
                     <div className={`flex items-center justify-between px-5 py-3 rounded-[14px] transition-all duration-300 ease-out cursor-text focus-within:border-[#2563FF]/50 bg-white/80 backdrop-blur-sm border ${filterDate ? 'border-[#2563FF]/50 text-[#2563FF] shadow-md' : 'border-slate-200/80 shadow-sm text-slate-600 hover:bg-white'} shrink-0`}><div className="flex items-center flex-1 relative"><CalendarDays size={18} className={`mr-2.5 transition-colors duration-200`} /><input type="date" value={filterDate} onChange={(e) => { utils.triggerHaptic('light'); setFilterDate(e.target.value); }} className={`bg-transparent text-[11px] uppercase tracking-[0.1em] font-bold outline-none w-full flex-1 cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 absolute inset-0 opacity-0 z-20`} /><span className={`text-[11px] uppercase tracking-[0.1em] font-bold pointer-events-none relative z-10`}>{filterDate ? String(filterDate).split('-').reverse().join('/') : 'Fecha'}</span></div>{filterDate && <button type="button" onClick={() => {utils.triggerHaptic('light'); setFilterDate('');}} className="text-slate-400 hover:text-rose-500 ml-3 z-30 transition-all cursor-pointer"><X size={16}/></button>}</div>
                 </div>
            </div>
        </div>
        <div className="relative z-10">
            {viewMode === 'mes' && renderCalendarGrid()}
            {(!isDBReady && !globalSearch && !filterDate && eventosActivos.length === 0) ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8"><SkeletonCard /><SkeletonCard /></div>
            ) : agendaFiltrados.length === 0 ? (
                <EmptyState icon={Search} title="Sin resultados" message="No se encontraron reservas." actionBtn={!!globalSearch || !!filterDate ? <button type="button" onClick={()=>{setGlobalSearch(''); setFilterDate(''); setViewMode('todas');}} className="mt-4 text-[#2563FF] font-bold px-8 py-3.5 rounded-[16px] border border-[#2563FF]/30 bg-[#2563FF]/10 hover:bg-[#2563FF]/20 transition-all duration-300 shadow-sm uppercase tracking-wider text-xs cursor-pointer">Limpiar filtros</button> : null} />
            ) : (!!globalSearch || !!filterDate) ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">{agendaFiltrados.map((e,i)=><EventCardItem key={e.id} ev={e} idx={i} todayTime={todayTime} onWhatsApp={sendWhatsAppCall} onViewDoc={handleViewDoc} onEdit={openModal} onDelete={handleDeleteEvento} onDuplicate={handleDuplicateEvento} onMapClick={openGoogleMaps} empresa={appSettings.empresa} utils={utils} onUpdateEstado={handleUpdateEstado} onConvertir={handleConvertirReserva} />)}</div>
            ) : ( renderListView() )}
        </div>
      </div>
    );
  };

  const renderClientes = () => {
     return (
       <div className="animate-fadeIn p-4 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-8 pb-32 relative z-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-4"><div><h2 className={UI.title}><Users size={36} className="text-[#2563FF] inline mr-2 drop-shadow-sm" /> CRM Ventas</h2><p className="text-slate-500 text-sm mt-2 font-medium">Fideliza y administra a tus clientes.</p></div></div>
          
          <div className="grid grid-cols-3 gap-4 md:gap-6 mb-10 animate-fadeInUp">
              <div onClick={() => {utils.triggerHaptic('light'); setClientFilter('todos')}} className={`${UI.card} p-5 sm:p-8 flex flex-col justify-center cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${clientFilter === 'todos' ? 'ring-2 ring-[#2563FF] border-transparent shadow-lg' : ''}`}>
                  <div className="flex items-center gap-2.5 mb-3"><IconBox icon={Users} color="blue" className="border-0"/><span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Total</span></div>
                  <p className="text-3xl sm:text-4xl font-extrabold text-slate-900">{enrichedClients.length}</p>
              </div>
              <div onClick={() => {utils.triggerHaptic('light'); setClientFilter('vip')}} className={`${UI.card} p-5 sm:p-8 flex flex-col justify-center cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${clientFilter === 'vip' ? 'ring-2 ring-amber-400 border-transparent shadow-lg' : ''}`}>
                  <div className="flex items-center gap-2.5 mb-3"><IconBox icon={Award} color="amber" className="border-0"/><span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-slate-500">VIPs</span></div>
                  <p className="text-3xl sm:text-4xl font-extrabold text-slate-900">{enrichedClients.filter(c => c.isVIP).length}</p>
              </div>
              <div onClick={() => {utils.triggerHaptic('light'); setClientFilter('retomar')}} className={`${UI.card} p-5 sm:p-8 flex flex-col justify-center cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${clientFilter === 'retomar' ? 'ring-2 ring-rose-400 border-transparent shadow-lg' : ''}`}>
                  <div className="flex items-center gap-2.5 mb-3"><IconBox icon={BellRing} color="rose" className="border-0"/><span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Retomar</span></div>
                  <p className="text-3xl sm:text-4xl font-extrabold text-rose-500">{enrichedClients.filter(c => c.needsContact).length}</p>
              </div>
          </div>

          {contactCandidates.length > 0 && !searchTerm && clientFilter === 'todos' && (
             <div className="mb-12 animate-slideDown">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-5 flex items-center gap-2"><Zap size={18} className="text-amber-500 fill-amber-500"/> Oportunidades de Venta</h3>
                 <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide snap-x">
                     {contactCandidates.map((c, idx) => { 
                         const phoneClean = String(c.telefono).replace(/\D/g,''), msg = `¡Hola ${c.nombre}! 👋 Te saludamos de Diverty Eventos. Ha pasado un tiempo desde tu última fiesta. ¿Tienes alguna celebración próxima? ¡Tenemos nuevas promociones! 🎉`; 
                         return (
                             <div key={`contact-${c.nombre}`} className={`snap-center shrink-0 w-80 ${UI.card} p-6 flex flex-col gap-5 animate-fadeInUp`} style={{ animationDelay: `${idx * 100}ms` }}>
                                 <div><p className="font-extrabold text-slate-900 truncate text-xl tracking-tight capitalize">{c.nombre}</p><Badge color="rose" className="mt-2"><Clock size={12}/> Sin compras hace {c.daysSince} días</Badge></div>
                                 <AppButton onClick={() => { utils.openWhatsAppBusiness(phoneClean, msg); }} variant="success" icon={MessageCircle} className="w-full text-[12px]">Enviar Promo</AppButton>
                             </div>
                         );
                     })}
                 </div>
             </div>
          )}
          <div className="flex flex-col sm:flex-row gap-4"><div className={`${UI.card} p-2 flex-1 flex transition-all duration-300 ease-out`}><div className="flex flex-1 relative group"><Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#2563FF] transition-colors" /><input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar cliente..." className="w-full bg-transparent py-3 pl-14 pr-10 font-semibold outline-none text-[15px] placeholder-slate-400 text-slate-900" />{searchTerm && (<button type="button" onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 p-1.5 rounded-full hover:bg-slate-100 transition-all"><X size={16}/></button>)}</div></div><button type="button" onClick={() => setClientSort(clientSort === 'gasto' ? 'recientes' : 'gasto')} className={`${UI.card} px-8 py-3.5 flex items-center justify-center gap-2.5 font-bold text-xs uppercase tracking-widest transition-all text-slate-600 hover:text-[#2563FF] hover:bg-white`}> <ArrowDownWideNarrow size={18}/> <span className="hidden sm:inline">Ordenar: </span><span className="text-[#2563FF]">{clientSort === 'gasto' ? 'Mayor Gasto' : 'Recientes'}</span></button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">{sortedFilteredClients.length === 0 ? (<div className="col-span-full"><EmptyState icon={Users} title="Bóveda de Clientes Vacía" message="Registra tu primer evento o ajusta los filtros para ver a tus clientes aquí." actionBtn={null} /></div>) : (sortedFilteredClients.map((c,i)=><ClientCardItem key={c.nombre} c={c} idx={i} isExpanded={expandedClientId === c.nombre} onToggleExpand={handleToggleClient} utils={utils} openModal={openModal} onDeleteClient={handleDeleteClient} onEditClient={(name) => setClientEditModal({ isOpen: true, oldName: name })}/>))}</div>
       </div>
     );
  };

  const renderProveedores = () => {
      const provFiltered = proveedores.filter(p => !searchTerm || p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || p.especialidad.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return (
        <div className="animate-fadeIn p-4 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-8 pb-32 relative z-10">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-4">
               <div><h2 className={UI.title}><Truck size={36} className="text-[#2563FF] inline mr-2 drop-shadow-sm" /> Proveedores</h2><p className="text-slate-500 text-sm mt-2 font-medium">Gestiona subcontratos, contactos y acuerdos de servicio.</p></div>
               <AppButton onClick={() => setProveedorModal({ isOpen: true, data: null })} variant="primary" icon={Plus} className="w-full sm:w-auto">Nuevo Proveedor</AppButton>
           </div>
           
           <div className="flex flex-col sm:flex-row gap-4 mb-8">
               <div className={`${UI.card} p-2 flex-1 flex transition-all duration-300 ease-out`}><div className="flex flex-1 relative group"><Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#2563FF] transition-colors" /><input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar proveedor por nombre o servicio..." className="w-full bg-transparent py-3 pl-14 pr-10 font-semibold outline-none text-[15px] placeholder-slate-400 text-slate-900" />{searchTerm && (<button type="button" onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 p-1.5 rounded-full hover:bg-slate-100 transition-all"><X size={16}/></button>)}</div></div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {provFiltered.length === 0 ? (
                   <div className="col-span-full"><EmptyState icon={Truck} title="Sin Proveedores" message="Registra a tu equipo de apoyo para subcontratarlos fácilmente en tus eventos." actionBtn={<AppButton onClick={()=>setProveedorModal({isOpen:true, data: null})} variant="primary" icon={Plus} className="mt-4 px-8 py-4 shadow-md">Registrar Ahora</AppButton>} /></div>
               ) : (
                   provFiltered.map((p, idx) => (
                       <ProveedorCardItem 
                            key={p.id} p={p} idx={idx} isExpanded={expandedProvId === p.id} 
                            onToggleExpand={handleToggleProv} utils={utils} onDelete={handleDeleteProveedor} 
                            onEdit={(data) => setProveedorModal({isOpen: true, data})} 
                            onWhatsApp={(phone, msg) => utils.openWhatsAppBusiness(phone, msg)} 
                            onContrato={(prov) => { setPrintData(prov); setPrintType('contrato_proveedor'); setIsPrinting(true); }} 
                            eventosActivos={eventosActivos} 
                        />
                   ))
               )}
           </div>
        </div>
      );
  };

  const renderFinanzas = () => {
      return (
          <div className="animate-fadeIn p-4 md:p-8 lg:p-10 max-w-5xl mx-auto space-y-8 pb-32 relative z-10">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
               <div><h2 className={UI.title}>Finanzas</h2><p className="text-slate-500 text-sm mt-2 font-medium">Análisis detallado de tu flujo de efectivo e ingresos.</p></div>
               <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center bg-white/95 backdrop-blur-md p-2 rounded-[24px] border border-slate-200/80 shadow-md w-full sm:w-auto">
                 <div className="flex gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/50">
                   <button type="button" onClick={() => {utils.triggerHaptic('light'); setFinancePeriod('mes');}} className={`px-5 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all duration-300 ease-out active:scale-[0.98] ${financePeriod === 'mes' ? 'bg-gradient-to-r from-[#2563FF] to-[#7C3AED] text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>Este Mes</button>
                   <button type="button" onClick={() => {utils.triggerHaptic('light'); setFinancePeriod('todos');}} className={`px-5 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all duration-300 ease-out active:scale-[0.98] ${financePeriod === 'todos' ? 'bg-gradient-to-r from-[#2563FF] to-[#7C3AED] text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>Histórico</button>
                   <button type="button" onClick={() => {utils.triggerHaptic('light'); setFinancePeriod('seleccionado');}} className={`px-5 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all duration-300 ease-out active:scale-[0.98] ${financePeriod === 'seleccionado' ? 'bg-gradient-to-r from-[#2563FF] to-[#7C3AED] text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>Otro Mes</button>
                 </div>
                 {financePeriod === 'seleccionado' && (
                   <div className="flex gap-2 items-center animate-fadeIn py-1 px-2 border-l border-slate-200">
                     <select value={selectedFinanceMonth} onChange={(e) => { utils.triggerHaptic('light'); setSelectedFinanceMonth(parseInt(e.target.value)); }} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#2563FF] cursor-pointer">{NOMBRES_MESES.map((name, idx) => (<option key={idx} value={idx + 1}>{name}</option>))}</select>
                     <select value={selectedFinanceYear} onChange={(e) => { utils.triggerHaptic('light'); setSelectedFinanceYear(parseInt(e.target.value)); }} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#2563FF] cursor-pointer">{[2024, 2025, 2026, 2027, 2028].map(y => (<option key={y} value={y}>{y}</option>))}</select>
                   </div>
                 )}
                 <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
                 <button type="button" onClick={downloadExcel} className="p-2.5 sm:px-4 sm:py-2.5 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all duration-300 ease-out active:scale-[0.98] flex items-center justify-center gap-2 border border-transparent hover:border-emerald-200" title="Exportar a Excel"><Download size={18} strokeWidth={2.5}/> <span className="hidden sm:inline text-[11px] font-bold uppercase tracking-widest">Excel</span></button>
               </div>
             </div>

             <div className="bg-white/90 backdrop-blur-xl rounded-[32px] p-8 sm:p-12 shadow-[0_15px_40px_rgba(0,0,0,0.06)] relative overflow-hidden border border-slate-200/60 animate-slideDown">
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-[radial-gradient(circle,rgba(37,99,235,0.08)_0%,transparent_60%)] pointer-events-none transform-gpu"></div>
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-[radial-gradient(circle,rgba(124,58,237,0.08)_0%,transparent_60%)] pointer-events-none transform-gpu"></div>
                <div className="text-center relative z-10">
                  <p className="text-slate-400 font-bold uppercase tracking-[0.25em] text-[11px] mb-4 flex justify-center items-center gap-2"><Star size={16} className="text-amber-400 fill-amber-400 animate-spin-slow"/> BALANCE NETO DE {financePeriod === 'mes' ? 'ESTE MES' : financePeriod === 'todos' ? 'HISTÓRICO' : `${NOMBRES_MESES[financeMonth - 1].toUpperCase()} ${financeYear}`}</p>
                  <h1 className={`text-6xl sm:text-7xl md:text-8xl font-black mb-12 tracking-tighter ${finanzasData.bT >= 0 ? 'text-slate-900' : 'text-rose-500'}`}>${finanzasData.bT.toFixed(0)}<span className="text-3xl sm:text-4xl text-slate-300">.{(finanzasData.bT % 1).toFixed(2).substring(2)}</span></h1>
                  
                  <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-8 sm:gap-16 border-t border-slate-200/60 pt-10 mt-2">
                    <div className="flex items-center gap-4 bg-[#2563FF]/5 px-5 py-3 rounded-2xl border border-[#2563FF]/10 shadow-sm flex-1 sm:flex-initial"><IconBox icon={ArrowUpRight} color="emerald" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-none" /><div className="text-left"><p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-1.5">Ingresos Brutos</p><p className="text-emerald-500 font-black text-2xl leading-none tracking-tight">${finanzasData.tI.toFixed(2)}</p></div></div>
                    <div className="flex items-center gap-4 bg-rose-500/5 px-5 py-3 rounded-2xl border border-rose-500/10 shadow-sm flex-1 sm:flex-initial"><IconBox icon={ArrowDownRight} color="rose" className="bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-none" /><div className="text-left"><p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-1.5">Gastos Operativos</p><p className="text-rose-500 font-black text-2xl leading-none tracking-tight">-${finanzasData.tG.toFixed(2)}</p></div></div>
                    <div className="flex items-center gap-4 bg-[#7C3AED]/5 px-5 py-3 rounded-2xl border border-[#7C3AED]/10 shadow-sm flex-1 sm:flex-initial"><IconBox icon={BarChart3} color="purple" className="bg-purple-500/10 text-[#7C3AED] border-purple-500/20 shadow-none" /><div className="text-left"><p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-1.5">Margen (ROI)</p><p className="text-[#2563FF] font-black text-2xl leading-none tracking-tight">{finanzasData.roi}%</p></div></div>
                  </div>
                </div>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 animate-fadeInUp" style={{animationDelay: '100ms'}}>
               <div className={`${UI.card} p-6 sm:p-8 flex flex-col justify-center`}><p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-2.5">Ganancia Hoy</p><p className="text-3xl font-extrabold text-emerald-500 tracking-tight">${animatedGananciaHoy.toFixed(0)}</p></div>
               <div className={`${UI.card} p-6 sm:p-8 flex flex-col justify-center`}><p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-2.5">Por Cobrar Total</p><p className="text-3xl font-extrabold text-rose-500 tracking-tight">${finanzasData.deudaTotalGlobal.toFixed(0)}</p></div>
               <div className={`col-span-2 ${UI.card} p-6 sm:p-8 flex items-end justify-between gap-4 h-[120px]`}>
                 <div className="flex-1 flex justify-between items-end h-full gap-2 sm:gap-3">
                   {chartData.map((d, i) => { const hPercent = (d.value / maxChartVal) * 100; return (<div key={i} className="w-full flex flex-col items-center justify-end h-full gap-1.5 group relative"><div className="absolute -top-8 bg-slate-900 text-white text-[9px] font-extrabold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap shadow-md">${d.value.toFixed(0)}</div><div className="w-full bg-slate-100/50 rounded-md relative overflow-hidden transition-all duration-300 ease-out group-hover:bg-slate-200/80 h-[70px]"><div className="absolute bottom-0 w-full bg-gradient-to-t from-[#2563FF] to-[#7C3AED] transition-all duration-1000 ease-out" style={{height: `${hPercent}%`}}></div></div><span className="text-[9px] font-bold uppercase text-slate-400 tracking-[0.15em]">{d.date}</span></div>) })}
                 </div>
                 <div className="pl-6 border-l border-slate-200/80 flex flex-col justify-center h-full"><p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-2 leading-none">Total Período</p><p className="text-2xl font-black text-slate-900 tracking-tight leading-none">${chartData.reduce((s,d)=>s+d.value,0).toFixed(0)}</p></div>
               </div>
             </div>

             <div className={`${UI.card} p-6 sm:p-8 animate-fadeInUp`} style={{animationDelay: '200ms'}}>
               <div className="flex justify-between items-end mb-6"><div><h4 className="font-extrabold text-2xl text-slate-900 tracking-tight flex items-center gap-3"><Award size={28} className="text-amber-500"/> Meta del Período</h4><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 mt-2">{financePeriod === 'todos' ? 'Progreso histórico acumulado' : `Día ${finanzasMes.diasTranscurridos} de ${finanzasMes.diasTotales} del mes`}</p></div><div className="text-right"><span className="text-4xl font-black text-emerald-500 tracking-tight">${finanzasMes.ingresosEsteMesGlobal.toFixed(0)} <span className="text-xl font-bold text-slate-400">/ ${appSettings.metaMensual}</span></span></div></div>
               <div className="w-full bg-slate-200/80 rounded-full h-3 mb-5 overflow-hidden"><AnimatedProgress value={finanzasMes.progresoMeta} /></div>
               <div className={UI.flexBetween}><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600 bg-slate-100/80 px-3.5 py-1.5 rounded-[10px] border border-slate-200/50 shadow-sm">{finanzasMes.progresoMeta.toFixed(1)}% Alcanzado</p>{financePeriod !== 'todos' && (<p className={`text-[11px] font-bold uppercase tracking-[0.1em] px-3.5 py-1.5 rounded-[10px] border shadow-sm ${finanzasMes.proyeccion >= appSettings.metaMensual ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-500 border-rose-200'}`}>Proyectado: ${finanzasMes.proyeccion.toFixed(0)}</p>)}</div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
                <div className="flex flex-col gap-5 animate-fadeInUp" style={{animationDelay: '300ms'}}>
                  <div className="flex justify-between items-center px-2">
                      <h4 className="font-extrabold text-xl text-slate-900 flex items-center gap-3 tracking-tight"><Clock size={22} className="text-rose-500"/> Cuentas por Cobrar <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">({financePeriod === 'todos' ? 'Histórico' : `${NOMBRES_MESES[financeMonth - 1]}`})</span></h4>
                      {evtCalculoBase.filter(e => (utils.safeNum(e.total)-utils.safeNum(e.abono))>0 && utils.normalizeText(e.estado)!=='completado').length > 0 && (<button type="button" onClick={handleCopiarCobros} className="text-[10px] font-bold uppercase tracking-widest text-[#2563FF] bg-[#2563FF]/10 hover:bg-[#2563FF]/20 py-2.5 px-5 rounded-[12px] transition-all border border-[#2563FF]/20 flex items-center gap-2"><Copy size={16}/> Copiar Lista</button>)}
                  </div>
                  <div className={`${UI.card} overflow-hidden flex flex-col h-[400px] p-0`}>
                    {evtCalculoBase.filter(e => (utils.safeNum(e.total)-utils.safeNum(e.abono))>0 && utils.normalizeText(e.estado)!=='completado').length === 0 ? (<div className="flex-1 flex flex-col items-center justify-center p-8 opacity-60"><CheckCircle2 size={48} className="text-emerald-500 mb-4"/><p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Sin deudas en este período.</p></div>) : (<div className="overflow-y-auto flex-1 scrollbar-hide p-4 space-y-2">{evtCalculoBase.filter(e => (utils.safeNum(e.total)-utils.safeNum(e.abono))>0 && utils.normalizeText(e.estado)!=='completado').map((ev) => (<div key={ev.id} className="w-full flex justify-between items-center p-5 rounded-[20px] bg-white/80 hover:bg-white transition-all duration-300 border border-slate-200/50"><div className="flex flex-col min-w-0 flex-1 pr-4"><p className="font-extrabold capitalize text-[16px] text-slate-900 truncate tracking-tight">{String(ev.cliente || '')}</p><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-1.5">{ev.fecha ? String(ev.fecha).split('-').reverse().join('/') : ''}</p></div><div className="text-right shrink-0"><span className="text-rose-500 font-extrabold text-2xl block leading-none mb-2.5 tracking-tight">${(utils.safeNum(ev.total) - utils.safeNum(ev.abono)).toFixed(2)}</span><button type="button" onClick={() => sendWhatsAppCall(ev, 'recordatorio', appSettings.empresa)} className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-emerald-500 transition-colors flex items-center justify-end gap-1.5 ml-auto">Cobrar <MessageCircle size={14}/></button></div></div>))}</div>)}
                  </div>
                </div>
                <div className="flex flex-col gap-5 animate-fadeInUp" style={{animationDelay: '400ms'}}>
                  <div className="flex justify-between items-center px-2">
                      <h4 className="font-extrabold text-xl text-slate-900 flex items-center gap-3 tracking-tight"><FileSpreadsheet size={22} className="text-emerald-500"/> Detalle de Eventos <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">({financePeriod === 'todos' ? 'Todos' : `${NOMBRES_MESES[financeMonth - 1]}`})</span></h4>
                  </div>
                  <div className={`${UI.card} overflow-hidden flex flex-col h-[400px] p-0`}>
                      {evtCalculoBase.length === 0 ? (<div className="flex-1 flex flex-col items-center justify-center p-8 opacity-60"><Info size={48} className="text-slate-300 mb-4"/><p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">No hay transacciones registradas.</p></div>) : (<div className="overflow-y-auto flex-1 scrollbar-hide p-4 space-y-2">{evtCalculoBase.map((e)=><TransactionItem key={e.id} ev={e} isExpanded={expandedFinanceId===e.id} onToggleExpand={handleToggleFinance} utils={utils}/>)}</div>)}
                  </div>
                </div>
             </div>
          </div>
      );
  };

  const renderConfig = () => {
    return (
      <div className="animate-fadeIn p-4 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-6 pb-32 relative z-10">
          <div className="mb-8"><h2 className={UI.title}>Ajustes</h2><p className="text-base font-medium text-slate-500 mt-2">Centro de Mando Diverty</p></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              <div className="col-span-1 lg:col-span-2 bg-white/90 backdrop-blur-xl rounded-[32px] p-8 sm:p-10 shadow-sm relative overflow-hidden flex flex-col justify-between border border-slate-200/80 animate-fadeInUp"><div className="absolute -top-32 -right-32 w-64 h-64 bg-[radial-gradient(circle,rgba(37,99,235,0.06)_0%,transparent_60%)] pointer-events-none transform-gpu"></div><div className="absolute -bottom-32 -left-32 w-64 h-64 bg-[radial-gradient(circle,rgba(124,58,237,0.06)_0%,transparent_60%)] pointer-events-none transform-gpu"></div><div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6"><div className="w-24 h-24 rounded-[24px] bg-gradient-to-tr from-[#2563FF] to-[#7C3AED] p-[3px] shadow-lg shrink-0"><img src={LOGO_URL} className="w-full h-full object-contain rounded-[21px] bg-white p-3" alt="Diverty Profile" crossOrigin="anonymous"/></div><div><h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">Administrador Global</h3><p className={`text-sm font-bold tracking-[0.25em] uppercase mt-2 flex items-center gap-2.5 ${isOnline ? 'text-[#2563FF]' : 'text-amber-500'}`}><Cloud size={16} className={isOnline ? 'text-emerald-500' : 'text-amber-500 animate-pulse'}/> {isOnline ? 'En Línea con Firebase' : 'Trabajando Offline'}</p></div></div><div className="relative z-10 mt-10 flex flex-col sm:flex-row gap-5 border-t border-slate-200/60 pt-8"><button type="button" onClick={activarNotificaciones} className="flex-1 flex items-center justify-center gap-2.5 bg-[#2563FF]/10 hover:bg-[#2563FF]/20 text-[#2563FF] py-4 rounded-[16px] transition-all border border-[#2563FF]/20 font-bold text-sm shadow-sm"><BellRing size={20}/> Obtener Token Push</button><button type="button" onClick={handleLogout} className="flex-1 flex items-center justify-center gap-2.5 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-500 py-4 rounded-[16px] transition-all border border-slate-200/80 hover:border-rose-200 font-bold text-sm"><Lock size={20}/> Cerrar Sesión</button></div></div>
              <div className={`${UI.card} p-8 sm:p-10 flex flex-col relative overflow-hidden animate-fadeInUp`} style={{animationDelay:'100ms'}}><div className="absolute -top-10 -right-10 w-32 h-32 bg-[radial-gradient(circle,rgba(251,191,36,0.1)_0%,transparent_60%)] pointer-events-none transform-gpu"></div><h4 className="font-extrabold text-slate-900 flex items-center gap-3 mb-6 text-xl tracking-tight relative z-10"><Award size={26} className="text-amber-500"/> Meta Mensual</h4><div className="relative z-10 flex-1 flex flex-col"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2.5 block">Objetivo de ventas ($)</label><div className="relative mb-5"><span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-xl">$</span><input type="number" value={appSettings.metaMensual} onChange={e => updateSettings({...appSettings, metaMensual: utils.safeNum(e.target.value)})} className="w-full bg-slate-50/80 backdrop-blur-sm border border-slate-200/80 rounded-[16px] py-4 pl-10 pr-5 text-2xl font-extrabold text-slate-900 outline-none focus:border-[#2563FF]/50 focus:ring-4 focus:ring-[#2563FF]/10 transition-all shadow-sm" /></div><p className="text-[11px] text-slate-500 font-medium mt-auto bg-slate-50/50 backdrop-blur-sm p-4 rounded-[16px] border border-slate-100/80 leading-relaxed shadow-sm">Al actualizar este valor, las raíces de rentabilidad se recalcularán automáticamente.</p></div></div>
              <div className={`col-span-1 lg:col-span-3 ${UI.card} p-8 sm:p-10 animate-fadeInUp`} style={{animationDelay:'200ms'}}><div className="flex justify-between items-center mb-8 border-b border-slate-200/60 pb-6"><h4 className="font-extrabold text-2xl text-slate-900 flex items-center gap-3 tracking-tight"><Briefcase size={28} className="text-[#2563FF]"/> Facturación y Banco</h4><Badge color="blue"><Save size={14}/> Autoguardado</Badge></div><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">{[ { key: 'nombreTitular', label: 'Nombre del Titular o Empresa' }, { key: 'ruc', label: 'RUC / Identificación' }, { key: 'banco', label: 'Entidad Bancaria' }, { key: 'tipoCuenta', label: 'Tipo de Cuenta' }, { key: 'numeroCuenta', label: 'Número de Cuenta' }, { key: 'telefono', label: 'Teléfono (Yappy / Contacto)' } ].map(f => (<Field key={f.key} label={f.label} value={appSettings.empresa[f.key]} onChange={e => updateSettings({...appSettings, empresa: {...appSettings.empresa, [f.key]: e.target.value}})} />))}</div><div className="mt-8 bg-blue-50/80 backdrop-blur-sm p-5 rounded-[16px] border border-blue-100 flex items-start gap-4 shadow-sm"><Info size={20} className="text-[#2563FF] shrink-0 mt-0.5"/><p className="text-[11px] font-medium text-slate-700 leading-relaxed">Estos datos se insertarán automáticamente en todos los PDFs de contratos, facturas y en los mensajes de WhatsApp que envíes a tus clientes.</p></div></div>
              <div className="col-span-1 lg:col-span-3 bg-rose-50/80 backdrop-blur-sm border border-dashed border-rose-200 rounded-[32px] p-8 sm:p-10 mt-4 animate-fadeInUp flex flex-col sm:flex-row items-center justify-between gap-6 transition-all hover:bg-rose-100" style={{animationDelay:'300ms'}}><div><h4 className="font-extrabold text-rose-600 text-2xl flex items-center gap-3 tracking-tight"><AlertTriangle size={28}/> Zona de Peligro</h4><p className="text-[15px] font-medium text-rose-500 mt-3 max-w-xl leading-relaxed">Esta acción purgará toda la base de datos local y en la nube. Se eliminarán todas las reservas, el historial de clientes y los registros financieros de forma permanente.</p></div><button type="button" onClick={handleWipeAll} className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-bold py-5 px-8 rounded-[16px] shadow-lg transition-all uppercase tracking-[0.2em] text-[13px] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"><Trash2 size={20}/> Purgar Sistema</button></div>
          </div>
      </div>
    );
  };

  if (isAuthLoading) return (<div className="font-outfit min-h-[100dvh] flex flex-col items-center justify-center bg-[#F8FAFC]"><div className="w-12 h-12 border-4 border-[#2563FF]/20 border-t-[#2563FF] rounded-full animate-spin mb-4 shadow-sm"></div><p className="text-slate-400 text-sm font-bold uppercase tracking-[0.2em] animate-pulse">Iniciando</p></div>);
  
  if (!isAuthenticated) return (
    <div className="font-outfit min-h-[100dvh] flex items-center justify-center p-4 relative overflow-hidden bg-[#F8FAFC]">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-gradient-to-br from-[#2563FF]/10 to-[#7C3AED]/10 blur-[120px] rounded-full mix-blend-multiply animate-[pulse_8s_ease-in-out_infinite]"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-gradient-to-tl from-[#FF3EA5]/10 to-[#7C3AED]/10 blur-[120px] rounded-full mix-blend-multiply animate-[pulse_10s_ease-in-out_infinite]"></div>
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay"></div>
      </div>
      <div className="w-full max-w-[440px] bg-white/70 backdrop-blur-3xl rounded-[40px] p-8 sm:p-12 shadow-[0_40px_100px_-20px_rgba(37,99,235,0.15),inset_0_0_0_1px_rgba(255,255,255,1)] relative z-10 animate-fadeInUp">
        <div className="absolute -top-12 -right-12 text-amber-300/40 rotate-12 animate-pulse"><Sparkles size={120} strokeWidth={1} /></div>
        <div className="flex justify-center mb-8 relative">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#2563FF] to-[#FF3EA5] blur-xl opacity-30 rounded-[28px] animate-pulse"></div>
            <div className="relative w-28 h-28 rounded-[28px] bg-white p-4 shadow-xl border border-slate-100 flex items-center justify-center transform transition-transform hover:scale-105 duration-500">
              <img src={LOGO_URL} alt="Diverty" className="w-full h-full object-contain" crossOrigin="anonymous"/>
            </div>
            <div className="absolute -bottom-3 -right-3 bg-gradient-to-r from-amber-400 to-orange-500 w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg border-2 border-white rotate-12">
               <Star className="text-white fill-white" size={20} />
            </div>
          </div>
        </div>
        <div className="text-center mb-10"><h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Portal Diverty</h1><p className="text-slate-500 font-bold tracking-[0.2em] uppercase text-[10px]">Gestión de Eventos Premium</p></div>
        <form onSubmit={handleLogin} className="space-y-5 relative z-10">
          <div className="relative group"><div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><Users size={20} className="text-slate-400 group-focus-within:text-[#2563FF] transition-colors" /></div><input type="email" required value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="Correo Electrónico" className="w-full bg-white/80 focus:bg-white border border-slate-200 focus:border-[#2563FF] rounded-2xl py-4 pl-14 pr-5 text-[15px] font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-[#2563FF]/10 transition-all shadow-sm placeholder:text-slate-400" /></div>
          <div className="relative group"><div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><Lock size={20} className="text-slate-400 group-focus-within:text-[#2563FF] transition-colors" /></div><input type="password" required value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Contraseña" className="w-full bg-white/80 focus:bg-white border border-slate-200 focus:border-[#2563FF] rounded-2xl py-4 pl-14 pr-5 text-[15px] font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-[#2563FF]/10 transition-all shadow-sm placeholder:text-slate-400 tracking-[0.2em] placeholder:tracking-normal" /></div>
          <button type="submit" className="w-full bg-[length:200%_auto] bg-gradient-to-r from-[#2563FF] via-[#7C3AED] to-[#FF3EA5] hover:bg-[100%_center] text-white font-black text-[15px] uppercase tracking-widest py-4 rounded-2xl shadow-[0_10px_30px_rgba(124,58,237,0.3)] hover:shadow-[0_15px_40px_rgba(124,58,237,0.4)] transition-all active:scale-[0.96] flex items-center justify-center gap-3 mt-8 relative overflow-hidden group">
             <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
             <span className="relative z-10 flex items-center gap-2">Ingresar <Sparkles size={20} /></span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="font-outfit min-h-[100dvh] flex overflow-hidden selection:bg-[#2563FF]/30 transition-colors duration-200 relative bg-[#F8FAFC] text-slate-900">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap'); .font-outfit{font-family:'Outfit',sans-serif;} @keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideLeft{from{transform:translateX(100%)}to{transform:translateX(0)}} @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}} .animate-fadeIn{animation:fadeIn 0.3s ease-out forwards;} .animate-slideLeft{animation:slideLeft 0.3s cubic-bezier(0.16,1,0.3,1) forwards;} .animate-slideUp{animation:slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards;} .animate-fadeInUp{animation:fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards;} @keyframes pulse-slow{0%,100%{opacity:0.04;transform:scale(1);}50%{opacity:0.06;transform:scale(1.05);}} .animate-pulse-slow{animation:pulse-slow 10s ease-in-out infinite;} @keyframes spin-slow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} .animate-spin-slow{animation:spin-slow 15s linear infinite;} ::-webkit-scrollbar{display:none;} input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;} .pb-safe{padding-bottom: env(safe-area-inset-bottom);}`}</style>
      <Bg /><Toast alert={toastAlert} /><Confirm modal={confirmModal} setModal={setConfirmModal} />
      <NotifModal isOpen={isNotifOpen} onClose={()=>setIsNotifOpen(false)} eventosActivos={eventosActivos} openModal={openModal} />
      <EventFormModal isOpen={modalConfig.isOpen} initialData={modalConfig.initialData} isCotizacionMode={modalConfig.isCotizacion} onClose={closeModal} onSave={handleSaveFromModal} PAQUETES={catalogoPaquetes} onAddCustomService={handleAddCustomService} showAlert={showAlert} clientesRegistrados={clientsList} listadoProveedores={proveedores} />
      <ClientEditModal isOpen={clientEditModal.isOpen} oldName={clientEditModal.oldName} onClose={() => setClientEditModal({isOpen:false, oldName:''})} onSave={handleSaveClientName} />
      <ProveedorModal isOpen={proveedorModal.isOpen} data={proveedorModal.data} onClose={() => setProveedorModal({isOpen:false, data:null})} onSave={handleSaveProveedor} />
      
      <div className="flex-1 flex flex-col min-w-0 relative z-10 h-[100dvh] overflow-hidden">
          <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 p-4 flex justify-between items-center z-40 sticky top-0 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
             <div className="flex items-center gap-3"><div className="bg-white p-1.5 rounded-xl border border-slate-200/80 shadow-sm"><img src={LOGO_URL} alt="Logo" className="h-6 w-6 object-contain" /></div><h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">Diverty CRM {!isOnline && <Cloud size={18} className="text-amber-500 animate-pulse"/>}</h1></div>
             <button onClick={() => setIsNotifOpen(true)} className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all">
                <BellRing size={22} />
                {eventosActivos.filter(e => utils.normalizeText(e.estado) === 'pendiente').length > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border border-white animate-pulse"></span>}
             </button>
          </header>
          <main id="main-content" className="flex-1 overflow-y-auto scroll-smooth pb-24 overscroll-y-none relative">
            {activeTab === 'inicio' && renderInicio()}
            {activeTab === 'eventos' && renderEventos()}
            {activeTab === 'clientes' && renderClientes()}
            {activeTab === 'proveedores' && renderProveedores()}
            {activeTab === 'finanzas' && renderFinanzas()}
            {activeTab === 'config' && renderConfig()}
          </main>
      </div>

      <nav className="fixed bottom-0 w-full bg-white/95 backdrop-blur-2xl border-t border-slate-200 flex justify-around items-center pb-safe pt-2 px-2 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] h-16">
         {NAV_ITEMS.map(i => {
            const Ic = i.icon; const a = activeTab === i.id;
            return (
              <button key={i.id} onClick={() => handleTabChange(i.id)} className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-all ${a ? 'text-[#2563FF] scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
                 <Ic size={a?22:20} strokeWidth={a?2.5:2} className={a ? 'drop-shadow-md' : ''}/>
                 <span className={`text-[9px] uppercase tracking-wider ${a?'font-black':'font-bold'}`}>{i.text}</span>
              </button>
            )
         })}
      </nav>
    </div>
  );
}
