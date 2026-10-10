import {hasPlaceDescription,needsPlaceReference} from './domain/location-reference.mjs';
import {transportPending} from './domain/web-request-review.mjs';
import {webRequest} from './workspace-data.mjs';
export const christmasRequest=event=>event.esNavidad===true||/entregas de nochebuena/i.test(String(event.servicio||''));
export function assertPending(event,revision){
 if(!event||event.deletedLocally)throw new Error('EVENT_NOT_FOUND');
 if(!webRequest(event))throw new Error('ALREADY_PROCESSED');
 if(Number(event._rev||0)!==Number(revision||0))throw new Error('EDIT_CONFLICT');
}
export function assertReview(event){
 if(needsPlaceReference(event))throw new Error('PLACE_REFERENCE_REQUIRED');
 if(transportPending(event))throw new Error('TRANSPORT_REVIEW_REQUIRED');
}
export function requestPatch(event,kind,value){
 if(kind==='reference'){
  const reference=String(value||'').trim();if(!hasPlaceDescription(reference)||reference.length>500)throw new Error('INVALID_REFERENCE');
  return {referenciaLugar:reference};
 }
 if(kind==='resources'){
  for(const [key,min,max] of [['animadores',0,50],['payasos',0,50],['durationMinutes',30,720]])if(value[key]==null||String(value[key]).trim()===''||!Number.isInteger(Number(value[key]))||Number(value[key])<min||Number(value[key])>max)throw new Error('INVALID_RESOURCES');
  const resourceRequirements=Object.fromEntries(Object.entries(value).filter(([key])=>['animadores','payasos','durationMinutes'].includes(key)).map(([key,n])=>[key,Number(n)]));
  return {resourceRequirements,duracionMinutos:resourceRequirements.durationMinutes,recursosRevisadosEnApp:true};
 }
 if(kind==='transport'){
  const text=String(value).trim().replace(',','.');if(!/^\d+(\.\d{1,2})?$/.test(text))throw new Error('INVALID_TRANSPORT');
  const next=Number(text),old=Number(event.transporte||0),total=Number(event.total||0),received=Number(event.abono||0);
  if(![next,old,total,received].every(Number.isFinite)||Math.min(next,old,total,received)<0)throw new Error('INVALID_TRANSPORT');
  const cents=Math.round(total*100)-Math.round(old*100)+Math.round(next*100);
  if(cents<Math.round(received*100)||cents<0)throw new Error('TOTAL_BELOW_PAYMENTS');
  return {transporte:next,total:cents/100,transporteRevisadoEnApp:true,requiereRevisionUbicacion:false,totalPendienteTransporte:false};
 }
 throw new Error('INVALID_REQUEST_PATCH');
}
export const requestMessages={EVENT_NOT_FOUND:'La solicitud ya no existe.',ALREADY_PROCESSED:'Esta solicitud ya fue procesada.',EDIT_CONFLICT:'La solicitud cambió en otro dispositivo. Vuelve a abrirla antes de guardar.',PLACE_REFERENCE_REQUIRED:'Confirma la barriada, PH o salón del evento.',TRANSPORT_REVIEW_REQUIRED:'Revisa y confirma el transporte antes de aceptar.',INVALID_REFERENCE:'Escribe una referencia del lugar (máximo 500 caracteres).',INVALID_RESOURCES:'Revisa el personal y la duración: deben ser enteros dentro del rango indicado.',INVALID_TRANSPORT:'Ingresa un transporte válido, con un máximo de dos decimales.',TOTAL_BELOW_PAYMENTS:'El total no puede ser menor que los abonos.',NO_CAPACITY:'No hay suficiente personal disponible en este horario.',SANTA_UNAVAILABLE:'Selecciona un Santa habilitado según la capacidad actual.',SANTA_ROUTE_CONFLICT:'Este Santa no puede atender el horario respetando la visita y el traslado. Selecciona otro Santa o revisa su ruta.',STALE_CONFIG:'La capacidad cambió. Reabre la solicitud antes de aceptar.'};
