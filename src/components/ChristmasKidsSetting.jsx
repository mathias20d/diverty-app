import React,{useEffect,useState} from 'react';
import {doc,onSnapshot,setDoc} from 'firebase/firestore';
import {navidadApi} from '../lib/navidad-api.mjs';
import {profileErrorMessage} from '../lib/christmas-publish.mjs';

// Cuántos niños atiende cada visita de Santa. La página de reservas solo ofrece hasta ese número
// y el servidor rechaza reservas que lo superen. Sin configurar, el máximo es 2.
export const KIDS_DEFAULT=2,KIDS_MAX=50;
const valid=n=>Number.isInteger(n)&&n>=1&&n<=KIDS_MAX;

export default function ChristmasKidsSetting({store,user,onMessage}){
 const {db,appId,legacy}=store,ref=doc(db,'artifacts',appId,'public','data','config_web','global');
 const [saved,setSaved]=useState(KIDS_DEFAULT),[draft,setDraft]=useState(String(KIDS_DEFAULT)),[busy,setBusy]=useState(false),[touched,setTouched]=useState(false);
 useEffect(()=>onSnapshot(ref,snap=>{const n=Number(snap.data()?.maxNinos);const value=valid(n)?n:KIDS_DEFAULT;setSaved(value);setDraft(old=>touched?old:String(value));},()=>{}),[appId,touched]);
 const set=value=>{setTouched(true);setDraft(String(value));};
 const n=Number(draft);
 const save=async()=>{
  if(!valid(n))return onMessage('Elige entre 1 y '+KIDS_MAX+' niños por visita.');
  setBusy(true);
  try{
   if(legacy)await setDoc(ref,{maxNinos:n,updatedAt:new Date().toISOString()},{merge:true});
   else await navidadApi('profile',{profile:{maxNinos:n}},user);
   setSaved(n);setTouched(false);
   onMessage('Listo: tu página de reservas acepta hasta '+n+' niño'+(n===1?'':'s')+' por visita.');
  }catch(e){onMessage(legacy?'No se pudo guardar la cantidad de niños.':profileErrorMessage(e.message));}
  finally{setBusy(false);}
 };
 return <section className="nv-section" aria-labelledby="nv-kids-title">
  <h3 id="nv-kids-title">Niños por visita</h3>
  <p>Máximo de niños que Santa atiende en cada entrega. Tus clientes solo podrán elegir hasta ese número al reservar.</p>
  <div className="nv-stepper-row">
   <span>Hasta</span>
   <div className="nv-stepper">
    <button type="button" aria-label="Un niño menos" disabled={busy||!(n>1)} onClick={()=>set(Math.max(1,(Number.isFinite(n)?n:KIDS_DEFAULT)-1))}>−</button>
    <input aria-label="Niños por visita" inputMode="numeric" value={draft} onFocus={e=>e.target.select()} onChange={e=>set(e.target.value.replace(/[^0-9]/g,'').slice(0,2))}/>
    <button type="button" aria-label="Un niño más" disabled={busy||n>=KIDS_MAX} onClick={()=>set(Math.min(KIDS_MAX,(Number.isFinite(n)?n:0)+1))}>+</button>
   </div>
   <span>niño{n===1?'':'s'}</span>
   <button className="nv-btn-primary" disabled={busy||n===saved||!valid(n)} onClick={save}>{busy?'Guardando…':'Guardar'}</button>
  </div>
 </section>;
}
