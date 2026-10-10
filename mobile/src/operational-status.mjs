import {normalize,webRequest,quote,archived} from './workspace-data.mjs';
import {christmasRequest} from './request-data.mjs';
export const NORMAL_OPERATION_STEPS=Object.freeze(['Confirmado','Preparando','En camino','En el evento','Completado']);
export function nextOperationalState(value){
 const state=normalize(value);
 if(state==='pendiente')return 'Confirmado';
 if(state.startsWith('confirmad'))return 'Preparando';
 if(state==='preparando')return 'En camino';
 if(state==='en camino')return 'En el evento';
 if(state==='en el evento')return 'Completado';
 return null;
}
export const operationalLabel=value=>({'Confirmado':'Confirmar reserva','Preparando':'Iniciar preparación','En camino':'Salir al evento','En el evento':'Ya llegamos','Completado':'Marcar evento realizado'})[nextOperationalState(value)]||'';
export const normalOperationalEvent=event=>!!event&&!event.deletedLocally&&!event._system&&!webRequest(event)&&!quote(event)&&!archived(event)&&!christmasRequest(event);
export async function transitionOperationalStatus({runTransaction,db,ref,event,target,now}){
 if(target!=='Cancelado'&&!NORMAL_OPERATION_STEPS.includes(target))throw new Error('INVALID_STATUS_TRANSITION');
 return runTransaction(db,async tx=>{
  const snap=await tx.get(ref),current=snap.exists()?snap.data():null;
  if(!current||current.deletedLocally)throw new Error('EVENT_NOT_FOUND');
  if(current.estado===target)return {...current,id:event.id};
  if(!normalOperationalEvent(current))throw new Error('INVALID_OPERATIONAL_EVENT');
  if(Number(current._rev||0)!==Number(event._rev||0))throw new Error('EVENT_CHANGED');
  if(target!=='Cancelado'&&target!==nextOperationalState(current.estado))throw new Error('INVALID_STATUS_TRANSITION');
  const metadata=target==='Confirmado'?{confirmedAt:current.confirmedAt||now,estadoOperativoActualizadoAt:now}:target==='Cancelado'?{cancelledAt:now}:{[({Preparando:'preparingAt','En camino':'enCaminoAt','En el evento':'enEventoAt',Completado:'completedAt'})[target]]:now,estadoOperativoActualizadoAt:now};
  const patch={estado:target,...metadata,_rev:Number(current._rev||0)+1,updatedAt:now};
  tx.set(ref,patch,{merge:true});return {...current,...patch,id:event.id};
 });
}
