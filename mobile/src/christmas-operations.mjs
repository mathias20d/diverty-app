import {financialEvent,sortEvents,webRequest,normalize} from './workspace-data.mjs';
import {christmasEventGps,christmasInsertionPlan} from './domain/christmas-route.mjs';
export const CHRISTMAS_DATES=['2026-12-24','2026-12-25'];
export const christmasEvent=event=>!!event && (event.esNavidad===true || /entregas de nochebuena/i.test(String(event.servicio || ''))) && CHRISTMAS_DATES.includes(event.fecha);
export const delivered=event=>event?.entregaNavidadRealizada===true || normalize(event?.estado)==='completado';
export const santaName=event=>String(event?.santaAsignado || '').trim() || 'Sin asignar';
export function christmasSummary(events,capacity=1,day='all') {
 const seasonal=sortEvents(events).filter(christmasEvent),all=seasonal.filter(financialEvent);
 const selected=event=>day==='all' || event.fecha===`2026-12-${day}`;
 const stops=all.filter(selected),requests=seasonal.filter(webRequest).filter(selected);
 const enabled=Array.from({length:capacity},(_,i)=>`Santa ${i+1}`);
 const names=[...new Set([...enabled,...stops.map(santaName)])].sort((a,b)=>a==='Sin asignar'?1:b==='Sin asignar'?-1:a.localeCompare(b,undefined,{numeric:true}));
 return {all,stops,requests,enabled,pending:stops.filter(row=>!delivered(row)).length,completed:stops.filter(delivered).length,groups:names.map(name=>{const rows=stops.filter(row=>santaName(row)===name);return {name,stops:rows,next:rows.find(row=>!delivered(row)),pending:rows.filter(row=>!delivered(row)).length};})};
}
export function santaRouteUrl(stops) {
 const pending=sortEvents(stops).filter(row=>!delivered(row));
 const date=pending[0]?.fecha;
 const targets=pending.filter(row=>row.fecha===date).map(row=>{const gps=christmasEventGps(row);return gps?`${gps.lat},${gps.lng}`:String(row.direccion || row.referenciaLugar || row.ubicacion || '').trim();}).filter(Boolean);
 if(!targets.length)return '';
 if(targets.length===1)return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(targets[0])}`;
 return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(targets.at(-1))}&waypoints=${encodeURIComponent(targets.slice(0,-1).join('|'))}&travelmode=driving`;
}
export function santaConflict(event,stops) {
 if(delivered(event))return false;
 if(santaName(event)==='Sin asignar')return true;
 return !christmasInsertionPlan(event,stops.filter(row=>row.id!==event.id && santaName(row)===santaName(event) && !delivered(row))).feasible;
}
export async function changeChristmasDelivery({runTransaction,db,ref,event,complete,now}) {
 return runTransaction(db,async tx=>{
  const snapshot=await tx.get(ref),current=snapshot.exists()?snapshot.data():null;
  if(!current || current.deletedLocally)throw new Error('EVENT_NOT_FOUND');
  if(!christmasEvent(current)||!financialEvent(current))throw new Error('NOT_ACTIVE_CHRISTMAS');
  if(delivered(current)===complete)return {...current,id:event.id};
  if(Number(current._rev||0)!==Number(event._rev||0))throw new Error('EVENT_CHANGED');
  const patch=complete?{entregaNavidadRealizada:true,entregaNavidadRealizadaAt:now,estado:'Completado',esNavidad:true,recursoNavidad:'Santa'}:{entregaNavidadRealizada:false,entregaNavidadRealizadaAt:'',estado:'Confirmado'};
  Object.assign(patch,{updatedAt:now,_rev:Number(current._rev||0)+1});
  tx.set(ref,patch,{merge:true});return {...current,...patch,id:event.id};
 });
}

export async function assignSanta({runTransaction,db,ref,event,configRef,otherRefs,santa,allowConflict=false,now}) {
 return runTransaction(db,async tx=>{
  const snap=await tx.get(ref),current=snap.exists()?snap.data():null;
  if(!current || current.deletedLocally)throw new Error('EVENT_NOT_FOUND');
  if(!christmasEvent(current)||!financialEvent(current))throw new Error('NOT_ACTIVE_CHRISTMAS');
  if(santaName(current)===santa)return {...current,id:event.id};
  if(Number(current._rev||0)!==Number(event._rev||0))throw new Error('EVENT_CHANGED');
  const config=(await tx.get(configRef)).data() || {};
  const raw=Number(config.capacidadSanta ?? 1),capacity=Number.isInteger(raw)&&raw>=1&&raw<=20?raw:1;
  if(!Array.from({length:capacity},(_,i)=>`Santa ${i+1}`).includes(santa))throw new Error('SANTA_UNAVAILABLE');
  const stops=[];
  for(const otherRef of otherRefs){const other=await tx.get(otherRef);if(other.exists()){const row={...other.data(),id:otherRef.id};if(christmasEvent(row)&&financialEvent(row)&&!delivered(row)&&santaName(row)===santa)stops.push(row);}}
  if(!allowConflict && !christmasInsertionPlan({...current,id:event.id},stops).feasible)throw new Error('SANTA_CONFLICT');
  const patch={santaAsignado:santa,esNavidad:true,recursoNavidad:'Santa',updatedAt:now,_rev:Number(current._rev||0)+1};
  tx.set(ref,patch,{merge:true});return {...current,...patch,id:event.id};
 });
}

export async function deleteChristmasReservation({runTransaction,db,ref,event}) {
 return runTransaction(db,async tx=>{
  const snap=await tx.get(ref);
  if(!snap.exists())return;
  const current=snap.data();
  if(!christmasEvent(current)||!financialEvent(current))throw new Error('NOT_ACTIVE_CHRISTMAS');
  if(Number(current._rev||0)!==Number(event._rev||0))throw new Error('EVENT_CHANGED');
  tx.delete(ref);
 });
}
