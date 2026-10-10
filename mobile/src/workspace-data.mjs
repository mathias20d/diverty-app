import {validDate} from './domain/date-availability.mjs';
import {expenseSummary} from './expenses.mjs';
import {reservationGpsPoint} from './domain/gps-point.mjs';

export const normalize=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
export const money=value=>`$${Number(value||0).toFixed(2)}`;
export const visibleEvent=event=>!!event&&!event._system&&!event.deletedLocally;
export const archived=event=>/^(cancelado|cancelada)$|rechaz/.test(normalize(event.estado));
export const quote=event=>/cotizaci|cot\./.test(normalize(event.estado));
export const webRequest=event=>normalize(event.estado)==='pendiente'&&normalize(event.origen)==='web directa';
export const financialEvent=event=>visibleEvent(event)&&!archived(event)&&!quote(event)&&!webRequest(event);
export const sortEvents=events=>events.filter(visibleEvent).slice().sort((a,b)=>String(a.fecha||'').localeCompare(String(b.fecha||''))||String(a.hora||'').localeCompare(String(b.hora||''))||String(a.cliente||'').localeCompare(String(b.cliente||'')));

export function monthRange(month){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('INVALID_MONTH');
 const [year,index]=month.split('-').map(Number);
 const count=new Date(Date.UTC(year,index,0,12)).getUTCDate();
 return {start:`${month}-01`,end:`${month}-${String(count).padStart(2,'0')}`,count};
}
export function moveMonth(month,delta){
 monthRange(month);
 const [year,index]=month.split('-').map(Number),next=new Date(Date.UTC(year,index-1+delta,1,12));
 return next.toISOString().slice(0,7);
}
export const monthLabel=month=>new Intl.DateTimeFormat('es-PA',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${monthRange(month).start}T12:00:00Z`));
export const dateLabel=date=>validDate(date)?new Intl.DateTimeFormat('es-PA',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`)):'Fecha por definir';
export function calendarCells(month){
 const {start,count}=monthRange(month),offset=(new Date(`${start}T12:00:00Z`).getUTCDay()+6)%7;
 return [...Array(offset).fill(null),...Array.from({length:count},(_,i)=>`${month}-${String(i+1).padStart(2,'0')}`)];
}
export function searchEvents(events,search,status='todos'){
 const term=normalize(search),digits=String(search||'').replace(/\D/g,'');
 return sortEvents(events).filter(e=>(status==='todos'||(status==='pendientes'?normalize(e.estado)==='pendiente':status==='confirmadas'?/confirmad|preparando|en camino|en el evento/.test(normalize(e.estado)):status==='completadas'?/^(completado|cobrado|pagado)$/.test(normalize(e.estado)):status==='canceladas'?archived(e):false))&&(!term||normalize([e.cliente,e.telefono,e.email,e.servicio,e.ubicacion,e.fecha].join(' ')).includes(term)||(digits.length>=3&&String(e.telefono||'').replace(/\D/g,'').includes(digits))));
}

// Match the official CRM: name first, phone only when a name is missing.
export function clientKey(event){
 const name=normalize(event.cliente||event.nombre),phone=String(event.telefono||'').replace(/\D/g,'');
 return name?`nom:${name}`:phone?`tel:${phone}`:'';
}
export function clientsFromEvents(events,hidden=[]){
 const clients=new Map();
 for(const event of sortEvents(events).filter(financialEvent)){
  const key=clientKey(event);if(!key)continue;
  const client=clients.get(key)||{key,nombre:'Cliente',telefono:'',email:'',reservas:[],ultimaFecha:''};
  if(event.cliente)client.nombre=event.cliente;
  if(event.telefono)client.telefono=event.telefono;
  if(event.email)client.email=event.email;
  client.reservas.push(event);client.ultimaFecha=event.fecha||client.ultimaFecha;clients.set(key,client);
 }
 return [...clients.values()].filter(c=>!hidden.includes(c.nombre)&&!hidden.includes(`key:${c.key}`)).sort((a,b)=>a.nombre.localeCompare(b.nombre));
}
export function clientPrefill(client){return {cliente:client.nombre||'',telefono:client.telefono||'',email:client.email||''};}

export function financeSummary(events){
 const result={reservas:0,total:0,received:0,balance:0,internal:0,providers:0,costs:0,profit:0,invalid:0,webRequests:0};
 const sums={total:0,received:0,balance:0,internal:0,providers:0};
 for(const event of events.filter(visibleEvent)){
  if(webRequest(event)){result.webRequests++;continue;}
  if(!financialEvent(event))continue;
  result.reservas++;
  try{
   const total=Number(event.total||0),received=Number(event.abono||0),costs=expenseSummary(event);
   if(!Number.isFinite(total)||total<0||!Number.isFinite(received)||received<0)throw new Error('INVALID_FINANCES');
   const t=Math.round(total*100),r=Math.min(t,Math.round(received*100));
   sums.total+=t;sums.received+=r;sums.balance+=t-r;
   sums.internal+=Math.round(costs.internal*100);sums.providers+=Math.round(costs.providers*100);
  }catch{result.invalid++;}
 }
 for(const key of Object.keys(sums))result[key]=sums[key]/100;
 result.costs=(sums.internal+sums.providers)/100;
 result.profit=(sums.total-sums.internal-sums.providers)/100;
 return result;
}
export function whatsappUrl(phone){
 let digits=String(phone||'').replace(/\D/g,'').replace(/^00/,'');
 if(digits.length===8)digits=`507${digits}`;
 if(digits.length<8||digits.length>15)return null;
 return `https://wa.me/${digits}`;
}
export function mapsUrl(event){
 const gps=reservationGpsPoint(event);
 if(gps)return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${gps.lat},${gps.lng}`)}`;
 const address=[event.direccion,event.referenciaLugar,event.ubicacion].filter(Boolean).join(' ').trim();
 if(!address)return null;
 const link=address.match(/https?:\/\/(?:maps\.app\.goo\.gl\/|(?:www\.)?google\.com\/maps\/|maps\.google\.com\/|(?:www\.)?waze\.com\/)[^\s]+/i);
 return link?link[0]:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address+' Panamá')}`;
}
