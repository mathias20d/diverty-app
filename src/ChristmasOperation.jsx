import React from 'react';
import {utils,isPendingWebRequest,christmasInsertionPlan,christmasEventGps,christmasTimeMinutes,ChevronLeft,Info,BellRing,MapIcon,ChevronDown,ChevronRight,CheckCircle2,MessageCircle,MapPin,RefreshCw,Trash2} from './christmas-core.jsx';
export default function ChristmasOperation({eventosActivos,christmasDayFilter,setExpandedChristmasId,setChristmasDayFilter,setIsChristmasOpsOpen,christmasSantaCapacity,patchEventoAtomic,setEventos,showAlert,openGoogleMaps,showConfirm,deleteEventoSynced,publishSync,setChristmasVisibility,setIsNotifOpen,expandedChristmasId,onNew,onSettings,onManage,onLogout,onEdit,onPay,companyName}) {
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
          const finishChristmasSeason = () => showConfirm('¿Ocultar Operación Navidad al terminar la temporada? No se borrará ninguna reserva y podrás volver a mostrarla desde Santas y ajustes.', ()=>{ setChristmasVisibility(false); showAlert('Operación Navidad quedó oculta. Tus reservas se conservaron.', true); });

          return <div className="fixed left-0 top-0 right-0 bottom-0 w-screen h-[100dvh] max-w-none z-[78] bg-[#F6F7FB] overflow-y-auto overscroll-none [-webkit-overflow-scrolling:touch] pb-[calc(92px+env(safe-area-inset-bottom))] isolate" style={{backgroundColor:'#F6F7FB',backgroundImage:'radial-gradient(circle at top, rgba(239,68,68,.08), transparent 26%)'}}><nav aria-label="Acciones de Navidad" className="navidad-actions navidad-operation-actions"><strong>{companyName}</strong><button onClick={onNew}>Nueva entrega</button><button onClick={()=>setIsNotifOpen(true)}>Solicitudes web</button><button onClick={onManage}>Reservas</button><button onClick={onSettings}>Santas y ajustes</button><button onClick={onLogout}>Cerrar sesión</button></nav>
            <div className="relative z-20 bg-[linear-gradient(135deg,#5E0B17_0%,#A3192B_62%,#B42839_100%)] text-white shadow-[0_10px_28px_rgba(127,29,29,.22)] pt-[max(52px,calc(env(safe-area-inset-top)+40px))]">
              <div className="max-w-4xl mx-auto px-4 pb-4">
                <button type="button" onClick={closeChristmas} className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/25 px-4 py-3 text-[11px] font-black uppercase tracking-[.12em] active:scale-[.97]"><ChevronLeft size={18}/> Inicio</button>
                <div className="mt-3 flex items-end justify-between gap-4"><div><p className="text-[12px] font-black uppercase tracking-[.2em] text-white/65">24 y 25 de diciembre</p><h2 className="text-3xl sm:text-4xl font-black tracking-[-.035em] mt-1">Operación Navidad</h2><p className="text-sm font-bold text-white/75 mt-1">Entregas, siguiente parada y rutas por Santa</p></div><div className="w-14 h-14 rounded-[19px] bg-white/12 border border-white/20 flex items-center justify-center text-3xl shrink-0">🎅</div></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                  <div className="rounded-[18px] bg-white/10 border border-white/10 p-3"><p className="text-2xl font-black">{pendingDeliveryCount}</p><p className="text-[11px] uppercase font-black tracking-wider text-white/65">Pendientes</p></div>
                  <div className="rounded-[18px] bg-emerald-300/15 border border-emerald-100/20 p-3"><p className="text-2xl font-black">{deliveredCount}</p><p className="text-[11px] uppercase font-black tracking-wider text-white/75">Realizadas</p></div>
                  <button type="button" onClick={()=>{utils.triggerHaptic('light');setIsNotifOpen(true)}} className={`text-left rounded-[18px] border p-3 active:scale-[.98] ${pendingChristmasRequests.length?'bg-amber-300/20 border-amber-200/35':'bg-white/10 border-white/10'}`}><p className="text-2xl font-black">{pendingChristmasRequests.length}</p><p className="text-[11px] uppercase font-black tracking-wider text-white/75">Por revisar</p></button>
                  <div className="rounded-[18px] bg-white/10 border border-white/10 p-3"><p className="text-2xl font-black">{christmasSantaCapacity}</p><p className="text-[11px] uppercase font-black tracking-wider text-white/65">Santas</p></div>
                </div>
              </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
              <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm p-4 flex items-start gap-3"><div className="w-11 h-11 rounded-[15px] bg-red-50 text-red-600 flex items-center justify-center shrink-0"><Info size={21}/></div><div><p className="font-black text-slate-950">Modo operativo</p><p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">Marca cada visita como <b>Entrega realizada</b>. La ruta deja de incluirla y la siguiente parada queda resaltada automáticamente.</p></div></div>

              <div className="grid grid-cols-3 gap-2 rounded-[22px] bg-white border border-slate-100 shadow-sm p-2">{[{id:'all',label:'24 + 25'},{id:'24',label:'24 Dic'},{id:'25',label:'25 Dic'}].map(day=><button key={day.id} type="button" onClick={()=>{utils.triggerHaptic('light');setExpandedChristmasId(null);setChristmasDayFilter(day.id)}} className={`min-h-[44px] rounded-[14px] text-[11px] font-black uppercase tracking-[.1em] border transition-all ${christmasDayFilter===day.id?'bg-[#A3192B] text-white border-[#A3192B] shadow-sm':'bg-slate-50 text-slate-500 border-slate-100'}`}>{day.label}</button>)}</div>

              {christmasEvents.length===0 ? <div className="rounded-[28px] bg-white border border-slate-100 shadow-sm px-6 py-12 text-center"><div className="text-5xl mb-4">🎄</div><h3 className="text-xl font-black text-slate-950">Aún no hay entregas confirmadas</h3><p className="text-sm font-semibold text-slate-500 mt-2">{pendingChristmasRequests.length ? `Tienes ${pendingChristmasRequests.length} ${pendingChristmasRequests.length===1?'solicitud':'solicitudes'} por revisar. Sus horarios permanecen apartados hasta aceptar o rechazar.` : 'Las reservas aceptadas del 24 y 25 aparecerán aquí.'}</p>{pendingChristmasRequests.length>0&&<button type="button" onClick={()=>{utils.triggerHaptic('light');setIsNotifOpen(true)}} className="mt-5 inline-flex items-center justify-center gap-2 rounded-[15px] bg-amber-500 px-5 py-3 text-[12px] font-black uppercase tracking-[.1em] text-white shadow-sm active:scale-[.98]"><BellRing size={16}/> Revisar solicitudes</button>}</div> :
              <div className="space-y-4">{santaNames.map(santa=>{
                const stops=christmasEvents.filter(e=>(String(e.santaAsignado||'Sin asignar').trim()||'Sin asignar')===santa);
                if(!stops.length && santa==='Sin asignar') return null;
                const pendingStops=stops.filter(e=>!isDelivered(e));
                const completedStops=stops.filter(isDelivered);
                const nextStop=pendingStops[0] || null;
                return <section key={santa} className="rounded-[26px] bg-white border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,.065)] overflow-hidden">
                  <div className={`p-4 border-b flex items-center justify-between gap-3 ${santa==='Sin asignar'?'bg-amber-50 border-amber-100':'bg-gradient-to-r from-red-50 to-orange-50 border-red-100'}`}>
                    <div className="flex items-center gap-3 min-w-0"><div className="w-11 h-11 rounded-[15px] bg-white shadow-sm flex items-center justify-center text-2xl shrink-0">{santa==='Sin asignar'?'⚠️':'🎅'}</div><div className="min-w-0"><p className="font-black text-slate-950 truncate">{santa}</p><p className="text-[12px] font-bold text-slate-500">{pendingStops.length} pendientes · {completedStops.length} realizadas</p></div></div>
                    {santa!=='Sin asignar' && pendingStops.length>0 ? <button type="button" onClick={()=>openSantaRoute(pendingStops)} className="shrink-0 rounded-[13px] bg-slate-950 text-white px-3 py-2.5 text-[11px] font-black uppercase tracking-wider active:scale-[.97] flex items-center gap-1.5"><MapIcon size={14}/> Ruta pendiente</button> : <span className="shrink-0 rounded-[13px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-2.5 text-[11px] font-black uppercase tracking-wider">Ruta completa</span>}
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
                        <div className="flex items-center gap-3"><div className={`w-[78px] h-[58px] rounded-[17px] text-white flex flex-col items-center justify-center shrink-0 shadow-sm px-1 ${delivered?'bg-emerald-600':isNext?'bg-amber-500':'bg-slate-950'}`}><span className="text-[11px] font-black uppercase text-white/65">Hora</span><span className="text-[12px] leading-none font-black whitespace-nowrap tracking-[-.02em]">{formatChristmasTime(ev.hora)}</span></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2 flex-wrap"><span className={`text-[11px] font-black uppercase tracking-wider ${delivered?'text-emerald-600':isNext?'text-amber-600':'text-red-500'}`}>Parada {idx+1}</span>{delivered?<span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">✓ Entregada</span>:isNext?<span className="text-[11px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">Siguiente</span>:<span className="text-[11px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-full">Pendiente</span>}{conflict&&<span className="text-[11px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">Revisar tiempo</span>}</div><p className={`font-black text-[17px] truncate mt-1 ${delivered?'text-slate-500 line-through decoration-emerald-400/50':'text-slate-950'}`}>{ev.cliente||'Cliente'}</p><p className="text-[12px] font-bold text-slate-500 truncate mt-1">{ev.referenciaLugar||ev.ubicacion||'Ubicación por revisar'}</p></div><ChevronDown size={20} className={`text-slate-400 shrink-0 transition-transform ${expanded?'rotate-180':''}`}/></div>
                      </button>
                      {expanded&&<div className="px-4 pb-4 border-t border-slate-100">
                        {isNext && <div className="mt-4 rounded-[16px] bg-amber-50 border border-amber-200 p-3 flex items-center gap-3"><div className="w-9 h-9 rounded-[12px] bg-amber-500 text-white flex items-center justify-center"><ChevronRight size={20}/></div><div><p className="text-[11px] font-black uppercase tracking-wider text-amber-600">Vamos con la siguiente</p><p className="text-sm font-black text-slate-900 mt-0.5">{ev.cliente} · {formatChristmasTime(ev.hora)}</p></div></div>}
                        {delivered && <div className="mt-4 rounded-[16px] bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-3"><CheckCircle2 size={24} className="text-emerald-500"/><div><p className="text-[11px] font-black uppercase tracking-wider text-emerald-600">Entrega realizada</p><p className="text-[11px] font-semibold text-slate-600 mt-0.5">Esta parada ya no se incluye en la ruta pendiente.</p></div></div>}
                        <div className="grid grid-cols-2 gap-2 mt-4"><div className="rounded-[15px] bg-slate-50 p-3"><p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Fecha</p><p className="font-black text-slate-800 mt-1 text-sm">{String(ev.fecha||'').split('-').reverse().join('/')||'—'}</p></div><div className="rounded-[15px] bg-slate-50 p-3"><p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Niños</p><p className="font-black text-slate-800 mt-1 text-sm">{ev.ninos||'No indicado'}</p></div>{(()=>{const n=Number(String(ev.ninos||'').match(/\d+/)?.[0]||0);return n>2?<div className="col-span-2 rounded-[15px] bg-amber-50 border border-amber-200 p-3"><p className="text-[11px] font-black uppercase tracking-wider text-amber-700">⚠ Revisar cantidad de niños</p><p className="text-[11px] font-semibold text-amber-700 mt-1">Navidad admite máximo 2 niños por reserva. Esta reserva indica {n}.</p></div>:null})()}<div className="rounded-[15px] bg-slate-50 p-3"><p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total</p><p className="font-black text-slate-800 mt-1 text-sm">{money(ev.total)}</p></div><div className={`rounded-[15px] p-3 ${saldo>0?'bg-rose-50':'bg-emerald-50'}`}><p className={`text-[11px] font-black uppercase tracking-wider ${saldo>0?'text-rose-400':'text-emerald-500'}`}>Saldo</p><p className={`font-black mt-1 text-sm ${saldo>0?'text-rose-600':'text-emerald-600'}`}>{saldo>0?money(saldo):'Pagado'}</p></div></div>
                        <div className="mt-2 rounded-[16px] bg-[#F2F5F9] border border-[#1F3A5F]/10 p-3"><p className="text-[11px] font-black uppercase tracking-wider text-[#1F3A5F]">Servicio</p><p className="text-sm font-black text-slate-900 mt-1 whitespace-pre-wrap">{ev.servicio||'Entrega de Nochebuena'}</p>{ev.descripcionEvento&&<p className="text-[11px] font-semibold text-slate-600 mt-2 whitespace-pre-wrap leading-relaxed">{ev.descripcionEvento}</p>}</div>
                        <div className="mt-2 rounded-[16px] bg-slate-50 p-3"><p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Dirección / GPS</p><p className="text-[11px] font-bold text-slate-700 mt-1 break-words whitespace-pre-wrap">{ev.direccion||'No indicada'}</p>{ev.referenciaLugar&&<><p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mt-3">Referencia</p><p className="text-[11px] font-bold text-slate-700 mt-1 whitespace-pre-wrap">{ev.referenciaLugar}</p></>}{ev.comentarios&&<><p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mt-3">Comentarios</p><p className="text-[11px] font-semibold text-slate-600 mt-1 whitespace-pre-wrap">{ev.comentarios}</p></>}</div>
                        <div className="mt-3"><p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Santa asignado</p><div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">{enabledSantas.map(name=><button key={name} type="button" onClick={()=>reassignSanta(ev,name)} className={`shrink-0 px-3 py-2.5 rounded-[13px] text-[11px] font-black uppercase tracking-wider border ${String(ev.santaAsignado||'')===name?'bg-[#A3192B] text-white border-[#A3192B]':'bg-white text-slate-600 border-slate-200'}`}>{name}</button>)}</div></div>
                        <div className="grid grid-cols-2 gap-2 mt-3">{phone?<button type="button" onClick={()=>utils.openWhatsAppBusiness(phone,`Hola ${ev.cliente||''}, te contactamos de Diverty Eventos sobre tu entrega de Navidad.`)} className="min-h-[46px] rounded-[14px] bg-emerald-50 text-emerald-600 border border-emerald-100 font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2"><MessageCircle size={16}/> WhatsApp</button>:<div/>}<button type="button" onClick={()=>openGoogleMaps(ev.direccion, ev.ubicacion, ev)} className="min-h-[46px] rounded-[14px] bg-[#1F3A5F]/10 text-[#1F3A5F] border border-[#1F3A5F]/15 font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2"><MapPin size={16}/> GPS / Waze</button></div>
                        {!delivered ? <button type="button" onClick={()=>markChristmasDelivered(ev)} className="mt-2 w-full min-h-[52px] rounded-[15px] bg-emerald-500 text-white border border-emerald-500 font-black text-[12px] uppercase tracking-[.12em] flex items-center justify-center gap-2 shadow-[0_10px_24px_rgba(16,185,129,.18)] active:scale-[.98]"><CheckCircle2 size={18}/> Marcar entrega realizada</button> : <button type="button" onClick={()=>reopenChristmasDelivery(ev)} className="mt-2 w-full min-h-[46px] rounded-[15px] bg-white text-slate-500 border border-slate-200 font-black text-[11px] uppercase tracking-[.1em] flex items-center justify-center gap-2 active:scale-[.98]"><RefreshCw size={15}/> Volver a pendiente</button>}
                        <div className="navidad-actions"><button onClick={()=>onEdit(ev)}>Editar reserva</button><button onClick={()=>onPay(ev)}>Registrar abono</button></div><button type="button" onClick={()=>deleteChristmas(ev)} className="mt-2 w-full min-h-[48px] rounded-[15px] bg-rose-50 text-rose-600 border border-rose-200 font-black text-[12px] uppercase tracking-[.12em] flex items-center justify-center gap-2 active:scale-[.98]"><Trash2 size={17}/> Eliminar reserva y liberar cupo</button>
                      </div>}
                    </article>;
                  })}</div>
                </section>;
              })}</div>}

              <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm p-4"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-[14px] bg-slate-100 flex items-center justify-center text-xl">🎄</div><div className="min-w-0 flex-1"><p className="font-black text-slate-950">Cuando termine la temporada</p><p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">Puedes quitar Operación Navidad de la vista principal sin borrar las reservas ni el historial.</p></div></div><button type="button" onClick={finishChristmasSeason} className="mt-4 w-full min-h-[48px] rounded-[15px] bg-slate-950 text-white font-black text-[12px] uppercase tracking-[.12em] active:scale-[.98]">Finalizar temporada y ocultar módulo</button></div>
            </div>
          </div>;
        }
