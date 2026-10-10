import {resourcesFromConfig} from './admin-settings.mjs';
import {financialEvent,normalize} from './workspace-data.mjs';
import {christmasRequest} from './request-data.mjs';
import {christmasInsertionPlan} from './domain/christmas-route.mjs';

export function santaConfirmationPatch(event,events,config,santa) {
 const enabled=Array.from({length:resourcesFromConfig(config).capacidadSanta},(_,i)=>`Santa ${i+1}`);
 if(!enabled.includes(santa))throw new Error('SANTA_UNAVAILABLE');
 const stops=events.filter(row=>row.id!==event.id&&row.fecha===event.fecha&&christmasRequest(row)&&financialEvent(row)&&row.entregaNavidadRealizada!==true&&normalize(row.estado)!=='completado'&&String(row.santaAsignado||'').trim()===santa);
 if(!christmasInsertionPlan(event,stops).feasible)throw new Error('SANTA_ROUTE_CONFLICT');
 return {esNavidad:true,recursoNavidad:'Santa',santaAsignado:santa};
}
