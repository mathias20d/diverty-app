import React,{useEffect,useMemo,useState} from 'react';
import {doc,runTransaction} from 'firebase/firestore';
import {DEFAULT_TRANSPORT,TRANSPORT_LIMITS,normalizeTransportConfig,transportForStorage} from '../lib/navidad-transport.mjs';
import {TRANSPORT_PLACES} from '../lib/transport-places.mjs';
import {gpsPointFromText} from '../lib/gps-point.mjs';

// Transporte y zonas de cada cuenta. Se guarda en config_web/disponibilidad.transporte;
// la página pública y el servidor calculan con estos mismos valores.
const copy=value=>JSON.parse(JSON.stringify(value));
const num=value=>Number(String(value??'').replace(',','.'));
const mapUrl=zone=>'https://www.google.com/maps?q='+(zone.tipo==='circulo'?zone.lat+','+zone.lng:((zone.sur+zone.norte)/2).toFixed(5)+','+((zone.oeste+zone.este)/2).toFixed(5));
const OTHER='__otro__';

export default function ChristmasTransportSettings({db,appId,saved,onMessage}){
 const original=useMemo(()=>copy(normalizeTransportConfig(saved)),[saved]);
 const [draft,setDraft]=useState(original),[terms,setTerms]=useState(original.zonasRojas.terminos.join('\n')),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false);
 const [pick,setPick]=useState(''),[pickPrice,setPickPrice]=useState(''),[custom,setCustom]=useState({nombre:'',ubicacion:'',radioKm:'3'});
 useEffect(()=>{if(!dirty){setDraft(original);setTerms(original.zonasRojas.terminos.join('\n'));}},[original,dirty]);
 const update=next=>{setDraft(next);setDirty(true);};
 const setZone=(index,patch)=>update({...draft,zonas:draft.zonas.map((zone,i)=>i===index?{...zone,...patch}:zone)});
 const setRed=patch=>update({...draft,zonasRojas:{...draft.zonasRojas,...patch}});
 const ref=id=>doc(db,'artifacts',appId,'public','data','config_web',id);
 const usedIds=new Set(draft.zonas.map(z=>z.id));
 const available=TRANSPORT_PLACES.filter(p=>!usedIds.has(p.id));

 const addPlace=()=>{
  const precio=num(pickPrice);
  if(!pick)return onMessage('Elige un lugar de la lista.');
  if(!String(pickPrice).trim()||!Number.isFinite(precio)||precio<0||precio>TRANSPORT_LIMITS.price)return onMessage('Escribe el precio del transporte para ese lugar.');
  if(draft.zonas.length>=TRANSPORT_LIMITS.zones)return onMessage('Llegaste al máximo de lugares.');
  let zone;
  if(pick===OTHER){
   const point=gpsPointFromText(custom.ubicacion),radioKm=num(custom.radioKm);
   if(!custom.nombre.trim())return onMessage('Escribe el nombre del lugar.');
   if(!point)return onMessage('Pega el enlace de Google Maps del lugar o usa tu ubicación.');
   if(!Number.isFinite(radioKm)||radioKm<=0||radioKm>TRANSPORT_LIMITS.radiusKm)return onMessage('El radio debe estar entre 0.1 y 50 km.');
   zone={id:'',nombre:custom.nombre.trim(),tipo:'circulo',lat:point.lat,lng:point.lng,radioKm,precio};
   setCustom({nombre:'',ubicacion:'',radioKm:'3'});
  }else{
   const place=TRANSPORT_PLACES.find(p=>p.id===pick);if(!place)return;
   zone={...place,tipo:'circulo',precio};
  }
  // Los lugares nuevos van primero: un lugar concreto manda sobre un área general.
  update({...draft,zonas:[zone,...draft.zonas]});setPick('');setPickPrice('');
  onMessage(zone.nombre+' agregado. Pulsa Guardar transporte para aplicarlo.');
 };
 const useDevice=()=>{if(!navigator.geolocation)return onMessage('Este dispositivo no permite usar el GPS.');onMessage('Buscando tu ubicación…');navigator.geolocation.getCurrentPosition(p=>{setCustom(old=>({...old,ubicacion:p.coords.latitude.toFixed(6)+', '+p.coords.longitude.toFixed(6)}));onMessage('Ubicación lista.');},()=>onMessage('No se obtuvo el GPS. Pega un enlace de Google Maps.'),{enableHighAccuracy:true,timeout:15000,maximumAge:0});};

 const save=async()=>{
  for(const zone of draft.zonas){const n=num(zone.precio);if(!String(zone.nombre).trim()||!String(zone.precio).trim()||!Number.isFinite(n)||n<0||n>TRANSPORT_LIMITS.price)return onMessage('Revisa el precio de «'+(zone.nombre||'un lugar')+'».');}
  const recargo=num(draft.zonasRojas.recargo);
  if(!Number.isFinite(recargo)||recargo<0||recargo>TRANSPORT_LIMITS.price)return onMessage('Revisa el recargo de zona roja.');
  const value=transportForStorage({...draft,zonas:draft.zonas.map(z=>({...z,precio:num(z.precio),...(z.tipo==='circulo'?{radioKm:num(z.radioKm)}:{})})),zonasRojas:{...draft.zonasRojas,recargo,terminos:terms.split('\n')}});
  if(value.zonas.length!==draft.zonas.length)return onMessage('Un lugar tiene datos no válidos. Revisa su radio en Ajustar.');
  setBusy(true);
  try{
   await runTransaction(db,async tx=>{const sync=await tx.get(ref('web_sync')),v=sync.data()||{};tx.set(ref('disponibilidad'),{transporte:value,updatedAt:new Date().toISOString()},{merge:true});tx.set(ref('web_sync'),{version:Number(v.version||0)+1,versions:{...v.versions,config_web:Number(v.versions?.config_web||0)+1},updatedAt:new Date().toISOString()},{merge:true});});
   setDirty(false);onMessage('Transporte guardado. Tu página de reservas ya usa estos precios.');
  }catch{onMessage('No se pudo guardar el transporte. Revisa la conexión.');}finally{setBusy(false);}
 };
 const restore=()=>{if(!window.confirm('¿Restaurar los lugares, precios y zonas rojas originales? Pierdes los cambios que no hayas guardado.'))return;const base=copy(DEFAULT_TRANSPORT);update(base);setTerms(base.zonasRojas.terminos.join('\n'));};

 const termCount=terms.split('\n').map(t=>t.trim()).filter(t=>t.length>=3).length;
 return <details><summary>Transporte y zonas{dirty?' · sin guardar':''}</summary>
  <p>Escribe cuánto cobras por llevar a Santa a cada lugar. La página calcula el transporte sola con la ubicación del cliente.</p>
  <label className="nv-switch"><input type="checkbox" checked={draft.automatico} onChange={e=>update({...draft,automatico:e.target.checked})}/><span><b>Cálculo automático del transporte</b><small>{draft.automatico?'Activado: el cliente ve el transporte de su lugar.':'Apagado: todas las solicitudes llegan con transporte por confirmar.'}</small></span></label>

  <section className="nv-section" aria-label="Precios por lugar"><h3>Precios por lugar</h3><p>$0 significa transporte incluido. Si el cliente está fuera de todos estos lugares, el transporte queda por confirmar.</p>
   {draft.zonas.length===0&&<p className="nv-empty">No hay lugares. Agrega uno abajo o restaura los originales.</p>}
   <ul className="nv-places">{draft.zonas.map((zone,index)=><li key={zone.id+index} className="nv-place">
    <div className="nv-place-main"><span className="nv-place-name">{zone.nombre}</span><span className="nv-place-price"><span aria-hidden="true">$</span><input aria-label={'Precio de '+zone.nombre} inputMode="decimal" value={String(zone.precio??'')} disabled={busy} onChange={e=>setZone(index,{precio:e.target.value})}/></span><button type="button" className="nv-btn-ghost nv-icon-btn" aria-label={'Quitar '+zone.nombre} disabled={busy} onClick={()=>update({...draft,zonas:draft.zonas.filter((_,i)=>i!==index)})}>✕</button></div>
    <details className="nv-place-more"><summary>Ajustar</summary><div className="nv-place-adv"><label>Nombre<input maxLength={TRANSPORT_LIMITS.nameLength} value={zone.nombre} disabled={busy} onChange={e=>setZone(index,{nombre:e.target.value})}/></label>{zone.tipo==='circulo'?<label>Radio (km)<input inputMode="decimal" value={String(zone.radioKm??'')} disabled={busy} onChange={e=>setZone(index,{radioKm:e.target.value})}/></label>:<p>Área amplia del mapa.</p>}<a href={mapUrl(zone)} target="_blank" rel="noopener noreferrer">Ver en el mapa</a></div></details>
   </li>)}</ul>
   <div className="nv-summary nv-add-place"><strong>Agregar un lugar</strong>
    <div className="navidad-form-row"><label>Lugar<select value={pick} disabled={busy} onChange={e=>setPick(e.target.value)}><option value="">Elige un lugar…</option>{available.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}<option value={OTHER}>Otro lugar…</option></select></label><label>Precio ($)<input inputMode="decimal" placeholder="Ej. 10" value={pickPrice} disabled={busy} onChange={e=>setPickPrice(e.target.value)}/></label></div>
    {pick===OTHER&&<><label>Nombre del lugar<input maxLength={TRANSPORT_LIMITS.nameLength} placeholder="Ej. Brisas del Golf" value={custom.nombre} disabled={busy} onChange={e=>setCustom(old=>({...old,nombre:e.target.value}))}/></label><label>Ubicación<input placeholder="Enlace de Google Maps o «9.0123, -79.5012»" value={custom.ubicacion} disabled={busy} onChange={e=>setCustom(old=>({...old,ubicacion:e.target.value}))}/></label><div className="navidad-form-row"><label>Radio (km)<input inputMode="decimal" value={custom.radioKm} disabled={busy} onChange={e=>setCustom(old=>({...old,radioKm:e.target.value}))}/></label><button type="button" disabled={busy} onClick={useDevice} style={{alignSelf:'end'}}>Usar mi ubicación</button></div></>}
    <button type="button" className="nv-btn-primary" disabled={busy||!pick} onClick={addPlace} style={{justifySelf:'start'}}>Agregar lugar</button>
   </div>
  </section>

  <section className="nv-section" aria-label="Zonas rojas"><h3>Zonas rojas</h3>
   <button type="button" className={draft.zonasRojas.activo?'nv-btn-primary':''} aria-pressed={draft.zonasRojas.activo} disabled={busy} onClick={()=>setRed({activo:!draft.zonasRojas.activo})} style={{justifySelf:'start'}}>{draft.zonasRojas.activo?'Zonas rojas activadas · Desactivar':'Zonas rojas desactivadas · Activar'}</button>
   <p>{draft.zonasRojas.activo?'Si la dirección o la referencia del cliente menciona uno de estos lugares, se calcula el transporte de su zona más el recargo, y la solicitud queda para que confirmes antes de aceptar. El cliente no ve la palabra «zona roja».':'Desactivadas: estos lugares se cobran como cualquier otro.'}</p>
   <div className="navidad-form-row"><label>Recargo adicional ($)<input inputMode="decimal" value={String(draft.zonasRojas.recargo??'')} disabled={busy||!draft.zonasRojas.activo} onChange={e=>setRed({recargo:e.target.value})}/></label><span/></div>
   <details className="nv-place-more"><summary>Ver o editar los lugares ({termCount})</summary><label>Un lugar por línea<textarea rows={6} value={terms} disabled={busy||!draft.zonasRojas.activo} onChange={e=>{setTerms(e.target.value);setDirty(true);}}/></label></details>
  </section>

  <div className="nv-row"><button type="button" className="nv-btn-primary" disabled={busy||!dirty} onClick={save}>{busy?'Guardando…':'Guardar transporte'}</button><button type="button" disabled={busy} onClick={restore}>Restaurar valores originales</button></div>
 </details>;
}
