import {serviceDurationHours} from './service-duration.mjs';
export function bookingControlDates(event) {
  if(!event?.fecha||!event?.hora)return [];
  const start=Date.parse(`${event.fecha}T${event.hora}:00-05:00`)/60000;
  const r=event.resourceRequirements||{};
  const duration=event.esNavidad===true?30:Math.max(30,Number(r.durationMinutes||event.duracionMinutos)||Math.max(0,...(event.serviciosSeleccionados||[]).map(s=>serviceDurationHours(s)))*60||120);
  if(!Number.isFinite(start)||!Number.isFinite(duration))return [];
  const dates=[];
  for(let day=Math.floor((start-300)/1440)-1;day<=Math.floor((start+duration-300-.001)/1440);day++)dates.push(new Date(day*86400000).toISOString().slice(0,10));
  return dates;
}
