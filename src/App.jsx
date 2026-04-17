// ==========================================
// 1. CONFIGURACIÓN E IMPORTACIONES
// ==========================================
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Calendar, Users, Settings, Plus, Edit, Trash2, X, FileSignature, Clock, MapPin, Info, Download, Loader2, Receipt, MessageCircle, RefreshCw, AlertTriangle, CheckCircle2, Cloud, Search, CalendarDays, ChevronRight, ChevronLeft, Star, BellRing, TrendingUp, DollarSign, Briefcase, Lock, Smartphone, FileText, Check, Sparkles, Map as MapIcon, Navigation, Zap, PieChart, ChevronDown, Moon, Sun, Award, FileSpreadsheet, Copy, MessageSquareText, Printer, Home, Columns, Menu } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = { apiKey: "AIzaSyDxE2E1KMuZU523k8oWHabi1jDrFxPOD-0", authDomain: "diverty-eventos.firebaseapp.com", projectId: "diverty-eventos", storageBucket: "diverty-eventos.firebasestorage.app", messagingSenderId: "491130670516", appId: "1:491130670516:web:8c80abd09ccc92c194f6e1" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = "diverty-oficial";

// ==========================================
// 2. CONSTANTES DE NEGOCIO
// ==========================================
const ADMIN_PASS = 'Diverty2026';
const sheetUrl = 'https://docs.google.com/spreadsheets/d/1dvIWaYZQte_IU9JsBZLnLEmKYVxfO9An1XjpRuIHD5g/edit?usp=drivesdk';
const LOGO_URL = 'https://i.postimg.cc/GhFd4tcm/1000047880.png';
const META_MENSUAL = 1500; 

const THEME = {
  primary: "bg-violet-600",
  success: "bg-emerald-500",
  danger: "bg-rose-500",
  warning: "bg-amber-400",
  info: "bg-blue-500"
};

const THEME_TEXT = {
  primary: "text-violet-600",
  success: "text-emerald-500",
  danger: "text-rose-500",
  warning: "text-amber-600",
  info: "text-blue-500"
};

const getColor = (type, isText = false) => {
    if (isText) return THEME_TEXT[type] || THEME_TEXT.primary;
    return THEME[type] || THEME.primary;
};

const DATOS_EMPRESA = { nombreTitular: "AILEN DENNISKA CAMARENA MENDOZA", ruc: "Panamá RUC DV 79 8 957349", banco: "Banco General", tipoCuenta: "Cuenta de ahorros", numeroCuenta: "0472960083979", telefono: "6667-7965", email: "corporativo@divertyeventos.online", web: "Divertyeventos.online" };
const ZONAS_TRANSPORTE = { "Panamá Centro": 0, "San Miguelito": 5, "Panamá Norte": 10, "Panamá Este": 10, "Arraiján / Chorrera": 15, "Colón": 25, "Otra Zona Especial": 0 };
const NAV_ITEMS = [ {id:'inicio', icon:Home, text:'Inicio'}, {id:'eventos', icon:Calendar, text:'Agenda'}, {id:'clientes', icon:Users, text:'Clientes'}, {id:'finanzas', icon:PieChart, text:'Finanzas'}, {id:'config', icon:Settings, text:'Ajustes'} ];
const defaultFormData = Object.freeze({ cliente: '', ruc: '', email: '', telefono: '', tipoEvento: 'Cumpleaños', ninos: '', fecha: '', hora: '', ubicacion: 'Panamá Centro', direccion: '', comentarios: '', servicio: '', serviciosSeleccionados: [], transporte: '', gastos: '', detalleGastos: '', total: '', abono: '', estado: 'Pendiente', colisionAprobada: false });

const PAQUETES_DIVERTY = [
  { id: 'p1', nombre: 'Plan circo', precio: 85.00, short: 'Circo 🎪', descripcion: 'Servicio de animación tipo circo.\n• 1 Payasit@ o Animador@ profesional\n• Juegos y dinámicas interactivas\n• Figuras con globos para los niños' },
  { id: 'p2', nombre: 'Plan diverty total', precio: 200.00, short: 'Diverty ⭐', descripcion: '3 horas de entretenimiento completo.\n• 1 Payasit@ o Animador@\n• 1 Pintacaritas profesional\n• Show de Burbujas Gigantes\n• Globoflexia para los invitados' },
  { id: 'p3', nombre: 'Plan recreativo', precio: 110.00, short: 'Recreativo 🎉', descripcion: '2 Horas de actividades.\n• 1 Payasit@ o Animador@\n• 1 Pintacaritas\n• Juegos y concursos\n• Globoflexia' },
  { id: 'p4', nombre: 'Plan magic', precio: 135.00, short: 'Magic 🎩', descripcion: '2 horas y media mágicas.\n• 1 Payasit@ o Animador@\n• 1 Pintacaritas\n• Show Especial de Magia Cómica\n• 🐰 Obsequio: Conejo Real' },
  { id: 'p5', nombre: 'Pintacaritas profesionales', precio: 50.00, short: 'Pinta Pro 🎨', descripcion: 'Servicio de pintacaritas.\n• Gemas adhesivas\n• Materiales hipoalergénicos\n• Mesa y silla de maquillaje', isPorHora: true },
  { id: 'p6', nombre: 'Pintacaritas básicas', precio: 35.00, short: 'Pinta Básica 🖍️', descripcion: 'Diseños rápidos y coloridos ideales para niños.\n• Materiales seguros y lavables', isPorHora: true },
  { id: 'p7', nombre: 'Globoflexia', precio: 35.00, short: 'Globos 🎈', descripcion: 'Creación de figuras divertidas con globos.\n• Perros, espadas, flores, ositos\n• 200 globos incluidos', isPorHora: true },
  { id: 'p8', nombre: 'Show Burbujas Premium', precio: 150.00, short: 'Burbujas Pro 🫧', descripcion: '1 hora de espectáculo completo.\n• Show de burbujas gigantes\n• Burbujas de humo y colores\n• Foto dentro de la burbuja' },
  { id: 'p9', nombre: 'Paquete Fiesta Burbuja', precio: 190.00, short: 'Fiesta 🫧', descripcion: '2 Horas de fiesta infantil.\n• Animación infantil con juegos\n• 1 Payasit@ o Animador@\n• Espectacular Show de Burbujas Gigantes' },
  { id: 'p10', nombre: 'Maquinas de snack', precio: 85.00, short: 'Snacks 🍿', descripcion: 'Máquina de snacks profesional.\n• Popcorn / Algodón a elección\n• Operador incluido', isPorHora: true },
  { id: 'p11', nombre: 'Alquiler de inflable', precio: 80.00, short: 'Inflable 🏰', descripcion: 'Inflable recreativo infantil.\n• Seguro y limpio\n• Instalación y montaje', isPorHora: true },
  { id: 'p12', nombre: 'Personaje temático', precio: 55.00, short: 'Personaje 🦸‍♂️', descripcion: 'Visita del personaje favorito.\n• Especial para fotos con los invitados', isPorHora: true },
  { id: 'p13', nombre: 'Personaje temático con animación', precio: 100.00, short: 'Pers. Animado 🦸‍♀️', descripcion: 'Visita del personaje favorito interactiva.\n• Incluye dinámicas y juegos para los niños', isPorHora: true }
];

// ==========================================
// 3. HELPERS Y UTILIDADES
// ==========================================
const getDocRef = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'eventos', id);

const normalizeText = (text) => String(text || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const utils = {
  normalizeText,
  getSafeLocal: (key) => { try { return localStorage.getItem(key); } catch(e) { return null; } },
  setSafeLocal: (key, val) => { try { localStorage.setItem(key, val); } catch(e) {} },
  triggerHaptic: (type = 'light') => { if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) { try { window.navigator.vibrate(type === 'light' ? 30 : 50); } catch (e) {} } },
  safeNum: (val) => { if (typeof val === 'number') return isNaN(val) ? 0 : val; if (!val) return 0; const p = parseFloat(String(val).replace(/[^0-9.-]/g, '')); return isNaN(p) ? 0 : p; },
  formatTime12h: (time24) => { if (!time24) return 'Por definir'; const [h, m] = String(time24).split(':'); if (!h || !m) return time24; let hrs = parseInt(h, 10); const suf = hrs >= 12 ? 'PM' : 'AM'; hrs = hrs % 12 || 12; return `${hrs}:${m} ${suf}`; },
  getLocalYYYYMMDD: (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  getWeekRange: () => { const t = new Date(); const d = t.getDay() === 0 ? -6 : 1 - t.getDay(); const s = new Date(t); s.setDate(t.getDate() + d); s.setHours(0, 0, 0, 0); const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999); return { start: s, end: e }; },
  getServiceDetails: (name) => { if (!name) return undefined; const nl = normalizeText(name); return PAQUETES_DIVERTY.find(p => nl.includes(normalizeText(p.nombre).replace('plan ', '').replace('paquete ', '').trim())); },
  parseCSV: (str) => { const arr = []; let quote = false; for (let row = 0, col = 0, c = 0; c < str.length; c++) { let cc = str[c], nc = str[c+1]; arr[row] = arr[row] || []; arr[row][col] = arr[row][col] || ''; if (cc === '"' && quote && nc === '"') { arr[row][col] += cc; ++c; continue; } if (cc === '"') { quote = !quote; continue; } if (cc === ',' && !quote) { ++col; continue; } if (cc === '\r' && nc === '\n' && !quote) { ++row; col = 0; ++c; continue; } if (cc === '\n' && !quote) { ++row; col = 0; continue; } if (cc === '\r' && !quote) { ++row; col = 0; continue; } arr[row][col] += cc; } return arr; }
};
const { getSafeLocal, setSafeLocal, triggerHaptic, safeNum, formatTime12h, getLocalYYYYMMDD, getWeekRange, parseCSV, getServiceDetails } = utils;

const todayObj = new Date(); const todayStr = getLocalYYYYMMDD(todayObj);
const tomorrowObj = new Date(todayObj.getTime() + 86400000); const tomorrowStr = getLocalYYYYMMDD(tomorrowObj);
const { start: weekStart, end: weekEnd } = getWeekRange();

// Construcción de Mensajes para WhatsApp
const getWhatsAppMessage = (ev, type) => {
    const tot = safeNum(ev.total); const abo = safeNum(ev.abono); const saldo = (tot - abo).toFixed(2);
    const fec = String(ev.fecha||'').split('-').reverse().join('/'); const hor = formatTime12h(ev.hora);
    switch(type) {
        case 'cotizacion': return `¡Hola *${ev.cliente}*! ✨\nTe comparto la cotización para tu evento el *${fec}*.\n🎉 *Paquetes:* ${ev.servicio}\n💰 *Inversión Total:* $${tot.toFixed(2)}\n\nSi deseas agendar, puedes confirmarnos por aquí. ¡Estamos a la orden! 🥳`;
        case 'recibo': return `¡Hola *${ev.cliente}*! 🥳\nTu reserva está *Confirmada* ✅\n📅 *Fecha:* ${fec}\n⏰ *Hora:* ${hor}\n📍 *Lugar:* ${ev.ubicacion}\n💰 *Total:* $${tot.toFixed(2)}\n💳 *Abono recibido:* $${abo.toFixed(2)}\n⚠️ *Saldo a cancelar en evento:* $${saldo}\n¡Gracias por preferirnos! ✨`;
        case 'recordatorio': return `¡Hola *${ev.cliente}*! 🥳\n¡Se acerca tu gran día! Recuerda tu evento para el *${fec}* a las *${hor}*.\n📍 Llegaremos a *${ev.ubicacion}*.\n💰 Saldo pendiente: *$${saldo}*.\n¡Nos vemos pronto para la diversión! ✨`;
        case 'cobro': return `¡Hola *${ev.cliente}*! 👋\nTe contactamos de Diverty Eventos.\nTe recordamos amablemente que tienes un saldo pendiente de *$${saldo}* para asegurar tu fecha del *${fec}*.\n\nSi deseas realizar el abono mediante Yappy o Transferencia, por favor avísanos por aquí. ¡Estamos a tu disposición! ✨`;
        case 'banco': return `¡Hola *${ev.cliente}*! 👋\nNuestros datos bancarios:\n🏦 *Banco:* ${DATOS_EMPRESA.banco}\n📋 *Tipo:* ${DATOS_EMPRESA.tipoCuenta}\n🔢 *Cuenta:* ${DATOS_EMPRESA.numeroCuenta}\n👤 *Nombre:* ${DATOS_EMPRESA.nombreTitular}\nPor favor envía comprobante. ¡Gracias! ✨`;
        case 'agradecimiento':
        default: return `¡Hola *${ev.cliente}*! 🌟\n¡GRACIAS por permitirnos estar en tu evento!\n¿Qué tal la pasaron? Nos encantaría ver fotitos 📸🎉\n¡Un abrazo mágico de todo el equipo! ✨`;
    }
}

// ==========================================
// 4. COMPONENTES UI Y ESTILOS
// ==========================================
const GLASS_CARD = "bg-white/70 dark:bg-slate-900/50 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-white/60 dark:border-slate-700/50";
const GLASS_CARD_HOVER = "hover:-translate-y-1.5 hover:shadow-[0_30px_60px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_30px_60px_rgba(0,0,0,0.4)] transition-all duration-500 ease-out";

// Hook Animación de contador
const useCountUp = (end, duration = 1000) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (end === 0) {
            setCount(0);
            return;
        }
        let start = 0;
        const stepTime = 16;
        const steps = duration / stepTime;
        const increment = end / steps;
        let timer;
        
        const delay = setTimeout(() => {
            timer = setInterval(() => {
                start += increment;
                if ((increment > 0 && start >= end) || (increment < 0 && start <= end)) {
                    setCount(end);
                    clearInterval(timer);
                } else {
                    setCount(start);
                }
            }, stepTime);
        }, 300);

        return () => {
            clearTimeout(delay);
            if (timer) clearInterval(timer);
        };
    }, [end, duration]);

    return count;
};

const AnimatedProgress = ({ value }) => {
  const [width, setWidth] = useState(0);
  const barRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setTimeout(() => {
            setWidth(value);
          }, 300);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (barRef.current) {
      observer.observe(barRef.current);
    }

    return () => observer.disconnect();
  }, [value]);

  return (
    <div
      ref={barRef}
      className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
      style={{
        width: `${width}%`,
        backgroundColor: value >= 100 ? '#10b981' : value >= 80 ? '#f59e0b' : '#8b5cf6'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-[200%] animate-[shimmer_2s_infinite]"></div>
    </div>
  );
};

const Confetti = () => ( <div className="fixed inset-0 pointer-events-none z-[100000] overflow-hidden flex justify-center">{[...Array(60)].map((_, i) => { const colors = ['bg-rose-500', 'bg-violet-500', 'bg-amber-400', 'bg-emerald-500', 'bg-teal-400', 'bg-pink-500']; const color = colors[Math.floor(Math.random() * colors.length)]; return <div key={i} className={`absolute top-[-10%] w-3 h-3 rounded-sm ${color} animate-[confettiFall_ease-out_forwards]`} style={{ left: Math.random() * 100 + 'vw', animationDuration: Math.random() * 2 + 2 + 's', animationDelay: Math.random() * 0.5 + 's' }} /> })}</div> );
const SkeletonCard = () => ( <div className={`${GLASS_CARD} p-6 animate-pulse flex flex-col gap-4 h-[280px]`}><div className="flex justify-between w-full"><div className="h-5 bg-slate-200/50 dark:bg-slate-800/50 rounded-full w-1/3"></div><div className="h-6 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl w-16"></div></div><div className="h-10 bg-slate-200/50 dark:bg-slate-800/50 rounded-full w-3/4 mt-2"></div><div className="space-y-3 mt-4"><div className="h-4 bg-slate-200/50 dark:bg-slate-800/50 rounded-full w-1/2"></div><div className="h-4 bg-slate-200/50 dark:bg-slate-800/50 rounded-full w-2/3"></div></div><div className="mt-auto h-14 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl w-full"></div></div> );

const EmptyState = ({ icon: Icon, title, message, actionBtn, color = "primary" }) => {
    const colorMapBg = {
        primary: "bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400",
        danger: "bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400",
        success: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        warning: "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400",
        info: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
    };

    return (
        <div className={`${GLASS_CARD} p-10 text-center flex flex-col items-center justify-center animate-fadeIn w-full`}>
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner backdrop-blur-xl border border-white/40 dark:border-slate-700/50 relative overflow-hidden ${colorMapBg[color] || colorMapBg.info}`}>
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-50"></div>
                <Icon size={48} strokeWidth={1.5} className="relative z-10 animate-float" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">{title}</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-sm mb-6">{message}</p>
            {actionBtn}
        </div>
    );
};

const AppButton = ({ children, variant = 'primary', icon: Icon, onClick, className = '', ...props }) => {
    const baseStyle = "font-black rounded-2xl transition-all duration-300 ease-out hover:scale-105 active:scale-95 flex items-center justify-center gap-2 relative overflow-hidden group border border-white/20";
    let variantStyle = "";

    if (variant === 'warning') {
        variantStyle = `bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 shadow-sm border-amber-200/50`;
    } else if (variant === 'success') {
        variantStyle = `bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 shadow-sm border-emerald-200/50`;
    } else if (variant === 'primary') {
        variantStyle = `bg-violet-600 text-white hover:bg-violet-700 shadow-[0_8px_20px_rgba(124,58,237,0.25)] hover:shadow-[0_12px_25px_rgba(124,58,237,0.4)]`;
    } else {
        variantStyle = "bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-slate-700 dark:text-slate-200 border-slate-200/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-700 shadow-[0_4px_15px_rgba(0,0,0,0.05)]";
    }

    return (
        <button type="button" onClick={onClick} className={`${baseStyle} ${variantStyle} ${className}`} {...props}>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out rounded-2xl pointer-events-none"></div>
            {Icon && <Icon size={variant === 'warning' ? 24 : 20} strokeWidth={variant === 'warning' ? 3 : 2} className="relative z-10" />}
            <span className="relative z-10">{children}</span>
        </button>
    );
};

const AppCard = ({ children, title, icon: Icon, iconColor = 'primary', className = '' }) => {
    return (
        <div className={`${GLASS_CARD} ${GLASS_CARD_HOVER} p-6 flex flex-col justify-center relative overflow-hidden ${className}`}>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-bl from-white/40 to-transparent dark:from-white/5 dark:to-transparent rounded-full blur-2xl pointer-events-none"></div>
            {(title || Icon) && (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-3 relative z-10">
                    {Icon && <Icon size={18} className={getColor(iconColor, true)} strokeWidth={2.5} />}
                    {title && <span className="text-[11px] font-black uppercase tracking-widest opacity-80">{title}</span>}
                </div>
            )}
            <div className="relative z-10">{children}</div>
        </div>
    );
};

// ==========================================
// 5. APLICACIÓN PRINCIPAL
// ==========================================
export default function App() {
  // --- ESTADOS ---
  const [isAuthenticated, setIsAuthenticated] = useState(() => getSafeLocal('diverty_auth') === 'true');
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => getSafeLocal('diverty_theme') === 'dark');
  const [activeTab, setActiveTab] = useState('inicio'); 
  const [isDBReady, setIsDBReady] = useState(false);
  const [eventos, setEventos] = useState([]); 
  const [filterDate, setFilterDate] = useState('');
  const [viewMode, setViewMode] = useState('semana'); 
  const [displayFormat, setDisplayFormat] = useState('lista'); 
  const [calMonth, setCalMonth] = useState(todayObj.getMonth());
  const [calYear, setCalYear] = useState(todayObj.getFullYear());
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEvento, setCurrentEvento] = useState(null);
  const [isCotizacionMode, setIsCotizacionMode] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null, type: 'delete' });
  const [toastAlert, setToastAlert] = useState({ isOpen: false, message: '', success: false });
  const [showConfetti, setShowConfetti] = useState(false); 
  const [isModoOperativo, setIsModoOperativo] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [printType, setPrintType] = useState(null);
  const [pdfScale, setPdfScale] = useState(1); 
  const [historialCliente, setHistorialCliente] = useState(null);
  const [clienteSugerido, setClienteSugerido] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [financePeriod, setFinancePeriod] = useState('mes');
  const [expandedFinanceId, setExpandedFinanceId] = useState(null);
  const [expandedClientId, setExpandedClientId] = useState(null);
  const [isCustomServiceModalOpen, setIsCustomServiceModalOpen] = useState(false);
  const [customServiceData, setCustomServiceData] = useState({ nombre: '', precio: '' });
  const [formData, setFormData] = useState({ ...defaultFormData });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const hasSyncedRef = useRef(false);

  // --- EFECTOS (INITS, LISTENERS) ---
  useEffect(() => {
    if (!document.getElementById('html2pdf-script')) { const script = document.createElement('script'); script.id = 'html2pdf-script'; script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'; script.async = true; document.body.appendChild(script); }
  }, []);

  useEffect(() => { const initAuth = async () => { try { await signInAnonymously(auth); } catch (e) { setFirebaseUser({ uid: 'local_fallback' }); } }; initAuth(); const unsubscribe = onAuthStateChanged(auth, (user) => { if (user) setFirebaseUser(user); }); return () => unsubscribe(); }, []);
  useEffect(() => { try { const urlParams = new URLSearchParams(window.location.search); if (urlParams.get('acceso') === ADMIN_PASS) { setSafeLocal('diverty_auth', 'true'); setIsAuthenticated(true); window.history.replaceState({}, document.title, window.location.pathname); } } catch(e) {} }, []);
  useEffect(() => { const handleResize = () => setPdfScale(window.innerWidth < 850 ? (window.innerWidth - 32) / 800 : 1); handleResize(); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize); }, []);
  useEffect(() => { if (isPrinting) window.scrollTo(0, 0); }, [isPrinting, printData]);

  // Historial predictivo
  useEffect(() => {
    if (formData.cliente && String(formData.cliente).length > 3) {
        const nb = normalizeText(formData.cliente).trim();
        const previas = eventos.filter(ev => normalizeText(ev.cliente || '').trim().includes(nb) && ev.id !== (currentEvento?.id || 'nuevo'));
        if (previas.length > 0) {
            previas.sort((a, b) => new Date(a.fecha || 0).getTime() - new Date(b.fecha || 0).getTime()); 
            const rec = previas[previas.length - 1]; const ultimaFecha = rec?.fecha ? String(rec.fecha).split('-').reverse().join('/') : 'recientemente';
            setHistorialCliente({ cantidad: previas.length, ultimoEvento: ultimaFecha, ultimoServicio: rec?.servicio || 'Evento' });
            setClienteSugerido(!formData.telefono && rec?.telefono ? rec : null);
        } else { setHistorialCliente(null); setClienteSugerido(null); }
    } else { setHistorialCliente(null); setClienteSugerido(null); }
  }, [formData.cliente, eventos, currentEvento]);

  // Listener Firestore - CON MANEJO DE ERRORES OFFLINE
  useEffect(() => {
    if (!db || !appId || !firebaseUser) return;
    
    const timeoutId = setTimeout(() => {
        setIsDBReady(true);
    }, 3500);

    const eventosRef = collection(db, 'artifacts', appId, 'public', 'data', 'eventos');
    const unsubscribe = onSnapshot(eventosRef, (snapshot) => {
      clearTimeout(timeoutId);
      const fbData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEventos(prev => {
          const map = new Map(prev.map(e => [e.id, e]));
          fbData.forEach(e => { if (map.has(e.id)) { const exist = map.get(e.id); map.set(e.id, { ...exist, estado: e.estado, abono: e.abono, total: e.total, deletedLocally: e.deletedLocally }); } else { map.set(e.id, e); } });
          return Array.from(map.values()).sort((a,b) => String(a.fecha).localeCompare(String(b.fecha)) || String(a.hora).localeCompare(String(b.hora)));
      });
      setIsDBReady(true);
    }, (error) => {
      console.warn("Firestore offline / Error de conexión:", error);
      clearTimeout(timeoutId);
      setIsDBReady(true); 
    });
    
    return () => {
        unsubscribe();
        clearTimeout(timeoutId);
    };
  }, [db, appId, firebaseUser]);

  // Efecto de Autoguardado (Borrador)
  useEffect(() => {
      if (isModalOpen && !currentEvento && !isCotizacionMode) {
          const timer = setTimeout(() => {
              setSafeLocal('diverty_form_draft', JSON.stringify(formData));
          }, 1000); 
          return () => clearTimeout(timer);
      }
  }, [formData, isModalOpen, currentEvento, isCotizacionMode]);

  // --- GOOGLE SHEETS SYNC ---
  const syncGoogleSheets = useCallback(async (silent = false) => {
    if (!sheetUrl) return; if (!silent) { setIsSyncing(true); triggerHaptic('light'); }
    try {
      const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/); if (!match) throw new Error('URL inválida.');
      const res = await fetch(`https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv&_nocache=${Date.now()}`); 
      if (!res.ok) throw new Error('HTTP '+res.status);
      const rows = parseCSV(await res.text());
      if (rows.length > 1) {
        const h = rows[0].map(x=>String(x||'').trim().toLowerCase());
        const getIdx = (keys) => keys.map(k => h.findIndex(x=>x.includes(k))).find(i => i !== -1) ?? -1;
        const [iNom, iEm, iTip, iTel, iNin, iFec, iHor, iUbi, iDir, iCom, iSer, iTra, iPre, iAbo, iEst] = [ getIdx(['nombre','cliente']), getIdx(['email','correo']), getIdx(['tipo','evento']), getIdx(['tel']), getIdx(['niñ','nin','cant']), getIdx(['fecha']), getIdx(['hora']), getIdx(['ubicacion','lugar','zona']), getIdx(['direc','detal']), getIdx(['coment','nota']), getIdx(['servic','paquet','plan']), getIdx(['transp','viatic']), getIdx(['preci','total','monto']), getIdx(['abono','deposi']), getIdx(['estado','status']) ];
        if (iNom === -1) { if (!silent) setIsSyncing(false); return; }
        const nuevasReservasDeSheets = []; const seen = new Set();
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i]; if (!r[iNom] || String(r[iNom]).trim() === '') continue;
          const s = (idx) => idx !== -1 ? String(r[idx]).trim() : '';
          let fechaLimpia = s(iFec);
          if (/^\d+$/.test(fechaLimpia)) { const serial = parseInt(fechaLimpia, 10); if (serial > 40000) { const dt = new Date(Math.round((serial - 25569) * 86400 * 1000)); const localDt = new Date(dt.getTime() + dt.getTimezoneOffset() * 60000); fechaLimpia = getLocalYYYYMMDD(localDt); } } else if (fechaLimpia.includes('/')) { const p = fechaLimpia.split('/'); if (p.length === 3 && p[2].length === 4) { fechaLimpia = `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`; } }
          let horaLimpia = s(iHor);
          if (/^0?\.\d+$/.test(horaLimpia)) { const tMins = Math.round(parseFloat(horaLimpia) * 24 * 60); const hh = Math.floor(tMins / 60); const mm = tMins % 60; horaLimpia = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`; }
          const id = `gs-${(r[iNom]+fechaLimpia+horaLimpia).replace(/[^a-z0-9]/gi,'').toLowerCase() || i}`;
          if(seen.has(id)) continue; seen.add(id);
          nuevasReservasDeSheets.push({ id, cliente: r[iNom] || 'Sin Nombre', email: s(iEm), telefono: s(iTel), tipoEvento: s(iTip) || 'Evento', ninos: s(iNin), fecha: fechaLimpia, hora: horaLimpia, ubicacion: s(iUbi) || 'Panamá Centro', direccion: s(iDir), comentarios: s(iCom), servicio: s(iSer), transporte: s(iTra).replace(/[^0-9.-]/g,"")||"0", total: s(iPre).replace(/[^0-9.-]/g,"")||"0", abono: s(iAbo).replace(/[^0-9.-]/g,"")||"0", estado: s(iEst) || 'Pendiente' });
        }
        setEventos(prev => {
            const map = new Map(prev.map(e => [e.id, e])); const updatesParaFirebase = [];
            nuevasReservasDeSheets.forEach(sheetEvt => {
                if (!map.has(sheetEvt.id)) { map.set(sheetEvt.id, sheetEvt); updatesParaFirebase.push(sheetEvt); } else {
                    const exist = map.get(sheetEvt.id);
                    if (!exist.deletedLocally && Object.keys(sheetEvt).some(k => sheetEvt[k] !== exist[k] && !['total','abono','transporte','estado'].includes(k))) {
                        const actualizado = { ...sheetEvt, total: exist.total!=='0'?exist.total:sheetEvt.total, abono: exist.abono!=='0'?exist.abono:sheetEvt.abono, transporte: exist.transporte!=='0'?exist.transporte:sheetEvt.transporte, estado: exist.estado!=='Pendiente'?exist.estado:sheetEvt.estado, serviciosSeleccionados: exist.serviciosSeleccionados||[], gastos: exist.gastos||'', detalleGastos: exist.detalleGastos||'', colisionAprobada: exist.colisionAprobada||false };
                        map.set(sheetEvt.id, actualizado); updatesParaFirebase.push(actualizado);
                    }
                }
            });
            if (updatesParaFirebase.length > 0 && firebaseUser) { Promise.all(updatesParaFirebase.map(ev => setDoc(getDocRef(ev.id), ev))).catch(err => console.warn(err)); }
            setIsDBReady(true); return Array.from(map.values()).sort((a,b) => String(a.fecha).localeCompare(String(b.fecha)) || String(a.hora).localeCompare(String(b.hora)));
        });
        if(!silent) triggerHaptic('success');
      }
    } catch (err) { if(!silent) showAlert("Error al sincronizar con Google Sheets."); }
    if (!silent) setIsSyncing(false);
  }, [firebaseUser]);

  useEffect(() => { if (isAuthenticated && !hasSyncedRef.current) { hasSyncedRef.current = true; syncGoogleSheets(true); } }, [isAuthenticated, syncGoogleSheets]);
  useEffect(() => { if (!isAuthenticated) return; const intervalId = setInterval(() => { syncGoogleSheets(true); }, 30000); return () => clearInterval(intervalId); }, [isAuthenticated, syncGoogleSheets]);

  // --- DATOS MAESTROS CALCULADOS ---
  const eventosActivos = useMemo(() => eventos.filter(ev => !ev.deletedLocally).sort((a,b) => String(a.fecha).localeCompare(String(b.fecha)) || String(a.hora).localeCompare(String(b.hora))), [eventos]);
  
  const stats = useMemo(() => {
     let gananciaHoy = 0, gananciaSemana = 0, deudaTotal = 0, ingresosEsteMes = 0;
     const eventosHoy = []; const eventosManana = []; const alertasOperativas = [];
     eventosActivos.forEach(ev => {
        const est = normalizeText(ev.estado); 
        const isHoy = ev.fecha === todayStr; const isManana = ev.fecha === tomorrowStr;
        
        if(est !== 'cancelado' && est !== 'cotizacion') {
            const t = safeNum(ev.total), a = safeNum(ev.abono), g = safeNum(ev.gastos), p = t - g; 
            if (est !== 'completado' && (t - a) > 0) deudaTotal += (t - a);
            if(isHoy) gananciaHoy += p;
            if(ev.fecha) { 
                const [y, m, d] = String(ev.fecha).split('-'); 
                if(y && m && d) { 
                    if (parseInt(y, 10) === todayObj.getFullYear() && parseInt(m, 10) === (todayObj.getMonth() + 1)) ingresosEsteMes += p; 
                    const eD = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)); 
                    if (eD >= weekStart && eD <= weekEnd) gananciaSemana += p; 
                } 
            }
            if(isHoy) eventosHoy.push(ev); 
            if(isManana) eventosManana.push(ev);
            
            if (est !== 'completado' && (isHoy || isManana)) {
                const priority = isHoy ? 1 : 2;
                const sp = isHoy ? { color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200', tagBg: 'bg-rose-500', tagText: 'HOY URGENTE' } : { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', tagBg: 'bg-amber-500', tagText: 'MAÑANA' };
                if (safeNum(ev.abono) <= 0) alertasOperativas.push({ id: `abo-${ev.id}`, priority, ev, icon: DollarSign, ...sp, text: `Sin abono registrado: ${String(ev.cliente)}` });
                if (!ev.direccion || String(ev.direccion).trim() === '') alertasOperativas.push({ id: `dir-${ev.id}`, priority, ev, icon: MapPin, ...sp, text: `Falta dirección: ${String(ev.cliente)}` });
                if (!ev.hora || String(ev.hora).trim() === '') alertasOperativas.push({ id: `hor-${ev.id}`, priority, ev, icon: Clock, ...sp, text: `Falta hora: ${String(ev.cliente)}` });
            }
        }
     });
     eventosHoy.sort((a,b) => String(a.hora).localeCompare(String(b.hora))); eventosManana.sort((a,b) => String(a.hora).localeCompare(String(b.hora))); alertasOperativas.sort((a, b) => a.priority - b.priority);
     const hoyPendientes = eventosHoy.filter(ev => (safeNum(ev.total) - safeNum(ev.abono)) > 0 && normalizeText(ev.estado) !== 'completado');
     const hoySinDireccion = eventosHoy.filter(ev => !ev.direccion || String(ev.direccion).trim() === '');
     return { gananciaHoy, gananciaSemana, deudaTotal, ingresosEsteMes, eventosHoy, eventosManana, alertasOperativas, hoyPendientes, hoySinDireccion };
  }, [eventosActivos]);

  const clientsList = useMemo(() => {
     const clientsMap = {};
     eventosActivos.forEach(ev => {
        const est = normalizeText(ev.estado);
        if(est === 'cancelado' || est === 'cotizacion') return; 
        const key = String(ev.cliente || '').trim().toLowerCase(); if(!key) return;
        if(!clientsMap[key]) clientsMap[key] = { nombre: ev.cliente, telefono: ev.telefono, totalGastado: 0, eventos: 0, ultimoEventoFecha: ev.fecha, ultimoEstado: ev.estado };
        clientsMap[key].totalGastado += safeNum(ev.total); clientsMap[key].eventos += 1;
        if (ev.fecha && (!clientsMap[key].ultimoEventoFecha || ev.fecha > clientsMap[key].ultimoEventoFecha)) { clientsMap[key].ultimoEventoFecha = ev.fecha; clientsMap[key].ultimoEstado = ev.estado; }
     });
     return Object.values(clientsMap).sort((a,b) => b.totalGastado - a.totalGastado);
  }, [eventosActivos]);

  const todayTime = useMemo(() => new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate()).getTime(), []);

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
         return {
             ...c,
             daysSince,
             isVIP: c.eventos >= 3 || c.totalGastado >= 300,
             isFrecuente: c.eventos === 2,
             isNuevo: c.eventos === 1 && daysSince <= 180,
             isInactivo: daysSince > 180,
             needsContact: daysSince > 60 && daysSince <= 365 
         };
     });
  }, [clientsList, todayTime]);

  const animatedGananciaHoy = useCountUp(stats.gananciaHoy);

  // --- HANDLERS GENERALES ---
  const showAlert = (message, success = false) => { setToastAlert({ isOpen: true, message, success }); setTimeout(() => setToastAlert({ isOpen: false, message: '', success: false }), 4000); };
  const showConfirm = (message, onConfirm, type = 'delete') => setConfirmModal({ isOpen: true, message, onConfirm, type });
  const toggleDarkMode = () => { triggerHaptic('light'); const newMode = !isDarkMode; setIsDarkMode(newMode); setSafeLocal('diverty_theme', newMode ? 'dark' : 'light'); };
  const procesarServicios = (prev, newSelected) => { const sumPrecios = newSelected.reduce((sum, s) => sum + safeNum(s.precio), 0); const newTotal = sumPrecios + safeNum(prev.transporte); return { ...prev, serviciosSeleccionados: newSelected, servicio: newSelected.map(s => s.cantidad > 1 ? `${s.nombre} (x${s.cantidad})` : s.nombre).join(' + '), total: newTotal > 0 ? newTotal.toString() : '' }; };
  const addService = (pkg) => { triggerHaptic('light'); setFormData(prev => procesarServicios(prev, [...(Array.isArray(prev.serviciosSeleccionados) ? prev.serviciosSeleccionados : []), { ...pkg, cantidad: 1, precioOriginal: pkg.precio, precio: pkg.precio }])); setSearchTerm(''); setShowDropdown(false); };
  const removeService = (idx) => { triggerHaptic('light'); setFormData(prev => { const ns = [...prev.serviciosSeleccionados]; ns.splice(idx, 1); return procesarServicios(prev, ns); }); };
  const handleAddCustomService = () => { if (!customServiceData.nombre?.trim()) return showAlert("Ingresa un nombre para el servicio."); addService({ id: 'c-'+Date.now(), nombre: customServiceData.nombre.trim(), precio: safeNum(customServiceData.precio), short: customServiceData.nombre.substring(0,10)+'...', descripcion: 'Servicio personalizado.', isPorHora: false }); setCustomServiceData({ nombre: '', precio: '' }); setIsCustomServiceModalOpen(false); };
  const handleZoneChange = (e) => { const z = e.target.value; const cost = ZONAS_TRANSPORTE[z] || 0; setFormData(p => ({ ...p, ubicacion: z, transporte: cost.toString(), total: ((Array.isArray(p.serviciosSeleccionados) ? p.serviciosSeleccionados : []).reduce((s, x) => s + safeNum(x.precio), 0) + cost).toString() })); };
  const handleTodoPagado = () => { setFormData({...formData, estado: 'Completado', abono: formData.total}); triggerHaptic('success'); setShowConfetti(true); setTimeout(() => setShowConfetti(false), 3500); };
  
  const openModal = (ev = null, isCot = false) => {
    try {
        triggerHaptic('light'); setIsCotizacionMode(isCot); setHistorialCliente(null); setClienteSugerido(null);
        if (ev && typeof ev === 'object' && 'id' in ev) { 
           let srvs = Array.isArray(ev.serviciosSeleccionados) ? [...ev.serviciosSeleccionados] : [];
           if (!srvs.length && ev.servicio) {
              String(ev.servicio).split('+').forEach(s => {
                  const nm = s.match(/^(.*?)(?:\s*\(x\d+\))?$/)?.[1].trim() || s.trim(); const q = parseInt(s.match(/\(x(\d+)\)/)?.[1] || 1); const p = getServiceDetails(nm);
                  if (p) srvs.push({ ...p, cantidad: q, precioOriginal: p.precio, precio: p.precio * q });
                  else srvs.push({ nombre: s.trim(), precio: safeNum(ev.total)/(String(ev.servicio).split('+').length||1), cantidad: q, precioOriginal: safeNum(ev.total)/(String(ev.servicio).split('+').length||1) });
              });
           }
           setCurrentEvento(ev); setFormData({ ...defaultFormData, ...ev, serviciosSeleccionados: srvs }); 
        } else { 
           setCurrentEvento(null); 
           if (!isCot) {
               const draftStr = getSafeLocal('diverty_form_draft');
               if (draftStr) {
                   try {
                       const draftObj = JSON.parse(draftStr);
                       if (draftObj && (draftObj.cliente || draftObj.telefono || draftObj.serviciosSeleccionados?.length > 0)) {
                           setFormData(draftObj);
                           showAlert("Borrador recuperado", true);
                           setIsModalOpen(true);
                           return;
                       }
                   } catch(e) {}
               }
           }
           setFormData({...defaultFormData, fecha: todayStr}); 
        }
        setSearchTerm(''); setShowDropdown(false); setIsModalOpen(true);
    } catch (e) { console.error(e); setCurrentEvento(null); setFormData({...defaultFormData, fecha: todayStr}); setIsModalOpen(true); }
  };
  
  const closeModal = () => { triggerHaptic('light'); setIsModalOpen(false); setCurrentEvento(null); setIsCotizacionMode(false); };
  
  const clearDraft = () => {
     showConfirm("¿Deseas limpiar el formulario y empezar de cero?", () => {
         setFormData({...defaultFormData, fecha: todayStr});
         setSafeLocal('diverty_form_draft', '');
     }, 'warning');
  };

  const handleSaveEvento = async (e) => {
    e.preventDefault(); if (!formData.cliente?.trim()) return showAlert("Por favor, ingresa el nombre del cliente."); if (!formData.fecha) return showAlert("Por favor, selecciona la fecha.");
    if (isCotizacionMode) { triggerHaptic('success'); closeModal(); handleViewDoc({ ...formData, id: `cot-${Date.now()}` }, 'cotizacion'); return; }
    triggerHaptic('light'); const evtId = currentEvento?.id || `man-${Date.now()}`; const safeData = JSON.parse(JSON.stringify({ ...formData, id: evtId, createdAt: currentEvento?.createdAt || new Date().toISOString(), deletedLocally: false }));
    if (currentEvento?.fecha !== safeData.fecha) safeData.colisionAprobada = false;
    if ((!currentEvento || currentEvento.fecha !== safeData.fecha) && eventosActivos.some(ev => ev.fecha === safeData.fecha && ev.id !== evtId && ev.estado !== 'Cancelado') && !safeData.colisionAprobada) {
        return showConfirm("Ya hay reservas este día. ¿Guardar igual?", () => { safeData.colisionAprobada = true; setEventos(prev => { const arr = [...prev]; const i = arr.findIndex(x=>x.id===evtId); if(i>-1) arr[i]=safeData; else arr.push(safeData); return arr; }); setDoc(getDocRef(evtId), safeData).catch(err=>console.warn(err)); closeModal(); setSafeLocal('diverty_form_draft', ''); showAlert("¡Guardado!", true); }, 'warning');
    }
    setEventos(prev => { const arr = [...prev]; const i = arr.findIndex(x=>x.id===evtId); if(i>-1) arr[i]=safeData; else arr.push(safeData); return arr; }); 
    setDoc(getDocRef(evtId), safeData).catch(err=>console.warn(err)); 
    setSafeLocal('diverty_form_draft', ''); 
    closeModal(); 
    showAlert("¡Reserva guardada!", true);
  };

  const handleDuplicate = () => { triggerHaptic('success'); const dup = { ...formData }; delete dup.id; delete dup.createdAt; dup.fecha = ''; dup.estado = 'Pendiente'; dup.abono = '0'; setCurrentEvento(null); setFormData(dup); showAlert("¡Duplicada! Cambia la fecha y guarda.", true); };
  const handleDeleteEvento = (id) => showConfirm("¿Eliminar reserva permanentemente?", async () => { triggerHaptic('light'); setEventos(prev => { const arr = [...prev]; const i = arr.findIndex(x=>x.id===id); if(i>-1) arr[i].deletedLocally=true; return arr; }); setDoc(getDocRef(id), { deletedLocally: true }, { merge: true }).catch(e=>console.warn(e)); if (isModalOpen && currentEvento?.id === id) closeModal(); }, 'delete');
  const handleWipeAll = () => showConfirm("⚠️ ¿Limpiar toda la base de datos?", async () => { triggerHaptic('light'); setEventos([]); Promise.all(eventosActivos.map(ev => setDoc(getDocRef(ev.id), { deletedLocally: true }, { merge: true }))).catch(e=>console.warn(e)); triggerHaptic('success'); showAlert("Base de datos limpiada.", true); }, 'delete');
  const handleViewDoc = (ev, type) => { try { triggerHaptic('light'); setPrintData(ev); setPrintType(type); setIsPrinting(true); } catch (err) { showAlert("Error al procesar."); } };
  
  const sendWhatsAppCall = (ev, type) => {
    triggerHaptic('success'); const msg = getWhatsAppMessage(ev, type);
    window.open(`https://wa.me/${String(ev.telefono).replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const openGoogleMaps = (dir, ubi) => { triggerHaptic('light'); window.open(`https://maps.google.com/?q=${encodeURIComponent(`${dir || ''} ${ubi || ''} Panamá`)}`, '_blank'); };
  const printNativePDF = () => { triggerHaptic('success'); window.print(); };
  
  const downloadExcel = () => {
    triggerHaptic('success');
    const filteredForExport = eventosActivos.filter(ev => { 
        const est = normalizeText(ev.estado);
        if (est === 'cancelado' || est === 'cotizacion' || safeNum(ev.total) <= 0) return false; 
        if (financePeriod === 'todos') return true; 
        const fStr = String(ev.fecha || ''); if (fStr) { const [ey, em] = fStr.split('-'); return parseInt(ey) === todayObj.getFullYear() && parseInt(em) === (todayObj.getMonth() + 1); } return false; 
    });
    let csv = 'Fecha,Cliente,Tipo Evento,Ubicacion,Ingreso Bruto,Gastos,Ganancia Neta,Estado\n'; filteredForExport.forEach(ev => { const t = safeNum(ev.total); const g = safeNum(ev.gastos); csv += `"${ev.fecha||''}","${String(ev.cliente||'').replace(/,/g,'')}","${String(ev.tipoEvento||'').replace(/,/g,'')}","${String(ev.ubicacion||'').replace(/,/g,'')}",${t},${g},${t-g},"${ev.estado||''}"\n`; });
    const blob = new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `Reporte_Finanzas_Diverty_${financePeriod}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleLogin = (e) => { e.preventDefault(); if (pinInput === ADMIN_PASS) { setSafeLocal('diverty_auth', 'true'); setIsAuthenticated(true); triggerHaptic('success'); } else { triggerHaptic('warning'); showAlert("Contraseña incorrecta."); setPinInput(''); } };
  const handleLogout = () => { try { localStorage.removeItem('diverty_auth'); } catch(e) {} setIsAuthenticated(false); window.location.href = window.location.pathname; };

  // --- LOGICA DE KANBAN (DRAG & DROP) ---
  const handleDragStart = (e, id) => { e.dataTransfer.setData('text/plain', id); };
  const handleDrop = (e, newStatus) => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain');
      const evt = eventosActivos.find(x => x.id === id);
      if(evt && evt.estado !== newStatus) {
          triggerHaptic('success');
          const safeData = { ...evt, estado: newStatus };
          if (newStatus === 'Completado' && safeNum(evt.total) > safeNum(evt.abono)) {
              safeData.abono = evt.total; // Auto-pagar al completar
          }
          setEventos(prev => prev.map(x => x.id === id ? safeData : x));
          setDoc(getDocRef(id), safeData).catch(err => console.warn(err));
          if (newStatus === 'Completado') {
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 3500);
          }
          showAlert(`Movido a ${newStatus}`, true);
      }
  };

  // ==========================================
  // 7. COMPONENTES UI Y ESTILOS
  // ==========================================
  const renderLogin = () => (
    <div className={`font-outfit min-h-[100dvh] flex items-center justify-center p-4 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-600 via-fuchsia-600 to-rose-600 ${isDarkMode ? 'dark' : ''}`}>
      <div className="absolute top-10 left-10 w-64 h-64 bg-white/20 rounded-full blur-3xl pointer-events-none mix-blend-overlay"></div><div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-400/20 rounded-full blur-3xl pointer-events-none mix-blend-overlay"></div>
      {toastAlert.isOpen && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100000] w-[90%] max-w-sm animate-slideDown"><div className={`backdrop-blur-xl px-5 py-4 rounded-2xl shadow-xl flex items-center gap-2 border text-white transition-all duration-300 ease-out ${toastAlert.success ? `${getColor('success')} border-emerald-400` : `${getColor('danger')} border-rose-400`}`}>{toastAlert.success ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}<p className="text-base font-black">{toastAlert.message}</p></div></div>}
      <div className="w-full max-w-sm bg-white/10 dark:bg-slate-900/40 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/30 dark:border-slate-700/50 relative z-10 animate-fadeInUp">
          <div className="flex justify-center mb-8"><div className="bg-white/20 backdrop-blur-md p-4 rounded-[2rem] shadow-inner border border-white/30"><img src={LOGO_URL} alt="Diverty Eventos" className="w-24 h-24 object-contain drop-shadow-md" crossOrigin="anonymous" /></div></div>
          <div className="text-center mb-8"><h1 className="text-3xl font-black text-white mb-2 tracking-tight drop-shadow-sm">¡Hola de nuevo! 👋</h1><p className="text-sm font-bold text-white/70">Ingresa tu contraseña para acceder al sistema.</p></div>
          <form onSubmit={handleLogin} className="space-y-6">
              <div className="relative group"><div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><Lock size={20} className="text-white/50 group-focus-within:text-white transition-colors duration-300 ease-out" /></div><input type="password" required value={pinInput} onChange={(e) => setPinInput(e.target.value)} className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl py-4 pl-14 pr-4 text-white font-bold outline-none focus:border-white focus:bg-white/20 transition-all duration-300 ease-out shadow-inner text-lg placeholder-white/40" placeholder="Contraseña" /></div>
              <button type="submit" className="w-full bg-white text-violet-600 hover:bg-violet-50 font-black text-lg py-4 rounded-2xl shadow-[0_8px_30px_rgba(255,255,255,0.2)] hover:shadow-[0_12px_40px_rgba(255,255,255,0.4)] transition-all duration-300 ease-out hover:scale-105 active:scale-95 flex items-center justify-center gap-2"><Sparkles size={24} /> Entrar al CRM</button>
          </form>
          <div className="mt-8 text-center"><p className="text-[11px] font-black text-white/40 uppercase tracking-widest">Diverty Eventos CRM © 2026</p></div>
      </div>
    </div>
  );

  const renderAgendaEventCard = (ev, idx = 0) => {
        const estNormalized = normalizeText(ev.estado);
        const tot = safeNum(ev.total);
        const abo = safeNum(ev.abono);
        const restante = Math.max(0, tot - abo);

        let pagoEstado = "Pendiente";
        let pagoColor = "text-rose-600";
        if (tot > 0 && restante === 0) {
            pagoEstado = "Pagado";
            pagoColor = "text-emerald-600";
        } else if (abo > 0) {
            pagoEstado = "Abono";
            pagoColor = "text-amber-500";
        }

        const waType = estNormalized === 'pendiente' ? 'cobro' : 
                       estNormalized === 'confirmado' ? 'recibo' : 
                       estNormalized === 'completado' ? 'agradecimiento' : 'recordatorio';

        let diff = null;
        if (ev.fecha) {
            const [y, m, d] = String(ev.fecha).split('-');
            if (y && m && d) {
                const evtD = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
                const tod = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());
                diff = Math.ceil((evtD.getTime() - tod.getTime()) / (1000 * 60 * 60 * 24));
            }
        }

        const isHoy = diff === 0;
        let badgeColor = 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
        let cardStyle = 'border-slate-100 dark:border-slate-800 hover:border-violet-300/50';
        let sideColor = "bg-gradient-to-b from-slate-300 to-transparent dark:from-slate-700";

        if (estNormalized === 'completado') { badgeColor = 'bg-[#E6F8F0] text-[#00A86B]'; sideColor = 'bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.3)]'; }
        else if (estNormalized === 'confirmado') { badgeColor = 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'; sideColor = 'bg-gradient-to-b from-teal-400 to-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'; }
        else if (estNormalized === 'pendiente') { badgeColor = 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'; sideColor = 'bg-gradient-to-b from-amber-400 to-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]'; }
        else if (estNormalized === 'cancelado') { badgeColor = 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'; sideColor = 'bg-gradient-to-b from-rose-400 to-rose-600 shadow-[0_0_15px_rgba(225,29,72,0.3)]'; }
        else if (estNormalized === 'cotizacion') { badgeColor = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'; sideColor = 'bg-gradient-to-b from-slate-400 to-slate-500'; }

        if (isHoy) cardStyle = 'border-rose-300/50 dark:border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.1)]';

        let dateBadgeContent = null;
        if (diff === 0) dateBadgeContent = <div className="absolute top-4 right-4 bg-rose-500/10 backdrop-blur-md text-rose-600 dark:text-rose-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-500/20 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>Hoy</div>;
        else if (diff === 1) dateBadgeContent = <div className="absolute top-4 right-4 bg-amber-500/10 backdrop-blur-md text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/20 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></div>Mañana</div>;
        else if (diff > 1) dateBadgeContent = <div className="absolute top-4 right-4 bg-slate-50/50 backdrop-blur-md text-slate-500 dark:bg-slate-800/50 dark:text-slate-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>{diff} Días</div>;
        else if (diff !== null) dateBadgeContent = <div className="absolute top-4 right-4 bg-slate-50/50 backdrop-blur-md text-slate-400 dark:bg-slate-800/50 dark:text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-1.5">Pasado</div>;

        const evtDate = ev.fecha ? String(ev.fecha).split('-').reverse().join('/') : 'Sin fecha';

        return (
            <div 
                key={ev.id} 
                className={`relative ${GLASS_CARD} ${cardStyle} p-6 transition-all duration-500 ease-out hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)] animate-fadeInUp flex flex-col gap-5 overflow-hidden group`}
                style={{ animationFillMode: 'both', animationDelay: `${idx * 80}ms` }}
            >
                <div className={`absolute left-0 top-6 bottom-6 w-1.5 rounded-r-xl transition-all duration-500 ease-out opacity-80 group-hover:opacity-100 ${sideColor}`}></div>
                
                {dateBadgeContent}

                <div className="pr-24">
                    <div className="flex items-center gap-2.5 mb-2">
                         <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/20 shadow-sm ${badgeColor}`}>
                            {ev.estado}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            <CalendarDays size={12} /> {evtDate}
                        </div>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-800 dark:text-white capitalize truncate drop-shadow-sm">{ev.cliente}</h3>
                </div>

                <div className="flex flex-col gap-3 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-violet-500/10 dark:bg-violet-500/20 backdrop-blur-xl border border-violet-500/10 p-2.5 rounded-xl text-violet-600 dark:text-violet-400 shadow-sm">
                            <Sparkles size={16} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{ev.servicio || 'Sin paquete'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-rose-500/10 dark:bg-rose-500/20 backdrop-blur-xl border border-rose-500/10 p-2.5 rounded-xl text-rose-500 dark:text-rose-400 shadow-sm">
                            <MapPin size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate" title={ev.direccion ? `${ev.ubicacion} - ${ev.direccion}` : ev.ubicacion}>
                                {ev.direccion ? `${ev.ubicacion} - ${ev.direccion}` : ev.ubicacion}
                            </p>
                        </div>
                        {ev.direccion && (
                           <button type="button" onClick={(e) => { e.stopPropagation(); openGoogleMaps(ev.direccion, ev.ubicacion); }} className="text-rose-500 hover:text-rose-600 bg-rose-50/50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 p-2 rounded-xl transition-all duration-300 ease-out hover:scale-105 active:scale-95 shadow-sm border border-rose-100/50 dark:border-rose-500/10">
                               <MapIcon size={14} />
                           </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-xl border border-blue-500/10 p-2.5 rounded-xl text-blue-500 dark:text-blue-400 shadow-sm">
                            <Smartphone size={16} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{ev.telefono || 'Sin teléfono'}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-2xl rounded-2xl p-5 border border-white/50 dark:border-slate-700/30 mt-auto shadow-[inset_0_2px_10px_rgba(255,255,255,0.4)] dark:shadow-none relative z-10">
                    <div className="flex justify-between items-end mb-4">
                         <div>
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Total</p>
                             <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-none">${tot.toFixed(2)}</p>
                         </div>
                         <div className="text-right">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Pendiente</p>
                             <p className="text-xl sm:text-2xl font-black text-rose-500 leading-none drop-shadow-sm">${restante.toFixed(2)}</p>
                         </div>
                    </div>
                    <div className="w-full bg-slate-200/50 dark:bg-slate-700/50 rounded-full h-1.5 overflow-hidden shadow-inner">
                        <AnimatedProgress value={tot > 0 ? Math.min((abo / tot) * 100, 100) : 0} />
                    </div>
                    <div className="flex justify-between mt-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={12}/> Pagado: ${abo.toFixed(2)}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white/50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-200/30 dark:border-slate-700/30 shadow-sm">{tot > 0 ? Math.round((abo / tot) * 100) : 0}%</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 relative z-10">
                    <button type="button" onClick={()=>sendWhatsAppCall(ev, waType)} className="col-span-1 sm:col-span-1 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 h-11 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 ease-out active:scale-95 flex justify-center items-center gap-2 border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-[0_8px_20px_rgba(16,185,129,0.15)] hover:-translate-y-0.5 group/btn">
                        <MessageCircle size={16} className="transition-transform duration-300 group-hover/btn:scale-110"/> <span className="sm:hidden lg:inline">WhatsApp</span>
                    </button>
                    <button type="button" onClick={()=>handleViewDoc(ev, 'factura')} className="col-span-1 sm:col-span-1 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 h-11 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 ease-out active:scale-95 flex justify-center items-center gap-2 border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-[0_8px_20px_rgba(59,130,246,0.15)] hover:-translate-y-0.5 group/btn">
                        <Receipt size={16} className="transition-transform duration-300 group-hover/btn:scale-110"/> <span className="sm:hidden lg:inline">Factura</span>
                    </button>
                    <button type="button" onClick={()=>handleViewDoc(ev, 'contrato')} className="col-span-1 sm:col-span-1 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 h-11 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 ease-out active:scale-95 flex justify-center items-center gap-2 border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-[0_8px_20px_rgba(124,58,237,0.15)] hover:-translate-y-0.5 group/btn">
                        <FileSignature size={16} className="transition-transform duration-300 group-hover/btn:scale-110"/> <span className="sm:hidden lg:inline">Contrato</span>
                    </button>
                    <div className="col-span-1 sm:col-span-1 flex gap-2.5">
                        <button type="button" onClick={()=>openModal(ev)} className="flex-1 h-11 flex items-center justify-center rounded-2xl bg-slate-100/50 text-slate-600 hover:bg-white dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-700 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300 ease-out active:scale-95 hover:-translate-y-0.5 font-black text-[11px] uppercase tracking-widest gap-2">
                            <Edit size={16}/>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

  const renderInicio = () => {
     const cotizacionesActivas = eventosActivos.filter(ev => normalizeText(ev.estado) === 'cotizacion');

     if (isModoOperativo) {
        return (
          <div className="animate-fadeIn p-4 md:p-10 max-w-3xl mx-auto space-y-6 pb-32">
             <div className="flex justify-between items-center bg-violet-600 text-white p-6 rounded-[2rem] shadow-lg transition-all duration-300 ease-out"><div><p className="text-[11px] font-black uppercase tracking-widest text-violet-200 mb-1">Modo Campo</p><h2 className="text-2xl font-black flex items-center gap-2"><Zap size={24} className="text-amber-400 fill-amber-400"/> Operativa de Hoy</h2></div><button type="button" onClick={() => setIsModoOperativo(false)} className="bg-white/20 hover:bg-white/30 p-3 rounded-xl active:scale-95 hover:scale-105 transition-all duration-300 ease-out"><X size={24} /></button></div>
             <div className="space-y-4">
                 {stats.eventosHoy.length === 0 ? (
                     <EmptyState icon={Sun} title="¡Día libre!" message="No tienes eventos programados para el día de hoy en tu modo operativo." color="success" />
                 ) : (
                     stats.eventosHoy.map((ev, i) => renderAgendaEventCard(ev, i))
                 )}
             </div>
          </div>
        );
     }

     return (
       <div className="animate-fadeIn p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-8 pb-32 md:pb-10">
          
          <div className="bg-slate-900 dark:bg-slate-800 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_20px_50px_rgba(15,23,42,0.3)] text-white flex flex-col sm:flex-row justify-between items-center gap-6 transition-all duration-500 ease-out hover:-translate-y-1.5 border border-white/10 dark:border-slate-700 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/20 rounded-full blur-[80px] pointer-events-none group-hover:bg-violet-600/30 transition-colors duration-700"></div>
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[60px] pointer-events-none group-hover:bg-indigo-500/30 transition-colors duration-700"></div>
             <div className="relative z-10">
                 <h1 className="text-3xl sm:text-5xl font-black mb-2 flex items-center gap-3 tracking-tight">Hola Diverty 👋</h1>
                 <p className="text-slate-400 font-medium text-sm sm:text-base">Gestiona tus reservas, contratos y finanzas al instante.</p>
             </div>
             <div className="flex gap-3 w-full sm:w-auto relative z-10">
                 <AppButton variant="primary" icon={Plus} onClick={() => openModal()} className="w-full sm:w-auto py-4 px-8 text-base">
                    Nueva Reserva
                 </AppButton>
             </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <AppCard title="Eventos Hoy" icon={Calendar} iconColor="primary">
                  <p className="text-4xl font-black text-slate-800 dark:text-white drop-shadow-sm">{stats.eventosHoy.length}</p>
              </AppCard>
              <AppCard title="Ingresos Mes" icon={DollarSign} iconColor="success">
                  <p className="text-4xl font-black text-slate-800 dark:text-white drop-shadow-sm">${stats.ingresosEsteMes.toFixed(0)}</p>
              </AppCard>
              <AppCard title="Clientes Activos" icon={Users} iconColor="warning">
                  <p className="text-4xl font-black text-slate-800 dark:text-white drop-shadow-sm">{clientsList.length}</p>
              </AppCard>
              <AppCard title="Por Cobrar" icon={TrendingUp} iconColor="danger">
                  <p className="text-4xl font-black text-slate-800 dark:text-white drop-shadow-sm">${stats.deudaTotal.toFixed(0)}</p>
              </AppCard>
          </div>

          <div className="flex gap-3">
             <button type="button" onClick={() => openModal(null, true)} className="flex-1 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 rounded-2xl py-4 font-black flex items-center justify-center gap-2 active:scale-95 hover:scale-105 transition-all duration-300 ease-out shadow-sm hover:shadow-md hover:-translate-y-1"><FileText size={20} className="text-amber-500 drop-shadow-md"/> <span className="hidden sm:inline">Cotización Rápida</span></button>
             <button type="button" onClick={() => {triggerHaptic('light'); setIsModoOperativo(true); window.scrollTo(0,0);}} className="flex-1 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl py-4 font-black flex items-center justify-center gap-2 active:scale-95 hover:scale-105 transition-all duration-300 ease-out shadow-md hover:shadow-[0_10px_30px_rgba(15,23,42,0.3)] hover:-translate-y-1 border border-white/10 dark:border-slate-700"><Zap size={20} className="text-amber-400 fill-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]"/> <span className="hidden sm:inline">Modo Operativo</span></button>
             <button type="button" onClick={() => syncGoogleSheets()} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 text-violet-600 dark:text-violet-400 rounded-2xl p-4 font-black flex items-center justify-center active:scale-95 hover:scale-105 transition-all duration-300 ease-out shadow-sm hover:shadow-md hover:-translate-y-1"><RefreshCw size={24} className={isSyncing ? "animate-spin" : "drop-shadow-sm"} /></button>
          </div>

          {stats.alertasOperativas.length > 0 && (
            <div className="animate-slideDown">
               <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-3"><AlertTriangle size={16} className="text-rose-500 animate-pulse"/> Urgencias ({stats.alertasOperativas.length})</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {stats.alertasOperativas.map((al, i) => {
                      const AlIcon = al.icon;
                      return (
                      <div key={al.id} onClick={() => openModal(al.ev)} className={`p-6 rounded-3xl border flex items-center justify-between cursor-pointer shadow-sm active:scale-95 hover:-translate-y-1.5 transition-all duration-300 ease-out ${GLASS_CARD} hover:border-rose-300 border-rose-200/50 dark:border-rose-900/50 animate-fadeInUp`} style={{animationDelay: `${i*100}ms`}}>
                         <div className="flex items-center gap-4"><div className={`p-3 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 border border-rose-500/10 shadow-inner backdrop-blur-md`}><AlIcon size={24} strokeWidth={2.5}/></div><div className="flex flex-col items-start"><p className={`text-base font-black text-slate-800 dark:text-white leading-tight capitalize`}>{al.text}</p><p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mt-1.5 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">{al.tagText}</p></div></div><ChevronRight size={20} className="text-slate-300" />
                      </div>
                   )})}
               </div>
            </div>
          )}

          {cotizacionesActivas.length > 0 && (
             <div className="mt-10 pt-10 border-t border-slate-200/50 dark:border-slate-800/50 relative">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent"></div>
                 <h3 className="font-black text-2xl text-slate-800 dark:text-white flex items-center gap-3 mb-6"><FileText className="text-amber-500 drop-shadow-md" size={28} /> Cotizaciones Activas</h3>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                     {cotizacionesActivas.map((ev, i) => renderAgendaEventCard(ev, i))}
                 </div>
             </div>
          )}

          <div className="mt-10 pt-10 border-t border-slate-200/50 dark:border-slate-800/50 relative">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent"></div>
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-2xl text-slate-800 dark:text-white flex items-center gap-3"><CalendarDays className="text-violet-500 drop-shadow-md" size={28} /> Próximas Reservas</h3>
                <button type="button" onClick={() => {triggerHaptic('light'); setActiveTab('eventos')}} className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-700/50 px-5 py-2.5 rounded-xl active:scale-95 hover:scale-105 hover:-translate-y-0.5 transition-all duration-300 ease-out shadow-sm hover:shadow-md">Ver Todas</button>
             </div>
             {stats.eventosHoy.length > 0 || stats.eventosManana.length > 0 ? (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">{[...stats.eventosHoy, ...stats.eventosManana].map((ev, i) => renderAgendaEventCard(ev, i))}</div>
             ) : (
                 <EmptyState 
                    icon={CalendarDays} 
                    title="Agenda Despejada" 
                    message="No tienes reservas programadas para hoy ni mañana. ¡Aprovecha para crear nuevas cotizaciones!" 
                    color="primary"
                    actionBtn={<AppButton onClick={()=>openModal()} variant="primary" icon={Plus} className="mt-4 px-8 py-4">Crear Reserva</AppButton>}
                 />
             )}
          </div>
       </div>
     );
  };

  const renderEventos = () => {
    const filtrados = eventosActivos.filter(e => {
        const est = normalizeText(e.estado);
        if (est === 'cotizacion') return false; 
        if (globalSearch && !String(e.cliente+e.servicio+e.ubicacion+e.direccion).toLowerCase().includes(globalSearch.toLowerCase())) return false;
        if (filterDate && e.fecha !== filterDate) return false;
        
        if (!filterDate && !globalSearch) {
            if (viewMode === 'hoy') { return e.fecha === todayStr; }
            
            let y, m, d, dt;
            if (e.fecha) {
                const parts = String(e.fecha).split('-');
                if (parts.length === 3) {
                    y = parseInt(parts[0], 10);
                    m = parseInt(parts[1], 10);
                    d = parseInt(parts[2], 10);
                    dt = new Date(y, m - 1, d);
                }
            }

            if (viewMode === 'semana') { 
                if(!dt) return false; 
                return dt >= weekStart && dt <= weekEnd; 
            }
            if (viewMode === 'mes') { 
                if(!y || !m) return false; 
                return y === todayObj.getFullYear() && m === (todayObj.getMonth() + 1); 
            }
            if (viewMode === 'findesemana') { 
                if(!dt) return false; 
                const day = dt.getDay(); 
                return day === 0 || day === 6; 
            }
            if (viewMode === 'pendientes') { 
                return (safeNum(e.total) - safeNum(e.abono)) > 0 && est !== 'completado'; 
            }
            if (viewMode === 'pagados') { 
                return (safeNum(e.total) > 0 && (safeNum(e.total) - safeNum(e.abono)) <= 0) || est === 'completado'; 
            }
        }
        return true; 
    });

    const renderCalendarGrid = () => {
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
        const days = Array.from({length: daysInMonth}, (_, i) => i + 1);
        const blanks = Array.from({length: firstDayIndex}, (_, i) => i);
        const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        return (
            <div className={`${GLASS_CARD} p-8 mb-8 animate-fadeIn transition-all duration-500 ease-out hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:-translate-y-1`}>
               <div className="flex justify-between items-center mb-6 border-b border-slate-200/50 dark:border-slate-700/50 pb-6">
                   <h3 className="text-2xl font-black text-slate-800 dark:text-white capitalize flex items-center gap-3 tracking-tight">
                       <div className="bg-violet-500/10 p-2.5 rounded-xl border border-violet-500/20 backdrop-blur-md"><CalendarDays size={24} className="text-violet-600 dark:text-violet-400"/></div>
                       {monthNames[calMonth]} {calYear}
                   </h3>
                   <div className="flex gap-2 bg-white/40 dark:bg-slate-800/40 p-1.5 rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-inner backdrop-blur-md">
                       <button type="button" onClick={() => { triggerHaptic('light'); setCalMonth(calMonth === 0 ? 11 : calMonth - 1); setCalYear(calMonth === 0 ? calYear - 1 : calYear); }} className="p-3 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all duration-300 ease-out active:scale-95 shadow-sm text-slate-600 dark:text-slate-300"><ChevronLeft size={18}/></button>
                       <button type="button" onClick={() => { triggerHaptic('light'); setCalMonth(todayObj.getMonth()); setCalYear(todayObj.getFullYear()); setFilterDate(todayStr); }} className="px-6 py-2 hover:bg-white dark:hover:bg-slate-700 text-violet-600 dark:text-violet-400 font-black text-[11px] uppercase tracking-widest rounded-xl transition-all duration-300 ease-out active:scale-95 shadow-sm">HOY</button>
                       <button type="button" onClick={() => { triggerHaptic('light'); setCalMonth(calMonth === 11 ? 0 : calMonth + 1); setCalYear(calMonth === 11 ? calYear + 1 : calYear); }} className="p-3 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all duration-300 ease-out active:scale-95 shadow-sm text-slate-600 dark:text-slate-300"><ChevronRight size={18}/></button>
                   </div>
               </div>
               <div className="grid grid-cols-7 gap-2 sm:gap-4 text-center mb-4">
                   {weekDays.map(d => <div key={d} className="text-[11px] font-black uppercase tracking-widest text-slate-400">{d}</div>)}
               </div>
               <div className="grid grid-cols-7 gap-2 sm:gap-4">
                  {blanks.map(b => <div key={`b-${b}`} className="min-h-[80px] sm:min-h-[120px] bg-transparent rounded-2xl"></div>)}
                  {days.map(d => {
                     const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; 
                     const dayEvents = eventosActivos.filter(e => e.fecha === dateStr && normalizeText(e.estado) !== 'cotizacion' && normalizeText(e.estado) !== 'cancelado'); 
                     const isToday = dateStr === todayStr; 
                     const isSelected = filterDate === dateStr;
                     const hasEvents = dayEvents.length > 0;
                     
                     return (
                         <div key={d} onClick={() => { triggerHaptic('light'); setFilterDate(dateStr); setViewMode(''); setDisplayFormat('lista'); }} className={`min-h-[80px] sm:min-h-[120px] p-2 sm:p-3 rounded-2xl border transition-all duration-300 ease-out cursor-pointer relative group flex flex-col justify-start items-center sm:items-start hover:-translate-y-1 ${isSelected ? 'border-violet-500 bg-violet-500/10 shadow-[0_8px_20px_rgba(124,58,237,0.15)] backdrop-blur-md' : isToday ? 'bg-rose-500/5 border-rose-500/30 shadow-[inset_0_0_20px_rgba(244,63,94,0.05)]' : 'bg-white/40 border-white/50 hover:border-violet-300/50 dark:bg-slate-800/40 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-800 shadow-sm hover:shadow-md'}`}>
                            <p className={`text-sm font-black sm:self-end w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-300 ease-out ${isSelected ? 'bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-md' : isToday ? 'bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 group-hover:text-violet-600 dark:group-hover:text-violet-400 bg-white/50 dark:bg-slate-700/50 border border-slate-200/50 dark:border-slate-600/50 shadow-sm'}`}>{d}</p>
                            
                            <div className="mt-2 flex flex-wrap sm:flex-col gap-1.5 w-full justify-center sm:justify-start flex-1 overflow-hidden">
                                {hasEvents && <div className="hidden sm:flex flex-col gap-1.5 w-full">
                                    {dayEvents.slice(0, 2).map((ev, i) => (<div key={i} className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg truncate bg-white/80 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 w-full shadow-sm" title={ev.cliente}>{String(ev.cliente).split(' ')[0]}</div>))}
                                    {dayEvents.length > 2 && <div className="text-[10px] text-violet-600 dark:text-violet-400 font-black uppercase tracking-widest mt-0.5 text-center w-full">+{dayEvents.length - 2} más</div>}
                                </div>}
                                {hasEvents && <div className="sm:hidden flex gap-1 mt-1 justify-center flex-wrap">
                                    {dayEvents.slice(0, 3).map((_, i) => <div key={i} className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-violet-600 shadow-sm' : 'bg-violet-500/50 shadow-sm'}`}></div>)}
                                    {dayEvents.length > 3 && <div className="w-2.5 h-2.5 rounded-full bg-slate-400/50"></div>}
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
        const grouped = filtrados.reduce((acc, ev) => {
            if(!acc[ev.fecha]) acc[ev.fecha] = [];
            acc[ev.fecha].push(ev);
            return acc;
        }, {});

        return (
            <div className="mt-8 space-y-12 animate-fadeIn">
                {Object.keys(grouped).sort().map(fecha => (
                    <div key={fecha} className="flex flex-col">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-violet-600 dark:text-violet-400 px-5 py-3 rounded-2xl font-black text-sm flex items-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-white/50 dark:border-slate-700/50">
                                <CalendarDays size={20} />
                                {fecha ? String(fecha).split('-').reverse().join('/') : 'Sin Fecha'}
                            </div>
                            <div className="flex-1 h-px bg-gradient-to-r from-slate-300 dark:from-slate-700 to-transparent"></div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {grouped[fecha].map((ev, i) => renderAgendaEventCard(ev, i))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderKanbanView = () => {
        const columnas = ['Pendiente', 'Confirmado', 'Completado'];
        return (
            <div className="flex gap-6 overflow-x-auto pb-8 pt-4 snap-x animate-fadeIn h-full min-h-[500px]">
                {columnas.map((col, cIdx) => {
                    const colEvents = filtrados.filter(e => normalizeText(e.estado) === col.toLowerCase());
                    let colColor = "bg-slate-200 dark:bg-slate-800 text-slate-700";
                    let glowColor = "border-transparent";
                    if(col === 'Pendiente') { colColor = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"; glowColor = "border-amber-400/50 dark:border-amber-400/30"; }
                    if(col === 'Confirmado') { colColor = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"; glowColor = "border-blue-400/50 dark:border-blue-400/30"; }
                    if(col === 'Completado') { colColor = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"; glowColor = "border-emerald-400/50 dark:border-emerald-400/30"; }

                    return (
                        <div 
                           key={col} 
                           className={`min-w-[340px] md:min-w-[420px] flex-1 bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] p-5 snap-center border-t-4 ${glowColor} border-x border-b border-white/50 dark:border-slate-700/50 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all duration-500 ease-out flex flex-col animate-fadeInUp`}
                           style={{animationDelay: `${cIdx * 100}ms`}}
                           onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-white/80', 'dark:bg-slate-800/80', 'shadow-2xl', 'scale-[1.02]', 'border-violet-400'); }}
                           onDragLeave={(e) => { e.currentTarget.classList.remove('bg-white/80', 'dark:bg-slate-800/80', 'shadow-2xl', 'scale-[1.02]', 'border-violet-400'); }}
                           onDrop={(e) => { e.currentTarget.classList.remove('bg-white/80', 'dark:bg-slate-800/80', 'shadow-2xl', 'scale-[1.02]', 'border-violet-400'); handleDrop(e, col); }}
                        >
                            <div className="flex items-center justify-between mb-6 px-3">
                                <h3 className="font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-3 text-lg">
                                   <div className={`w-3.5 h-3.5 rounded-full ${col === 'Pendiente' ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]' : col === 'Confirmado' ? 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]' : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]'}`}></div>
                                   {col} 
                                </h3>
                                <span className={`px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-sm border border-white/20 ${colColor}`}>{colEvents.length}</span>
                            </div>
                            
                            <div className="space-y-5 flex-1 overflow-y-auto pr-2 pb-10">
                                {colEvents.length === 0 && (
                                    <div className="border-2 border-dashed border-slate-300/50 dark:border-slate-700/50 rounded-3xl h-40 flex flex-col items-center justify-center text-slate-400 font-bold text-sm opacity-60">
                                        <Cloud size={32} className="mb-2" />
                                        Arrastra aquí
                                    </div>
                                )}
                                {colEvents.map((ev, i) => (
                                    <div 
                                        key={ev.id} 
                                        draggable 
                                        onDragStart={e => handleDragStart(e, ev.id)} 
                                        className="cursor-grab active:cursor-grabbing"
                                        title="Arrastra para cambiar el estado"
                                    >
                                        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2rem] p-6 shadow-sm border border-slate-200/60 dark:border-slate-700/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out relative overflow-hidden group">
                                            <div className="absolute top-0 left-0 bottom-0 w-1.5 transition-colors bg-slate-300 dark:bg-slate-700 group-hover:bg-violet-500"></div>
                                            <div className="pl-4">
                                                <p className="text-[11px] font-black uppercase tracking-widest text-violet-500 mb-1.5 flex items-center gap-2"><CalendarDays size={10}/> {ev.fecha ? String(ev.fecha).split('-').reverse().join('/') : ''}</p>
                                                <h4 className="font-black text-xl text-slate-800 dark:text-white capitalize truncate mb-2 tracking-tight">{ev.cliente}</h4>
                                                <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 truncate mb-4 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 p-2 rounded-lg w-max shadow-sm"><Sparkles size={12} className="text-amber-500"/> {ev.servicio}</p>
                                                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/50 pt-4 mt-2">
                                                    <p className="text-2xl font-black text-emerald-600 drop-shadow-sm">${safeNum(ev.total).toFixed(0)}</p>
                                                    <button type="button" onClick={() => openModal(ev)} className="bg-white dark:bg-slate-700 p-2.5 rounded-xl text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition-all duration-200 ease-in-out active:scale-95 hover:scale-105 shadow-sm border border-slate-100 dark:border-slate-600">
                                                        <Edit size={16}/>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        );
    };

    const btnClass = (mode) => `px-6 py-3 rounded-full text-[11px] uppercase tracking-widest font-black transition-all duration-300 ease-out whitespace-nowrap shadow-sm border ${viewMode===mode&&!filterDate?'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_8px_20px_rgba(124,58,237,0.3)] border-transparent scale-105':'bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 border-white/50 dark:border-slate-700/50 hover:shadow-md hover:-translate-y-0.5'}`;

    return (
      <div className="animate-fadeIn p-4 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-8 pb-32 relative">
        
        {/* HEADER MODERNO */}
        <div className="mb-10 flex flex-col gap-5">
            <div className="flex justify-between items-center">
                <div>
                   <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight drop-shadow-sm">Agenda</h2>
                   <p className="text-base font-semibold text-slate-500 dark:text-slate-400 mt-2">Organiza tus eventos con estilo</p>
                </div>
                <div className="flex gap-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl p-2 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-white/50 dark:border-slate-700/50">
                    <button type="button" onClick={() => {triggerHaptic('light'); setDisplayFormat('lista');}} className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ease-out flex items-center gap-2 ${displayFormat === 'lista' ? 'bg-white dark:bg-slate-800 shadow-md text-violet-600 dark:text-violet-400 scale-105' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}>
                        <Calendar size={18} /> <span className="hidden sm:inline">Lista</span>
                    </button>
                    <button type="button" onClick={() => {triggerHaptic('light'); setDisplayFormat('kanban');}} className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ease-out flex items-center gap-2 ${displayFormat === 'kanban' ? 'bg-white dark:bg-slate-800 shadow-md text-violet-600 dark:text-violet-400 scale-105' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}>
                        <Columns size={18} /> <span className="hidden sm:inline">Tablero</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-5 mt-4">
                 {/* Premium Search */}
                 <div className="relative flex-1 group">
                     <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                         <Search size={20} className="text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                     </div>
                     <input type="text" value={globalSearch} onChange={e=>setGlobalSearch(e.target.value)} placeholder="Buscar cliente, lugar, paquete..." className="w-full h-14 bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl border border-white/60 dark:border-slate-700/60 rounded-2xl pl-12 pr-12 text-base font-semibold outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.04)]" />
                     {globalSearch && <button type="button" onClick={() => setGlobalSearch('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-rose-500 transition-colors"><X size={18}/></button>}
                 </div>
                 
                 {/* Chips */}
                 <div className="flex gap-3 overflow-x-auto scrollbar-hide py-2 items-center">
                     <button type="button" onClick={()=>{setFilterDate(''); setViewMode('hoy')}} className={btnClass('hoy')}>Hoy</button>
                     <button type="button" onClick={()=>{setFilterDate(''); setViewMode('semana')}} className={btnClass('semana')}>Semana</button>
                     <button type="button" onClick={()=>{setFilterDate(''); setViewMode('mes')}} className={btnClass('mes')}>Mes</button>
                     <button type="button" onClick={()=>{setFilterDate(''); setViewMode('pendientes')}} className={btnClass('pendientes')}>Pendientes</button>
                     <button type="button" onClick={()=>{setFilterDate(''); setViewMode('todas')}} className={btnClass('todas')}>Todas</button>
                     
                     <div className={`flex items-center justify-between px-5 py-3 rounded-full transition-all duration-300 ease-out cursor-text focus-within:border-violet-500 bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl border ${filterDate ? 'border-violet-500 ring-2 ring-violet-500/10 shadow-md scale-105' : 'border-white/50 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:-translate-y-0.5'} shrink-0`}>
                         <div className="flex items-center flex-1 relative">
                             <CalendarDays size={18} className={`mr-2.5 ${filterDate ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'} transition-colors duration-200`} />
                             <input type="date" value={filterDate} onChange={(e) => { triggerHaptic('light'); setFilterDate(e.target.value); }} className={`bg-transparent text-[11px] uppercase tracking-widest font-black outline-none w-full flex-1 cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 absolute inset-0 opacity-0 z-20`} />
                             <span className={`text-[11px] uppercase tracking-widest font-black pointer-events-none relative z-10 ${filterDate ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500'}`}>{filterDate ? String(filterDate).split('-').reverse().join('/') : 'Fecha'}</span>
                         </div>
                         {filterDate && <button type="button" onClick={() => {triggerHaptic('light'); setFilterDate('');}} className="text-slate-400 hover:text-rose-500 ml-3 z-30 transition-all duration-200 active:scale-95 bg-white/50 dark:bg-slate-700/50 rounded-full p-1"><X size={14}/></button>}
                     </div>
                 </div>
            </div>
        </div>

        {/* Renderizado de Vistas */}
        {displayFormat === 'kanban' ? (
             renderKanbanView()
        ) : (
             <>
                 {renderCalendarGrid()}
                 {(!isDBReady && !globalSearch && !filterDate && eventosActivos.length === 0) ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8"><SkeletonCard /><SkeletonCard /></div>
                 ) : filtrados.length === 0 ? (
                      <EmptyState icon={Search} title="Sin resultados" message="No se encontraron reservas con los filtros o fechas seleccionadas." color="info" actionBtn={!!globalSearch || !!filterDate ? <button onClick={()=>{setGlobalSearch(''); setFilterDate(''); setViewMode('todas');}} className="mt-4 text-violet-600 font-black px-6 py-3 rounded-2xl border border-violet-200 bg-white/60 backdrop-blur-md hover:scale-105 active:scale-95 transition-all duration-300 ease-out shadow-sm uppercase tracking-widest text-[11px]">Limpiar filtros</button> : null} />
                 ) : (!!globalSearch || !!filterDate) ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">{filtrados.map((ev, i) => renderAgendaEventCard(ev, i))}</div>
                 ) : (
                      renderListView()
                 )}
             </>
        )}

        {/* FAB PREMIUM: Floating Action Button */}
        <button 
           onClick={() => {triggerHaptic('success'); openModal();}}
           className="fixed bottom-24 md:bottom-12 right-6 md:right-12 w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center text-white shadow-[0_10px_40px_rgba(124,58,237,0.4)] hover:shadow-[0_15px_50px_rgba(124,58,237,0.6)] hover:-translate-y-2 hover:scale-110 active:scale-90 transition-all duration-500 ease-out z-[90] border-t border-white/20 group overflow-hidden"
        >
           <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out pointer-events-none"></div>
           <Plus size={32} strokeWidth={2.5} className="relative z-10 transition-transform duration-500 ease-out group-hover:rotate-90 drop-shadow-md" />
        </button>

      </div>
    );
  };

  const renderClientes = () => {
     // Procesamiento del CRM
     const contactCandidates = enrichedClients.filter(c => c.needsContact).slice(0, 3);

     const filteredClients = enrichedClients.filter(c => {
         if(!searchTerm) return true; const s = searchTerm.toLowerCase();
         return String(c.nombre).toLowerCase().includes(s) || String(c.telefono).includes(s);
     });

     return (
       <div className="animate-fadeIn p-4 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-6 pb-32">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 drop-shadow-sm"><Users size={32} className="text-violet-500" /> CRM Ventas</h2>
          </div>

          {/* Panel: Sugeridos para Contactar Hoy */}
          {contactCandidates.length > 0 && !searchTerm && (
             <div className="mb-8 animate-slideDown">
                 <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><BellRing size={16} className="text-amber-500"/> Recomendado contactar hoy</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {contactCandidates.map((c, idx) => {
                        const phoneClean = String(c.telefono).replace(/\D/g,'');
                        const msg = encodeURIComponent(`¡Hola ${c.nombre}! 👋 Te saludamos de Diverty Eventos. Ha pasado un tiempo desde tu última fiesta. ¿Tienes alguna celebración próxima? ¡Tenemos nuevas promociones! 🎉`);
                        return (
                           <div key={`contact-${c.nombre}`} className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-white/50 dark:border-slate-700/50 flex justify-between items-center shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all duration-500 ease-out hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] animate-fadeInUp" style={{ animationFillMode: 'both', animationDelay: `${idx * 100}ms` }}>
                              <div className="min-w-0 pr-3">
                                 <p className="font-black text-slate-800 dark:text-white truncate text-lg tracking-tight">{c.nombre}</p>
                                 <p className="text-[11px] font-black text-amber-600 dark:text-amber-400 mt-1.5 uppercase tracking-widest">Hace {c.daysSince} días</p>
                              </div>
                              <button onClick={() => { triggerHaptic('success'); window.open(`https://wa.me/${phoneClean}?text=${msg}`, '_blank'); }} className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-2xl text-emerald-600 dark:text-emerald-400 transition-all duration-300 ease-out active:scale-95 hover:scale-110 shadow-sm border border-emerald-200/50 dark:border-emerald-500/20 shrink-0">
                                  <MessageCircle size={22}/>
                              </button>
                           </div>
                        )
                    })}
                 </div>
             </div>
          )}

          <div className={`${GLASS_CARD} p-4 flex transition-all duration-300 ease-out`}><div className="flex flex-1 relative group"><Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors duration-300 ease-out" /><input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar cliente por nombre o teléfono..." className="w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md py-4 pl-12 pr-10 rounded-2xl font-bold outline-none border border-white/40 dark:border-slate-700/50 focus:border-violet-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-300 ease-out text-base shadow-sm hover:shadow-md" />{searchTerm && (<button type="button" onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 p-2 rounded-xl bg-slate-200/50 dark:bg-slate-700 transition-all duration-200 ease-in-out active:scale-95 hover:scale-105"><X size={16}/></button>)}</div></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
             {filteredClients.length === 0 ? (
                 <div className="col-span-full">
                     <EmptyState icon={Users} title="Sin clientes a la vista" message="Aún no tienes clientes registrados o ninguno coincide con tu búsqueda." color="info" />
                 </div>
             ) : (
                 filteredClients.map((c, i) => {
                    const phoneClean = String(c.telefono).replace(/\D/g,'');
                    const isExpanded = expandedClientId === c.nombre;

                    const msgPromo = encodeURIComponent(`¡Hola ${c.nombre}! 😊 Te saludamos de Diverty Eventos. Tenemos nuevas promociones exclusivas en nuestros paquetes infantiles. ¿Te gustaría conocerlas? 🎉`);
                    const msgSeguimiento = encodeURIComponent(`¡Hola ${c.nombre}! 👋 Pasábamos a saludarte de Diverty Eventos. ¿Qué tal estuvo tu última fiesta con nosotros? ¡Nos encantaría saber de ti! ✨`);
                    const msgRecordatorio = encodeURIComponent(`¡Hola ${c.nombre}! 🥳 Te recordamos que en Diverty Eventos estamos listos para hacer de tu próxima celebración un día inolvidable. ¡Escríbenos cuando lo necesites! 🎈`);

                    return (
                        <div key={i} onClick={() => { triggerHaptic('light'); setExpandedClientId(isExpanded ? null : c.nombre); }} className={`${GLASS_CARD} p-6 flex flex-col relative overflow-hidden group transition-all duration-500 ease-out cursor-pointer hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] animate-fadeInUp`} style={{ animationFillMode: 'both', animationDelay: `${i * 50}ms` }}>
                            {c.isVIP && <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-bl-[100px] pointer-events-none -z-0"></div>}
                            
                            <div className="relative z-10 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-sm border transition-transform duration-500 ease-out group-hover:scale-110 ${c.isVIP ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/20' : 'bg-white/50 dark:bg-slate-800/40 text-violet-600 dark:text-violet-400 border-white/40 dark:border-slate-700/30'}`}>
                                        {c.isVIP ? <Award size={20} /> : String(c.nombre).charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <h4 className="font-black text-base sm:text-lg text-slate-800 dark:text-white capitalize truncate tracking-tight">{String(c.nombre)}</h4>
                                            {c.isVIP && <span className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shrink-0 border border-amber-200/50"><Star size={10}/> VIP</span>}
                                            {c.isFrecuente && <span className="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest shrink-0 border border-indigo-200/50">Frecuente</span>}
                                            {c.isNuevo && <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest shrink-0 border border-emerald-200/50">Nuevo</span>}
                                            {c.isInactivo && <span className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest shrink-0 border border-slate-200/50">Inactivo</span>}
                                        </div>
                                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Smartphone size={12} className="text-violet-500"/> {String(c.telefono) || 'Sin número'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-none drop-shadow-sm">${c.totalGastado.toFixed(0)}</p>
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">{c.eventos} Eventos</p>
                                    </div>
                                    <div className="sm:hidden text-right">
                                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">${c.totalGastado.toFixed(0)}</p>
                                    </div>
                                    <ChevronDown size={20} className={`text-slate-400 transition-transform duration-300 ease-out ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="relative z-10 mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-700/50 animate-fadeIn">
                                    {c.needsContact && (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 mb-5 flex items-start gap-3 shadow-sm">
                                            <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-300">Sugerido contactar</p>
                                                <p className="text-sm font-medium text-amber-600 dark:text-amber-400/80 mt-1 leading-tight">Han pasado {c.daysSince} días desde su último evento. Es un excelente momento para ofrecerle promociones.</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex sm:hidden justify-between items-center bg-white/50 dark:bg-slate-800/40 backdrop-blur-md p-3 rounded-xl mb-4 border border-white/40 dark:border-slate-700/30">
                                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Total Eventos</span>
                                        <span className="text-sm font-black text-slate-800 dark:text-slate-200">{c.eventos}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-white/50 dark:bg-slate-800/40 backdrop-blur-md p-4 rounded-2xl border border-white/40 dark:border-slate-700/30 shadow-sm">
                                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 block mb-2">Último Evento</span>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><CalendarDays size={14} className="text-violet-400"/>{c.ultimoEventoFecha ? String(c.ultimoEventoFecha).split('-').reverse().join('/') : 'Sin fecha'}</p>
                                        </div>
                                        <div className="bg-white/50 dark:bg-slate-800/40 backdrop-blur-md p-4 rounded-2xl border border-white/40 dark:border-slate-700/30 shadow-sm">
                                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 block mb-2">Estado</span>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 capitalize">
                                                <span className={`w-2 h-2 rounded-full ${String(c.ultimoEstado).toLowerCase() === 'completado' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                                {String(c.ultimoEstado) || 'Desconocido'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Acciones por WhatsApp</p>
                                        <div className="flex gap-2.5 mb-4">
                                            <button type="button" onClick={(e) => { e.stopPropagation(); triggerHaptic('success'); window.open(`https://wa.me/${phoneClean}?text=${msgPromo}`, '_blank'); }} className="flex-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:bg-emerald-500/10 dark:hover:bg-emerald-500 dark:text-emerald-400 dark:hover:text-white py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 ease-out active:scale-95 hover:-translate-y-0.5 flex flex-col items-center justify-center gap-2 border border-emerald-200/50 dark:border-emerald-500/20 hover:shadow-[0_8px_20px_rgba(16,185,129,0.3)]"><Sparkles size={16}/> Promo</button>
                                            <button type="button" onClick={(e) => { e.stopPropagation(); triggerHaptic('success'); window.open(`https://wa.me/${phoneClean}?text=${msgSeguimiento}`, '_blank'); }} className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white dark:bg-blue-500/10 dark:hover:bg-blue-500 dark:text-blue-400 dark:hover:text-white py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 ease-out active:scale-95 hover:-translate-y-0.5 flex flex-col items-center justify-center gap-2 border border-blue-200/50 dark:border-blue-500/20 hover:shadow-[0_8px_20px_rgba(59,130,246,0.3)]"><RefreshCw size={16}/> Seguir</button>
                                            <button type="button" onClick={(e) => { e.stopPropagation(); triggerHaptic('success'); window.open(`https://wa.me/${phoneClean}?text=${msgRecordatorio}`, '_blank'); }} className="flex-1 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white dark:bg-amber-500/10 dark:hover:bg-amber-500 dark:text-amber-400 dark:hover:text-white py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 ease-out active:scale-95 hover:-translate-y-0.5 flex flex-col items-center justify-center gap-2 border border-amber-200/50 dark:border-amber-500/20 hover:shadow-[0_8px_20px_rgba(245,158,11,0.3)]"><BellRing size={16}/> Recordar</button>
                                        </div>
                                        <AppButton variant="primary" icon={Plus} onClick={(e) => { e.stopPropagation(); openModal(); }} className="w-full py-4 text-[11px] uppercase tracking-widest">Nueva Reserva</AppButton>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                 })
             )}
          </div>
       </div>
     );
  };

  const renderFinanzas = () => {
      const progresoMeta = Math.min((stats.ingresosEsteMes / META_MENSUAL) * 100, 100);

      const eventosConDeuda = eventosActivos.filter(ev => {
          const est = normalizeText(ev.estado);
          return (safeNum(ev.total) - safeNum(ev.abono)) > 0 
              && est !== 'cancelado' 
              && est !== 'completado' 
              && est !== 'cotizacion';
      });

      const eventosParaBalance = eventosActivos.filter(ev => {
          const est = normalizeText(ev.estado);
          return est !== 'cancelado' && est !== 'cotizacion';
      });

      const totalIngresos = eventosParaBalance.reduce((acc, ev) => acc + safeNum(ev.total), 0);
      const totalGastos = eventosParaBalance.reduce((acc, ev) => acc + safeNum(ev.gastos), 0);
      const balanceTotal = totalIngresos - totalGastos;

      return (
          <div className="animate-fadeIn p-4 md:p-10 max-w-5xl mx-auto space-y-8 pb-32">
             <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
                 <div><h2 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight drop-shadow-sm"><PieChart size={36} className="text-emerald-500" /> Finanzas</h2><p className="text-slate-500 text-base mt-2 font-medium">Reportes y rentabilidad por evento.</p></div>
                 <AppButton variant="success" icon={FileSpreadsheet} onClick={downloadExcel} className="w-full sm:w-auto px-8 py-4 text-sm">
                    Exportar a Excel
                 </AppButton>
             </div>

             <div className="animate-slideDown">
                <h3 className="font-black text-xl text-slate-800 dark:text-white flex items-center gap-2 mb-5">
                   <TrendingUp className="text-violet-500" size={24} /> Flujo de Caja
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className={`${GLASS_CARD} p-6 flex flex-col justify-center relative overflow-hidden group transition-all duration-500 ease-out hover:-translate-y-1.5`}>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full transition-transform duration-500 ease-out group-hover:scale-125"></div>
                      <div className="flex items-center gap-3 mb-4 relative z-10"><div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 p-3 rounded-2xl shadow-sm border border-emerald-200/50 dark:border-emerald-700/50"><TrendingUp size={24} /></div><span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Ingresos Totales</span></div>
                      <p className="text-4xl font-black text-emerald-500 relative z-10 drop-shadow-sm">${totalIngresos.toFixed(2)}</p>
                   </div>
                   <div className={`${GLASS_CARD} p-6 flex flex-col justify-center relative overflow-hidden group transition-all duration-500 ease-out hover:-translate-y-1.5`}>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-bl-full transition-transform duration-500 ease-out group-hover:scale-125"></div>
                      <div className="flex items-center gap-3 mb-4 relative z-10"><div className="bg-rose-100 dark:bg-rose-900/30 text-rose-500 p-3 rounded-2xl shadow-sm border border-rose-200/50 dark:border-rose-700/50"><TrendingUp size={24} className="rotate-180" /></div><span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Gastos Acumulados</span></div>
                      <p className="text-4xl font-black text-rose-500 relative z-10 drop-shadow-sm">-${totalGastos.toFixed(2)}</p>
                   </div>
                   <div className={`${GLASS_CARD} p-6 flex flex-col justify-center relative overflow-hidden group transition-all duration-500 ease-out hover:-translate-y-1.5 ${balanceTotal >= 0 ? 'border-emerald-200 dark:border-emerald-800/50' : 'border-rose-200 dark:border-rose-800/50'}`}>
                      <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full transition-transform duration-500 ease-out group-hover:scale-125 ${balanceTotal >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}></div>
                      <div className="flex items-center gap-3 mb-4 relative z-10"><div className={`p-3 rounded-2xl shadow-sm border ${balanceTotal >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 border-emerald-200/50' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-500 border-rose-200/50'}`}><DollarSign size={24} /></div><span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Balance Neto</span></div>
                      <p className={`text-4xl font-black relative z-10 drop-shadow-sm ${balanceTotal >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>${balanceTotal.toFixed(2)}</p>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10">
                <div className={`${GLASS_CARD} p-8 col-span-1 sm:col-span-3 transition-all duration-500 ease-out hover:-translate-y-1`}>
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <h4 className="font-black text-2xl flex items-center gap-2"><Award size={28} className="text-amber-500"/> Meta Mensual</h4>
                            <p className="text-sm font-bold text-slate-500 mt-1">Objetivo: ${META_MENSUAL.toFixed(0)}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-5xl font-black text-emerald-500 drop-shadow-sm">${stats.ingresosEsteMes.toFixed(0)}</span>
                        </div>
                    </div>
                    <div className="w-full bg-slate-200/50 dark:bg-slate-800/50 rounded-full h-4 mt-6 shadow-inner overflow-hidden border border-slate-300/30 dark:border-slate-700/30">
                        <AnimatedProgress value={progresoMeta} />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mt-3 text-right">{progresoMeta.toFixed(1)}% completado</p>
                </div>
                
                <AppCard title="Ganancia Hoy" icon={DollarSign} iconColor="success">
                    <p className="text-5xl font-black text-slate-800 dark:text-white drop-shadow-sm">${animatedGananciaHoy.toFixed(0)}</p>
                </AppCard>

                <AppCard title="Semana" icon={CalendarDays} iconColor="primary">
                    <p className="text-5xl font-black text-slate-800 dark:text-white drop-shadow-sm">${stats.gananciaSemana.toFixed(0)}</p>
                </AppCard>

                <div className={`${GLASS_CARD} p-6 flex flex-col justify-center transition-all duration-500 ease-out hover:-translate-y-1.5`}>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-3">
                        <TrendingUp size={18} className="text-rose-500" strokeWidth={2.5} />
                        <span className="text-[11px] font-black uppercase tracking-widest opacity-80">Por Cobrar</span>
                    </div>
                    <p className="text-5xl font-black text-rose-500 drop-shadow-sm">${stats.deudaTotal.toFixed(0)}</p>
                </div>
             </div>
             
             {(() => {
                 const diasTranscurridos = todayObj.getDate();
                 const diasTotales = new Date(todayObj.getFullYear(), todayObj.getMonth() + 1, 0).getDate();
                 const promedioDiario = diasTranscurridos > 0 ? stats.ingresosEsteMes / diasTranscurridos : 0;
                 const proyeccion = promedioDiario * diasTotales;
                 const porcentajeReal = Math.min((proyeccion / META_MENSUAL) * 100, 100);
                 const diferencia = Math.abs(proyeccion - META_MENSUAL);
                 
                 const deudaPendiente = eventosActivos.reduce((acc, ev) => {
                     const est = normalizeText(ev.estado);
                     if (est !== 'cancelado' && est !== 'cotizacion') {
                         const debe = safeNum(ev.total) - safeNum(ev.abono);
                         return debe > 0 ? acc + debe : acc;
                     }
                     return acc;
                 }, 0);

                 let estadoColor = "";
                 let barColor = "";
                 let mensajePrincipal = "";
                 let miniInsight = "";

                 if (proyeccion >= META_MENSUAL) {
                     estadoColor = "text-emerald-600 bg-emerald-100 border-emerald-200/50 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50";
                     barColor = "bg-emerald-500";
                     mensajePrincipal = "Vas excelente este mes";
                 } else if (proyeccion >= META_MENSUAL * 0.8) {
                     estadoColor = "text-amber-600 bg-amber-100 border-amber-200/50 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50";
                     barColor = "bg-amber-500";
                     mensajePrincipal = "Vas en buen camino";
                 } else {
                     estadoColor = "text-rose-600 bg-rose-100 border-rose-200/50 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50";
                     barColor = "bg-rose-500";
                     mensajePrincipal = "Vas por debajo de la meta";
                 }

                 if (deudaPendiente > 0 && proyeccion < META_MENSUAL) {
                     miniInsight = `Tienes $${deudaPendiente.toFixed(0)} pendiente por cobrar, esto puede mejorar tu mes.`;
                 } else if (proyeccion < META_MENSUAL) {
                     miniInsight = "Necesitas más reservas para alcanzar la meta.";
                 } else {
                     miniInsight = "Buen ritmo, mantén este nivel.";
                 }

                 return (
                     <div className={`mt-10 ${GLASS_CARD} p-8 relative overflow-hidden group transition-all duration-500 ease-out hover:shadow-2xl hover:-translate-y-1.5 animate-slideDown`}>
                         <div className="flex flex-col md:flex-row justify-between gap-8 relative z-10">
                             <div className="flex-1">
                                 <div className="flex items-center gap-4 mb-5">
                                     <div className={`p-3.5 rounded-2xl shadow-sm border transition-transform duration-300 ease-out group-hover:scale-105 ${estadoColor}`}>
                                         <Zap size={28} />
                                     </div>
                                     <div>
                                         <h3 className="font-black text-2xl text-slate-800 dark:text-white tracking-tight">Proyección Fin de Mes</h3>
                                         <p className={`text-[11px] font-black uppercase tracking-widest mt-1 ${estadoColor.split(' ')[0]}`}>{mensajePrincipal}</p>
                                     </div>
                                 </div>
                                 
                                 <div className="flex items-end gap-5 mb-8">
                                     <p className="text-5xl font-black text-slate-800 dark:text-white leading-none drop-shadow-sm">
                                         ${proyeccion.toFixed(0)}
                                     </p>
                                     <div className="pb-1.5">
                                         {proyeccion >= META_MENSUAL ? (
                                             <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50 shadow-sm">
                                                 <TrendingUp size={14} /> +${diferencia.toFixed(0)} sobre meta
                                             </span>
                                         ) : (
                                             <span className="text-[11px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 flex items-center gap-2 bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 rounded-xl border border-rose-200/50 dark:border-rose-800/50 shadow-sm">
                                                 <TrendingUp size={14} className="rotate-180" /> Faltan ${diferencia.toFixed(0)}
                                             </span>
                                         )}
                                     </div>
                                 </div>

                                 <div className="w-full bg-slate-200/50 dark:bg-slate-700/50 rounded-full h-3 mb-3 shadow-inner overflow-hidden border border-slate-300/30 dark:border-slate-700/30">
                                     <AnimatedProgress value={porcentajeReal} />
                                 </div>
                                 <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-slate-500">
                                     <span>Día {diasTranscurridos} de {diasTotales}</span>
                                     <span>Meta: ${META_MENSUAL}</span>
                                 </div>
                             </div>

                             <div className="md:w-80 bg-white/50 dark:bg-slate-800/40 backdrop-blur-md rounded-3xl p-6 border border-white/40 dark:border-slate-700/30 flex flex-col justify-center shadow-sm">
                                 <div className="flex items-start gap-3">
                                     <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 p-2.5 rounded-xl border border-amber-200/50 dark:border-amber-800/50 shrink-0 mt-0.5 shadow-sm">
                                         <Info size={20} />
                                     </div>
                                     <div>
                                         <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">Insight Financiero</p>
                                         <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-snug">
                                             {miniInsight}
                                         </p>
                                     </div>
                                 </div>
                             </div>

                         </div>
                     </div>
                 );
             })()}

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
                <div className={`${GLASS_CARD} p-8 self-start transition-all duration-500 ease-out hover:-translate-y-1`}>
                   <h4 className="font-black text-2xl mb-6 flex items-center gap-3 tracking-tight"><AlertTriangle size={28} className="text-rose-500"/> Clientes con Deuda</h4>
                   <div className="space-y-4">
                      {eventosActivos.filter(ev => {
                           const est = normalizeText(ev.estado);
                           return (safeNum(ev.total) - safeNum(ev.abono)) > 0 && est !== 'cancelado' && est !== 'completado' && est !== 'cotizacion';
                      }).map((ev, i) => (
                           <div key={ev.id} className="flex justify-between items-center p-5 bg-white/50 dark:bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/40 dark:border-slate-700/30 transition-all duration-300 ease-out hover:border-rose-300 dark:hover:border-rose-500/50 animate-fadeInUp shadow-sm hover:shadow-md" style={{ animationFillMode: 'both', animationDelay: `${i * 50}ms` }}><div><p className="font-black capitalize text-lg text-slate-800 dark:text-white">{String(ev.cliente || '')}</p><p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mt-1.5 flex items-center gap-2"><CalendarDays size={12} className="text-violet-500"/> {ev.fecha ? String(ev.fecha).split('-').reverse().join('/') : 'Sin fecha'}</p></div><div className="text-right flex flex-col items-end"><span className="text-rose-600 font-black text-2xl">${(safeNum(ev.total) - safeNum(ev.abono)).toFixed(2)}</span><button type="button" onClick={() => sendWhatsAppCall(ev, 'recordatorio')} className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 hover:bg-rose-100 dark:text-rose-400 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 py-2 px-4 rounded-xl mt-2 transition-all duration-300 ease-out active:scale-95 hover:scale-105 border border-rose-200/50 dark:border-rose-800/50">Cobrar por WA</button></div></div>
                      ))}
                      {eventosActivos.filter(ev => {
                           const est = normalizeText(ev.estado);
                           return (safeNum(ev.total) - safeNum(ev.abono)) > 0 && est !== 'cancelado' && est !== 'completado' && est !== 'cotizacion';
                      }).length === 0 && <div className="p-10 text-center bg-white/50 dark:bg-slate-800/40 backdrop-blur-md rounded-3xl border border-white/40 dark:border-slate-700/30"><CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4"/><p className="text-[11px] font-black uppercase tracking-widest text-slate-500">No hay deudas pendientes.</p></div>}
                   </div>
                </div>

                <div className={`${GLASS_CARD} p-8 self-start transition-all duration-500 ease-out hover:-translate-y-1`}>
                   <div className="flex justify-between items-center mb-6"><h4 className="font-black text-2xl flex items-center gap-3 tracking-tight"><PieChart size={28} className="text-violet-500"/> Rentabilidad</h4></div>
                   <div className="flex gap-2 mb-8 bg-white/50 dark:bg-slate-800/40 backdrop-blur-md border border-white/40 dark:border-slate-700/30 p-1.5 rounded-2xl"><button type="button" onClick={() => setFinancePeriod('mes')} className={`flex-1 text-[11px] font-black uppercase tracking-widest py-3 rounded-xl transition-all duration-300 ease-out ${financePeriod === 'mes' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md scale-105' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-700/80'}`}>Este Mes</button><button type="button" onClick={() => setFinancePeriod('todos')} className={`flex-1 text-[11px] font-black uppercase tracking-widest py-3 rounded-xl transition-all duration-300 ease-out ${financePeriod === 'todos' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md scale-105' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-700/80'}`}>Histórico</button></div>
                   <div className="space-y-4">
                      {eventosActivos.filter(ev => {
                         const est = normalizeText(ev.estado);
                         return est !== 'cancelado' && est !== 'cotizacion' && safeNum(ev.total) > 0 && (financePeriod === 'todos' || (ev.fecha && String(ev.fecha).startsWith(`${todayObj.getFullYear()}-${String(todayObj.getMonth()+1).padStart(2,'0')}`)));
                      }).map((ev, i) => {
                         const tot = safeNum(ev.total); const gas = safeNum(ev.gastos); const isExpanded = expandedFinanceId === ev.id;
                         return (
                           <div key={ev.id} className="flex flex-col bg-white/50 dark:bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/40 dark:border-slate-700/30 overflow-hidden transition-all duration-300 ease-out hover:border-violet-300 dark:hover:border-violet-700/50 animate-fadeInUp shadow-sm hover:shadow-md" style={{ animationFillMode: 'both', animationDelay: `${i * 50}ms` }}>
                              <button type="button" onClick={() => setExpandedFinanceId(isExpanded ? null : ev.id)} className="flex justify-between items-center p-5 hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors duration-300 ease-out w-full text-left"><div><p className="font-black capitalize text-lg text-slate-800 dark:text-white tracking-tight">{String(ev.cliente || '')}</p><p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mt-1.5 flex items-center gap-2"><CalendarDays size={12} className="text-violet-500"/> {ev.fecha ? String(ev.fecha).split('-').reverse().join('/') : ''} • {String(ev.tipoEvento || '')}</p></div><div className="flex items-center gap-5"><div className="text-right"><span className="font-black text-emerald-600 text-xl block leading-none">${(tot-gas).toFixed(2)}</span>{gas > 0 && <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 mt-2 block leading-none">Con Gastos</span>}</div><ChevronDown size={20} className={`text-slate-400 transition-transform duration-300 ease-out ${isExpanded ? 'rotate-180' : ''}`}/></div></button>
                              {isExpanded && <div className="px-5 pb-5 animate-fadeIn"><div className="bg-white/60 dark:bg-slate-900/60 p-5 rounded-2xl grid grid-cols-2 gap-5 border border-white/40 dark:border-slate-700/30 shadow-inner"><div><span className="text-[10px] text-slate-500 uppercase tracking-widest font-black block mb-1.5">Ingreso Bruto</span><span className="text-emerald-600 font-black text-lg">+${tot.toFixed(2)}</span></div><div><span className="text-[10px] text-slate-500 uppercase tracking-widest font-black block mb-1.5">Gastos Totales</span><span className="text-rose-500 font-black text-lg">-${gas.toFixed(2)}</span></div>{ev.detalleGastos && <div className="col-span-2 mt-3 border-t border-slate-200/50 dark:border-slate-700/50 pt-4"><span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-2">Desglose de Gastos:</span><p className="text-slate-700 dark:text-slate-300 font-medium text-sm leading-relaxed">{String(ev.detalleGastos || '')}</p></div>}</div></div>}
                           </div>
                         )
                      })}
                   </div>
                </div>
             </div>
          </div>
      );
  };

  const renderConfig = () => (
      <div className="animate-fadeIn p-4 md:p-10 max-w-2xl mx-auto space-y-6 pb-32">
          <div><h2 className="text-3xl font-black text-slate-900 dark:text-white">Ajustes</h2><p className="text-slate-500 text-sm mt-1 font-medium">Configuración del sistema.</p></div>
          <div className={`${GLASS_CARD} p-8 space-y-8 animate-fadeInUp`}>
             <div className="bg-emerald-50 dark:bg-emerald-900/30 p-6 rounded-2xl flex items-start gap-4 transition-all duration-300 ease-out hover:scale-[1.02] border border-emerald-100 dark:border-emerald-800/50"><CheckCircle2 className="text-emerald-500 mt-0.5" size={28} /><div><p className="font-black text-emerald-900 dark:text-emerald-100 mb-1 text-lg">Nube Activa</p><p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Tus datos están asegurados y sincronizados.</p></div></div>
             <div className="pt-6 border-t border-slate-200/50 dark:border-slate-700/50"><h3 className="font-black text-lg flex items-center mb-4 text-slate-800 dark:text-white tracking-tight">{isDarkMode ? <Moon size={20} className="mr-2 text-violet-400"/> : <Sun size={20} className="mr-2 text-amber-500"/>} Apariencia</h3><button type="button" onClick={toggleDarkMode} className="w-full py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest bg-white/60 hover:bg-white dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-white/40 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 transition-all duration-300 ease-out active:scale-95 hover:scale-105 shadow-sm">{isDarkMode ? 'Activar Modo Claro ☀️' : 'Activar Modo Oscuro 🌙'}</button></div>
             <div className="pt-6 border-t border-slate-200/50 dark:border-slate-700/50"><h3 className="font-black text-lg text-rose-500 flex items-center mb-4 tracking-tight"><Trash2 size={20} className="mr-2"/> Limpiar Datos</h3><button type="button" onClick={handleWipeAll} className="w-full py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest bg-rose-50/80 hover:bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 transition-all duration-300 ease-out active:scale-95 hover:scale-105 border border-rose-200/50 dark:border-rose-800/50 shadow-sm">Borrar TODAS las reservas</button></div>
             <div className="pt-6 border-t border-slate-200/50 dark:border-slate-700/50"><h3 className="font-black text-lg text-slate-600 dark:text-slate-300 flex items-center mb-4 tracking-tight"><Lock size={20} className="mr-2"/> Seguridad</h3><button type="button" onClick={handleLogout} className="w-full py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest bg-white/60 hover:bg-white dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-white/40 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 transition-all duration-300 ease-out active:scale-95 hover:scale-105 shadow-sm">Cerrar Sesión</button></div>
          </div>
      </div>
  );

  const renderPDFView = () => {
    if (!printData) return null;
    const isFact = printType === 'factura'; const isCot = printType === 'cotizacion';
    const tot = safeNum(printData.total); const trn = safeNum(printData.transporte); const abo = safeNum(printData.abono); const sub = (tot - trn).toFixed(2);
    const clienteStr = String(printData.cliente || 'Sin Nombre'); const telefonoStr = String(printData.telefono || '-'); const emailStr = String(printData.email || ''); const rucStr = String(printData.ruc || ''); const ubicacionStr = String(printData.ubicacion || 'Panamá Centro'); const direccionStr = String(printData.direccion || '');
    let fechaDoc = String(printData.fecha || ''); if (fechaDoc.includes('-')) fechaDoc = fechaDoc.split('-').reverse().join('/');
    const horaStr = String(formatTime12h(printData.hora));
    const servsArray = (Array.isArray(printData.serviciosSeleccionados) && printData.serviciosSeleccionados.length > 0) ? printData.serviciosSeleccionados : [{ nombre: String(printData.servicio || 'Servicio'), precio: sub, cantidad: 1, descripcion: String(printData.comentarios || '') }];
    const sortedEvents = [...eventosActivos].sort((a,b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    const eventIndex = sortedEvents.findIndex(e => String(e.id) === String(printData.id));
    const invoiceNumReal = eventIndex !== -1 ? eventIndex + 1 : sortedEvents.length + 1;
    const numRef = isCot ? `COT-${String(invoiceNumReal).padStart(5, '0')}` : `FAC-${String(invoiceNumReal).padStart(5, '0')}`;
    const servicioLimpioContrato = servsArray.map(s => { const cant = Number(s.cantidad) || 1; return `${String(s.nombre)} (${cant} ${cant === 1 ? 'Hora' : 'Horas'})`; }).join(' + ');

    return (
      <div className="bg-slate-900 min-h-screen text-slate-900 flex flex-col font-sans overflow-x-hidden animate-fadeIn relative">
        <style>{`@media print { body * { visibility: hidden; } #pdf-wrapper-scaler, #pdf-wrapper-scaler * { visibility: visible; } #pdf-wrapper-scaler { position: absolute; left: 0; top: 0; width: 100%; transform: scale(1) !important; margin: 0; } .print\\:hidden { display: none !important; } @page { size: auto; margin: 0mm; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }`}</style>
        <div className="sticky top-0 bg-slate-900/90 backdrop-blur-md shadow-lg flex justify-between items-center z-50 print:hidden border-b border-slate-800 p-4">
          <button type="button" onClick={() => setIsPrinting(false)} className="text-white flex items-center font-bold transition-colors duration-200 ease-in-out hover:text-indigo-400"><X size={20} className="mr-1"/> Atrás</button>
          <div className="flex gap-2">
             <button type="button" onClick={() => sendWhatsAppCall(printData, isCot ? 'cotizacion' : 'recibo')} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold flex items-center transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"><MessageCircle size={16} className="mr-2"/> WhatsApp</button>
             <button type="button" onClick={printNativePDF} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/30"><Printer size={16} className="mr-2"/> Guardar PDF</button>
          </div>
        </div>
        <div className="w-full flex-1 flex justify-center pb-12 overflow-hidden pt-8 bg-slate-900">
          <div id="pdf-wrapper-scaler" style={{ transform: `scale(${pdfScale})`, transformOrigin: 'top center', width: '800px' }}>
            {isFact || isCot ? (
              <div id="pdf-content" className="bg-white w-[800px] min-h-[1131px] h-auto relative overflow-hidden font-sans text-slate-800 pb-16 flex flex-col shadow-2xl">
                 <div className="bg-[#BE1622] text-white px-12 py-10 flex justify-between items-center h-[200px]">
                    <div className="flex flex-col items-start w-1/3">
                       <div className="bg-white p-3 rounded-2xl shadow-sm border-[3px] border-white/80 mb-3 inline-flex items-center justify-center"><img src={LOGO_URL} alt="Diverty Eventos Panamá" className="h-16 w-auto object-contain" crossOrigin="anonymous" /></div>
                       <p className="text-[10px] font-medium tracking-wide opacity-90 pl-1">Diversión que crea recuerdos</p>
                    </div>
                    <div className="flex flex-col gap-2.5 text-[10px] border-l border-white/30 pl-8 w-1/3 font-medium">
                       <div className="flex items-center gap-2"><MapPin size={14}/> Panamá, Ciudad de Panamá</div><div className="flex items-center gap-2"><Smartphone size={14}/> {DATOS_EMPRESA.telefono}</div>
                       <div className="flex items-center gap-2"><MessageSquareText size={14}/> {DATOS_EMPRESA.email}</div><div className="flex items-center gap-2"><Navigation size={14}/> {DATOS_EMPRESA.web}</div>
                    </div>
                    <div className="flex flex-col items-end gap-3 w-1/3">
                       <h1 className="text-[34px] font-black uppercase tracking-widest">{isCot ? 'COTIZACIÓN' : 'FACTURA'}</h1>
                       <div className="bg-white text-[#BE1622] px-5 py-2 rounded-full text-[12px] font-black w-48 text-center shadow-sm">Nº: {numRef}</div>
                       <div className="bg-white text-[#BE1622] px-5 py-2 rounded-full text-[12px] font-black w-48 text-center shadow-sm">Fecha: {fechaDoc || 'Pendiente'}</div>
                    </div>
                 </div>
                 <div className="px-12 py-8 flex justify-between items-start">
                    <div className="w-1/2 pt-1">
                       <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide">{clienteStr}</h2><p className="text-[11px] text-slate-600 mt-1">{telefonoStr}</p>
                       {emailStr && <p className="text-[11px] text-slate-600 mt-0.5">{emailStr}</p>}{rucStr && <p className="text-[11px] font-bold text-slate-700 mt-1">RUC: {rucStr}</p>}
                    </div>
                    <div className="w-1/2 text-right">
                       {!isCot && <p className="text-lg font-black text-[#BE1622] mb-5 uppercase tracking-wide">SALDO ADEUDADO ${(tot - abo).toFixed(2)}</p>}
                       {isCot && <p className="text-lg font-black text-[#BE1622] mb-5 uppercase tracking-wide">MONTO TOTAL ${tot.toFixed(2)}</p>}
                       <table className="ml-auto text-[10px] text-slate-500 text-right border-separate border-spacing-x-4 border-spacing-y-1.5"><tbody>
                             <tr><td>N.º de {isCot ? 'cotización' : 'factura'}</td><td className="font-bold text-slate-700">{numRef}</td></tr>
                             <tr><td>Fecha de la {isCot ? 'cotización' : 'factura'}</td><td className="font-bold text-slate-700">{fechaDoc || 'Pendiente'}</td></tr>
                             <tr><td>Términos</td><td className="font-bold text-slate-700">Personalizada</td></tr>
                       </tbody></table>
                    </div>
                 </div>
                 <div className="px-12 mt-2 flex-1">
                    <div className="border border-[#BE1622] rounded-xl overflow-hidden shadow-sm">
                         <table className="w-full text-left text-[13px]">
                             <thead className="bg-[#BE1622] text-white"><tr><th className="py-3 px-6 font-bold uppercase text-center tracking-widest w-1/3">ARTÍCULO</th><th className="py-3 px-6 font-bold uppercase tracking-widest text-center border-l border-white/30 w-1/2">DESCRIPCIÓN</th><th className="py-3 px-6 font-bold uppercase text-center tracking-widest border-l border-white/30 w-1/6">TOTAL</th></tr></thead>
                             <tbody className="divide-y divide-[#BE1622]/20">
                                 {servsArray.map((s, i) => {
                                     const cant = Number(s.cantidad) || 1; const precioUnitario = safeNum(s.precio) / cant; const descLines = String(s.descripcion || 'Servicio de animación para eventos').split('\n');
                                     return (
                                     <tr key={i} className="bg-white">
                                         <td className="py-6 px-6 text-center border-r border-[#BE1622]/20 align-top"><div className="flex justify-center mb-3 text-[#BE1622]"><Star size={28} strokeWidth={1.5}/></div><p className="font-black text-slate-900 text-[14px] leading-tight">{String(s.nombre)}</p><p className="font-black text-[#BE1622] text-[12px] mt-1">- {cant} {cant === 1 ? 'Hora' : 'Horas'} -</p><p className="text-[10px] text-slate-500 font-bold mt-1.5">Animación Infantil</p></td>
                                         <td className="py-6 px-8 border-r border-[#BE1622]/20 align-top">
                                             <div className="text-slate-700 text-[12px] leading-relaxed space-y-2">{descLines.map((line, j) => { const tLine = String(line).trim(); if(tLine.startsWith('•') || tLine.startsWith('-')) return <div key={j} className="flex items-start gap-2 font-bold"><CheckCircle2 size={14} className="text-[#BE1622] fill-[#BE1622]/10 shrink-0 mt-[1px]"/> <span>{tLine.replace(/^[•-]\s*/, '')}</span></div>; return <div key={j} className="mb-3 text-slate-600">{tLine}</div>; })}</div>
                                         </td>
                                         <td className="py-6 px-6 text-center align-middle"><p className="font-black text-slate-900 text-xl">B/. {safeNum(s.precio).toFixed(2)}</p><p className="text-[10px] text-slate-400 mt-1">{cant.toFixed(2)} x B/. {precioUnitario.toFixed(2)}</p></td>
                                     </tr>
                                 )})}
                                 {trn > 0 && (<tr className="bg-white"><td className="py-6 px-6 text-center border-r border-[#BE1622]/20 align-middle"><div className="flex justify-center mb-3 text-[#BE1622]"><MapIcon size={28} strokeWidth={1.5}/></div><p className="font-black text-slate-900 text-[14px]">Transporte</p><p className="text-[10px] text-slate-500 font-bold mt-1.5">Logística</p></td><td className="py-6 px-8 border-r border-[#BE1622]/20 align-middle text-[12px] text-slate-700 leading-relaxed font-bold"><div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#BE1622] fill-[#BE1622]/10 shrink-0"/> <span>Cargo por viáticos a zona: {ubicacionStr}</span></div></td><td className="py-6 px-6 text-center align-middle"><p className="font-black text-slate-900 text-xl">B/. {trn.toFixed(2)}</p></td></tr>)}
                             </tbody>
                         </table>
                     </div>
                 </div>
                 <div className="px-12 mt-8 flex justify-between items-start gap-8 flex-1">
                     <div className="w-[50%]"><div className="flex items-center gap-2 mb-2 text-[#BE1622]"><div className="bg-[#BE1622] text-white p-1.5 rounded-lg"><Receipt size={16}/></div><h3 className="font-black uppercase tracking-wider text-[14px]">NOTAS</h3></div><div className="border-b-2 border-[#BE1622]/20 mb-3 w-full"></div><div className="text-[11px] font-medium text-slate-700 leading-relaxed space-y-1.5"><p>Gracias por confiar en Diverty Eventos Panamá.</p><p>El saldo pendiente debe ser cancelado antes o al finalizar el evento.</p><p>Para pagos aceptamos: Yappy, Transferencia Bancaria o Efectivo.</p></div></div>
                     <div className="w-[45%] flex flex-col items-end"><div className="w-full border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm"><div className="flex justify-between items-center py-3.5 px-6 border-b border-slate-200 text-[14px]"><span className="font-bold text-slate-600">Subtotal:</span><span className="font-black text-slate-900">B/. {tot.toFixed(2)}</span></div>{!isCot && abo > 0 && <div className="flex justify-between items-center py-3.5 px-6 border-b border-slate-200 text-[14px]"><span className="font-bold text-slate-600">Abono:</span><span className="font-black text-emerald-600">- B/. {abo.toFixed(2)}</span></div>}<div className="bg-[#BE1622] text-white py-6 px-6 text-center"><span className="block text-[12px] uppercase tracking-widest font-bold mb-1">{isCot ? 'TOTAL ESTIMADO:' : 'TOTAL PENDIENTE:'}</span><span className="block text-[42px] font-black leading-none pb-1">B/. {isCot ? tot.toFixed(2) : (tot - abo).toFixed(2)}</span></div></div></div>
                 </div>
                 <div className="px-12 mt-auto pb-10">
                     <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 flex justify-between items-stretch text-[10px] shadow-sm">
                         <div className="flex gap-3 w-[35%] border-r border-slate-300 border-dashed pr-4"><div className="text-[#BE1622] mt-0.5"><DollarSign size={20} className="border-[2px] border-[#BE1622] rounded-full p-[2px]"/></div><div className="text-[10px] leading-snug space-y-0.5"><h4 className="font-black text-[#BE1622] uppercase tracking-wider mb-1.5 text-[11px]">MÉTODOS DE PAGO</h4><p className="font-bold text-slate-900">Yappy: <span className="font-medium text-slate-600">{DATOS_EMPRESA.telefono}</span></p><p className="font-bold text-slate-900">Banco General - <span className="font-medium text-slate-600">{DATOS_EMPRESA.tipoCuenta}</span></p><p className="font-bold text-slate-900">Nº: <span className="font-medium text-slate-600">{DATOS_EMPRESA.numeroCuenta}</span></p><p className="font-bold text-slate-900">Titular: <span className="font-medium text-slate-600">{DATOS_EMPRESA.nombreTitular}</span></p></div></div>
                         <div className="flex gap-3 w-[35%] border-r border-slate-300 border-dashed px-5"><div className="text-[#BE1622] mt-0.5"><CheckCircle2 size={20}/></div><div className="text-[10px] leading-snug"><h4 className="font-black text-[#BE1622] uppercase tracking-wider mb-1.5 text-[11px]">GARANTÍA DE SERVICIO</h4><p className="font-medium text-slate-600 leading-relaxed">Nuestro compromiso es brindarte la mejor experiencia. Si tienes alguna duda o cambio, contáctanos con tiempo.</p></div></div>
                         <div className="flex flex-col items-center justify-center w-[30%] pl-4"><div className="text-[#BE1622] flex items-center gap-1.5 mb-2 font-black text-[12px]"><Award size={16}/> ¡GRACIAS!</div><h3 className="text-2xl text-slate-800" style={{fontFamily: "'Brush Script MT', 'Dancing Script', cursive, serif", fontStyle: "italic"}}>Diverty Eventos</h3><p className="text-slate-500 font-medium text-[10px] mt-1 text-center">Diversión que crea recuerdos</p></div>
                     </div>
                 </div>
              </div>
            ) : (
              <div id="pdf-content" className="bg-white w-[800px] min-h-[1131px] h-auto relative overflow-hidden font-sans text-slate-800 p-12 flex flex-col">
                 <div className="flex justify-between items-end border-b-[3px] border-slate-900 pb-6 mb-10"><div><img src={LOGO_URL} alt="Diverty Eventos" className="h-16 object-contain" crossOrigin="anonymous" /></div><div className="text-right"><h1 className="text-[26px] font-black text-slate-900 tracking-widest uppercase">CONTRATO DE SERVICIOS</h1><p className="text-sm text-slate-500 mt-1 font-bold">Ref: {numRef}  |  Fecha: {fechaDoc}</p></div></div>
                 <div className="grid grid-cols-2 gap-10 mb-12">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2 flex items-center gap-2"><Users size={14}/> Datos del Cliente</h3><div className="space-y-3 text-[13px] font-medium"><div className="flex justify-between"><span className="text-slate-500">Nombre:</span> <span className="text-slate-900 font-bold capitalize text-right">{clienteStr}</span></div><div className="flex justify-between"><span className="text-slate-500">Teléfono:</span> <span className="text-slate-900 text-right">{telefonoStr}</span></div>{emailStr && <div className="flex justify-between"><span className="text-slate-500">Email:</span> <span className="text-slate-900 text-right truncate w-40">{emailStr}</span></div>}{rucStr && <div className="flex justify-between"><span className="text-slate-500">RUC:</span> <span className="text-slate-900 text-right">{rucStr}</span></div>}</div></div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2 flex items-center gap-2"><MapPin size={14}/> Detalles del Evento</h3><div className="space-y-3 text-[13px] font-medium"><div className="flex justify-between"><span className="text-slate-500">Fecha:</span> <span className="text-slate-900 font-bold text-right">{fechaDoc}</span></div><div className="flex justify-between"><span className="text-slate-500">Horario:</span> <span className="text-slate-900 text-right">{horaStr}</span></div><div className="flex justify-between"><span className="text-slate-500">Lugar:</span> <span className="text-slate-900 capitalize text-right truncate w-40">{ubicacionStr}</span></div>{direccionStr && <div className="text-slate-600 text-xs italic text-right mt-1 line-clamp-2">{direccionStr}</div>}</div></div>
                 </div>
                 <div className="mb-10"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2 flex items-center gap-2"><Sparkles size={14}/> Servicios Contratados</h3><div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 text-center"><p className="text-[15px] text-indigo-900 font-bold leading-relaxed capitalize">{servicioLimpioContrato}</p></div></div>
                 <div className="mb-10 flex-1"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2 flex items-center gap-2"><FileSignature size={14}/> Términos y Condiciones</h3><div className="text-[13px] text-slate-700 space-y-6 leading-relaxed text-justify"><div><span className="font-black text-slate-900">1. OBLIGACIONES DEL SERVICIO:</span><p className="mt-1">Diverty Eventos se compromete a cumplir con puntualidad y profesionalismo el servicio detallado. El Cliente deberá proporcionar un espacio adecuado y seguro para la realización de las actividades. Finalizado el contrato si el cliente desea adicionar tiempo tendrá un costo adicional.</p></div><div><span className="font-black text-slate-900">2. CONDICIONES DE PAGO:</span><div className="mt-1">{abo > 0 ? (<p>El Cliente acuerda pagar un valor total de B/. <span className="font-bold">{tot.toFixed(2)}</span>, del cual ha entregado un anticipo de B/. <span className="font-bold">{abo.toFixed(2)}</span>. El saldo pendiente de B/. <span className="font-bold underline">{(tot - abo).toFixed(2)}</span> deberá ser cancelado antes o al finalizar el evento mediante YAPPY, TRANSFERENCIA BANCARIA O EFECTIVO. El anticipo no es reembolsable en caso de cancelación.</p>) : (<p>El Cliente acuerda pagar el valor total de B/. <span className="font-bold underline">{tot.toFixed(2)}</span> al finalizar el evento mediante YAPPY, TRANSFERENCIA BANCARIA O EFECTIVO.</p>)}</div></div><div><span className="font-black text-slate-900">3. CANCELACIONES Y POLÍTICAS:</span><p className="mt-1">Cualquier modificación debe ser comunicada con un mínimo de (3) días de anticipación. En caso de posponer el evento por fuerza mayor, el cliente podrá reprogramar según disponibilidad. Diverty Eventos no se responsabiliza por incidentes ajenos a su control durante el evento.</p></div><div><span className="font-black text-slate-900">4. DERECHOS DE IMAGEN:</span><p className="mt-1">Al firmar este contrato, el cliente autoriza el uso de imágenes o videos del evento con fines estrictamente promocionales para la empresa, salvo notificación previa en contrario.</p></div></div></div>
                 <div className="mt-auto pt-10 flex justify-between items-end pb-8 px-10"><div className="w-[40%] text-center"><div className="border-t-2 border-slate-300 pt-3"><p className="font-bold text-sm text-slate-900 uppercase truncate">{clienteStr}</p><p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Firma del Cliente</p></div></div><div className="w-[40%] text-center"><div className="border-t-2 border-slate-300 pt-3"><p className="font-bold text-sm text-slate-900 uppercase truncate">{DATOS_EMPRESA.nombreTitular}</p><p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Diverty Eventos Panamá</p></div></div></div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER PRINCIPAL DEL SISTEMA
  // ==========================================
  if (isPrinting && printData) return renderPDFView();
  if (!isAuthenticated) return renderLogin();

  return (
    <div className={`font-outfit ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} min-h-screen flex overflow-hidden selection:bg-violet-200 transition-colors duration-300`}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap'); .font-outfit{font-family:'Outfit',sans-serif;} @keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}} @keyframes slideDown{from{transform:translateY(-100%)}to{transform:translateY(0)}} @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } } .animate-float { animation: float 3s ease-in-out infinite; } @keyframes confettiFall{0%{transform:translateY(-10vh) rotate(0deg) scale(1);opacity:1;}100%{transform:translateY(110vh) rotate(720deg) scale(0.5);opacity:0;}} .animate-confettiFall{animation-name:confettiFall;animation-timing-function:cubic-bezier(0.25,0.46,0.45,0.94);animation-fill-mode:forwards;} .animate-slideDown{animation:slideDown 0.4s cubic-bezier(0.16,1,0.3,1) forwards;} .animate-fadeIn{animation:fadeIn 0.3s ease-out forwards;} .animate-slideUp{animation:slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards;} @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } } .animate-fadeInUp { animation: fadeInUp 0.5s ease-out forwards; opacity: 0; } @keyframes shimmer { 100% { transform: translateX(100%); } } @keyframes blob { 0% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } } .animate-blob { animation: blob 7s infinite; } .animation-delay-2000 { animation-delay: 2s; } ::-webkit-scrollbar{width:6px;height:6px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:10px;} .scrollbar-hide::-webkit-scrollbar{display:none;} .scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none;} input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}`}</style>

      {showConfetti && <Confetti />}

      {toastAlert.isOpen && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100000] w-[90%] max-w-sm animate-slideDown"><div className={`backdrop-blur-xl px-5 py-4 rounded-2xl shadow-xl flex items-center gap-2 border text-white transition-all duration-300 ease-out ${toastAlert.success ? `${getColor('success')} border-emerald-400` : `${getColor('danger')} border-rose-400`}`}>{toastAlert.success ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}<p className="text-base font-black">{toastAlert.message}</p></div></div>}
      
      {confirmModal.isOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex justify-center items-center p-4 animate-fadeIn"><div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center border border-white/50 dark:border-slate-700/50 transition-all duration-300 ease-out">{confirmModal.type === 'delete' ? <Trash2 size={64} className="mx-auto text-rose-500 mb-6 drop-shadow-sm" /> : <AlertTriangle size={64} className="mx-auto text-amber-500 mb-6 drop-shadow-sm" />}<h3 className="text-2xl font-black mb-2 text-slate-800 dark:text-white tracking-tight">{confirmModal.message}</h3><div className="flex gap-4 mt-8"><button type="button" onClick={() => setConfirmModal({isOpen:false, message:'', onConfirm:null, type:'delete'})} className="w-1/2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-black py-4 rounded-2xl text-slate-700 dark:text-slate-300 transition-all duration-300 ease-out hover:scale-105 active:scale-95">Cancelar</button><button type="button" onClick={() => { confirmModal.onConfirm(); setConfirmModal({isOpen:false, message:'', onConfirm:null, type:'delete'}); }} className={`w-1/2 text-white font-black py-4 rounded-2xl transition-all duration-300 ease-out hover:scale-105 active:scale-95 shadow-md ${confirmModal.type === 'delete' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30' : 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/30'}`}>{confirmModal.type === 'delete' ? 'Eliminar' : 'Confirmar'}</button></div></div></div>}
      
      {isCustomServiceModalOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex justify-center items-center p-4 animate-fadeIn"><div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-slate-700/50 max-w-sm w-full transition-all duration-300 ease-out"><h3 className="text-2xl font-black mb-6 text-slate-800 dark:text-white tracking-tight">Añadir Servicio Extra</h3><input type="text" value={customServiceData.nombre} onChange={e=>setCustomServiceData({...customServiceData,nombre:e.target.value})} className="w-full bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-4 text-base font-bold outline-none focus:border-violet-500 transition-all duration-300 ease-out mb-4 shadow-sm" placeholder="Nombre (Ej: Animador)" /><input type="number" value={customServiceData.precio} onChange={e=>setCustomServiceData({...customServiceData,precio:e.target.value})} className="w-full bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-4 text-base font-bold outline-none focus:border-violet-500 transition-all duration-300 ease-out mb-8 shadow-sm" placeholder="Precio ($)" /><div className="flex gap-4"><button type="button" onClick={()=>setIsCustomServiceModalOpen(false)} className="w-1/2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-black py-4 rounded-2xl transition-all duration-300 ease-out hover:scale-105 active:scale-95 text-slate-700 dark:text-slate-300">Cancelar</button><button type="button" onClick={handleAddCustomService} className="w-1/2 bg-violet-600 hover:bg-violet-700 text-white font-black py-4 rounded-2xl shadow-[0_8px_20px_rgba(124,58,237,0.3)] transition-all duration-300 ease-out hover:scale-105 active:scale-95">Añadir</button></div></div></div>}

      {isModalOpen && (
        <div className="fixed inset-0 z-[9998] bg-slate-900/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl w-full h-[92vh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] flex flex-col overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-slideUp relative transition-all duration-300 ease-out border border-white/50 dark:border-slate-700/50">
             <div className="md:hidden w-full flex justify-center pt-4 pb-2 bg-transparent rounded-t-[2.5rem]"><div className="w-16 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full"></div></div>
             <div className="p-6 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center bg-transparent z-20">
                <h3 className="font-black text-slate-800 dark:text-white text-2xl flex items-center gap-2 tracking-tight">{currentEvento ? <Edit size={28} className="text-violet-500 drop-shadow-md"/> : (isCotizacionMode ? <FileText size={28} className="text-amber-500 drop-shadow-md"/> : <Plus size={28} className="text-violet-500 drop-shadow-md"/>)} {currentEvento ? 'Editar Reserva' : (isCotizacionMode ? 'Cotización Rápida' : 'Nueva Reserva')}</h3>
                <div className="flex gap-2">
                   {!currentEvento && !isCotizacionMode && (
                       <button type="button" onClick={clearDraft} className="p-3 bg-rose-50/50 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded-2xl transition-all duration-300 ease-out hover:scale-105 active:scale-95 border border-transparent hover:border-rose-200/50" title="Limpiar formulario">
                           <Trash2 size={20}/>
                       </button>
                   )}
                   {currentEvento && <button type="button" onClick={handleDuplicate} className="p-3 bg-violet-50/50 hover:bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 rounded-2xl transition-all duration-300 ease-out hover:scale-105 active:scale-95 border border-transparent hover:border-violet-200/50"><Copy size={20}/></button>}
                   <button type="button" onClick={closeModal} className="p-3 bg-slate-100/50 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl transition-all duration-300 ease-out hover:scale-105 active:scale-95 border border-transparent hover:border-slate-300/50"><X size={20}/></button>
                </div>
             </div>
             <div className="overflow-y-auto flex-1 p-6 bg-transparent transition-all duration-300 ease-out">
              <form onSubmit={handleSaveEvento} className="max-w-xl mx-auto pb-8" noValidate>
                 
                 {/* CLIENTE */}
                 <div className="bg-white/50 dark:bg-slate-800/30 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 p-6 mb-6 transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-0.5">
                    <div className="flex items-center gap-2 mb-6"><div className="bg-violet-500/10 text-violet-600 dark:text-violet-400 p-3 rounded-2xl shadow-inner border border-violet-500/20 backdrop-blur-md"><Users size={24}/></div><h4 className="font-black text-slate-800 dark:text-slate-100 text-xl tracking-tight">Datos del Cliente</h4></div>
                    <div className="space-y-5">
                       <div><label className="block text-[11px] uppercase text-slate-400 font-black tracking-widest mb-2">Nombre Completo *</label><input required value={formData.cliente||''} onChange={e=>setFormData({...formData,cliente:e.target.value})} className="w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-700/50 rounded-2xl p-4 text-base font-bold outline-none focus:border-violet-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-300 ease-out capitalize shadow-sm" /></div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div><label className="block text-[11px] uppercase text-slate-400 font-black tracking-widest mb-2">Teléfono *</label><input required type="tel" value={formData.telefono||''} onChange={e=>setFormData({...formData,telefono:e.target.value})} className="w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-700/50 rounded-2xl p-4 text-base font-bold outline-none focus:border-violet-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-300 ease-out shadow-sm" /></div>
                          <div><label className="block text-[11px] uppercase text-slate-400 font-black tracking-widest mb-2">Correo (Opcional)</label><input type="email" value={formData.email||''} onChange={e=>setFormData({...formData,email:e.target.value})} className="w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-700/50 rounded-2xl p-4 text-base font-bold outline-none focus:border-violet-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-300 ease-out shadow-sm" /></div>
                       </div>
                       <div><label className="block text-[11px] uppercase text-slate-400 font-black tracking-widest mb-2">RUC de Empresa (Opcional)</label><input type="text" value={formData.ruc||''} onChange={e=>setFormData({...formData,ruc:e.target.value})} className="w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-700/50 rounded-2xl p-4 text-base font-bold outline-none focus:border-violet-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-300 ease-out uppercase shadow-sm" /></div>
                    </div>
                 </div>

                 {/* LOGISTICA */}
                 <div className="bg-white/50 dark:bg-slate-800/30 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 p-6 mb-6 transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-0.5">
                    <div className="flex items-center gap-2 mb-6"><div className="bg-rose-500/10 text-rose-500 dark:text-rose-400 p-3 rounded-2xl shadow-inner border border-rose-500/20 backdrop-blur-md"><MapPin size={24}/></div><h4 className="font-black text-slate-800 dark:text-slate-100 text-xl tracking-tight">Logística</h4></div>
                    <div className="grid grid-cols-2 gap-5 mb-5">
                       <div><label className="block text-[11px] uppercase text-slate-400 font-black tracking-widest mb-2">Fecha *</label><input required type="date" value={formData.fecha||''} onChange={e=>setFormData({...formData,fecha:e.target.value})} className="w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-700/50 rounded-2xl p-4 text-base font-bold outline-none focus:border-violet-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-300 ease-out cursor-pointer shadow-sm" /></div>
                       <div><label className="block text-[11px] uppercase text-slate-400 font-black tracking-widest mb-2">Hora *</label><input required type="time" value={formData.hora||''} onChange={e=>setFormData({...formData,hora:e.target.value})} className="w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-700/50 rounded-2xl p-4 text-base font-bold outline-none focus:border-violet-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-300 ease-out cursor-pointer shadow-sm" /></div>
                    </div>
                    <div className="mb-5"><label className="block text-[11px] uppercase text-slate-400 font-black tracking-widest mb-2">Zona de Transporte</label><select value={formData.ubicacion||'Panamá Centro'} onChange={handleZoneChange} className="w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-700/50 rounded-2xl p-4 text-base font-bold outline-none focus:border-violet-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-300 ease-out cursor-pointer shadow-sm">{Object.keys(ZONAS_TRANSPORTE).map(z => <option key={z} value={z}>{z}</option>)}</select></div>
                    <div><label className="block text-[11px] uppercase text-slate-400 font-black tracking-widest mb-2">Dirección Exacta</label><input value={formData.direccion||''} onChange={e=>setFormData({...formData,direccion:e.target.value})} className="w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-700/50 rounded-2xl p-4 text-base font-bold outline-none focus:border-violet-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-300 ease-out shadow-sm" /></div>
                 </div>

                 {/* SERVICIOS */}
                 <div className="bg-white/50 dark:bg-slate-800/30 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 p-6 mb-6 transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-0.5">
                    <div className="flex items-center gap-2 mb-6"><div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 p-3 rounded-2xl shadow-inner border border-amber-500/20 backdrop-blur-md"><Sparkles size={24}/></div><h4 className="font-black text-slate-800 dark:text-slate-100 text-xl tracking-tight">Servicios</h4></div>
                    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2">
                       {PAQUETES_DIVERTY.slice(0, 4).map(p => { 
                          const isSel = formData.serviciosSeleccionados.some(s=>s.nombre===p.nombre); 
                          return (<button type="button" key={p.id} onClick={()=>isSel?removeService(formData.serviciosSeleccionados.findIndex(s=>s.nombre===p.nombre)):addService(p)} className={`shrink-0 p-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 ease-out border ${isSel ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-[0_8px_20px_rgba(124,58,237,0.3)] hover:scale-105 border-white/20' : 'bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-slate-600 dark:text-slate-300 border-white/40 dark:border-slate-700/50 hover:border-violet-300 hover:-translate-y-1 shadow-sm'}`}>{p.short}</button> )
                       })}
                    </div>
                    <button type="button" onClick={()=>{setShowDropdown(false);setIsCustomServiceModalOpen(true);}} className="w-full mb-6 py-4 rounded-2xl border border-dashed border-violet-300/50 dark:border-violet-700/50 text-violet-600 dark:text-violet-400 font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-violet-500/10 transition-all duration-300 ease-out hover:scale-105 active:scale-95"><Plus size={20}/> Añadir Otro</button>
                    <div className="mb-5"><label className="block text-[11px] uppercase text-slate-400 font-black tracking-widest mb-2">Resumen Final</label><input type="text" value={formData.servicio||''} onChange={e=>setFormData({...formData,servicio:e.target.value})} className="w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-700/50 rounded-2xl p-4 text-base font-bold outline-none focus:border-violet-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-300 ease-out shadow-sm" /></div>
                    {formData.serviciosSeleccionados.length > 0 && (
                       <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-4 rounded-2xl border border-white/40 dark:border-slate-700/50 space-y-3 mb-5 transition-all duration-300 ease-out shadow-sm">
                          {formData.serviciosSeleccionados.map((s, idx) => (
                             <div key={idx} className="flex justify-between items-center p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all duration-300 ease-out hover:-translate-y-1"><div className="font-bold text-sm text-slate-800 dark:text-slate-200">{s.nombre}</div><button type="button" onClick={()=>removeService(idx)} className="text-slate-400 hover:text-rose-500 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg transition-all duration-300 ease-out hover:scale-110 active:scale-95"><Trash2 size={16}/></button></div>
                          ))}
                       </div>
                    )}
                    <div><label className="block text-[11px] uppercase text-slate-400 font-black tracking-widest mb-2">Notas Especiales</label><textarea value={formData.comentarios||''} onChange={e=>setFormData({...formData,comentarios:e.target.value})} className="w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-700/50 rounded-2xl p-4 text-base font-bold outline-none focus:border-violet-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-300 ease-out resize-none h-28 shadow-sm" /></div>
                 </div>

                 {/* FINANZAS */}
                 <div className="bg-white/50 dark:bg-slate-800/30 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 p-6 mb-8 transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-0.5">
                    <div className="flex items-center gap-2 mb-6"><div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-3 rounded-2xl shadow-inner border border-emerald-500/20 backdrop-blur-md"><Receipt size={24}/></div><h4 className="font-black text-slate-800 dark:text-slate-100 text-xl tracking-tight">Finanzas</h4></div>
                    <div className="grid grid-cols-2 gap-5 mb-6">
                       <div><label className="block text-[11px] uppercase text-slate-400 font-black tracking-widest mb-2">Abono ($)</label><input type="number" inputMode="decimal" value={formData.abono||''} onChange={e=>setFormData({...formData,abono:e.target.value})} className="w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-700/50 rounded-2xl p-4 text-lg font-black outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 text-emerald-600 transition-all duration-300 ease-out shadow-sm" /></div>
                       <div><label className="block text-[11px] uppercase text-slate-400 font-black tracking-widest mb-2">Viáticos ($)</label><input type="number" inputMode="decimal" value={formData.transporte||''} onChange={e=>setFormData({...formData,transporte:e.target.value, total:(safeNum(formData.total)+(safeNum(e.target.value)-safeNum(formData.transporte))).toString()})} className="w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-700/50 rounded-2xl p-4 text-lg font-black outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-300 ease-out shadow-sm" /></div>
                    </div>
                    <div className="mb-6">
                       <label className="block text-[11px] uppercase text-slate-400 font-black tracking-widest mb-3">Estado del Evento</label>
                       <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-2 flex gap-2 rounded-2xl border border-white/40 dark:border-slate-700/50 overflow-x-auto scrollbar-hide shadow-sm">
                          {['Cotización', 'Pendiente', 'Confirmado', 'Completado'].map(est => (<button type="button" key={est} onClick={()=>est==='Completado'?handleTodoPagado():setFormData({...formData,estado:est})} className={`flex-1 min-w-[80px] py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ease-out ${formData.estado===est ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md border border-transparent scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-white/80 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-600'}`}>{est}</button>))}
                       </div>
                    </div>
                    <div className="bg-violet-50/80 dark:bg-violet-900/20 backdrop-blur-md p-6 rounded-2xl flex justify-between items-center border border-violet-200/50 dark:border-violet-800/50 transition-all duration-300 ease-out shadow-sm"><span className="font-black text-violet-700 dark:text-violet-400 uppercase text-[11px] tracking-widest">TOTAL *</span><div className="flex items-center"><span className="text-3xl font-black text-violet-400 mr-1">$</span><input required type="number" inputMode="decimal" value={formData.total||''} onChange={e=>setFormData({...formData,total:e.target.value})} className="bg-transparent text-right text-4xl font-black text-violet-700 dark:text-violet-300 w-32 outline-none transition-all duration-300 ease-out" /></div></div>
                 </div>

                 <button type="submit" className={`w-full ${isCotizacionMode ? `bg-gradient-to-tr from-amber-500 to-orange-400 text-white shadow-[0_8px_20px_rgba(245,158,11,0.3)] hover:shadow-[0_12px_25px_rgba(245,158,11,0.5)]` : `bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-[0_8px_20px_rgba(124,58,237,0.3)] hover:shadow-[0_12px_25px_rgba(124,58,237,0.5)]`} font-black py-5 rounded-2xl transition-all duration-500 ease-out active:scale-95 hover:scale-105 flex justify-center items-center gap-2 text-lg uppercase tracking-widest border border-white/20 relative overflow-hidden group`}>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out rounded-2xl pointer-events-none"></div>
                    {isCotizacionMode ? <FileText size={24} className="relative z-10"/> : <Check size={24} className="relative z-10"/>} <span className="relative z-10">{isCotizacionMode ? 'Generar Cotización' : 'Guardar Reserva'}</span>
                 </button>
              </form>
             </div>
          </div>
        </div>
      )}

      {/* OVERLAY PARA MÓVIL AL ABRIR SIDEBAR */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] md:hidden transition-all duration-300 ease-out"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* --- NUEVO LAYOUT: SIDEBAR (IZQUIERDA) --- */}
      <aside className={`fixed md:static inset-y-0 left-0 w-72 bg-slate-900/95 backdrop-blur-2xl border-r border-white/10 dark:border-slate-800/50 text-white flex flex-col z-[100] transform transition-transform duration-500 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} shadow-[20px_0_50px_rgba(0,0,0,0.5)] md:shadow-none`}>
         <div className="p-8 flex items-center justify-between gap-4 border-b border-white/10 dark:border-slate-800/50 relative overflow-hidden">
             <div className="absolute -top-10 -left-10 w-32 h-32 bg-violet-500/20 rounded-full blur-2xl"></div>
             <div className="flex items-center gap-4 relative z-10">
                <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl shadow-inner border border-white/20">
                   <img src={LOGO_URL} alt="Logo" className="h-10 w-10 object-contain drop-shadow-md" />
                </div>
                <div>
                   <h1 className="text-2xl font-black text-white tracking-tight">Diverty</h1>
                   <p className="text-[10px] uppercase tracking-widest font-black text-violet-400">Acceso Total</p>
                </div>
             </div>
             <button className="md:hidden text-slate-400 hover:text-white transition-colors duration-300 ease-out relative z-10" onClick={() => setIsSidebarOpen(false)}>
                 <X size={24} />
             </button>
         </div>
         
         <nav className="flex-1 flex flex-col px-4 py-6 gap-2 overflow-y-auto">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-4 mb-2">Menú Principal</p>
            {NAV_ITEMS.map(t => {
               const IconComponent = t.icon;
               const isActive = activeTab === t.id;
               return ( 
                   <button 
                       type="button" 
                       key={t.id} 
                       onClick={() => {
                           triggerHaptic('light');
                           setActiveTab(t.id);
                           setIsModoOperativo(false);
                           setIsSidebarOpen(false);
                       }} 
                       className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl font-bold transition-all duration-300 ease-out active:scale-95 border relative overflow-hidden group ${isActive ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_8px_20px_rgba(124,58,237,0.3)] border-white/20 hover:shadow-[0_12px_25px_rgba(124,58,237,0.5)] hover:-translate-y-0.5' : 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200 border-transparent hover:-translate-y-0.5'}`}
                   >
                       {isActive && <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out pointer-events-none"></div>}
                       <IconComponent size={20} strokeWidth={isActive ? 2.5 : 2} className="relative z-10" /> 
                       <span className="text-sm tracking-wide relative z-10">{t.text}</span>
                   </button> 
               );
            })}
         </nav>
         
         <div className="p-6 border-t border-white/10 dark:border-slate-800/50">
             <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center border border-white/20 shadow-lg relative overflow-hidden">
                     <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                     <span className="font-black text-white text-xs relative z-10">AD</span>
                 </div>
                 <div>
                     <p className="text-sm font-bold text-white">Administrador</p>
                     <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1"><Cloud size={10}/> Conectado</p>
                 </div>
             </div>
             <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-transparent hover:border-rose-500/30 hover:text-rose-400 text-slate-400 font-bold text-xs transition-all duration-300 ease-out hover:scale-105 active:scale-95 shadow-sm">
                 Cerrar Sesión
             </button>
         </div>
      </aside>

      {/* --- NUEVO LAYOUT: CONTENIDO PRINCIPAL (DERECHA) --- */}
      <div className={`flex-1 flex flex-col min-w-0 h-[100dvh] relative overflow-hidden font-outfit ${isDarkMode ? 'dark bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100' : 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50 via-white to-violet-50 text-slate-800'}`}>
          
          {/* HEADER MÓVIL (Solo visible en móviles) */}
          <header className="md:hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border-b border-white/50 dark:border-slate-800/50 p-4 flex justify-between items-center z-40 sticky top-0 transition-colors duration-500 ease-out shadow-sm">
             <div className="flex items-center gap-3">
                 <div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <img src={LOGO_URL} alt="Logo" className="h-7 w-7 object-contain drop-shadow-sm" />
                 </div>
                <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tight drop-shadow-sm">Diverty CRM</h1>
             </div>
             <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-xl text-slate-600 dark:text-slate-300 transition-all duration-300 ease-out hover:scale-105 active:scale-95 border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                 <Menu size={24} />
             </button>
          </header>

          <main className="flex-1 overflow-y-auto scroll-smooth z-0 relative pb-24 md:pb-0">
            <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-violet-600/5 dark:bg-violet-600/10 rounded-full blur-[120px] pointer-events-none -z-10 mix-blend-multiply dark:mix-blend-screen animate-blob"></div>
            <div className="fixed bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-fuchsia-500/5 dark:bg-fuchsia-500/10 rounded-full blur-[100px] pointer-events-none -z-10 mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-2000"></div>
            
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
