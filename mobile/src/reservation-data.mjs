import { validDate } from './domain/date-availability.mjs';
import { billingMode, reservationServices } from './domain/reservation-lines.mjs';
export function reservationPatch(form, original = {}) {
 if(!form.cliente?.trim() || !form.telefono?.trim()) throw new Error('Nombre y teléfono son obligatorios.');
 if(!validDate(form.fecha)) throw new Error('Escribe una fecha válida: AAAA-MM-DD.');
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.hora||'')) throw new Error('Escribe una hora válida: HH:MM.');
 if(!form.ubicacion?.trim()) throw new Error('Escribe la dirección del evento.');
 const lines=form.serviciosSeleccionados||[];
 if(!lines.length) throw new Error('Agrega al menos un producto o servicio.');
 for(const line of lines) {
  const q=Number(line.cantidad),p=Number(line.precioOriginal);
  if(!line.nombre?.trim() || !Number.isFinite(q) || q<(billingMode(line)==='hora'?.5:1) || (billingMode(line)!=='hora'&&!Number.isInteger(q)) || !Number.isFinite(p)||p<0||!Number.isFinite(Number(line.precio))||Number(line.precio)<0)throw new Error('Revisa cantidades, horas y precios.');
 }
 const transport=Number(form.transporte);
 if(!Number.isFinite(transport)||transport<0)throw new Error('El transporte debe ser un importe válido.');
 const summary=reservationServices(form,lines),total=Number(summary.total);
 if(!Number.isFinite(total)||total<=0)throw new Error('El total debe ser mayor que cero.');
 if(total<Number(original.abono||0))throw new Error('El total no puede ser menor que los abonos recibidos.');
 const changesSchedule=original.fecha!==form.fecha||original.hora!==form.hora;
 if(original.id && changesSchedule && (original.esNavidad || original.centralBookingVersion || original.resourceRequirements))throw new Error('Cambia el horario de esta reserva especial desde la app actual para conservar sus cupos.');
 return {cliente:form.cliente.trim(),telefono:form.telefono.trim(),email:(form.email||'').trim(),fecha:form.fecha,hora:form.hora,ubicacion:form.ubicacion.trim(),transporte:transport,serviciosSeleccionados:lines,servicio:summary.servicio,total,descripcionEvento:lines.map(s=>[s.nombre,s.descripcion,Array.isArray(s.incluye)?s.incluye.join('\n'):s.incluye].filter(Boolean).join('\n')).join('\n\n'),...(changesSchedule?{colisionAprobada:false}:{})};
}
export function mergeReservation(remote, patch, openedRevision, now) {
 if((Number(remote._rev)||0)!==(Number(openedRevision)||0)) throw new Error('EDIT_CONFLICT');
 return {...remote,...patch,_rev:(Number(remote._rev)||0)+1,updatedAt:now};
}
