import { billingMode } from './reservation-lines.mjs';
import { serviceDurationHours } from './service-duration.mjs';

const text = value => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
const normalized = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const positive = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 1;

export function serviceOrderReference(event = {}) {
  return text(event.numeroOrdenServicio) || `OS-${text(event.id) || 'SIN-RESERVA'}`;
}

export const SERVICE_ORDER_ROLES = ['Animador(a)', 'Payaso(a)', 'Pintacaritas', 'Encargado del servicio infantil'];

export function serviceOrderStaff(event = {}) {
  const assigned = Array.isArray(event.personalResponsable) ? event.personalResponsable : [];
  const people = event.personalOrdenConfirmado === true ? assigned : [...assigned, ...(Array.isArray(event.subcontratos) ? event.subcontratos : [])];
  return [...new Map(people.filter(item => item && text(item.nombre)).map(item => {
    const person = { name: text(item.nombre), role: text(item.rol || item.servicio || item.especialidad) || 'Personal asignado' };
    return [`${normalized(person.name)}|${normalized(person.role)}`, person];
  })).values()];
}

export async function saveServiceOrderStaff({ database, runTransaction, ref, event, people, now = new Date().toISOString() }) {
  if (!event?.id || !Array.isArray(people)) throw new Error('INVALID_ORDER_STAFF');
  const personalResponsable = people.map(person => {
    const nombre = text(person?.nombre), rol = text(person?.rol);
    if (!nombre || !rol) throw new Error('INCOMPLETE_ORDER_STAFF');
    return { ...(text(person.id) ? {id:text(person.id)} : {}), nombre, rol };
  });
  return runTransaction(database, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('EVENT_NOT_FOUND');
    const current = snapshot.data();
    if (JSON.stringify(serviceOrderStaff(current)) !== JSON.stringify(serviceOrderStaff(event))) throw new Error('ORDER_STAFF_CHANGED');
    const patch = { personalResponsable, personalOrdenConfirmado:true, _rev:(Number(current._rev)||0)+1, updatedAt:now };
    transaction.set(ref, patch, {merge:true});
    return { ...current, ...patch, id:event.id };
  });
}

// Only operational/customer fields leave this function. No costs, balances,
// banking details or internal notes belong on a paper signed by the customer.
export function serviceOrderData(event = {}, catalog = [], selected = event.serviciosSeleccionados) {
  const source = Array.isArray(selected) ? selected.filter(line => line && text(line.nombre)) : [];
  const services = (source.length ? source : [{ nombre: text(event.servicio) || 'Servicio reservado', cantidad: 1 }]).map(line => {
    const match = catalog.find(item => item && ((line.id && item.id === line.id) || normalized(item.nombre) === normalized(line.nombre))) || {};
    const metadata = { ...match, ...line };
    const mode = metadata.tipoCobro === 'nino' ? 'nino' : billingMode(metadata), quantity = positive(line.cantidad);
    const hours = mode === 'hora' ? quantity : serviceDurationHours(line, match);
    const details = [line.descripcion, ...(Array.isArray(line.incluye) ? line.incluye : []), line.serviciosLista]
      .flatMap(value => text(value).split(/\r?\n/)).map(value => value.replace(/^[•\-–—*]\s*/, '').trim()).filter(Boolean);
    return {
      name: text(line.nombre), quantity,
      unit: mode === 'hora' ? 'horas' : mode === 'nino' ? 'niños' : mode === 'unidad' ? text(line.unidadEtiqueta || match.unidadEtiqueta) || 'unidades' : 'servicio(s)',
      duration: hours > 0 ? `${hours} ${hours === 1 ? 'hora' : 'horas'}` : mode === 'unidad' ? 'No aplica' : '—',
      missingDuration: hours <= 0 && mode !== 'unidad',
      description: [...new Map(details.map(value => [normalized(value), value])).values()].join('\n'),
    };
  });
  const staff = serviceOrderStaff(event);
  return {
    reference: serviceOrderReference(event), client: text(event.cliente || event.nombre), phone: text(event.telefono),
    date: text(event.fecha), time: text(event.hora), place: text(event.ubicacion),
    address: text(event.direccion), venueReference: text(event.referenciaLugar), services, staff,
  };
}

export function serviceOrderShareText(event = {}) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text(event.fecha)) ? text(event.fecha).split('-').reverse().join('/') : 'por definir';
  return `Orden de servicio Diverty\nCliente: ${text(event.cliente || event.nombre) || 'Por completar'}\nFecha: ${date}\nAl finalizar el evento, solicita la firma y la calificación del cliente.`;
}
