import React,{useEffect,useMemo,useState} from 'react';
import {doc,runTransaction} from 'firebase/firestore';
import {DEFAULT_TRANSPORT,TRANSPORT_LIMITS,normalizeTransportConfig,transportForStorage} from '../lib/navidad-transport.mjs';
import {gpsPointFromText} from '../lib/gps-point.mjs';

// Transporte y zonas de cada cuenta. Se guarda en config_web/disponibilidad.transporte;
// la página pública y el servidor calculan con estos mismos valores.
const copy=value=>JSON.parse(JSON.stringify(value));
const priceText=value=>String(value??'');
const emptyZone={nombre:'',precio:'',radioKm:'3',ubicacion:''};

export default function ChristmasTransportSettings({db,appId,saved,onMessage}){
 const original=useMemo(()=>copy(normalizeTransportConfig(saved)),[saved]);
 const [draft,setDraft]=useState(original),[terms,setTerms]=useState(original.zonasRojas.terminos.join('\n')),[newZone,setNewZone]=useState(emptyZone),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false);
 useEffect(()=>{if(!dirty){setDraft(original);setTerms(original.zonasRojas.terminos.join('\n'));}},[original,dirty]);
 const update=next=>{setDraft(next);setDirty(true);};
 const setZone=(index,patch)=>update({...draft,zonas:draft.zonas.map((zone,i)=>i===index?{...zone,...patch}:zone)});
 const setRed=patch=>update({...draft,zonasRojas:{...draft.zonasRojas,...patch}});
 const ref=id=>doc(db,'artifacts',appId,'public','data','config_web',id);

 const addZone=()=>{
  const point=gpsPointFromText(newZone.ubicacion),precio=Number(String(newZone.precio).replace(',','.')),radioKm=Number(String(newZone.radioKm).replace(',','.'));
  if(!newZone.nombre.trim())return onMessage('Escribe el nombre de la zona.');
  if(!point)return onMessage('Indica el centro de la zona: pega un enlace de Google Maps, escribe «latitud, longitud» o usa tu ubicación.');
  if(!Number.isFinite(precio)||precio<0||precio>TRANSPORT_LIMITS.price)return onMessage('Escribe un precio válido para la zona.');
  if(!Number.isFinite(radioKm)||radioKm<=0||radioKm>TRANSPORT_LIMITS.radiusKm)return onMessage('El radio debe estar entre 0.1 y 50 km.');
  if(draft.zonas.length>=TRANSPORT_LIMITS.zones)return onMessage('Llegaste al máximo de zonas.');
  update({...draft,zonas:[...draft.zonas,{id:'',nombre:newZone.nombre.trim(),tipo:'circulo',lat:point.lat,lng:point.lng,radioKm,precio}]});
  setNewZone(emptyZone);
 };
 const useDevice=()=>{if(!navigator.geolocation)return onMessage('Este dispositivo no permite usar el GPS.');onMessage('Buscando tu ubicación…');navigator.geolocation.getCurrentPosition(p=>{setNewZone(old=>({...old,ubicacion:p.coords.latitude.toFixed(6)+', '+p.coords.longitude.toFixed(6)}));onMessage('Ubicación lista para la nueva zona.');},()=>onMessage('No se obtuvo el GPS. Pega un enlace de Google Maps.'),{enableHighAccuracy:true,timeout:15000,maximumAge:0});};

 const save=async()=>{
  for(const zone of draft.zonas){const n=Number(String(zone.precio).replace(',','.'));if(!String(zone.nombre).trim()||!Number.isFinite(n)||n<0||n>TRANSPORT_LIMITS.price)return onMessage('Revisa el nombre y el precio de cada zona.');}
  const recargo=Number(String(draft.zonasRojas.recargo).replace(',','.'));
  if(!Number.isFinite(recargo)||recargo<0||recargo>TRANSPORT_LIMITS.price)return onMessage('Revisa el recargo de zona roja.');
  const value=transportForStorage({...draft,zonas:draft.zonas.map(z=>({...z,precio:Number(String(z.precio).replace(',','.')),...(z.tipo==='circulo'?{radioKm:Number(String(z.radioKm).replace(',','.'))}:{})})),zonasRojas:{...draft.zonasRojas,recargo,terminos:terms.split('\n')}});
  if(value.zonas.length!==draft.zonas.length)return onMessage('Una zona tiene datos no válidos. Revisa el radio y el precio.');
  setBusy(true);
  try{
   await runTransaction(db,async tx=>{const sync=await tx.get(ref('web_sync')),v=sync.data()||{};tx.set(ref('disponibilidad'),{transporte:value,updatedAt:new Date().toISOString()},{merge:true});tx.set(ref('web_sync'),{version:Number(v.version||0)+1,versions:{...v.versions,config_web:Number(v.versions?.config_web||0)+1},updatedAt:new Date().toISOString()},{merge:true});});
   setDirty(false);onMessage('Transporte guardado. Tu página de reservas ya usa estos precios.');
  }catch{onMessage('No se pudo guardar el transporte. Revisa la conexión.');}finally{setBusy(false);}
 };
 const restore=()=>{if(!window.confirm('¿Restaurar las zonas, precios y zonas rojas originales? Pierdes los cambios que no hayas guardado.'))return;const base=copy(DEFAULT_TRANSPORT);update(base);setTerms(base.zonasRojas.terminos.join('\n'));};

 const termCount=terms.split('\n').map(t=>t.trim()).filter(t=>t.length>=3).length;
 return <details><summary>Transporte y zonas{dirty?' · sin guardar':''}</summary>
  <p>Define el precio del transporte en cada zona. La página de reservas lo calcula solo con la ubicación del cliente.</p>
  <label className="nv-switch"><input type="checkbox" checked={draft.automatico} onChange={e=>update({...draft,automatico:e.target.checked})}/><span><b>Cálculo automático del transporte</b><small>{draft.automatico?'Activado: el cliente ve el transporte de su zona.':'Apagado: todas las solicitudes llegan con transporte por confirmar.'}</small></span></label>

  <section className="nv-section" aria-label="Zonas y precios"><h3>Zonas y precios</h3><p>Se revisan primero los puntos con radio y después las áreas. Fuera de todas las zonas, el transporte queda por confirmar.</p>
   {draft.zonas.length===0&&<p className="nv-empty">No hay zonas. Agrega una o restaura las originales.</p>}
   {draft.zonas.map((zone,index)=><article key={index} className="navidad-record nv-zone">
    <div className="nv-record-head"><span className="nv-pill">{zone.tipo==='circulo'?'Radio de '+zone.radioKm+' km':'Área del mapa'}</span><a href={'https://www.google.com/maps?q='+(zone.tipo==='circulo'?zone.lat+','+zone.lng:((zone.sur+zone.norte)/2).toFixed(5)+','+((zone.oeste+zone.este)/2).toFixed(5))} target="_blank" rel="noopener noreferrer">Ver en el mapa</a></div>
    <div className="navidad-form-row"><label>Nombre<input maxLength={TRANSPORT_LIMITS.nameLength} value={zone.nombre} disabled={busy} onChange={e=>setZone(index,{nombre:e.target.value})}/></label><label>Precio ($)<input inputMode="decimal" value={priceText(zone.precio)} disabled={busy} onChange={e=>setZone(index,{precio:e.target.value})}/></label></div>
    {zone.tipo==='circulo'&&<label>Radio (km)<input inputMode="decimal" value={priceText(zone.radioKm)} disabled={busy} onChange={e=>setZone(index,{radioKm:e.target.value})}/></label>}
    <div className="nv-record-actions"><button type="button" className="nv-btn-danger" disabled={busy} onClick={()=>update({...draft,zonas:draft.zonas.filter((_,i)=>i!==index)})}>Quitar zona</button></div>
   </article>)}
   <div className="nv-summary"><strong>Agregar una zona</strong>
    <div className="navidad-form-row"><label>Nombre de la zona<input maxLength={TRANSPORT_LIMITS.nameLength} placeholder="Ej. Arraiján" value={newZone.nombre} disabled={busy} onChange={e=>setNewZone(old=>({...old,nombre:e.target.value}))}/></label><label>Precio ($)<input inputMode="decimal" placeholder="10" value={newZone.precio} disabled={busy} onChange={e=>setNewZone(old=>({...old,precio:e.target.value}))}/></label></div>
    <label>Centro de la zona<input placeholder="Enlace de Google Maps o «9.0123, -79.5012»" value={newZone.ubicacion} disabled={busy} onChange={e=>setNewZone(old=>({...old,ubicacion:e.target.value}))}/></label>
    <div className="navidad-form-row"><label>Radio (km)<input inputMode="decimal" value={newZone.radioKm} disabled={busy} onChange={e=>setNewZone(old=>({...old,radioKm:e.target.value}))}/></label><button type="button" disabled={busy} onClick={useDevice} style={{alignSelf:'end'}}>Usar mi ubicación</button></div>
    <button type="button" disabled={busy} onClick={addZone} style={{justifySelf:'start'}}>Agregar zona</button>
   </div>
  </section>

  <section className="nv-section" aria-label="Zonas rojas"><h3>Zonas rojas</h3>
   <button type="button" className={draft.zonasRojas.activo?'nv-btn-primary':''} aria-pressed={draft.zonasRojas.activo} disabled={busy} onClick={()=>setRed({activo:!draft.zonasRojas.activo})} style={{justifySelf:'start'}}>{draft.zonasRojas.activo?'Zonas rojas activadas · Desactivar':'Zonas rojas desactivadas · Activar'}</button>
   <p>{draft.zonasRojas.activo?'Si la dirección o la referencia del cliente menciona uno de estos lugares, se calcula el transporte de su zona más el recargo, y la solicitud queda para que confirmes antes de aceptar. El cliente no ve la palabra «zona roja».':'Desactivadas: estos lugares se cobran como cualquier otra zona.'}</p>
   <div className="navidad-form-row"><label>Recargo adicional ($)<input inputMode="decimal" value={priceText(draft.zonasRojas.recargo)} disabled={busy||!draft.zonasRojas.activo} onChange={e=>setRed({recargo:e.target.value})}/></label><span/></div>
   <label>Lugares ({termCount}) · uno por línea<textarea rows={6} value={terms} disabled={busy||!draft.zonasRojas.activo} onChange={e=>{setTerms(e.target.value);setDirty(true);}}/></label>
  </section>

  <div className="nv-row"><button type="button" className="nv-btn-primary" disabled={busy||!dirty} onClick={save}>{busy?'Guardando…':'Guardar transporte'}</button><button type="button" disabled={busy} onClick={restore}>Restaurar valores originales</button></div>
 </details>;
}
