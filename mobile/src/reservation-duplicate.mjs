// Commercial draft only: a new event must never inherit payments or document IDs.
import {webRequest} from './workspace-data.mjs';
import {christmasRequest} from './request-data.mjs';
export function canDuplicateReservation(event) {
 return !!event && !event.deletedLocally && !christmasRequest(event) && !event.centralBookingVersion && !event.resourceRequirements && !webRequest(event);
}
export function duplicateReservationDraft(event) {
 if(!canDuplicateReservation(event))throw new Error('SPECIAL_RESERVATION');
 const draft={};
 for(const key of ['cliente','telefono','email','fecha','hora','ubicacion','transporte','comentarios'])if(event[key]!==undefined)draft[key]=event[key];
 draft.serviciosSeleccionados=JSON.parse(JSON.stringify(event.serviciosSeleccionados||[]));
 draft.estado=/cot/i.test(String(event.estado||''))?'Cotización':'Pendiente';
 return draft;
}
