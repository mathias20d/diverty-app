import React, {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import IncrementalList from '../../components/IncrementalList.jsx';
import {CONTROL_FILTERS,FOLLOWUP_STATES,filterReservationControl,readFollowup,reservationControlRows} from '../../lib/reservation-followup.mjs';
import {serviceOrderStaff} from '../../lib/service-order.mjs';
import {useReservationViewport} from '../../lib/use-reservation-viewport.mjs';

const button = 'min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 disabled:opacity-40';
const dateLabel = value => /^\d{4}-\d{2}-\d{2}$/.test(value||'') ? value.split('-').reverse().join('/') : 'Sin fecha';
const money = value => `$${value.toFixed(2)}`;
const staffLabel = event => event.santaAsignado || serviceOrderStaff(event).map(person=>`${person.name} (${person.role})`).join(', ') || 'Sin asignar';

export default function ReservationControl({events,today,catalog,loading,loadError,catalogLoading,catalogError,onRetry,onRetryCatalog,onClose,onEdit,onReview,onConvert,onDocument,onPayment,onAdvance,onSaveFollowup}) {
  const [filter,setFilter] = useState('contact'), [search,setSearch] = useState(''), [date,setDate] = useState('');
  const [editing,setEditing] = useState(null), [draft,setDraft] = useState(null), [saving,setSaving] = useState(false), [saveError,setSaveError] = useState('');
  const [notice,setNotice] = useState('');
  const dialogRef=useRef(null);
  const viewportRef=useRef(null);
  const scrollRef=useRef(null);
  useReservationViewport(viewportRef,scrollRef);
  const rows=useMemo(()=>reservationControlRows(events,today,catalog),[events,today,catalog]);
  const visible=useMemo(()=>filterReservationControl(rows,{filter,search,date}),[rows,filter,search,date]);
  const counts=useMemo(()=>Object.fromEntries(CONTROL_FILTERS.map(([key])=>[key,rows.filter(row=>row.flags[key]).length])),[rows]);
  useEffect(()=>{
    const previous=document.activeElement;
    dialogRef.current?.querySelector('[data-close-control]')?.focus();
    return ()=>{if(previous?.isConnected)previous.focus();};
  },[]);
  const keyDown=event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(!saving){if(editing)setEditing(null);else onClose();}}
    if(event.key==='Tab'){
      const elements=[...dialogRef.current.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(element=>element.getClientRects().length);
      const first=elements[0],last=elements.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  };
  const editFollowup=row=>{setEditing(row.event);setDraft(readFollowup(row.event));setSaveError('');setNotice('');};
  const save=async event=>{
    event.preventDefault();if(saving)return;setSaving(true);setSaveError('');
    try{await onSaveFollowup(editing,draft);setEditing(null);setNotice('Seguimiento guardado.');}
    catch(error){setSaveError(error.message==='FOLLOWUP_CHANGED'?'Otro equipo cambió el seguimiento. Cancela y vuelve a abrirlo para ver la información actual.':'No se pudo guardar. Tus campos se conservaron; revisa la conexión y reintenta.');}
    finally{setSaving(false);}
  };
  const actions=row=><div className="flex flex-wrap gap-2" aria-label={`Acciones de ${row.event.cliente}`}>
    {row.web?<button className={button} onClick={()=>onReview(row.event)}>Revisar solicitud</button>:<button className={button} onClick={()=>onEdit(row.event,row.quote)}>Abrir reserva</button>}
    {!row.archived&&!row.complete&&<button className={button} onClick={()=>editFollowup(row)}>Seguimiento</button>}
    {row.quote?<><button className={button} onClick={()=>onDocument(row.event,'cotizacion')}>Cotización PDF</button><button className={button} onClick={()=>onConvert(row.event)}>Crear reserva</button></>:!row.web&&<>
      <button className={button} onClick={()=>onDocument(row.event,'orden_servicio')}>Personal / orden</button>
      <button className={button} onClick={()=>onDocument(row.event,'factura')}>Factura PDF</button>
      <button className={button} onClick={()=>onDocument(row.event,'contrato')}>Contrato PDF</button>
      {!row.archived&&row.balance>0&&<button className={button} onClick={()=>onPayment(row.event)}>Registrar abono</button>}
      {!row.archived&&!row.complete&&!row.christmas&&<button className={button} onClick={()=>onAdvance(row.event)}>Avanzar estado</button>}
    </>}
  </div>;
  const summary=row=><>
    <p className="font-black text-slate-950 break-words">{row.event.cliente||'Sin cliente'}</p>
    <p className="text-sm text-slate-600 mt-1 break-words">{row.event.servicio||'Sin servicio'}</p>
    <p className="text-xs text-slate-500 mt-1 break-words">{dateLabel(row.event.fecha)} · {row.event.hora||'Sin hora'} · {row.event.estado||'Pendiente'}</p>
    {row.web&&<p className="text-xs text-amber-700 mt-1">Solicitud web sin aceptar</p>}
    {row.issues.length>0&&<p className="text-xs font-bold text-amber-800 mt-2">Por completar: {row.issues.join(', ')}</p>}
  </>;
  return createPortal(<div ref={viewportRef} style={{height:'var(--reservation-viewport-height, 100dvh)',top:'var(--reservation-viewport-top, 0px)',bottom:'auto'}} className="fixed inset-x-0 z-[900] bg-slate-950/60 p-2 sm:p-5 flex items-center justify-center font-outfit" onKeyDown={keyDown}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-label="Control de reservas" style={{maxHeight:'calc(var(--reservation-viewport-height, 100dvh) - 24px)'}} className="w-full max-w-7xl max-h-[94dvh] flex flex-col overflow-hidden rounded-[24px] bg-slate-50 shadow-2xl">
      <header className="shrink-0 flex items-start justify-between gap-3 border-b border-slate-200 bg-white p-4 sm:p-5">
        <div className="min-w-0"><h2 className="text-xl sm:text-2xl font-black text-slate-950">Control de reservas</h2><p className="text-xs sm:text-sm text-slate-500 mt-1">Seguimiento de clientes, preparación del equipo y cobros.</p></div>
        <button data-close-control className={button} disabled={saving} onClick={onClose}>Cerrar</button>
      </header>
      <div ref={scrollRef} className="min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-5" tabIndex={0} aria-label="Lista del control de reservas">
        {editing?<form onSubmit={save} className="max-w-2xl mx-auto space-y-4">
          <h3 className="text-lg font-black break-words">Seguimiento de {editing.cliente}</h3>
          <p className="text-sm text-slate-600">Este registro es interno. No envía mensajes ni cambia la confirmación o los pagos de la reserva.</p>
          <label className="block text-sm font-bold">Situación del contacto<select autoFocus disabled={saving} value={draft.estado} onChange={event=>setDraft({...draft,estado:event.target.value})} className="mt-1 w-full min-h-[44px] border rounded-xl px-3 bg-white">{Object.entries(FOLLOWUP_STATES).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
          <label className="block text-sm font-bold">Próximo contacto<input disabled={saving} type="date" value={draft.proximoContacto} onChange={event=>setDraft({...draft,proximoContacto:event.target.value})} className="mt-1 w-full min-h-[44px] min-w-0 border rounded-xl px-3 bg-white"/></label>
          <label className="block text-sm font-bold">Nota de seguimiento<textarea disabled={saving} maxLength={1000} rows={4} value={draft.nota} onChange={event=>setDraft({...draft,nota:event.target.value})} className="mt-1 w-full border rounded-xl p-3 bg-white"/></label>
          <p className="text-xs text-slate-500">La fecha te permite localizar contactos pendientes desde este panel; no genera una notificación automática.</p>
          {saveError&&<p role="alert" className="text-sm text-red-700">{saveError}</p>}
          <div className="flex flex-wrap gap-2"><button type="submit" className={`${button} !bg-violet-600 !text-white`} disabled={saving}>{saving?'Guardando…':'Guardar seguimiento'}</button><button type="button" className={button} disabled={saving} onClick={()=>setEditing(null)}>Cancelar seguimiento</button></div>
        </form>:<>
          <div className="flex flex-wrap gap-2 mb-4" aria-label="Filtros de control de reservas">{CONTROL_FILTERS.map(([key,label])=><button key={key} className={`${button} ${filter===key?'!border-violet-500 !bg-violet-50 !text-violet-700':''}`} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label} ({loading?'…':counts[key]})</button>)}</div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 mb-4">
            <label className="text-xs font-bold text-slate-600">Buscar en el control<input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Cliente, servicio, responsable o nota" className="mt-1 w-full min-h-[44px] border rounded-xl px-3 bg-white text-sm"/></label>
            <label className="text-xs font-bold text-slate-600">Fecha del evento<input type="date" value={date} onChange={event=>setDate(event.target.value)} className="mt-1 w-full min-w-0 min-h-[44px] border rounded-xl px-3 bg-white text-sm"/></label>
            <button className={`${button} sm:self-end`} onClick={()=>{setFilter('all');setSearch('');setDate('');}}>Limpiar filtros</button>
          </div>
          {notice&&<p role="status" className="text-sm text-emerald-700 mb-3">{notice}</p>}
          {catalogLoading&&<p role="status" className="text-xs text-slate-500 mb-3">Comprobando duraciones del catálogo…</p>}
          {catalogError&&<p role="alert" className="text-sm text-amber-800 mb-3">No se pudieron comprobar todas las duraciones del catálogo. <button className={button} onClick={onRetryCatalog}>Reintentar catálogo</button></p>}
          {loading?<p role="status" className="p-5">Cargando reservas y cotizaciones…</p>:loadError?<p role="alert" className="p-5 text-red-700">No se pudo completar la carga de reservas. <button className={button} onClick={onRetry}>Reintentar reservas</button></p>:!visible.length?<p className="rounded-2xl border bg-white p-6 text-slate-600">No hay reservas en este filtro.</p>:<IncrementalList key={JSON.stringify([filter,search,date])} items={visible} label="registros">
            {displayed=><>
              <div className="space-y-3 lg:hidden">{displayed.map(row=><article key={row.id} data-control-id={row.id} className="rounded-2xl border bg-white p-4">
                {summary(row)}<p className="text-sm mt-3">Total {money(row.total)} · Recibido {money(row.received)} · {row.quote?'Por cotizar':'Saldo'} {money(row.balance)}</p>
                <p className="text-sm text-slate-600 mt-2 break-words">Responsable: {staffLabel(row.event)}</p>
                <p className="text-xs mt-2 text-violet-700">{FOLLOWUP_STATES[row.followup.estado]}{row.followup.proximoContacto?` · ${dateLabel(row.followup.proximoContacto)}`:''}{row.contactDue?' · Contacto pendiente':''}</p>
                {row.followup.nota&&<p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap break-words">{row.followup.nota}</p>}
                <div className="mt-3">{actions(row)}</div>
              </article>)}</div>
              <div className="hidden lg:block overflow-x-auto rounded-2xl border bg-white" role="region" aria-label="Tabla de control de reservas" tabIndex={0}>
                <table className="w-full text-sm min-w-[900px]"><caption className="sr-only">Reservas y cotizaciones del filtro seleccionado</caption><thead className="bg-slate-100 text-left"><tr>{['Cliente / evento','Total / recibido / saldo','Responsable','Seguimiento','Acciones'].map(label=><th key={label} scope="col" className="p-3">{label}</th>)}</tr></thead>
                  <tbody>{displayed.map(row=><tr key={row.id} data-control-id={row.id} className="border-t align-top"><td className="p-3 max-w-[260px]">{summary(row)}</td><td className="p-3 whitespace-nowrap"><div>Total {money(row.total)}</div><div>Recibido {money(row.received)}</div><strong>{row.quote?'Por cotizar':'Saldo'} {money(row.balance)}</strong></td><td className="p-3 max-w-[160px] break-words">{staffLabel(row.event)}</td><td className="p-3 max-w-[200px] break-words"><p>{FOLLOWUP_STATES[row.followup.estado]}</p>{row.followup.proximoContacto&&<p>{dateLabel(row.followup.proximoContacto)}</p>}{row.contactDue&&<p className="font-bold text-amber-800">Contacto pendiente</p>}{row.followup.nota&&<p className="mt-2 whitespace-pre-wrap">{row.followup.nota}</p>}</td><td className="p-3 min-w-[230px] max-w-[280px]">{actions(row)}</td></tr>)}</tbody>
                </table>
              </div>
            </>}
          </IncrementalList>}
          <p className="text-xs text-slate-500 mt-4">Los filtros pueden coincidir entre sí. Por contactar incluye solicitudes y cotizaciones sin contacto registrado, y fechas de contacto de hoy o vencidas. Con saldo incluye servicios realizados aún pendientes de cobro.</p>
        </>}
      </div>
    </section>
  </div>,document.body);
}
