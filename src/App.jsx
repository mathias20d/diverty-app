import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Calendar, Users, Settings, Plus, Edit, Trash2, X, FileSignature, Clock, MapPin, Info, Download, Receipt, MessageCircle, RefreshCw, AlertTriangle, CheckCircle2, Cloud, Search, CalendarDays, ChevronRight, ChevronLeft, Star, BellRing, TrendingUp, DollarSign, Briefcase, Lock, Smartphone, FileText, Check, Sparkles, Map as MapIcon, Navigation, Zap, PieChart, ChevronDown, Moon, Sun, Award, FileSpreadsheet, Copy, MessageSquareText, Share2, Home, Menu, BarChart3, ArrowUpRight, ArrowDownRight, ArrowDownWideNarrow, Save, Minus, Printer, ShieldCheck } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = { apiKey: "AIzaSyDxE2E1KMuZU523k8oWHabi1jDrFxPOD-0", authDomain: "diverty-eventos.firebaseapp.com", projectId: "diverty-eventos", storageBucket: "diverty-eventos.firebasestorage.app", messagingSenderId: "491130670516", appId: "1:491130670516:web:8c80abd09ccc92c194f6e1" };
const app = initializeApp(firebaseConfig); const db = getFirestore(app); const auth = getAuth(app); const appId = "diverty-oficial";

const sheetUrl = 'https://docs.google.com/spreadsheets/d/1dvIWaYZQte_IU9JsBZLnLEmKYVxfO9An1XjpRuIHD5g/edit?usp=drivesdk'; 
const LOGO_URL = 'https://i.postimg.cc/GhFd4tcm/1000047880.png'; 
const META_MENSUAL = 1500; 

const DATOS_EMPRESA = { nombreTitular: "AILEN DENNISKA CAMARENA MENDOZA", ruc: "Panamá RUC DV 79 8 957349", banco: "Banco General", tipoCuenta: "Cuenta de ahorros", numeroCuenta: "0472960083979", telefono: "6667-7965", email: "corporativo@divertyeventos.online", web: "Divertyeventos.online" };
const ZONAS_TRANSPORTE = { "Panamá Centro": 0, "San Miguelito": 5, "Panamá Norte": 10, "Panamá Este": 10, "Arraiján / Chorrera": 15, "Colón": 25 };
const NAV_ITEMS = [ {id:'inicio', icon:Home, text:'Inicio'}, {id:'eventos', icon:Calendar, text:'Agenda'}, {id:'clientes', icon:Users, text:'Clientes'}, {id:'finanzas', icon:PieChart, text:'Finanzas'}, {id:'config', icon:Settings, text:'Ajustes'} ];
const defaultFormData = Object.freeze({ cliente: '', ruc: '', email: '', telefono: '', tipoEvento: 'Cumpleaños', ninos: '', fecha: '', hora: '', ubicacion: 'Panamá Centro', direccion: '', comentarios: '', servicio: '', serviciosSeleccionados: [], transporte: '', gastos: '', detalleGastos: '', total: '', abono: '', estado: 'Pendiente', colisionAprobada: false });

const PAQUETES_BASE = [
  { id: 'p1', nombre: 'Plan circo', precio: 85, short: 'Circo 🎪', descripcion: 'Servicio de animación tipo circo.\n• 1 Payasit@ profesional\n• Juegos\n• Figuras con globos' },
  { id: 'p2', nombre: 'Plan diverty total', precio: 200, short: 'Diverty ⭐', descripcion: '3 horas de entretenimiento completo.\n• 1 Payasit@ o Animador@\n• 1 Pintacaritas profesional\n• Show de Burbujas Gigantes\n• Globoflexia para los invitados' },
  { id: 'p3', nombre: 'Plan recreativo', precio: 110, short: 'Recreativo 🎉', descripcion: '2 Horas de actividades.\n• Animador@\n• Pintacaritas\n• Juegos' },
  { id: 'p4', nombre: 'Plan magic', precio: 135, short: 'Magic 🎩', descripcion: '2.5 horas mágicas.\n• Animador@\n• Pintacaritas\n• Magia\n• Obsequio' },
  { id: 'p5', nombre: 'Pintacaritas profesionales', precio: 50, short: 'Pinta Pro 🎨', descripcion: 'Pintacaritas con gemas.', isPorHora: true },
  { id: 'p6', nombre: 'Pintacaritas básicas', precio: 35, short: 'Pinta Básica 🖍️', descripcion: 'Diseños rápidos.', isPorHora: true },
  { id: 'p7', nombre: 'Globoflexia', precio: 35, short: 'Globos 🎈', descripcion: 'Figuras con globos.', isPorHora: true },
  { id: 'p8', nombre: 'Show Burbujas Premium', precio: 150, short: 'Burbujas Pro 🫧', descripcion: 'Show de burbujas gigantes.' },
  { id: 'p9', nombre: 'Paquete Fiesta Burbuja', precio: 190, short: 'Fiesta 🫧', descripcion: '2 Horas. Animación + Burbujas.' },
  { id: 'p10', nombre: 'Maquinas de snack', precio: 85, short: 'Snacks 🍿', descripcion: 'Popcorn o Algodón.', isPorHora: true },
  { id: 'p11', nombre: 'Alquiler de inflable', precio: 80, short: 'Inflable 🏰', descripcion: 'Inflable infantil.', isPorHora: true },
  { id: 'p12', nombre: 'Personaje temático', precio: 55, short: 'Personaje 🦸‍♂️', descripcion: 'Visita de personaje.', isPorHora: true },
  { id: 'p13', nombre: 'Personaje con animación', precio: 100, short: 'Pers. Animado 🦸‍♀️', descripcion: 'Visita interactiva.', isPorHora: true }
];

const getDocRef = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'eventos', id);
const getConfigRef = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'configuracion', id);

export const utils = {
  normalizeText: (text) => String(text || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  getSafeLocal: (k) => { try { return localStorage.getItem(k); } catch(e) { return null; } },
  setSafeLocal: (k, v) => { try { localStorage.setItem(k, v); } catch(e) {} },
  triggerHaptic: (t = 'light') => { if (window?.navigator?.vibrate) try { window.navigator.vibrate(t === 'light' ? 30 : 50); } catch (e) {} },
  safeNum: (v) => { if (typeof v === 'number') return isNaN(v) ? 0 : v; if (!v) return 0; const p = parseFloat(String(v).replace(/[^0-9.-]/g, '')); return isNaN(p) ? 0 : p; },
  formatTime12h: (t) => { if (!t) return 'Por definir'; const [h, m] = String(t).split(':'); if (!h || !m) return t; let hrs = parseInt(h, 10); const suf = hrs >= 12 ? 'PM' : 'AM'; hrs = hrs % 12 || 12; return `${hrs}:${m} ${suf}`; },
  getLocalYYYYMMDD: (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  getWeekRange: (b = new Date()) => { const t = new Date(b), d = t.getDay() === 0 ? -6 : 1 - t.getDay(); const s = new Date(t); s.setDate(t.getDate() + d); s.setHours(0, 0, 0, 0); const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999); return { start: s, end: e }; },
  getServiceDetails: (name) => { if (!name) return undefined; const nl = utils.normalizeText(name); return PAQUETES_BASE.find(p => nl.includes(utils.normalizeText(p.nombre).replace('plan ', '').replace('paquete ', '').trim())); },
  parseCSV: (str) => { const arr = []; let q = false; for (let r = 0, c = 0, i = 0; i < str.length; i++) { let cc = str[i], nc = str[i+1]; arr[r] = arr[r] || []; arr[r][c] = arr[r][c] || ''; if (cc === '"' && q && nc === '"') { arr[r][c] += cc; ++i; continue; } if (cc === '"') { q = !q; continue; } if (cc === ',' && !q) { ++c; continue; } if (cc === '\r' && nc === '\n' && !q) { ++r; c = 0; ++i; continue; } if (cc === '\n' && !q) { ++r; c = 0; continue; } if (cc === '\r' && !q) { ++r; c = 0; continue; } arr[r][c] += cc; } return arr; },
  openWhatsAppBusiness: (phone, msg) => { window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank'); }
};

const getWhatsAppMessage = (ev, type, empresa) => {
    const tot = utils.safeNum(ev.total), abo = utils.safeNum(ev.abono), saldo = (tot - abo).toFixed(2);
    const fec = String(ev.fecha||'').split('-').reverse().join('/'), hor = utils.formatTime12h(ev.hora);
    switch(type) {
        case 'cotizacion': return `¡Hola *${ev.cliente}*! ✨\nTe comparto la cotización para tu evento el *${fec}*.\n🎉 *Paquetes:* ${ev.servicio}\n💰 *Inversión Total:* $${tot.toFixed(2)}\n\n*He adjuntado el PDF con todos los detalles a este mensaje.*\n\nSi deseas agendar, puedes confirmarnos por aquí. ¡Estamos a la orden! 🥳`;
        case 'recibo': return `¡Hola *${ev.cliente}*! 🥳\nTu reserva está *Confirmada* ✅\n📅 *Fecha:* ${fec}\n⏰ *Hora:* ${hor}\n📍 *Lugar:* ${ev.ubicacion}\n💰 *Total:* $${tot.toFixed(2)}\n💳 *Abono recibido:* $${abo.toFixed(2)}\n⚠️ *Saldo a cancelar en evento:* $${saldo}\n\n*Te adjunto el recibo oficial en PDF.*\n¡Gracias por preferirnos! ✨`;
        case 'recordatorio': return `¡Hola *${ev.cliente}*! 🥳\n¡Se acerca tu gran día! Recuerda tu evento para el *${fec}* a las *${hor}*.\n📍 Llegaremos a *${ev.ubicacion}*.\n💰 Saldo pendiente: *$${saldo}*.\n¡Nos vemos pronto para la diversión! ✨`;
        case 'cobro': return `¡Hola *${ev.cliente}*! 👋\nTe contactamos de Diverty Eventos.\nTe recordamos amablemente que tienes un saldo pendiente de *$${saldo}* para asegurar tu fecha del *${fec}*.\n\nSi deseas realizar el abono mediante Yappy o Transferencia, por favor avísanos por aquí. ¡Estamos a tu disposición! ✨`;
        case 'banco': return `¡Hola *${ev.cliente}*! 👋\nNuestros datos bancarios:\n🏦 *Banco:* ${empresa.banco}\n📋 *Tipo:* ${empresa.tipoCuenta}\n🔢 *Cuenta:* ${empresa.numeroCuenta}\n👤 *Nombre:* ${empresa.nombreTitular}\nPor favor envía comprobante. ¡Gracias! ✨`;
        case 'agradecimiento': default: return `¡Hola *${ev.cliente}*! 🌟\n¡GRACIAS por permitirnos estar en tu evento!\n¿Qué tal la pasaron? Nos encantaría ver fotitos 📸🎉\n¡Un abrazo mágico de todo el equipo! ✨`;
    }
}

// 🎨 UI CONSTANTS - DISEÑO PULIDO Y FLUIDO
const GLASS_CARD = "bg-[#0B1221] border border-white/5 rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.3)] ring-1 ring-white/[0.02]";
const inputClass = "w-full bg-[#0F172A] focus:bg-[#0B1221] border border-white/10 rounded-2xl p-4 text-[15px] font-medium text-white/90 outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/30";
const labelClass = "block text-xs uppercase text-white/60 font-semibold tracking-wider mb-2 ml-1";
const modalSectionClass = "bg-[#0B1221] rounded-t-[32px] sm:rounded-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.8)] border border-white/5 transition-transform duration-300";

const useCountUp = (end, duration = 1000) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (end === 0) { setCount(0); return; }
        let start = 0, stepTime = 16, steps = duration / stepTime, increment = end / steps, timer;
        const delay = setTimeout(() => { timer = setInterval(() => { start += increment; if ((increment > 0 && start >= end) || (increment < 0 && start <= end)) { setCount(end); clearInterval(timer); } else { setCount(start); } }, stepTime); }, 200);
        return () => { clearTimeout(delay); if (timer) clearInterval(timer); };
    }, [end, duration]);
    return count;
};

const AnimatedProgress = React.memo(({ value }) => {
  const [width, setWidth] = useState(0); const barRef = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) { setTimeout(() => setWidth(value), 200); observer.disconnect(); } }, { threshold: 0.1 });
    if (barRef.current) observer.observe(barRef.current);
    return () => observer.disconnect();
  }, [value]);
  return (
    <div ref={barRef} className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden bg-[#060B14] shadow-inner" style={{ width: `${width}%` }}>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-[200%] animate-[shimmer_2s_infinite]"></div>
    </div>
  );
});

const SkeletonCard = React.memo(() => ( 
    <div className={`${GLASS_CARD} p-6 animate-pulse flex flex-col gap-4 h-[280px]`}>
        <div className="flex justify-between w-full"><div className="h-5 bg-white/5 rounded-full w-1/3"></div><div className="h-6 bg-white/5 rounded-xl w-16"></div></div>
        <div className="h-10 bg-white/5 rounded-full w-3/4 mt-3"></div>
        <div className="space-y-4 mt-4"><div className="h-4 bg-white/5 rounded-full w-1/2"></div><div className="h-4 bg-white/5 rounded-full w-2/3"></div></div>
        <div className="mt-auto h-14 bg-[#0F172A] rounded-[16px] w-full"></div>
    </div> 
));

const EmptyState = React.memo(({ icon: Icon, title, message, actionBtn }) => {
    return (
        <div className={`${GLASS_CARD} p-10 text-center flex flex-col items-center justify-center animate-fadeIn w-full border-dashed border-2 border-white/10 min-h-[300px]`}>
            <div className={`w-24 h-24 rounded-[24px] flex items-center justify-center mb-6 border border-white/5 relative overflow-hidden bg-[#0F172A] rotate-3 transition-transform hover:rotate-0 duration-300`}>
                <Icon size={48} strokeWidth={1.5} className="relative z-10 text-white/40 drop-shadow-md" />
            </div>
            <h3 className="text-xl font-bold text-white/90 mb-3 tracking-tight">{title}</h3>
            <p className="text-sm font-medium text-white/50 max-w-md mb-8 leading-relaxed">{message}</p>
            {actionBtn}
        </div>
    );
});

const AppButton = React.memo(({ children, variant = 'primary', icon: Icon, onClick, className = '', ...props }) => {
    const baseStyle = "font-bold rounded-[16px] transition-all duration-200 ease-out active:scale-[0.98] hover:opacity-90 flex items-center justify-center gap-2.5 px-5 py-3.5";
    let vS = "";
    if (variant === 'warning') vS = `bg-amber-500/10 text-amber-400 hover:bg-amber-500/20`;
    else if (variant === 'success') vS = `bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20`;
    else if (variant === 'danger') vS = `bg-rose-500/10 text-rose-400 hover:bg-rose-500/20`;
    else if (variant === 'primary') vS = `bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/20`;
    else vS = "bg-white/5 text-white/90 hover:bg-white/10";
    
    return (<button type="button" onClick={onClick} className={`${baseStyle} ${vS} ${className}`} {...props}>{Icon && <Icon size={18} strokeWidth={2} className="shrink-0" />}<span className="truncate tracking-wide">{children}</span></button>);
});

const AppCard = React.memo(({ children, title, icon: Icon, iconColor = 'primary', className = '' }) => {
    const iconColors = { primary: "text-blue-400", success: "text-emerald-400", danger: "text-rose-400", warning: "text-amber-400" };
    return (
        <div className={`${GLASS_CARD} hover:-translate-y-1 transition-transform duration-200 p-6 sm:p-7 flex flex-col justify-center relative overflow-hidden ${className}`}>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_0%,transparent_60%)] pointer-events-none"></div>
            {(title || Icon) && (<div className="flex items-center gap-2.5 text-white/50 mb-4 relative z-10">{Icon && <Icon size={20} className={iconColors[iconColor] || "text-white"} strokeWidth={2} />}{title && <span className="text-xs font-bold uppercase tracking-wider opacity-90">{title}</span>}</div>)}
            <div className="relative z-10">{children}</div>
        </div>
    );
});

const ClientCardItem = React.memo(({ c, idx, isExpanded, onToggleExpand, utils, openModal, onDeleteClient }) => {
    const phoneClean = String(c.telefono).replace(/\D/g,'');
    const msgPromo = `¡Hola ${c.nombre}! 😊 Te saludamos de Diverty Eventos. Tenemos nuevas promociones exclusivas en nuestros paquetes infantiles. ¿Te gustaría conocerlas? 🎉`; 
    const msgSeguimiento = `¡Hola ${c.nombre}! 👋 Pasábamos a saludarte de Diverty Eventos. ¿Qué tal estuvo tu última fiesta con nosotros? ¡Nos encantaría saber de ti! ✨`; 
    const msgRecordatorio = `¡Hola ${c.nombre}! 🥳 Te recordamos que en Diverty Eventos estamos listos para hacer de tu próxima celebración un día inolvidable. ¡Escríbenos cuando lo necesites! 🎈`;
    const avatarGradients = ['from-blue-600 to-indigo-600', 'from-emerald-400 to-teal-600', 'from-purple-500 to-fuchsia-600', 'from-cyan-400 to-blue-500']; 
    const grad = c.isVIP ? 'from-amber-400 via-orange-500 to-rose-500' : avatarGradients[String(c.nombre).length % avatarGradients.length];

    const handleExpand = useCallback((e) => { if(e){e.preventDefault(); e.stopPropagation();} utils.triggerHaptic('light'); onToggleExpand(c.nombre); }, [c.nombre, onToggleExpand, utils]);
    const handlePromo = useCallback((e) => { e.stopPropagation(); utils.openWhatsAppBusiness(phoneClean, msgPromo); }, [phoneClean, msgPromo, utils]);
    const handleSeguimiento = useCallback((e) => { e.stopPropagation(); utils.openWhatsAppBusiness(phoneClean, msgSeguimiento); }, [phoneClean, msgSeguimiento, utils]);
    const handleRecordatorio = useCallback((e) => { e.stopPropagation(); utils.openWhatsAppBusiness(phoneClean, msgRecordatorio); }, [phoneClean, msgRecordatorio, utils]);
    const handleReserve = useCallback((e) => { e.stopPropagation(); openModal(); }, [openModal]);
    const handleDelete = useCallback((e) => { e.stopPropagation(); onDeleteClient(c.nombre, c.eventos); }, [c.nombre, c.eventos, onDeleteClient]);

    return (
        <div className={`${GLASS_CARD} flex flex-col relative overflow-hidden transition-transform duration-200 hover:-translate-y-1 animate-fadeInUp`} style={{ animationFillMode: 'both', animationDelay: `${idx * 20}ms` }}>
            <div onClick={handleExpand} className="p-5 sm:p-6 cursor-pointer flex items-center justify-between gap-4 relative z-10 bg-transparent hover:bg-white/5 transition-colors duration-200">
                <div className="flex items-center gap-4 flex-1 min-w-0"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl text-white shrink-0 shadow-lg bg-gradient-to-tr ${grad}`}>{c.isVIP ? <Award size={20} className="drop-shadow-md" /> : String(c.nombre).charAt(0).toUpperCase()}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><h4 className="font-bold text-[17px] text-white/90 capitalize truncate tracking-tight">{String(c.nombre)}</h4></div><div className="flex flex-wrap items-center gap-1.5"><p className="text-xs font-semibold text-white/60 flex items-center gap-1.5"><Smartphone size={14}/> {String(c.telefono) || 'Sin número'}</p></div></div></div>
                <div className="flex items-center gap-3 shrink-0"><div className="text-right"><p className="text-xl font-bold text-emerald-400 leading-none tracking-tight">${c.totalGastado.toFixed(0)}</p><div className="flex justify-end gap-1.5 mt-2.5">{c.isVIP && <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm" title="VIP"></span>}{c.isFrecuente && <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-sm" title="Frecuente"></span>}{c.isNuevo && <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm" title="Nuevo"></span>}{c.needsContact && <span className="w-2 h-2 rounded-full bg-rose-400 shadow-sm" title="Contactar"></span>}</div></div></div>
            </div>
            {isExpanded && (
                <div className="relative z-10 px-5 pb-5 animate-fadeIn border-t border-white/5 mt-1 pt-4">
                    <div className="flex justify-between items-center bg-[#0F172A] p-4 rounded-[16px] mb-5 border border-white/5"><div className="text-center flex-1 border-r border-white/5"><p className="text-xs uppercase tracking-wider font-semibold text-white/50 mb-1">Eventos</p><p className="font-bold text-base text-white/90">{c.eventos}</p></div><div className="text-center flex-1 border-r border-white/5"><p className="text-xs uppercase tracking-wider font-semibold text-white/50 mb-1">Último</p><p className="font-bold text-base text-white/90">{c.ultimoEventoFecha ? String(c.ultimoEventoFecha).split('-').reverse().join('/') : 'N/A'}</p></div><div className="text-center flex-1"><p className="text-xs uppercase tracking-wider font-semibold text-white/50 mb-1">Estado</p><p className="font-bold text-base text-white/90 capitalize flex justify-center items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${String(c.ultimoEstado).toLowerCase() === 'completado' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>{String(c.ultimoEstado).substring(0,4)}.</p></div></div>
                    <div className="flex gap-3 mb-4">
                        <button type="button" onClick={handlePromo} className="flex-1 bg-white/5 hover:bg-emerald-500/10 py-3 rounded-[14px] font-bold text-xs uppercase tracking-wider transition-colors duration-200 active:scale-[0.98] flex flex-col items-center justify-center gap-2 border border-transparent hover:border-emerald-500/30 text-emerald-400"><Sparkles size={18}/> Promo</button>
                        <button type="button" onClick={handleSeguimiento} className="flex-1 bg-white/5 hover:bg-blue-500/10 py-3 rounded-[14px] font-bold text-xs uppercase tracking-wider transition-colors duration-200 active:scale-[0.98] flex flex-col items-center justify-center gap-2 border border-transparent hover:border-blue-500/30 text-blue-400"><RefreshCw size={18}/> Seguir</button>
                        <button type="button" onClick={handleRecordatorio} className="flex-1 bg-white/5 hover:bg-amber-500/10 py-3 rounded-[14px] font-bold text-xs uppercase tracking-wider transition-colors duration-200 active:scale-[0.98] flex flex-col items-center justify-center gap-2 border border-transparent hover:border-amber-500/30 text-amber-400"><BellRing size={18}/> Recordar</button>
                    </div>
                    <div className="flex gap-3">
                        <AppButton variant="primary" icon={Plus} onClick={handleReserve} className="flex-1 text-[13px] uppercase tracking-wider">Reservar a este cliente</AppButton>
                        <button type="button" onClick={handleDelete} title="Eliminar Cliente" className="px-5 bg-rose-500/10 text-rose-400 rounded-[16px] hover:bg-rose-500/20 transition-colors duration-200 active:scale-[0.97] flex items-center justify-center border border-rose-500/20">
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

const TransactionItem = React.memo(({ ev, isExpanded, onToggleExpand, utils }) => {
    const tot = utils.safeNum(ev.total), gas = utils.safeNum(ev.gastos), neta = tot - gas;
    const handleToggle = useCallback((e) => { if(e){e.preventDefault(); e.stopPropagation();} onToggleExpand(ev.id); }, [ev.id, onToggleExpand]);
    return (
        <div className="group">
            <button type="button" onClick={handleToggle} className="w-full flex justify-between items-center p-5 rounded-[20px] bg-transparent hover:bg-white/5 transition-colors duration-200 text-left border border-transparent hover:border-white/5 active:scale-[0.99]">
                <div className="flex flex-col min-w-0 flex-1 pr-4"><p className="font-bold capitalize text-[16px] text-white/90 truncate tracking-tight">{String(ev.cliente || '')}</p><p className="text-xs font-medium text-white/50 mt-1.5">{ev.fecha ? String(ev.fecha).split('-').reverse().join('/') : ''} • {String(ev.tipoEvento || '').substring(0,15)}</p></div>
                <div className="text-right shrink-0 flex items-center gap-4"><div className="flex flex-col items-end"><span className="font-bold text-emerald-400 text-lg leading-none block mb-2 tracking-tight">+${neta.toFixed(2)}</span>{gas > 0 && <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 leading-none px-2 py-1 bg-rose-500/10 rounded-lg">Gastos: -${gas}</span>}</div><ChevronDown size={18} className={`text-white/40 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}/></div>
            </button>
            {isExpanded && (
                <div className="mx-5 mb-3 p-5 bg-[#0F172A] rounded-[16px] border border-white/5 animate-fadeIn">
                    <div className="flex justify-between items-center mb-3"><span className="text-xs text-white/60 uppercase tracking-wider font-semibold">Ingreso Bruto</span><span className="font-bold text-[15px] text-white/90">${tot.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center mb-3"><span className="text-xs text-white/60 uppercase tracking-wider font-semibold">Gastos Operativos</span><span className="font-bold text-[15px] text-rose-400">-${gas.toFixed(2)}</span></div>
                    {ev.detalleGastos && (<div className="mt-4 pt-4 border-t border-white/5"><span className="text-[11px] uppercase font-semibold tracking-wider text-white/50 block mb-2">Desglose de Gastos:</span><p className="text-[13px] font-medium text-white/70 italic leading-relaxed">{String(ev.detalleGastos)}</p></div>)}
                </div>
            )}
        </div>
    );
});

const EventCardItem = React.memo(({ ev, idx, todayTime, onWhatsApp, onViewDoc, onEdit, onDelete, onDuplicate, onMapClick, empresa, utils }) => {
    const [swipeX, setSwipeX] = useState(0), [isDragging, setIsDragging] = useState(false), [isExpanded, setIsExpanded] = useState(false);
    const startX = useRef(0);
    const handleTouchStart = useCallback((e) => { startX.current = e.touches[0].clientX; setIsDragging(true); }, []);
    const handleTouchMove = useCallback((e) => { if (!isDragging) return; const diffX = e.touches[0].clientX - startX.current; setSwipeX(diffX > 0 ? Math.min(diffX, 120) : 0); }, [isDragging]);
    const handleTouchEnd = useCallback(() => { setIsDragging(false); if (swipeX > 80) { utils.triggerHaptic('success'); onDelete(ev.id); } setSwipeX(0); }, [swipeX, ev.id, onDelete, utils]);

    const estNormalized = utils.normalizeText(ev.estado);
    const tot = utils.safeNum(ev.total), abo = utils.safeNum(ev.abono), restante = Math.max(0, tot - abo);
    
    let sideColor = "bg-white/10", dotColor = "bg-white/20";
    if (estNormalized === 'completado') { sideColor = 'bg-emerald-500'; dotColor = 'bg-emerald-400'; }
    else if (estNormalized === 'confirmado') { sideColor = 'bg-blue-500'; dotColor = 'bg-blue-400'; }
    else if (estNormalized === 'pendiente') { sideColor = 'bg-amber-500'; dotColor = 'bg-amber-400'; }
    else if (estNormalized === 'cancelado') { sideColor = 'bg-rose-500'; dotColor = 'bg-rose-400'; }

    const waType = estNormalized === 'pendiente' ? 'cobro' : estNormalized === 'confirmado' ? 'recordatorio' : 'agradecimiento';

    let diff = null, dateBadgeContent = null;
    if (ev.fecha) { 
        const [y, m, d] = String(ev.fecha).split('-'); 
        if (y && m && d) { 
            const evtD = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)).getTime(); 
            diff = Math.ceil((evtD - todayTime) / (1000 * 60 * 60 * 24)); 
        } 
    }
    if (diff === 0) dateBadgeContent = (<span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-1 rounded-[10px] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> HOY</span>);
    else if (diff === 1) dateBadgeContent = (<span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-[10px] text-xs font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">MAÑANA</span>);

    const handleExpand = useCallback((e) => { if(e){e.preventDefault(); e.stopPropagation();} utils.triggerHaptic('light'); setIsExpanded(p => !p); }, [utils]);
    const handleMap = useCallback((e) => { e.stopPropagation(); onMapClick(ev.direccion, ev.ubicacion); }, [ev.direccion, ev.ubicacion, onMapClick]);
    const handleWA = useCallback((e) => { e.stopPropagation(); onWhatsApp(ev, waType, empresa); }, [ev, waType, empresa, onWhatsApp]);
    const handleFactura = useCallback((e) => { e.stopPropagation(); onViewDoc(ev, 'factura'); }, [ev, onViewDoc]);
    const handleContrato = useCallback((e) => { e.stopPropagation(); onViewDoc(ev, 'contrato'); }, [ev, onViewDoc]);

    return (
        <div className={`relative w-full ${GLASS_CARD} overflow-hidden`} style={{ animationFillMode: 'both', animationDelay: `${idx * 40}ms` }}>
            <div className={`absolute inset-0 bg-gradient-to-r from-rose-600 to-rose-400 flex items-center pl-8 transition-opacity duration-200 ${swipeX > 20 ? 'opacity-100 z-0' : 'opacity-0 -z-10'}`}><Trash2 size={24} className="text-white" /><span className="text-white font-bold ml-3 text-sm uppercase tracking-wider">Eliminar</span></div>
            <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} className="relative p-5 sm:p-6 transition-transform duration-200 ease-out z-10 bg-[#0B1221] cursor-pointer" style={{ transform: `translateX(${swipeX}px)`, transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)', touchAction: 'pan-y' }} onClick={handleExpand}>
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-r-full ${sideColor}`}></div>
                <div className="pl-3">
                    <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-3 min-w-0"><div className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`}></div><h3 className="text-lg font-bold text-white/90 truncate tracking-tight">{String(ev.cliente)}</h3>{dateBadgeContent}</div>
                        {!isExpanded && (
                            <div className="flex items-center gap-4 shrink-0">
                                <span className="text-white/90 font-bold text-lg tracking-tight">${tot.toFixed(2)}</span>
                                {restante > 0 ? (<div className="bg-rose-500/10 text-rose-400 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border border-rose-500/20">Debe ${restante.toFixed(0)}</div>) : (<div className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 size={16} strokeWidth={2.5}/><span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Pagado</span></div>)}
                            </div>
                        )}
                    </div>
                    <div className={`grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-6' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                        <div className="overflow-hidden">
                            <div className="flex flex-col gap-4 mb-6 pt-2">
                                <div className="flex items-center gap-4 text-white/70"><Sparkles size={18} className="text-white/40 shrink-0" strokeWidth={2} /><span className="text-sm font-medium">{String(ev.servicio || 'Sin paquete asignado')}</span></div>
                                <div onClick={handleMap} className="flex items-center justify-between gap-4 text-white/70 cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-xl transition-colors active:scale-[0.98] border border-transparent hover:border-white/5" title="Abrir en Google Maps">
                                    <div className="flex items-center gap-4 min-w-0"><MapPin size={18} className="text-white/40 shrink-0" strokeWidth={2} /><span className="text-sm font-medium truncate">{String(ev.ubicacion)} {ev.direccion ? `- ${String(ev.direccion)}` : ''}</span></div>
                                    <div className="bg-white/5 p-2 rounded-lg border border-white/10"><MapIcon size={14} className="text-blue-400" /></div>
                                </div>
                                <div className="flex items-center gap-4 text-white/70"><Smartphone size={18} className="text-white/40 shrink-0" strokeWidth={2} /><span className="text-sm font-medium">{String(ev.telefono || 'Sin teléfono')}</span></div>
                            </div>
                            <div className="bg-[#0F172A] rounded-2xl p-5 sm:p-6 border border-white/5 mb-6 relative overflow-hidden">
                                <div className="flex justify-between items-end mb-5"><div className="flex flex-col"><span className="text-xs font-bold text-white/60 uppercase tracking-wider mb-1.5">Total</span><span className="text-2xl font-bold text-white/90 tracking-tight leading-none">${tot.toFixed(2)}</span></div><div className="flex flex-col items-end"><span className="text-xs font-bold text-white/60 uppercase tracking-wider mb-1.5">Pendiente</span><span className={`text-2xl font-bold tracking-tight leading-none ${restante > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>${restante.toFixed(2)}</span></div></div>
                                <div className="w-full bg-[#0B1221] rounded-full h-2 mb-3 overflow-hidden"><AnimatedProgress value={tot > 0 ? Math.min((abo / tot) * 100, 100) : 0} /></div>
                                <div className="flex justify-between items-center"><p className="text-xs font-medium text-white/70 flex items-center gap-1.5">Recibido: ${abo.toFixed(2)}</p><p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{tot > 0 ? Math.round((abo/tot)*100) : 0}% pagado</p></div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <AppButton onClick={handleWA} className="w-full sm:flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 border-emerald-400/50 shadow-sm" icon={MessageCircle}>Contactar</AppButton>
                                <div className="flex gap-3 w-full sm:flex-1">
                                    <AppButton onClick={handleFactura} variant="default" className="flex-1" icon={Receipt}>Factura</AppButton>
                                    <AppButton onClick={handleContrato} variant="default" className="flex-1" icon={FileSignature}>Contrato</AppButton>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-4 pt-4 border-t border-white/5">
                                <button onClick={(e) => { e.stopPropagation(); onEdit(ev); }} className="flex-1 text-white/70 hover:text-white/90 font-semibold py-3 flex items-center justify-center gap-2 text-xs uppercase tracking-wider active:scale-[0.98] transition-colors duration-200 bg-white/5 rounded-xl hover:bg-white/10"><Edit size={16} strokeWidth={2}/> Editar</button>
                                <button onClick={(e) => { e.stopPropagation(); onDuplicate(ev); }} className="flex-1 text-blue-400/90 hover:text-blue-400 font-semibold py-3 flex items-center justify-center gap-2 text-xs uppercase tracking-wider active:scale-[0.98] transition-colors duration-200 bg-blue-500/10 rounded-xl hover:bg-blue-500/20"><Copy size={16} strokeWidth={2}/> Duplicar</button>
                                <button onClick={(e) => { e.stopPropagation(); onDelete(ev.id); }} className="flex-1 text-rose-400/90 hover:text-rose-400 font-semibold py-3 flex items-center justify-center gap-2 text-xs uppercase tracking-wider active:scale-[0.98] transition-colors duration-200 bg-rose-500/10 rounded-xl hover:bg-rose-500/20"><Trash2 size={16} strokeWidth={2}/> Eliminar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

const EventFormModal = React.memo(({ isOpen, initialData, isCotizacionMode, onClose, onSave, PAQUETES, onAddCustomService, showAlert }) => {
    const [formData, setFormData] = useState(initialData || { ...defaultFormData, fecha: utils.getLocalYYYYMMDD(new Date()) });
    const [searchTermService, setSearchTermService] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [isCustomOpen, setIsCustomOpen] = useState(false);
    const [customData, setCustomData] = useState({ nombre: '', precio: '' });
    const nameInputRef = useRef(null);

    useEffect(() => {
        if (isOpen && initialData) { 
            setFormData(initialData); 
            setSearchTermService('');
            setShowDropdown(false);
            setIsCustomOpen(false);
        }
    }, [isOpen, initialData]);

    useEffect(() => {
        if (isOpen && nameInputRef.current && (!initialData || !initialData.id)) {
            const t = setTimeout(() => nameInputRef.current.focus(), 400);
            return () => clearTimeout(t);
        }
    }, [isOpen, initialData]);

    useEffect(() => {
        if (isOpen && !isCotizacionMode && (!initialData || !initialData.id)) {
            const timer = setTimeout(() => { 
                utils.setSafeLocal('diverty_form_draft', JSON.stringify(formData)); 
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [formData, isOpen, isCotizacionMode, initialData]);

    const filteredPaquetes = useMemo(() => {
        if (!searchTermService) return PAQUETES;
        const s = utils.normalizeText(searchTermService);
        return PAQUETES.filter(p => utils.normalizeText(p.nombre).includes(s) || utils.normalizeText(p.short || '').includes(s));
    }, [searchTermService, PAQUETES]);

    const procesarServicios = useCallback((prev, newSelected) => { 
        const sumPrecios = newSelected.reduce((sum, s) => sum + utils.safeNum(s.precio), 0); 
        const newTotal = sumPrecios + utils.safeNum(prev.transporte) + utils.safeNum(prev.gastos); 
        const resumenServicios = newSelected.map(s => s.cantidad > 1 ? `${s.nombre} (x${s.cantidad})` : s.nombre).join(' + '); 
        return { ...prev, serviciosSeleccionados: newSelected, servicio: resumenServicios, total: newTotal > 0 ? newTotal.toString() : '' }; 
    }, []);
    
    const addService = useCallback((pkg) => { 
        utils.triggerHaptic('light'); 
        setFormData(prev => { 
            const actuales = Array.isArray(prev.serviciosSeleccionados) ? [...prev.serviciosSeleccionados] : []; 
            const existeIdx = actuales.findIndex(s => s.nombre === pkg.nombre); 
            if (existeIdx !== -1) { actuales[existeIdx].cantidad += 1; actuales[existeIdx].precio = actuales[existeIdx].precioOriginal * actuales[existeIdx].cantidad; } 
            else { actuales.push({ ...pkg, cantidad: 1, precioOriginal: pkg.precio, precio: pkg.precio }); } 
            return procesarServicios(prev, actuales); 
        }); 
    }, [procesarServicios]);
    
    const updateServiceQuantity = useCallback((idx, delta) => { 
        utils.triggerHaptic('light'); 
        setFormData(prev => { 
            const actuales = [...prev.serviciosSeleccionados]; const nuevoItem = { ...actuales[idx] }; 
            nuevoItem.cantidad = Math.max(1, nuevoItem.cantidad + delta); nuevoItem.precio = nuevoItem.precioOriginal * nuevoItem.cantidad; 
            actuales[idx] = nuevoItem; return procesarServicios(prev, actuales); 
        }); 
    }, [procesarServicios]);
    
    const removeService = useCallback((idx) => { 
        utils.triggerHaptic('light'); 
        setFormData(prev => { const ns = [...prev.serviciosSeleccionados]; ns.splice(idx, 1); return procesarServicios(prev, ns); }); 
    }, [procesarServicios]);

    const handleServiceEdit = useCallback((idx, field, val) => {
        setFormData(prev => {
            const actuales = [...prev.serviciosSeleccionados];
            const nuevoItem = { ...actuales[idx] };
            if (field === 'precio') {
                const nuevoPrecio = utils.safeNum(val);
                nuevoItem.precio = nuevoPrecio;
                nuevoItem.precioOriginal = nuevoPrecio / Math.max(1, nuevoItem.cantidad || 1);
            } else if (field === 'descripcion') {
                nuevoItem.descripcion = val;
            }
            actuales[idx] = nuevoItem;
            return procesarServicios(prev, actuales);
        });
    }, [procesarServicios]);

    const handleCreateCustom = useCallback(async () => {
        const newSrv = await onAddCustomService(customData.nombre, customData.precio);
        if (newSrv) {
            addService(newSrv);
            setIsCustomOpen(false);
            setCustomData({ nombre: '', precio: '' });
        }
    }, [customData.nombre, customData.precio, onAddCustomService, addService]);

    const handleZoneChange = useCallback((e) => { 
        const z = e.target.value; const cost = ZONAS_TRANSPORTE[z] || 0; 
        setFormData(p => ({ ...p, ubicacion: z, transporte: cost.toString(), total: ((Array.isArray(p.serviciosSeleccionados) ? p.serviciosSeleccionados : []).reduce((s, x) => s + utils.safeNum(x.precio), 0) + cost + utils.safeNum(p.gastos)).toString() })); 
    }, []);

    const handleClearDraft = useCallback(() => {
        if (window.confirm("¿Deseas limpiar el formulario y empezar de cero?")) {
            const cleared = { ...defaultFormData, fecha: utils.getLocalYYYYMMDD(new Date()) };
            setFormData(cleared);
            utils.setSafeLocal('diverty_form_draft', '');
        }
    }, []);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        if (!formData.cliente?.trim()) return showAlert("El nombre del cliente es obligatorio.");
        if (!formData.telefono?.trim()) return showAlert("El teléfono es obligatorio.");
        if (!formData.fecha) return showAlert("La fecha del evento es obligatoria.");
        onSave(formData, isCotizacionMode);
    }, [formData, isCotizacionMode, onSave, showAlert]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9998] bg-black/70 flex justify-center items-end sm:items-center p-0 sm:p-4 animate-fadeIn">
            <div className={`${modalSectionClass} w-full h-[92vh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl flex flex-col overflow-hidden p-0 sm:p-0`}>
                 <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center z-20 bg-transparent">
                    <h3 className="font-bold text-white/90 text-2xl flex items-center gap-3 tracking-tight">{initialData?.id && !initialData?.isDuplicated ? <Edit className="text-blue-400"/> : <Plus className="text-blue-400"/>} {initialData?.id && !initialData?.isDuplicated ? 'Editar Reserva' : 'Nueva Reserva'}</h3>
                    <div className="flex gap-3">{(!initialData?.id || initialData?.isDuplicated) && (<button onClick={handleClearDraft} type="button" className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl hover:bg-rose-500/20 active:scale-[0.98] transition-colors"><Trash2 size={20}/></button>)}<button onClick={onClose} type="button" className="p-2.5 bg-white/5 text-white/70 hover:text-white rounded-xl hover:bg-white/10 active:scale-[0.98] transition-colors"><X size={20}/></button></div>
                 </div>
                 <div className="overflow-y-auto flex-1 p-5 sm:p-8">
                  <form onSubmit={handleSubmit} className="max-w-xl mx-auto pb-8 space-y-6">
                     <div className={`${GLASS_CARD} p-6`}>
                        <div className="flex items-center gap-3 mb-6"><div className="bg-blue-500/10 text-blue-400 p-2.5 rounded-xl border border-blue-500/20"><Users size={20}/></div><h4 className="font-bold text-white/90 text-lg tracking-tight">Datos del Cliente</h4></div>
                        <div className="space-y-5"><div><label className={labelClass}>Nombre *</label><input ref={nameInputRef} required value={formData.cliente} onChange={e=>setFormData({...formData,cliente:e.target.value})} className={inputClass} /></div><div className="grid grid-cols-2 gap-5"><div><label className={labelClass}>Teléfono *</label><input required value={formData.telefono} onChange={e=>setFormData({...formData,telefono:e.target.value})} className={inputClass} /></div><div><label className={labelClass}>Correo</label><input value={formData.email} onChange={e=>setFormData({...formData,email:e.target.value})} className={inputClass} /></div></div></div>
                     </div>

                     <div className={`${GLASS_CARD} p-6`}>
                        <div className="flex items-center gap-3 mb-6"><div className="bg-rose-500/10 text-rose-400 p-2.5 rounded-xl border border-rose-500/20"><MapPin size={20}/></div><h4 className="font-bold text-white/90 text-lg tracking-tight">Logística</h4></div>
                        <div className="grid grid-cols-2 gap-5 mb-5"><div><label className={labelClass}>Fecha *</label><input required type="date" value={formData.fecha} onChange={e=>setFormData({...formData,fecha:e.target.value})} className={inputClass} /></div><div><label className={labelClass}>Hora *</label><input required type="time" value={formData.hora} onChange={e=>setFormData({...formData,hora:e.target.value})} className={inputClass} /></div></div>
                        <div className="mb-5"><label className={labelClass}>Zona</label><select value={formData.ubicacion} onChange={handleZoneChange} className={`${inputClass} appearance-none cursor-pointer`}>{Object.keys(ZONAS_TRANSPORTE).map(z => <option key={z} value={z} className="bg-[#0B1221] text-white">{z}</option>)}</select></div>
                        <div><label className={labelClass}>Dirección Exacta</label><input value={formData.direccion} onChange={e=>setFormData({...formData,direccion:e.target.value})} className={inputClass} /></div>
                     </div>

                     <div className={`${GLASS_CARD} p-6 relative z-30`}>
                        <div className="flex items-center gap-3 mb-6"><div className="bg-amber-500/10 text-amber-400 p-2.5 rounded-xl border border-amber-500/20"><Sparkles size={20}/></div><h4 className="font-bold text-white/90 text-lg tracking-tight">Servicios</h4></div>
                        
                        <div className="relative mb-6 z-20">
                            <div className="flex items-center relative group">
                                <Search className="absolute left-4 text-white/40 group-focus-within:text-blue-400 transition-colors" size={18} />
                                <input
                                    type="text"
                                    value={searchTermService}
                                    onChange={(e) => { setSearchTermService(e.target.value); setShowDropdown(true); }}
                                    onFocus={() => setShowDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                    placeholder="Buscar o agregar servicio..."
                                    className={`${inputClass} pl-12`}
                                />
                                {searchTermService && (
                                    <button type="button" onMouseDown={() => { setSearchTermService(''); setShowDropdown(false); }} className="absolute right-4 text-white/40 hover:text-white transition-colors"><X size={16}/></button>
                                )}
                            </div>

                            {showDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0B1221] border border-white/5 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50">
                                    {filteredPaquetes.map(p => (
                                        <button type="button" key={p.id} onMouseDown={(e) => { e.preventDefault(); addService(p); setSearchTermService(''); setShowDropdown(false); }} className="w-full text-left px-5 py-4 hover:bg-white/5 border-b border-white/5 last:border-0 flex justify-between items-center transition-colors">
                                            <span className="font-medium text-white/90">{String(p.nombre)}</span>
                                            <span className="text-emerald-400 font-bold">${utils.safeNum(p.precio)}</span>
                                        </button>
                                    ))}
                                    {filteredPaquetes.length === 0 && (
                                        <div className="px-5 py-6 text-center text-white/50 text-sm font-medium">No se encontraron servicios.</div>
                                    )}
                                    <div className="p-2 border-t border-white/5 sticky bottom-0 bg-[#0B1221]">
                                        <button type="button" onMouseDown={(e) => { e.preventDefault(); setIsCustomOpen(true); setShowDropdown(false); setSearchTermService(''); }} className="w-full py-3 bg-blue-500/10 text-blue-400 rounded-[12px] font-bold text-xs uppercase tracking-wider hover:bg-blue-500/20 transition-colors active:scale-[0.98]">
                                            + Crear nuevo servicio
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {isCustomOpen && (
                            <div className="mb-6 p-5 bg-[#0F172A] border border-white/5 rounded-2xl animate-fadeIn">
                                <h5 className="font-bold text-white/90 text-sm mb-4">Servicio Personalizado</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                                    <div>
                                        <label className={labelClass}>Nombre</label>
                                        <input type="text" value={customData.nombre} onChange={e=>setCustomData({...customData, nombre: e.target.value})} className={inputClass} placeholder="Ej. Hora extra" />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Precio ($)</label>
                                        <input type="number" value={customData.precio} onChange={e=>setCustomData({...customData, precio: e.target.value})} className={inputClass} placeholder="0.00" />
                                    </div>
                                </div>
                                <div className="flex gap-3 justify-end">
                                    <button type="button" onClick={() => setIsCustomOpen(false)} className="px-5 py-2.5 text-white/60 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors">Cancelar</button>
                                    <button type="button" onClick={handleCreateCustom} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-blue-500 transition-colors active:scale-[0.98]">Agregar</button>
                                </div>
                            </div>
                        )}

                        {formData.serviciosSeleccionados.length > 0 && (
                           <div className="space-y-4 mb-2 pt-2 border-t border-white/5">
                               <label className={labelClass}>Servicios Agregados ({formData.serviciosSeleccionados.length})</label>
                               {formData.serviciosSeleccionados.map((s, idx) => (
                                 <div key={idx} className="flex flex-col gap-4 p-5 bg-[#0F172A] rounded-[20px] border border-white/5 relative group hover:border-white/10 transition-colors duration-200">
                                    <button type="button" onClick={()=>removeService(idx)} className="absolute top-4 right-4 text-white/30 hover:text-rose-400 transition-colors p-1.5"><X size={16}/></button>
                                    
                                    <div className="flex justify-between items-center pr-8">
                                        <span className="font-bold text-[15px] text-white/90 truncate">{String(s.nombre)}</span>
                                        <div className="flex items-center bg-[#0B1221] rounded-xl p-1 border border-white/5">
                                            <button type="button" onClick={()=>updateServiceQuantity(idx,-1)} className="w-8 h-8 flex justify-center items-center hover:bg-white/5 rounded-lg text-white/50 hover:text-white transition-colors active:scale-[0.95]"><Minus size={14}/></button>
                                            <span className="w-8 text-center font-bold text-white/90">{s.cantidad}</span>
                                            <button type="button" onClick={()=>updateServiceQuantity(idx,1)} className="w-8 h-8 flex justify-center items-center hover:bg-white/5 rounded-lg text-white/50 hover:text-white transition-colors active:scale-[0.95]"><Plus size={14}/></button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 border-t border-white/5 pt-4">
                                        <div>
                                            <label className={labelClass}>Precio Modificable ($)</label>
                                            <input type="number" value={s.precio} onChange={(e) => handleServiceEdit(idx, 'precio', e.target.value)} className="w-full bg-[#0B1221] border border-white/5 rounded-xl px-4 py-3 text-[15px] font-medium text-white/90 outline-none focus:border-blue-500/50 transition-colors" />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Descripción para el PDF</label>
                                            <textarea value={s.descripcion || ''} onChange={(e) => handleServiceEdit(idx, 'descripcion', e.target.value)} rows={2} className="w-full bg-[#0B1221] border border-white/5 rounded-xl px-4 py-3 text-sm text-white/80 outline-none focus:border-blue-500/50 transition-colors resize-none leading-relaxed" placeholder="Detalles, viñetas, cambios..."/>
                                        </div>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>

                     <div className={`${GLASS_CARD} p-6`}>
                        <div className="flex items-center gap-3 mb-6"><div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-xl border border-emerald-500/20"><Receipt size={20}/></div><h4 className="font-bold text-white/90 text-lg tracking-tight">Finanzas</h4></div>
                        
                        <div className="grid grid-cols-2 gap-5 mb-6">
                            <div><label className={labelClass}>Abono</label><input type="number" value={formData.abono} onChange={e=>setFormData({...formData,abono:e.target.value})} className={`${inputClass} text-emerald-400 font-bold`} /></div>
                            <div><label className={labelClass}>Viáticos</label><input type="number" value={formData.transporte} onChange={e=>{
                                const newTransporte = e.target.value;
                                setFormData(prev => ({...prev, transporte: newTransporte, total: ((Array.isArray(prev.serviciosSeleccionados) ? prev.serviciosSeleccionados : []).reduce((sum, s) => sum + utils.safeNum(s.precio), 0) + utils.safeNum(newTransporte) + utils.safeNum(prev.gastos)).toString()}));
                            }} className={inputClass} /></div>
                        </div>
                        
                        <div className="mb-6 space-y-5 border-t border-white/5 pt-6 mt-2">
                            <div><label className={labelClass}>Gastos operativos reales ($)</label><input type="number" value={formData.gastos} onChange={e=>{
                                const newGastos = e.target.value;
                                setFormData(prev => ({...prev, gastos: newGastos, total: ((Array.isArray(prev.serviciosSeleccionados) ? prev.serviciosSeleccionados : []).reduce((sum, s) => sum + utils.safeNum(s.precio), 0) + utils.safeNum(prev.transporte) + utils.safeNum(newGastos)).toString()}));
                            }} className={`${inputClass} text-rose-400`} /></div>
                            <div><label className={labelClass}>Detalle de gastos internos</label><textarea value={formData.detalleGastos} onChange={e=>setFormData({...formData,detalleGastos:e.target.value})} className={`${inputClass} min-h-[80px] resize-none leading-relaxed`} placeholder="Ej. Transporte, hielo, ayudante..." /></div>
                        </div>

                        <div className="mb-6 border-t border-white/5 pt-6 mt-2"><label className={labelClass}>Estado</label><div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">{['Cotización', 'Pendiente', 'Confirmado', 'Completado'].map(est => (<button type="button" key={est} onClick={()=>setFormData({...formData,estado:est})} className={`shrink-0 flex-1 py-3.5 px-4 text-[10px] font-bold uppercase tracking-wider rounded-xl border transition-colors active:scale-[0.98] ${formData.estado===est ? 'bg-blue-600 text-white border-blue-500 shadow-md' : 'bg-[#0F172A] text-white/60 border-white/5 hover:bg-[#1E293B] hover:text-white/90'}`}>{est}</button>))}</div></div>
                        <div className="bg-[#0F172A] p-6 rounded-2xl flex justify-between items-center border border-white/5 mt-2"><span className="font-bold text-white/50 uppercase tracking-wider text-xs">TOTAL FINAL</span><div className="flex items-center"><span className="text-3xl font-bold text-blue-500 mr-2">$</span><input type="number" value={formData.total} onChange={e=>setFormData({...formData,total:e.target.value})} className="bg-transparent text-right text-4xl font-bold text-white/90 outline-none w-32 tracking-tight" /></div></div>
                     </div>

                     <AppButton variant="primary" icon={Check} onClick={handleSubmit} className="w-full py-4 text-base uppercase tracking-wider mt-2 mb-4">Guardar Reserva</AppButton>
                  </form>
                 </div>
              </div>
        </div>
    );
});

export default function App() {
  const hasSyncedRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [appSettings, setAppSettings] = useState(() => { const saved = utils.getSafeLocal('diverty_settings'); return saved ? JSON.parse(saved) : { metaMensual: META_MENSUAL, empresa: DATOS_EMPRESA }; });
  
  const [isAuthenticated, setIsAuthenticated] = useState(false); 
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [activeTab, setActiveTab] = useState('inicio'); 
  const [isDBReady, setIsDBReady] = useState(false);
  const [eventos, setEventos] = useState([]); 
  const [paquetesPersonalizados, setPaquetesPersonalizados] = useState([]);
  const [hiddenClients, setHiddenClients] = useState([]);
  const [filterDate, setFilterDate] = useState('');
  const [viewMode, setViewMode] = useState('semana'); 
  const [calMonth, setCalMonth] = useState(currentTime.getMonth());
  const [calYear, setCalYear] = useState(currentTime.getFullYear());
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, initialData: defaultFormData, isCotizacion: false });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const [toastAlert, setToastAlert] = useState({ isOpen: false, message: '', success: false });
  const [isModoOperativo, setIsModoOperativo] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [printType, setPrintType] = useState(null);
  const [pdfScale, setPdfScale] = useState(1); 
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSort, setClientSort] = useState('gasto'); 
  const [financePeriod, setFinancePeriod] = useState('mes');
  const [expandedFinanceId, setExpandedFinanceId] = useState(null);
  const [expandedClientId, setExpandedClientId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const todayObj = currentTime;
  const todayStr = useMemo(() => utils.getLocalYYYYMMDD(currentTime), [currentTime]);
  const tomorrowStr = useMemo(() => utils.getLocalYYYYMMDD(new Date(currentTime.getTime() + 86400000)), [currentTime]);
  const { start: weekStart, end: weekEnd } = useMemo(() => utils.getWeekRange(currentTime), [currentTime]);
  const todayTime = useMemo(() => new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate()).getTime(), [currentTime]);
  const PAQUETES_DIVERTY = useMemo(() => [...PAQUETES_BASE, ...paquetesPersonalizados], [paquetesPersonalizados]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const resetTimer = () => { lastActivityRef.current = Date.now(); };
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    const interval = setInterval(() => { if (Date.now() - lastActivityRef.current > 15 * 60 * 1000) signOut(auth); }, 60000);
    return () => { events.forEach(e => window.removeEventListener(e, resetTimer)); clearInterval(interval); };
  }, [isAuthenticated]);

  const eventosActivos = useMemo(() => eventos.filter(ev => !ev.deletedLocally).sort((a,b) => String(a.fecha).localeCompare(String(b.fecha)) || String(a.hora).localeCompare(String(b.hora))), [eventos]);

  const stats = useMemo(() => {
     let gananciaHoy = 0, gananciaSemana = 0, deudaTotal = 0, ingresosEsteMes = 0;
     const eventosHoy = [], eventosManana = [], alertasOperativas = [];
     const currYear = todayObj.getFullYear(), currMonth = todayObj.getMonth() + 1;

     eventosActivos.forEach(ev => {
        const est = utils.normalizeText(ev.estado), isHoy = ev.fecha === todayStr, isManana = ev.fecha === tomorrowStr;
        if(est !== 'cancelado' && est !== 'cotizacion') {
            const t = utils.safeNum(ev.total), a = utils.safeNum(ev.abono), g = utils.safeNum(ev.gastos), p = t - g; 
            let evYear = 0, evMonth = 0, evDay = 0;
            if(ev.fecha) { const parts = String(ev.fecha).trim().split('-'); if(parts.length >= 2) { evYear = parseInt(parts[0], 10); evMonth = parseInt(parts[1], 10); evDay = parseInt(parts[2] || 0, 10); } }
            const isEsteMes = (evYear === currYear && evMonth === currMonth);
            const isPastOrCurrentMonth = evYear < currYear || (evYear === currYear && evMonth <= currMonth);
            if (est !== 'completado' && (t - a) > 0 && isPastOrCurrentMonth) deudaTotal += (t - a);
            if(isHoy) gananciaHoy += p;
            if(isEsteMes) ingresosEsteMes += p;
            if(evYear && evMonth && evDay) { const eD = new Date(evYear, evMonth - 1, evDay); if (eD >= weekStart && eD <= weekEnd) gananciaSemana += p; }
            if(isHoy) eventosHoy.push(ev); 
            if(isManana) eventosManana.push(ev);
            if (est !== 'completado' && (isHoy || isManana)) {
                const priority = isHoy ? 1 : 2, sp = isHoy ? { color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', tagBg: 'bg-rose-500', tagText: 'HOY URGENTE' } : { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', tagBg: 'bg-amber-500', tagText: 'MAÑANA' };
                if (utils.safeNum(ev.abono) <= 0) alertasOperativas.push({ id: `abo-${ev.id}`, priority, ev, icon: DollarSign, ...sp, text: `Sin abono registrado: ${String(ev.cliente)}` });
                if (!ev.direccion || String(ev.direccion).trim() === '') alertasOperativas.push({ id: `dir-${ev.id}`, priority, ev, icon: MapPin, ...sp, text: `Falta dirección: ${String(ev.cliente)}` });
                if (!ev.hora || String(ev.hora).trim() === '') alertasOperativas.push({ id: `hor-${ev.id}`, priority, ev, icon: Clock, ...sp, text: `Falta hora: ${String(ev.cliente)}` });
            }
        }
     });
     eventosHoy.sort((a,b) => String(a.hora).localeCompare(String(b.hora))); eventosManana.sort((a,b) => String(a.hora).localeCompare(String(b.hora))); alertasOperativas.sort((a, b) => a.priority - b.priority);
     return { gananciaHoy, gananciaSemana, deudaTotal, ingresosEsteMes, eventosHoy, eventosManana, alertasOperativas };
  }, [eventosActivos, todayStr, tomorrowStr, weekStart, weekEnd, todayObj]);

  const clientsList = useMemo(() => {
     const clientsMap = {};
     eventosActivos.forEach(ev => {
        const est = utils.normalizeText(ev.estado);
        if(est === 'cancelado' || est === 'cotizacion') return; 
        const key = String(ev.cliente || '').trim().toLowerCase(); if(!key) return;
        if(!clientsMap[key]) clientsMap[key] = { nombre: ev.cliente, telefono: ev.telefono, totalGastado: 0, eventos: 0, ultimoEventoFecha: ev.fecha, ultimoEstado: ev.estado };
        clientsMap[key].totalGastado += utils.safeNum(ev.total); clientsMap[key].eventos += 1;
        if (ev.fecha && (!clientsMap[key].ultimoEventoFecha || ev.fecha > clientsMap[key].ultimoEventoFecha)) { clientsMap[key].ultimoEventoFecha = ev.fecha; clientsMap[key].ultimoEstado = ev.estado; }
     });
     return Object.values(clientsMap).filter(c => !hiddenClients.includes(c.nombre));
  }, [eventosActivos, hiddenClients]);

  const enrichedClients = useMemo(() => {
     return clientsList.map(c => {
         let daysSince = 0;
         if (c.ultimoEventoFecha) {
             const [y, m, d] = c.ultimoEventoFecha.split('-');
             if (y && m && d) { const lastDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)).getTime(); daysSince = Math.floor((todayTime - lastDate) / (1000 * 60 * 60 * 24)); }
         }
         return { ...c, daysSince, isVIP: c.eventos >= 3 || c.totalGastado >= 300, isFrecuente: c.eventos === 2, isNuevo: c.eventos === 1 && daysSince <= 180, isInactivo: daysSince > 180, needsContact: daysSince > 60 && daysSince <= 365 };
     });
  }, [clientsList, todayTime]);

  const animatedGananciaHoy = useCountUp(stats.gananciaHoy);

  const agendaFiltrados = useMemo(() => {
    return eventosActivos.filter(e => {
        const est = utils.normalizeText(e.estado);
        if (est === 'cotizacion') return false; 
        if (globalSearch && !String(`${e.cliente} ${e.servicio} ${e.ubicacion} ${e.direccion} ${e.telefono}`).toLowerCase().includes(globalSearch.toLowerCase())) return false;
        if (filterDate && e.fecha !== filterDate) return false;
        
        if (!filterDate && !globalSearch) {
            if (viewMode === 'hoy') return e.fecha === todayStr; 
            let dt; if (e.fecha) { const parts = String(e.fecha).split('-'); if (parts.length === 3) dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)); }
            if (viewMode === 'semana') return dt ? (dt >= weekStart && dt <= weekEnd) : false; 
            if (viewMode === 'mes') return dt ? (dt.getFullYear() === todayObj.getFullYear() && dt.getMonth() === todayObj.getMonth()) : false; 
            if (viewMode === 'findesemana') return dt ? (dt.getDay() === 0 || dt.getDay() === 6) : false; 
            if (viewMode === 'pendientes') return (utils.safeNum(e.total) - utils.safeNum(e.abono)) > 0 && est !== 'completado'; 
            if (viewMode === 'todas') return true;
        }
        return true; 
    });
  }, [eventosActivos, globalSearch, filterDate, viewMode, todayStr, todayObj, weekStart, weekEnd]);

  const filteredClients = useMemo(() => enrichedClients.filter(c => { if(!searchTerm) return true; const s = searchTerm.toLowerCase(); return String(c.nombre).toLowerCase().includes(s) || String(c.telefono).includes(s); }), [enrichedClients, searchTerm]);
  const sortedFilteredClients = useMemo(() => [...filteredClients].sort((a, b) => { if (clientSort === 'gasto') return b.totalGastado - a.totalGastado; if (clientSort === 'recientes') return new Date(b.ultimoEventoFecha || 0) - new Date(a.ultimoEventoFecha || 0); return 0; }), [filteredClients, clientSort]);
  const contactCandidates = useMemo(() => enrichedClients.filter(c => c.needsContact).slice(0, 5), [enrichedClients]);

  const cy = new Date(todayTime).getFullYear(), cm = new Date(todayTime).getMonth() + 1;
  const evtCalculoBase = useMemo(() => eventosActivos.filter(ev => {
      const est = utils.normalizeText(ev.estado);
      if (est === 'cancelado' || est === 'cotizacion') return false;
      if (financePeriod === 'todos') return true;
      if (!ev.fecha) return false; 
      const parts = String(ev.fecha).trim().split('-'); 
      return parseInt(parts[0], 10) === cy && parseInt(parts[1], 10) === cm;
  }), [eventosActivos, financePeriod, cy, cm]);

  const finanzasData = useMemo(() => {
      const tI = evtCalculoBase.reduce((a, e) => a + utils.safeNum(e.total), 0);
      const tG = evtCalculoBase.reduce((a, e) => a + utils.safeNum(e.gastos), 0);
      const bT = tI - tG;
      const roi = tI > 0 ? ((bT / tI) * 100).toFixed(0) : 0;
      const deudaTotalGlobal = evtCalculoBase.reduce((acc, ev) => {
          const pendiente = utils.safeNum(ev.total) - utils.safeNum(ev.abono);
          return (pendiente > 0 && utils.normalizeText(ev.estado) !== 'completado') ? acc + pendiente : acc;
      }, 0);
      return { tI, tG, bT, roi, deudaTotalGlobal };
  }, [evtCalculoBase]);

  const finanzasMes = useMemo(() => {
      const ingresosEsteMesGlobal = eventosActivos.filter(ev => {
          const est = utils.normalizeText(ev.estado);
          if (est === 'cancelado' || est === 'cotizacion') return false;
          if (!ev.fecha) return false; const parts = String(ev.fecha).trim().split('-'); return parseInt(parts[0], 10) === cy && parseInt(parts[1], 10) === cm;
      }).reduce((acc, ev) => acc + (utils.safeNum(ev.total) - utils.safeNum(ev.gastos)), 0);
      const diasTranscurridos = new Date(todayTime).getDate(), diasTotales = new Date(cy, cm, 0).getDate();
      const promedioDiario = diasTranscurridos > 0 ? ingresosEsteMesGlobal / diasTranscurridos : 0;
      const proyeccion = promedioDiario * diasTotales;
      const progresoMeta = Math.min((ingresosEsteMesGlobal / appSettings.metaMensual) * 100, 100);
      return { ingresosEsteMesGlobal, diasTranscurridos, diasTotales, proyeccion, progresoMeta };
  }, [eventosActivos, cy, cm, todayTime, appSettings.metaMensual]);

  const chartData = useMemo(() => {
      const td = new Date(todayTime);
      const last7Days = Array.from({length: 7}, (_, i) => { const d = new Date(td); d.setDate(d.getDate() - (6 - i)); return utils.getLocalYYYYMMDD(d); });
      return last7Days.map(date => {
          const dayEarnings = eventosActivos.filter(ev => ev.fecha === date && utils.normalizeText(ev.estado) !== 'cancelado' && utils.normalizeText(ev.estado) !== 'cotizacion').reduce((acc, ev) => acc + (utils.safeNum(ev.total) - utils.safeNum(ev.gastos)), 0);
          return { date, value: dayEarnings };
      });
  }, [eventosActivos, todayTime]);
  const maxChartVal = useMemo(() => Math.max(...chartData.map(d => d.value), 100), [chartData]);

  const cotizacionesActivas = useMemo(() => eventosActivos.filter(ev => utils.normalizeText(ev.estado) === 'cotizacion'), [eventosActivos]);
  const proximasReservas = useMemo(() => [...stats.eventosHoy, ...stats.eventosManana].filter(ev => utils.normalizeText(ev.estado) !== 'completado'), [stats.eventosHoy, stats.eventosManana]);

  const updateSettings = useCallback((newSettings) => { setAppSettings(newSettings); utils.setSafeLocal('diverty_settings', JSON.stringify(newSettings)); }, []);
  const showAlert = useCallback((message, success = false) => { setToastAlert({ isOpen: true, message: String(message), success }); setTimeout(() => setToastAlert({ isOpen: false, message: '', success: false }), 5000); }, []);
  const showConfirm = useCallback((message, onConfirm) => { setConfirmModal({ isOpen: true, message: String(message), onConfirm: () => { onConfirm(); setConfirmModal({ isOpen: false, message: '', onConfirm: null }); } }); }, []);
  
  const handleAddCustomService = useCallback(async (nombre, precio) => {
    if (!nombre?.trim()) { showAlert("Ingresa un nombre para el servicio.", false); return null; }
    const newSrv = { id: 'c-'+Date.now(), nombre: nombre.trim(), precio: utils.safeNum(precio), short: nombre.substring(0,12)+'...', descripcion: 'Servicio personalizado.', isCustom: true };
    const nuevosPaquetes = [...paquetesPersonalizados, newSrv];
    setPaquetesPersonalizados(nuevosPaquetes);
    if (firebaseUser) { await setDoc(getConfigRef('serviciosCustom'), { paquetes: nuevosPaquetes }, { merge: true }); }
    return newSrv;
  }, [paquetesPersonalizados, firebaseUser, showAlert]);

  const openModal = useCallback((ev = null, isCot = false) => {
    try {
        utils.triggerHaptic('light'); 
        let initial = { ...defaultFormData, fecha: filterDate || todayStr };
        const isEventData = ev && typeof ev === 'object' && 'id' in ev && typeof ev.preventDefault !== 'function';
        if (isEventData) { 
           let srvs = Array.isArray(ev.serviciosSeleccionados) ? [...ev.serviciosSeleccionados] : [];
           if (!srvs.length && ev.servicio) {
              String(ev.servicio).split('+').forEach(s => {
                  const nm = s.match(/^(.*?)(?:\s*\(x\d+\))?$/)?.[1].trim() || s.trim(); const q = parseInt(s.match(/\(x(\d+)\)/)?.[1] || 1); const p = utils.getServiceDetails(nm);
                  if (p) srvs.push({ ...p, cantidad: q, precioOriginal: p.precio, precio: p.precio * q });
                  else srvs.push({ nombre: s.trim(), precio: utils.safeNum(ev.total)/(String(ev.servicio).split('+').length||1), cantidad: q, precioOriginal: utils.safeNum(ev.total)/(String(ev.servicio).split('+').length||1) });
              });
           }
           initial = { ...defaultFormData, ...ev, serviciosSeleccionados: srvs }; 
        } else if (!isCot) {
            const draftStr = utils.getSafeLocal('diverty_form_draft');
            if (draftStr) { try { const draftObj = JSON.parse(draftStr); if (draftObj && (draftObj.cliente || draftObj.telefono || draftObj.serviciosSeleccionados?.length > 0)) { initial = draftObj; showAlert("Borrador recuperado", true); } } catch(e) {} }
        }
        setModalConfig({ isOpen: true, isCotizacion: isCot === true, initialData: initial });
    } catch (e) { 
        console.error(e); 
        setModalConfig({ isOpen: true, isCotizacion: isCot === true, initialData: { ...defaultFormData, fecha: filterDate || todayStr } }); 
    }
  }, [filterDate, todayStr, showAlert]);
  
  const closeModal = useCallback(() => { utils.triggerHaptic('light'); setModalConfig({ isOpen: false, initialData: defaultFormData, isCotizacion: false }); }, []);

  const handleDuplicateEvento = useCallback((ev) => {
    utils.triggerHaptic('light');
    const { id, createdAt, deletedLocally, colisionAprobada, ...rest } = ev;
    const duplicatedData = { ...rest, abono: '', estado: 'Pendiente', isDuplicated: true };
    setModalConfig({ isOpen: true, isCotizacion: false, initialData: duplicatedData });
    showAlert("Evento duplicado. Verifica los datos y guarda.", true);
  }, [showAlert]);

  const handleSaveFromModal = useCallback(async (formDataToSave, isCotizacionMode) => {
    if (!formDataToSave.cliente?.trim()) return showAlert("Por favor, ingresa el nombre del cliente."); 
    if (!formDataToSave.fecha) return showAlert("Por favor, selecciona la fecha.");
    if (isCotizacionMode) { utils.triggerHaptic('success'); closeModal(); setPrintData({ ...formDataToSave, id: `cot-${Date.now()}` }); setPrintType('cotizacion'); setIsPrinting(true); return; }
    utils.triggerHaptic('light'); 
    
    const evtId = (formDataToSave.id && !formDataToSave.isDuplicated) ? formDataToSave.id : `man-${Date.now()}`; 
    const { isDuplicated, ...cleanFormData } = formDataToSave;
    const safeData = JSON.parse(JSON.stringify({ ...cleanFormData, id: evtId, createdAt: cleanFormData.createdAt || new Date().toISOString(), deletedLocally: false }));
    if (modalConfig.initialData?.fecha !== safeData.fecha || modalConfig.initialData?.hora !== safeData.hora) safeData.colisionAprobada = false;

    const hasCollision = eventosActivos.some(ev => {
        if (ev.id === evtId || utils.normalizeText(ev.estado) === 'cancelado' || utils.normalizeText(ev.estado) === 'cotizacion' || ev.fecha !== safeData.fecha) return false;
        if (!ev.hora || !safeData.hora) return true; 
        const [h1, m1] = ev.hora.split(':').map(Number), [h2, m2] = safeData.hora.split(':').map(Number);
        return Math.abs((h1 * 60 + m1) - (h2 * 60 + m2)) < 180; 
    });

    const guardarReservaFinal = (id, dataToSave) => {
        setEventos(prev => { const arr = [...prev]; const i = arr.findIndex(x=>x.id===id); if(i>-1) arr[i]=dataToSave; else arr.push(dataToSave); return arr; }); 
        setDoc(getDocRef(id), dataToSave).catch(err=>console.warn(err)); 
        utils.setSafeLocal('diverty_form_draft', ''); closeModal(); showAlert("¡Reserva guardada!", true);
    };

    if (hasCollision && !safeData.colisionAprobada) { 
        showConfirm("Hay otro evento con menos de 3 horas de diferencia. ¿Guardar de todos modos?", () => { safeData.colisionAprobada = true; guardarReservaFinal(evtId, safeData); });
    } else {
        guardarReservaFinal(evtId, safeData);
    }
  }, [eventosActivos, closeModal, showAlert, modalConfig, showConfirm]);

  const handleDeleteEvento = useCallback((id) => showConfirm("¿Eliminar reserva permanentemente?", async () => { utils.triggerHaptic('light'); setEventos(prev => { const arr = [...prev]; const i = arr.findIndex(x=>x.id===id); if(i>-1) arr[i].deletedLocally=true; return arr; }); setDoc(getDocRef(id), { deletedLocally: true }, { merge: true }).catch(e=>console.warn(e)); closeModal(); }), [closeModal, showConfirm]);
  
  const handleDeleteClient = useCallback((clientName, eventCount) => {
    const mensaje = eventCount > 0 ? `¿Seguro que deseas eliminar este cliente? Tiene ${eventCount} evento(s) asociado(s).` : `¿Seguro que deseas eliminar este cliente?`;
    showConfirm(mensaje, async () => {
        utils.triggerHaptic('light');
        const newHidden = [...hiddenClients, clientName];
        setHiddenClients(newHidden);
        if (firebaseUser) await setDoc(getConfigRef('clientesOcultos'), { clients: newHidden }, { merge: true });
        showAlert("Cliente eliminado exitosamente.", true);
    });
  }, [hiddenClients, firebaseUser, showConfirm, showAlert]);

  const handleWipeAll = useCallback(() => showConfirm("⚠️ ¿Limpiar toda la base de datos?", async () => { utils.triggerHaptic('light'); setEventos([]); Promise.all(eventosActivos.map(ev => setDoc(getDocRef(ev.id), { deletedLocally: true }, { merge: true }))).catch(e=>console.warn(e)); utils.triggerHaptic('success'); showAlert("Base de datos limpiada.", true); }), [eventosActivos, showConfirm, showAlert]);
  const handleViewDoc = useCallback((ev, type) => { try { utils.triggerHaptic('light'); setPrintData(ev); setPrintType(type); setIsPrinting(true); } catch (err) { showAlert("Error al procesar."); } }, [showAlert]);
  
  const sendWhatsAppCall = useCallback((ev, type, empresaSettings) => { utils.triggerHaptic('success'); const msg = getWhatsAppMessage(ev, type, empresaSettings || appSettings.empresa); const phoneClean = String(ev.telefono).replace(/\D/g,''); utils.openWhatsAppBusiness(phoneClean, msg); }, [appSettings.empresa]);
  const openGoogleMaps = useCallback((dir, ubi) => { utils.triggerHaptic('light'); window.open(`https://maps.google.com/?q=${encodeURIComponent(`${dir || ''} ${ubi || ''} Panamá`)}`, '_blank'); }, []);
  const printNativePDF = useCallback(() => { utils.triggerHaptic('success'); window.print(); }, []);

  const downloadPDF = useCallback(async () => {
    utils.triggerHaptic('success');
    const element = document.getElementById('pdf-content');
    if (!element) return;
    
    if (!window.html2pdf) { 
        showAlert("Intentando descargar PDF con método alternativo...", true); 
        printNativePDF();
        return; 
    }

    const wrapper = document.getElementById('pdf-wrapper-scaler');
    let oldTransform = '';
    
    if (wrapper) {
        oldTransform = wrapper.style.transform;
        wrapper.style.transform = 'scale(1)';
    }

    showAlert("Generando PDF...", true);

    const docName = printData?.cliente ? String(printData.cliente).replace(/[^a-z0-9]/gi, '_') : 'Documento';
    const fileName = `${printType === 'cotizacion' ? 'Cotizacion' : 'Factura'}_Diverty_${docName}.pdf`;
    
    const opt = { 
        margin: [0.1, 0, 0.4, 0], 
        filename: fileName, 
        image: { type: 'jpeg', quality: 0.98 }, 
        html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 800 }, 
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.avoid-break'] }
    };

    try { 
        const pdfBlob = await window.html2pdf().set(opt).from(element).output('blob');
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showAlert("¡PDF descargado con éxito en tu dispositivo!", true); 
    } 
    catch (error) { 
        console.error(error);
        showAlert("Error en descarga. Se abrirá la opción de impresión para que lo guardes."); 
        printNativePDF();
    } 
    finally { 
        if (wrapper) wrapper.style.transform = oldTransform; 
    }
  }, [printData, printType, showAlert, printNativePDF]);

  const handleSharePDF = useCallback(async () => {
    utils.triggerHaptic('success');
    const element = document.getElementById('pdf-content');
    if (!element) return;
    if (!window.html2pdf) { showAlert("El generador de PDF está cargando..."); return; }

    const wrapper = document.getElementById('pdf-wrapper-scaler');
    let oldTransform = '';
    
    if (wrapper) {
        oldTransform = wrapper.style.transform;
        wrapper.style.transform = 'scale(1)';
    }

    const docName = printData?.cliente ? String(printData.cliente).replace(/[^a-z0-9]/gi, '_') : 'Documento';
    const fileName = `${printType === 'cotizacion' ? 'Cotizacion' : 'Factura'}_Diverty_${docName}.pdf`;
    
    const opt = { 
        margin: [0.1, 0, 0.4, 0], 
        filename: fileName, 
        image: { type: 'jpeg', quality: 0.98 }, 
        html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 800 }, 
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.avoid-break'] }
    };

    try {
        showAlert("Preparando PDF para compartir...", true);
        const pdfBlob = await window.html2pdf().set(opt).from(element).output('blob');
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        const msg = getWhatsAppMessage(printData, printType === 'cotizacion' ? 'cotizacion' : 'recibo', appSettings.empresa);

        if (navigator.canShare && navigator.canShare({ files: [file] })) { 
            await navigator.share({ files: [file], title: fileName, text: msg }); 
        } 
        else { 
            showAlert("Tu celular no soporta compartir. Descargando...", false); 
            await downloadPDF(); 
            const phoneClean = String(printData?.telefono || '').replace(/\D/g,''); 
            utils.openWhatsAppBusiness(phoneClean, msg); 
        }
    } catch (error) { 
        if (error?.name !== 'AbortError') { 
            showAlert("Error al compartir. Usando descarga normal."); 
            downloadPDF(); 
        } 
    } 
    finally { 
        if (wrapper) wrapper.style.transform = oldTransform; 
    }
  }, [printData, printType, appSettings, showAlert, downloadPDF]);

  const downloadExcel = useCallback(() => {
    utils.triggerHaptic('success');
    const filteredForExport = eventosActivos.filter(ev => { 
        const est = utils.normalizeText(ev.estado);
        if (est === 'cancelado' || est === 'cotizacion' || utils.safeNum(ev.total) <= 0) return false; 
        if (financePeriod === 'todos') return true; 
        const fStr = String(ev.fecha || ''); if (fStr) { const [ey, em] = fStr.split('-'); return parseInt(ey) === cy && parseInt(em) === cm; } return false; 
    });
    let csv = 'Fecha,Cliente,Tipo Evento,Ubicacion,Ingreso Bruto,Gastos,Ganancia Neta,Estado\n'; filteredForExport.forEach(ev => { const t = utils.safeNum(ev.total); const g = utils.safeNum(ev.gastos); csv += `"${ev.fecha||''}","${String(ev.cliente||'').replace(/,/g,'')}","${String(ev.tipoEvento||'').replace(/,/g,'')}","${String(ev.ubicacion||'').replace(/,/g,'')}",${t},${g},${t-g},"${ev.estado||''}"\n`; });
    const blob = new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `Reporte_Finanzas_Diverty_${financePeriod}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }, [eventosActivos, financePeriod, cy, cm]);

  const handleLogin = useCallback(async (e) => { 
    e.preventDefault(); 
    try {
        await signInWithEmailAndPassword(auth, emailInput, passwordInput);
        utils.triggerHaptic('success'); 
        setEmailInput('');
        setPasswordInput('');
    } catch (error) {
        utils.triggerHaptic('warning'); 
        showAlert("Credenciales incorrectas", false); 
    }
  }, [emailInput, passwordInput, showAlert]);

  const handleLogout = useCallback(async () => { 
      try {
          await signOut(auth);
      } catch (error) {
          showAlert("Error al cerrar sesión");
      }
  }, [showAlert]);

  const handleCopiarCobros = useCallback(() => {
      utils.triggerHaptic('success'); let text = "📋 *REPORTE DE COBROS PENDIENTES* 📋\n\n";
      eventosActivos.filter(ev => { const est = utils.normalizeText(ev.estado); return (utils.safeNum(ev.total) - utils.safeNum(ev.abono)) > 0 && est !== 'cancelado' && est !== 'completado' && est !== 'cotizacion'; }).forEach(ev => { text += `👤 *${ev.cliente}*\n📅 Fecha: ${ev.fecha}\n💰 Debe: $${(utils.safeNum(ev.total) - utils.safeNum(ev.abono)).toFixed(2)}\n📞 WA: ${ev.telefono}\n\n`; });
      navigator.clipboard.writeText(text); showAlert("Lista de cobros copiada al portapapeles", true);
  }, [eventosActivos, showAlert]);

  const activarNotificaciones = useCallback(async () => {
    if (!('Notification' in window)) { showAlert("Este navegador no soporta notificaciones."); return; }
    try {
      utils.triggerHaptic('light'); const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const messaging = getMessaging(app);
        const token = await getToken(messaging, { vapidKey: 'BFDjCV2HR94H_de31u2xSs6OEu6SqanCtB2jjUvLk52yQ44pTaXpjl6na7dxoV7BLzai9wOSbB75ZoKdhvh9JGY', serviceWorkerRegistration: registration });
        if (token) { try { await navigator.clipboard.writeText(token); showAlert("✅ ¡Token COPIADO al portapapeles!", true); } catch(err) { const copyPrompt = window.prompt("Copia este Token larguísimo:", token); if(copyPrompt) showAlert("Token copiado", true); } } else { showAlert("No se pudo obtener el token."); }
      } else { showAlert("Permiso denegado."); }
    } catch (error) { console.error(error); showAlert(`Error de notificaciones`); }
  }, [showAlert]);

  useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (!document.getElementById('html2pdf-script')) { const script = document.createElement('script'); script.id = 'html2pdf-script'; script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'; script.async = true; document.body.appendChild(script); } }, []);
  
  useEffect(() => { 
      const unsubscribe = onAuthStateChanged(auth, (user) => { 
          if (user) {
              setFirebaseUser(user); 
              setIsAuthenticated(true);
          } else {
              setFirebaseUser(null);
              setIsAuthenticated(false);
          }
          setIsAuthLoading(false);
      }); 
      return () => unsubscribe(); 
  }, []);

  useEffect(() => { const handleResize = () => setPdfScale(window.innerWidth < 850 ? (window.innerWidth - 32) / 800 : 1); handleResize(); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize); }, []);
  useEffect(() => { if (isPrinting) window.scrollTo(0, 0); }, [isPrinting, printData]);

  useEffect(() => {
    if (!db || !appId || !firebaseUser) return;
    const timeoutId = setTimeout(() => { setIsDBReady(true); }, 3500);
    const eventosRef = collection(db, 'artifacts', appId, 'public', 'data', 'eventos');
    const unsubscribeEventos = onSnapshot(eventosRef, (snapshot) => {
      clearTimeout(timeoutId); const fbData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEventos(prev => {
          let hasChanges = false;
          const map = new Map(prev.map(e => [e.id, e]));
          fbData.forEach(e => { 
             if (map.has(e.id)) { 
                const exist = map.get(e.id); 
                if (exist.estado !== e.estado || exist.abono !== e.abono || exist.total !== e.total || exist.deletedLocally !== e.deletedLocally) {
                    map.set(e.id, { ...exist, estado: e.estado, abono: e.abono, total: e.total, deletedLocally: e.deletedLocally }); 
                    hasChanges = true;
                }
             } else { map.set(e.id, e); hasChanges = true; } 
          });
          if (!hasChanges && prev.length > 0) return prev;
          return Array.from(map.values()).sort((a,b) => String(a.fecha).localeCompare(String(b.fecha)) || String(a.hora).localeCompare(String(b.hora)));
      }); setIsDBReady(true);
    }, (error) => { console.warn("Firestore offline:", error); clearTimeout(timeoutId); setIsDBReady(true); });
    
    getDoc(getConfigRef('serviciosCustom')).then((docSnap) => { if (docSnap.exists()) { setPaquetesPersonalizados(docSnap.data().paquetes || []); } });
    getDoc(getConfigRef('clientesOcultos')).then((docSnap) => { if (docSnap.exists()) { setHiddenClients(docSnap.data().clients || []); } });

    return () => { unsubscribeEventos(); clearTimeout(timeoutId); };
  }, [db, appId, firebaseUser]);

  useEffect(() => {
      let isSubscribed = true;
      const syncSheets = async () => {
        if (!sheetUrl || !isAuthenticated || !firebaseUser || !isSubscribed) return;
        setIsSyncing(true); utils.triggerHaptic('light');
        try {
          const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/); if (!match) throw new Error('URL inválida.');
          const res = await fetch(`https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv&_nocache=${Date.now()}`); 
          if (!res.ok) throw new Error('HTTP '+res.status);
          const rows = utils.parseCSV(await res.text());
          if (rows.length > 1) {
            const h = rows[0].map(x=>String(x||'').trim().toLowerCase());
            const getIdx = (keys) => keys.map(k => h.findIndex(x=>x.includes(k))).find(i => i !== -1) ?? -1;
            const [iNom, iEm, iTip, iTel, iNin, iFec, iHor, iUbi, iDir, iCom, iSer, iTra, iPre, iAbo, iEst] = [ getIdx(['nombre','cliente']), getIdx(['email','correo']), getIdx(['tipo','evento']), getIdx(['tel']), getIdx(['niñ','nin','cant']), getIdx(['fecha']), getIdx(['hora']), getIdx(['ubicacion','lugar','zona']), getIdx(['direc','detal']), getIdx(['coment','nota']), getIdx(['servic','paquet','plan']), getIdx(['transp','viatic']), getIdx(['preci','total','monto']), getIdx(['abono','deposi']), getIdx(['estado','status']) ];
            if (iNom === -1) { setIsSyncing(false); return; }
            const nuevasReservasDeSheets = []; const seen = new Set();
            for (let i = 1; i < rows.length; i++) {
              const r = rows[i]; if (!r[iNom] || String(r[iNom]).trim() === '') continue;
              const s = (idx) => idx !== -1 ? String(r[idx]).trim() : '';
              let fechaLimpia = s(iFec);
              if (/^\d+$/.test(fechaLimpia)) { const serial = parseInt(fechaLimpia, 10); if (serial > 40000) { const dt = new Date(Math.round((serial - 25569) * 86400 * 1000)); const localDt = new Date(dt.getTime() + dt.getTimezoneOffset() * 60000); fechaLimpia = utils.getLocalYYYYMMDD(localDt); } } else if (fechaLimpia.includes('/')) { const p = fechaLimpia.split('/'); if (p.length === 3 && p[2].length === 4) { fechaLimpia = `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`; } }
              let horaLimpia = s(iHor);
              if (/^0?\.\d+$/.test(horaLimpia)) { const tMins = Math.round(parseFloat(horaLimpia) * 24 * 60); const hh = Math.floor(tMins / 60); const mm = tMins % 60; horaLimpia = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`; }
              const id = `gs-${(r[iNom]+fechaLimpia+horaLimpia).replace(/[^a-z0-9]/gi,'').toLowerCase() || i}`;
              if(seen.has(id)) continue; seen.add(id);
              nuevasReservasDeSheets.push({ id, cliente: r[iNom] || 'Sin Nombre', email: s(iEm), telefono: s(iTel), tipoEvento: s(iTip) || 'Evento', ninos: s(iNin), fecha: fechaLimpia, hora: horaLimpia, ubicacion: s(iUbi) || 'Panamá Centro', direccion: s(iDir), comentarios: s(iCom), servicio: s(iSer), transporte: s(iTra).replace(/[^0-9.-]/g,"")||"0", total: s(iPre).replace(/[^0-9.-]/g,"")||"0", abono: s(iAbo).replace(/[^0-9.-]/g,"")||"0", estado: s(iEst) || 'Pendiente' });
            }
            if (!isSubscribed) return;
            setEventos(prev => {
                let hasChanges = false;
                const map = new Map(prev.map(e => [e.id, e])); const updatesParaFirebase = [];
                nuevasReservasDeSheets.forEach(sheetEvt => {
                    if (!map.has(sheetEvt.id)) { map.set(sheetEvt.id, sheetEvt); updatesParaFirebase.push(sheetEvt); hasChanges = true; } else {
                        const exist = map.get(sheetEvt.id);
                        if (!exist.deletedLocally && Object.keys(sheetEvt).some(k => sheetEvt[k] !== exist[k] && !['total','abono','transporte','estado'].includes(k))) {
                            const actualizado = { ...sheetEvt, total: exist.total!=='0'?exist.total:sheetEvt.total, abono: exist.abono!=='0'?exist.abono:sheetEvt.abono, transporte: exist.transporte!=='0'?exist.transporte:sheetEvt.transporte, estado: exist.estado!=='Pendiente'?exist.estado:sheetEvt.estado, serviciosSeleccionados: exist.serviciosSeleccionados||[], gastos: exist.gastos||'', detalleGastos: exist.detalleGastos||'', colisionAprobada: exist.colisionAprobada||false };
                            map.set(sheetEvt.id, actualizado); updatesParaFirebase.push(actualizado); hasChanges = true;
                        }
                    }
                });
                if (updatesParaFirebase.length > 0 && firebaseUser) { Promise.all(updatesParaFirebase.map(ev => setDoc(getDocRef(ev.id), ev))).catch(err => console.warn(err)); }
                setIsDBReady(true);
                if (!hasChanges) return prev;
                return Array.from(map.values()).sort((a,b) => String(a.fecha).localeCompare(String(b.fecha)) || String(a.hora).localeCompare(String(b.hora)));
            });
            utils.triggerHaptic('success');
          }
        } catch (err) { console.warn("Sync error"); }
        if (isSubscribed) setIsSyncing(false);
      };

      if (isAuthenticated && firebaseUser && !hasSyncedRef.current) { hasSyncedRef.current = true; syncSheets(); }
      const intervalId = setInterval(() => { if (isAuthenticated) syncSheets(); }, 30000);
      
      return () => { isSubscribed = false; clearInterval(intervalId); };
  }, [isAuthenticated, firebaseUser]);

  const handleToggleClient = useCallback((nombre) => { setExpandedClientId(prev => prev === nombre ? null : nombre); }, []);
  const handleToggleFinance = useCallback((id) => { setExpandedFinanceId(prev => prev === id ? null : id); }, []);

  const renderInicio = () => {
     if (isModoOperativo) {
        const faltanAbono = stats.eventosHoy.filter(ev => utils.safeNum(ev.abono) <= 0 && utils.normalizeText(ev.estado) !== 'completado');
        const faltanDireccion = stats.eventosHoy.filter(ev => (!ev.direccion || String(ev.direccion).trim() === '') && utils.normalizeText(ev.estado) !== 'completado');
        const faltanHora = stats.eventosHoy.filter(ev => (!ev.hora || String(ev.hora).trim() === '') && utils.normalizeText(ev.estado) !== 'completado');

        return (
          <div className="animate-fadeIn p-4 md:p-10 max-w-2xl mx-auto space-y-6 pb-32 relative z-50">
             <div className="fixed inset-0 bg-[#060B14] -z-10 animate-fadeIn"></div>
             <div className="flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-[24px] shadow-[0_10px_40px_rgba(37,99,235,0.3)] transition-all duration-300 border border-white/10">
                 <div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-blue-100 mb-1">Modo En Terreno</p><h2 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2 tracking-tight"><Zap size={28} className="fill-white"/> Operativa de Hoy</h2></div>
                 <button type="button" onClick={() => setIsModoOperativo(false)} className="bg-white/10 hover:bg-white/20 p-3.5 rounded-xl active:scale-[0.98] hover:-translate-y-0.5 transition-all duration-200 shadow-sm border border-white/10"><X size={24} /></button>
             </div>
             {(faltanAbono.length > 0 || faltanDireccion.length > 0 || faltanHora.length > 0) && (
                 <div className="bg-white/5 border border-white/5 p-6 rounded-[24px] shadow-lg">
                     <h3 className="text-white font-bold text-sm uppercase tracking-[0.1em] mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-rose-400"/> Checklist de Alertas</h3>
                     <div className="space-y-4">
                         {faltanAbono.length > 0 && (<div className="flex items-center gap-4 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl"><div className="bg-rose-500/20 p-2.5 rounded-xl"><DollarSign size={18} className="text-rose-400"/></div><div><p className="text-white font-bold text-[15px] leading-tight">Falta abono ({faltanAbono.length})</p><p className="text-rose-400 text-xs font-bold uppercase tracking-[0.1em] truncate max-w-[200px] mt-1">{faltanAbono.map(e=>String(e.cliente).split(' ')[0]).join(', ')}</p></div></div>)}
                         {faltanDireccion.length > 0 && (<div className="flex items-center gap-4 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl"><div className="bg-amber-500/20 p-2.5 rounded-xl"><MapPin size={18} className="text-amber-400"/></div><div><p className="text-white font-bold text-[15px] leading-tight">Falta dirección ({faltanDireccion.length})</p><p className="text-amber-400 text-xs font-bold uppercase tracking-[0.1em] truncate max-w-[200px] mt-1">{faltanDireccion.map(e=>String(e.cliente).split(' ')[0]).join(', ')}</p></div></div>)}
                         {faltanHora.length > 0 && (<div className="flex items-center gap-4 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl"><div className="bg-blue-500/20 p-2.5 rounded-xl"><Clock size={18} className="text-blue-400"/></div><div><p className="text-white font-bold text-[15px] leading-tight">Falta hora ({faltanHora.length})</p><p className="text-blue-400 text-xs font-bold uppercase tracking-[0.1em] truncate max-w-[200px] mt-1">{faltanHora.map(e=>String(e.cliente).split(' ')[0]).join(', ')}</p></div></div>)}
                     </div>
                 </div>
             )}
             <div className="space-y-6">
                 {stats.eventosHoy.length === 0 ? (
                     <div className="text-center py-16 bg-white/5 rounded-[24px] border border-white/5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]"><Sun size={56} className="mx-auto text-white/30 mb-5" strokeWidth={1.5}/><p className="text-white font-extrabold text-xl mb-2 tracking-tight">¡Todo Despejado!</p><p className="text-white/50 font-medium text-sm">No hay eventos operativos para hoy.</p></div>
                 ) : (
                     stats.eventosHoy.map((ev, i) => <EventCardItem key={ev.id} ev={ev} idx={i} todayTime={todayTime} onWhatsApp={sendWhatsAppCall} onViewDoc={handleViewDoc} onEdit={openModal} onDelete={handleDeleteEvento} onDuplicate={handleDuplicateEvento} onMapClick={openGoogleMaps} empresa={appSettings.empresa} utils={utils} />)
                 )}
             </div>
          </div>
        );
     }

     return (
       <div className="animate-fadeIn p-4 md:p-6 lg:p-10 max-w-5xl mx-auto space-y-8 pb-32 md:pb-10">
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-[32px] p-8 sm:p-12 shadow-[0_15px_40px_rgba(37,99,235,0.4)] border border-white/10 relative overflow-hidden group animate-fadeInUp">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
             <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle,rgba(255,255,255,0.1)_0%,transparent_60%)] pointer-events-none"></div>
             <div className="relative z-10 text-center sm:text-left w-full sm:w-auto">
                 <h1 className="text-3xl sm:text-5xl font-extrabold mb-3 flex items-center justify-center sm:justify-start gap-3 tracking-tight">Hola Diverty 👋</h1>
                 <p className="text-blue-100 font-medium text-sm sm:text-base tracking-wide">Gestiona tus reservas, contratos y finanzas al instante.</p>
             </div>
             <div className="w-full sm:w-auto relative z-10 mt-6 sm:mt-0">
                 <button onClick={() => openModal()} className="w-full sm:w-auto py-4 px-8 text-[15px] bg-white text-blue-900 hover:bg-slate-50 font-bold rounded-xl transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] shadow-lg flex items-center justify-center gap-2.5">
                    <Plus size={20} strokeWidth={2.5}/> Nueva Reserva
                 </button>
             </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <AppCard title="Eventos Hoy" icon={Calendar} iconColor="primary"><p className="text-4xl font-extrabold text-white drop-shadow-sm tracking-tight">{stats.eventosHoy.length}</p></AppCard>
              <AppCard title="Ingresos Mes" icon={DollarSign} iconColor="success"><p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-teal-400 drop-shadow-sm tracking-tighter">${stats.ingresosEsteMes.toFixed(0)}</p></AppCard>
              <AppCard title="Clientes Activos" icon={Users} iconColor="warning"><p className="text-4xl font-extrabold text-white drop-shadow-sm tracking-tighter">{clientsList.length}</p></AppCard>
              <AppCard title="Por Cobrar" icon={TrendingUp} iconColor="danger"><p className="text-4xl font-extrabold text-rose-400 drop-shadow-sm tracking-tighter">${stats.deudaTotal.toFixed(0)}</p></AppCard>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
             <button type="button" onClick={() => openModal(null, true)} className="flex-1 bg-white/5 border border-white/5 text-white/90 rounded-xl py-4 font-bold flex items-center justify-center gap-2.5 active:scale-[0.97] hover:-translate-y-0.5 hover:bg-white/10 transition-all duration-200 shadow-sm"><FileText size={20} className="text-amber-400"/> <span className="hidden sm:inline">Cotización Rápida</span></button>
             <button type="button" onClick={() => {utils.triggerHaptic('light'); setIsModoOperativo(true); window.scrollTo(0,0);}} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-4 font-bold flex items-center justify-center gap-2.5 active:scale-[0.97] hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_20px_rgba(37,99,235,0.3)] border border-transparent"><Zap size={20} className="text-amber-300 fill-amber-300"/> <span className="hidden sm:inline">Modo Operativo</span></button>
             <button type="button" onClick={() => { window.location.reload(); }} className="bg-white/5 border border-white/5 text-blue-400 rounded-xl py-4 px-6 flex items-center justify-center active:scale-[0.97] hover:-translate-y-0.5 hover:bg-white/10 transition-all duration-200 shadow-sm"><RefreshCw size={22} className={isSyncing ? "animate-spin" : ""} /></button>
          </div>

          {stats.alertasOperativas.length > 0 && (
            <div className="animate-slideDown mt-10">
               <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-white/50 flex items-center gap-2 mb-5"><AlertTriangle size={16} className="text-rose-400 animate-pulse"/> Urgencias ({stats.alertasOperativas.length})</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                   {stats.alertasOperativas.map((al, i) => {
                      const AlIcon = al.icon;
                      return (
                      <div key={al.id} onClick={() => openModal(al.ev)} className={`p-5 sm:p-6 rounded-[24px] border flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all duration-200 ease-out bg-white/5 hover:border-rose-400/50 border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:shadow-lg animate-fadeInUp hover:bg-white/10`} style={{animationDelay: `${i*100}ms`}}>
                         <div className="flex items-center gap-4"><div className={`p-3.5 rounded-xl ${al.bg} border`}><AlIcon size={24} strokeWidth={2.5}/></div><div className="flex flex-col items-start"><p className={`text-[15px] font-bold text-white/90 leading-tight capitalize`}>{al.text}</p><p className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mt-1.5">{al.tagText}</p></div></div><ChevronRight size={20} className="text-white/30" />
                      </div>
                   )})}
               </div>
            </div>
          )}

          {cotizacionesActivas.length > 0 && (
             <div className="mt-14 pt-10 border-t border-white/5 relative">
                 <h3 className="font-extrabold text-2xl text-white/90 flex items-center gap-3 mb-6 tracking-tight"><FileText className="text-amber-400" size={24} /> Cotizaciones Activas</h3>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     {cotizacionesActivas.map((ev, i) => <EventCardItem key={ev.id} ev={ev} idx={i} todayTime={todayTime} onWhatsApp={sendWhatsAppCall} onViewDoc={handleViewDoc} onEdit={openModal} onDelete={handleDeleteEvento} onDuplicate={handleDuplicateEvento} onMapClick={openGoogleMaps} empresa={appSettings.empresa} utils={utils} />)}
                 </div>
             </div>
          )}

          <div className="mt-14 pt-10 border-t border-white/5 relative">
             <div className="flex justify-between items-center mb-6">
                 <h3 className="font-extrabold text-2xl text-white/90 flex items-center gap-3 tracking-tight"><CalendarDays className="text-blue-400" size={24} /> Próximas Reservas</h3>
                 <button type="button" onClick={() => {utils.triggerHaptic('light'); setActiveTab('eventos')}} className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/50 hover:text-white/90 transition-colors">Ver Todas <ChevronRight size={14} className="inline"/></button>
             </div>
             {proximasReservas.length > 0 ? (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{proximasReservas.map((ev, i) => <EventCardItem key={ev.id} ev={ev} idx={i} todayTime={todayTime} onWhatsApp={sendWhatsAppCall} onViewDoc={handleViewDoc} onEdit={openModal} onDelete={handleDeleteEvento} onDuplicate={handleDuplicateEvento} onMapClick={openGoogleMaps} empresa={appSettings.empresa} utils={utils} />)}</div>
             ) : (
                 <EmptyState icon={CalendarDays} title="Agenda Despejada" message="No tienes reservas programadas para hoy ni mañana. ¡Aprovecha para crear nuevas cotizaciones!" actionBtn={<AppButton onClick={()=>openModal()} variant="primary" icon={Plus} className="mt-4 px-8 py-4">Crear Reserva</AppButton>} />
             )}
          </div>
       </div>
     );
  };

  const renderEventos = () => {
    const renderCalendarGrid = () => {
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
        const days = Array.from({length: daysInMonth}, (_, i) => i + 1);
        const blanks = Array.from({length: firstDayIndex}, (_, i) => i);
        const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        return (
            <div className={`bg-[#0B1221] rounded-[32px] border border-white/5 p-5 sm:p-8 mb-8 animate-fadeIn transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.4)]`}>
               <div className="flex flex-col sm:flex-row justify-between items-center gap-5 mb-8 border-b border-white/5 pb-6">
                   <h3 className="text-2xl font-extrabold text-white/90 capitalize flex items-center gap-3 tracking-tight">
                       <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20"><CalendarDays size={20} className="text-blue-400"/></div>
                       {monthNames[calMonth]} {calYear}
                   </h3>
                   <div className="flex gap-2 bg-[#060B14] p-1.5 rounded-[16px] border border-white/5 w-full sm:w-auto justify-between sm:justify-start shadow-inner">
                       <button type="button" onClick={() => { utils.triggerHaptic('light'); setCalMonth(calMonth === 0 ? 11 : calMonth - 1); setCalYear(calMonth === 0 ? calYear - 1 : calYear); }} className="p-3 hover:bg-white/5 rounded-xl transition-all duration-200 active:scale-[0.95] shadow-sm text-white/50 hover:text-white"><ChevronLeft size={18}/></button>
                       <button type="button" onClick={() => { utils.triggerHaptic('light'); setCalMonth(todayObj.getMonth()); setCalYear(todayObj.getFullYear()); setFilterDate(todayStr); }} className="px-6 py-2 hover:bg-white/5 text-blue-400 font-bold text-xs uppercase tracking-[0.1em] rounded-xl transition-all duration-200 active:scale-[0.95] shadow-sm">HOY</button>
                       <button type="button" onClick={() => { utils.triggerHaptic('light'); setCalMonth(calMonth === 11 ? 0 : calMonth + 1); setCalYear(calMonth === 11 ? calYear + 1 : calYear); }} className="p-3 hover:bg-white/5 rounded-xl transition-all duration-200 active:scale-[0.95] shadow-sm text-white/50 hover:text-white"><ChevronRight size={18}/></button>
                   </div>
               </div>
               <div className="grid grid-cols-7 gap-2 sm:gap-4 text-center mb-4">
                   {weekDays.map(d => <div key={d} className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.1em] text-white/40">{d.substring(0,3)}</div>)}
               </div>
               <div className="grid grid-cols-7 gap-2 sm:gap-4">
                  {blanks.map(b => <div key={`b-${b}`} className="min-h-[70px] sm:min-h-[130px] bg-transparent"></div>)}
                  {days.map(d => {
                     const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; 
                     const dayEvents = eventosActivos.filter(e => e.fecha === dateStr && utils.normalizeText(e.estado) !== 'cotizacion' && utils.normalizeText(e.estado) !== 'cancelado'); 
                     const isToday = dateStr === todayStr; const isSelected = filterDate === dateStr; const hasEvents = dayEvents.length > 0;
                     
                     return (
                         <div key={d} onClick={() => { utils.triggerHaptic('light'); setFilterDate(dateStr); setViewMode(''); }} className={`min-h-[70px] sm:min-h-[130px] p-2 sm:p-3 rounded-[16px] border transition-all duration-200 ease-out cursor-pointer flex flex-col justify-start items-center sm:items-start hover:-translate-y-0.5 active:scale-[0.98] ${isSelected ? 'border-blue-500 bg-blue-500/10 shadow-md' : isToday ? 'bg-rose-500/5 border-rose-500/20' : 'bg-[#060B14]/50 border-white/5 hover:border-white/10'}`}>
                            <p className={`text-xs sm:text-sm font-bold sm:self-end w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg sm:rounded-xl transition-all ${isSelected ? 'bg-blue-600 text-white shadow-md' : isToday ? 'bg-rose-600 text-white shadow-md' : 'text-white/50 bg-white/5 border border-white/5 shadow-sm'}`}>{d}</p>
                            <div className="mt-2 sm:mt-3 flex flex-wrap sm:flex-col gap-1 sm:gap-1.5 w-full justify-center sm:justify-start flex-1 overflow-hidden">
                                {hasEvents && <div className="hidden sm:flex flex-col gap-1.5 w-full">
                                    {dayEvents.slice(0, 2).map((ev, i) => (<div key={i} className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-[8px] truncate bg-white/10 border border-white/5 text-white/90 w-full shadow-sm" title={ev.cliente}>{String(ev.cliente).split(' ')[0]}</div>))}
                                    {dayEvents.length > 2 && <div className="text-[9px] text-blue-400 font-bold uppercase tracking-wider mt-0.5 text-center w-full">+{dayEvents.length - 2}</div>}
                                </div>}
                                {hasEvents && <div className="sm:hidden flex gap-1.5 mt-1 justify-center flex-wrap">
                                    {dayEvents.slice(0, 3).map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-blue-400' : 'bg-white/60'}`}></div>)}
                                    {dayEvents.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-white/30"></div>}
                                </div>}
                            </div>
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
            <div className="mt-8 space-y-10 animate-fadeIn">
                {Object.keys(grouped).sort().map(fecha => (
                    <div key={fecha} className="flex flex-col">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="bg-white/5 text-white/90 px-6 py-3.5 rounded-xl font-bold text-sm flex items-center gap-3 shadow-sm border border-white/5"><CalendarDays size={18} className="text-blue-400" strokeWidth={2.5}/> {fecha ? String(fecha).split('-').reverse().join('/') : 'Sin Fecha'}</div>
                            <div className="flex-1 h-px bg-white/10"></div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{grouped[fecha].map((ev, i) => <EventCardItem key={ev.id} ev={ev} idx={i} todayTime={todayTime} onWhatsApp={sendWhatsAppCall} onViewDoc={handleViewDoc} onEdit={openModal} onDelete={handleDeleteEvento} onDuplicate={handleDuplicateEvento} onMapClick={openGoogleMaps} empresa={appSettings.empresa} utils={utils} />)}</div>
                    </div>
                ))}
            </div>
        );
    };

    const btnClass = (mode) => `px-5 py-3.5 rounded-[14px] text-[10px] uppercase tracking-[0.1em] font-bold transition-all duration-200 ease-out whitespace-nowrap shadow-sm border active:scale-[0.98] ${viewMode===mode&&!filterDate?'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-[0_4px_15px_rgba(37,99,235,0.3)]':'bg-white/5 text-white/60 hover:text-white/90 hover:bg-white/10 border-white/5'}`;

    return (
      <div className="animate-fadeIn p-4 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-8 pb-32 relative">
        <div className="mb-10 flex flex-col gap-4">
            <div className="flex justify-between items-center"><div><h2 className="text-4xl sm:text-5xl font-extrabold text-white/90 tracking-tight drop-shadow-sm">Agenda</h2><p className="text-base font-medium text-white/50 mt-2">Organiza tus eventos con precisión</p></div></div>
            <div className="flex flex-col lg:flex-row gap-5 mt-6">
                 <div className="relative flex-1 group">
                     <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><Search size={20} className="text-white/40 group-focus-within:text-blue-400 transition-colors" /></div>
                     <input type="text" value={globalSearch} onChange={e=>setGlobalSearch(e.target.value)} placeholder="Buscar cliente, lugar, paquete..." className="w-full h-[56px] bg-[#060B14] border border-white/10 rounded-[16px] pl-12 pr-12 text-[15px] font-medium text-white/90 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] placeholder:text-white/30" />
                     {globalSearch && <button type="button" onClick={() => setGlobalSearch('')} className="absolute inset-y-0 right-0 pr-5 flex items-center text-white/40 hover:text-rose-400 transition-colors"><X size={18}/></button>}
                 </div>
                 <div className="flex gap-3 overflow-x-auto scrollbar-hide py-1 items-center">
                     <button type="button" onClick={()=>{setFilterDate(''); setViewMode('hoy')}} className={btnClass('hoy')}>Hoy</button><button type="button" onClick={()=>{setFilterDate(''); setViewMode('semana')}} className={btnClass('semana')}>Semana</button>
                     <button type="button" onClick={()=>{setFilterDate(''); setViewMode('mes')}} className={btnClass('mes')}>Mes</button><button type="button" onClick={()=>{setFilterDate(''); setViewMode('pendientes')}} className={btnClass('pendientes')}>Pendientes</button>
                     <button type="button" onClick={()=>{setFilterDate(''); setViewMode('todas')}} className={btnClass('todas')}>Todas</button>
                     <div className={`flex items-center justify-between px-5 py-3 rounded-[14px] transition-all duration-200 ease-out cursor-text focus-within:border-blue-500/50 bg-white/5 border ${filterDate ? 'border-blue-500/50 text-blue-400 shadow-sm' : 'border-white/5 shadow-sm hover:shadow-md text-white/60'} shrink-0`}>
                         <div className="flex items-center flex-1 relative">
                             <CalendarDays size={18} className={`mr-2.5 transition-colors duration-200`} />
                             <input type="date" value={filterDate} onChange={(e) => { utils.triggerHaptic('light'); setFilterDate(e.target.value); }} className={`bg-transparent text-[11px] uppercase tracking-[0.1em] font-bold outline-none w-full flex-1 cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 absolute inset-0 opacity-0 z-20`} />
                             <span className={`text-[11px] uppercase tracking-[0.1em] font-bold pointer-events-none relative z-10`}>{filterDate ? String(filterDate).split('-').reverse().join('/') : 'Fecha'}</span>
                         </div>
                         {filterDate && <button type="button" onClick={() => {utils.triggerHaptic('light'); setFilterDate('');}} className="text-white/40 hover:text-rose-400 ml-3 z-30 transition-all active:scale-[0.98]"><X size={16}/></button>}
                     </div>
                 </div>
            </div>
        </div>

        <>
            {viewMode === 'mes' && renderCalendarGrid()}
            {(!isDBReady && !globalSearch && !filterDate && eventosActivos.length === 0) ? (<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8"><SkeletonCard /><SkeletonCard /></div>) : agendaFiltrados.length === 0 ? (<EmptyState icon={Search} title="Sin resultados" message="No se encontraron reservas." actionBtn={!!globalSearch || !!filterDate ? <button onClick={()=>{setGlobalSearch(''); setFilterDate(''); setViewMode('todas');}} className="mt-4 text-blue-400 font-bold px-8 py-3.5 rounded-[16px] border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-out shadow-sm uppercase tracking-wider text-xs">Limpiar filtros</button> : null} />) : (!!globalSearch || !!filterDate) ? (<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">{agendaFiltrados.map((ev, i) => <EventCardItem key={ev.id} ev={ev} idx={i} todayTime={todayTime} onWhatsApp={sendWhatsAppCall} onViewDoc={handleViewDoc} onEdit={openModal} onDelete={handleDeleteEvento} onDuplicate={handleDuplicateEvento} onMapClick={openGoogleMaps} empresa={appSettings.empresa} utils={utils} />)}</div>) : ( renderListView() )}
        </>
      </div>
    );
  };

  const renderClientes = () => {
     return (
       <div className="animate-fadeIn p-4 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-8 pb-32">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-4">
              <div><h2 className="text-4xl font-extrabold text-white/90 flex items-center gap-3 tracking-tight drop-shadow-sm"><Users size={36} className="text-blue-500" /> CRM Ventas</h2><p className="text-white/50 text-sm mt-2 font-medium">Fideliza y administra a tus clientes.</p></div>
          </div>
          <div className="grid grid-cols-3 gap-4 md:gap-6 mb-10 animate-fadeInUp">
              <div className="bg-[#0B1221] rounded-[24px] p-5 sm:p-8 border border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex flex-col justify-center transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(59,130,246,0.15)]"><div className="flex items-center gap-2.5 mb-3"><div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-400 border border-blue-500/20"><Users size={18}/></div><span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.1em] text-white/50">Total</span></div><p className="text-3xl sm:text-4xl font-extrabold text-white/90">{clientsList.length}</p></div>
              <div className="bg-[#0B1221] rounded-[24px] p-5 sm:p-8 border border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex flex-col justify-center transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(245,158,11,0.15)]"><div className="flex items-center gap-2.5 mb-3"><div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-400 border border-amber-500/20"><Award size={18}/></div><span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.1em] text-white/50">VIPs</span></div><p className="text-3xl sm:text-4xl font-extrabold text-white/90">{clientsList.filter(c => c.isVIP).length}</p></div>
              <div className="bg-[#0B1221] rounded-[24px] p-5 sm:p-8 border border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex flex-col justify-center transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(244,63,94,0.15)]"><div className="flex items-center gap-2.5 mb-3"><div className="bg-rose-500/10 p-2.5 rounded-xl text-rose-400 border border-rose-500/20"><BellRing size={18}/></div><span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.1em] text-white/50">Retomar</span></div><p className="text-3xl sm:text-4xl font-extrabold text-rose-400">{clientsList.filter(c => c.needsContact).length}</p></div>
          </div>
          {contactCandidates.length > 0 && !searchTerm && (
             <div className="mb-12 animate-slideDown">
                 <h3 className="text-xs font-bold text-white/50 uppercase tracking-[0.1em] mb-5 flex items-center gap-2"><Zap size={18} className="text-amber-400 fill-amber-400"/> Oportunidades de Venta</h3>
                 <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide snap-x">
                    {contactCandidates.map((c, idx) => {
                        const phoneClean = String(c.telefono).replace(/\D/g,''); const msg = `¡Hola ${c.nombre}! 👋 Te saludamos de Diverty Eventos. Ha pasado un tiempo desde tu última fiesta. ¿Tienes alguna celebración próxima? ¡Tenemos nuevas promociones! 🎉`;
                        return (
                           <div key={`contact-${c.nombre}`} className="snap-center shrink-0 w-80 bg-[#0B1221] p-6 rounded-[24px] border border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex flex-col gap-5 animate-fadeInUp" style={{ animationDelay: `${idx * 100}ms` }}>
                              <div><p className="font-extrabold text-white/90 truncate text-xl tracking-tight capitalize">{c.nombre}</p><p className="text-[11px] font-bold text-rose-400 mt-2 uppercase tracking-wider bg-rose-500/10 px-3 py-1.5 rounded-lg w-max border border-rose-500/20 flex items-center gap-1.5"><Clock size={12}/> Sin compras hace {c.daysSince} días</p></div>
                              <button onClick={() => { utils.openWhatsAppBusiness(phoneClean, msg); }} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white py-3.5 rounded-[16px] transition-all duration-200 active:scale-[0.97] hover:-translate-y-0.5 font-bold text-xs uppercase tracking-[0.1em] flex justify-center items-center gap-2 shadow-[0_8px_20px_rgba(16,185,129,0.3)]"><MessageCircle size={18} strokeWidth={2.5}/> Enviar Promo</button>
                           </div>
                        )
                    })}
                 </div>
             </div>
          )}
          <div className="flex flex-col sm:flex-row gap-4">
              <div className={`${GLASS_CARD} p-2 flex-1 flex transition-all duration-200 ease-out`}><div className="flex flex-1 relative group"><Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-blue-400 transition-colors duration-200 ease-out" /><input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar cliente..." className="w-full bg-transparent py-3 pl-14 pr-10 font-semibold outline-none text-[15px] placeholder-white/30 text-white/90" />{searchTerm && (<button type="button" onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-rose-400 p-1.5 rounded-full hover:bg-white/10 transition-all active:scale-[0.98]"><X size={16}/></button>)}</div></div>
              <button onClick={() => setClientSort(clientSort === 'gasto' ? 'recientes' : 'gasto')} className={`${GLASS_CARD} px-8 py-3.5 flex items-center justify-center gap-2.5 font-bold text-xs uppercase tracking-wider transition-all duration-200 active:scale-[0.98] text-white/70 hover:text-blue-400 hover:bg-white/5`}><ArrowDownWideNarrow size={18}/> <span className="hidden sm:inline">Ordenar: </span><span className="text-blue-400">{clientSort === 'gasto' ? 'Mayor Gasto' : 'Recientes'}</span></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
             {sortedFilteredClients.length === 0 ? (<div className="col-span-full"><EmptyState icon={Users} title="Bóveda de Clientes Vacía" message="Registra tu primer evento o ajusta los filtros para ver a tus clientes aquí." actionBtn={null} /></div>) : (
                 sortedFilteredClients.map((c, i) => (
                    <ClientCardItem 
                        key={c.nombre}
                        c={c}
                        idx={i}
                        isExpanded={expandedClientId === c.nombre}
                        onToggleExpand={handleToggleClient}
                        utils={utils}
                        openModal={openModal}
                        onDeleteClient={handleDeleteClient}
                    />
                 ))
             )}
          </div>
       </div>
     );
  };

  const renderFinanzas = () => {
      const cy = new Date(todayTime).getFullYear(), cm = new Date(todayTime).getMonth() + 1;
      
      return (
          <div className="animate-fadeIn p-4 md:p-8 lg:p-10 max-w-5xl mx-auto space-y-8 pb-32">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                 <div><h2 className="text-4xl font-extrabold text-white/90 flex items-center gap-3 tracking-tight drop-shadow-sm">Finanzas</h2><p className="text-white/50 text-sm mt-2 font-medium">Control total de tu flujo de efectivo.</p></div>
                 <div className="flex gap-2 items-center bg-white/5 p-1.5 rounded-[16px] border border-white/5 shadow-inner w-full sm:w-auto">
                    <button type="button" onClick={() => {utils.triggerHaptic('light'); setFinancePeriod('mes');}} className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all duration-200 ease-out active:scale-[0.98] ${financePeriod === 'mes' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.4)]' : 'text-white/50 hover:text-white/90'}`}>Este Mes</button>
                    <button type="button" onClick={() => {utils.triggerHaptic('light'); setFinancePeriod('todos');}} className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all duration-200 ease-out active:scale-[0.98] ${financePeriod === 'todos' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.4)]' : 'text-white/50 hover:text-white/90'}`}>Histórico</button>
                    <div className="w-px h-6 bg-white/10 mx-1"></div>
                    <button type="button" onClick={downloadExcel} className="p-2 sm:px-5 sm:py-3 hover:bg-emerald-500/10 text-emerald-400 rounded-xl transition-all duration-200 ease-out active:scale-[0.98] flex items-center gap-2" title="Exportar a Excel"><Download size={20} strokeWidth={2.5}/> <span className="hidden sm:inline text-[11px] font-bold uppercase tracking-wider">Excel</span></button>
                 </div>
             </div>

             <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 rounded-[32px] p-8 sm:p-12 shadow-[0_15px_40px_rgba(0,0,0,0.4)] relative overflow-hidden border border-white/10 animate-slideDown">
                 <div className="absolute -top-32 -left-32 w-64 h-64 bg-[radial-gradient(circle,rgba(59,130,246,0.15)_0%,transparent_60%)] pointer-events-none transform-gpu"></div>
                 <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-[radial-gradient(circle,rgba(168,85,247,0.15)_0%,transparent_60%)] pointer-events-none transform-gpu"></div>
                 <div className="text-center relative z-10">
                     <p className="text-white/50 font-bold uppercase tracking-[0.1em] text-[11px] mb-4 flex justify-center items-center gap-2"><Star size={16} className="text-amber-400"/> BALANCE NETO {financePeriod === 'mes' ? 'DEL MES' : 'HISTÓRICO'}</p>
                     <h1 className={`text-6xl sm:text-7xl md:text-8xl font-black mb-12 tracking-tighter drop-shadow-md ${finanzasData.bT >= 0 ? 'text-white/90' : 'text-rose-400'}`}>${finanzasData.bT.toFixed(0)}<span className="text-3xl sm:text-4xl text-white/40 opacity-60">.{(finanzasData.bT % 1).toFixed(2).substring(2)}</span></h1>
                     <div className="flex flex-col sm:flex-row justify-center items-center gap-8 sm:gap-16 border-t border-white/10 pt-10 mt-2">
                         <div className="flex items-center gap-4"><div className="bg-emerald-500/10 text-emerald-400 p-3.5 rounded-xl border border-emerald-500/20 shadow-sm"><ArrowUpRight size={24}/></div><div className="text-left"><p className="text-white/50 font-bold text-[10px] uppercase tracking-wider mb-1.5">Ingresos Brutos</p><p className="text-emerald-400 font-extrabold text-2xl leading-none tracking-tight">${finanzasData.tI.toFixed(2)}</p></div></div><div className="hidden sm:block w-px h-12 bg-white/10"></div>
                         <div className="flex items-center gap-4"><div className="bg-rose-500/10 text-rose-400 p-3.5 rounded-xl border border-rose-500/20 shadow-sm"><ArrowDownRight size={24}/></div><div className="text-left"><p className="text-white/50 font-bold text-[10px] uppercase tracking-wider mb-1.5">Gastos Operativos</p><p className="text-rose-400 font-extrabold text-2xl leading-none tracking-tight">-${finanzasData.tG.toFixed(2)}</p></div></div><div className="hidden sm:block w-px h-12 bg-white/10"></div>
                         <div className="flex items-center gap-4"><div className="bg-blue-500/10 text-blue-400 p-3.5 rounded-xl border border-blue-500/20 shadow-sm"><BarChart3 size={24}/></div><div className="text-left"><p className="text-white/50 font-bold text-[10px] uppercase tracking-wider mb-1.5">Margen (ROI)</p><p className="text-blue-400 font-extrabold text-2xl leading-none tracking-tight">{finanzasData.roi}%</p></div></div>
                     </div>
                 </div>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 animate-fadeInUp" style={{animationDelay: '100ms'}}>
                 <div className="bg-[#0B1221] p-6 sm:p-8 rounded-[24px] border border-white/5 shadow-lg flex flex-col justify-center"><p className="text-white/50 font-bold text-[10px] uppercase tracking-wider mb-2.5">Ganancia Hoy</p><p className="text-3xl font-extrabold text-emerald-400 drop-shadow-sm tracking-tight">${animatedGananciaHoy.toFixed(0)}</p></div>
                 <div className="bg-[#0B1221] p-6 sm:p-8 rounded-[24px] border border-white/5 shadow-lg flex flex-col justify-center"><p className="text-white/50 font-bold text-[10px] uppercase tracking-wider mb-2.5">Por Cobrar Total</p><p className="text-3xl font-extrabold text-rose-400 drop-shadow-sm tracking-tight">${finanzasData.deudaTotalGlobal.toFixed(0)}</p></div>
                 <div className="col-span-2 bg-[#0B1221] p-6 sm:p-8 rounded-[24px] border border-white/5 shadow-lg flex items-end justify-between gap-4 h-[120px]">
                     <div className="flex-1 flex justify-between items-end h-full gap-2 sm:gap-3">
                         {chartData.map((d, i) => {
                             const hPercent = (d.value / maxChartVal) * 100;
                             return (
                                <div key={i} className="w-full flex flex-col items-center justify-end h-full gap-1.5 group relative">
                                    <div className="absolute -top-8 bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">${d.value.toFixed(0)}</div>
                                    <div className="w-full bg-blue-500/10 rounded-md relative overflow-hidden transition-all duration-300 ease-out group-hover:bg-blue-400/30 h-[70px]"><div className="absolute bottom-0 w-full bg-blue-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.8)]" style={{height: `${hPercent}%`}}></div></div>
                                    <span className="text-[9px] font-bold uppercase text-white/40 tracking-widest">{String(d.date).split('-')[2]}</span>
                                </div>
                             )
                         })}
                     </div>
                     <div className="pl-6 border-l border-white/10 flex flex-col justify-center h-full"><p className="text-white/50 font-bold text-[10px] uppercase tracking-[0.1em] mb-2 leading-none">Últimos 7 Días</p><p className="text-2xl font-extrabold text-white/90 tracking-tight leading-none">${chartData.reduce((s,d)=>s+d.value,0).toFixed(0)}</p></div>
                 </div>
             </div>

             <div className="bg-[#0B1221] p-6 sm:p-8 rounded-[24px] border border-white/5 shadow-lg animate-fadeInUp" style={{animationDelay: '200ms'}}>
                 <div className="flex justify-between items-end mb-6"><div><h4 className="font-extrabold text-2xl text-white/90 tracking-tight flex items-center gap-3"><Award size={28} className="text-amber-400"/> Meta del Mes Actual</h4><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/50 mt-2">Día {finanzasMes.diasTranscurridos} de {finanzasMes.diasTotales}</p></div><div className="text-right"><span className="text-4xl font-black text-emerald-400 tracking-tight">${finanzasMes.ingresosEsteMesGlobal.toFixed(0)} <span className="text-xl font-bold text-white/30">/ ${appSettings.metaMensual}</span></span></div></div>
                 <div className="w-full bg-[#060B14] rounded-full h-3 mb-5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] overflow-hidden"><AnimatedProgress value={finanzasMes.progresoMeta} /></div>
                 <div className="flex justify-between items-center"><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/70 bg-white/10 px-3.5 py-1.5 rounded-[10px] border border-white/5">{finanzasMes.progresoMeta.toFixed(1)}% Alcanzado</p><p className={`text-[11px] font-bold uppercase tracking-[0.1em] px-3.5 py-1.5 rounded-[10px] border shadow-sm ${finanzasMes.proyeccion >= appSettings.metaMensual ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>Proyectado: ${finanzasMes.proyeccion.toFixed(0)}</p></div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
                <div className="flex flex-col gap-5 animate-fadeInUp" style={{animationDelay: '300ms'}}>
                   <div className="flex justify-between items-center px-2">
                       <h4 className="font-extrabold text-xl text-white/90 flex items-center gap-3 tracking-tight"><Clock size={22} className="text-rose-400"/> Cuentas por Cobrar <span className="text-sm font-bold text-white/40 uppercase tracking-widest">{financePeriod === 'mes' ? '(Mes)' : '(Histórico)'}</span></h4>
                       {evtCalculoBase.filter(e => (utils.safeNum(e.total)-utils.safeNum(e.abono))>0 && utils.normalizeText(e.estado)!=='completado').length > 0 && (<button onClick={handleCopiarCobros} className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 py-2.5 px-5 rounded-[12px] transition-all duration-200 ease-out active:scale-[0.98] border border-blue-500/20 flex items-center gap-2 shadow-sm"><Copy size={16}/> Copiar Lista</button>)}
                   </div>
                   <div className="bg-[#0B1221] rounded-[24px] border border-white/5 shadow-lg overflow-hidden flex flex-col h-[400px]">
                      {evtCalculoBase.filter(e => (utils.safeNum(e.total)-utils.safeNum(e.abono))>0 && utils.normalizeText(e.estado)!=='completado').length === 0 ? (<div className="flex-1 flex flex-col items-center justify-center p-8 opacity-60"><CheckCircle2 size={48} className="text-emerald-400 mb-4"/><p className="text-[11px] font-bold uppercase tracking-wider text-white/60">Excelente. Sin deudas pendientes.</p></div>) : (
                          <div className="overflow-y-auto flex-1 scrollbar-hide p-4 space-y-2">
                              {evtCalculoBase.filter(e => (utils.safeNum(e.total)-utils.safeNum(e.abono))>0 && utils.normalizeText(e.estado)!=='completado').map((ev, i) => (
                                   <div key={ev.id} className="w-full flex justify-between items-center p-5 rounded-[20px] bg-transparent hover:bg-white/5 transition-colors duration-200 border border-transparent hover:border-white/5">
                                        <div className="flex flex-col min-w-0 flex-1 pr-4"><p className="font-extrabold capitalize text-[16px] text-white/90 truncate tracking-tight">{String(ev.cliente || '')}</p><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/40 mt-1.5">{ev.fecha ? String(ev.fecha).split('-').reverse().join('/') : ''}</p></div>
                                        <div className="text-right shrink-0"><span className="text-rose-400 font-extrabold text-2xl block leading-none mb-2.5 tracking-tight">${(utils.safeNum(ev.total) - utils.safeNum(ev.abono)).toFixed(2)}</span><button type="button" onClick={() => sendWhatsAppCall(ev, 'recordatorio', appSettings.empresa)} className="text-[10px] font-bold uppercase tracking-wider text-white/50 hover:text-emerald-400 transition-colors flex items-center justify-end gap-1.5 ml-auto">Cobrar <MessageCircle size={14}/></button></div>
                                   </div>
                              ))}
                          </div>
                      )}
                   </div>
                </div>

                <div className="flex flex-col gap-5 animate-fadeInUp" style={{animationDelay: '400ms'}}>
                   <div className="flex justify-between items-center px-2"><h4 className="font-extrabold text-xl text-white/90 flex items-center gap-3 tracking-tight"><FileSpreadsheet size={22} className="text-emerald-400"/> Transacciones <span className="text-sm font-bold text-white/40 uppercase tracking-widest">{financePeriod === 'mes' ? '(Mes)' : '(Histórico)'}</span></h4></div>
                   <div className="bg-[#0B1221] rounded-[24px] border border-white/5 shadow-lg overflow-hidden flex flex-col h-[400px]">
                      {evtCalculoBase.length === 0 ? (<div className="flex-1 flex flex-col items-center justify-center p-8 opacity-60"><Info size={48} className="text-white/40 mb-4"/><p className="text-[11px] font-bold uppercase tracking-wider text-white/60">No hay movimientos en este periodo.</p></div>) : (
                          <div className="overflow-y-auto flex-1 scrollbar-hide p-4 space-y-2">
                              {evtCalculoBase.map((ev, i) => (
                                 <TransactionItem key={ev.id} ev={ev} isExpanded={expandedFinanceId === ev.id} onToggleExpand={handleToggleFinance} utils={utils} />
                              ))}
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
      <div className="animate-fadeIn p-4 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-6 pb-32">
          
          <div className="mb-8">
              <h2 className="text-4xl sm:text-5xl font-black text-white/90 tracking-tight drop-shadow-sm">Ajustes</h2>
              <p className="text-base font-medium text-white/50 mt-2">Centro de Mando Diverty</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              
              <div className="col-span-1 lg:col-span-2 bg-[#0B1121] rounded-[32px] p-8 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.3)] relative overflow-hidden flex flex-col justify-between border border-white/5 animate-fadeInUp">
                  <div className="absolute -top-32 -right-32 w-64 h-64 bg-[radial-gradient(circle,rgba(59,130,246,0.15)_0%,transparent_60%)] pointer-events-none transform-gpu"></div>
                  <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-[radial-gradient(circle,rgba(99,102,241,0.15)_0%,transparent_60%)] pointer-events-none transform-gpu"></div>
                  
                  <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                       <div className="w-24 h-24 rounded-[24px] bg-gradient-to-tr from-blue-500 to-indigo-500 p-[3px] shadow-xl shrink-0">
                          <img src={LOGO_URL} className="w-full h-full object-contain rounded-[21px] bg-[#060B14] p-3" alt="Diverty Profile" crossOrigin="anonymous"/>
                       </div>
                       <div>
                           <h3 className="text-3xl font-extrabold text-white/90 tracking-tight">Administrador Global</h3>
                           <p className="text-blue-400 text-sm font-bold tracking-[0.1em] uppercase mt-2 flex items-center gap-2.5"><Cloud size={16} className="text-emerald-400"/> Sincronizado</p>
                       </div>
                  </div>

                  <div className="relative z-10 mt-10 flex flex-col sm:flex-row gap-5 border-t border-white/5 pt-8">
                       <button type="button" onClick={activarNotificaciones} className="flex-1 flex items-center justify-center gap-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 py-4 rounded-[16px] transition-all duration-200 border border-blue-500/20 font-bold text-sm active:scale-[0.98] shadow-sm">
                           <BellRing size={20}/> Obtener Token Push
                       </button>
                       <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-2.5 bg-white/5 hover:bg-rose-500/10 text-white/70 hover:text-rose-400 py-4 rounded-[16px] transition-all duration-200 border border-white/5 hover:border-rose-500/20 font-bold text-sm active:scale-[0.98]">
                           <Lock size={20}/> Cerrar Sesión
                       </button>
                  </div>
              </div>

              <div className={`${GLASS_CARD} p-8 sm:p-10 flex flex-col relative overflow-hidden animate-fadeInUp`} style={{animationDelay:'100ms'}}>
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-[radial-gradient(circle,rgba(251,191,36,0.15)_0%,transparent_60%)] pointer-events-none transform-gpu"></div>
                  <h4 className="font-extrabold text-white/90 flex items-center gap-3 mb-6 text-xl tracking-tight relative z-10"><Award size={26} className="text-amber-400"/> Meta Mensual</h4>
                  
                  <div className="relative z-10 flex-1 flex flex-col">
                      <label className="text-[11px] font-bold text-white/50 uppercase tracking-[0.1em] mb-2.5 block">Objetivo de ventas ($)</label>
                      <div className="relative mb-5">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 font-extrabold text-xl">$</span>
                          <input type="number" value={appSettings.metaMensual} onChange={e => updateSettings({...appSettings, metaMensual: utils.safeNum(e.target.value)})} className="w-full bg-[#060B14] border border-white/5 rounded-[16px] py-4 pl-10 pr-5 text-2xl font-extrabold text-white/90 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]" />
                      </div>
                      <p className="text-xs text-white/50 font-medium mt-auto bg-white/5 p-4 rounded-[16px] border border-white/5 leading-relaxed">Al actualizar este valor, las gráficas de rentabilidad se recalcularán automáticamente.</p>
                  </div>
              </div>

              <div className={`col-span-1 lg:col-span-3 ${GLASS_CARD} p-8 sm:p-10 animate-fadeInUp`} style={{animationDelay:'200ms'}}>
                  <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6">
                      <h4 className="font-extrabold text-2xl text-white/90 flex items-center gap-3 tracking-tight"><Briefcase size={28} className="text-blue-400"/> Facturación y Banco</h4>
                      <div className="bg-blue-500/10 text-blue-400 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.1em] border border-blue-500/20 flex items-center gap-2"><Save size={14}/> Autoguardado</div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {[
                          { key: 'nombreTitular', label: 'Nombre del Titular o Empresa' },
                          { key: 'ruc', label: 'RUC / Identificación' },
                          { key: 'banco', label: 'Entidad Bancaria' },
                          { key: 'tipoCuenta', label: 'Tipo de Cuenta' },
                          { key: 'numeroCuenta', label: 'Número de Cuenta' },
                          { key: 'telefono', label: 'Teléfono (Yappy / Contacto)' },
                      ].map((field) => (
                          <div key={field.key}>
                              <label className="block text-[11px] uppercase text-white/50 font-bold tracking-[0.1em] mb-2.5">{field.label}</label>
                              <input type="text" value={appSettings.empresa[field.key]} onChange={e => updateSettings({...appSettings, empresa: {...appSettings.empresa, [field.key]: e.target.value}})} className={inputClass} />
                          </div>
                      ))}
                  </div>
                  <div className="mt-8 bg-white/5 p-5 rounded-[16px] border border-white/5 flex items-start gap-4">
                      <Info size={20} className="text-white/40 shrink-0 mt-0.5"/>
                      <p className="text-xs font-medium text-white/60 leading-relaxed">Estos datos se insertarán automáticamente en todos los PDFs de contratos, facturas y en los mensajes de WhatsApp que envíes a tus clientes.</p>
                  </div>
              </div>

              <div className="col-span-1 lg:col-span-3 bg-rose-500/5 border border-dashed border-rose-500/30 rounded-[32px] p-8 sm:p-10 mt-4 animate-fadeInUp flex flex-col sm:flex-row items-center justify-between gap-6 transition-all duration-300 hover:bg-rose-500/10" style={{animationDelay:'300ms'}}>
                  <div>
                      <h4 className="font-extrabold text-rose-400 text-2xl flex items-center gap-3 tracking-tight"><AlertTriangle size={28}/> Zona de Peligro</h4>
                      <p className="text-[15px] font-medium text-rose-300/70 mt-3 max-w-xl leading-relaxed">Esta acción purgará toda la base de datos local y en la nube. Se eliminarán todas las reservas, el historial de clientes y los registros financieros de forma permanente.</p>
                  </div>
                  <button onClick={handleWipeAll} className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 text-white font-bold py-5 px-8 rounded-[16px] shadow-[0_8px_20px_rgba(225,29,72,0.3)] transition-all duration-200 active:scale-[0.97] whitespace-nowrap uppercase tracking-[0.1em] text-[13px] flex items-center justify-center gap-3 border border-transparent">
                      <Trash2 size={20}/> Purgar Sistema
                  </button>
              </div>
          </div>
      </div>
    );
  };

  if (isPrinting && printData) {
    const isC = printType === 'cotizacion';
    const isFact = printType === 'factura';
    const tot = utils.safeNum(printData.total);
    const trn = utils.safeNum(printData.transporte);
    const abo = utils.safeNum(printData.abono);
    const sub = (tot - trn).toFixed(2);
    const cli = String(printData.cliente||'');
    const tel = String(printData.telefono||'');
    const emailStr = String(printData.email||'');
    const rucStr = String(printData.ruc||'');
    const ubi = String(printData.ubicacion||'');
    const dir = String(printData.direccion||'');
    const fechaDoc = String(printData.fecha||'').split('-').reverse().join('/');
    const horaStr = utils.formatTime12h(printData.hora);
    const sA = printData.serviciosSeleccionados?.length > 0 ? printData.serviciosSeleccionados : [{ nombre: String(printData.servicio||'Servicio'), precio: sub, cantidad: 1, descripcion: String(printData.comentarios||'') }];
    const idx = [...eventosActivos].sort((a,b)=>new Date(a.createdAt||0).getTime()-new Date(b.createdAt||0).getTime()).findIndex(ev=>ev.id===printData.id);
    const numRef = isC ? `COT-${String(idx!==-1?idx+1:1).padStart(5,'0')}` : `FAC-${String(idx!==-1?idx+1:1).padStart(5,'0')}`;
    const servicioLimpioContrato = sA.map(s => { const cant = Number(s.cantidad) || 1; return cant > 1 ? `${cant}x ${String(s.nombre)}` : String(s.nombre); }).join(' + ');
    const docTitle = isC ? 'COTIZACIÓN' : (isFact ? 'FACTURA' : 'CONTRATO DE SERVICIOS');

    const renderSVGBackgrounds = () => (
      <>
         <svg className="absolute top-0 left-0 w-[400px] h-[300px] pointer-events-none z-0" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 0H400C400 0 350 150 0 250V0Z" fill="url(#paint0_linear)"/><path d="M0 0H300C300 0 250 100 0 180V0Z" fill="url(#paint1_linear)"/><defs><linearGradient id="paint0_linear" x1="0" y1="0" x2="400" y2="250" gradientUnits="userSpaceOnUse"><stop stopColor="#6366F1" stopOpacity="0.2"/><stop offset="1" stopColor="#A855F7" stopOpacity="0.1"/></linearGradient><linearGradient id="paint1_linear" x1="0" y1="0" x2="300" y2="180" gradientUnits="userSpaceOnUse"><stop stopColor="#4F46E5" stopOpacity="0.8"/><stop offset="1" stopColor="#9333EA" stopOpacity="0.8"/></linearGradient></defs></svg>
         <svg className="absolute bottom-0 right-0 w-[400px] h-[300px] pointer-events-none z-0" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M400 300H0C0 300 50 150 400 50V300Z" fill="url(#paint2_linear)"/><path d="M400 300H100C100 300 150 200 400 120V300Z" fill="url(#paint3_linear)"/><defs><linearGradient id="paint2_linear" x1="400" y1="300" x2="0" y2="50" gradientUnits="userSpaceOnUse"><stop stopColor="#A855F7" stopOpacity="0.2"/><stop offset="1" stopColor="#6366F1" stopOpacity="0.1"/></linearGradient><linearGradient id="paint3_linear" x1="400" y1="300" x2="100" y2="120" gradientUnits="userSpaceOnUse"><stop stopColor="#9333EA" stopOpacity="0.8"/><stop offset="1" stopColor="#4F46E5" stopOpacity="0.8"/></linearGradient></defs></svg>
         <div className="absolute top-12 right-12 w-48 h-48 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(#4F46E5 2px, transparent 2px)', backgroundSize: '16px 16px' }}></div>
         <div className="absolute bottom-12 left-12 w-48 h-48 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(#4F46E5 2px, transparent 2px)', backgroundSize: '16px 16px' }}></div>
      </>
    );

    return (
      <div className="bg-slate-50 min-h-screen text-slate-900 flex flex-col font-sans overflow-x-hidden animate-fadeIn relative">
        <style>{`@media print{body *{visibility:hidden;}#pdf-wrapper-scaler,#pdf-wrapper-scaler *{visibility:visible;}#pdf-wrapper-scaler{position:absolute;left:0;top:0;width:100%;transform:scale(1)!important;margin:0;}.print\\:hidden{display:none!important;}@page{size:auto;margin:0mm;}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}}.avoid-break{page-break-inside:avoid;break-inside:avoid;}`}</style>
        <div className="sticky top-0 bg-slate-900/90 backdrop-blur-md shadow-lg flex flex-col sm:flex-row justify-between items-center z-50 print:hidden border-b border-slate-800 p-4 gap-4">
          <button type="button" onClick={() => setIsPrinting(false)} className="text-white flex items-center font-bold hover:text-indigo-400 self-start sm:self-auto"><X size={20} className="mr-1"/> Atrás</button>
          <div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto">
             <button type="button" onClick={printNativePDF} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl font-bold flex items-center shadow-lg text-sm mr-2 transition-all active:scale-95"><Printer size={16} className="mr-2"/> Imprimir PDF</button>
             <button type="button" onClick={handleSharePDF} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-xl font-bold flex items-center shadow-lg text-sm"><Share2 size={16} className="mr-2"/> Compartir</button>
             <button type="button" onClick={downloadPDF} className="bg-violet-500 hover:bg-violet-600 text-white px-3 py-2 rounded-xl font-bold flex items-center shadow-lg text-sm ml-2"><Download size={16} className="mr-2"/> Guardar</button>
          </div>
        </div>
        <div className="w-full flex-1 flex justify-center pb-12 overflow-hidden pt-8 bg-slate-50">
          <div id="pdf-wrapper-scaler" style={{ transform: `scale(${pdfScale})`, transformOrigin: 'top center', width: '800px' }}>
              <div id="pdf-content" className="bg-[#F9FAFB] w-[800px] min-h-[1131px] h-auto relative overflow-hidden font-sans text-[#111827] p-12 flex flex-col shadow-2xl">
                 {renderSVGBackgrounds()}
                 
                 <div className="flex flex-col mb-10 relative z-10">
                     <div className="flex justify-between items-start w-full">
                         <div><img src={LOGO_URL} alt="Diverty Eventos" className="h-16 object-contain drop-shadow-md" crossOrigin="anonymous" /></div>
                         <div className="text-right"><p className="text-sm text-[#6B7280] mt-1 font-medium tracking-wide">Ref: {numRef} &nbsp;|&nbsp; Fecha: {fechaDoc}</p></div>
                     </div>
                     <h1 className="text-[28px] font-black text-transparent bg-clip-text bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] tracking-widest uppercase text-center mt-6">{docTitle}</h1>
                     <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#4F46E5]/40 to-transparent mt-6"></div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-8 mb-12 relative z-10">
                    <div className="bg-white p-6 rounded-xl border border-[#4F46E5]/10 shadow-sm">
                        <h3 className="text-[11px] font-bold text-[#4F46E5] uppercase tracking-widest mb-4 border-b border-gray-100 pb-3 flex items-center gap-2"><Users size={16}/> Datos del Cliente</h3>
                        <div className="space-y-3 text-[13px] font-medium text-[#6B7280]">
                            <div className="flex justify-between"><span>Nombre:</span> <span className="text-[#111827] font-bold capitalize text-right">{cli}</span></div>
                            <div className="flex justify-between"><span>Teléfono:</span> <span className="text-[#111827] text-right">{tel}</span></div>
                            {emailStr && <div className="flex justify-between"><span>Email:</span> <span className="text-[#111827] text-right truncate w-40">{emailStr}</span></div>}
                            {rucStr && <div className="flex justify-between"><span>RUC:</span> <span className="text-[#111827] text-right">{rucStr}</span></div>}
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-xl border border-[#4F46E5]/10 shadow-sm">
                        <h3 className="text-[11px] font-bold text-[#4F46E5] uppercase tracking-widest mb-4 border-b border-gray-100 pb-3 flex items-center gap-2"><MapPin size={16}/> Detalles del Evento</h3>
                        <div className="space-y-3 text-[13px] font-medium text-[#6B7280]">
                            <div className="flex justify-between"><span>Fecha:</span> <span className="text-[#111827] font-bold text-right">{fechaDoc}</span></div>
                            <div className="flex justify-between"><span>Horario:</span> <span className="text-[#111827] text-right">{horaStr}</span></div>
                            <div className="flex justify-between"><span>Lugar:</span> <span className="text-[#111827] capitalize text-right truncate w-40">{ubi}</span></div>
                            {dir && <div className="text-xs italic text-right mt-1 line-clamp-2">{dir}</div>}
                        </div>
                    </div>
                 </div>
                 
                 {isFact || isC ? (
                    <>
                         <div className="mb-6 flex-1 relative z-10">
                            <div className="border border-[#4F46E5]/20 rounded-xl overflow-hidden shadow-sm bg-white">
                                 <table className="w-full text-left text-[13px]">
                                     <thead className="bg-[#F9FAFB] border-b border-[#4F46E5]/10 text-[#4F46E5]">
                                         <tr>
                                             <th className="py-4 px-6 font-bold uppercase text-center tracking-widest w-1/3 text-[11px]">Artículo</th>
                                             <th className="py-4 px-6 font-bold uppercase tracking-widest text-center border-l border-gray-100 w-1/2 text-[11px]">Descripción</th>
                                             <th className="py-4 px-6 font-bold uppercase text-center tracking-widest border-l border-gray-100 w-1/6 text-[11px]">Total</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-gray-100">
                                         {sA.map((s, i) => {
                                             const cant = Number(s.cantidad) || 1;
                                             const precioUnitario = utils.safeNum(s.precio) / cant;
                                             const descLines = String(s.descripcion || 'Servicio de animación para eventos').split('\n');
                                             return (
                                             <tr key={i} className="avoid-break hover:bg-gray-50 transition-colors">
                                                 <td className="py-6 px-6 text-center border-r border-gray-100 align-top">
                                                     <div className="flex justify-center mb-3 text-[#4F46E5]"><Star size={28} strokeWidth={1.5}/></div>
                                                     <p className="font-bold text-[#111827] text-[14px] leading-tight">{String(s.nombre)}</p>
                                                     {cant > 1 && <p className="font-semibold text-[#7C3AED] text-[12px] mt-1.5 bg-[#7C3AED]/10 py-1 rounded-md inline-block px-3">- {cant} Horas -</p>}
                                                     <p className="text-[10px] text-[#6B7280] font-medium mt-2 tracking-wide uppercase">Animación Infantil</p>
                                                 </td>
                                                 <td className="py-6 px-8 border-r border-gray-100 align-top">
                                                     <div className="text-[#6B7280] text-[12px] leading-relaxed space-y-2">
                                                         {descLines.map((line, j) => {
                                                             const tLine = String(line).trim();
                                                             if(tLine.startsWith('•') || tLine.startsWith('-')) return <div key={j} className="flex items-start gap-2.5 font-medium"><CheckCircle2 size={14} className="text-[#4F46E5] shrink-0 mt-[2px]"/> <span className="text-[#374151]">{tLine.replace(/^[•-]\s*/, '')}</span></div>;
                                                             return <div key={j} className="mb-2">{tLine}</div>;
                                                         })}
                                                     </div>
                                                 </td>
                                                 <td className="py-6 px-6 text-center align-middle">
                                                     <p className="font-black text-[#111827] text-[18px]">B/. {utils.safeNum(s.precio).toFixed(2)}</p>
                                                     <p className="text-[10px] text-[#6B7280] mt-1.5 font-medium">{cant.toFixed(2)} x B/. {precioUnitario.toFixed(2)}</p>
                                                 </td>
                                             </tr>
                                         )})}
                                         {trn > 0 && (
                                             <tr className="avoid-break hover:bg-gray-50 transition-colors">
                                                 <td className="py-6 px-6 text-center border-r border-gray-100 align-middle">
                                                     <div className="flex justify-center mb-3 text-[#4F46E5]"><MapIcon size={28} strokeWidth={1.5}/></div>
                                                     <p className="font-bold text-[#111827] text-[14px]">Transporte</p>
                                                     <p className="text-[10px] text-[#6B7280] font-medium mt-2 tracking-wide uppercase">Logística</p>
                                                 </td>
                                                 <td className="py-6 px-8 border-r border-gray-100 align-middle text-[12px] text-[#374151] leading-relaxed font-medium">
                                                     <div className="flex items-start gap-2.5"><CheckCircle2 size={14} className="text-[#4F46E5] shrink-0 mt-[2px]"/> <span>Cargo por viáticos a zona: {ubi}</span></div>
                                                 </td>
                                                 <td className="py-6 px-6 text-center align-middle">
                                                     <p className="font-black text-[#111827] text-[18px]">B/. {trn.toFixed(2)}</p>
                                                 </td>
                                             </tr>
                                         )}
                                     </tbody>
                                 </table>
                            </div>
                         </div>

                         <div className="px-0 mt-4 flex justify-between items-start gap-8 avoid-break relative z-10">
                             <div className="w-[50%]">
                                 <div className="bg-white p-5 rounded-xl border border-[#4F46E5]/10 shadow-sm h-full">
                                     <div className="flex items-center gap-2 mb-3 text-[#4F46E5] border-b border-gray-100 pb-3">
                                         <FileText size={18}/>
                                         <h3 className="font-bold uppercase tracking-widest text-[11px]">Notas Importantes</h3>
                                     </div>
                                     <div className="text-[11px] font-medium text-[#6B7280] leading-relaxed space-y-2">
                                         <p>Gracias por confiar en Diverty Eventos Panamá.</p>
                                         <p>El saldo pendiente debe ser cancelado antes o al finalizar el evento.</p>
                                         <p>Para pagos aceptamos: Yappy, Transferencia Bancaria o Efectivo.</p>
                                     </div>
                                 </div>
                             </div>
                             <div className="w-[45%] flex flex-col items-end">
                                 <div className="w-full border border-[#4F46E5]/10 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
                                     <div className="flex justify-between items-center py-3.5 px-6 border-b border-gray-100 text-[13px]">
                                         <span className="font-semibold text-[#6B7280]">Subtotal:</span>
                                         <span className="font-bold text-[#111827]">B/. {tot.toFixed(2)}</span>
                                     </div>
                                     {!isC && abo > 0 && (
                                     <div className="flex justify-between items-center py-3.5 px-6 border-b border-gray-100 text-[13px] bg-emerald-50/50">
                                         <span className="font-semibold text-[#6B7280]">Abono:</span>
                                         <span className="font-bold text-emerald-600">- B/. {abo.toFixed(2)}</span>
                                     </div>
                                     )}
                                     <div className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white py-6 px-6 text-center">
                                         <span className="block text-[11px] uppercase tracking-widest font-semibold mb-1 opacity-90">{isC ? 'Total Estimado:' : 'Total Pendiente:'}</span>
                                         <span className="block text-[36px] font-black leading-none pb-1">B/. {isC ? tot.toFixed(2) : (tot - abo).toFixed(2)}</span>
                                     </div>
                                 </div>
                             </div>
                         </div>

                         <div className="mt-8 pb-4 avoid-break relative z-10">
                             <div className="bg-white rounded-xl border border-[#4F46E5]/10 p-6 flex justify-between items-stretch text-[11px] shadow-sm">
                                 <div className="flex gap-4 w-[35%] border-r border-gray-100 pr-4">
                                     <div className="text-[#4F46E5] shrink-0 mt-1"><Briefcase size={20}/></div>
                                     <div className="leading-snug space-y-1.5">
                                         <h4 className="font-bold text-[#111827] uppercase tracking-widest mb-2 text-[10px]">Métodos de Pago</h4>
                                         <p className="font-semibold text-[#111827]">Yappy: <span className="font-medium text-[#6B7280]">{appSettings.empresa.telefono}</span></p>
                                         <p className="font-medium text-[#6B7280]">{appSettings.empresa.banco} - {appSettings.empresa.tipoCuenta}</p>
                                         <p className="font-semibold text-[#111827]">Nº: <span className="font-medium text-[#6B7280]">{appSettings.empresa.numeroCuenta}</span></p>
                                         <p className="font-semibold text-[#111827]">Titular: <span className="font-medium text-[#6B7280] uppercase">{appSettings.empresa.nombreTitular}</span></p>
                                     </div>
                                 </div>
                                 <div className="flex gap-4 w-[35%] border-r border-gray-100 px-6">
                                     <div className="text-[#4F46E5] shrink-0 mt-1"><CheckCircle2 size={20}/></div>
                                     <div className="leading-snug">
                                         <h4 className="font-bold text-[#111827] uppercase tracking-widest mb-2 text-[10px]">Garantía de Servicio</h4>
                                         <p className="font-medium text-[#6B7280] leading-relaxed text-[11px]">Nuestro compromiso es brindarte la mejor experiencia. Si tienes alguna duda o cambio, contáctanos con tiempo.</p>
                                     </div>
                                 </div>
                                 <div className="flex flex-col items-center justify-center w-[30%] pl-6">
                                     <div className="text-[#4F46E5] flex items-center gap-2 mb-2 font-bold text-[12px] uppercase tracking-widest"><Award size={18}/> ¡Gracias!</div>
                                     <h3 className="text-2xl text-[#111827]" style={{fontFamily: "'Brush Script MT', 'Dancing Script', cursive, serif", fontStyle: "italic"}}>Diverty Eventos</h3>
                                     <p className="text-[#6B7280] font-medium text-[10px] mt-1.5 text-center tracking-wide uppercase">Diversión que crea recuerdos</p>
                                 </div>
                             </div>
                         </div>
                    </>
                 ) : (
                    <>
                         <div className="mb-10 relative z-10">
                             <h3 className="text-[11px] font-bold text-[#4F46E5] uppercase tracking-widest mb-5 flex items-center gap-2 justify-center"><Sparkles size={16}/> Servicios Contratados</h3>
                             <div className="bg-[#F3F4F6] px-8 py-5 rounded-full border border-gray-200 shadow-sm text-center">
                                 <p className="text-[14px] text-[#111827] font-semibold leading-relaxed capitalize">{servicioLimpioContrato}</p>
                             </div>
                         </div>
                         
                         <div className="mb-10 flex-1 relative z-10">
                             <h3 className="text-[11px] font-bold text-[#4F46E5] uppercase tracking-widest mb-6 border-b border-gray-200 pb-3 flex items-center gap-2"><FileSignature size={16}/> Términos y Condiciones</h3>
                             <div className="text-[13px] text-[#6B7280] space-y-8 leading-loose text-justify">
                                 <div><span className="font-bold text-[#4F46E5] block mb-1">1. OBLIGACIONES DEL SERVICIO:</span><p className="mt-1 text-[#6B7280]">Diverty Eventos se compromete a cumplir con puntualidad y profesionalismo el servicio detallado. El Cliente deberá proporcionar un espacio adecuado y seguro para la realización de las actividades. Finalizado el contrato si el cliente desea adicionar tiempo tendrá un costo adicional.</p></div>
                                 <div><span className="font-bold text-[#4F46E5] block mb-1">2. CONDICIONES DE PAGO:</span><div className="mt-1 text-[#6B7280]">{abo > 0 ? (<p>El Cliente acuerda pagar un valor total de B/. <span className="font-bold text-[#111827]">{tot.toFixed(2)}</span>, del cual ha entregado un anticipo de B/. <span className="font-bold text-[#111827]">{abo.toFixed(2)}</span>. El saldo pendiente de B/. <span className="font-bold text-[#111827] underline">{(tot - abo).toFixed(2)}</span> deberá ser cancelado antes o al finalizar el evento mediante YAPPY, TRANSFERENCIA BANCARIA O EFECTIVO. El anticipo no es reembolsable en caso de cancelación.</p>) : (<p>El Cliente acuerda pagar el valor total de B/. <span className="font-bold text-[#111827] underline">{tot.toFixed(2)}</span> al finalizar el evento mediante YAPPY, TRANSFERENCIA BANCARIA O EFECTIVO.</p>)}</div></div>
                                 <div><span className="font-bold text-[#4F46E5] block mb-1">3. CANCELACIONES Y POLÍTICAS:</span><p className="mt-1 text-[#6B7280]">Cualquier modificación debe ser comunicada con un mínimo de (3) días de anticipación. En caso de posponer el evento por fuerza mayor, el cliente podrá reprogramar según disponibilidad. Diverty Eventos no se responsabiliza por incidentes ajenos a su control durante el evento.</p></div>
                                 <div><span className="font-bold text-[#4F46E5] block mb-1">4. DERECHOS DE IMAGEN:</span><p className="mt-1 text-[#6B7280]">Al firmar este contrato, el cliente autoriza el uso de imágenes o videos del evento con fines estrictamente promocionales para la empresa, salvo notificación previa en contrario.</p></div>
                             </div>
                         </div>
                         
                         <div className="mt-auto pt-16 flex justify-between items-end pb-8 px-12 avoid-break relative z-10">
                             <div className="w-[40%] text-center">
                                 <div className="border-t border-gray-300 pt-4">
                                     <p className="font-semibold text-[13px] text-[#111827] uppercase truncate tracking-wide">{cli}</p>
                                     <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-[0.2em] mt-1.5">Firma del Cliente</p>
                                 </div>
                             </div>
                             <div className="w-[40%] text-center">
                                 <div className="border-t border-gray-300 pt-4">
                                     <p className="font-semibold text-[13px] text-[#111827] uppercase truncate tracking-wide">{appSettings.empresa.nombreTitular}</p>
                                     <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-[0.2em] mt-1.5">Diverty Eventos Panamá</p>
                                 </div>
                             </div>
                         </div>
                    </>
                 )}
              </div>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthLoading) return (
      <div className="font-outfit min-h-[100dvh] flex flex-col items-center justify-center bg-[#060B14]">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-white/50 text-sm font-bold uppercase tracking-widest animate-pulse">Iniciando</p>
      </div>
  );

  if (!isAuthenticated) return (
    <div className="font-outfit min-h-[100dvh] flex items-center justify-center p-4 relative overflow-hidden bg-[#060B14]">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(37,99,235,0.15)_0%,transparent_60%)] pointer-events-none transform-gpu"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(79,70,229,0.15)_0%,transparent_60%)] pointer-events-none transform-gpu"></div>
      
      <div className="w-full max-w-sm bg-[#0B1221] rounded-[24px] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 relative z-10 animate-fadeInUp">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-[20px] bg-gradient-to-tr from-blue-600 to-indigo-500 p-[2px] shadow-lg hover:scale-[1.02] transition-transform duration-200 ease-out">
            <div className="w-full h-full bg-[#060B14] rounded-[18px] flex items-center justify-center">
              <ShieldCheck size={32} className="text-white" strokeWidth={1.5} />
            </div>
          </div>
        </div>
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-white/90 mb-2 tracking-tight">Acceso Seguro</h1>
          <p className="text-white/50 font-medium text-sm">Autenticación por Firebase</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative group">
            <input type="email" required value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className={`${inputClass} text-white/90 placeholder:text-white/30 font-medium`} placeholder="Correo Electrónico" />
          </div>
          <div className="relative group">
            <input type="password" required value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className={`${inputClass} text-white/90 placeholder:text-white/30 font-extrabold tracking-[0.2em] placeholder:tracking-normal placeholder:font-medium`} placeholder="Contraseña" />
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-lg py-4 rounded-xl shadow-[0_4px_15px_rgba(37,99,235,0.3)] transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-2 mt-4">Ingresar <ChevronRight size={20} strokeWidth={3} /></button>
        </form>
      </div>
    </div>
  );

  return (
    <div className={`font-outfit min-h-[100dvh] flex overflow-hidden selection:bg-blue-500/30 transition-colors duration-200 relative bg-[#060B14] text-slate-100`}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap'); .font-outfit{font-family:'Outfit',sans-serif;} @keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}} .animate-fadeIn{animation:fadeIn 0.2s ease-out forwards;} .animate-slideUp{animation:slideUp 0.3s cubic-bezier(0.16,1,0.3,1) forwards;} ::-webkit-scrollbar{display:none;} input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}`}</style>
      <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-[radial-gradient(circle,rgba(37,99,235,0.08)_0%,transparent_60%)] pointer-events-none transform-gpu"></div>
      
      {toastAlert.isOpen && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100000] w-[90%] max-w-sm animate-fadeIn"><div className={`px-5 py-4 rounded-2xl shadow-xl flex items-center gap-3 border text-white ${toastAlert.success ? 'bg-emerald-500 border-emerald-400/50' : 'bg-rose-500 border-rose-400/50'}`}>{toastAlert.success ? <CheckCircle2 size={24}/> : <AlertTriangle size={24}/>}<p className="font-bold text-sm tracking-wide">{toastAlert.message}</p></div></div>}
      
      {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100000] bg-black/70 flex items-center justify-center p-4 animate-fadeIn overscroll-none">
              <div className={`${modalSectionClass} max-w-md w-full text-center border-rose-500/30 p-8`}>
                  <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
                      <AlertTriangle size={32} className="text-rose-400" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-white/90 mb-3 tracking-tight">¿Estás seguro?</h3>
                  <p className="text-white/50 font-medium mb-8 leading-relaxed">{confirmModal.message}</p>
                  <div className="flex gap-4">
                      <button onClick={() => setConfirmModal({ isOpen: false, message: '', onConfirm: null })} className="flex-1 py-3.5 rounded-xl font-bold uppercase tracking-wider text-white/70 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all duration-200">Cancelar</button>
                      <button onClick={() => { if (confirmModal.onConfirm) confirmModal.onConfirm(); setConfirmModal({ isOpen: false, message: '', onConfirm: null }); }} className="flex-1 py-3.5 rounded-xl font-bold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-500 shadow-[0_4px_15px_rgba(225,29,72,0.3)] active:scale-[0.98] transition-all duration-200">Confirmar</button>
                  </div>
              </div>
          </div>
      )}

      <EventFormModal 
        isOpen={modalConfig.isOpen}
        initialData={modalConfig.initialData} 
        isCotizacionMode={modalConfig.isCotizacion} 
        onClose={closeModal} 
        onSave={handleSaveFromModal} 
        PAQUETES={PAQUETES_DIVERTY} 
        onAddCustomService={handleAddCustomService}
        showAlert={showAlert}
      />

      {isSidebarOpen && (<div className="fixed inset-0 bg-black/70 z-[9998] md:hidden animate-fadeIn overscroll-none" onClick={() => setIsSidebarOpen(false)} />)}

      <aside className={`fixed md:relative top-0 left-0 h-[100dvh] w-[260px] shrink-0 bg-[#0B1221] border-r border-white/5 text-white flex flex-col z-[9999] transform transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} shadow-2xl md:shadow-none overscroll-none`}>
         <div className="p-8 flex items-center justify-between gap-4 border-b border-white/5"><div className="flex items-center gap-4"><div className="bg-[#060B14] p-2 rounded-xl border border-white/10 shadow-inner"><img src={LOGO_URL} alt="Logo" className="h-8 w-8 object-contain" /></div><div><h1 className="text-2xl font-extrabold tracking-tight text-white/90">Diverty</h1></div></div><button className="md:hidden text-white/40 hover:text-white transition-colors" onClick={() => setIsSidebarOpen(false)}><X size={24} /></button></div>
         <nav className="flex-1 flex flex-col px-4 py-6 gap-3 overflow-y-auto">{NAV_ITEMS.map(t => { const Icon = t.icon; return (<button key={t.id} onClick={() => { setActiveTab(t.id); setIsSidebarOpen(false); }} className={`flex items-center gap-4 w-full px-5 py-4 rounded-xl font-bold transition-all duration-200 ${activeTab === t.id ? 'bg-blue-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.3)]' : 'text-white/50 hover:bg-white/5 hover:text-white/90'}`}><Icon size={20}/> <span className="tracking-wide">{t.text}</span></button>); })}</nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative z-10 h-[100dvh] overflow-hidden">
          <header className="md:hidden bg-[#0B1221] border-b border-white/5 p-4 flex justify-between items-center z-40 sticky top-0 shadow-sm"><div className="flex items-center gap-3"><div className="bg-[#060B14] p-1.5 rounded-xl border border-white/10 shadow-inner"><img src={LOGO_URL} alt="Logo" className="h-6 w-6 object-contain" /></div><h1 className="text-xl font-extrabold text-white/90 tracking-tight">Diverty CRM</h1></div><button onClick={() => setIsSidebarOpen(true)} className="p-2 text-white/50 hover:text-white transition-colors"><Menu size={24} /></button></header>
          <main className="flex-1 overflow-y-auto scroll-smooth pb-10 overscroll-y-none">
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
