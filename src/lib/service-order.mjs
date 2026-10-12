import { billingMode } from './reservation-lines.mjs';
import { serviceDurationHours } from './service-duration.mjs';

const text = value => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
const normalized = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const positive = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 1;

export function serviceOrderReference(event = {}) {
  return text(event.numeroOrdenServicio) || `OS-${text(event.id) || 'SIN-RESERVA'}`;
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
      duration: hours > 0 ? `${hours} ${hours === 1 ? 'hora' : 'horas'}` : 'Según reserva',
      description: [...new Map(details.map(value => [normalized(value), value])).values()].join('\n'),
    };
  });
  const people = [...(Array.isArray(event.personalResponsable) ? event.personalResponsable : []), ...(Array.isArray(event.subcontratos) ? event.subcontratos : [])];
  const staff = [...new Map(people.filter(item => item && text(item.nombre)).map(item => {
    const person = { name: text(item.nombre), role: text(item.rol || item.servicio || item.especialidad) || 'Personal asignado' };
    return [`${normalized(person.name)}|${normalized(person.role)}`, person];
  })).values()];
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
