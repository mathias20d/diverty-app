import React from 'react';
import { AlertTriangle, Award, BellRing, Briefcase, CalendarDays, ChevronLeft, ChevronRight, Cloud, FileSpreadsheet, Info, Lock, Save, Settings, Sparkles, Trash2, Users } from 'lucide-react';

export default function SettingsView({
  Field,
  LOGO_URL,
  activarNotificaciones,
  appSettings,
  christmasModuleVisible,
  christmasSantaCapacity,
  configView,
  eventosActivos,
  handleLogout,
  handleWipeAll,
  isOnline,
  isPendingWebRequest,
  normalSimultaneousCapacity,
  prepareDivertyData,
  saveStaffCapacity,
  setChristmasSantaCapacity,
  setChristmasVisibility,
  setConfigView,
  setNormalSimultaneousCapacity,
  setStaffCapacity,
  showAlert,
  staffCapacity,
  todayStr,
  updateSettings,
  utils
}) {
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
  }
