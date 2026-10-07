import { needsPlaceReference } from './location-reference.mjs';
// Use the destination saved on the reservation, never the visitor's country.
export function transportPending(event) {
  const flagged = event?.requiereRevisionUbicacion === true || event?.totalPendienteTransporte === true || /por confirmar|por revisar|fuera.*(?:area|área|cobertura)|despu[eé]s de/i.test(String(event?.ubicacion || ''));
  return flagged && event?.transporteRevisadoEnApp !== true;
}
export function requestReview(event) {
  const christmas = event?.esNavidad === true || /entregas de nochebuena/i.test(String(event?.servicio || ''));
  const issues = [];
  if (!String(event?.direccion || '').trim()) issues.push('Ubicación');
  if (needsPlaceReference(event)) issues.push('Referencia');
  if (transportPending(event)) issues.push('Transporte');
  if (!christmas && event?.recursosRevisadosEnApp !== true) issues.push('Personal');
  if (christmas && !event?.santaAsignado) issues.push('Asignar Santa');
  const balance = Math.max(0, Number(event?.total || 0)-Number(event?.abono || 0));
  return { issues, balance, missingDeposit: Number(event?.abono || 0) === 0 && balance>0 };
}
export function pendingRequests(events, filter='all', now=new Date()) {
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Panama',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const week = new Date(`${today}T12:00:00Z`); week.setUTCDate(week.getUTCDate()+7);
  const last = week.toISOString().slice(0,10);
  return (events || []).filter(e=>String(e.estado || '').trim().toLowerCase()==='pendiente' && String(e.origen || '').trim().toLowerCase()==='web directa' && e.deletedLocally!==true)
    .filter(e=>filter==='review'?requestReview(e).issues.length>0:filter==='soon'?e.fecha>=today && e.fecha<=last:filter==='deposit'?requestReview(e).missingDeposit:true)
    .sort((a,b)=>String(a.fecha || '9999').localeCompare(String(b.fecha || '9999')) || String(a.hora || '').localeCompare(String(b.hora || '')) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
}
