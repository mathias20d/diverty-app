import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { CalendarDays, ChevronLeft, ChevronRight, Lock, X } from 'lucide-react';
import { closedDates, panamaToday, saveDateClosure } from '../lib/date-availability.mjs';

export default function DateAvailabilityManager({ db, appId }) {
  const today = panamaToday();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [dates, setDates] = useState({});
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const trigger = useRef(null), dialog = useRef(null);
  useEffect(() => {
    if (!open) return;
    setReady(false); setError(''); setMessage('');
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'config_web', 'fechas_cerradas');
    return onSnapshot(ref, { includeMetadataChanges: true }, snapshot => {
      setDates(closedDates(snapshot.data()));
      setReady(snapshot.metadata?.fromCache !== true);
    }, () => { setReady(false); setError('No se pudo consultar la disponibilidad. Comprueba tu conexión y vuelve a abrir el calendario.'); });
  }, [open, db, appId]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    return () => { document.body.style.overflow = previous; trigger.current?.focus(); };
  }, [open]);
  const move = delta => {
    const [year, index] = month.split('-').map(Number);
    const next = new Date(year, index - 1 + delta, 1, 12);
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };
  const save = async () => {
    if (!ready || saving) return;
    setSaving(true); setError(''); setMessage('');
    const closed = !dates[selected];
    try {
      const saved = await saveDateClosure({ runTransaction, db,
        datesRef: doc(db, 'artifacts', appId, 'public', 'data', 'config_web', 'fechas_cerradas'),
        syncRef: doc(db, 'artifacts', appId, 'public', 'data', 'config_web', 'web_sync'), date: selected, closed });
      setDates(closedDates(saved));
      setMessage(closed ? 'Fecha cerrada. La web bloqueará nuevas reservas para este día.' : 'Fecha reabierta. La web volverá a comprobar los cupos disponibles.');
    } catch (_) { setError('No se pudo guardar el cambio. Comprueba tu conexión e inténtalo de nuevo.'); }
    finally { setSaving(false); }
  };
  const [year, index] = month.split('-').map(Number);
  const offset = (new Date(year, index - 1, 1).getDay() + 6) % 7;
  const count = new Date(year, index, 0).getDate();
  const dateLabel = new Date(`${selected}T12:00:00`).toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const keyDown = event => {
    if (event.key === 'Escape' && !saving) setOpen(false);
    if (event.key !== 'Tab') return;
    const nodes = [...dialog.current.querySelectorAll('button:not([disabled]), input:not([disabled])')];
    const first = nodes[0], last = nodes.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  return <>
    <button ref={trigger} type="button" onClick={() => setOpen(true)} className="flex items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-white px-5 py-3 font-bold text-violet-700 shadow-sm"><CalendarDays size={20} /> Cerrar fechas de la web</button>
    {open && createPortal(<div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-3" onClick={event => { if (event.target === event.currentTarget && !saving) setOpen(false); }}>
      <section ref={dialog} tabIndex={-1} onKeyDown={keyDown} role="dialog" aria-modal="true" aria-labelledby="date-availability-title" className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 text-slate-900 shadow-2xl outline-none">
        <div className="flex items-center justify-between gap-3"><h2 id="date-availability-title" className="text-xl font-black">Disponibilidad de la web</h2><button type="button" aria-label="Cerrar calendario" disabled={saving} onClick={() => setOpen(false)} className="rounded-xl p-2"><X size={22} /></button></div>
        <p className="mt-2 text-sm text-slate-600">Elige un día para cerrar o reabrir las reservas de todos los servicios. Tus reservas existentes se conservan.</p>
        <div className="my-4 flex items-center justify-between gap-2"><button type="button" aria-label="Mes anterior" disabled={month <= today.slice(0, 7) || saving} onClick={() => move(-1)} className="rounded-xl p-3 disabled:opacity-30"><ChevronLeft size={20}/></button><label className="min-w-0 flex-1 font-bold"><span className="sr-only">Mes del calendario</span><input type="month" min={today.slice(0, 7)} value={month} disabled={saving} onChange={event => { if (/^\d{4}-\d{2}$/.test(event.target.value) && event.target.value >= today.slice(0, 7)) setMonth(event.target.value); }} className="w-full min-w-0 rounded-xl border border-slate-200 p-2" /></label><button type="button" aria-label="Mes siguiente" disabled={saving} onClick={() => move(1)} className="rounded-xl p-3"><ChevronRight size={20}/></button></div>
        <div className="grid grid-cols-7 gap-1 text-center">{['Lu','Ma','Mi','Ju','Vi','Sá','Do'].map(day => <span key={day} className="py-2 text-xs font-bold text-slate-500">{day}</span>)}{Array.from({length: offset}, (_, i) => <span key={`blank-${i}`} />)}{Array.from({length: count}, (_, i) => {
          const date = `${month}-${String(i+1).padStart(2,'0')}`, closed = dates[date] === true;
          return <button type="button" key={date} data-availability-date={date} data-closed={closed} aria-label={`${date}: ${closed ? 'Cerrada' : 'Reservas web habilitadas'}`} aria-pressed={date === selected} disabled={date < today || saving} onClick={() => { setSelected(date); setMessage(''); setError(''); }} className={`relative h-11 rounded-xl border text-sm font-bold disabled:opacity-30 ${closed ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-100 bg-slate-50 text-slate-700'} ${date === selected ? 'ring-2 ring-violet-600 ring-offset-1' : ''}`}>{i+1}{closed && <Lock size={9} className="absolute bottom-0.5 right-1"/>}</button>;
        })}</div>
        <p className="mt-3 text-xs text-slate-500">Rojo: fecha cerrada · Gris: reservas web habilitadas según cupos.</p>
        <div className="mt-4 rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold capitalize">{dateLabel}</p><p className={`mt-1 text-sm font-semibold ${dates[selected] ? 'text-rose-700' : 'text-slate-600'}`}>{ready ? (dates[selected] ? 'Sin disponibilidad en la web' : 'Reservas web habilitadas') : 'Comprobando disponibilidad…'}</p><button type="button" disabled={!ready || saving || selected < today} onClick={save} className={`mt-3 w-full rounded-xl px-4 py-3 font-bold text-white disabled:opacity-40 ${dates[selected] ? 'bg-violet-700' : 'bg-rose-700'}`}>{saving ? 'Guardando…' : dates[selected] ? 'Reabrir esta fecha' : 'Cerrar esta fecha'}</button></div>
        {message && <p role="status" className="mt-3 text-sm font-semibold text-emerald-700">{message}</p>}{error && <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}
      </section>
    </div>, document.body)}
  </>;
}
