import React, { useState } from 'react';
import { SERVICE_ORDER_ROLES, serviceOrderStaff } from '../../lib/service-order.mjs';

const newPerson = () => ({id:`orden-personal-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,nombre:'',rol:'Animador(a)'});
const inputClass = 'w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400';

export default function ServiceOrderStaffEditor({ event, onSave, onEditingChange }) {
  const [editing,setEditing] = useState(false), [people,setPeople] = useState([]), [saving,setSaving] = useState(false), [error,setError] = useState('');
  const changeEditing = value => {setEditing(value);onEditingChange(value);};
  const start = () => {
    const existing = serviceOrderStaff(event).map((person,index)=>({id:`orden-${index}`,nombre:person.name,rol:person.role}));
    setPeople(existing.length ? existing : [newPerson()]);setError('');changeEditing(true);
  };
  const save = async () => {
    if (saving) return;
    if (people.some(person=>!person.nombre.trim() || !person.rol.trim())) {setError('Escribe el nombre de cada persona o quita la fila vacía.');return;}
    setSaving(true);setError('');
    try { await onSave(people);changeEditing(false); }
    catch (err) {setError(err?.message === 'ORDER_STAFF_CHANGED' ? 'El personal cambió en otro dispositivo. Cierra y vuelve a abrir la orden para ver los nombres actuales.' : 'No se pudo guardar el personal. Tus cambios siguen aquí; revisa la conexión y reintenta.');}
    finally {setSaving(false);}
  };
  return <section aria-label="Personal de la orden" className="print:hidden mx-4 sm:mx-8 my-3 rounded-2xl bg-white p-4 sm:p-5 border border-violet-100">
    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"><div><h2 className="font-bold text-slate-900">Personal de esta orden</h2><p className="text-xs text-slate-500 mt-1">Asigna los nombres y funciones que aparecerán en el PDF.</p></div>{!editing && <button type="button" onClick={start} className="min-h-[44px] rounded-xl bg-violet-100 text-violet-800 font-bold px-4 py-2 text-sm">Asignar / cambiar personal</button>}</div>
    {editing && <fieldset disabled={saving} className="mt-4 space-y-3 disabled:opacity-70">
      {people.map((person,index)=><div key={person.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <label><span className="block text-xs font-bold mb-1">Nombre</span><input aria-label={`Nombre en la orden ${index+1}`} value={person.nombre} onChange={e=>setPeople(previous=>previous.map((item,i)=>i===index?{...item,nombre:e.target.value}:item))} placeholder="Nombre y apellido" className={inputClass}/></label>
        <label><span className="block text-xs font-bold mb-1">Función</span><select aria-label={`Función en la orden ${index+1}`} value={person.rol} onChange={e=>setPeople(previous=>previous.map((item,i)=>i===index?{...item,rol:e.target.value}:item))} className={inputClass}>{!SERVICE_ORDER_ROLES.includes(person.rol) && <option value={person.rol}>{person.rol}</option>}{SERVICE_ORDER_ROLES.map(role=><option key={role}>{role}</option>)}</select></label>
        <button type="button" aria-label={`Quitar de la orden ${index+1}`} onClick={()=>setPeople(previous=>previous.filter((_,i)=>i!==index))} className="min-h-[44px] rounded-xl bg-rose-50 text-rose-700 px-3 text-sm font-bold justify-self-end">Quitar</button>
      </div>)}
      <button type="button" onClick={()=>setPeople(previous=>[...previous,newPerson()])} className="min-h-[44px] text-sm font-bold text-violet-700 px-3 rounded-xl bg-violet-50">Agregar otra persona</button>
      <p className="text-xs text-slate-500">Guarda el personal antes de imprimir o compartir. Los proveedores y sus costos se conservan.</p>
      {error && <p role="alert" className="text-sm text-rose-700 font-semibold">{error}</p>}
      <div className="flex gap-3 flex-wrap"><button type="button" onClick={save} className="min-h-[44px] bg-violet-600 text-white rounded-xl px-4 font-bold text-sm">{saving?'Guardando personal...':'Guardar personal'}</button><button type="button" onClick={()=>{setError('');changeEditing(false);}} className="min-h-[44px] bg-slate-100 text-slate-700 rounded-xl px-4 font-bold text-sm">Cancelar</button></div>
    </fieldset>}
  </section>;
}
