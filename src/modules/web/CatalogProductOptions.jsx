import React from 'react';
import { DEFAULT_MAX_QUANTITY } from '../../lib/catalog-product.mjs';

export default function CatalogProductOptions({ form, setForm, categories, inputClass }) {
  const character = form.tipoServicio === 'personaje';
  const variable = ['unidad', 'hora', 'nino'].includes(form.tipoCobro) && !character;
  const changeType = type => setForm(previous => ({ ...previous, tipoServicio: type, tipoCobro: type === 'producto' ? 'unidad' : type === 'personaje' ? 'paquete' : previous.tipoCobro,
    categoria: type === 'personaje' ? (categories.find(c => c.id === 'personajes' || c.nombre?.trim().toLowerCase() === 'personajes')?.id || 'personajes') : previous.categoria,
    cantidadMaxima: type === 'producto' && previous.cantidadMaxima === '' ? DEFAULT_MAX_QUANTITY : previous.cantidadMaxima }));
  const field = (label, key, extra = {}) => <label className="block"><span className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{label}</span><input className={inputClass()} aria-label={label} value={form[key]} onChange={e => setForm(v => ({...v,[key]:e.target.value}))} {...extra}/></label>;
  return <div className="rounded-[20px] border border-violet-100 bg-violet-50/50 p-4 space-y-4">
    <p className="text-xs font-black text-slate-800">¿Qué quieres ofrecer?</p>
    <div className="grid grid-cols-3 gap-2">{[['servicio','Servicio'],['producto','Por cantidad'],['personaje','Personaje']].map(([type,label])=><button key={type} type="button" aria-pressed={form.tipoServicio===type} onClick={()=>changeType(type)} className={`min-h-[52px] rounded-xl text-xs font-black border ${form.tipoServicio===type?'bg-violet-600 border-violet-600 text-white':'bg-white border-slate-200 text-slate-600'}`}>{label}</button>)}</div>
    {character ? <><p className="text-xs font-semibold text-slate-600">Una ficha por personaje, con su foto y precio. El catálogo Personajes se crea al guardar si todavía no existe.</p>{field('Temática (opcional)','tematica',{placeholder:'Ej.: Superhéroes, princesas, caricaturas'})}</> : variable ? <>
      <p className="text-xs font-semibold text-slate-600">El cliente elegirá la cantidad desde el mínimo que indiques.</p>
      <div className="grid grid-cols-2 gap-3">{field('Cantidad mínima','cantidadMinima',{type:'number',min:1,step:1,inputMode:'numeric'})}{field('Cantidad máxima','cantidadMaxima',{type:'number',min:1,step:1,inputMode:'numeric',placeholder:`${DEFAULT_MAX_QUANTITY} por defecto`})}{field('Aumentar de','incrementoCantidad',{type:'number',min:1,step:1,inputMode:'numeric'})}{form.tipoCobro==='unidad'&&field('Nombre de la unidad','unidadEtiqueta',{placeholder:'Ej.: hot dog, hamburguesa, raspado'})}</div>
      <p className="text-xs font-semibold text-slate-600">Si dejas el máximo vacío, se permiten hasta {DEFAULT_MAX_QUANTITY}. Puedes escribir otro máximo. “Aumentar de” controla los botones + y −; también se puede escribir una cantidad entera.</p>
      <p className="rounded-xl bg-white p-3 text-xs font-bold text-violet-700">Desde {Number(form.cantidadMinima)||1} × ${Number(form.precio||0).toFixed(2)} = ${((Number(form.cantidadMinima)||1)*Number(form.precio||0)).toFixed(2)}</p>
    </> : <p className="text-xs font-semibold text-slate-600">Mantén un precio fijo o elige cobro por hora o por niño.</p>}
  </div>;
}
