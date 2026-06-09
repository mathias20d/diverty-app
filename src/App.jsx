import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Calendar, Users, Settings, Plus, Edit, Trash2, X, FileSignature, Clock, MapPin, Info, Download, Receipt, MessageCircle, RefreshCw, AlertTriangle, CheckCircle2, Cloud, Search, CalendarDays, ChevronRight, ChevronLeft, Star, BellRing, TrendingUp, DollarSign, Briefcase, Lock, Smartphone, FileText, Check, Sparkles, Map as MapIcon, Navigation, Zap, PieChart, ChevronDown, Moon, Sun, Award, FileSpreadsheet, Copy, MessageSquareText, Share2, Home, Menu, BarChart3, ArrowUpRight, ArrowDownRight, ArrowDownWideNarrow, Save, Minus, Printer, ShieldCheck } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

// --- 1. CONFIGURACIÓN GLOBAL ---
const firebaseConfig = { apiKey: "AIzaSyDxE2E1KMuZU523k8oWHabi1jDrFxPOD-0", authDomain: "diverty-eventos.firebaseapp.com", projectId: "diverty-eventos", storageBucket: "diverty-eventos.firebasestorage.app", messagingSenderId: "491130670516", appId: "1:491130670516:web:8c80abd09ccc92c194f6e1" };
const app = initializeApp(firebaseConfig); const db = getFirestore(app); const auth = getAuth(app); const appId = "diverty-oficial";
const LOGO_URL = 'https://i.postimg.cc/GhFd4tcm/1000047880.png'; const META_MENSUAL = 1500;
const DATOS_EMPRESA = { nombreTitular: "AILEN DENNISKA CAMARENA MENDOZA", ruc: "Panamá RUC DV 79 8 957349", banco: "Banco General", tipoCuenta: "Cuenta de ahorros", numeroCuenta: "0472960083979", telefono: "6667-7965", email: "corporativo@divertyeventos.online", web: "Divertyeventos.online" };
const ZONAS_TRANSPORTE = { "Panamá Centro": 0, "San Miguelito": 5, "Panamá Norte": 10, "Panamá Este": 10, "Arraiján / Chorrera": 15, "Colón": 25 };
const NAV_ITEMS = [ {id:'inicio', icon:Home, text:'Inicio'}, {id:'eventos', icon:Calendar, text:'Agenda'}, {id:'clientes', icon:Users, text:'Clientes'}, {id:'finanzas', icon:PieChart, text:'Finanzas'}, {id:'config', icon:Settings, text:'Ajustes'} ];
const defaultFormData = Object.freeze({ cliente: '', ruc: '', email: '', telefono: '', tipoEvento: 'Cumpleaños', ninos: '', fecha: '', hora: '', ubicacion: 'Panamá Centro', direccion: '', comentarios: '', servicio: '', serviciosSeleccionados: [], transporte: '', gastos: '', detalleGastos: '', total: '', abono: '', estado: 'Pendiente', colisionAprobada: false });
const getDocRef = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'eventos', id); const getConfigRef = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'configuracion', id);

// NOMBRES DE LOS MESES
const NOMBRES_MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// --- 2. DICCIONARIO DE ESTILOS PREMIUM LIGHT (GLASSMORPHISM) ---
const UI = {
    card: "bg-white/85 backdrop-blur-xl border border-slate-200/60 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] relative overflow-hidden group hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] hover:border-slate-300/80 transition-all duration-500",
    modal: "bg-white/95 backdrop-blur-2xl rounded-t-[32px] sm:rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-slate-200/50 transition-transform duration-300", 
    input: "w-full bg-slate-50/50 backdrop-blur-sm focus:bg-white border border-slate-200 focus:border-[#2563FF]/50 rounded-2xl p-4 text-[15px] font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-[#2563FF]/10 transition-all placeholder:text-slate-400 shadow-sm", 
    searchInput: "w-full h-[56px] bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-[16px] pl-12 pr-12 text-[15px] font-semibold text-slate-900 outline-none focus:border-[#2563FF]/50 focus:ring-4 focus:ring-[#2563FF]/10 transition-all duration-300 shadow-sm placeholder:text-slate-400",
    label: "block text-[10px] uppercase text-slate-500 font-extrabold tracking-[0.2em] mb-2 ml-1", 
    title: "text-4xl sm:text-5xl font-black text-slate-900 tracking-tight drop-shadow-sm",
    btnBase: "font-bold rounded-[16px] transition-all duration-300 ease-out active:scale-[0.98] flex items-center justify-center gap-2.5 px-5 py-3.5 relative overflow-hidden",
    btnPrimary: "bg-gradient-to-r from-[#2563FF] to-[#7C3AED] text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_12px_25px_rgba(124,58,237,0.35)] before:absolute before:inset-0 before:bg-white/20 before:opacity-0 hover:before:opacity-100",
    btnDefault: "bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-sm",
    innerBox: "bg-slate-50/50 backdrop-blur-sm rounded-2xl p-5 sm:p-6 border border-slate-200/50 mb-6 relative overflow-hidden shadow-sm", flexCenter: "flex justify-center items-center", flexBetween: "flex justify-between items-center"
};
const COLORS = { blue: 'bg-[#2563FF]/10 text-[#2563FF] border-[#2563FF]/20', rose: 'bg-[#FF3EA5]/10 text-[#FF3EA5] border-[#FF3EA5]/20', amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20', emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', teal: 'bg-teal-500/10 text-teal-500 border-teal-500/20', purple: 'bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20' };

// --- 3. UTILIDADES Y LÓGICA ---
export const utils = {
  normalizeText: (t) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""), 
  getSafeLocal: (k) => { try { return localStorage.getItem(k); } catch(e) { return null; } }, 
  setSafeLocal: (k, v) => { try { localStorage.setItem(k, v); } catch(e) {} },
  triggerHaptic: (t = 'light') => { if (window?.navigator?.vibrate) try { window.navigator.vibrate(t === 'light' ? 30 : 50); } catch (e) {} }, 
  safeNum: (v) => { if (typeof v === 'number') return isNaN(v) ? 0 : v; if (!v) return 0; const p = parseFloat(String(v).replace(/[^0-9.-]/g, '')); return isNaN(p) ? 0 : p; },
  formatTime12h: (t) => { if (!t) return 'Por definir'; const [h, m] = String(t).split(':'); if (!h || !m) return t; let hrs = parseInt(h, 10); const suf = hrs >= 12 ? 'PM' : 'AM'; return `${hrs % 12 || 12}:${m} ${suf}`; },
  getLocalYYYYMMDD: (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  getWeekRange: (b = new Date()) => { const t = new Date(b), d = t.getDay() === 0 ? -6 : 1 - t.getDay(), s = new Date(t); s.setDate(t.getDate() + d); s.setHours(0, 0, 0, 0); const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999); return { start: s, end: e }; },
  
  openWhatsAppBusiness: (phone, msg) => { 
      const text = encodeURIComponent(msg);
      const url = `https://api.whatsapp.com/send?phone=${phone}&text=${text}`;
      
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }
};

function getWhatsAppMessage(ev, type, empresa) {
    const tot = utils.safeNum(ev.total), abo = utils.safeNum(ev.abono), saldo = (tot - abo).toFixed(2), fec = String(ev.fecha||'').split('-').reverse().join('/'), hor = utils.formatTime12h(ev.hora);
    switch(type) {
        case 'cotizacion': return `¡Hola *${ev.cliente}*! ✨\nTe comparto la cotización para tu evento el *${fec}*.\n🎉 *Paquetes:* ${ev.servicio}\n💰 *Inversión Total:* $${tot.toFixed(2)}\n\n*He adjuntado el PDF con todos los detalles a este mensaje.*\n\nSi deseas agendar, puedes confirmarnos por aquí. ¡Estamos a la orden! 🥳`;
        case 'recibo': return `¡Hola *${ev.cliente}*! 🥳\nTu reserva está *Confirmada* ✅\n📅 *Fecha:* ${fec}\n⏰ *Hora:* ${hor}\n📍 *Lugar:* ${ev.ubicacion}\n💰 *Total:* $${tot.toFixed(2)}\n💳 *Abono recibido:* $${abo.toFixed(2)}\n⚠️ *Saldo a cancelar en evento:* $${saldo}\n\n*Te adjunto el recibo oficial en PDF.*\n¡Gracias por preferirnos! ✨`;
        case 'recordatorio': return `¡Hola *${ev.cliente}*! 🥳\n¡Se acerca tu gran día! Recuerda tu evento para el *${fec}* a las *${hor}*.\n📍 Llegaremos a *${ev.ubicacion}*.\n💰 Saldo pendiente: *$${saldo}*.\n¡Nos vemos pronto para la diversión! ✨`;
        case 'cobro': return `¡Hola *${ev.cliente}*! 👋\nTe contactamos de Diverty Eventos.\nTe recordamos amablemente que tienes un saldo pendiente de *$${saldo}* para asegurar tu fecha del *${fec}*.\n\nSi deseas realizar el abono mediante Yappy o Transferencia, por favor avísanos por aquí. ¡Estamos a tu disposición! ✨`;
        case 'banco': return `¡Hola *${ev.cliente}*! 👋\nNuestros datos bancarios:\n🏦 *Banco:* ${empresa.banco}\n📋 *Tipo:* ${empresa.tipoCuenta}\n🔢 *Cuenta:* ${empresa.numeroCuenta}\n👤 *Nombre:* ${empresa.nombreTitular}\nPor favor envía comprobante. ¡Gracias! ✨`;
        case 'agradecimiento': default: return `¡Hola *${ev.cliente}*! 🌟\n¡GRACIAS por permitirnos estar en tu evento!\n¿Qué tal la pasaron? Nos encantaría ver fotitos 📸🎉\n¡Un abrazo mágico de todo el equipo! ✨`;
    }
}

// --- 4. MICRO-COMPONENTES VISUALES ---
const Bg = () => (<div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#F8FAFC]"><div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:32px_32px] opacity-40"></div><div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-[#2563FF] opacity-[0.04] blur-[120px] rounded-full mix-blend-multiply animate-[pulse_10s_ease-in-out_infinite]"></div><div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-[#7C3AED] opacity-[0.04] blur-[120px] rounded-full mix-blend-multiply animate-[pulse_12s_ease-in-out_infinite]"></div></div>);
const Toast = ({ alert }) => { if (!alert.isOpen) return null; return (<div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100000] w-[90%] max-w-sm animate-fadeIn"><div className={`px-5 py-4 rounded-2xl shadow-xl flex items-center gap-3 border text-white backdrop-blur-md ${alert.success ? 'bg-emerald-500/95 border-emerald-400' : 'bg-rose-500/95 border-rose-400'}`}>{alert.success ? <CheckCircle2 size={24}/> : <AlertTriangle size={24}/>}<p className="font-bold text-sm tracking-wide">{alert.message}</p></div></div>); };
const Confirm = ({ modal, setModal }) => { if (!modal.isOpen) return null; return (<div className="fixed inset-0 z-[100000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overscroll-none"><div className={`${UI.modal} max-w-md w-full text-center border-rose-200/50 p-8`}><div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-100"><AlertTriangle size={32} className="text-rose-500" /></div><h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">¿Estás seguro?</h3><p className="text-slate-500 font-medium mb-8 leading-relaxed">{modal.message}</p><div className="flex gap-4"><button type="button" onClick={() => setModal({ isOpen: false, message: '', onConfirm: null })} className="flex-1 py-3.5 rounded-xl font-bold uppercase tracking-wider text-slate-600 bg-slate-100/80 hover:bg-slate-200 transition-all border border-slate-200/50">Cancelar</button><button type="button" onClick={() => { if (modal.onConfirm) modal.onConfirm(); setModal({ isOpen: false, message: '', onConfirm: null }); }} className="flex-1 py-3.5 rounded-xl font-bold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 shadow-lg transition-all">Confirmar</button></div></div></div>); };
function EmptyState({ icon: Icon, title, message, actionBtn }) { return (<div className={`${UI.card} bg-white/30 backdrop-blur-sm p-10 text-center flex flex-col items-center justify-center animate-fadeIn w-full border-dashed border-slate-300 min-h-[300px]`}><div className={`w-24 h-24 rounded-[24px] flex justify-center items-center mb-6 border border-slate-200/50 relative overflow-hidden bg-white/80 rotate-3 transition-transform hover:rotate-0 duration-300 shadow-sm`}><Icon size={48} strokeWidth={1.5} className="relative z-10 text-[#2563FF]/60" /></div><h3 className="text-xl font-bold text-slate-800 mb-3 tracking-tight">{title}</h3><p className="text-sm font-medium text-slate-500 max-w-md mb-8 leading-relaxed">{message}</p>{actionBtn}</div>); }
function IconBox({ icon: Icon, color = 'blue', className = '' }) { return <div className={`p-2.5 rounded-xl border backdrop-blur-sm shadow-sm ${COLORS[color]} ${className}`}><Icon size={20}/></div>; }
function Badge({ children, color = 'blue', className = '' }) { const bgColors = { blue: 'bg-[#2563FF]/10 text-[#2563FF] border-[#2563FF]/20', rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20', amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20', amberSolid: 'bg-amber-100 text-amber-700 border-amber-200', emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', teal: 'bg-teal-500/10 text-teal-600 border-teal-500/20', gray: 'bg-slate-100 text-slate-600 border-slate-200/60' }; return <span className={`border px-3 py-1 rounded-[10px] text-[10px] sm:text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 shrink-0 shadow-sm backdrop-blur-sm ${bgColors[color]||bgColors.blue} ${className}`}>{children}</span>; }
function Field({ label, as = 'input', className = '', innerRef, children, ...props }) { return (<div className={className}>{label && <label className={UI.label}>{label}</label>}{as === 'input' && <input ref={innerRef} className={UI.input} {...props} />}{as === 'textarea' && <textarea ref={innerRef} className={`${UI.input} min-h-[80px] resize-none leading-relaxed`} {...props} />}{as === 'select' && <select ref={innerRef} className={`${UI.input} appearance-none cursor-pointer [&>option]:bg-white [&>option]:text-slate-900`} {...props}>{children}</select>}</div>); }
function ActionBtn({ icon: Icon, label, color = 'white', onClick }) { const btnClasses = { white: 'text-slate-600 hover:text-slate-900 bg-white/80 hover:bg-slate-50 border border-slate-200/80', blue: 'text-[#2563FF] bg-[#2563FF]/10 hover:bg-[#2563FF]/20 border border-[#2563FF]/10', rose: 'text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-100' }; return (<button type="button" onClick={onClick} className={`flex-1 font-bold py-3 flex items-center justify-center gap-2 text-xs uppercase tracking-widest active:scale-[0.98] transition-all duration-300 rounded-xl shadow-sm backdrop-blur-sm ${btnClasses[color]}`}><Icon size={16} strokeWidth={2}/> {label}</button>); }
function AppButton({ children, variant = 'primary', icon: Icon, onClick, className = '', ...props }) { return (<button type="button" onClick={onClick} className={`${UI.btnBase} ${variant === 'primary' ? UI.btnPrimary : UI.btnDefault} ${className}`} {...props}>{Icon && <Icon size={18} strokeWidth={2.5} className="shrink-0 relative z-10" />}<span className="truncate tracking-wide relative z-10">{children}</span></button>); }
function AppCard({ children, title, icon: Icon, iconColor = 'primary', className = '' }) { const c = { primary: "border-b-[#2563FF]/50", success: "border-b-emerald-400/50", danger: "border-b-rose-400/50", warning: "border-b-amber-400/50" }; const iconColors = { primary: "text-[#2563FF]", success: "text-emerald-500", danger: "text-rose-500", warning: "text-amber-500" }; return (<div className={`bg-white/90 backdrop-blur-xl border border-slate-200/80 border-b-2 rounded-[24px] p-6 sm:p-7 flex flex-col justify-center relative overflow-hidden transition-all duration-300 hover:shadow-lg ${c[iconColor] || ''} ${className}`}><div className="absolute -top-10 -right-10 w-32 h-32 bg-[radial-gradient(circle,rgba(0,0,0,0.03)_0%,transparent_60%)] pointer-events-none"></div>{(title || Icon) && (<div className="flex items-center gap-2.5 text-slate-500 mb-4 relative z-10">{Icon && <Icon size={20} className={iconColors[iconColor] || "text-slate-600"} strokeWidth={2.5} />}{title && <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-90">{title}</span>}</div>)}<div className="relative z-10 text-slate-900">{children}</div></div>); }
function useCountUp(end, duration = 1000) { const [count, setCount] = useState(0); useEffect(() => { if (end === 0) { setCount(0); return; } let start = 0, stepTime = 16, steps = duration / stepTime, increment = end / steps, timer; const delay = setTimeout(() => { timer = setInterval(() => { start += increment; if ((increment > 0 && start >= end) || (increment < 0 && start <= end)) { setCount(end); clearInterval(timer); } else { setCount(start); } }, stepTime); }, 200); return () => { clearTimeout(delay); if (timer) clearInterval(timer); }; }, [end, duration]); return count; }
function AnimatedProgress({ value }) { const [width, setWidth] = useState(0); const barRef = useRef(null); useEffect(() => { const o = new IntersectionObserver((e) => { if (e[0].isIntersecting) { setTimeout(() => setWidth(value), 200); o.disconnect(); } }, { threshold: 0.1 }); if (barRef.current) o.observe(barRef.current); return () => o.disconnect(); }, [value]); return (<div ref={barRef} className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden bg-slate-200 shadow-inner" style={{ width: `${width}%` }}><div className="absolute inset-0 bg-gradient-to-r from-[#2563FF] via-[#7C3AED] to-[#FF3EA5]"></div><div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-[200%] animate-[shimmer_2s_infinite]"></div></div>); }
function SkeletonCard() { return (<div className={`${UI.card} p-6 animate-pulse flex flex-col gap-4 h-[280px]`}><div className="flex justify-between w-full"><div className="h-5 bg-slate-200 rounded-full w-1/3"></div><div className="h-6 bg-slate-200 rounded-xl w-16"></div></div><div className="h-10 bg-slate-200 rounded-full w-3/4 mt-3"></div><div className="space-y-4 mt-4"><div className="h-4 bg-slate-200 rounded-full w-1/2"></div><div className="h-4 bg-slate-200 rounded-full w-2/3"></div></div><div className="mt-auto h-14 bg-slate-100/50 rounded-[16px] w-full border border-slate-200/50"></div></div>); }

// --- GENERADOR PDF REUTILIZABLE (DISEÑO ULTRA PREMIUM MÁGICO-CORPORATIVO) ---
function PdfTemplate({ printData, printType, pdfScale, onClose, onPrint, onShare, onDownload, appSettings, eventosActivos }) {
    const isC = printType === 'cotizacion', isFact = printType === 'factura', isContrato = printType === 'contrato';
    const tot = utils.safeNum(printData.total), trn = utils.safeNum(printData.transporte), abo = utils.safeNum(printData.abono), sub = (tot - trn).toFixed(2);
    const cli = String(printData.cliente||''), tel = String(printData.telefono||''), emailStr = String(printData.email||''), rucStr = String(printData.ruc||''), ubi = String(printData.ubicacion||''), dir = String(printData.direccion||'');
    const fechaDoc = String(printData.fecha||'').split('-').reverse().join('/'), horaStr = utils.formatTime12h(printData.hora);
    const sA = printData.serviciosSeleccionados?.length > 0 ? printData.serviciosSeleccionados : [{ nombre: String(printData.servicio||'Servicio General'), precio: sub, cantidad: 1, descripcion: String(printData.comentarios||'') }];
    const idx = [...eventosActivos].sort((a,b)=>new Date(a.createdAt||0).getTime()-new Date(b.createdAt||0).getTime()).findIndex(ev=>ev.id===printData.id);
    const numRef = isC ? `COT-${String(idx!==-1?idx+1:1).padStart(5,'0')}` : (isContrato ? `CON-${String(idx!==-1?idx+1:1).padStart(5,'0')}` : `FAC-${String(idx!==-1?idx+1:1).padStart(5,'0')}`);
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
                     
                     {/* Elementos Asimétricos Ultra Premium de Fondo */}
                     <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-gradient-to-bl from-[#2563FF]/8 to-[#7C3AED]/8 rounded-bl-[180px] z-0 pointer-events-none" />
                     <div className="absolute top-[280px] left-[-100px] w-[300px] h-[300px] bg-radial-gradient(circle,rgba(255,62,165,0.04)_0%,transparent_70%) z-0 pointer-events-none" />
                     <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-[#7C3AED]/5 to-[#2563FF]/5 rounded-tr-[240px] z-0 pointer-events-none" />

                     {/* Cabecera Estilo Mágico-Corporativo */}
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
                         <div className="absolute inset-0 flex items-center" aria-hidden="true">
                           <div className="w-full border-t border-slate-100"></div>
                         </div>
                         <div className="relative flex justify-center">
                           <span className="bg-white px-6 text-2xl font-black text-slate-900 tracking-[0.2em] uppercase bg-gradient-to-r from-[#2563FF] to-[#7C3AED] bg-clip-text text-transparent">
                             {isC ? 'COTIZACIÓN' : (isContrato ? 'CONTRATO DE SERVICIO' : 'FACTURA COMERCIAL')}
                           </span>
                         </div>
                       </div>
                     </div>

                     {/* Datos del Cliente y Detalles del Evento (Tarjetas Flotantes) */}
                     <div className="flex justify-between gap-6 mb-8 relative z-10">
                        <div className="w-1/2 bg-slate-50/70 p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                          <div>
                            <h3 className="text-[10px] font-black text-[#7C3AED] uppercase tracking-[0.2em] mb-4 pb-2 border-b border-slate-200/60 flex items-center gap-2">
                              <Users size={14} className="text-[#7C3AED]"/> Información del Cliente
                            </h3>
                            <div className="space-y-2.5 text-[12px] font-semibold text-slate-600">
                              <div className="flex justify-between gap-4"><span className="text-slate-400">Nombre:</span><span className="text-slate-950 font-extrabold truncate w-40 text-right capitalize">{cli}</span></div>
                              <div className="flex justify-between gap-4"><span className="text-slate-400">Teléfono:</span><span className="text-slate-950 font-extrabold text-right">{tel}</span></div>
                              {emailStr && <div className="flex justify-between gap-4"><span className="text-slate-400">Email:</span><span className="text-slate-950 font-extrabold truncate w-40 text-right break-all">{emailStr}</span></div>}
                              {rucStr && <div className="flex justify-between gap-4"><span className="text-slate-400">RUC / DV:</span><span className="text-slate-950 font-extrabold text-right">{rucStr}</span></div>}
                            </div>
                          </div>
                        </div>

                        <div className="w-1/2 bg-slate-50/70 p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                          <div>
                            <h3 className="text-[10px] font-black text-[#2563FF] uppercase tracking-[0.2em] mb-4 pb-2 border-b border-slate-200/60 flex items-center gap-2">
                              <MapPin size={14} className="text-[#2563FF]"/> Logística de Celebración
                            </h3>
                            <div className="space-y-2.5 text-[12px] font-semibold text-slate-600">
                              <div className="flex justify-between gap-4"><span className="text-slate-400">Fecha del Evento:</span><span className="text-slate-950 font-extrabold text-right">{fechaDoc}</span></div>
                              <div className="flex justify-between gap-4"><span className="text-slate-400">Horario Reservado:</span><span className="text-slate-950 font-extrabold text-right">{horaStr}</span></div>
                              <div className="flex justify-between gap-4"><span className="text-slate-400">Zona / Ciudad:</span><span className="text-slate-950 font-extrabold truncate w-32 text-right">{ubi}</span></div>
                              {dir && <div className="text-[11px] text-slate-500 italic mt-1 line-clamp-2 text-right">{dir}</div>}
                            </div>
                          </div>
                        </div>
                     </div>

                     {/* Tabla de Artículos Premium */}
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
                                             <div className="flex justify-center mb-2.5 text-[#2563FF]">
                                               <Star size={24} className="fill-[#2563FF]/10" strokeWidth={1.8}/>
                                             </div>
                                             <p className="font-extrabold text-slate-900 text-[13px] leading-tight">{String(s.nombre)}</p>
                                             {cant > 1 && (
                                               <p className="font-bold text-[#7C3AED] text-[10px] mt-2 bg-[#7C3AED]/8 py-1 rounded-md inline-block px-2.5">
                                                 {cant} Unidades
                                               </p>
                                             )}
                                           </td>
                                           <td className="py-5 px-6 border-r border-slate-100 align-top">
                                             <div className="text-slate-600 text-[11px] leading-relaxed space-y-2">
                                               {String(s.descripcion || 'Diversión premium para tu fiesta.').split('\n').map((line, j) => { 
                                                 const tLine = String(line).trim(); 
                                                 if(tLine.startsWith('•') || tLine.startsWith('-')) {
                                                   return (
                                                     <div key={j} className="flex items-start gap-2 font-semibold">
                                                       <CheckCircle2 size={13} className="text-[#2563FF] shrink-0 mt-[2px]"/> 
                                                       <span className="text-slate-700">{tLine.replace(/^[•-]\s*/, '')}</span>
                                                     </div>
                                                   );
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
                                           <div className="flex justify-center mb-1 text-[#2563FF]">
                                             <MapIcon size={22} strokeWidth={1.8}/>
                                           </div>
                                           <p className="font-extrabold text-slate-900 text-[13px]">Viáticos de Ruta</p>
                                         </td>
                                         <td className="py-4 px-6 border-r border-slate-100 align-middle text-[11px] text-slate-600 font-bold">
                                           <div className="flex items-center gap-2">
                                             <CheckCircle2 size={13} className="text-[#2563FF] shrink-0"/> 
                                             <span>Desplazamiento operativo y cobertura logística a zona: {ubi}</span>
                                           </div>
                                         </td>
                                         <td className="py-4 px-5 text-center align-middle">
                                           <p className="font-black text-slate-900 text-[15px]">B/. {trn.toFixed(2)}</p>
                                         </td>
                                       </tr>
                                     )}
                                 </tbody>
                             </table>
                        </div>
                     </div>

                     {/* Desglose, Métodos de Pago y Firmas */}
                     <div className="px-0 mt-2 flex justify-between gap-6 avoid-break relative z-10">
                         <div className="w-[53%]">
                           <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100 shadow-sm h-full flex flex-col justify-between">
                             <div>
                               <div className="flex items-center gap-2 mb-3 text-slate-800 border-b border-slate-200/60 pb-2">
                                 <Info size={16} className="text-[#2563FF]"/>
                                 <h3 className="font-black uppercase tracking-widest text-[10px]">Políticas y Condiciones</h3>
                               </div>
                               <div className="text-[10px] font-bold text-slate-500 leading-relaxed space-y-1.5">
                                 <p className="flex items-start gap-1"><span className="text-[#2563FF]">•</span> Para garantizar la fecha del evento, se requiere la confirmación formal mediante abono.</p>
                                 <p className="flex items-start gap-1"><span className="text-[#2563FF]">•</span> El abono inicial no es reembolsable por cancelación ajena a Diverty.</p>
                                 <p className="flex items-start gap-1"><span className="text-[#2563FF]">•</span> El saldo restante debe ser cancelado al culminar el show de entretenimiento.</p>
                               </div>
                             </div>
                           </div>
                         </div>
                         <div className="w-[43%] flex flex-col items-end">
                           <div className="w-full border border-slate-200/60 rounded-2xl overflow-hidden bg-slate-50 shadow-sm flex flex-col">
                             <div className="flex justify-between items-center py-3 px-5 border-b border-slate-200/60 text-[12px]">
                               <span className="font-extrabold text-slate-500">Inversión Show:</span>
                               <span className="font-black text-slate-900">B/. {tot.toFixed(2)}</span>
                             </div>
                             {!isC && abo > 0 && (
                               <div className="flex justify-between items-center py-3 px-5 border-b border-slate-200/60 text-[12px] bg-emerald-500/5">
                                 <span className="font-extrabold text-emerald-600">Abono Confirmado:</span>
                                 <span className="font-black text-emerald-600">- B/. {abo.toFixed(2)}</span>
                               </div>
                             )}
                             <div className="bg-gradient-to-r from-[#2563FF] to-[#7C3AED] text-white py-4.5 px-5 text-center">
                               <span className="block text-[10px] uppercase tracking-[0.2em] font-extrabold mb-1 opacity-90">
                                 {isC ? 'TOTAL PROPUESTO:' : 'SALDO PENDIENTE:'}
                                </span>
                               <span className="block text-3xl font-black leading-none">
                                 B/. {isC ? tot.toFixed(2) : (tot - abo).toFixed(2)}
                               </span>
                             </div>
                           </div>
                         </div>
                     </div>

                     {/* Bloque de Cierre: Firma de Contrato o Cuentas Bancarias */}
                     {!isC && (
                         <div className="mt-6 pb-2 avoid-break relative z-10">
                             {isContrato ? (
                               <div className="bg-slate-50/70 rounded-2xl border border-slate-100 p-5 flex flex-col gap-5 shadow-sm">
                                 <div className="text-[10px] text-slate-500 leading-relaxed border-b border-slate-200/60 pb-3">
                                   <h4 className="font-black text-slate-900 uppercase tracking-widest mb-1.5 text-[9px] flex items-center gap-1.5">
                                     <FileSignature size={13} className="text-[#7C3AED]"/> Compromiso y Mutuo Acuerdo
                                   </h4>
                                   <p className="font-bold">Las partes aceptan y se comprometen a respetar todas las cláusulas, tiempos de montaje y logística establecidos en el presente acuerdo para dar inicio al evento programado.</p>
                                 </div>
                                 <div className="flex justify-around items-end pt-4 pb-2">
                                   <div className="w-[42%] text-center">
                                     <div className="border-b border-slate-300 w-full mb-2 h-10 flex items-end justify-center"><span className="text-[13px] font-semibold text-slate-400 italic">AILEN DENNISKA C.</span></div>
                                     <p className="font-black text-slate-800 text-[10px] uppercase truncate">{appSettings.empresa.nombreTitular}</p>
                                     <p className="text-slate-400 text-[9px] font-extrabold uppercase tracking-widest">Diverty Eventos</p>
                                   </div>
                                   <div className="w-[42%] text-center">
                                     <div className="border-b border-slate-300 w-full mb-2 h-10"></div>
                                     <p className="font-black text-slate-800 text-[10px] uppercase truncate">{cli}</p>
                                     <p className="text-slate-400 text-[9px] font-extrabold uppercase tracking-widest">Firma del Cliente</p>
                                   </div>
                                 </div>
                               </div>
                             ) : (
                               <div className="bg-slate-50/70 rounded-2xl border border-slate-100 p-5 flex justify-between items-center text-[11px] shadow-sm">
                                 <div className="flex gap-4 border-r border-slate-200/60 pr-6 w-[55%]">
                                   <div className="text-[#2563FF] shrink-0 mt-1">
                                     <Briefcase size={20} strokeWidth={1.8}/>
                                   </div>
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
                                   <div className="text-[#2563FF] flex items-center gap-1.5 mb-2 font-black text-[12px] uppercase tracking-widest">
                                     <ShieldCheck size={18} /> ¡Garantía Diverty!
                                   </div>
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

// --- COMPONENTES SECUNDARIOS ---
function ClientCardItem({ c, idx, isExpanded, onToggleExpand, utils, openModal, onDeleteClient }) {
    const phoneClean=String(c.telefono).replace(/\D/g,''); const msgPromo=`¡Hola ${c.nombre}! 😊 Te saludamos de Diverty Eventos. Tenemos nuevas promociones exclusivas en nuestros paquetes infantiles. ¿Te gustaría conocerlas? 🎉`, msgSeguimiento=`¡Hola ${c.nombre}! 👋 Pasábamos a saludarte de Diverty Eventos. ¿Qué tal estuvo tu última fiesta con nosotros? ¡Nos encantaría saber de ti! ✨`, msgRecordatorio=`¡Hola ${c.nombre}! 🥳 Te recordamos que en Diverty Eventos estamos listos para hacer de tu próxima celebración un día inolvidable. ¡Escríbenos cuando lo necesites! 🎈`; const avatarGradients=['from-[#2563FF] to-[#7C3AED]','from-emerald-400 to-teal-600','from-[#FF3EA5] to-purple-600','from-[#2563FF] to-cyan-400'], grad=c.isVIP?'from-amber-400 via-orange-500 to-rose-500':avatarGradients[String(c.nombre).length%avatarGradients.length];
    return(
        <div className={`${UI.card} flex flex-col relative overflow-hidden transition-all duration-500 hover:-translate-y-2 animate-fadeInUp`} style={{animationFillMode:'both',animationDelay:`${idx*20}ms`}}>
            <div onClick={(e)=>{if(e){e.preventDefault();e.stopPropagation();}utils.triggerHaptic('light');onToggleExpand(c.nombre);}} className="p-5 sm:p-6 cursor-pointer flex items-center justify-between gap-4 relative z-10 bg-transparent transition-colors duration-200">
                <div className="flex items-center gap-4 flex-1 min-w-0"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl text-white shrink-0 shadow-md bg-gradient-to-tr ${grad}`}>{c.isVIP ? <Award size={20} className="drop-shadow-md" /> : String(c.nombre).charAt(0).toUpperCase()}</div><div className="flex-1 min-w-0"><h4 className="font-bold text-[17px] text-slate-900 capitalize truncate tracking-tight mb-1">{String(c.nombre)}</h4><p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Smartphone size={14} className="text-slate-400"/> {String(c.telefono)||'Sin número'}</p></div></div>
                <div className="text-right shrink-0"><p className="text-xl font-bold text-emerald-500 leading-none tracking-tight">${c.totalGastado.toFixed(0)}</p><div className="flex justify-end gap-1.5 mt-2.5">{c.isVIP && <span className="w-2 h-2 rounded-full bg-amber-400" title="VIP"></span>}{c.isFrecuente && <span className="w-2 h-2 rounded-full bg-indigo-400" title="Frecuente"></span>}{c.isNuevo && <span className="w-2 h-2 rounded-full bg-emerald-400" title="Nuevo"></span>}{c.needsContact && <span className="w-2 h-2 rounded-full bg-rose-400" title="Contactar"></span>}</div></div>
            </div>
            {isExpanded && (
                <div className="relative z-10 px-5 pb-5 animate-fadeIn border-t border-slate-100/50 mt-1 pt-4 bg-slate-50/50 rounded-b-[24px]">
                    <div className="flex justify-between items-center bg-white/80 p-4 rounded-[16px] mb-5 border border-slate-200/50 shadow-sm"><div className="text-center flex-1 border-r border-slate-100"><p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1.5">Eventos</p><p className="font-bold text-base text-slate-800">{c.eventos}</p></div><div className="text-center flex-1 border-r border-slate-100"><p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1.5">Último</p><p className="font-bold text-base text-slate-800">{c.ultimoEventoFecha?String(c.ultimoEventoFecha).split('-').reverse().join('/'):'N/A'}</p></div><div className="text-center flex-1"><p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1.5">Estado</p><p className="font-bold text-base text-slate-800 capitalize flex justify-center items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${String(c.ultimoEstado).toLowerCase()==='completado'?'bg-emerald-400':'bg-amber-400'}`}></span>{String(c.ultimoEstado).substring(0,4)}.</p></div></div>
                    <div className="flex gap-3 mb-4"><ActionBtn icon={Sparkles} label="Promo" color="white" onClick={(e)=>{e.stopPropagation();utils.openWhatsAppBusiness(phoneClean,msgPromo);}} /><ActionBtn icon={RefreshCw} label="Seguir" color="white" onClick={(e)=>{e.stopPropagation();utils.openWhatsAppBusiness(phoneClean,msgSeguimiento);}} /><ActionBtn icon={BellRing} label="Recordar" color="white" onClick={(e)=>{e.stopPropagation();utils.openWhatsAppBusiness(phoneClean,msgRecordatorio);}} /></div>
                    <div className="flex gap-3"><AppButton variant="primary" icon={Plus} onClick={(e)=>{e.stopPropagation();openModal()}} className="flex-1 text-[13px] uppercase tracking-wider py-3.5 shadow-md">Reservar</AppButton><button type="button" onClick={(e)=>{e.stopPropagation();onDeleteClient(c.nombre,c.eventos)}} className="px-5 bg-rose-50 text-rose-500 rounded-[16px] hover:bg-rose-100 transition-colors border border-rose-100"><Trash2 size={20} /></button></div>
                </div>
            )}
        </div>
    );
}

function TransactionItem({ ev, isExpanded, onToggleExpand, utils }) {
    const tot=utils.safeNum(ev.total),gas=utils.safeNum(ev.gastos),neta=tot-gas;
    return(
        <div className="group bg-white/80 backdrop-blur-sm rounded-[20px] mb-2 border border-slate-200/80 shadow-sm hover:border-slate-300 overflow-hidden transition-all">
            <button type="button" onClick={(e)=>{if(e){e.preventDefault();e.stopPropagation();}onToggleExpand(ev.id);}} className="w-full flex justify-between items-center p-5 bg-transparent hover:bg-slate-50/80 transition-colors duration-200 text-left active:scale-[0.99] text-slate-900"><div className="flex flex-col min-w-0 flex-1 pr-4"><p className="font-bold capitalize text-[16px] text-slate-900 truncate tracking-tight">{String(ev.cliente||'')}</p><p className="text-xs font-medium text-slate-500 mt-1.5">{ev.fecha?String(ev.fecha).split('-').reverse().join('/'):''} • {String(ev.tipoEvento||'').substring(0,15)}</p></div><div className="text-right shrink-0 flex items-center gap-4"><div className="flex flex-col items-end"><span className="font-bold text-emerald-500 text-lg leading-none block mb-2 tracking-tight">+${neta.toFixed(2)}</span>{gas>0&&<span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 leading-none px-2 py-1 bg-rose-50 rounded-lg border border-rose-100">Gastos: -${gas}</span>}</div><ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isExpanded?'rotate-180':''}`}/></div></button>
            {isExpanded&&(<div className="p-5 bg-slate-50/50 border-t border-slate-100/80 animate-fadeIn"><div className="flex justify-between items-center mb-3"><span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Ingreso Bruto</span><span className="font-bold text-[15px] text-slate-900">${tot.toFixed(2)}</span></div><div className="flex justify-between items-center mb-3"><span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Gastos Operativos</span><span className="font-bold text-[15px] text-rose-500">-${gas.toFixed(2)}</span></div>{ev.detalleGastos&&(<div className="mt-4 pt-4 border-t border-slate-200/60"><span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-2">Desglose:</span><p className="text-[13px] font-medium text-slate-600 italic leading-relaxed">{String(ev.detalleGastos)}</p></div>)}</div>)}
        </div>
    );
}

function EventCardItem({ ev, idx, todayTime, onWhatsApp, onViewDoc, onEdit, onDelete, onDuplicate, onMapClick, empresa, utils, onUpdateEstado, onConvertir }) {
    const [swipeX, setSwipeX] = useState(0), [isDragging, setIsDragging] = useState(false), [isExpanded, setIsExpanded] = useState(false); const startX = useRef(0);
    const handleTouchStart = useCallback((e) => { startX.current = e.touches[0].clientX; setIsDragging(true); }, []), handleTouchMove = useCallback((e) => { if (!isDragging) return; const diffX = e.touches[0].clientX - startX.current; setSwipeX(diffX > 0 ? Math.min(diffX, 120) : 0); }, [isDragging]), handleTouchEnd = useCallback(() => { setIsDragging(false); if (swipeX > 80) { utils.triggerHaptic('success'); onDelete(ev.id); } setSwipeX(0); }, [swipeX, ev.id, onDelete, utils]);
    const estNormalized=utils.normalizeText(ev.estado),isCotizacion=estNormalized.includes('cotizaci')||estNormalized.includes('cot.'); const tot=utils.safeNum(ev.total),abo=utils.safeNum(ev.abono),restante=Math.max(0,tot-abo);
    
    let sideColor="bg-slate-200",dotColor="bg-slate-300",waType='agradecimiento';
    if(estNormalized==='completado'){sideColor='bg-emerald-500';dotColor='bg-emerald-400';}
    else if(estNormalized.includes('aprobada')){sideColor='bg-teal-500';dotColor='bg-teal-400';}
    else if(estNormalized.includes('rechazada')){sideColor='bg-slate-400';dotColor='bg-slate-300';}
    else if(isCotizacion){sideColor='bg-amber-400';dotColor='bg-amber-400';waType='cotizacion';}
    else if(estNormalized==='confirmado'){sideColor='bg-[#2563FF]';dotColor='bg-[#2563FF]';waType='recordatorio';}
    else if(estNormalized==='pendiente'){sideColor='bg-amber-500';dotColor='bg-amber-500';waType='cobro';}
    else if(estNormalized==='cancelado'){sideColor='bg-rose-500';dotColor='bg-rose-500';}

    let diff=null,dateBadgeContent=null; if(ev.fecha){const[y,m,d]=String(ev.fecha).split('-');if(y&&m&&d){diff=Math.ceil((new Date(parseInt(y,10),parseInt(m,10)-1,parseInt(d,10)).getTime()-todayTime)/(1000*60*60*24));}}
    if(diff===0&&!isCotizacion)dateBadgeContent=<Badge color="rose"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm"></div> HOY</Badge>;
    else if(diff===1&&!isCotizacion)dateBadgeContent=<Badge color="amber">MAÑANA</Badge>;
    else if(isCotizacion){ if(estNormalized.includes('aprobada'))dateBadgeContent=<Badge color="teal">COT. Aprobada</Badge>; else if(estNormalized.includes('rechazada'))dateBadgeContent=<Badge color="gray">COT. Rechazada</Badge>; else dateBadgeContent=<Badge color="amberSolid"><FileText size={12}/> Cotización</Badge>; }

    return (
        <div className={`relative w-full ${UI.card} overflow-hidden`} style={{ animationFillMode: 'both', animationDelay: `${idx * 40}ms` }}>
            <div className={`absolute inset-0 bg-gradient-to-r from-rose-500 to-rose-400 flex items-center pl-8 transition-opacity duration-200 ${swipeX > 20 ? 'opacity-100 z-0' : 'opacity-0 -z-10'}`}><Trash2 size={24} className="text-white" /><span className="text-white font-bold ml-3 text-sm uppercase tracking-wider">Eliminar</span></div>
            <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} className="relative p-5 sm:p-6 transition-transform duration-200 ease-out z-10 bg-white/95 cursor-pointer text-slate-900" style={{ transform: `translateX(${swipeX}px)`, transition: isDragging ? 'none' : 'transform 0.2s ease-out' }} onClick={(e) => { e.stopPropagation(); utils.triggerHaptic('light'); setIsExpanded(p => !p); }}>
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-r-full ${sideColor} z-20`}></div>
                <div className="pl-3 relative z-10"><div className="flex justify-between items-center gap-4"><div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap"><div className="flex items-center gap-2 min-w-0"><div className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`}></div><h3 className="text-lg font-bold text-slate-900 truncate tracking-tight">{String(ev.cliente)}</h3></div><div className="flex items-center gap-2 shrink-0 mt-1 sm:mt-0">{dateBadgeContent}{ev.hora && (<Badge color="gray"><Clock size={12} strokeWidth={2.5}/> {utils.formatTime12h(ev.hora)}</Badge>)}</div></div>{!isExpanded && (<div className="flex items-center gap-4 shrink-0"><span className="text-slate-900 font-bold text-lg tracking-tight">${tot.toFixed(2)}</span>{isCotizacion ? null : (restante > 0 ? (<div className="bg-rose-50 text-rose-600 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-widest border border-rose-200 shadow-sm">Debe ${restante.toFixed(0)}</div>) : (<div className="flex items-center gap-1.5 text-emerald-500"><CheckCircle2 size={16} strokeWidth={2.5}/><span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Pagado</span></div>))}</div>)}</div>
                    <div className={`grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-6' : 'grid-rows-[0fr] opacity-0 mt-0'}`}><div className="overflow-hidden">
                            <div className="flex flex-col gap-4 mb-6 pt-2 text-slate-600"><div className="flex items-center gap-4"><Sparkles size={18} className="text-[#2563FF]/70 shrink-0" strokeWidth={2} /><span className="text-sm font-medium">{String(ev.servicio || 'Sin paquete asignado')}</span></div><div className="flex items-center gap-4"><Calendar size={18} className="text-[#2563FF]/70 shrink-0" strokeWidth={2} /><span className="text-sm font-medium">{ev.fecha ? String(ev.fecha).split('-').reverse().join('/') : 'Sin fecha'} • {ev.hora ? utils.formatTime12h(ev.hora) : 'Sin hora'}</span></div><div onClick={(e) => { e.stopPropagation(); onMapClick(ev.direccion, ev.ubicacion); }} className="flex justify-between items-center gap-4 cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-xl transition-colors active:scale-[0.98] border border-transparent hover:border-slate-100" title="Abrir en Google Maps"><div className="flex items-center gap-4 min-w-0"><MapPin size={18} className="text-[#2563FF]/70 shrink-0" strokeWidth={2} /><span className="text-sm font-medium truncate">{String(ev.ubicacion)} {ev.direccion ? `- ${String(ev.direccion)}` : ''}</span></div><div className="bg-slate-100 p-2 rounded-lg border border-slate-200"><MapIcon size={14} className="text-[#2563FF]" /></div></div><div className="flex items-center gap-4"><Smartphone size={18} className="text-[#2563FF]/70 shrink-0" strokeWidth={2} /><span className="text-sm font-medium">{String(ev.telefono || 'Sin teléfono')}</span></div></div>
                            <div className="bg-slate-50/80 rounded-2xl p-5 sm:p-6 border border-slate-200/50 mb-6 relative overflow-hidden"><div className="flex justify-between items-end mb-5"><div className="flex flex-col"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Total</span><span className="text-2xl font-black text-slate-900 tracking-tight leading-none">${tot.toFixed(2)}</span></div><div className="flex flex-col items-end"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Pendiente</span><span className={`text-2xl font-black tracking-tight leading-none ${restante > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>${restante.toFixed(2)}</span></div></div><div className="w-full bg-slate-200 rounded-full h-2 mb-3 overflow-hidden shadow-inner"><AnimatedProgress value={tot > 0 ? Math.min((abo / tot) * 100, 100) : 0} /></div><div className="flex justify-between items-center"><p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-widest">Recibido: <span className="text-slate-800">${abo.toFixed(2)}</span></p><p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{tot > 0 ? Math.round((abo/tot)*100) : 0}% pagado</p></div></div>
                            <div className="flex flex-col sm:flex-row gap-3"><AppButton onClick={(e) => { e.stopPropagation(); onWhatsApp(ev, waType, empresa); }} className="w-full sm:flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 border-emerald-500 shadow-md text-white" icon={MessageCircle}>Contactar</AppButton>{isCotizacion ? ( <div className="flex gap-3 w-full sm:flex-1"><AppButton onClick={(e) => { e.stopPropagation(); onViewDoc(ev, 'cotizacion'); }} variant="default" className="w-full" icon={FileText}>Ver PDF</AppButton></div> ) : ( <div className="flex gap-3 w-full sm:flex-1"><AppButton onClick={(e) => { e.stopPropagation(); onViewDoc(ev, 'factura'); }} variant="default" className="flex-1" icon={Receipt}>Factura</AppButton><AppButton onClick={(e) => { e.stopPropagation(); onViewDoc(ev, 'contrato'); }} variant="default" className="flex-1" icon={FileSignature}>Contrato</AppButton></div> )}</div>
                            {isCotizacion && (<div className="flex gap-3 mt-4 pt-4 border-t border-slate-100/80">{estNormalized === 'cotizacion' && (<><AppButton onClick={(e) => { e.stopPropagation(); onUpdateEstado(ev.id, 'Cot. Aprobada'); }} variant="success" className="flex-1 text-[11px] py-3 bg-emerald-500 text-white">Aprobar</AppButton><AppButton onClick={(e) => { e.stopPropagation(); onUpdateEstado(ev.id, 'Cot. Rechazada'); }} variant="default" className="flex-1 text-[11px] py-3 text-slate-500 border-slate-200">Rechazar</AppButton></>)}{estNormalized.includes('aprobada') && (<AppButton onClick={(e) => { e.stopPropagation(); onConvertir(ev); }} variant="primary" className="w-full text-xs py-3.5 shadow-md">Convertir en Reserva</AppButton>)}</div>)}
                            <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100/80"><ActionBtn icon={Edit} label="Editar" onClick={(e) => { e.stopPropagation(); onEdit(ev, isCotizacion); }} /><ActionBtn icon={Copy} label="Duplicar" color="blue" onClick={(e) => { e.stopPropagation(); onDuplicate(ev); }} /><ActionBtn icon={Trash2} label="Eliminar" color="rose" onClick={(e) => { e.stopPropagation(); onDelete(ev.id); }} /></div>
                    </div></div>
                </div>
            </div>
        </div>
    );
}

function EventFormModal({ isOpen, initialData, isCotizacionMode, onClose, onSave, PAQUETES, onAddCustomService, showAlert, clientesRegistrados }) {
    const [formData, setFormData] = useState(initialData || { ...defaultFormData, fecha: utils.getLocalYYYYMMDD(new Date()) });
    const [searchTermService, setSearchTermService] = useState(''); const [showDropdown, setShowDropdown] = useState(false); const [isCustomOpen, setIsCustomOpen] = useState(false); const [customData, setCustomData] = useState({ nombre: '', precio: '' });
    const [showClientDropdown, setShowClientDropdown] = useState(false); const nameInputRef = useRef(null);

    useEffect(()=>{ if(isOpen&&initialData){ setFormData(initialData); setSearchTermService(''); setShowDropdown(false); setIsCustomOpen(false); setShowClientDropdown(false); } },[isOpen,initialData]);
    useEffect(()=>{ if(isOpen && nameInputRef.current && (!initialData || !initialData.id) && window.innerWidth > 768){ const t=setTimeout(()=>nameInputRef.current.focus(), 400); return ()=>clearTimeout(t); } },[isOpen,initialData]);
    useEffect(()=>{ if(isOpen&&!isCotizacionMode&&(!initialData||!initialData.id)){const timer=setTimeout(()=>{utils.setSafeLocal('diverty_form_draft',JSON.stringify(formData));},800);return()=>clearTimeout(timer);} },[formData,isOpen,isCotizacionMode,initialData]);

    const filteredClientes = useMemo(() => { if (!formData.cliente || typeof formData.cliente !== 'string') return []; const search = utils.normalizeText(formData.cliente); return (clientesRegistrados || []).filter(c => utils.normalizeText(c.nombre).includes(search) || (c.telefono && utils.normalizeText(c.telefono).includes(search)) ).slice(0, 5); }, [formData.cliente, clientesRegistrados]);
    const handleSelectClient = useCallback((client) => { utils.triggerHaptic('light'); setFormData(prev => ({ ...prev, cliente: client.nombre || '', telefono: client.telefono || '', email: client.email || prev.email || '' })); setShowClientDropdown(false); }, []);
    const filteredPaquetes = useMemo(() => { if(!searchTermService)return PAQUETES; const s=utils.normalizeText(searchTermService); return PAQUETES.filter(p=>utils.normalizeText(p.nombre).includes(s)||utils.normalizeText(p.short||'').includes(s)); }, [searchTermService, PAQUETES]);

    const procesarServicios = useCallback((prev, newSelected) => { const sumPrecios=newSelected.reduce((sum,s)=>sum+utils.safeNum(s.precio),0); const newTotal=sumPrecios+utils.safeNum(prev.transporte)+utils.safeNum(prev.gastos); const resumenServicios=newSelected.map(s=>s.cantidad>1?`${s.nombre} (x${s.cantidad})`:s.nombre).join(' + '); return{...prev,serviciosSeleccionados:newSelected,servicio:resumenServicios,total:newTotal>0?newTotal.toString():''}; }, []);
    const addService = useCallback((pkg) => { utils.triggerHaptic('light'); setFormData(prev=>{ const actuales=Array.isArray(prev.serviciosSeleccionados)?[...prev.serviciosSeleccionados]:[]; const existeIdx=actuales.findIndex(s=>s.nombre===pkg.nombre); if(existeIdx!==-1){actuales[existeIdx].cantidad+=1;actuales[existeIdx].precio=actuales[existeIdx].precioOriginal*actuales[existeIdx].cantidad;} else{actuales.push({...pkg,cantidad:1,precioOriginal:pkg.precio,precio:pkg.precio});} return procesarServicios(prev,actuales); }); }, [procesarServicios]);
    const updateServiceQuantity = useCallback((idx, delta) => { utils.triggerHaptic('light'); setFormData(prev=>{ const actuales=[...prev.serviciosSeleccionados], nuevoItem={...actuales[idx]}; nuevoItem.cantidad=Math.max(1,nuevoItem.cantidad+delta); nuevoItem.precio=nuevoItem.precioOriginal*nuevoItem.cantidad; actuales[idx]=nuevoItem; return procesarServicios(prev,actuales); }); }, [procesarServicios]);
    const removeService = useCallback((idx) => { utils.triggerHaptic('light'); setFormData(prev=>{ const ns=[...prev.serviciosSeleccionados]; ns.splice(idx,1); return procesarServicios(prev,ns); }); }, [procesarServicios]);
    const handleServiceEdit = useCallback((idx, field, val) => { setFormData(prev=>{ const actuales=[...prev.serviciosSeleccionados], nuevoItem={...actuales[idx]}; if(field==='precio'){ const nuevoPrecio=utils.safeNum(val); nuevoItem.precio=nuevoPrecio; nuevoItem.precioOriginal=nuevoPrecio/Math.max(1,nuevoItem.cantidad||1); }else if(field==='descripcion'){nuevoItem.descripcion=val;} actuales[idx]=nuevoItem; return procesarServicios(prev,actuales); }); }, [procesarServicios]);
    const handleCreateCustom = useCallback(async () => { const newSrv=await onAddCustomService(customData.nombre,customData.precio); if(newSrv){addService(newSrv);setIsCustomOpen(false);setCustomData({nombre:'',precio:''});} }, [customData.nombre, customData.precio, onAddCustomService, addService]);
    const handleZoneChange = useCallback((e) => { const z=e.target.value, cost=ZONAS_TRANSPORTE[z]||0; setFormData(p=>({...p,ubicacion:z,transporte:cost.toString(),total:((Array.isArray(p.serviciosSeleccionados)?p.serviciosSeleccionados:[]).reduce((s,x)=>s+utils.safeNum(x.precio),0)+cost+utils.safeNum(p.gastos)).toString()})); }, []);
    const handleClearDraft = useCallback(() => { if(window.confirm("¿Deseas limpiar el formulario y empezar de cero?")){ setFormData({...defaultFormData,fecha:utils.getLocalYYYYMMDD(new Date())});utils.setSafeLocal('diverty_form_draft',''); } }, []);
    const handleSubmit = useCallback((e) => { e.preventDefault(); if(!formData.cliente?.trim())return showAlert("El nombre del cliente es obligatorio."); if(!formData.telefono?.trim())return showAlert("El teléfono es obligatorio."); if(!formData.fecha)return showAlert("La fecha del evento es obligatoria."); onSave(formData,isCotizacionMode); }, [formData, isCotizacionMode, onSave, showAlert]);

    if (!isOpen) return null; const opcionesEstado = isCotizacionMode ? ['Cotización', 'Cot. Aprobada', 'Cot. Rechazada'] : ['Pendiente', 'Confirmado', 'Completado'];
    return (
        <div className="fixed inset-0 z-[9998] bg-slate-900/40 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 animate-fadeIn">
            <div className={`${UI.modal} w-full h-[92vh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl flex flex-col overflow-hidden p-0 sm:p-0`}>
                 <div className="p-6 sm:p-8 border-b border-slate-200/50 flex justify-between items-center z-20 bg-white/95"><h3 className="font-black text-slate-900 text-2xl flex items-center gap-3 tracking-tight">{isCotizacionMode ? <FileText className="text-amber-500 drop-shadow-sm"/> : (initialData?.id && !initialData?.isDuplicated ? <Edit className="text-[#2563FF] drop-shadow-sm"/> : <Plus className="text-[#2563FF] drop-shadow-sm"/>)} {isCotizacionMode ? (initialData?.id ? 'Editar Cotización' : 'Nueva Cotización') : (initialData?.id && !initialData?.isDuplicated ? 'Editar Reserva' : 'Nueva Reserva')}</h3><div className="flex gap-3">{(!initialData?.id || initialData?.isDuplicated) && (<button onClick={handleClearDraft} type="button" className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 active:scale-[0.98] transition-colors border border-rose-200 shadow-sm"><Trash2 size={20}/></button>)}<button onClick={onClose} type="button" className="p-2.5 bg-slate-100 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-200 active:scale-[0.98] transition-colors border border-slate-200 shadow-sm"><X size={20}/></button></div></div>
                 <div className="overflow-y-auto flex-1 p-5 sm:p-8 bg-slate-50/90"><form onSubmit={handleSubmit} className="max-w-xl mx-auto pb-8 space-y-6">
                     
                     <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-5 sm:p-6 mb-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6"><IconBox icon={Users} color="blue" /><h4 className="font-extrabold text-slate-900 text-lg tracking-tight">Datos del Cliente</h4></div>
                        <div className="space-y-5">
                            <div className="relative z-40">
                                <Field innerRef={nameInputRef} label="Nombre *" required value={formData.cliente} onChange={e => {setFormData({...formData, cliente: e.target.value});setShowClientDropdown(true);}} onFocus={() => setShowClientDropdown(true)} onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)} autoComplete="off" />
                                {showClientDropdown && filteredClientes.length > 0 && (
                                    <div className="mt-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl max-h-48 overflow-y-auto shadow-xl">
                                        {filteredClientes.map((c, idx) => (<button type="button" key={idx} onMouseDown={(e) => { e.preventDefault(); handleSelectClient(c); }} className="w-full text-left px-5 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex flex-col transition-colors"><span className="font-bold text-slate-900">{c.nombre}</span>{c.telefono && <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Smartphone size={12}/> {c.telefono}</span>}</button>))}
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-5"><Field label="Teléfono *" required value={formData.telefono} onChange={e=>setFormData({...formData,telefono:e.target.value})} /><Field label="Correo" value={formData.email} onChange={e=>setFormData({...formData,email:e.target.value})} /></div>
                        </div>
                     </div>

                     <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-5 sm:p-6 mb-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6"><IconBox icon={MapPin} color="rose" /><h4 className="font-extrabold text-slate-900 text-lg tracking-tight">Logística</h4></div>
                        <div className="grid grid-cols-2 gap-5 mb-5"><Field label="Fecha *" type="date" required value={formData.fecha} onChange={e=>setFormData({...formData,fecha:e.target.value})} /><Field label="Hora *" type="time" required value={formData.hora} onChange={e=>setFormData({...formData,hora:e.target.value})} /></div>
                        <div className="mb-5"><Field as="select" label="Zona" value={formData.ubicacion} onChange={handleZoneChange}>{Object.keys(ZONAS_TRANSPORTE).map(z => <option key={z} value={z} className="bg-white text-slate-900">{z}</option>)}</Field></div><Field label="Dirección Exacta" value={formData.direccion} onChange={e=>setFormData({...formData,direccion:e.target.value})} />
                     </div>

                     <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-5 sm:p-6 mb-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6"><IconBox icon={Sparkles} color="amber" /><h4 className="font-extrabold text-slate-900 text-lg tracking-tight">Servicios</h4></div>
                        
                        <div className="mb-6">
                            <div className="flex items-center relative group">
                                <Search className="absolute left-4 text-slate-400 group-focus-within:text-[#2563FF] transition-colors" size={18} />
                                <input type="text" value={searchTermService} onChange={(e) => { setSearchTermService(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} onBlur={() => setTimeout(() => setShowDropdown(false), 200)} placeholder="Buscar o agregar servicio..." className={`${UI.input} pl-12`} />
                                {searchTermService && (<button type="button" onMouseDown={() => { setSearchTermService(''); setShowDropdown(false); }} className="absolute right-4 text-slate-400 hover:text-slate-900 transition-colors"><X size={16}/></button>)}
                            </div>
                            {showDropdown && (
                                <div className="mt-3 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-xl">
                                    <div className="max-h-48 overflow-y-auto">
                                        {filteredPaquetes.map(p => (
                                            <button type="button" key={p.id} onMouseDown={(e) => { e.preventDefault(); addService(p); setSearchTermService(''); setShowDropdown(false); }} className="w-full text-left px-5 py-4 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex justify-between items-center transition-colors">
                                                <span className="font-bold text-slate-900">{String(p.nombre)}</span>
                                                <span className="text-emerald-500 font-extrabold">${utils.safeNum(p.precio)}</span>
                                            </button>
                                        ))}
                                        {filteredPaquetes.length === 0 && <div className="px-5 py-6 text-center text-slate-500 text-sm font-medium">No se encontraron servicios.</div>}
                                    </div>
                                    <div className="p-3 border-t border-slate-100 bg-slate-50">
                                        <button type="button" onMouseDown={(e) => { e.preventDefault(); setIsCustomOpen(true); setShowDropdown(false); setSearchTermService(''); }} className="w-full py-3.5 bg-[#2563FF]/10 text-[#2563FF] rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#2563FF]/20 transition-colors active:scale-[0.98] border border-[#2563FF]/20 shadow-sm flex items-center justify-center gap-2">
                                            <Plus size={16} /> Crear nuevo servicio
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {isCustomOpen && (
                            <div className="mb-6 p-5 sm:p-6 bg-blue-50/50 backdrop-blur-md border border-[#2563FF]/30 rounded-2xl animate-fadeIn shadow-sm">
                                <h5 className="font-bold text-[#2563FF] text-sm mb-5 uppercase tracking-widest flex items-center gap-2">
                                    <Plus size={18} /> Crear Servicio Personalizado
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                                    <Field label="Nombre del Servicio" value={customData.nombre} onChange={e=>setCustomData({...customData, nombre: e.target.value})} placeholder="Ej. Hora extra" className="bg-white" />
                                    <Field label="Precio ($)" type="number" value={customData.precio} onChange={e=>setCustomData({...customData, precio: e.target.value})} placeholder="0.00" className="bg-white" />
                                </div>
                                <div className="flex gap-4 justify-end">
                                    <button type="button" onClick={() => setIsCustomOpen(false)} className="px-6 py-3 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors">Cancelar</button>
                                    <button type="button" onClick={handleCreateCustom} className="px-6 py-3 bg-gradient-to-r from-[#2563FF] to-[#7C3AED] text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-[0.98] shadow-[0_8px_20px_rgba(37,99,235,0.25)]">Agregar a lista</button>
                                </div>
                            </div>
                        )}
                        
                        {formData.serviciosSeleccionados.length > 0 && (<div className="space-y-4 mb-2 pt-2 border-t border-slate-100/80"><label className={UI.label}>Servicios Agregados ({formData.serviciosSeleccionados.length})</label>{formData.serviciosSeleccionados.map((s, idx) => (<div key={idx} className="flex flex-col gap-4 p-5 bg-slate-50/80 backdrop-blur-sm rounded-[20px] border border-slate-200/80 relative group hover:border-slate-300 transition-colors duration-200 shadow-sm"><button type="button" onClick={()=>removeService(idx)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 transition-colors p-1.5"><X size={16}/></button><div className="flex justify-between items-center pr-8"><span className="font-extrabold text-[15px] text-slate-900 truncate">{String(s.nombre)}</span><div className="flex items-center bg-white rounded-xl p-1 border border-slate-200 shadow-sm"><button type="button" onClick={()=>updateServiceQuantity(idx,-1)} className="w-8 h-8 flex justify-center items-center hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-900 transition-colors active:scale-[0.95]"><Minus size={14}/></button><span className="w-8 text-center font-bold text-slate-900">{s.cantidad}</span><button type="button" onClick={()=>updateServiceQuantity(idx,1)} className="w-8 h-8 flex justify-center items-center hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-900 transition-colors active:scale-[0.95]"><Plus size={14}/></button></div></div><div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4"><Field label="Precio Modificable ($)" type="number" value={s.precio} onChange={(e) => handleServiceEdit(idx, 'precio', e.target.value)} className="bg-white" /><Field as="textarea" label="Descripción para el PDF" value={s.descripcion || ''} onChange={(e) => handleServiceEdit(idx, 'descripcion', e.target.value)} rows={2} placeholder="Detalles, viñetas, cambios..." className="bg-white"/></div></div>))}</div>)}
                     </div>

                     <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-5 sm:p-6 mb-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6"><IconBox icon={Receipt} color="emerald" /><h4 className="font-extrabold text-slate-900 text-lg tracking-tight">Finanzas</h4></div>
                        {!isCotizacionMode && (<div className="grid grid-cols-2 gap-5 mb-6"><Field label="Abono" type="number" value={formData.abono} onChange={e=>setFormData({...formData,abono:e.target.value})} className="text-emerald-500 font-bold bg-emerald-50/50" /><Field label="Viáticos" type="number" value={formData.transporte} onChange={e=>{ const newTransporte = e.target.value; setFormData(prev => ({...prev, transporte: newTransporte, total: ((Array.isArray(prev.serviciosSeleccionados) ? prev.serviciosSeleccionados : []).reduce((sum, s) => sum + utils.safeNum(s.precio), 0) + utils.safeNum(newTransporte) + utils.safeNum(prev.gastos)).toString()})); }} /></div>)}
                        {isCotizacionMode && (<div className="mb-6"><Field label="Viáticos Adicionales ($)" type="number" value={formData.transporte} onChange={e=>{ const newTransporte = e.target.value; setFormData(prev => ({...prev, transporte: newTransporte, total: ((Array.isArray(prev.serviciosSeleccionados) ? prev.serviciosSeleccionados : []).reduce((sum, s) => sum + utils.safeNum(s.precio), 0) + utils.safeNum(newTransporte) + utils.safeNum(prev.gastos)).toString()})); }} /></div>)}
                        {!isCotizacionMode && (<div className="mb-6 space-y-5 border-t border-slate-100 pt-6 mt-2"><Field label="Gastos operativos reales ($)" type="number" value={formData.gastos} onChange={e=>{ const newGastos = e.target.value; setFormData(prev => ({...prev, gastos: newGastos, total: ((Array.isArray(prev.serviciosSeleccionados) ? prev.serviciosSeleccionados : []).reduce((sum, s) => sum + utils.safeNum(s.precio), 0) + utils.safeNum(prev.transporte) + utils.safeNum(newGastos)).toString()})); }} className="text-rose-500 bg-rose-50/50" /><Field as="textarea" label="Detalle de gastos internos" value={formData.detalleGastos} onChange={e=>setFormData({...formData,detalleGastos:e.target.value})} placeholder="Ej. Transporte, hielo, ayudante..." /></div>)}
                        
                        <div className="mb-6 border-t border-slate-100 pt-6 mt-2">
                            <label className={UI.label}>Estado {isCotizacionMode ? 'Cotización' : 'Reserva'}</label>
                            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
                                {opcionesEstado.map(est => (
                                    <button 
                                        type="button" 
                                        key={est} 
                                        onClick={() => setFormData(prev => {
                                            let nuevoAbono = prev.abono;
                                            if (est === 'Completado') {
                                                nuevoAbono = prev.total; 
                                            } else if (est === 'Pendiente') {
                                                nuevoAbono = ''; 
                                            }
                                            return { ...prev, estado: est, abono: nuevoAbono };
                                        })}
                                        className={`shrink-0 flex-1 py-3.5 px-4 text-[10px] font-bold uppercase tracking-widest rounded-xl border transition-colors active:scale-[0.98] ${formData.estado===est ? 'bg-gradient-to-r from-[#2563FF] to-[#7C3AED] text-white border-transparent shadow-[0_8px_15px_rgba(37,99,235,0.25)]' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-700'}`}
                                    >
                                        {est}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-100/80 p-6 rounded-2xl flex justify-between items-center border border-slate-200/80 mt-2 shadow-sm"><span className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">TOTAL FINAL</span><div className="flex items-center"><span className="text-3xl font-extrabold text-[#2563FF] mr-2">$</span><input type="number" value={formData.total} onChange={e=>setFormData({...formData,total:e.target.value})} className="bg-transparent text-right text-4xl font-black text-slate-900 outline-none w-32 tracking-tight" /></div></div>
                     </div>
                     <AppButton variant="primary" icon={Check} onClick={handleSubmit} className="w-full py-4 text-sm uppercase tracking-widest mt-2 mb-4 shadow-xl">{isCotizacionMode ? 'Guardar Cotización' : 'Guardar Reserva'}</AppButton>
                  </form></div>
              </div>
        </div>
    );
}

// --- 6. COMPONENTE PRINCIPAL (RUTEO Y ESTADO) ---
export default function App() {
  const lastActivityRef = useRef(Date.now()); const [currentTime, setCurrentTime] = useState(new Date());
  const [appSettings, setAppSettings] = useState(() => { const saved = utils.getSafeLocal('diverty_settings'); return saved ? JSON.parse(saved) : { metaMensual: META_MENSUAL, empresa: DATOS_EMPRESA }; });
  const [isAuthenticated, setIsAuthenticated] = useState(false); const [isAuthLoading, setIsAuthLoading] = useState(true); const [emailInput, setEmailInput] = useState(''); const [passwordInput, setPasswordInput] = useState('');
  const [firebaseUser, setFirebaseUser] = useState(null); const [activeTab, setActiveTab] = useState('inicio'); const [isDBReady, setIsDBReady] = useState(false); const [eventos, setEventos] = useState([]); 
  const [catalogoPaquetes, setCatalogoPaquetes] = useState([]); const [hiddenClients, setHiddenClients] = useState([]); const [filterDate, setFilterDate] = useState(''); const [viewMode, setViewMode] = useState('semana'); 
  const [calMonth, setCalMonth] = useState(currentTime.getMonth()); const [calYear, setCalYear] = useState(currentTime.getFullYear()); const [globalSearch, setGlobalSearch] = useState('');
  const [modalConfig, setModalConfig] = useState({ isOpen: false, initialData: defaultFormData, isCotizacion: false }); const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const [toastAlert, setToastAlert] = useState({ isOpen: false, message: '', success: false }); const [isModoOperativo, setIsModoOperativo] = useState(false); const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState(null); const [printType, setPrintType] = useState(null); const [pdfScale, setPdfScale] = useState(1); const [searchTerm, setSearchTerm] = useState('');
  const [clientSort, setClientSort] = useState('gasto'); 
  
  // NUEVO ESTADO DE PERIODO FINANCIERO (mes, historico, o mes específico)
  const [financePeriod, setFinancePeriod] = useState('mes'); // 'mes', 'todos', 'seleccionado'
  const [selectedFinanceMonth, setSelectedFinanceMonth] = useState(currentTime.getMonth() + 1); // 1-12
  const [selectedFinanceYear, setSelectedFinanceYear] = useState(currentTime.getFullYear());
  
  const [expandedFinanceId, setExpandedFinanceId] = useState(null);
  const [expandedClientId, setExpandedClientId] = useState(null); const [isSidebarOpen, setIsSidebarOpen] = useState(false); const [messaging, setMessaging] = useState(null);
  const [clientFilter, setClientFilter] = useState('todos');

  // MANEJO DE INACTIVIDAD MEJORADO (Session Timeout - 10 Minutos)
  useEffect(() => {
    let inactivityTimer;
    const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutos de inactividad máxima.
    
    const resetTimer = () => { lastActivityRef.current = Date.now(); };
    const checkActivity = () => { 
        if (Date.now() - lastActivityRef.current > INACTIVITY_LIMIT) {
            signOut(auth);
        }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    
    // Revisar de forma pasiva cada 30 segundos
    inactivityTimer = setInterval(checkActivity, 30000); 

    // Revisar de forma activa si el usuario vuelve a abrir la pestaña después de haberla minimizado.
    const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
            checkActivity();
        }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => { 
        events.forEach(e => window.removeEventListener(e, resetTimer)); 
        clearInterval(inactivityTimer); 
        document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => { if (typeof window !== 'undefined' && !window.html2pdf && !document.getElementById('html2pdf-script')) { const script = document.createElement('script'); script.id = 'html2pdf-script'; script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'; script.async = true; document.body.appendChild(script); } }, []);
  useEffect(() => { const initMessaging = async () => { try { const supported = await isSupported(); if (supported) setMessaging(getMessaging(app)); } catch (e) { console.warn("FCM falló"); } }; setTimeout(() => { initMessaging(); }, 1500); }, []);
  useEffect(() => {
    const fallbackTimer = setTimeout(() => setIsAuthLoading(false), 3000);
    const unsubscribe = onAuthStateChanged(auth, (user) => { clearTimeout(fallbackTimer); if (user) { setFirebaseUser(user); setIsAuthenticated(true); } else { setFirebaseUser(null); setIsAuthenticated(false); } setIsAuthLoading(false); }, () => { clearTimeout(fallbackTimer); setIsAuthLoading(false); }); 
    return () => { clearTimeout(fallbackTimer); unsubscribe(); };
  }, []);
  useEffect(() => { const handleResize = () => { if (window.innerWidth < 820) { setPdfScale((window.innerWidth - 32) / 794); } else { setPdfScale(1); } }; if (isPrinting) { handleResize(); window.addEventListener('resize', handleResize); } return () => window.removeEventListener('resize', handleResize); }, [isPrinting]);

  const handleTabChange = useCallback((tabId) => {
    utils.triggerHaptic('light');
    setActiveTab(tabId);
    setIsSidebarOpen(false);
    setTimeout(() => { const mainEl = document.getElementById('main-content'); if (mainEl) { mainEl.scrollTo({ top: 0, behavior: 'smooth' }); } }, 50);
  }, []);

  const updateSettings = useCallback((newSettings) => { setAppSettings(newSettings); utils.setSafeLocal('diverty_settings', JSON.stringify(newSettings)); }, []);
  const showAlert = useCallback((message, success = false) => { setToastAlert({ isOpen: true, message: String(message), success }); setTimeout(() => setToastAlert({ isOpen: false, message: '', success: false }), 5000); }, []);
  const showConfirm = useCallback((message, onConfirm) => { setConfirmModal({ isOpen: true, message: String(message), onConfirm: () => { onConfirm(); setConfirmModal({ isOpen: false, message: '', onConfirm: null }); } }); }, []);

  useEffect(() => {
    if (!messaging) return;
    const unsubscribe = onMessage(messaging, (payload) => {
      const title = payload.notification?.title || payload.data?.title || "Notificación Diverty";
      const body = payload.notification?.body || payload.data?.body || "Tienes un nuevo mensaje"; 
      showAlert(`🔔 ${title}: ${body}`, true); 
      utils.triggerHaptic('success');
      
      if (typeof Notification !== 'undefined' && Notification.permission === "granted" && navigator.serviceWorker) { 
          navigator.serviceWorker.getRegistration().then(reg => { 
              if (reg) { 
                  reg.showNotification(title, { body: body, icon: "/icon-192.png" }); 
              } else { 
                  new Notification(title, { body: body, icon: "/icon-192.png" }); 
              } 
          }).catch((err) => { 
              console.warn(err);
              new Notification(title, { body: body, icon: "/icon-192.png" }); 
          }); 
      }
    });
    return () => unsubscribe();
  }, [messaging, showAlert]);

  const handleToggleClient = useCallback((nombre) => { setExpandedClientId(prev => prev === nombre ? null : nombre); }, []); const handleToggleFinance = useCallback((id) => { setExpandedFinanceId(prev => prev === id ? null : id); }, []);
  const todayObj = currentTime, todayStr = useMemo(() => utils.getLocalYYYYMMDD(currentTime), [currentTime]), tomorrowStr = useMemo(() => utils.getLocalYYYYMMDD(new Date(currentTime.getTime() + 86400000)), [currentTime]);
  const { start: weekStart, end: weekEnd } = useMemo(() => utils.getWeekRange(currentTime), [currentTime]), todayTime = useMemo(() => new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate()).getTime(), [currentTime]);
  const eventosActivos = useMemo(() => eventos.filter(ev => !ev.deletedLocally).sort((a,b) => String(a.fecha).localeCompare(String(b.fecha)) || String(a.hora).localeCompare(String(b.hora))), [eventos]);
  
  const stats = useMemo(() => {
     let gananciaHoy = 0, gananciaSemana = 0, deudaTotal = 0, ingresosEsteMes = 0; const eventosHoy = [], eventosManana = [], alertasOperativas = [], currYear = todayObj.getFullYear(), currMonth = todayObj.getMonth() + 1;
     eventosActivos.forEach(ev => {
        const est = utils.normalizeText(ev.estado), isHoy = ev.fecha === todayStr, isManana = ev.fecha === tomorrowStr;
        if(est !== 'cancelado' && !est.includes('cotizaci') && !est.includes('cot.')) {
            const t = utils.safeNum(ev.total), a = utils.safeNum(ev.abono), g = utils.safeNum(ev.gastos), p = t - g;  let evYear = 0, evMonth = 0, evDay = 0;
            if(ev.fecha) { const parts = String(ev.fecha).trim().split('-'); if(parts.length >= 2) { evYear = parseInt(parts[0], 10); evMonth = parseInt(parts[1], 10); evDay = parseInt(parts[2] || 0, 10); } }
            const isEsteMes = (evYear === currYear && evMonth === currMonth), isPastOrCurrentMonth = evYear < currYear || (evYear === currYear && evMonth <= currMonth);
            if (est !== 'completado' && (t - a) > 0 && isPastOrCurrentMonth) deudaTotal += (t - a); if(isHoy) gananciaHoy += p; if(isEsteMes) ingresosEsteMes += p;
            if(evYear && evMonth && evDay) { const eD = new Date(evYear, evMonth - 1, evDay); if (eD >= weekStart && eD <= weekEnd) gananciaSemana += p; } if(isHoy) eventosHoy.push(ev); if(isManana) eventosManana.push(ev);
            if (est !== 'completado' && (isHoy || isManana)) { const priority = isHoy ? 1 : 2, sp = isHoy ? { color: 'text-rose-500', bg: 'bg-rose-50 border-rose-200', tagBg: 'bg-rose-500', tagText: 'HOY URGENTE' } : { color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200', tagBg: 'bg-amber-500', tagText: 'MAÑANA' }; if (utils.safeNum(ev.abono) <= 0) alertasOperativas.push({ id: `abo-${ev.id}`, priority, ev, icon: DollarSign, ...sp, text: `Sin abono registrado: ${String(ev.cliente)}` }); if (!ev.direccion || String(ev.direccion).trim() === '') alertasOperativas.push({ id: `dir-${ev.id}`, priority, ev, icon: MapPin, ...sp, text: `Falta dirección: ${String(ev.cliente)}` }); if (!ev.hora || String(ev.hora).trim() === '') alertasOperativas.push({ id: `hor-${ev.id}`, priority, ev, icon: Clock, ...sp, text: `Falta hora: ${String(ev.cliente)}` }); }
        }
     });
     eventosHoy.sort((a,b) => String(a.hora).localeCompare(String(b.hora))); eventosManana.sort((a,b) => String(a.hora).localeCompare(String(b.hora))); alertasOperativas.sort((a, b) => a.priority - b.priority); return { gananciaHoy, gananciaSemana, deudaTotal, ingresosEsteMes, eventosHoy, eventosManana, alertasOperativas };
  }, [eventosActivos, todayStr, tomorrowStr, weekStart, weekEnd, todayObj]);

  const clientsList = useMemo(() => {
     const clientsMap = {}; eventosActivos.forEach(ev => { const est = utils.normalizeText(ev.estado); if(est === 'cancelado' || est.includes('cotizaci') || est.includes('cot.')) return; const key = String(ev.cliente || '').trim().toLowerCase(); if(!key) return; if(!clientsMap[key]) clientsMap[key] = { nombre: ev.cliente, telefono: ev.telefono, email: ev.email, totalGastado: 0, eventos: 0, ultimoEventoFecha: ev.fecha, ultimoEstado: ev.estado }; clientsMap[key].totalGastado += utils.safeNum(ev.total); clientsMap[key].eventos += 1; if (ev.fecha && (!clientsMap[key].ultimoEventoFecha || ev.fecha > clientsMap[key].ultimoEventoFecha)) { clientsMap[key].ultimoEventoFecha = ev.fecha; clientsMap[key].ultimoEstado = ev.estado; } }); return Object.values(clientsMap).filter(c => !hiddenClients.includes(c.nombre));
  }, [eventosActivos, hiddenClients]);

  const enrichedClients = useMemo(() => { return clientsList.map(c => { let daysSince = 0; if (c.ultimoEventoFecha) { const [y, m, d] = c.ultimoEventoFecha.split('-'); if (y && m && d) { const lastDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)).getTime(); daysSince = Math.floor((todayTime - lastDate) / (1000 * 60 * 60 * 24)); } } return { ...c, daysSince, isVIP: c.eventos >= 3 || c.totalGastado >= 300, isFrecuente: c.eventos === 2, isNuevo: c.eventos === 1 && daysSince <= 180, isInactivo: daysSince > 180, needsContact: daysSince > 60 && daysSince <= 365 }; }); }, [clientsList, todayTime]);
  const animatedGananciaHoy = useCountUp(stats.gananciaHoy);
  
  const agendaFiltrados = useMemo(() => { return eventosActivos.filter(e => { const est = utils.normalizeText(e.estado); if (est.includes('cotizaci') || est.includes('cot.')) return false; if (globalSearch && !String(`${e.cliente} ${e.servicio} ${e.ubicacion} ${e.direccion} ${e.telefono}`).toLowerCase().includes(globalSearch.toLowerCase())) return false; if (filterDate && e.fecha !== filterDate) return false; if (!filterDate && !globalSearch) { if (viewMode === 'hoy') return e.fecha === todayStr; let dt; if (e.fecha) { const parts = String(e.fecha).split('-'); if (parts.length === 3) dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)); } if (viewMode === 'semana') return dt ? (dt >= weekStart && dt <= weekEnd) : false; if (viewMode === 'mes') return dt ? (dt.getFullYear() === todayObj.getFullYear() && dt.getMonth() === todayObj.getMonth()) : false; if (viewMode === 'findesemana') return dt ? (dt.getDay() === 0 || dt.getDay() === 6) : false; if (viewMode === 'pendientes') return (utils.safeNum(e.total) - utils.safeNum(e.abono)) > 0 && est !== 'completado'; if (viewMode === 'todas') return true; } return true; }); }, [eventosActivos, globalSearch, filterDate, viewMode, todayStr, todayObj, weekStart, weekEnd]);

  const filteredClients = useMemo(() => enrichedClients.filter(c => { 
      if (clientFilter === 'vip' && !c.isVIP) return false;
      if (clientFilter === 'retomar' && !c.needsContact) return false;
      if (!searchTerm) return true; 
      const s = searchTerm.toLowerCase(); 
      return String(c.nombre).toLowerCase().includes(s) || String(c.telefono).includes(s); 
  }), [enrichedClients, searchTerm, clientFilter]);

  const sortedFilteredClients = useMemo(() => [...filteredClients].sort((a, b) => { if (clientSort === 'gasto') return b.totalGastado - a.totalGastado; if (clientSort === 'recientes') return new Date(b.ultimoEventoFecha || 0) - new Date(a.ultimoEventoFecha || 0); return 0; }), [filteredClients, clientSort]);
  const contactCandidates = useMemo(() => enrichedClients.filter(c => c.needsContact).slice(0, 5), [enrichedClients]);
  
  // DETERMINAR EL AÑO Y MES ACTUAL DE FILTRO FINANCIERO
  const financeYear = useMemo(() => financePeriod === 'mes' ? todayObj.getFullYear() : selectedFinanceYear, [financePeriod, todayObj, selectedFinanceYear]);
  const financeMonth = useMemo(() => financePeriod === 'mes' ? (todayObj.getMonth() + 1) : selectedFinanceMonth, [financePeriod, todayObj, selectedFinanceMonth]);

  // CÁLCULO BASE DE EVENTOS FILTRADOS POR EL PERIODO FINANCIERO SELECCIONADO
  const evtCalculoBase = useMemo(() => {
    return eventosActivos.filter(ev => {
      const est = utils.normalizeText(ev.estado);
      if (est === 'cancelado' || est.includes('cotizaci') || est.includes('cot.')) return false;
      if (financePeriod === 'todos') return true;
      if (!ev.fecha) return false;
      const parts = String(ev.fecha).trim().split('-');
      if (parts.length < 2) return false;
      return parseInt(parts[0], 10) === financeYear && parseInt(parts[1], 10) === financeMonth;
    });
  }, [eventosActivos, financePeriod, financeYear, financeMonth]);

  const finanzasData = useMemo(() => { const tI = evtCalculoBase.reduce((a, e) => a + utils.safeNum(e.total), 0), tG = evtCalculoBase.reduce((a, e) => a + utils.safeNum(e.gastos), 0), bT = tI - tG, roi = tI > 0 ? ((bT / tI) * 100).toFixed(0) : 0, deudaTotalGlobal = evtCalculoBase.reduce((acc, ev) => { const pendiente = utils.safeNum(ev.total) - utils.safeNum(ev.abono); return (pendiente > 0 && utils.normalizeText(ev.estado) !== 'completado') ? acc + pendiente : acc; }, 0); return { tI, tG, bT, roi, deudaTotalGlobal }; }, [evtCalculoBase]);
  
  const finanzasMes = useMemo(() => { 
    const ingresosEsteMesGlobal = eventosActivos.filter(ev => { 
      const est = utils.normalizeText(ev.estado); 
      if (est === 'cancelado' || est.includes('cotizaci') || est.includes('cot.')) return false; 
      if (!ev.fecha) return false; 
      const parts = String(ev.fecha).trim().split('-'); 
      return parseInt(parts[0], 10) === financeYear && parseInt(parts[1], 10) === financeMonth; 
    }).reduce((acc, ev) => acc + (utils.safeNum(ev.total) - utils.safeNum(ev.gastos)), 0); 
    
    const esMesActual = financeYear === todayObj.getFullYear() && financeMonth === (todayObj.getMonth() + 1);
    const diasTranscurridos = esMesActual ? new Date(todayTime).getDate() : new Date(financeYear, financeMonth, 0).getDate();
    const diasTotales = new Date(financeYear, financeMonth, 0).getDate(); 
    const promedioDiario = diasTranscurridos > 0 ? ingresosEsteMesGlobal / diasTranscurridos : 0; 
    const proyeccion = promedioDiario * diasTotales; 
    const progresoMeta = Math.min((ingresosEsteMesGlobal / appSettings.metaMensual) * 100, 100); 
    return { ingresosEsteMesGlobal, diasTranscurridos, diasTotales, proyeccion, progresoMeta }; 
  }, [eventosActivos, financeYear, financeMonth, todayObj, todayTime, appSettings.metaMensual]);

  // GENERAR GRÁFICO BASADO EN LOS DÍAS DEL MES FILTRADO (EN LUGAR DE SOLO LOS ÚLTIMOS 7 DÍAS)
  const chartData = useMemo(() => { 
    // Si es Histórico (Todos), agruparemos por los últimos 6 meses para un análisis de alto nivel.
    if (financePeriod === 'todos') {
      const mesesLabels = [];
      const d = new Date(todayTime);
      for (let i = 5; i >= 0; i--) {
        const temp = new Date(d.getFullYear(), d.getMonth() - i, 1);
        mesesLabels.push({ label: NOMBRES_MESES[temp.getMonth()].substring(0,3), year: temp.getFullYear(), month: temp.getMonth() + 1 });
      }
      return mesesLabels.map(m => {
        const val = eventosActivos.filter(ev => {
          if (!ev.fecha || utils.normalizeText(ev.estado) === 'cancelado' || utils.normalizeText(ev.estado).includes('cot')) return false;
          const parts = ev.fecha.split('-');
          return parseInt(parts[0], 10) === m.year && parseInt(parts[1], 10) === m.month;
        }).reduce((acc, ev) => acc + (utils.safeNum(ev.total) - utils.safeNum(ev.gastos)), 0);
        return { date: m.label, value: val };
      });
    }

    // Para un mes específico, mostraremos agrupaciones semanales de ese mes (Semana 1 a Semana 5)
    const semanas = [
      { label: 'Sem 1', start: 1, end: 7 },
      { label: 'Sem 2', start: 8, end: 14 },
      { label: 'Sem 3', start: 15, end: 21 },
      { label: 'Sem 4', start: 22, end: 28 },
      { label: 'Sem 5', start: 29, end: 31 }
    ];

    return semanas.map(s => {
      const value = eventosActivos.filter(ev => {
        if (!ev.fecha || utils.normalizeText(ev.estado) === 'cancelado' || utils.normalizeText(ev.estado).includes('cot')) return false;
        const parts = ev.fecha.split('-');
        const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
        return y === financeYear && m === financeMonth && d >= s.start && d <= s.end;
      }).reduce((acc, ev) => acc + (utils.safeNum(ev.total) - utils.safeNum(ev.gastos)), 0);
      return { date: s.label, value };
    });
  }, [eventosActivos, financePeriod, financeYear, financeMonth, todayTime]);

  const maxChartVal = useMemo(() => Math.max(...chartData.map(d => d.value), 100), [chartData]); const cotizacionesActivas = useMemo(() => eventosActivos.filter(ev => utils.normalizeText(ev.estado).includes('cotizaci') || utils.normalizeText(ev.estado).includes('cot.')), [eventosActivos]); const proximasReservas = useMemo(() => [...stats.eventosHoy, ...stats.eventosManana].filter(ev => utils.normalizeText(ev.estado) !== 'completado'), [stats.eventosHoy, stats.eventosManana]);

  const handleAddCustomService = useCallback(async (nombre, precio) => { if (!nombre?.trim()) { showAlert("Ingresa un nombre para el servicio.", false); return null; } const newSrv = { id: 'c-'+Date.now(), nombre: nombre.trim(), precio: utils.safeNum(precio), short: nombre.substring(0,12)+'...', descripcion: 'Servicio personalizado.', isCustom: true }; const nuevosPaquetes = [...catalogoPaquetes, newSrv]; setCatalogoPaquetes(nuevosPaquetes); if (firebaseUser) await setDoc(getConfigRef('serviciosCustom'), { paquetes: nuevosPaquetes }, { merge: true }); return newSrv; }, [catalogoPaquetes, firebaseUser, showAlert]);
  const openModal = useCallback((ev = null, isCot = false) => { try { utils.triggerHaptic('light'); let initial = { ...defaultFormData, fecha: filterDate || todayStr }; if (ev && typeof ev === 'object' && 'id' in ev && typeof ev.preventDefault !== 'function') { let srvs = Array.isArray(ev.serviciosSeleccionados) ? [...ev.serviciosSeleccionados] : []; if (!srvs.length && ev.servicio) { srvs.push({ nombre: ev.servicio, precio: utils.safeNum(ev.total), cantidad: 1, precioOriginal: utils.safeNum(ev.total) }); } initial = { ...defaultFormData, ...ev, serviciosSeleccionados: srvs }; } else if (!isCot) { const draftStr = utils.getSafeLocal('diverty_form_draft'); if (draftStr) { try { const draftObj = JSON.parse(draftStr); if (draftObj && (draftObj.cliente || draftObj.telefono || draftObj.serviciosSeleccionados?.length > 0)) { initial = draftObj; showAlert("Borrador recuperado", true); } } catch(e) {} } } setModalConfig({ isOpen: true, isCotizacion: isCot === true, initialData: initial }); } catch (e) { console.error(e); setModalConfig({ isOpen: true, isCotizacion: isCot === true, initialData: { ...defaultFormData, fecha: filterDate || todayStr } }); } }, [filterDate, todayStr, showAlert]);
  const closeModal = useCallback(() => { utils.triggerHaptic('light'); setModalConfig({ isOpen: false, initialData: defaultFormData, isCotizacion: false }); }, []);
  const handleDuplicateEvento = useCallback((ev) => { utils.triggerHaptic('light'); const { id, createdAt, deletedLocally, colisionAprobada, ...rest } = ev; const isCotizacionOrig = utils.normalizeText(ev.estado).includes('cot'); setModalConfig({ isOpen: true, isCotizacion: isCotizacionOrig, initialData: { ...rest, abono: '', estado: isCotizacionOrig ? 'Cotización' : 'Pendiente', isDuplicated: true } }); showAlert("Evento duplicado. Verifica los datos y guarda.", true); }, [showAlert]);
  const handleUpdateEstado = useCallback((id, nuevoEstado) => { utils.triggerHaptic('light'); setEventos(prev => prev.map(e => e.id === id ? { ...e, estado: nuevoEstado } : e)); setDoc(getDocRef(id), { estado: nuevoEstado }, { merge: true }).catch(e=>console.warn(e)); showAlert(`Estado actualizado a ${nuevoEstado}`, true); }, [showAlert]);
  const handleConvertirReserva = useCallback((ev) => { utils.triggerHaptic('light'); setModalConfig({ isOpen: true, isCotizacion: false, initialData: { ...ev, estado: 'Pendiente' } }); showAlert("Confirma los datos para crear la reserva.", true); }, [showAlert]);

  const handleSaveFromModal = useCallback(async (formDataToSave, isCotizacionMode) => {
    if (!formDataToSave.cliente?.trim()) return showAlert("Por favor, ingresa el nombre del cliente."); if (!formDataToSave.fecha) return showAlert("Por favor, selecciona la fecha."); utils.triggerHaptic('light'); const evtId = (formDataToSave.id && !formDataToSave.isDuplicated) ? formDataToSave.id : (isCotizacionMode ? `cot-${Date.now()}` : `man-${Date.now()}`); const { isDuplicated, ...cleanFormData } = formDataToSave; if (!formDataToSave.id || isDuplicated) { if (isCotizacionMode && !cleanFormData.estado.includes('Cot')) cleanFormData.estado = 'Cotización'; if (!isCotizacionMode && cleanFormData.estado.includes('Cot')) cleanFormData.estado = 'Pendiente'; } const safeData = JSON.parse(JSON.stringify({ ...cleanFormData, id: evtId, createdAt: cleanFormData.createdAt || new Date().toISOString(), deletedLocally: false })); if (modalConfig.initialData?.fecha !== safeData.fecha || modalConfig.initialData?.hora !== safeData.hora) safeData.colisionAprobada = false;
    const estNormal = utils.normalizeText(safeData.estado), isCotiz = estNormal.includes('cotizaci') || estNormal.includes('cot.'); const hasCollision = !isCotiz && eventosActivos.some(ev => { if (ev.id === evtId || utils.normalizeText(ev.estado) === 'cancelado' || utils.normalizeText(ev.estado).includes('cotizaci') || utils.normalizeText(ev.estado).includes('cot.') || ev.fecha !== safeData.fecha) return false; if (!ev.hora || !safeData.hora) return false; const [h1, m1] = ev.hora.split(':').map(Number), [h2, m2] = safeData.hora.split(':').map(Number); return Math.abs((h1 * 60 + m1) - (h2 * 60 + m2)) < 180; });
    const guardarReservaFinal = (id, dataToSave) => { closeModal(); utils.setSafeLocal('diverty_form_draft', ''); setEventos(prev => { const arr = [...prev]; const i = arr.findIndex(x=>x.id===id); if(i>-1) arr[i]=dataToSave; else arr.push(dataToSave); return arr; }); setDoc(getDocRef(id), dataToSave).catch(err=>console.warn(err)); showAlert(isCotizacionMode ? "¡Cotización guardada!" : "¡Reserva guardada!", true); if (isCotizacionMode && (!formDataToSave.id || formDataToSave.isDuplicated)) { setPrintData({ ...dataToSave }); setPrintType('cotizacion'); setIsPrinting(true); } };
    if (hasCollision && !safeData.colisionAprobada) showConfirm("Hay otro evento con menos de 3 horas de diferencia. ¿Guardar de todos modos?", () => { safeData.colisionAprobada = true; guardarReservaFinal(evtId, safeData); }); else guardarReservaFinal(evtId, safeData);
  }, [eventosActivos, closeModal, showAlert, modalConfig, showConfirm]);

  const handleDeleteEvento = useCallback((id) => showConfirm("¿Eliminar registro permanentemente?", async () => { utils.triggerHaptic('light'); setEventos(prev => { const arr = [...prev]; const i = arr.findIndex(x=>x.id===id); if(i>-1) arr[i].deletedLocally=true; return arr; }); setDoc(getDocRef(id), { deletedLocally: true }, { merge: true }).catch(e=>console.warn(e)); closeModal(); }), [closeModal, showConfirm]);
  const handleDeleteClient = useCallback((clientName, eventCount) => { const mensaje = eventCount > 0 ? `¿Seguro que deseas eliminar este cliente? Tiene ${eventCount} evento(s) asociado(s).` : `¿Seguro que deseas eliminar este cliente?`; showConfirm(mensaje, async () => { utils.triggerHaptic('light'); const newHidden = [...hiddenClients, clientName]; setHiddenClients(newHidden); if (firebaseUser) await setDoc(getConfigRef('clientesOcultos'), { clients: newHidden }, { merge: true }); showAlert("Cliente eliminado exitosamente.", true); }); }, [hiddenClients, firebaseUser, showConfirm, showAlert]);
  const handleWipeAll = useCallback(() => showConfirm("⚠️ ¿Limpiar toda la base de datos?", async () => { utils.triggerHaptic('light'); setEventos([]); Promise.all(eventosActivos.map(ev => setDoc(getDocRef(ev.id), { deletedLocally: true }, { merge: true }))).catch(e=>console.warn(e)); utils.triggerHaptic('success'); showAlert("Base de datos limpiada.", true); }), [eventosActivos, showConfirm, showAlert]);
  const handleViewDoc = useCallback((ev, type) => { try { utils.triggerHaptic('light'); setPrintData(ev); setPrintType(type); setIsPrinting(true); } catch (err) { showAlert("Error al procesar."); } }, [showAlert]);
  
  const sendWhatsAppCall = useCallback((ev, type, empresaSettings) => { utils.triggerHaptic('success'); const msg = getWhatsAppMessage(ev, type, empresaSettings || appSettings.empresa), phoneClean = String(ev.telefono).replace(/\D/g,''); utils.openWhatsAppBusiness(phoneClean, msg); }, [appSettings.empresa]);
  const openGoogleMaps = useCallback((dir, ubi) => { utils.triggerHaptic('light'); window.open(`https://maps.google.com/?q=${encodeURIComponent(`${dir || ''} ${ubi || ''} Panamá`)}`, '_blank'); }, []);
  const printNativePDF = useCallback(() => { utils.triggerHaptic('success'); window.print(); }, []);

  const downloadPDF = useCallback(async () => {
    utils.triggerHaptic('success'); if (!window.html2pdf) { showAlert("El generador de PDF aún está cargando. Intenta en unos segundos.", false); return; }
    const element = document.getElementById('pdf-content'), wrapper = document.getElementById('pdf-wrapper-scaler'); if (!element) { showAlert("Error al localizar el documento para PDF.", false); return; }
    showAlert("Generando PDF... por favor espera.", true); let oldTransform = ''; if (wrapper) { oldTransform = wrapper.style.transform; wrapper.style.transform = 'scale(1)'; }
    const oldScrollY = window.scrollY; window.scrollTo(0, 0);
    try {
        await new Promise(resolve => setTimeout(resolve, 300));
        const docName = printData?.cliente ? String(printData.cliente).replace(/[^a-z0-9]/gi, '_') : 'Documento', fileName = `${printType === 'cotizacion' ? 'Cotizacion' : (printType === 'contrato' ? 'Contrato' : 'Factura')}_Diverty_${docName}.pdf`;
        const opt = { margin: 0, filename: fileName, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" }, jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' } };
        await window.html2pdf().set(opt).from(element).save(); showAlert("¡PDF descargado con éxito!", true); 
    } catch (error) { console.error("Error PDF:", error); showAlert("Hubo un error de procesamiento. Mostrando diálogo de impresión nativo...", false); printNativePDF(); } finally { if (wrapper) wrapper.style.transform = oldTransform; window.scrollTo(0, oldScrollY); }
  }, [printData, printType, showAlert, printNativePDF]);

  const handleSharePDF = useCallback(async () => {
    utils.triggerHaptic('success'); if (!window.html2pdf) { showAlert("Cargando generador...", false); return; }
    const element = document.getElementById('pdf-content'), wrapper = document.getElementById('pdf-wrapper-scaler'); if (!element) return; showAlert("Preparando PDF para compartir...", true);
    let oldTransform = ''; if (wrapper) { oldTransform = wrapper.style.transform; wrapper.style.transform = 'scale(1)'; } const oldScrollY = window.scrollY; window.scrollTo(0, 0);
    try {
        await new Promise(resolve => setTimeout(resolve, 300)); const docName = printData?.cliente ? String(printData.cliente).replace(/[^a-z0-9]/gi, '_') : 'Documento', fileName = `${printType === 'cotizacion' ? 'Cotizacion' : (printType === 'contrato' ? 'Contrato' : 'Factura')}_Diverty_${docName}.pdf`;
        const opt = { margin: 0, filename: fileName, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" }, jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' } };
        const pdfBlob = await window.html2pdf().set(opt).from(element).output('blob'); if (!pdfBlob) throw new Error("Blob vacío");
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' }), msg = getWhatsAppMessage(printData, printType === 'cotizacion' ? 'cotizacion' : 'recibo', appSettings.empresa);
        if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: fileName, text: msg }); } else { showAlert("No se pudo compartir directamente en tu dispositivo. Descargando...", false); await window.html2pdf().set(opt).from(element).save(); const phoneClean = String(printData?.telefono || '').replace(/\D/g,''); utils.openWhatsAppBusiness(phoneClean, msg); }
    } catch (error) { console.error("Share error:", error); if (error?.name !== 'AbortError') { showAlert("Error al compartir. Usa el botón Guardar.", false); } } finally { if (wrapper) wrapper.style.transform = oldTransform; window.scrollTo(0, oldScrollY); }
  }, [printData, printType, appSettings, showAlert]);

  const downloadExcel = useCallback(() => {
    utils.triggerHaptic('success'); const filteredForExport = eventosActivos.filter(ev => { const est = utils.normalizeText(ev.estado); if (est === 'cancelado' || est.includes('cotizaci') || est.includes('cot.') || utils.safeNum(ev.total) <= 0) return false; if (financePeriod === 'todos') return true; const fStr = String(ev.fecha || ''); if (fStr) { const [ey, em] = fStr.split('-'); return parseInt(ey) === financeYear && parseInt(em) === financeMonth; } return false; });
    let csv = 'Fecha,Cliente,Tipo Evento,Ubicacion,Ingreso Bruto,Gastos,Ganancia Neta,Estado\n'; filteredForExport.forEach(ev => { const t = utils.safeNum(ev.total), g = utils.safeNum(ev.gastos); csv += `"${ev.fecha||''}","${String(ev.cliente||'').replace(/,/g,'')}","${String(ev.tipoEvento||'').replace(/,/g,'')}","${String(ev.ubicacion||'').replace(/,/g,'')}",${t},${g},${t-g},"${ev.estado||''}"\n`; });
    const blob = new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' }), url = URL.createObjectURL(blob), link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `Reporte_Finanzas_Diverty_${financePeriod === 'todos' ? 'Historico' : `${NOMBRES_MESES[financeMonth - 1]}_${financeYear}`}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }, [eventosActivos, financePeriod, financeYear, financeMonth]);

  const handleLogin = useCallback(async (e) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, emailInput, passwordInput); utils.triggerHaptic('success'); setEmailInput(''); setPasswordInput(''); } catch (error) { utils.triggerHaptic('warning'); showAlert("Credenciales incorrectas", false); } }, [emailInput, passwordInput, showAlert]);
  const handleLogout = useCallback(async () => { try { await signOut(auth); } catch (error) { showAlert("Error al cerrar sesión"); } }, [showAlert]);
  const handleCopiarCobros = useCallback(() => { utils.triggerHaptic('success'); let text = "📋 *REPORTE DE COBROS PENDIENTES* 📋\n\n"; eventosActivos.filter(ev => { const est = utils.normalizeText(ev.estado); return (utils.safeNum(ev.total) - utils.safeNum(ev.abono)) > 0 && est !== 'cancelado' && est !== 'completado' && !est.includes('cotizaci') && !est.includes('cot.'); }).forEach(ev => { text += `👤 *${ev.cliente}*\n📅 Fecha: ${ev.fecha}\n💰 Debe: $${(utils.safeNum(ev.total) - utils.safeNum(ev.abono)).toFixed(2)}\n📞 WA: ${ev.telefono}\n\n`; }); navigator.clipboard.writeText(text); showAlert("Lista de cobros copiada al portapapeles", true); }, [eventosActivos, showAlert]);

  const activarNotificaciones = useCallback(async () => {
    if (!messaging) { showAlert("Las notificaciones no están disponibles. (Posible bloqueo de navegador)", false); return; }
    try { if (!('Notification' in window)) { showAlert("Este navegador no soporta notificaciones.", false); return; } const permiso = await Notification.requestPermission(); if (permiso !== "granted") { showAlert("Debes permitir notificaciones", false); return; } showAlert("Generando token, espera un momento...", true); const token = await getToken(messaging, { vapidKey: "BEmGfQ2ANNd-fwu25Nd7OyRnzCbX8pdIoYxreafTsk5R5PKoAIfom-tDJIMS4Slpu5XjK0vvwLxHCS5_09B8YrQ" }); if (token) { await setDoc(doc(db, "tokens", token), { token: token, createdAt: new Date() }); console.log("Token guardado:", token); showAlert("✅ ¡Token generado y guardado con éxito!", true); } else { console.error("No se generó token"); showAlert("No se generó ningún token.", false); } } catch (error) { console.error("Error obteniendo token:", error); showAlert("Error al obtener token: " + (error.message || "revisa consola"), false); }
  }, [messaging, showAlert]);

  useEffect(() => {
    if (!db || !appId || !firebaseUser) return; const timeoutId = setTimeout(() => { setIsDBReady(true); }, 3500); const eventosRef = collection(db, 'artifacts', appId, 'public', 'data', 'eventos');
    const unsubscribeEventos = onSnapshot(eventosRef, (snapshot) => { clearTimeout(timeoutId); const fbData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); snapshot.docChanges().forEach((change) => { if (change.type === "added") { const data = change.doc.data(); if (data.createdAt && (Date.now() - new Date(data.createdAt).getTime() < 15000)) { utils.triggerHaptic('success'); showAlert(`🔥 ¡Alerta de Sistema! Entró nueva reserva: ${data.cliente}`, true); } } }); setEventos(prev => { let hasChanges = false; const map = new Map(prev.map(e => [e.id, e])); fbData.forEach(e => { if (map.has(e.id)) { const exist = map.get(e.id); if (exist.estado !== e.estado || exist.abono !== e.abono || exist.total !== e.total || exist.deletedLocally !== e.deletedLocally) { map.set(e.id, { ...exist, estado: e.estado, abono: e.abono, total: e.total, deletedLocally: e.deletedLocally }); hasChanges = true; } } else { map.set(e.id, e); hasChanges = true; } }); if (!hasChanges && prev.length > 0) return prev; return Array.from(map.values()).sort((a,b) => String(a.fecha).localeCompare(String(b.fecha)) || String(a.hora).localeCompare(String(b.hora))); }); setIsDBReady(true); }, (error) => { console.warn("Firestore offline:", error); clearTimeout(timeoutId); setIsDBReady(true); });
    getDoc(getConfigRef('serviciosCustom')).then((docSnap) => { if (docSnap.exists()) { setCatalogoPaquetes(docSnap.data().paquetes || []); } }); getDoc(getConfigRef('clientesOcultos')).then((docSnap) => { if (docSnap.exists()) { setHiddenClients(docSnap.data().clients || []); } }); return () => { unsubscribeEventos(); clearTimeout(timeoutId); };
  }, [db, appId, firebaseUser]);

  const renderEventCard = (ev, i) => (<EventCardItem key={ev.id} ev={ev} idx={i} todayTime={todayTime} onWhatsApp={sendWhatsAppCall} onViewDoc={handleViewDoc} onEdit={openModal} onDelete={handleDeleteEvento} onDuplicate={handleDuplicateEvento} onMapClick={openGoogleMaps} empresa={appSettings.empresa} utils={utils} onUpdateEstado={handleUpdateEstado} onConvertir={handleConvertirReserva} />);
  const renderClientCard = (c, i) => (<ClientCardItem key={c.nombre} c={c} idx={i} isExpanded={expandedClientId === c.nombre} onToggleExpand={handleToggleClient} utils={utils} openModal={openModal} onDeleteClient={handleDeleteClient}/>);
  const renderTxItem = (ev) => (<TransactionItem key={ev.id} ev={ev} isExpanded={expandedFinanceId === ev.id} onToggleExpand={handleToggleFinance} utils={utils} />);

  const renderInicio = () => {
     if (isModoOperativo) {
        const faltanAbono = stats.eventosHoy.filter(ev => utils.safeNum(ev.abono) <= 0 && utils.normalizeText(ev.estado) !== 'completado'), faltanDireccion = stats.eventosHoy.filter(ev => (!ev.direccion || String(ev.direccion).trim() === '') && utils.normalizeText(ev.estado) !== 'completado'), faltanHora = stats.eventosHoy.filter(ev => (!ev.hora || String(ev.hora).trim() === '') && utils.normalizeText(ev.estado) !== 'completado');
        return (
          <div className="animate-fadeIn p-4 md:p-10 max-w-2xl mx-auto space-y-6 pb-32 relative z-50">
             <div className="fixed inset-0 bg-[#F8FAFC] -z-10 animate-fadeIn"></div>
             <div className="flex justify-between items-center bg-gradient-to-r from-[#2563FF] to-[#7C3AED] text-white p-6 rounded-[24px] shadow-lg"><div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-blue-100 mb-1">Modo En Terreno</p><h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2 tracking-tight"><Zap size={28} className="fill-white"/> Operativa de Hoy</h2></div><button type="button" onClick={() => setIsModoOperativo(false)} className="bg-white/20 hover:bg-white/30 p-3.5 rounded-xl transition-all shadow-sm backdrop-blur-md cursor-pointer"><X size={24} /></button></div>
             {(faltanAbono.length > 0 || faltanDireccion.length > 0 || faltanHora.length > 0) && (
                 <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200"><h3 className="text-slate-900 font-bold text-sm uppercase tracking-[0.1em] mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-rose-500"/> Checklist de Alertas</h3><div className="space-y-4">{faltanAbono.length > 0 && (<div className="flex items-center gap-4 bg-rose-50 border border-rose-100 p-4 rounded-xl shadow-sm"><IconBox icon={DollarSign} color="rose" className="border-0 p-2.5"/><div><p className="text-slate-900 font-bold text-[15px] leading-tight">Falta abono ({faltanAbono.length})</p><p className="text-rose-500 text-xs font-bold uppercase tracking-[0.1em] truncate max-w-[200px] mt-1">{faltanAbono.map(e=>String(e.cliente).split(' ')[0]).join(', ')}</p></div></div>)}{faltanDireccion.length > 0 && (<div className="flex items-center gap-4 bg-amber-50 border border-amber-100 p-4 rounded-xl shadow-sm"><IconBox icon={MapPin} color="amber" className="border-0 p-2.5"/><div><p className="text-slate-900 font-bold text-[15px] leading-tight">Falta dirección ({faltanDireccion.length})</p><p className="text-amber-500 text-xs font-bold uppercase tracking-[0.1em] truncate max-w-[200px] mt-1">{faltanDireccion.map(e=>String(e.cliente).split(' ')[0]).join(', ')}</p></div></div>)}{faltanHora.length > 0 && (<div className="flex items-center gap-4 bg-[#2563FF]/5 border border-[#2563FF]/10 p-4 rounded-xl shadow-sm"><IconBox icon={Clock} color="blue" className="border-0 p-2.5"/><div><p className="text-slate-900 font-bold text-[15px] leading-tight">Falta hora ({faltanHora.length})</p><p className="text-[#2563FF] text-xs font-bold uppercase tracking-[0.1em] truncate max-w-[200px] mt-1">{faltanHora.map(e=>String(e.cliente).split(' ')[0]).join(', ')}</p></div></div>)}</div></div>
             )}
             <div className="space-y-6">{stats.eventosHoy.length === 0 ? (<div className="text-center py-16 bg-white/80 backdrop-blur-md rounded-[24px] border border-slate-200/50 shadow-sm"><Sun size={56} className="mx-auto text-slate-300 mb-5" strokeWidth={1.5}/><p className="text-slate-900 font-extrabold text-xl mb-2 tracking-tight">¡Todo Despejado!</p><p className="text-slate-500 font-medium text-sm">No hay eventos operativos para hoy.</p></div>) : (stats.eventosHoy.map(renderEventCard))}</div>
          </div>
        );
     }
     return (
       <div className="animate-fadeIn p-4 md:p-6 lg:p-10 max-w-5xl mx-auto space-y-8 pb-32 md:pb-10 relative z-10">
          <div className="bg-gradient-to-br from-[#2563FF] via-[#7C3AED] to-[#FF3EA5] rounded-[32px] p-8 sm:p-12 shadow-[0_20px_50px_rgba(124,58,237,0.3)] relative overflow-hidden group animate-fadeInUp">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05] mix-blend-overlay pointer-events-none"></div><div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle,rgba(255,255,255,0.15)_0%,transparent_60%)] pointer-events-none"></div>
             <div className="relative z-10 text-center sm:text-left w-full sm:w-auto"><h1 className="text-3xl sm:text-5xl font-extrabold mb-3 flex items-center justify-center sm:justify-start gap-3 tracking-tight text-white drop-shadow-md">Hola Diverty 👋</h1><p className="text-white/90 font-medium text-sm sm:text-base tracking-wide drop-shadow-sm">Gestiona tus reservas, contratos y finanzas al instante.</p></div>
             <div className="w-full sm:w-auto relative z-10 mt-6 sm:mt-0"><button type="button" onClick={() => openModal()} className="w-full sm:w-auto py-4 px-8 text-[15px] bg-white text-[#7C3AED] font-black rounded-xl transition-all shadow-xl hover:shadow-[0_10px_25px_rgba(0,0,0,0.2)] flex items-center justify-center gap-2.5 hover:scale-[1.02] active:scale-[0.98] border border-white"><Plus size={20} strokeWidth={2.5}/> Nueva Reserva</button></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]" onClick={() => { handleTabChange('eventos'); setViewMode('hoy'); }}>
                 <AppCard title="Eventos Hoy" icon={Calendar} iconColor="primary"><p className="text-4xl font-extrabold text-slate-900 tracking-tight">{stats.eventosHoy.length}</p></AppCard>
              </div>
              <div className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]" onClick={() => handleTabChange('finanzas')}>
                 <AppCard title="Ingresos Mes" icon={DollarSign} iconColor="success"><p className="text-4xl font-extrabold text-emerald-500 tracking-tighter">${stats.ingresosEsteMes.toFixed(0)}</p></AppCard>
              </div>
              <div className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]" onClick={() => handleTabChange('clientes')}>
                 <AppCard title="Clientes Activos" icon={Users} iconColor="warning"><p className="text-4xl font-extrabold text-slate-900 tracking-tighter">{clientsList.length}</p></AppCard>
              </div>
              <div className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]" onClick={() => handleTabChange('finanzas')}>
                 <AppCard title="Por Cobrar" icon={TrendingUp} iconColor="danger"><p className="text-4xl font-extrabold text-rose-500 tracking-tighter">${stats.deudaTotal.toFixed(0)}</p></AppCard>
              </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4"><button type="button" onClick={() => openModal(null, true)} className="flex-1 bg-white/80 backdrop-blur-sm border border-slate-200/80 text-slate-800 rounded-xl py-4 font-bold flex items-center justify-center gap-2.5 hover:bg-white hover:shadow-md transition-all shadow-sm"><FileText size={20} className="text-amber-500"/> <span className="hidden sm:inline">Crear Cotización</span></button><button type="button" onClick={() => {utils.triggerHaptic('light'); setIsModoOperativo(true); window.scrollTo(0,0);}} className="flex-1 bg-gradient-to-r from-[#2563FF] to-[#7C3AED] text-white rounded-xl py-4 font-bold flex items-center justify-center gap-2.5 transition-all shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_12px_25px_rgba(124,58,237,0.35)] relative overflow-hidden"><Zap size={20} className="text-white fill-white relative z-10"/> <span className="hidden sm:inline relative z-10">Modo Operativo</span></button><button type="button" onClick={() => { window.location.reload(); }} className="bg-white/80 backdrop-blur-sm border border-slate-200/80 text-[#2563FF] rounded-xl py-4 px-6 flex items-center justify-center hover:bg-white transition-all shadow-sm hover:shadow-md" title="Refrescar vista"><RefreshCw size={22} /></button></div>
          {stats.alertasOperativas.length > 0 && (<div className="animate-slideDown mt-10"><h3 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400 flex items-center gap-2 mb-5"><AlertTriangle size={16} className="text-rose-500 animate-pulse"/> Urgencias ({stats.alertasOperativas.length})</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-5">{stats.alertasOperativas.map((al, i) => { const AlIcon = al.icon; return (<div key={al.id} onClick={() => openModal(al.ev)} className={`p-5 sm:p-6 rounded-[24px] border border-slate-200/60 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all duration-500 ease-out bg-white/90 backdrop-blur-md hover:border-rose-300 shadow-sm hover:shadow-lg animate-fadeInUp`} style={{animationDelay: `${i*100}ms`}}><div className="flex items-center gap-4"><div className={`p-3.5 rounded-xl ${al.bg} border`}><AlIcon size={24} strokeWidth={2.5}/></div><div className="flex flex-col items-start"><p className={`text-[15px] font-bold text-slate-900 leading-tight capitalize`}>{al.text}</p><p className="text-[10px] font-bold uppercase tracking-wider text-rose-500 mt-1.5">{al.tagText}</p></div></div><ChevronRight size={20} className="text-slate-300" /></div>)})}</div></div>)}
          {cotizacionesActivas.length > 0 && (<div className="mt-14 pt-10 border-t border-slate-200/50 relative"><h3 className="font-extrabold text-2xl text-slate-900 flex items-center gap-3 mb-6 tracking-tight"><FileText className="text-amber-500" size={24} /> Cotizaciones Activas</h3><div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{cotizacionesActivas.map(renderEventCard)}</div></div>)}
          <div className="mt-14 pt-10 border-t border-slate-200/50 relative"><div className={UI.flexBetween + " mb-6"}><h3 className="font-extrabold text-2xl text-slate-900 flex items-center gap-3 tracking-tight"><CalendarDays className="text-[#2563FF]" size={24} /> Próximas Reservas</h3><button type="button" onClick={() => {handleTabChange('eventos')}} className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-[#2563FF] transition-colors">Ver Todas <ChevronRight size={14} className="inline"/></button></div>{proximasReservas.length > 0 ? (<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{proximasReservas.map(renderEventCard)}</div>) : (<EmptyState icon={CalendarDays} title="Agenda Despejada" message="No tienes reservas programadas para hoy ni mañana. ¡Aprovecha para crear nuevas cotizaciones!" actionBtn={<AppButton onClick={()=>openModal()} variant="primary" icon={Plus} className="mt-4 px-8 py-4 shadow-md">Crear Reserva</AppButton>} />)}</div>
       </div>
     );
  };

  const renderEventos = () => {
    const renderCalendarGrid = () => {
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate(), firstDayIndex = new Date(calYear, calMonth, 1).getDay(), days = Array.from({length: daysInMonth}, (_, i) => i + 1), blanks = Array.from({length: firstDayIndex}, (_, i) => i), weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'], monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return (
            <div className={`bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-[32px] p-5 sm:p-8 mb-8 animate-fadeIn transition-all duration-500 shadow-[0_10px_30px_rgba(0,0,0,0.05)]`}>
               <div className="flex flex-col sm:flex-row justify-between items-center gap-5 mb-8 border-b border-slate-100 pb-6"><h3 className="text-2xl font-black text-slate-900 capitalize flex items-center gap-3 tracking-tight"><IconBox icon={CalendarDays} color="blue" /> {monthNames[calMonth]} {calYear}</h3><div className="flex gap-2 bg-slate-50/80 p-1.5 rounded-[16px] border border-slate-200/50 w-full sm:w-auto justify-between sm:justify-start shadow-sm"><button type="button" onClick={() => { utils.triggerHaptic('light'); setCalMonth(calMonth === 0 ? 11 : calMonth - 1); setCalYear(calMonth === 0 ? calYear - 1 : calYear); }} className="p-3 hover:bg-white rounded-xl transition-all text-slate-500 hover:text-slate-900 shadow-sm"><ChevronLeft size={18}/></button><button type="button" onClick={() => { utils.triggerHaptic('light'); setCalMonth(todayObj.getMonth()); setCalYear(todayObj.getFullYear()); setFilterDate(todayStr); }} className="px-6 py-2 hover:bg-white shadow-sm text-[#2563FF] font-bold text-xs uppercase tracking-[0.1em] rounded-xl transition-all">HOY</button><button type="button" onClick={() => { utils.triggerHaptic('light'); setCalMonth(calMonth === 11 ? 0 : calMonth + 1); setCalYear(calMonth === 11 ? calYear + 1 : calYear); }} className="p-3 hover:bg-white rounded-xl transition-all text-slate-500 hover:text-slate-900 shadow-sm"><ChevronRight size={18}/></button></div></div>
               <div className="grid grid-cols-7 gap-2 sm:gap-4 text-center mb-4">{weekDays.map(d => <div key={d} className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{d.substring(0,3)}</div>)}</div>
               <div className="grid grid-cols-7 gap-2 sm:gap-4">
                  {blanks.map(b => <div key={`b-${b}`} className="min-h-[70px] sm:min-h-[130px] bg-transparent"></div>)}
                  {days.map(d => {
                     const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`, dayEvents = eventosActivos.filter(e => e.fecha === dateStr && !utils.normalizeText(e.estado).includes('cotizaci') && !utils.normalizeText(e.estado).includes('cot.') && utils.normalizeText(e.estado) !== 'cancelado'), isToday = dateStr === todayStr, isSelected = filterDate === dateStr, hasEvents = dayEvents.length > 0;
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
        return (<div className="mt-8 space-y-10 animate-fadeIn relative z-10">{Object.keys(grouped).sort().map(fecha => (<div key={fecha} className="flex flex-col"><div className="flex items-center gap-4 mb-6"><div className="bg-white/90 backdrop-blur-sm text-slate-900 px-6 py-3.5 rounded-xl font-bold text-sm flex items-center gap-3 shadow-sm border border-slate-200/80"><CalendarDays size={18} className="text-[#2563FF]" strokeWidth={2.5}/> {fecha ? String(fecha).split('-').reverse().join('/') : 'Sin Fecha'}</div><div className="flex-1 h-px bg-slate-200/80"></div></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{grouped[fecha].map(renderEventCard)}</div></div>))}</div>);
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
        <div className="relative z-10">{viewMode === 'mes' && renderCalendarGrid()}{(!isDBReady && !globalSearch && !filterDate && eventosActivos.length === 0) ? (<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8"><SkeletonCard /><SkeletonCard /></div>) : agendaFiltrados.length === 0 ? (<EmptyState icon={Search} title="Sin resultados" message="No se encontraron reservas." actionBtn={!!globalSearch || !!filterDate ? <button type="button" onClick={()=>{setGlobalSearch(''); setFilterDate(''); setViewMode('todas');}} className="mt-4 text-[#2563FF] font-bold px-8 py-3.5 rounded-[16px] border border-[#2563FF]/30 bg-[#2563FF]/10 hover:bg-[#2563FF]/20 transition-all duration-300 shadow-sm uppercase tracking-wider text-xs cursor-pointer">Limpiar filtros</button> : null} />) : (!!globalSearch || !!filterDate) ? (<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">{agendaFiltrados.map(renderEventCard)}</div>) : ( renderListView() )}</div>
      </div>
    );
  };

  const renderClientes = () => {
     return (
       <div className="animate-fadeIn p-4 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-8 pb-32 relative z-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-4"><div><h2 className={UI.title}><Users size={36} className="text-[#2563FF] inline mr-2 drop-shadow-sm" /> CRM Ventas</h2><p className="text-slate-500 text-sm mt-2 font-medium">Fideliza y administra a tus clientes.</p></div></div>
          
          {/* Tarjetas funcionales superiores */}
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
             <div className="mb-12 animate-slideDown"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-5 flex items-center gap-2"><Zap size={18} className="text-amber-500 fill-amber-500"/> Oportunidades de Venta</h3><div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide snap-x">{contactCandidates.map((c, idx) => { const phoneClean = String(c.telefono).replace(/\D/g,''), msg = `¡Hola ${c.nombre}! 👋 Te saludamos de Diverty Eventos. Ha pasado un tiempo desde tu última fiesta. ¿Tienes alguna celebración próxima? ¡Tenemos nuevas promociones! 🎉`; return (<div key={`contact-${c.nombre}`} className={`snap-center shrink-0 w-80 ${UI.card} p-6 flex flex-col gap-5 animate-fadeInUp`} style={{ animationDelay: `${idx * 100}ms` }}><div><p className="font-extrabold text-slate-900 truncate text-xl tracking-tight capitalize">{c.nombre}</p><Badge color="rose" className="mt-2"><Clock size={12}/> Sin compras hace {c.daysSince} días</Badge></div><button type="button" onClick={() => { utils.openWhatsAppBusiness(phoneClean, msg); }} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white py-3.5 rounded-[16px] transition-all font-bold text-xs uppercase tracking-[0.2em] flex justify-center items-center gap-2 shadow-md"><MessageCircle size={18} strokeWidth={2.5}/> Enviar Promo</button></div>)})}</div></div>
          )}
          <div className="flex flex-col sm:flex-row gap-4"><div className={`${UI.card} p-2 flex-1 flex transition-all duration-300 ease-out`}><div className="flex flex-1 relative group"><Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#2563FF] transition-colors" /><input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar cliente..." className="w-full bg-transparent py-3 pl-14 pr-10 font-semibold outline-none text-[15px] placeholder-slate-400 text-slate-900" />{searchTerm && (<button type="button" onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 p-1.5 rounded-full hover:bg-slate-100 transition-all"><X size={16}/></button>)}</div></div><button type="button" onClick={() => setClientSort(clientSort === 'gasto' ? 'recientes' : 'gasto')} className={`${UI.card} px-8 py-3.5 flex items-center justify-center gap-2.5 font-bold text-xs uppercase tracking-widest transition-all text-slate-600 hover:text-[#2563FF] hover:bg-white`}> <ArrowDownWideNarrow size={18}/> <span className="hidden sm:inline">Ordenar: </span><span className="text-[#2563FF]">{clientSort === 'gasto' ? 'Mayor Gasto' : 'Recientes'}</span></button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">{sortedFilteredClients.length === 0 ? (<div className="col-span-full"><EmptyState icon={Users} title="Bóveda de Clientes Vacía" message="Registra tu primer evento o ajusta los filtros para ver a tus clientes aquí." actionBtn={null} /></div>) : (sortedFilteredClients.map(renderClientCard))}</div>
       </div>
     );
  };

  const renderFinanzas = () => {
      return (
          <div className="animate-fadeIn p-4 md:p-8 lg:p-10 max-w-5xl mx-auto space-y-8 pb-32 relative z-10">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
               <div>
                 <h2 className={UI.title}>Finanzas</h2>
                 <p className="text-slate-500 text-sm mt-2 font-medium">Análisis detallado de tu flujo de efectivo e ingresos.</p>
               </div>
               
               {/* SELECTORES DE TIEMPO PREMIUM CON MESES ESPECÍFICOS */}
               <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center bg-white/95 backdrop-blur-md p-2 rounded-[24px] border border-slate-200/80 shadow-md w-full sm:w-auto">
                 <div className="flex gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/50">
                   <button 
                     type="button" 
                     onClick={() => {utils.triggerHaptic('light'); setFinancePeriod('mes');}} 
                     className={`px-5 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all duration-300 ease-out active:scale-[0.98] ${financePeriod === 'mes' ? 'bg-gradient-to-r from-[#2563FF] to-[#7C3AED] text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                   >
                     Este Mes
                   </button>
                   <button 
                     type="button" 
                     onClick={() => {utils.triggerHaptic('light'); setFinancePeriod('todos');}} 
                     className={`px-5 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all duration-300 ease-out active:scale-[0.98] ${financePeriod === 'todos' ? 'bg-gradient-to-r from-[#2563FF] to-[#7C3AED] text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                   >
                     Histórico
                   </button>
                   <button 
                     type="button" 
                     onClick={() => {utils.triggerHaptic('light'); setFinancePeriod('seleccionado');}} 
                     className={`px-5 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all duration-300 ease-out active:scale-[0.98] ${financePeriod === 'seleccionado' ? 'bg-gradient-to-r from-[#2563FF] to-[#7C3AED] text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                   >
                     Otro Mes
                   </button>
                 </div>

                 {/* CONTROLES ADICIONALES PARA SELECCIONAR MES Y AÑO ESPECÍFICO */}
                 {financePeriod === 'seleccionado' && (
                   <div className="flex gap-2 items-center animate-fadeIn py-1 px-2 border-l border-slate-200">
                     <select 
                       value={selectedFinanceMonth} 
                       onChange={(e) => { utils.triggerHaptic('light'); setSelectedFinanceMonth(parseInt(e.target.value)); }}
                       className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#2563FF] cursor-pointer"
                     >
                       {NOMBRES_MESES.map((name, idx) => (
                         <option key={idx} value={idx + 1}>{name}</option>
                       ))}
                     </select>
                     <select 
                       value={selectedFinanceYear} 
                       onChange={(e) => { utils.triggerHaptic('light'); setSelectedFinanceYear(parseInt(e.target.value)); }}
                       className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#2563FF] cursor-pointer"
                     >
                       {[2024, 2025, 2026, 2027, 2028].map(y => (
                         <option key={y} value={y}>{y}</option>
                       ))}
                     </select>
                   </div>
                 )}

                 <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
                 <button 
                   type="button" 
                   onClick={downloadExcel} 
                   className="p-2.5 sm:px-4 sm:py-2.5 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all duration-300 ease-out active:scale-[0.98] flex items-center justify-center gap-2 border border-transparent hover:border-emerald-200" 
                   title="Exportar a Excel"
                 >
                   <Download size={18} strokeWidth={2.5}/> 
                   <span className="hidden sm:inline text-[11px] font-bold uppercase tracking-widest">Excel</span>
                 </button>
               </div>
             </div>

             {/* BALANCE NETO CON ANIMACIÓN REFINADA */}
             <div className="bg-white/90 backdrop-blur-xl rounded-[32px] p-8 sm:p-12 shadow-[0_15px_40px_rgba(0,0,0,0.06)] relative overflow-hidden border border-slate-200/60 animate-slideDown">
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-[radial-gradient(circle,rgba(37,99,235,0.08)_0%,transparent_60%)] pointer-events-none transform-gpu"></div>
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-[radial-gradient(circle,rgba(124,58,237,0.08)_0%,transparent_60%)] pointer-events-none transform-gpu"></div>
                <div className="text-center relative z-10">
                  <p className="text-slate-400 font-bold uppercase tracking-[0.25em] text-[11px] mb-4 flex justify-center items-center gap-2">
                    <Star size={16} className="text-amber-400 fill-amber-400 animate-spin-slow"/> 
                    BALANCE NETO DE {financePeriod === 'mes' ? 'ESTE MES' : financePeriod === 'todos' ? 'HISTÓRICO' : `${NOMBRES_MESES[financeMonth - 1].toUpperCase()} ${financeYear}`}
                  </p>
                  <h1 className={`text-6xl sm:text-7xl md:text-8xl font-black mb-12 tracking-tighter ${finanzasData.bT >= 0 ? 'text-slate-900' : 'text-rose-500'}`}>
                    ${finanzasData.bT.toFixed(0)}
                    <span className="text-3xl sm:text-4xl text-slate-300">.{(finanzasData.bT % 1).toFixed(2).substring(2)}</span>
                  </h1>
                  
                  <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-8 sm:gap-16 border-t border-slate-200/60 pt-10 mt-2">
                    <div className="flex items-center gap-4 bg-[#2563FF]/5 px-5 py-3 rounded-2xl border border-[#2563FF]/10 shadow-sm flex-1 sm:flex-initial">
                      <IconBox icon={ArrowUpRight} color="emerald" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-none" />
                      <div className="text-left">
                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-1.5">Ingresos Brutos</p>
                        <p className="text-emerald-500 font-black text-2xl leading-none tracking-tight">${finanzasData.tI.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 bg-rose-500/5 px-5 py-3 rounded-2xl border border-rose-500/10 shadow-sm flex-1 sm:flex-initial">
                      <IconBox icon={ArrowDownRight} color="rose" className="bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-none" />
                      <div className="text-left">
                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-1.5">Gastos Operativos</p>
                        <p className="text-rose-500 font-black text-2xl leading-none tracking-tight">-${finanzasData.tG.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 bg-[#7C3AED]/5 px-5 py-3 rounded-2xl border border-[#7C3AED]/10 shadow-sm flex-1 sm:flex-initial">
                      <IconBox icon={BarChart3} color="purple" className="bg-purple-500/10 text-[#7C3AED] border-purple-500/20 shadow-none" />
                      <div className="text-left">
                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-1.5">Margen (ROI)</p>
                        <p className="text-[#2563FF] font-black text-2xl leading-none tracking-tight">{finanzasData.roi}%</p>
                      </div>
                    </div>
                  </div>
                </div>
             </div>

             {/* RESUMEN DE ESTADÍSTICAS Y GRÁFICO BAR CHART REDISEÑADO */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 animate-fadeInUp" style={{animationDelay: '100ms'}}>
               <div className={`${UI.card} p-6 sm:p-8 flex flex-col justify-center`}>
                 <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-2.5">Ganancia Hoy</p>
                 <p className="text-3xl font-extrabold text-emerald-500 tracking-tight">${animatedGananciaHoy.toFixed(0)}</p>
               </div>
               
               <div className={`${UI.card} p-6 sm:p-8 flex flex-col justify-center`}>
                 <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-2.5">Por Cobrar Total</p>
                 <p className="text-3xl font-extrabold text-rose-500 tracking-tight">${finanzasData.deudaTotalGlobal.toFixed(0)}</p>
               </div>

               {/* GRÁFICO DINÁMICO ADAPTADO AL PERIODO */}
               <div className={`col-span-2 ${UI.card} p-6 sm:p-8 flex items-end justify-between gap-4 h-[120px]`}>
                 <div className="flex-1 flex justify-between items-end h-full gap-2 sm:gap-3">
                   {chartData.map((d, i) => { 
                     const hPercent = (d.value / maxChartVal) * 100; 
                     return (
                       <div key={i} className="w-full flex flex-col items-center justify-end h-full gap-1.5 group relative">
                         <div className="absolute -top-8 bg-slate-900 text-white text-[9px] font-extrabold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap shadow-md">
                           ${d.value.toFixed(0)}
                         </div>
                         <div className="w-full bg-slate-100/50 rounded-md relative overflow-hidden transition-all duration-300 ease-out group-hover:bg-slate-200/80 h-[70px]">
                           <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#2563FF] to-[#7C3AED] transition-all duration-1000 ease-out" style={{height: `${hPercent}%`}}></div>
                         </div>
                         <span className="text-[9px] font-bold uppercase text-slate-400 tracking-[0.15em]">{d.date}</span>
                       </div>
                     ) 
                   })}
                 </div>
                 <div className="pl-6 border-l border-slate-200/80 flex flex-col justify-center h-full">
                   <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-2 leading-none">Total Período</p>
                   <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">${chartData.reduce((s,d)=>s+d.value,0).toFixed(0)}</p>
                 </div>
               </div>
             </div>

             {/* META DEL MES CON CONTEXTO ADAPTATIVO */}
             <div className={`${UI.card} p-6 sm:p-8 animate-fadeInUp`} style={{animationDelay: '200ms'}}>
               <div className="flex justify-between items-end mb-6">
                 <div>
                   <h4 className="font-extrabold text-2xl text-slate-900 tracking-tight flex items-center gap-3">
                     <Award size={28} className="text-amber-500"/> Meta del Período
                   </h4>
                   <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 mt-2">
                     {financePeriod === 'todos' ? 'Progreso histórico acumulado' : `Día ${finanzasMes.diasTranscurridos} de ${finanzasMes.diasTotales} del mes`}
                   </p>
                 </div>
                 <div className="text-right">
                   <span className="text-4xl font-black text-emerald-500 tracking-tight">
                     ${finanzasMes.ingresosEsteMesGlobal.toFixed(0)} 
                     <span className="text-xl font-bold text-slate-400">/ ${appSettings.metaMensual}</span>
                   </span>
                 </div>
               </div>
               
               <div className="w-full bg-slate-200/80 rounded-full h-3 mb-5 overflow-hidden">
                 <AnimatedProgress value={finanzasMes.progresoMeta} />
               </div>
               
               <div className={UI.flexBetween}>
                 <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600 bg-slate-100/80 px-3.5 py-1.5 rounded-[10px] border border-slate-200/50 shadow-sm">
                   {finanzasMes.progresoMeta.toFixed(1)}% Alcanzado
                 </p>
                 {financePeriod !== 'todos' && (
                   <p className={`text-[11px] font-bold uppercase tracking-[0.1em] px-3.5 py-1.5 rounded-[10px] border shadow-sm ${finanzasMes.proyeccion >= appSettings.metaMensual ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-500 border-rose-200'}`}>
                     Proyectado: ${finanzasMes.proyeccion.toFixed(0)}
                   </p>
                 )}
               </div>
             </div>

             {/* LISTA DE PENDIENTES DE PAGO Y TRANSACCIONES DEL PERIODO */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
                <div className="flex flex-col gap-5 animate-fadeInUp" style={{animationDelay: '300ms'}}>
                  <div className="flex justify-between items-center px-2">
                    <h4 className="font-extrabold text-xl text-slate-900 flex items-center gap-3 tracking-tight">
                      <Clock size={22} className="text-rose-500"/> Cuentas por Cobrar 
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                        ({financePeriod === 'todos' ? 'Histórico' : `${NOMBRES_MESES[financeMonth - 1]}`})
                      </span>
                    </h4>
                    {evtCalculoBase.filter(e => (utils.safeNum(e.total)-utils.safeNum(e.abono))>0 && utils.normalizeText(e.estado)!=='completado').length > 0 && (
                      <button type="button" onClick={handleCopiarCobros} className="text-[10px] font-bold uppercase tracking-widest text-[#2563FF] bg-[#2563FF]/10 hover:bg-[#2563FF]/20 py-2.5 px-5 rounded-[12px] transition-all border border-[#2563FF]/20 flex items-center gap-2"><Copy size={16}/> Copiar Lista</button>
                    )}
                  </div>
                  
                  <div className={`${UI.card} overflow-hidden flex flex-col h-[400px] p-0`}>
                    {evtCalculoBase.filter(e => (utils.safeNum(e.total)-utils.safeNum(e.abono))>0 && utils.normalizeText(e.estado)!=='completado').length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 opacity-60">
                        <CheckCircle2 size={48} className="text-emerald-500 mb-4"/>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Sin deudas en este período.</p>
                      </div>
                    ) : (
                      <div className="overflow-y-auto flex-1 scrollbar-hide p-4 space-y-2">
                        {evtCalculoBase.filter(e => (utils.safeNum(e.total)-utils.safeNum(e.abono))>0 && utils.normalizeText(e.estado)!=='completado').map((ev) => (
                          <div key={ev.id} className="w-full flex justify-between items-center p-5 rounded-[20px] bg-white/80 hover:bg-white transition-all duration-300 border border-slate-200/50">
                            <div className="flex flex-col min-w-0 flex-1 pr-4">
                              <p className="font-extrabold capitalize text-[16px] text-slate-900 truncate tracking-tight">{String(ev.cliente || '')}</p>
                              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-1.5">{ev.fecha ? String(ev.fecha).split('-').reverse().join('/') : ''}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-rose-500 font-extrabold text-2xl block leading-none mb-2.5 tracking-tight">${(utils.safeNum(ev.total) - utils.safeNum(ev.abono)).toFixed(2)}</span>
                              <button type="button" onClick={() => sendWhatsAppCall(ev, 'recordatorio', appSettings.empresa)} className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-emerald-500 transition-colors flex items-center justify-end gap-1.5 ml-auto">
                                Cobrar <MessageCircle size={14}/>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-5 animate-fadeInUp" style={{animationDelay: '400ms'}}>
                  <div className="flex justify-between items-center px-2">
                    <h4 className="font-extrabold text-xl text-slate-900 flex items-center gap-3 tracking-tight">
                      <FileSpreadsheet size={22} className="text-emerald-500"/> Detalle de Eventos
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                        ({financePeriod === 'todos' ? 'Todos' : `${NOMBRES_MESES[financeMonth - 1]}`})
                      </span>
                    </h4>
                  </div>
                  
                  <div className={`${UI.card} overflow-hidden flex flex-col h-[400px] p-0`}>
                    {evtCalculoBase.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 opacity-60">
                        <Info size={48} className="text-slate-300 mb-4"/>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">No hay transacciones registradas.</p>
                      </div>
                    ) : (
                      <div className="overflow-y-auto flex-1 scrollbar-hide p-4 space-y-2">
                        {evtCalculoBase.map(renderTxItem)}
                      </div>
                    )}
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
              <div className="col-span-1 lg:col-span-2 bg-white/90 backdrop-blur-xl rounded-[32px] p-8 sm:p-10 shadow-sm relative overflow-hidden flex flex-col justify-between border border-slate-200/80 animate-fadeInUp"><div className="absolute -top-32 -right-32 w-64 h-64 bg-[radial-gradient(circle,rgba(37,99,235,0.06)_0%,transparent_60%)] pointer-events-none transform-gpu"></div><div className="absolute -bottom-32 -left-32 w-64 h-64 bg-[radial-gradient(circle,rgba(124,58,237,0.06)_0%,transparent_60%)] pointer-events-none transform-gpu"></div><div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6"><div className="w-24 h-24 rounded-[24px] bg-gradient-to-tr from-[#2563FF] to-[#7C3AED] p-[3px] shadow-lg shrink-0"><img src={LOGO_URL} className="w-full h-full object-contain rounded-[21px] bg-white p-3" alt="Diverty Profile" crossOrigin="anonymous"/></div><div><h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">Administrador Global</h3><p className="text-[#2563FF] text-sm font-bold tracking-[0.25em] uppercase mt-2 flex items-center gap-2.5"><Cloud size={16} className="text-emerald-500"/> En Línea con Firebase</p></div></div><div className="relative z-10 mt-10 flex flex-col sm:flex-row gap-5 border-t border-slate-200/60 pt-8"><button type="button" onClick={activarNotificaciones} className="flex-1 flex items-center justify-center gap-2.5 bg-[#2563FF]/10 hover:bg-[#2563FF]/20 text-[#2563FF] py-4 rounded-[16px] transition-all border border-[#2563FF]/20 font-bold text-sm shadow-sm"><BellRing size={20}/> Obtener Token Push</button><button type="button" onClick={handleLogout} className="flex-1 flex items-center justify-center gap-2.5 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-500 py-4 rounded-[16px] transition-all border border-slate-200/80 hover:border-rose-200 font-bold text-sm"><Lock size={20}/> Cerrar Sesión</button></div></div>
              <div className={`${UI.card} p-8 sm:p-10 flex flex-col relative overflow-hidden animate-fadeInUp`} style={{animationDelay:'100ms'}}><div className="absolute -top-10 -right-10 w-32 h-32 bg-[radial-gradient(circle,rgba(251,191,36,0.1)_0%,transparent_60%)] pointer-events-none transform-gpu"></div><h4 className="font-extrabold text-slate-900 flex items-center gap-3 mb-6 text-xl tracking-tight relative z-10"><Award size={26} className="text-amber-500"/> Meta Mensual</h4><div className="relative z-10 flex-1 flex flex-col"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2.5 block">Objetivo de ventas ($)</label><div className="relative mb-5"><span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-xl">$</span><input type="number" value={appSettings.metaMensual} onChange={e => updateSettings({...appSettings, metaMensual: utils.safeNum(e.target.value)})} className="w-full bg-slate-50/80 backdrop-blur-sm border border-slate-200/80 rounded-[16px] py-4 pl-10 pr-5 text-2xl font-extrabold text-slate-900 outline-none focus:border-[#2563FF]/50 focus:ring-4 focus:ring-[#2563FF]/10 transition-all shadow-sm" /></div><p className="text-[11px] text-slate-500 font-medium mt-auto bg-slate-50/50 backdrop-blur-sm p-4 rounded-[16px] border border-slate-100/80 leading-relaxed shadow-sm">Al actualizar este valor, las raíces de rentabilidad se recalcularán automáticamente.</p></div></div>
              <div className={`col-span-1 lg:col-span-3 ${UI.card} p-8 sm:p-10 animate-fadeInUp`} style={{animationDelay:'200ms'}}><div className="flex justify-between items-center mb-8 border-b border-slate-200/60 pb-6"><h4 className="font-extrabold text-2xl text-slate-900 flex items-center gap-3 tracking-tight"><Briefcase size={28} className="text-[#2563FF]"/> Facturación y Banco</h4><Badge color="blue"><Save size={14}/> Autoguardado</Badge></div><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">{[ { key: 'nombreTitular', label: 'Nombre del Titular o Empresa' }, { key: 'ruc', label: 'RUC / Identificación' }, { key: 'banco', label: 'Entidad Bancaria' }, { key: 'tipoCuenta', label: 'Tipo de Cuenta' }, { key: 'numeroCuenta', label: 'Número de Cuenta' }, { key: 'telefono', label: 'Teléfono (Yappy / Contacto)' } ].map(f => (<Field key={f.key} label={f.label} value={appSettings.empresa[f.key]} onChange={e => updateSettings({...appSettings, empresa: {...appSettings.empresa, [f.key]: e.target.value}})} />))}</div><div className="mt-8 bg-blue-50/80 backdrop-blur-sm p-5 rounded-[16px] border border-blue-100 flex items-start gap-4 shadow-sm"><Info size={20} className="text-[#2563FF] shrink-0 mt-0.5"/><p className="text-[11px] font-medium text-slate-700 leading-relaxed">Estos datos se insertarán automáticamente en todos los PDFs de contratos, facturas y en los mensajes de WhatsApp que envíes a tus clientes.</p></div></div>
              <div className="col-span-1 lg:col-span-3 bg-rose-50/80 backdrop-blur-sm border border-dashed border-rose-200 rounded-[32px] p-8 sm:p-10 mt-4 animate-fadeInUp flex flex-col sm:flex-row items-center justify-between gap-6 transition-all hover:bg-rose-100" style={{animationDelay:'300ms'}}><div><h4 className="font-extrabold text-rose-600 text-2xl flex items-center gap-3 tracking-tight"><AlertTriangle size={28}/> Zona de Peligro</h4><p className="text-[15px] font-medium text-rose-500 mt-3 max-w-xl leading-relaxed">Esta acción purgará toda la base de datos local y en la nube. Se eliminarán todas las reservas, el historial de clientes y los registros financieros de forma permanente.</p></div><button type="button" onClick={handleWipeAll} className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-bold py-5 px-8 rounded-[16px] shadow-lg transition-all uppercase tracking-[0.2em] text-[13px] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"><Trash2 size={20}/> Purgar Sistema</button></div>
          </div>
      </div>
    );
  };

  if (isPrinting && printData) return <PdfTemplate printData={printData} printType={printType} pdfScale={pdfScale} onClose={()=>setIsPrinting(false)} onPrint={printNativePDF} onShare={handleSharePDF} onDownload={downloadPDF} appSettings={appSettings} eventosActivos={eventosActivos} />;
  
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

        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Portal Diverty</h1>
          <p className="text-slate-500 font-bold tracking-[0.2em] uppercase text-[10px]">Gestión de Eventos Premium</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 relative z-10">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
               <Users size={20} className="text-slate-400 group-focus-within:text-[#2563FF] transition-colors" />
            </div>
            <input type="email" required value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="Correo Electrónico" className="w-full bg-white/80 focus:bg-white border border-slate-200 focus:border-[#2563FF] rounded-2xl py-4 pl-14 pr-5 text-[15px] font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-[#2563FF]/10 transition-all shadow-sm placeholder:text-slate-400" />
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
               <Lock size={20} className="text-slate-400 group-focus-within:text-[#2563FF] transition-colors" />
            </div>
            <input type="password" required value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Contraseña" className="w-full bg-white/80 focus:bg-white border border-slate-200 focus:border-[#2563FF] rounded-2xl py-4 pl-14 pr-5 text-[15px] font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-[#2563FF]/10 transition-all shadow-sm placeholder:text-slate-400 tracking-[0.2em] placeholder:tracking-normal" />
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-[#2563FF] via-[#7C3AED] to-[#FF3EA5] hover:from-[#1D4ED8] hover:via-[#6D28D9] hover:to-[#DB2777] text-white font-black text-[15px] uppercase tracking-widest py-4 rounded-2xl shadow-[0_10px_30px_rgba(124,58,237,0.3)] hover:shadow-[0_15px_40px_rgba(124,58,237,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-3 mt-8 relative overflow-hidden group">
             <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
             <span className="relative z-10 flex items-center gap-2">Ingresar <Sparkles size={20} /></span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="font-outfit min-h-[100dvh] flex overflow-hidden selection:bg-[#2563FF]/30 transition-colors duration-200 relative bg-[#F8FAFC] text-slate-900">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap'); .font-outfit{font-family:'Outfit',sans-serif;} @keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}} .animate-fadeIn{animation:fadeIn 0.3s ease-out forwards;} .animate-slideUp{animation:slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards;} .animate-fadeInUp{animation:fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards;} @keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse-slow{0%,100%{opacity:0.04;transform:scale(1);}50%{opacity:0.06;transform:scale(1.05);}} .animate-pulse-slow{animation:pulse-slow 10s ease-in-out infinite;} @keyframes spin-slow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} .animate-spin-slow{animation:spin-slow 15s linear infinite;} ::-webkit-scrollbar{display:none;} input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}`}</style>
      <Bg /><Toast alert={toastAlert} /><Confirm modal={confirmModal} setModal={setConfirmModal} />
      <EventFormModal isOpen={modalConfig.isOpen} initialData={modalConfig.initialData} isCotizacionMode={modalConfig.isCotizacion} onClose={closeModal} onSave={handleSaveFromModal} PAQUETES={catalogoPaquetes} onAddCustomService={handleAddCustomService} showAlert={showAlert} clientesRegistrados={clientsList} />
      {isSidebarOpen && (<div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9998] md:hidden animate-fadeIn overscroll-none" onClick={() => setIsSidebarOpen(false)} />)}
      
      <aside className={`fixed md:relative top-0 left-0 h-[100dvh] w-[260px] shrink-0 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 text-slate-900 flex flex-col z-[9999] transform transition-transform duration-300 ease-out shadow-[10px_0_30px_rgba(0,0,0,0.03)] md:shadow-none overscroll-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
         <div className="p-8 flex items-center justify-between gap-4 border-b border-slate-200/60">
             <div className="flex items-center gap-4">
                 <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-sm">
                     <img src={LOGO_URL} alt="Logo" className="h-8 w-8 object-contain" />
                 </div>
                 <div>
                     <h1 className="text-2xl font-black tracking-tight text-slate-900">Diverty</h1>
                 </div>
             </div>
             <button type="button" className="md:hidden text-slate-400 hover:text-rose-500 transition-colors" onClick={() => setIsSidebarOpen(false)}>
                 <X size={24} />
             </button>
         </div>
         <nav className="flex-1 flex flex-col px-4 py-8 gap-3 overflow-y-auto">
             {NAV_ITEMS.map(t => { 
                 const Icon = t.icon; 
                 return (
                     <button key={t.id} type="button" onClick={() => handleTabChange(t.id)} className={`flex items-center gap-4 w-full px-5 py-4 rounded-[16px] font-bold transition-all duration-300 ${activeTab === t.id ? 'bg-gradient-to-r from-[#2563FF] to-[#7C3AED] text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5' : 'text-slate-500 hover:bg-slate-50/80 hover:text-slate-900 border border-transparent'}`}>
                         <Icon size={20} className={activeTab === t.id ? 'drop-shadow-md' : ''}/> 
                         <span className="tracking-widest uppercase text-[11px]">{t.text}</span>
                     </button>
                 ); 
             })}
         </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0 relative z-10 h-[100dvh] overflow-hidden">
          <header className="md:hidden bg-white/80 backdrop-blur-xl border-b border-slate-200/60 p-4 flex justify-between items-center z-40 sticky top-0 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-3">
                  <div className="bg-white p-1.5 rounded-xl border border-slate-200/80 shadow-sm">
                      <img src={LOGO_URL} alt="Logo" className="h-6 w-6 object-contain" />
                  </div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Diverty CRM</h1>
              </div>
              <button type="button" onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-500 hover:text-slate-900 transition-colors">
                  <Menu size={24} />
              </button>
          </header>
          <main id="main-content" className="flex-1 overflow-y-auto scroll-smooth pb-10 overscroll-y-none relative">
            {activeTab === 'inicio' && renderInicio()}
            {activeTab === 'eventos' && renderEventos()}
            {activeTab === 'clientes' && renderClientes()}
            {activeTab === 'finanzas' && renderFinanzas()}
            {activeTab === 'config' && renderConfig()}
          </main>
      </div>
    </div>
  );
}
