import CatalogProductOptions from './CatalogProductOptions.jsx';
import { EMPTY_PRODUCT_OPTIONS, productOptionsFromItem, productOptionsForSave } from '../../lib/catalog-product.mjs';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowUp, CalendarDays, Check, ChevronLeft, Copy,
  Edit3, ExternalLink, Eye, FolderOpen, Globe2, ImagePlus, Images, Loader2,
  Megaphone, Package, Palette, Plus, RefreshCw, Search, Settings2, Sparkles,
  Star, TicketPercent, Trash2, Upload, X,
} from 'lucide-react';
import {
  collection, doc, getDoc, getDocs, increment, writeBatch,
} from 'firebase/firestore';

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/djfboe8rg/image/upload';
const CLOUDINARY_UPLOAD_PRESET = 'diverty_web';
const PUBLIC_SITE_URL = 'https://divertypanama.netlify.app/';

const EMPTY_CATEGORY = { nombre: '', icono: '', imagen: '', visibilidad: 'activo', fechaInicio: '', fechaFin: '' };
const EMPTY_PACKAGE = { ...EMPTY_PRODUCT_OPTIONS, nombre: '', categoria: '', precio: '', tipoCobro: 'paquete', oferta: false, destacado: false, orden: '', precioOriginal: '', descripcion: '', imagen: '', imagenTarjeta: '', serviciosLista: '' };
const EMPTY_CAMPAIGN = { titulo: '', subtitulo: '', descripcion: '', imagen: '', precio: '', precioOriginal: '', incluyeText: '', botonTexto: '', accion: '', activo: true, destacada: false, orden: '', fechaInicio: '', fechaFin: '' };
const EMPTY_THEME = { nombre: '', descripcion: '', fechaInicio: '', fechaFin: '', gradient: '', decorations: 'none', animations: true, colorPrimary: '#8B5CF6', colorSecondary: '#EC4899', colorButton: '#8B5CF6', colorText: '#1E293B', colorBg: '#FFFFFF', colorCard: '#F8FAFC' };
const EMPTY_COUPON = { code: '', type: 'percent', discount: '', activo: true };

const THEME_PRESETS = {
  normal: { colorPrimary:'#7C3AED', colorSecondary:'#E11D48', colorButton:'#7C3AED', colorText:'#0F172A', colorBg:'#F8FAFC', colorCard:'#FFFFFF', gradient:'linear-gradient(135deg, #7C3AED, #E11D48)', decorations:'none' },
  christmas: { colorPrimary:'#2563EB', colorSecondary:'#94A3B8', colorButton:'#2563EB', colorText:'#F8FAFC', colorBg:'#061426', colorCard:'#091E3A', gradient:'linear-gradient(135deg, #2563EB, #94A3B8)', decorations:'snow' },
  halloween: { colorPrimary:'#F97316', colorSecondary:'#7E22CE', colorButton:'#EA580C', colorText:'#F8FAFC', colorBg:'#09070D', colorCard:'#17111F', gradient:'linear-gradient(135deg, #EA580C, #7E22CE)', decorations:'none' },
  summer: { colorPrimary:'#0284C7', colorSecondary:'#EA580C', colorButton:'#0284C7', colorText:'#082F49', colorBg:'#F0F9FF', colorCard:'#FFFFFF', gradient:'linear-gradient(135deg, #0284C7, #EA580C)', decorations:'none' },
  school: { colorPrimary:'#2563EB', colorSecondary:'#EA580C', colorButton:'#2563EB', colorText:'#1E3A8A', colorBg:'#F8FAFC', colorCard:'#FFFFFF', gradient:'linear-gradient(135deg, #2563EB, #EA580C)', decorations:'none' },
};

function inferThemePreset(name='', description='') {
  const text = `${name} ${description}`.toLowerCase();
  if (text.includes('navidad') || text.includes('christmas') || text.includes('santa')) return 'christmas';
  if (text.includes('halloween') || text.includes('miedo')) return 'halloween';
  if (text.includes('verano') || text.includes('summer')) return 'summer';
  if (text.includes('escolar') || text.includes('escuela') || text.includes('school')) return 'school';
  return 'normal';
}

function compressImageFile(file, maxDimension=1600, quality=0.84) {
  return new Promise(resolve => {
    if (!file || !file.type?.startsWith('image/') || file.type === 'image/gif' || file.size < 350 * 1024) return resolve(file);
    const reader = new FileReader();
    reader.onerror = () => resolve(file);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(file);
      img.onload = () => {
        const largest = Math.max(img.width, img.height);
        if (!largest) return resolve(file);
        const scale = Math.min(1, maxDimension / largest);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(blob => {
          if (!blob) return resolve(file);
          const ext = outputType === 'image/png' ? '.png' : '.jpg';
          const safeName = (file.name || 'imagen').replace(/\.[^.]+$/, '') + ext;
          resolve(new File([blob], safeName, { type: outputType, lastModified: Date.now() }));
        }, outputType, quality);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const money = value => { const n = Number(value); return Number.isFinite(n) ? n.toFixed(2) : '0.00'; };
const todayPanama = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const inputClass = (extra='') => `w-full min-h-[50px] rounded-[16px] border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-300 ${extra}`;

function ModalShell({ title, subtitle, onClose, children }) {
  return <div className="fixed inset-0 z-[9999] bg-slate-950/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-5" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="w-full sm:max-w-2xl max-h-[92dvh] overflow-hidden rounded-t-[30px] sm:rounded-[30px] bg-[#F8F9FD] shadow-2xl border border-white">
      <div className="px-5 sm:px-7 py-5 border-b border-slate-200/80 bg-white flex items-center justify-between gap-4">
        <div className="min-w-0"><h3 className="text-xl font-black text-slate-950 tracking-tight truncate">{title}</h3>{subtitle && <p className="text-xs font-semibold text-slate-400 mt-1">{subtitle}</p>}</div>
        <button type="button" onClick={onClose} className="w-10 h-10 shrink-0 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center active:scale-95"><X size={20}/></button>
      </div>
      <div className="overflow-y-auto overscroll-contain max-h-[calc(92dvh-82px)] p-5 sm:p-7 pb-[110px] sm:pb-8">{children}</div>
    </div>
  </div>;
}
function Field({ label, children, hint }) { return <label className="block"><span className="block text-[10px] font-black uppercase tracking-[.16em] text-slate-400 mb-2">{label}</span>{children}{hint && <span className="block text-[10px] font-semibold text-slate-400 mt-1.5">{hint}</span>}</label>; }
function ToggleButton({ active, onClick, children, tone='violet' }) {
  const on = tone === 'pink' ? 'bg-pink-50 border-pink-200 text-pink-600' : tone === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-violet-50 border-violet-200 text-violet-600';
  return <button type="button" onClick={onClick} className={`min-h-[50px] rounded-[16px] border font-black text-xs flex items-center justify-center gap-2 ${active ? on : 'bg-white border-slate-200 text-slate-500'}`}>{active && <Check size={16}/>} {children}</button>;
}
function EmptyState({ icon: Icon, text }) { return <div className="rounded-[24px] border border-dashed border-slate-300 p-10 text-center"><Icon size={32} className="mx-auto text-slate-300 mb-3"/><p className="font-black text-slate-700">{text}</p></div>; }
function StickySaveButton({ disabled, onClick, children, tone='violet' }) {
  const bg = tone === 'pink' ? 'from-pink-500 to-violet-600' : tone === 'rose' ? 'from-rose-500 to-pink-600' : tone === 'amber' ? 'from-amber-500 to-orange-500' : tone === 'emerald' ? 'from-emerald-500 to-teal-600' : 'from-[#FF2A9D] to-[#7657FF]';
  return <div className="mt-6 pt-4 border-t border-slate-200/80">
    <button type="button" disabled={disabled} onClick={onClick} className={`w-full min-h-[56px] rounded-[18px] bg-gradient-to-r ${bg} disabled:opacity-50 text-white font-black shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2`}>{children}</button>
  </div>;
}

export default function WebAdmin({ db, appId, currentUser, showAlert }) {
  const [view, setView] = useState('home');
  const [categories, setCategories] = useState([]), [packages, setPackages] = useState([]), [campaigns, setCampaigns] = useState([]), [themes, setThemes] = useState([]), [gallery, setGallery] = useState([]), [coupons, setCoupons] = useState([]);
  const [themeConfig, setThemeConfig] = useState({ modo: 'automatico', temaManualActivo: 'normal' });
  const [settings, setSettings] = useState({ bannerActive: false, bannerText: '' });
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [uploading, setUploading] = useState(false);
  const [queryText, setQueryText] = useState(''), [categoryFilter, setCategoryFilter] = useState('all');
  const [categoryModal, setCategoryModal] = useState(null), [packageModal, setPackageModal] = useState(null), [campaignModal, setCampaignModal] = useState(null), [themeModal, setThemeModal] = useState(null), [couponModal, setCouponModal] = useState(null);
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY), [packageForm, setPackageForm] = useState(EMPTY_PACKAGE), [campaignForm, setCampaignForm] = useState(EMPTY_CAMPAIGN), [themeForm, setThemeForm] = useState(EMPTY_THEME), [couponForm, setCouponForm] = useState(EMPTY_COUPON);
  const [serviceDraft, setServiceDraft] = useState('');

  // Navegación interna WebAdmin + botón Atrás de Android.
  // La app principal ya emite `diverty:back-layer` antes de cambiar de pestaña.
  // Aquí consumimos ese Atrás cuando hay un modal abierto o cuando estamos
  // dentro de Catálogos/Paquetes/etc. y restauramos el scroll anterior.
  const webStateRef = useRef({});
  const webHistoryRef = useRef([{ view: 'home', scrollTop: 0 }]);

  useEffect(() => {
    webStateRef.current = {
      view,
      categoryModal,
      packageModal,
      campaignModal,
      themeModal,
      couponModal,
    };
  });

  const getMainContent = useCallback(() => (
    typeof document !== 'undefined' ? document.getElementById('main-content') : null
  ), []);

  const restoreMainScroll = useCallback((top = 0) => {
    const restore = () => {
      const main = getMainContent();
      if (main) main.scrollTo({ top: Math.max(0, Number(top) || 0), left: 0, behavior: 'auto' });
    };
    requestAnimationFrame(() => requestAnimationFrame(restore));
    setTimeout(restore, 80);
  }, [getMainContent]);

  const openWebView = useCallback((nextView) => {
    if (!nextView || nextView === webStateRef.current.view) return;
    const main = getMainContent();
    const history = webHistoryRef.current;
    const currentView = webStateRef.current.view || 'home';
    const currentTop = main?.scrollTop || 0;

    if (!history.length) history.push({ view: currentView, scrollTop: currentTop });
    else if (history[history.length - 1]?.view === currentView) history[history.length - 1].scrollTop = currentTop;
    else history.push({ view: currentView, scrollTop: currentTop });

    history.push({ view: nextView, scrollTop: 0 });
    setView(nextView);
    restoreMainScroll(0);
  }, [getMainContent, restoreMainScroll]);

  const closeWebLayer = useCallback(() => {
    const state = webStateRef.current || {};

    // Primero cierra exactamente lo que está encima, igual que el resto del CRM.
    if (state.couponModal) { setCouponModal(null); return true; }
    if (state.themeModal) { setThemeModal(null); return true; }
    if (state.campaignModal) { setCampaignModal(null); return true; }
    if (state.packageModal) { setPackageModal(null); return true; }
    if (state.categoryModal) { setCategoryModal(null); return true; }

    // Luego retrocede una pantalla dentro de Web y restaura donde estaba el usuario.
    if ((state.view || 'home') !== 'home') {
      const main = getMainContent();
      const history = webHistoryRef.current;
      if (history.length) {
        const current = history[history.length - 1];
        if (current?.view === state.view) current.scrollTop = main?.scrollTop || 0;
        if (history.length > 1) history.pop();
      }
      const previous = history[history.length - 1] || { view: 'home', scrollTop: 0 };
      setView(previous.view || 'home');
      restoreMainScroll(previous.scrollTop || 0);
      return true;
    }
    return false;
  }, [getMainContent, restoreMainScroll]);

  useEffect(() => {
    const handleAndroidBackLayer = (event) => {
      if (!closeWebLayer()) return;
      if (event?.detail && typeof event.detail === 'object') event.detail.handled = true;
    };
    window.addEventListener('diverty:back-layer', handleAndroidBackLayer);
    return () => window.removeEventListener('diverty:back-layer', handleAndroidBackLayer);
  }, [closeWebLayer]);

  const packageServices = useMemo(() => String(packageForm.serviciosLista || '').split('\n').map(v=>v.trim()).filter(Boolean), [packageForm.serviciosLista]);

  const colRef = useCallback(name => collection(db, 'artifacts', appId, 'public', 'data', name), [db, appId]);
  const itemRef = useCallback((name, id) => doc(db, 'artifacts', appId, 'public', 'data', name, id), [db, appId]);
  const notify = useCallback((message, success = true) => { if (showAlert) showAlert(message, success); }, [showAlert]);

  // Enlaces directos compatibles con el administrador web original.
  // ?plan=<id> abre directamente un paquete/servicio y ?categoria=<id> abre un catálogo.
  const copyDirectLink = useCallback(async (kind, id, label = '') => {
    try {
      const url = new URL(PUBLIC_SITE_URL);
      if (kind === 'plan') url.searchParams.set('plan', id);
      else if (kind === 'categoria') url.searchParams.set('categoria', id);
      else return;

      // WhatsApp/Facebook guardan en caché la vista previa de una URL.
      // Este valor no cambia la navegación del cliente; solo obliga al crawler
      // social a pedir nuevamente foto, nombre y precio actualizados.
      url.searchParams.set('pv', Date.now().toString(36));

      const link = url.toString();
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
      } else {
        const ta = document.createElement('textarea');
        ta.value = link;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      notify(`Enlace de ${label || (kind === 'plan' ? 'paquete' : 'catálogo')} copiado.`);
    } catch (error) {
      console.error('Direct link copy error', error);
      notify('No se pudo copiar el enlace.', false);
    }
  }, [notify]);

  const refresh = useCallback(async () => {
    if (!db || !currentUser) return;
    setLoading(true);
    try {
      const [catSnap, packSnap, campSnap, themeSnap, gallerySnap, couponSnap, themeConfSnap, globalSnap] = await Promise.all([
        getDocs(colRef('categorias_web')), getDocs(colRef('catalogo_web')), getDocs(colRef('campanas_web')), getDocs(colRef('temas_web')), getDocs(colRef('galeria_web')), getDocs(colRef('cupones_web')), getDoc(itemRef('config_web', 'tema_global')), getDoc(itemRef('config_web', 'global')),
      ]);
      const sortOrder = rows => rows.sort((a,b)=>(Number(a.orden)||999)-(Number(b.orden)||999));
      const nextCategories = sortOrder(catSnap.docs.map(d => ({ id:d.id, ...d.data() })));
      setCategories(nextCategories); setPackages(sortOrder(packSnap.docs.map(d=>({id:d.id,...d.data()})))); setCampaigns(sortOrder(campSnap.docs.map(d=>({id:d.id,...d.data()}))));
      setThemes(themeSnap.docs.map(d=>({id:d.id,...d.data()}))); setGallery(gallerySnap.docs.map(d=>({id:d.id,...d.data()}))); setCoupons(couponSnap.docs.map(d=>({id:d.id,...d.data()})));
      if (themeConfSnap.exists()) setThemeConfig(v=>({ ...v, ...themeConfSnap.data() }));
      if (globalSnap.exists()) setSettings(v=>({ ...v, ...globalSnap.data() }));
      if (categoryFilter !== 'all' && !['destacados','ofertas'].includes(categoryFilter) && !nextCategories.some(c=>c.id===categoryFilter)) setCategoryFilter('all');
    } catch (error) { console.error('WebAdmin load error', error); notify('No se pudo cargar la administración web.', false); }
    finally { setLoading(false); }
  }, [db,currentUser,colRef,itemRef,categoryFilter,notify]);
  useEffect(()=>{ refresh(); },[refresh]);

  const commitMutation = useCallback(async (mutations, dirtyCollections) => {
    if (!currentUser) throw new Error('AUTH_REQUIRED');
    const batch = writeBatch(db); mutations(batch);
    const versions = {}; [...new Set(dirtyCollections)].forEach(name => { versions[name] = increment(1); });
    batch.set(itemRef('config_web','web_sync'), { versions, version:increment(1), updatedAt:new Date().toISOString() }, { merge:true });
    await batch.commit();
  },[currentUser,db,itemRef]);

  const uploadImage = useCallback(async file => {
    if (!file) return ''; if (!file.type?.startsWith('image/')) throw new Error('INVALID_IMAGE'); setUploading(true);
    try { const optimized=await compressImageFile(file); const formData=new FormData(); formData.append('file',optimized); formData.append('upload_preset',CLOUDINARY_UPLOAD_PRESET); const response=await fetch(CLOUDINARY_URL,{method:'POST',body:formData}); const data=await response.json(); if(!response.ok||!data?.secure_url) throw new Error(data?.error?.message||'UPLOAD_FAILED'); return data.secure_url; }
    finally { setUploading(false); }
  },[]);
  const uploadInto = async (file, setter, key) => { try { const url=await uploadImage(file); if(url) setter(v=>({...v,[key]:url})); } catch { notify('No se pudo subir la imagen.',false); } };

  // CATEGORÍAS
  const openCategory = item => { setCategoryModal(item||{id:null}); setCategoryForm(item ? { nombre:item.nombre||'', icono:item.icono||'', imagen:item.imagen||item.image||'', visibilidad:item.visibilidad||((item.activo===false||item.visible===false)?'oculto':'activo'), fechaInicio:item.fechaInicio||item.inicioTemporada||'', fechaFin:item.fechaFin||item.finTemporada||'' } : EMPTY_CATEGORY); };
  const saveCategory = async () => { const nombre=categoryForm.nombre.trim(); if(!nombre)return notify('Escribe un nombre para el catálogo.',false); if(categoryForm.visibilidad==='temporada'&&(!categoryForm.fechaInicio||!categoryForm.fechaFin))return notify('Selecciona inicio y fin de temporada.',false); if(categoryForm.fechaInicio&&categoryForm.fechaFin&&categoryForm.fechaInicio>categoryForm.fechaFin)return notify('La fecha inicial no puede ser posterior a la final.',false); setSaving(true); try { const activo=categoryForm.visibilidad!=='oculto'; const id=categoryModal?.id||nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||`categoria-${Date.now()}`; const data={id,nombre,icono:categoryForm.icono.trim(),imagen:categoryForm.imagen.trim(),visibilidad:categoryForm.visibilidad,fechaInicio:categoryForm.fechaInicio||'',fechaFin:categoryForm.fechaFin||'',activo,visible:activo,...(categoryModal?.id?{}:{orden:categories.length+1}),updatedAt:new Date().toISOString()}; await commitMutation(b=>b.set(itemRef('categorias_web',id),data,{merge:true}),['categorias_web']); setCategoryModal(null); await refresh(); notify(categoryModal?.id?'Catálogo actualizado.':'Catálogo creado.'); } catch(e){console.error(e);notify('No se pudo guardar el catálogo.',false);} finally{setSaving(false);} };
  const deleteCategory = async item => { if(!window.confirm(`¿Eliminar “${item.nombre}”? Los paquetes de esta categoría no se eliminarán.`))return; try{await commitMutation(b=>b.delete(itemRef('categorias_web',item.id)),['categorias_web']);await refresh();notify('Catálogo eliminado.');}catch(e){console.error(e);notify('No se pudo eliminar el catálogo.',false);} };
  const moveCategory = async(index,delta)=>{const other=index+delta;if(other<0||other>=categories.length)return;const reordered=[...categories];[reordered[index],reordered[other]]=[reordered[other],reordered[index]];setCategories(reordered);try{await commitMutation(b=>reordered.forEach((item,idx)=>b.set(itemRef('categorias_web',item.id),{orden:idx+1},{merge:true})),['categorias_web']);notify('Orden actualizado.');}catch(e){console.error(e);await refresh();notify('No se pudo cambiar el orden.',false);}};

  // PAQUETES
  const openPackage=item=>{setServiceDraft('');setPackageModal(item||{id:null});setPackageForm(item?{...productOptionsFromItem(item),nombre:item.nombre||'',categoria:item.categoria||categories[0]?.id||'',precio:item.precio??'',tipoCobro:item.tipoCobro||'paquete',oferta:!!item.oferta,destacado:!!item.destacado,orden:item.orden===999?'':(item.orden??''),precioOriginal:item.precioOriginal??'',descripcion:item.descripcion||'',imagen:item.imagen||'',imagenTarjeta:item.imagenTarjeta||'',serviciosLista:item.serviciosLista||''}:{...EMPTY_PACKAGE,categoria:categories[0]?.id||''});};
  const savePackage=async(keepCreating=false)=>{const nombre=packageForm.nombre.trim(),precio=Number(packageForm.precio);if(!nombre||!Number.isFinite(precio)||precio<=0||!packageForm.imagen.trim())return notify('Completa nombre, precio e imagen.',false);if(!packageForm.categoria)return notify('Selecciona una categoría.',false);if(packageForm.oferta&&Number(packageForm.precioOriginal)<=precio)return notify('En oferta, el precio original debe ser mayor al actual.',false);let options;try{options=productOptionsForSave(packageForm);}catch(error){return notify(error.message,false);}setSaving(true);try{const id=packageModal?.id||doc(colRef('catalogo_web')).id;const data={...options,nombre,categoria:packageForm.categoria,precio,oferta:!!packageForm.oferta,destacado:!!packageForm.destacado,orden:packageForm.orden===''?999:Number(packageForm.orden),precioOriginal:packageForm.oferta?Number(packageForm.precioOriginal):null,descripcion:packageForm.descripcion.trim(),imagen:packageForm.imagen.trim(),serviciosLista:packageForm.serviciosLista,updatedAt:new Date().toISOString()};if(packageForm.imagenTarjeta.trim())data.imagenTarjeta=packageForm.imagenTarjeta.trim();const createCharacters=options.tipoServicio==='personaje'&&packageForm.categoria==='personajes'&&!categories.some(c=>c.id==='personajes');await commitMutation(b=>{b.set(itemRef('catalogo_web',id),data,{merge:true});if(createCharacters)b.set(itemRef('categorias_web','personajes'),{id:'personajes',nombre:'Personajes',icono:'sparkles',imagen:data.imagen,visibilidad:'activo',activo:true,visible:true,orden:categories.length+1});},createCharacters?['catalogo_web','categorias_web']:['catalogo_web']);if(keepCreating===true){setPackageModal({id:null});setPackageForm({...EMPTY_PACKAGE,tipoServicio:'personaje',categoria:packageForm.categoria,tematica:packageForm.tematica});setServiceDraft('');}else setPackageModal(null);await refresh();notify(packageModal?.id?'Servicio actualizado.':'Servicio creado.');}catch(e){console.error(e);notify('No se pudo guardar el paquete.',false);}finally{setSaving(false);}};
  const deletePackage=async item=>{if(!window.confirm(`¿Eliminar “${item.nombre}” de la página web?`))return;try{await commitMutation(b=>b.delete(itemRef('catalogo_web',item.id)),['catalogo_web']);await refresh();notify('Paquete eliminado.');}catch(e){console.error(e);notify('No se pudo eliminar el paquete.',false);}};
  const movePackage=async(item,delta)=>{const same=packages.filter(p=>p.categoria===item.categoria).sort((a,b)=>(Number(a.orden)||999)-(Number(b.orden)||999));const index=same.findIndex(p=>p.id===item.id),other=index+delta;if(index<0||other<0||other>=same.length)return;[same[index],same[other]]=[same[other],same[index]];try{await commitMutation(b=>same.forEach((p,idx)=>b.set(itemRef('catalogo_web',p.id),{orden:idx+1},{merge:true})),['catalogo_web']);await refresh();notify('Orden de paquetes actualizado.');}catch(e){console.error(e);notify('No se pudo cambiar el orden.',false);}};
  const setPackageServices = list => setPackageForm(v=>({...v,serviciosLista:list.join('\n')}));
  const addPackageService = () => { const value=serviceDraft.trim(); if(!value)return; setPackageServices([...packageServices,value]); setServiceDraft(''); };
  const removePackageService = index => setPackageServices(packageServices.filter((_,i)=>i!==index));
  const movePackageService = (index,delta) => { const other=index+delta; if(other<0||other>=packageServices.length)return; const next=[...packageServices]; [next[index],next[other]]=[next[other],next[index]]; setPackageServices(next); };


  // CAMPAÑAS
  const openCampaign=item=>{setCampaignModal(item||{id:null});setCampaignForm(item?{titulo:item.titulo||'',subtitulo:item.subtitulo||'',descripcion:item.descripcion||'',imagen:item.imagen||'',precio:item.precio??'',precioOriginal:item.precioOriginal??'',incluyeText:Array.isArray(item.incluye)?item.incluye.join('\n'):'',botonTexto:item.botonTexto||'',accion:item.accion||'',activo:item.activo!==false,destacada:!!item.destacada,orden:item.orden??'',fechaInicio:item.fechaInicio||'',fechaFin:item.fechaFin||''}:{...EMPTY_CAMPAIGN,orden:campaigns.length+1});};
  const saveCampaign=async()=>{const titulo=campaignForm.titulo.trim(),imagen=campaignForm.imagen.trim();if(!titulo||!imagen||!campaignForm.fechaInicio||!campaignForm.fechaFin)return notify('Título, imagen, fecha inicial y fecha final son obligatorios.',false);if(campaignForm.fechaFin<campaignForm.fechaInicio)return notify('La fecha final no puede ser anterior a la inicial.',false);if(!/^https?:\/\//i.test(imagen))return notify('La URL de imagen no es válida.',false);setSaving(true);try{const id=campaignModal?.id||`camp_${Date.now()}`;const p=campaignForm.precio===''?null:Number(campaignForm.precio),po=campaignForm.precioOriginal===''?null:Number(campaignForm.precioOriginal);const data={titulo,subtitulo:campaignForm.subtitulo.trim(),descripcion:campaignForm.descripcion.trim(),imagen,precio:Number.isFinite(p)?p:null,precioOriginal:Number.isFinite(po)?po:null,incluye:campaignForm.incluyeText.split('\n').map(s=>s.trim()).filter(Boolean),botonTexto:campaignForm.botonTexto.trim(),accion:campaignForm.accion.trim(),activo:!!campaignForm.activo,destacada:!!campaignForm.destacada,orden:Number(campaignForm.orden)||campaigns.length+1,fechaInicio:campaignForm.fechaInicio,fechaFin:campaignForm.fechaFin,updatedAt:new Date().toISOString(),...(campaignModal?.id?{}:{id,createdAt:new Date().toISOString()})};await commitMutation(b=>b.set(itemRef('campanas_web',id),data,{merge:true}),['campanas_web']);setCampaignModal(null);await refresh();notify(campaignModal?.id?'Campaña actualizada.':'Campaña creada.');}catch(e){console.error(e);notify('No se pudo guardar la campaña.',false);}finally{setSaving(false);}};
  const toggleCampaign=async item=>{try{await commitMutation(b=>b.set(itemRef('campanas_web',item.id),{activo:item.activo===false,updatedAt:new Date().toISOString()},{merge:true}),['campanas_web']);await refresh();notify(item.activo===false?'Campaña activada.':'Campaña desactivada.');}catch(e){console.error(e);notify('No se pudo cambiar el estado.',false);}};
  const duplicateCampaign=item=>{setCampaignModal({id:null});setCampaignForm({titulo:`${item.titulo||'Campaña'} (Copia)`,subtitulo:item.subtitulo||'',descripcion:item.descripcion||'',imagen:item.imagen||'',precio:item.precio??'',precioOriginal:item.precioOriginal??'',incluyeText:Array.isArray(item.incluye)?item.incluye.join('\n'):'',botonTexto:item.botonTexto||'',accion:item.accion||'',activo:false,destacada:!!item.destacada,orden:campaigns.length+1,fechaInicio:item.fechaInicio||'',fechaFin:item.fechaFin||''});};
  const deleteCampaign=async item=>{if(!window.confirm(`¿Eliminar la campaña “${item.titulo}”?`))return;try{await commitMutation(b=>b.delete(itemRef('campanas_web',item.id)),['campanas_web']);await refresh();notify('Campaña eliminada.');}catch(e){console.error(e);notify('No se pudo eliminar la campaña.',false);}};
  const moveCampaign=async(index,delta)=>{const other=index+delta;if(other<0||other>=campaigns.length)return;const reordered=[...campaigns];[reordered[index],reordered[other]]=[reordered[other],reordered[index]];setCampaigns(reordered);try{await commitMutation(b=>reordered.forEach((item,idx)=>b.set(itemRef('campanas_web',item.id),{orden:idx+1},{merge:true})),['campanas_web']);notify('Prioridad actualizada.');}catch(e){console.error(e);await refresh();notify('No se pudo cambiar el orden.',false);}};

  // TEMAS
  const defaultThemeId=themes.find(t=>t.isDefault)?.id||themes[0]?.id||null;
  const automaticWinner=()=>{const today=todayPanama();return themes.find(t=>t.fechaInicio&&t.fechaFin&&today>=t.fechaInicio&&today<=t.fechaFin)?.id||defaultThemeId;};
  const activeThemeId=themes.find(t=>t.activo)?.id||((themeConfig.modo==='manual'?themeConfig.temaManualActivo:automaticWinner())||defaultThemeId);
  const applyThemeMode=async(nextConfig,winnerId)=>{await commitMutation(b=>{b.set(itemRef('config_web','tema_global'),nextConfig,{merge:true});themes.forEach(t=>b.set(itemRef('temas_web',t.id),{activo:t.id===winnerId},{merge:true}));},['config_web','temas_web']);await refresh();};
  const toggleThemeMode=async()=>{try{const nextMode=themeConfig.modo==='manual'?'automatico':'manual';const next={...themeConfig,modo:nextMode};const winner=nextMode==='manual'?(themeConfig.temaManualActivo||activeThemeId||defaultThemeId):automaticWinner();await applyThemeMode(next,winner);notify(nextMode==='manual'?'Modo manual activado.':'Modo automático activado.');}catch(e){console.error(e);notify('No se pudo cambiar el modo.',false);}};
  const activateTheme=async id=>{try{const next={...themeConfig,modo:'manual',temaManualActivo:id};await applyThemeMode(next,id);notify('Tema activado manualmente.');}catch(e){console.error(e);notify('No se pudo activar el tema.',false);}};
  const setDefaultTheme=async id=>{try{const winner=themeConfig.modo==='manual'?(themeConfig.temaManualActivo||id):(()=>{const today=todayPanama();return themes.find(t=>t.fechaInicio&&t.fechaFin&&today>=t.fechaInicio&&today<=t.fechaFin)?.id||id;})();await commitMutation(b=>themes.forEach(t=>b.set(itemRef('temas_web',t.id),{isDefault:t.id===id,activo:t.id===winner},{merge:true})),['temas_web']);await refresh();notify('Tema predeterminado actualizado.');}catch(e){console.error(e);notify('No se pudo cambiar el tema predeterminado.',false);}};
  const openTheme=item=>{setThemeModal(item||{id:null});setThemeForm(item?{nombre:item.nombre||'',descripcion:item.descripcion||'',fechaInicio:item.fechaInicio||'',fechaFin:item.fechaFin||'',gradient:item.gradient||'',decorations:item.decorations||'none',animations:item.animations!==false,colorPrimary:item.colorPrimary||'#8B5CF6',colorSecondary:item.colorSecondary||'#EC4899',colorButton:item.colorButton||'#8B5CF6',colorText:item.colorText||'#1E293B',colorBg:item.colorBg||'#FFFFFF',colorCard:item.colorCard||'#F8FAFC'}:EMPTY_THEME);};
  const restoreThemePalette=()=>{const key=inferThemePreset(themeForm.nombre,themeForm.descripcion);const preset=THEME_PRESETS[key];setThemeForm(v=>({...v,...preset,animations:true}));notify(key==='christmas'?'Paleta Navidad azul y plateado restaurada.':'Colores sugeridos restaurados.');};
  const saveTheme=async()=>{const nombre=themeForm.nombre.trim();if(!nombre)return notify('Escribe un nombre para el tema.',false);if(themeForm.fechaInicio&&themeForm.fechaFin&&themeForm.fechaInicio>themeForm.fechaFin)return notify('La fecha final no puede ser anterior a la inicial.',false);setSaving(true);try{const id=themeModal?.id||`tema_${Date.now()}`;const data={...themeForm,nombre,descripcion:themeForm.descripcion.trim(),isDefault:themeModal?.id?(themes.find(t=>t.id===themeModal.id)?.isDefault||false):themes.length===0,activo:themeModal?.id?(themes.find(t=>t.id===themeModal.id)?.activo||false):false,updatedAt:new Date().toISOString()};await commitMutation(b=>b.set(itemRef('temas_web',id),data,{merge:true}),['temas_web']);setThemeModal(null);await refresh();notify(themeModal?.id?'Tema actualizado.':'Tema creado.');}catch(e){console.error(e);notify('No se pudo guardar el tema.',false);}finally{setSaving(false);}};

  // GALERÍA
  const addGalleryImage=async file=>{try{const url=await uploadImage(file);if(!url)return;const id=doc(colRef('galeria_web')).id;await commitMutation(b=>b.set(itemRef('galeria_web',id),{image:url,createdAt:new Date().toISOString()}),['galeria_web']);await refresh();notify('Imagen agregada a la galería.');}catch(e){console.error(e);notify('No se pudo subir la imagen.',false);}};
  const deleteGalleryImage=async item=>{if(!window.confirm('¿Eliminar esta imagen de la galería?'))return;try{await commitMutation(b=>b.delete(itemRef('galeria_web',item.id)),['galeria_web']);await refresh();notify('Imagen eliminada.');}catch(e){console.error(e);notify('No se pudo eliminar la imagen.',false);}};

  // CUPONES
  const openCoupon=item=>{setCouponModal(item||{id:null});setCouponForm(item?{code:item.code||item.id||'',type:item.type||'percent',discount:item.discount??'',activo:item.activo!==false&&item.active!==false}:EMPTY_COUPON);};
  const saveCoupon=async()=>{const code=couponForm.code.trim().toUpperCase(),discount=Number(couponForm.discount);if(!/^[A-Z0-9_-]{2,40}$/.test(code)||!Number.isFinite(discount)||discount<=0||(couponForm.type==='percent'&&discount>100))return notify('Revisa el código y el descuento.',false);setSaving(true);try{if(couponModal?.id&&couponModal.id!==code)await commitMutation(b=>{b.delete(itemRef('cupones_web',couponModal.id));b.set(itemRef('cupones_web',code),{code,type:couponForm.type,discount,activo:!!couponForm.activo,updatedAt:new Date().toISOString()});},['cupones_web']);else await commitMutation(b=>b.set(itemRef('cupones_web',code),{code,type:couponForm.type,discount,activo:!!couponForm.activo,updatedAt:new Date().toISOString()},{merge:true}),['cupones_web']);setCouponModal(null);await refresh();notify(couponModal?.id?'Cupón actualizado.':'Cupón creado.');}catch(e){console.error(e);notify('No se pudo guardar el cupón.',false);}finally{setSaving(false);}};
  const toggleCoupon=async item=>{try{const active=item.activo!==false&&item.active!==false;await commitMutation(b=>b.set(itemRef('cupones_web',item.id),{activo:!active,updatedAt:new Date().toISOString()},{merge:true}),['cupones_web']);await refresh();notify(!active?'Cupón activado.':'Cupón desactivado.');}catch(e){console.error(e);notify('No se pudo cambiar el cupón.',false);}};
  const deleteCoupon=async item=>{if(!window.confirm(`¿Eliminar el cupón ${item.code||item.id}?`))return;try{await commitMutation(b=>b.delete(itemRef('cupones_web',item.id)),['cupones_web']);await refresh();notify('Cupón eliminado.');}catch(e){console.error(e);notify('No se pudo eliminar el cupón.',false);}};

  const saveSettings=async()=>{setSaving(true);try{await commitMutation(b=>b.set(itemRef('config_web','global'),{bannerActive:!!settings.bannerActive,bannerText:settings.bannerText,updatedAt:new Date().toISOString()},{merge:true}),['config_web']);await refresh();notify('Configuración web guardada.');}catch(e){console.error(e);notify('No se pudo guardar la configuración.',false);}finally{setSaving(false);}};

  const filteredPackages=useMemo(()=>{const q=queryText.trim().toLowerCase();return packages.filter(p=>{let categoryOk=true;if(categoryFilter==='destacados')categoryOk=!!p.destacado;else if(categoryFilter==='ofertas')categoryOk=!!p.oferta;else if(categoryFilter!=='all')categoryOk=p.categoria===categoryFilter;return categoryOk&&(!q||String(p.nombre||'').toLowerCase().includes(q));});},[packages,categoryFilter,queryText]);
  const activeCategories=categories.filter(c=>!(c.activo===false||c.visible===false||c.visibilidad==='oculto')).length;
  const featuredCount=packages.filter(p=>p.destacado).length;
  const activeCampaigns=campaigns.filter(c=>c.activo!==false).length;
  const activeCoupons=coupons.filter(c=>c.activo!==false&&c.active!==false).length;

  const cards=[
    {id:'categories',title:'Catálogos',desc:'Categorías, orden y visibilidad.',count:categories.length,Icon:FolderOpen,tone:'violet'},
    {id:'packages',title:'Servicios y personajes',desc:'Paquetes, cantidades, fotos y precios.',count:packages.length,Icon:Package,tone:'pink'},
    {id:'campaigns',title:'Campañas',desc:'Promociones, fechas y destacados.',count:campaigns.length,Icon:Megaphone,tone:'rose'},
    {id:'themes',title:'Temas',desc:'Temporadas y diseño automático.',count:themes.length,Icon:Palette,tone:'amber'},
    {id:'gallery',title:'Galería',desc:'Imágenes públicas de Diverty.',count:gallery.length,Icon:Images,tone:'sky'},
    {id:'coupons',title:'Cupones',desc:'Descuentos activos y códigos.',count:coupons.length,Icon:TicketPercent,tone:'emerald'},
    {id:'settings',title:'Banner y ajustes',desc:'Mensaje superior de la página.',count:settings.bannerActive?'ON':'OFF',Icon:Settings2,tone:'slate'},
  ];
  const toneClasses={violet:'bg-violet-50 text-violet-600',pink:'bg-pink-50 text-pink-600',rose:'bg-rose-50 text-rose-600',amber:'bg-amber-50 text-amber-600',sky:'bg-sky-50 text-sky-600',emerald:'bg-emerald-50 text-emerald-600',slate:'bg-slate-100 text-slate-600'};
  const titles={categories:'Catálogos',packages:'Servicios y personajes',campaigns:'Campañas',themes:'Temas',gallery:'Galería',coupons:'Cupones',settings:'Banner y Ajustes'};

  if(view==='home') return <div className="space-y-5 pb-5 animate-fadeIn">
    <section className="rounded-[30px] overflow-hidden bg-gradient-to-br from-[#17142B] via-[#34256B] to-[#7657FF] p-5 sm:p-7 text-white shadow-[0_22px_55px_rgba(118,87,255,.23)] border border-white/10">
      <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-white/60 text-[10px] font-black uppercase tracking-[.18em]"><Globe2 size={15}/> Centro de control</div><h2 className="text-3xl sm:text-4xl font-black tracking-[-.04em] mt-2">Página Web</h2><p className="text-white/65 text-sm font-semibold mt-2 max-w-xl">Administra el contenido público de Diverty desde la misma app. Todo sigue conectado al Firebase actual.</p></div><button type="button" onClick={refresh} disabled={loading} className="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center active:scale-95"><RefreshCw size={19} className={loading?'animate-spin':''}/></button></div>
      <div className="grid grid-cols-4 gap-2 mt-6"><div className="rounded-2xl bg-white/10 p-3"><p className="text-[8px] uppercase font-black text-white/45">Catálogos</p><p className="text-xl font-black mt-1">{categories.length}</p><p className="text-[8px] font-bold text-emerald-300">{activeCategories} activos</p></div><div className="rounded-2xl bg-white/10 p-3"><p className="text-[8px] uppercase font-black text-white/45">Paquetes</p><p className="text-xl font-black mt-1">{packages.length}</p><p className="text-[8px] font-bold text-amber-300">{featuredCount} inicio</p></div><div className="rounded-2xl bg-white/10 p-3"><p className="text-[8px] uppercase font-black text-white/45">Campañas</p><p className="text-xl font-black mt-1">{campaigns.length}</p><p className="text-[8px] font-bold text-rose-200">{activeCampaigns} activas</p></div><div className="rounded-2xl bg-white/10 p-3"><p className="text-[8px] uppercase font-black text-white/45">Cupones</p><p className="text-xl font-black mt-1">{coupons.length}</p><p className="text-[8px] font-bold text-emerald-300">{activeCoupons} activos</p></div></div>
      <button type="button" onClick={()=>window.open(PUBLIC_SITE_URL,'_blank','noopener,noreferrer')} className="mt-4 min-h-[46px] px-4 rounded-2xl bg-white text-[#5E43D2] font-black text-[10px] uppercase tracking-[.14em] flex items-center justify-center gap-2 active:scale-[.98]"><Eye size={17}/> Ver página pública <ExternalLink size={14}/></button>
    </section>
    <div className="grid sm:grid-cols-2 gap-3">{cards.map(({id,title,desc,count,Icon,tone})=><button key={id} type="button" onClick={()=>openWebView(id)} className="text-left bg-white border border-slate-200/80 rounded-[24px] p-4 shadow-sm active:scale-[.99]"><div className={`w-11 h-11 rounded-2xl ${toneClasses[tone]} flex items-center justify-center mb-3`}><Icon size={22}/></div><div className="flex items-center justify-between gap-3"><div><h3 className="font-black text-lg text-slate-950">{title}</h3><p className="text-[11px] font-semibold text-slate-400 mt-1">{desc}</p></div><span className="text-xl font-black text-slate-700">{count}</span></div></button>)}</div>
    <div className="rounded-[24px] bg-emerald-50 border border-emerald-100 p-4 flex gap-3"><Check size={20} className="text-emerald-500 shrink-0 mt-0.5"/><div><p className="font-black text-sm text-emerald-900">Administrador integrado</p><p className="text-xs font-semibold text-emerald-800/70 mt-1">Catálogos, paquetes, campañas, temas, galería, cupones y banner ya se administran desde la app. El botón Atrás de Android ahora cierra primero la edición, vuelve a la sección anterior y conserva tu posición.</p></div></div>
  </div>;

  return <div className="pb-6 animate-fadeIn">
    <div className="flex items-center justify-between gap-3 mb-5"><button type="button" onClick={closeWebLayer} className="w-11 h-11 rounded-2xl bg-white border border-slate-200 text-slate-600 shadow-sm flex items-center justify-center active:scale-95"><ChevronLeft size={21}/></button><div className="flex-1 min-w-0"><p className="text-[9px] font-black uppercase tracking-[.17em] text-[#7657FF]">Página Web</p><h2 className="text-2xl sm:text-3xl font-black tracking-[-.035em] text-slate-950">{titles[view]}</h2></div><button type="button" onClick={refresh} className="w-11 h-11 rounded-2xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center"><RefreshCw size={18} className={loading?'animate-spin':''}/></button></div>

    {view==='categories' && <><button onClick={()=>openCategory(null)} className="w-full min-h-[58px] rounded-[20px] bg-gradient-to-r from-[#FF2A9D] to-[#7657FF] text-white font-black flex items-center justify-center gap-2 mb-5"><Plus size={20}/> Nuevo Catálogo</button><div className="space-y-3">{categories.map((item,index)=>{const hidden=item.activo===false||item.visible===false||item.visibilidad==='oculto';return <div key={item.id} className="bg-white rounded-[22px] border border-slate-200 p-3.5 flex items-center gap-3"><div className="w-14 h-14 rounded-[16px] bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-violet-600">{item.imagen?<img src={item.imagen} alt="" className="w-full h-full object-cover"/>:<FolderOpen size={23}/>}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="font-black text-sm truncate">{item.nombre}</h3><span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${hidden?'bg-rose-50 text-rose-500':item.visibilidad==='temporada'?'bg-amber-50 text-amber-600':'bg-emerald-50 text-emerald-600'}`}>{hidden?'Oculto':item.visibilidad==='temporada'?'Temporada':'Activo'}</span></div><p className="text-[10px] font-semibold text-slate-400 mt-1">Orden #{index+1}</p></div><div className="flex gap-1"><div className="flex flex-col gap-1"><button disabled={index===0} onClick={()=>moveCategory(index,-1)} className="w-8 h-7 rounded-lg bg-slate-50 text-slate-400 disabled:opacity-25 flex items-center justify-center"><ArrowUp size={13}/></button><button disabled={index===categories.length-1} onClick={()=>moveCategory(index,1)} className="w-8 h-7 rounded-lg bg-slate-50 text-slate-400 disabled:opacity-25 flex items-center justify-center"><ArrowDown size={13}/></button></div><button onClick={()=>copyDirectLink('categoria',item.id,'catálogo')} title="Copiar enlace directo" className="w-10 h-14 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center"><Copy size={17}/></button><button onClick={()=>openCategory(item)} className="w-10 h-14 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><Edit3 size={17}/></button><button onClick={()=>deleteCategory(item)} className="w-10 h-14 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center"><Trash2 size={17}/></button></div></div>})}{!loading&&!categories.length&&<EmptyState icon={FolderOpen} text="No hay catálogos todavía."/>}</div></>}

    {view==='packages' && <><button onClick={()=>openPackage(null)} className="w-full min-h-[58px] rounded-[20px] bg-gradient-to-r from-[#FF2A9D] to-[#7657FF] disabled:from-slate-300 disabled:to-slate-300 text-white font-black flex items-center justify-center gap-2 mb-4"><Plus size={20}/> Nuevo servicio / personaje</button><div className="relative mb-3"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input value={queryText} onChange={e=>setQueryText(e.target.value)} placeholder="Buscar servicio o personaje…" className={`${inputClass('pl-11')} shadow-sm`}/></div><div className="flex gap-2 overflow-x-auto pb-3">{[{id:'all',nombre:'Todos'},{id:'destacados',nombre:'Destacados'},{id:'ofertas',nombre:'Ofertas'},...categories].map(c=><button key={c.id} onClick={()=>setCategoryFilter(c.id)} className={`shrink-0 px-4 py-2 rounded-full text-[10px] font-black uppercase ${categoryFilter===c.id?'bg-violet-600 text-white':'bg-white border border-slate-200 text-slate-500'}`}>{c.nombre}</button>)}</div><div className="grid sm:grid-cols-2 gap-3">{filteredPackages.map(item=>{const cat=categories.find(c=>c.id===item.categoria),inCat=!['all','destacados','ofertas'].includes(categoryFilter);return <div key={item.id} className="bg-white rounded-[24px] border border-slate-200 overflow-hidden"><div className="flex gap-3 p-3.5"><div className="w-20 h-20 rounded-[18px] overflow-hidden bg-slate-100 shrink-0">{(item.imagenTarjeta||item.imagen)?<img src={item.imagenTarjeta||item.imagen} alt="" className="w-full h-full object-cover"/>:<Package className="m-auto mt-7 text-slate-300"/>}</div><div className="min-w-0 flex-1"><div className="flex gap-1">{item.oferta&&<span className="text-[8px] font-black bg-pink-50 text-pink-500 px-2 py-0.5 rounded-full">OFERTA</span>}{item.destacado&&<span className="text-[8px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">★ INICIO</span>}</div><h3 className="font-black text-sm truncate mt-1">{item.nombre}</h3><div className="flex items-baseline gap-2 mt-1">{item.oferta&&item.precioOriginal&&<span className="text-[10px] line-through text-slate-400">${money(item.precioOriginal)}</span>}<span className="text-lg font-black text-emerald-500">${money(item.precio)}</span></div><p className="text-[9px] font-bold uppercase text-slate-400 truncate">{cat?.nombre||item.categoria||'Sin categoría'} · {item.tipoCobro||'paquete'}</p></div></div><div className="border-t border-slate-100 p-2.5"><button onClick={()=>copyDirectLink('plan',item.id,'paquete')} className="w-full h-9 mb-2 rounded-xl bg-cyan-50 text-cyan-700 text-[10px] font-black flex items-center justify-center gap-1.5 border border-cyan-100"><Copy size={14}/> Copiar enlace directo</button><div className="flex gap-2">{inCat&&<><button onClick={()=>movePackage(item,-1)} className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center"><ArrowUp size={14}/></button><button onClick={()=>movePackage(item,1)} className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center"><ArrowDown size={14}/></button></>}<button onClick={()=>openPackage(item)} className="flex-1 h-9 rounded-xl bg-violet-50 text-violet-600 text-[10px] font-black flex items-center justify-center gap-1"><Edit3 size={14}/> Editar</button><button onClick={()=>deletePackage(item)} className="w-10 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center"><Trash2 size={14}/></button></div></div></div>})}</div>{!loading&&!filteredPackages.length&&<EmptyState icon={Package} text="No hay paquetes para este filtro."/>}</>}

    {view==='campaigns' && <><button onClick={()=>openCampaign(null)} className="w-full min-h-[58px] rounded-[20px] bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black flex items-center justify-center gap-2 mb-5"><Plus size={20}/> Nueva Campaña</button><div className="space-y-3">{campaigns.map((item,index)=><div key={item.id} className="bg-white rounded-[24px] border border-slate-200 p-3.5"><div className="flex gap-3"><div className="w-20 h-20 rounded-[18px] overflow-hidden bg-slate-100 shrink-0">{item.imagen?<img src={item.imagen} alt="" className="w-full h-full object-cover"/>:<Megaphone className="m-auto mt-7 text-slate-300"/>}</div><div className="flex-1 min-w-0"><div className="flex flex-wrap gap-1">{item.destacada&&<span className="text-[8px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">⭐ DESTACADA</span>}<span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${item.activo!==false?'bg-emerald-50 text-emerald-600':'bg-slate-100 text-slate-500'}`}>{item.activo!==false?'ACTIVA':'INACTIVA'}</span></div><h3 className="font-black text-sm truncate mt-1">{item.titulo}</h3><div className="mt-1">{item.precioOriginal&&Number(item.precioOriginal)>Number(item.precio||0)&&<span className="text-[10px] line-through text-slate-400 mr-2">${money(item.precioOriginal)}</span>}{item.precio!==null&&item.precio!==undefined?<span className="text-lg font-black text-emerald-500">${money(item.precio)}</span>:<span className="text-xs text-slate-400">Sin precio</span>}</div><p className="text-[9px] font-bold text-slate-400 mt-1">{item.fechaInicio||'—'} → {item.fechaFin||'—'} · Orden {index+1}</p></div></div><div className="grid grid-cols-[auto_auto_1fr_auto_auto] gap-2 mt-3 pt-3 border-t border-slate-100"><button disabled={index===0} onClick={()=>moveCampaign(index,-1)} className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 disabled:opacity-25 flex items-center justify-center"><ArrowUp size={14}/></button><button disabled={index===campaigns.length-1} onClick={()=>moveCampaign(index,1)} className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 disabled:opacity-25 flex items-center justify-center"><ArrowDown size={14}/></button><button onClick={()=>toggleCampaign(item)} className={`h-9 rounded-xl text-[10px] font-black ${item.activo!==false?'bg-slate-100 text-slate-600':'bg-emerald-50 text-emerald-600'}`}>{item.activo!==false?'Desactivar':'Activar'}</button><button onClick={()=>duplicateCampaign(item)} className="w-9 h-9 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center"><Copy size={14}/></button><button onClick={()=>openCampaign(item)} className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><Edit3 size={14}/></button></div><button onClick={()=>deleteCampaign(item)} className="w-full mt-2 h-9 rounded-xl bg-rose-50 text-rose-500 text-[10px] font-black flex items-center justify-center gap-1"><Trash2 size={14}/> Eliminar</button></div>)}{!loading&&!campaigns.length&&<EmptyState icon={Megaphone} text="No hay campañas creadas."/>}</div></>}

    {view==='themes' && <><div className="rounded-[24px] bg-white border border-slate-200 p-4 mb-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] uppercase font-black tracking-widest text-slate-400">Tema actual</p><h3 className="font-black text-lg text-slate-900 mt-1">{themes.find(t=>t.id===activeThemeId)?.nombre||'Sin tema'}</h3><p className="text-xs font-bold mt-1"><span className={themeConfig.modo==='automatico'?'text-emerald-600':'text-amber-600'}>{themeConfig.modo==='automatico'?'● Automático':'● Manual'}</span></p></div><button onClick={toggleThemeMode} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black">{themeConfig.modo==='manual'?'Volver a automático':'Cambiar a manual'}</button></div></div><button onClick={()=>openTheme(null)} className="w-full min-h-[58px] rounded-[20px] bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black flex items-center justify-center gap-2 mb-5"><Plus size={20}/> Crear Tema</button><div className="space-y-3">{themes.map(item=><div key={item.id} className={`bg-white rounded-[24px] border p-4 ${item.id===activeThemeId?'border-amber-300 shadow-[0_10px_30px_rgba(245,158,11,.10)]':'border-slate-200'}`}><div className="flex items-start gap-3"><div className="w-12 h-12 rounded-2xl border border-slate-200" style={{background:item.gradient||item.colorPrimary||'#8B5CF6'}}/><div className="flex-1"><div className="flex flex-wrap gap-1">{item.isDefault&&<span className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">DEFAULT</span>}{item.id===activeThemeId&&<span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">WEB ACTUAL</span>}</div><h3 className="font-black text-sm mt-1">{item.nombre}</h3><p className="text-[10px] text-slate-400 font-semibold mt-1">{item.fechaInicio&&item.fechaFin?`${item.fechaInicio} → ${item.fechaFin}`:'Sin programación'}</p></div><button onClick={()=>openTheme(item)} className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><Edit3 size={15}/></button></div><div className="grid grid-cols-2 gap-2 mt-3">{!item.isDefault?<button onClick={()=>setDefaultTheme(item.id)} className="h-10 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-black">Hacer predeterminado</button>:<div className="h-10 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-black flex items-center justify-center">Predeterminado</div>}{item.id===activeThemeId?<div className="h-10 rounded-xl bg-emerald-50 text-emerald-600 text-[10px] font-black flex items-center justify-center">Activo ahora</div>:<button onClick={()=>activateTheme(item.id)} className="h-10 rounded-xl bg-amber-50 text-amber-600 text-[10px] font-black">Activar manual</button>}</div></div>)}{!loading&&!themes.length&&<EmptyState icon={Palette} text="No hay temas creados."/>}</div></>}

    {view==='gallery' && <><label className="w-full min-h-[58px] rounded-[20px] bg-gradient-to-r from-sky-500 to-violet-600 text-white font-black flex items-center justify-center gap-2 mb-5 cursor-pointer relative"><input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e=>addGalleryImage(e.target.files?.[0])}/>{uploading?<Loader2 size={20} className="animate-spin"/>:<ImagePlus size={20}/>} Agregar imagen</label><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{gallery.map(item=><div key={item.id} className="relative rounded-[20px] overflow-hidden bg-slate-100 aspect-square border border-slate-200"><img src={item.image} alt="Diverty" className="w-full h-full object-cover"/><button onClick={()=>deleteGalleryImage(item)} className="absolute top-2 right-2 w-9 h-9 rounded-xl bg-slate-950/70 text-white flex items-center justify-center"><Trash2 size={15}/></button></div>)}</div>{!loading&&!gallery.length&&<EmptyState icon={Images} text="La galería está vacía."/>}</>}

    {view==='coupons' && <><button onClick={()=>openCoupon(null)} className="w-full min-h-[58px] rounded-[20px] bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black flex items-center justify-center gap-2 mb-5"><Plus size={20}/> Nuevo Cupón</button><div className="space-y-3">{coupons.map(item=>{const active=item.activo!==false&&item.active!==false;return <div key={item.id} className="bg-white rounded-[22px] border border-slate-200 p-4 flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><TicketPercent size={22}/></div><div className="flex-1"><h3 className="font-black text-base text-slate-950">{item.code||item.id}</h3><p className="text-xs font-bold text-slate-400">{item.type==='percent'?`${item.discount}% de descuento`:`$${money(item.discount)} de descuento`} · <span className={active?'text-emerald-600':'text-slate-400'}>{active?'Activo':'Inactivo'}</span></p></div><div className="flex gap-1"><button onClick={()=>toggleCoupon(item)} className={`px-3 h-10 rounded-xl text-[9px] font-black ${active?'bg-slate-100 text-slate-600':'bg-emerald-50 text-emerald-600'}`}>{active?'Apagar':'Activar'}</button><button onClick={()=>openCoupon(item)} className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><Edit3 size={15}/></button><button onClick={()=>deleteCoupon(item)} className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center"><Trash2 size={15}/></button></div></div>})}{!loading&&!coupons.length&&<EmptyState icon={TicketPercent} text="No hay cupones creados."/>}</div></>}

    {view==='settings' && <div className="space-y-4"><div className="bg-white rounded-[24px] border border-slate-200 p-5"><div className="flex items-center justify-between gap-3 mb-5"><div><h3 className="font-black text-lg text-slate-950">Banner superior</h3><p className="text-xs font-semibold text-slate-400 mt-1">Mensaje que aparece arriba en la página web.</p></div><button onClick={()=>setSettings(v=>({...v,bannerActive:!v.bannerActive}))} className={`w-14 h-8 rounded-full p-1 transition-colors ${settings.bannerActive?'bg-emerald-500':'bg-slate-300'}`}><span className={`block w-6 h-6 rounded-full bg-white shadow transition-transform ${settings.bannerActive?'translate-x-6':'translate-x-0'}`}/></button></div><Field label="Texto del banner"><textarea rows="4" className={`${inputClass()} py-3 resize-none`} value={settings.bannerText||''} onChange={e=>setSettings(v=>({...v,bannerText:e.target.value}))} placeholder="Ej. Reserva con tiempo para este fin de semana…"/></Field><button disabled={saving} onClick={saveSettings} className="w-full mt-4 min-h-[54px] rounded-[18px] bg-gradient-to-r from-[#FF2A9D] to-[#7657FF] text-white font-black flex items-center justify-center gap-2">{saving?<Loader2 size={18} className="animate-spin"/>:<Check size={18}/>} Guardar ajustes</button></div><div className="rounded-[22px] bg-amber-50 border border-amber-100 p-4 flex gap-3"><AlertTriangle size={19} className="text-amber-500 shrink-0"/><p className="text-xs font-semibold text-amber-800">Esta sección conserva exactamente los campos actuales de <b>config_web/global</b>: banner activo y texto. No estoy inventando configuraciones nuevas que tu página no use.</p></div></div>}

    {categoryModal&&<ModalShell title={categoryModal.id?'Editar catálogo':'Nuevo catálogo'} subtitle="Se publica en la web actual." onClose={()=>setCategoryModal(null)}><div className="space-y-4"><Field label="Nombre"><input className={inputClass()} value={categoryForm.nombre} onChange={e=>setCategoryForm(v=>({...v,nombre:e.target.value}))}/></Field><div className="grid sm:grid-cols-2 gap-4"><Field label="Visibilidad"><select className={inputClass()} value={categoryForm.visibilidad} onChange={e=>setCategoryForm(v=>({...v,visibilidad:e.target.value}))}><option value="activo">Activo</option><option value="temporada">Por temporada</option><option value="oculto">Oculto</option></select></Field><Field label="Icono"><input className={inputClass()} value={categoryForm.icono} onChange={e=>setCategoryForm(v=>({...v,icono:e.target.value}))}/></Field></div>{categoryForm.visibilidad==='temporada'&&<div className="grid grid-cols-2 gap-3"><Field label="Desde"><input type="date" className={inputClass()} value={categoryForm.fechaInicio} onChange={e=>setCategoryForm(v=>({...v,fechaInicio:e.target.value}))}/></Field><Field label="Hasta"><input type="date" className={inputClass()} value={categoryForm.fechaFin} onChange={e=>setCategoryForm(v=>({...v,fechaFin:e.target.value}))}/></Field></div>}<Field label="Imagen"><div className="grid grid-cols-[1fr_auto] gap-2"><input className={inputClass()} value={categoryForm.imagen} onChange={e=>setCategoryForm(v=>({...v,imagen:e.target.value}))}/><label className="w-14 h-[50px] rounded-[16px] bg-violet-50 text-violet-600 flex items-center justify-center cursor-pointer relative"><input type="file" accept="image/*" className="absolute inset-0 opacity-0" onChange={e=>uploadInto(e.target.files?.[0],setCategoryForm,'imagen')}/>{uploading?<Loader2 className="animate-spin" size={18}/>:<Upload size={18}/>}</label></div></Field>{categoryForm.imagen&&<img src={categoryForm.imagen} alt="" className="w-full h-40 object-cover rounded-[20px]"/>}<StickySaveButton disabled={saving||uploading} onClick={saveCategory} tone="pink">{saving?<Loader2 size={18} className="animate-spin"/>:<Check size={18}/>} Guardar catálogo</StickySaveButton></div></ModalShell>}

    {packageModal&&<ModalShell title={packageModal.id?'Editar servicio':'Nuevo servicio'} subtitle="Configura precio, cantidades o un personaje con foto." onClose={()=>setPackageModal(null)}><div className="space-y-4"><CatalogProductOptions form={packageForm} setForm={setPackageForm} categories={categories} inputClass={inputClass}/><Field label="Nombre"><input className={inputClass()} value={packageForm.nombre} onChange={e=>setPackageForm(v=>({...v,nombre:e.target.value}))}/></Field><div className="grid sm:grid-cols-2 gap-4"><Field label="Categoría"><select className={inputClass()} value={packageForm.categoria} onChange={e=>setPackageForm(v=>({...v,categoria:e.target.value}))}>{packageForm.tipoServicio==='personaje'&&!categories.some(c=>c.id==='personajes')&&<option value="personajes">Personajes (nuevo catálogo)</option>}{categories.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></Field><Field label="Tipo de cobro"><select className={inputClass()} disabled={packageForm.tipoServicio==='personaje'} value={packageForm.tipoCobro} onChange={e=>setPackageForm(v=>({...v,tipoCobro:e.target.value}))}><option value="paquete">Fijo</option><option value="hora">Por hora</option><option value="nino">Por niño</option><option value="unidad">Por unidad / cantidad</option></select></Field></div><div className="grid grid-cols-2 gap-3"><Field label={packageForm.tipoCobro==='unidad'?'Precio por unidad':'Precio'}><input type="number" min="0" step="0.01" className={inputClass()} value={packageForm.precio} onChange={e=>setPackageForm(v=>({...v,precio:e.target.value}))}/></Field><Field label="Orden"><input type="number" min="1" className={inputClass()} value={packageForm.orden} onChange={e=>setPackageForm(v=>({...v,orden:e.target.value}))}/></Field></div><div className="grid grid-cols-2 gap-3"><ToggleButton tone="pink" active={packageForm.oferta} onClick={()=>setPackageForm(v=>({...v,oferta:!v.oferta}))}>Oferta</ToggleButton><ToggleButton tone="amber" active={packageForm.destacado} onClick={()=>setPackageForm(v=>({...v,destacado:!v.destacado}))}>Destacado</ToggleButton></div>{packageForm.oferta&&<Field label="Precio original"><input type="number" className={inputClass()} value={packageForm.precioOriginal} onChange={e=>setPackageForm(v=>({...v,precioOriginal:e.target.value}))}/></Field>}<Field label="Descripción"><textarea rows="3" className={`${inputClass()} py-3`} value={packageForm.descripcion} onChange={e=>setPackageForm(v=>({...v,descripcion:e.target.value}))}/></Field><Field label="Servicios incluidos" hint="Agrégalos uno por uno y ordénalos con las flechas. Se guardan exactamente igual que antes."><div className="flex gap-2"><input className={inputClass()} value={serviceDraft} onChange={e=>setServiceDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addPackageService();}}} placeholder="Ej: 1 Animador, Juegos..."/><button type="button" onClick={addPackageService} className="w-14 shrink-0 rounded-[16px] bg-slate-900 text-white flex items-center justify-center"><Plus size={20}/></button></div><div className="mt-3 space-y-2">{packageServices.map((service,index)=><div key={`${service}-${index}`} className="rounded-[15px] border border-slate-200 bg-white px-3 py-2.5 flex items-center gap-2"><div className="flex-1 min-w-0 text-sm font-bold text-slate-800 break-words">{service}</div><button type="button" disabled={index===0} onClick={()=>movePackageService(index,-1)} className="w-8 h-8 shrink-0 rounded-lg bg-slate-50 text-slate-500 disabled:opacity-25 flex items-center justify-center"><ArrowUp size={13}/></button><button type="button" disabled={index===packageServices.length-1} onClick={()=>movePackageService(index,1)} className="w-8 h-8 shrink-0 rounded-lg bg-slate-50 text-slate-500 disabled:opacity-25 flex items-center justify-center"><ArrowDown size={13}/></button><button type="button" onClick={()=>removePackageService(index)} className="w-8 h-8 shrink-0 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center"><X size={13}/></button></div>)}{!packageServices.length&&<div className="rounded-[15px] border border-dashed border-slate-200 bg-white/60 px-4 py-5 text-center text-xs font-semibold text-slate-400">Todavía no hay servicios incluidos.</div>}</div></Field><Field label={packageForm.tipoServicio==='personaje'?'Foto del personaje':'Imagen interna'}><div className="grid grid-cols-[1fr_auto] gap-2"><input className={inputClass()} value={packageForm.imagen} onChange={e=>setPackageForm(v=>({...v,imagen:e.target.value}))}/><label className="w-14 h-[50px] rounded-[16px] bg-pink-50 text-pink-600 flex items-center justify-center cursor-pointer relative"><input type="file" accept="image/*" className="absolute inset-0 opacity-0" onChange={e=>uploadInto(e.target.files?.[0],setPackageForm,'imagen')}/><ImagePlus size={19}/></label></div></Field>{packageForm.imagen&&<div className="rounded-[18px] overflow-hidden border border-slate-200 bg-white"><div className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">Vista previa · imagen interna</div><img src={packageForm.imagen} alt="Vista previa interna" className="w-full h-44 object-cover"/></div>}<Field label="Portada de tarjeta (opcional)" hint="La misma función independiente que existe en tu administrador actual."><div className="grid grid-cols-[1fr_auto] gap-2"><input className={inputClass()} value={packageForm.imagenTarjeta} onChange={e=>setPackageForm(v=>({...v,imagenTarjeta:e.target.value}))}/><label className="w-14 h-[50px] rounded-[16px] bg-violet-50 text-violet-600 flex items-center justify-center cursor-pointer relative"><input type="file" accept="image/*" className="absolute inset-0 opacity-0" onChange={e=>uploadInto(e.target.files?.[0],setPackageForm,'imagenTarjeta')}/><ImagePlus size={19}/></label></div></Field>{packageForm.imagenTarjeta&&<div className="rounded-[18px] overflow-hidden border border-violet-100 bg-white"><div className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-violet-400">Vista previa · portada de tarjeta</div><img src={packageForm.imagenTarjeta} alt="Vista previa de tarjeta" className="w-full h-44 object-cover"/></div>}{packageForm.tipoServicio==='personaje'&&<button type="button" disabled={saving||uploading} onClick={()=>savePackage(true)} className="w-full min-h-[50px] rounded-2xl bg-white border border-violet-200 text-violet-700 font-black text-sm">Guardar y agregar otro personaje</button>}<StickySaveButton disabled={saving||uploading} onClick={()=>savePackage()} tone="pink">{saving?<Loader2 size={18} className="animate-spin"/>:<Check size={18}/>} Guardar cambios</StickySaveButton></div></ModalShell>}

    {campaignModal&&<ModalShell title={campaignModal.id?'Editar campaña':'Nueva campaña'} subtitle="Promociones visibles en la página pública." onClose={()=>setCampaignModal(null)}><div className="space-y-4"><Field label="Título"><input className={inputClass()} value={campaignForm.titulo} onChange={e=>setCampaignForm(v=>({...v,titulo:e.target.value}))}/></Field><Field label="Subtítulo"><input className={inputClass()} value={campaignForm.subtitulo} onChange={e=>setCampaignForm(v=>({...v,subtitulo:e.target.value}))}/></Field><Field label="Descripción"><textarea rows="3" className={`${inputClass()} py-3`} value={campaignForm.descripcion} onChange={e=>setCampaignForm(v=>({...v,descripcion:e.target.value}))}/></Field><div className="grid grid-cols-2 gap-3"><Field label="Inicio"><input type="date" className={inputClass()} value={campaignForm.fechaInicio} onChange={e=>setCampaignForm(v=>({...v,fechaInicio:e.target.value}))}/></Field><Field label="Fin"><input type="date" className={inputClass()} value={campaignForm.fechaFin} onChange={e=>setCampaignForm(v=>({...v,fechaFin:e.target.value}))}/></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Precio"><input type="number" className={inputClass()} value={campaignForm.precio} onChange={e=>setCampaignForm(v=>({...v,precio:e.target.value}))}/></Field><Field label="Precio anterior"><input type="number" className={inputClass()} value={campaignForm.precioOriginal} onChange={e=>setCampaignForm(v=>({...v,precioOriginal:e.target.value}))}/></Field></div><Field label="Lo que incluye" hint="Un elemento por línea."><textarea rows="5" className={`${inputClass()} py-3`} value={campaignForm.incluyeText} onChange={e=>setCampaignForm(v=>({...v,incluyeText:e.target.value}))}/></Field><div className="grid sm:grid-cols-2 gap-3"><Field label="Texto del botón"><input className={inputClass()} value={campaignForm.botonTexto} onChange={e=>setCampaignForm(v=>({...v,botonTexto:e.target.value}))}/></Field><Field label="Acción"><input className={inputClass()} value={campaignForm.accion} onChange={e=>setCampaignForm(v=>({...v,accion:e.target.value}))}/></Field></div><div className="grid grid-cols-3 gap-2"><ToggleButton active={campaignForm.activo} onClick={()=>setCampaignForm(v=>({...v,activo:!v.activo}))}>Activa</ToggleButton><ToggleButton tone="amber" active={campaignForm.destacada} onClick={()=>setCampaignForm(v=>({...v,destacada:!v.destacada}))}>Destacada</ToggleButton><Field label="Orden"><input type="number" className={inputClass()} value={campaignForm.orden} onChange={e=>setCampaignForm(v=>({...v,orden:e.target.value}))}/></Field></div><Field label="Imagen"><div className="grid grid-cols-[1fr_auto] gap-2"><input className={inputClass()} value={campaignForm.imagen} onChange={e=>setCampaignForm(v=>({...v,imagen:e.target.value}))}/><label className="w-14 h-[50px] rounded-[16px] bg-rose-50 text-rose-600 flex items-center justify-center cursor-pointer relative"><input type="file" accept="image/*" className="absolute inset-0 opacity-0" onChange={e=>uploadInto(e.target.files?.[0],setCampaignForm,'imagen')}/><ImagePlus size={19}/></label></div></Field>{campaignForm.imagen&&<img src={campaignForm.imagen} alt="" className="w-full h-44 object-cover rounded-[20px]"/>}<StickySaveButton disabled={saving||uploading} onClick={saveCampaign} tone="rose">{saving?<Loader2 size={18} className="animate-spin"/>:<Check size={18}/>} Guardar campaña</StickySaveButton></div></ModalShell>}

    {themeModal&&<ModalShell title={themeModal.id?'Editar tema':'Nuevo tema'} subtitle="Colores, fechas y decoración de temporada." onClose={()=>setThemeModal(null)}><div className="space-y-4"><Field label="Nombre"><input className={inputClass()} value={themeForm.nombre} onChange={e=>setThemeForm(v=>({...v,nombre:e.target.value}))}/></Field><Field label="Descripción"><input className={inputClass()} value={themeForm.descripcion} onChange={e=>setThemeForm(v=>({...v,descripcion:e.target.value}))}/></Field><div className="grid grid-cols-2 gap-3"><Field label="Inicio"><input type="date" className={inputClass()} value={themeForm.fechaInicio} onChange={e=>setThemeForm(v=>({...v,fechaInicio:e.target.value}))}/></Field><Field label="Fin"><input type="date" className={inputClass()} value={themeForm.fechaFin} onChange={e=>setThemeForm(v=>({...v,fechaFin:e.target.value}))}/></Field></div><div className="grid grid-cols-2 gap-3">{[['colorPrimary','Primario'],['colorSecondary','Secundario'],['colorButton','Botón'],['colorText','Texto'],['colorBg','Fondo'],['colorCard','Tarjeta']].map(([key,label])=><Field key={key} label={label}><div className="grid grid-cols-[50px_1fr] gap-2"><input type="color" className="w-[50px] h-[50px] rounded-xl border border-slate-200 p-1 bg-white" value={themeForm[key]} onChange={e=>setThemeForm(v=>({...v,[key]:e.target.value}))}/><input className={inputClass()} value={themeForm[key]} onChange={e=>setThemeForm(v=>({...v,[key]:e.target.value}))}/></div></Field>)}</div><Field label="Gradiente CSS"><input className={inputClass()} value={themeForm.gradient} onChange={e=>setThemeForm(v=>({...v,gradient:e.target.value}))} placeholder="linear-gradient(135deg, #... , #...)"/></Field><button type="button" onClick={restoreThemePalette} className="w-full min-h-[48px] rounded-[16px] border border-amber-200 bg-amber-50 text-amber-700 font-black text-xs flex items-center justify-center gap-2"><RefreshCw size={16}/> Restaurar paleta sugerida para este tema</button><div className="grid grid-cols-2 gap-3"><Field label="Decoración"><select className={inputClass()} value={themeForm.decorations} onChange={e=>setThemeForm(v=>({...v,decorations:e.target.value}))}><option value="none">Ninguna</option><option value="snow">Nieve</option><option value="confetti">Confeti</option></select></Field><ToggleButton active={themeForm.animations} onClick={()=>setThemeForm(v=>({...v,animations:!v.animations}))}>Animaciones</ToggleButton></div><StickySaveButton disabled={saving} onClick={saveTheme} tone="amber">{saving?<Loader2 size={18} className="animate-spin"/>:<Check size={18}/>} Guardar tema</StickySaveButton></div></ModalShell>}

    {couponModal&&<ModalShell title={couponModal.id?'Editar cupón':'Nuevo cupón'} subtitle="Código de descuento para reservas web." onClose={()=>setCouponModal(null)}><div className="space-y-4"><Field label="Código"><input className={`${inputClass()} uppercase`} value={couponForm.code} onChange={e=>setCouponForm(v=>({...v,code:e.target.value.toUpperCase()}))} placeholder="DIVERTY10"/></Field><div className="grid grid-cols-2 gap-3"><Field label="Tipo"><select className={inputClass()} value={couponForm.type} onChange={e=>setCouponForm(v=>({...v,type:e.target.value}))}><option value="percent">Porcentaje</option><option value="fixed">Monto fijo</option></select></Field><Field label="Descuento"><input type="number" min="0" step="0.01" className={inputClass()} value={couponForm.discount} onChange={e=>setCouponForm(v=>({...v,discount:e.target.value}))}/></Field></div><ToggleButton active={couponForm.activo} onClick={()=>setCouponForm(v=>({...v,activo:!v.activo}))}>Cupón activo</ToggleButton><StickySaveButton disabled={saving} onClick={saveCoupon} tone="emerald">{saving?<Loader2 size={18} className="animate-spin"/>:<Check size={18}/>} Guardar cupón</StickySaveButton></div></ModalShell>}
  </div>;
}
