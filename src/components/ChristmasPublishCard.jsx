import React,{useEffect,useState} from 'react';
import {doc,onSnapshot} from 'firebase/firestore';
import {navidadApi} from '../lib/navidad-api.mjs';
import {profileErrorMessage,publicPageLink,publishSteps,shareLinkOnWhatsapp,validWhatsapp} from '../lib/christmas-publish.mjs';

// Tarjeta de inicio: guía en 3 pasos para publicar y, ya publicada, comparte el enlace.
export default function ChristmasPublishCard({store,user,catalog,onMessage,onOpenSettings}){
 const {db,appId,legacy}=store,ref=id=>doc(db,'artifacts',appId,'public','data','config_web',id);
 const [profile,setProfile]=useState(null),[slug,setSlug]=useState(''),[phone,setPhone]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>onSnapshot(ref('global'),snap=>setProfile(snap.data()||{}),()=>setProfile({})),[appId]);
 useEffect(()=>onSnapshot(ref('disponibilidad'),snap=>setSlug(snap.data()?.enlace||''),()=>{}),[appId]);
 if(!profile)return null;
 const link=publicPageLink({slug,uid:user.uid,legacy});
 const copy=async()=>{try{await navigator.clipboard.writeText(link);onMessage('Enlace copiado. Pégalo en WhatsApp, Instagram o Facebook.');}catch{onMessage(link);}};
 const share=async()=>{const text='Reserva la visita de Santa este 24 y 25 de diciembre';if(navigator.share){try{await navigator.share({title:profile.nombreEmpresa||'Operación Navidad',text,url:link});return;}catch(e){if(e?.name==='AbortError')return;}}window.open(shareLinkOnWhatsapp(link,profile.nombreEmpresa),'_blank','noopener');};

 if(legacy||profile.publicado)return <section className="nv-publish nv-publish-live" aria-label="Tu página de reservas">
  <div className="nv-publish-head"><span className="nv-pill nv-pill-ok">Publicada</span><h2>Tu página de reservas</h2></div>
  <a className="nv-link-preview" href={link} target="_blank" rel="noopener noreferrer">{link.replace('https://','')}</a>
  <div className="nv-publish-actions"><button className="nv-btn-primary" onClick={share}>Compartir enlace</button><button onClick={copy}>Copiar</button><a className="nv-btn" href={link} target="_blank" rel="noopener noreferrer">Ver página</a></div>
 </section>;

 const steps=publishSteps({profile,catalog}),ready=steps[0].done&&steps[1].done;
 const savePhone=async()=>{if(!validWhatsapp(phone))return onMessage('Escribe el WhatsApp de tu empresa: 8 dígitos en Panamá o con código de país.');setBusy(true);try{await navidadApi('profile',{profile:{telefonoEmpresa:phone}},user);setPhone('');onMessage('WhatsApp guardado.');}catch(e){onMessage(profileErrorMessage(e.message));}finally{setBusy(false);}};
 const publish=async()=>{setBusy(true);try{const r=await navidadApi('profile',{profile:{publicado:true}},user);if(r.slug)setSlug(r.slug);onMessage('¡Listo! Tu página de reservas está publicada. Compártela con tus clientes.');}catch(e){onMessage(profileErrorMessage(e.message));}finally{setBusy(false);}};
 return <section className="nv-publish" aria-label="Publica tu página de reservas">
  <div className="nv-publish-head"><h2>Publica tu página de reservas</h2><p>Tres pasos y tus clientes podrán reservar a Santa con tu enlace.</p></div>
  <ol className="nv-steps">{steps.map((step,i)=><li key={step.id} className={step.done?'is-done':''}>
   <span className="nv-step-dot" aria-hidden="true">{step.done?'✓':i+1}</span>
   <div className="nv-step-body"><b>{step.title}</b><small>{step.done?'Listo':step.hint}</small>
    {step.id==='whatsapp'&&!step.done&&<div className="nv-inline-form"><input type="tel" inputMode="tel" aria-label="WhatsApp de la empresa" placeholder="Ej. 6000-1234" value={phone} disabled={busy} onChange={e=>setPhone(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')savePhone();}}/><button className="nv-btn-primary" disabled={busy||!phone.trim()} onClick={savePhone}>Guardar</button></div>}
    {step.id==='service'&&!step.done&&<button className="nv-btn-primary" onClick={()=>onOpenSettings('services')}>Agregar servicio</button>}
    {step.id==='publish'&&<button className="nv-btn-primary" disabled={busy||!ready} onClick={publish}>{busy?'Publicando…':'Publicar ahora'}</button>}
   </div>
  </li>)}</ol>
 </section>;
}
