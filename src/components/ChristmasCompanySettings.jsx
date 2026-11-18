import React,{useState,useEffect} from 'react';
import {doc,onSnapshot,runTransaction} from 'firebase/firestore';
import {navidadApi} from '../lib/navidad-api.mjs';
import {uploadServiceImage} from '../lib/image-upload.mjs';
import {profileErrorMessage,publicPageLink,shareLinkOnWhatsapp} from '../lib/christmas-publish.mjs';

// Empresa, enlace y servicios. «part» elige qué mostrar en la pestaña de Ajustes:
// 'company' (empresa, WhatsApp y enlace) o 'services' (servicios de Navidad).
// Guardar y publicar lo hace el servidor: no hace falta confirmar el correo.
export default function ChristmasCompanySettings({store,user,catalog,onMessage,part='company'}){
 const {db,appId,legacy}=store,ref=(section,id)=>doc(db,'artifacts',appId,'public','data',section,id);
 const [profile,setProfile]=useState({}),[name,setName]=useState(''),[phone,setPhone]=useState(''),[busy,setBusy]=useState(false),[service,setService]=useState({nombre:'',precio:'',serviciosLista:'',imagen:''}),[editingId,setEditingId]=useState('');
 useEffect(()=>onSnapshot(ref('config_web','global'),snap=>{const p=snap.data()||{};setProfile(p);setName(p.nombreEmpresa||(legacy?'Diverty Eventos':''));setPhone(p.telefonoEmpresa||(legacy?'50766677965':''));},()=>onMessage('No se pudo cargar la configuración de tu empresa.')),[appId]);
 const [slug,setSlug]=useState(''),[slugDraft,setSlugDraft]=useState('');
 useEffect(()=>onSnapshot(ref('config_web','disponibilidad'),snap=>{const s=snap.data()?.enlace||'';setSlug(s);setSlugDraft(old=>old||s);},()=>{}),[appId]);
 const link=publicPageLink({slug,uid:user.uid,legacy});
 const saveSlug=async()=>{if(String(slugDraft).trim().length<3)return onMessage('El nombre del enlace debe tener al menos 3 letras.');setBusy(true);try{const result=await navidadApi('link',{slug:slugDraft},user);setSlug(result.slug);setSlugDraft(result.slug);onMessage('Tu enlace ahora es entregasnavidad.netlify.app/s/'+result.slug);}catch(e){onMessage(e.message==='SLUG_TAKEN'?'Ese nombre ya lo usa otra empresa. Prueba con otro.':e.message==='INVALID_SLUG'?'Usa solo letras, números y guiones (mínimo 3).':'No se pudo guardar el enlace. Revisa la conexión.');}finally{setBusy(false);}};
 const saveProfile=async publish=>{
  const cleanName=name.replace(/[<>]/g,'').trim();
  if(!cleanName)return onMessage('Escribe el nombre de la empresa.');
  setBusy(true);
  try{
   if(legacy){const rawPhone=phone.replace(/[^0-9]/g,''),cleanPhone=rawPhone.length===8?'507'+rawPhone:rawPhone;await runTransaction(db,async tx=>{const global=await tx.get(ref('config_web','global')),sync=await tx.get(ref('config_web','web_sync')),version=sync.data()||{};tx.set(ref('config_web','global'),{...global.data(),nombreEmpresa:cleanName,telefonoEmpresa:cleanPhone},{merge:true});tx.set(ref('config_web','web_sync'),{version:Number(version.version||0)+1,versions:{...version.versions,config_web:Number(version.versions?.config_web||0)+1},updatedAt:new Date().toISOString()},{merge:true});});return onMessage('Datos de la empresa guardados.');}
   const result=await navidadApi('profile',{profile:{nombreEmpresa:cleanName,telefonoEmpresa:phone,...(publish===undefined?{}:{publicado:publish})}},user);
   if(result.slug){setSlug(result.slug);setSlugDraft(result.slug);}
   onMessage(publish===true?'¡Listo! Tu página de reservas está publicada.':publish===false?'Se pausó tu página. Las reservas se conservan.':'Datos de la empresa guardados.');
  }catch(e){onMessage(profileErrorMessage(e.message));}finally{setBusy(false);}
 };
 const saveService=async()=>{const nombre=service.nombre.replace(/[<>]/g,'').trim(),precio=Number(String(service.precio).replace(',','.'));if(!nombre||!String(service.precio).trim()||!Number.isFinite(precio)||precio<0||precio>100000)return onMessage('Escribe un nombre y precio válidos.');if(service.imagen&&!service.imagen.toLowerCase().startsWith('https://'))return onMessage('La imagen debe usar un enlace HTTPS.');setBusy(true);try{const id=editingId||'santa-'+crypto.randomUUID();const syncRef=ref('config_web','web_sync');await runTransaction(db,async tx=>{const sync=await tx.get(syncRef),v=sync.data()||{};if(legacy&&!catalog.length)tx.set(ref('categorias_web','navidad'),{nombre:'Navidad',activo:true,visible:true,orden:1},{merge:true});tx.set(ref('catalogo_web',id),{nombre,precio,serviciosLista:service.serviciosLista.replace(/[<>]/g,''),descripcion:service.serviciosLista.replace(/[<>]/g,''),imagen:service.imagen.trim(),categoria:legacy?(catalog.find(item=>item.id===editingId)?.categoria||catalog[0]?.categoria||'navidad'):'navidad',esNavidad:true,recursoNavidad:'Santa',tipoCobro:'paquete',activo:true,orden:0},{merge:true});tx.set(syncRef,{version:Number(v.version||0)+1,versions:{...v.versions,catalogo_web:Number(v.versions?.catalogo_web||0)+1},updatedAt:new Date().toISOString()},{merge:true});});setService({nombre:'',precio:'',serviciosLista:'',imagen:''});setEditingId('');onMessage('Servicio navideño guardado.');}catch{onMessage('No se pudo guardar el servicio.');}finally{setBusy(false);}};
 const removeService=async item=>{if(!window.confirm('¿Quitar este servicio del catálogo? Las reservas anteriores conservan lo contratado.'))return;setBusy(true);try{await runTransaction(db,async tx=>{const sync=await tx.get(ref('config_web','web_sync')),v=sync.data()||{};tx.delete(ref('catalogo_web',item.id));tx.set(ref('config_web','web_sync'),{version:Number(v.version||0)+1,versions:{...v.versions,catalogo_web:Number(v.versions?.catalogo_web||0)+1},updatedAt:new Date().toISOString()},{merge:true});});onMessage('Servicio retirado del catálogo.');}catch{onMessage('No se pudo quitar el servicio.');}finally{setBusy(false);}};
 const [uploading,setUploading]=useState('');
 const pickImage=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{const url=await uploadServiceImage(file,setUploading);setService(old=>({...old,imagen:url}));onMessage('Imagen lista. Pulsa Guardar para aplicarla al servicio.');}catch(err){onMessage(err.message==='NOT_IMAGE'?'Elige un archivo de imagen (JPG, PNG o similar).':err.message==='TOO_LARGE'?'La imagen es demasiado grande. Prueba con otra foto.':'No se pudo subir la imagen. Revisa la conexión e inténtalo otra vez.');}finally{setUploading('');}};
 const published=legacy||profile.publicado;
 const copyLink=async()=>{try{await navigator.clipboard.writeText(link);onMessage('Enlace copiado.');}catch{onMessage(link);}};

 if(part==='services')return <section className="nv-section" aria-label="Servicios de Navidad">
  <h3>Tus servicios ({catalog.length})</h3>
  <p>Lo que tus clientes podrán reservar. Con un servicio ya puedes publicar.</p>
  {catalog.map(item=><article key={item.id} className="navidad-record"><div className="nv-record-head"><b>{item.nombre}</b><span className="nv-pill nv-pill-brand">$ {Number(item.precio||0).toFixed(2)}</span></div><div className="nv-record-actions"><button disabled={busy} onClick={()=>{setEditingId(item.id);setService({nombre:item.nombre||'',precio:String(item.precio??0),serviciosLista:item.serviciosLista||item.descripcion||'',imagen:item.imagen||''});}}>Editar</button><button className="nv-btn-danger" disabled={busy} onClick={()=>removeService(item)}>Quitar</button></div></article>)}
  <div className="nv-summary nv-service-form"><strong>{editingId?'Editar servicio':'Agregar un servicio'}</strong>
   <div className="navidad-form-row"><label>Nombre del servicio<input maxLength={150} placeholder="Ej. Visita de Santa 30 min" value={service.nombre} onChange={e=>setService(old=>({...old,nombre:e.target.value}))}/></label><label>Precio ($)<input inputMode="decimal" placeholder="Ej. 60" value={service.precio} onChange={e=>setService(old=>({...old,precio:e.target.value}))}/></label></div>
   <label>Qué incluye<textarea maxLength={3000} rows={3} value={service.serviciosLista} onChange={e=>setService(old=>({...old,serviciosLista:e.target.value}))}/></label>
   <div className="nv-upload"><span className="nv-upload-label">Imagen del servicio (opcional)</span>{service.imagen?<div className="nv-upload-preview"><img src={service.imagen} alt="Vista previa del servicio"/><div className="nv-row"><label className="nv-upload-btn">Cambiar imagen<input type="file" accept="image/*" disabled={busy||!!uploading} onChange={pickImage}/></label><button type="button" className="nv-btn-danger" disabled={busy||!!uploading} onClick={()=>setService(old=>({...old,imagen:''}))}>Quitar</button></div></div>:<label className={'nv-upload-drop'+(uploading?' is-busy':'')}><span className="nv-upload-icon" aria-hidden="true">{uploading?'⏳':'📷'}</span><b>{uploading||'Subir imagen'}</b><small>Toca para elegir una foto de tu galería o tomarla con la cámara.</small><input type="file" accept="image/*" disabled={busy||!!uploading} onChange={pickImage}/></label>}</div>
   <div className="nv-row"><button className="nv-btn-primary" disabled={busy||!!uploading} onClick={saveService}>{editingId?'Guardar cambios':'Agregar servicio'}</button>{editingId&&<button onClick={()=>{setEditingId('');setService({nombre:'',precio:'',serviciosLista:'',imagen:''});}}>Cancelar</button>}</div>
  </div>
 </section>;

 return <section className="nv-section" aria-label="Mi empresa y página de reservas">
  <div className="nv-publish-state"><span className={'nv-pill '+(published?'nv-pill-ok':'nv-pill-warn')}>{published?'Página publicada':'Página sin publicar'}</span>{!legacy&&<button className={published?'':'nv-btn-primary'} disabled={busy} onClick={()=>saveProfile(!profile.publicado)}>{busy?'Guardando…':published?'Pausar página':'Publicar mi página'}</button>}</div>
  <div className="navidad-form-row"><label>Nombre de la empresa<input value={name} maxLength={100} onChange={e=>setName(e.target.value)}/></label><label>WhatsApp de la empresa<input type="tel" inputMode="tel" value={phone} maxLength={30} onChange={e=>setPhone(e.target.value)} placeholder="Ej. 6000-1234"/></label></div>
  <p className="nv-hint">Un número de Panamá de 8 dígitos se guarda con el 507 automáticamente.</p>
  <button className="nv-btn-primary" disabled={busy} onClick={()=>saveProfile()} style={{justifySelf:'start'}}>Guardar datos</button>
  <div className="nv-summary"><strong>Tu enlace de reservas</strong>
   <a className="nv-link-preview" href={link} target="_blank" rel="noopener noreferrer">{link.replace('https://','')}</a>
   <div className="nv-row"><button disabled={busy} onClick={copyLink}>Copiar enlace</button><a className="nv-btn" href={shareLinkOnWhatsapp(link,name)} target="_blank" rel="noopener noreferrer">Compartir por WhatsApp</a></div>
   <details className="nv-place-more"><summary>Cambiar el nombre del enlace</summary><div className="nv-place-adv"><label>Nombre del enlace<span style={{display:'flex',alignItems:'center',gap:8}}><span style={{flexShrink:0,fontWeight:500,color:'var(--nv-muted)'}}>…/s/</span><input value={slugDraft} maxLength={40} placeholder="mi-empresa" disabled={busy} onChange={e=>setSlugDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'-'))}/></span></label><button disabled={busy||!slugDraft||slugDraft===slug} onClick={saveSlug} style={{justifySelf:'start'}}>{slug?'Cambiar enlace':'Crear mi enlace'}</button></div></details>
  </div>
 </section>;
}
