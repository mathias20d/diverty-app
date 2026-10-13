import { serviceOrderData, serviceOrderStaff } from './service-order.mjs';
import { transportPending } from './web-request-review.mjs';
import { needsPlaceReference } from './location-reference.mjs';

const text = value => String(value ?? '').trim();
export const normalizeFollowupText = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const FOLLOWUP_STATES = Object.freeze({sin_contactar:'Por contactar', contactado:'Contactado', esperando_cliente:'Esperando al cliente'});
export const CONTROL_FILTERS = Object.freeze([
  ['contact','Por contactar'], ['web','Solicitudes web'], ['quotes','Cotizaciones'],
  ['deposit','Sin anticipo'], ['preparation','Por preparar'], ['balance','Con saldo'], ['all','Todas'],
]);
const amount = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
export function validFollowupDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === value;
}
export function readFollowup(event = {}) {
  const saved = event.seguimientoComercial || {};
  return {estado: Object.hasOwn(FOLLOWUP_STATES,saved.estado) ? saved.estado : 'sin_contactar',
    proximoContacto: text(saved.proximoContacto), nota: text(saved.nota)};
}
export function reservationControlRows(events, today, catalog = []) {
  return (Array.isArray(events) ? events : []).filter(event => event && !event.deletedLocally && !event._system).map(event => {
    const state = normalizeFollowupText(event.estado), quote = state.includes('cotizaci') || state.includes('cot.');
    const archived = /cancelad|rechaz/.test(state), complete = state === 'completado';
    const web = !archived && !quote && state === 'pendiente' && normalizeFollowupText(event.origen) === 'web directa';
    const followup = readFollowup(event), total = amount(event.total), received = amount(event.abono);
    const balance = Math.max(0, Math.round((total-received)*100)/100);
    const future = !validFollowupDate(text(event.fecha)) || event.fecha >= today;
    const operational = !archived && !quote && !web;
    const christmas = event.esNavidad === true || /entregas de nochebuena/i.test(text(event.servicio));
    const actionable = !archived && !complete;
    const contactDue = actionable && validFollowupDate(followup.proximoContacto) && followup.proximoContacto <= today;
    const uncontacted = actionable && !followup.proximoContacto && followup.estado === 'sin_contactar' && (web || quote || state === 'pendiente');
    const issues = [];
    if (operational && !complete && future) {
      const santa = christmas;
      if (!validFollowupDate(text(event.fecha))) issues.push('Fecha');
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(text(event.hora))) issues.push('Hora');
      if (santa ? !text(event.santaAsignado) : !serviceOrderStaff(event).length) issues.push('Personal');
      if (!santa && serviceOrderData(event,catalog).services.some(service => service.missingDuration)) issues.push('Duración');
      if (transportPending(event)) issues.push('Transporte');
      if (needsPlaceReference(event)) issues.push('Lugar');
    }
    const flags = {contact:contactDue || uncontacted, web, quotes:quote && !archived,
      deposit:operational && !complete && future && total>0 && received===0,
      preparation:issues.length>0, balance:operational && balance>0, all:true};
    return {id:event.id, event, quote, web, archived, complete, christmas, total, received, balance, followup, contactDue, issues, flags};
  }).sort((a,b) => Number(b.contactDue)-Number(a.contactDue) ||
    (a.contactDue && b.contactDue ? a.followup.proximoContacto.localeCompare(b.followup.proximoContacto) : 0) ||
    text(a.event.fecha || '9999').localeCompare(text(b.event.fecha || '9999')) || text(a.event.hora).localeCompare(text(b.event.hora)) || text(a.id).localeCompare(text(b.id)));
}
export function filterReservationControl(rows, {filter='contact', search='', date=''} = {}) {
  const query = normalizeFollowupText(search);
  return rows.filter(row => row.flags[filter] && (!date || row.event.fecha === date) && (!query || normalizeFollowupText([
    row.event.cliente,row.event.telefono,row.event.servicio,row.event.estado,row.event.direccion,row.event.referenciaLugar,
    row.event.santaAsignado,...serviceOrderStaff(row.event).map(person => `${person.name} ${person.role}`),row.followup.nota,
  ].join(' ')).includes(query)));
}
export async function saveReservationFollowup({database,runTransaction,ref,event,draft,uid='',now=new Date().toISOString()}) {
  if (!event?.id || !draft || !Object.hasOwn(FOLLOWUP_STATES,draft.estado)) throw new Error('INVALID_FOLLOWUP');
  const proximoContacto = text(draft.proximoContacto), nota = text(draft.nota);
  if (proximoContacto && !validFollowupDate(proximoContacto)) throw new Error('INVALID_FOLLOWUP_DATE');
  if (nota.length>1000) throw new Error('FOLLOWUP_NOTE_TOO_LONG');
  return runTransaction(database, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('EVENT_NOT_FOUND');
    const current = snapshot.data();
    if (current.deletedLocally) throw new Error('RESERVATION_IN_TRASH');
    if (JSON.stringify(current.seguimientoComercial ?? null) !== JSON.stringify(event.seguimientoComercial ?? null)) throw new Error('FOLLOWUP_CHANGED');
    const seguimientoComercial = {estado:draft.estado,proximoContacto,nota,actualizadoEn:now,actualizadoPor:uid};
    const patch = {seguimientoComercial,_rev:(Number(current._rev)||0)+1,updatedAt:now};
    transaction.set(ref,patch,{merge:true});
    return {...current,...patch,id:event.id};
  });
}
