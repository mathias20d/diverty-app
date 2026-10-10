import { serviceDurationHours } from './domain/service-duration.mjs';
import { panamaToday } from './domain/date-availability.mjs';
import { normalize } from './workspace-data.mjs';
const types = {
  factura: {
    field: 'numeroFactura',
    prefix: 'FAC',
    title: 'FACTURA COMERCIAL'
  },
  cotizacion: {
    field: 'numeroCotizacion',
    prefix: 'COT',
    title: 'COTIZACIÓN'
  }
};
const amount = value => {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number) || number < 0) throw new Error('INVALID_DOCUMENT_AMOUNT');
  return Math.round(number * 100) / 100;
};
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[char]);
const detailLines = value => Array.isArray(value) ? value.flatMap(detailLines) : value && typeof value === 'object' ? Object.values(value).flatMap(detailLines) : String(value ?? '').split(/\n|\r|\||;/).map(value => value.trim()).filter(Boolean);
export const DEFAULT_COMPANY = {
  nombre: 'Diverty Eventos Panamá',
  web: 'https://divertypanama.netlify.app/',
  telefono: '',
  email: '',
  ruc: '',
  nombreTitular: '',
  banco: '',
  tipoCuenta: '',
  numeroCuenta: ''
};
export function companyDetails(input) {
  const saved = Object.fromEntries(Object.keys(DEFAULT_COMPANY).map(key => [key, String(input[key] ?? '').trim()]));
  if (!saved.nombre) throw new Error('COMPANY_NAME_REQUIRED');
  return saved;
}
export async function ensureDocumentNumber({
  runTransaction,
  db,
  ref,
  counterRef,
  type,
  now
}) {
  const config = types[type];
  if (!config) throw new Error('INVALID_DOCUMENT_TYPE');
  return runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists() || snap.data().deletedLocally) throw new Error('EVENT_NOT_FOUND');
    const current = snap.data();
    if (current[config.field]) return current;
    const counter = await tx.get(counterRef);
    if (!counter.exists()) throw new Error('COUNTER_NOT_READY');
    const last = Number(counter.data().ultimo ?? 0);
    if (!Number.isSafeInteger(last) || last < 0) throw new Error('INVALID_DOCUMENT_COUNTER');
    const next = last + 1;
    if (!Number.isSafeInteger(next)) throw new Error('INVALID_DOCUMENT_COUNTER');
    const patch = {
      [config.field]: `${config.prefix}-${String(next).padStart(5, '0')}`,
      _rev: (Number(current._rev) || 0) + 1,
      updatedAt: now
    };
    tx.set(counterRef, {
      ultimo: next
    }, {
      merge: true
    });
    tx.set(ref, patch, {
      merge: true
    });
    return {
      ...current,
      ...patch
    };
  });
}
export function documentData(event, type, catalog = []) {
  const config = types[type];
  if (!config) throw new Error('INVALID_DOCUMENT_TYPE');
  const total = amount(event.total),
    transport = amount(event.transporte),
    received = amount(event.abono);
  const summary = String(event.servicio || '').split(/\s+\+\s+/).map(value => normalize(value.replace(/\s*\(x\d+(?:[.,]\d+)?\)\s*$/i, '').trim())).filter(Boolean),
    allowed = new Set(summary),
    seen = new Set();
  let selected = (Array.isArray(event.serviciosSeleccionados) ? event.serviciosSeleccionados : []).filter(item => item && String(item.nombre || '').trim() && (!summary.length || allowed.has(normalize(item.nombre))));
  selected = selected.filter(item => {
    const key = String(item.id || '') || `${normalize(item.nombre)}|${Number(item.cantidad) || 1}|${amount(item.precio)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!selected.length) selected = [{
    nombre: event.servicio || 'Servicio General',
    cantidad: 1,
    precio: Math.max(0, total - transport),
    descripcion: event.comentarios || ''
  }];
  const lines = selected.map(item => {
    const match = catalog.find(candidate => normalize(candidate.nombre) === normalize(item.nombre)) || {},
      quantity = Number(item.cantidad ?? 1);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('INVALID_DOCUMENT_QUANTITY');
    const details = [item.incluye, item.serviciosLista, item.todoIncluido, item.todoLoIncluido, item.actividades, item.detalles, item.itemsIncluidos].flatMap(detailLines);
    const fallback = [match.incluye, match.serviciosLista, match.todoIncluido, match.todoLoIncluido, match.actividades, match.detalles, match.itemsIncluidos].flatMap(detailLines);
    const price = amount(item.precio),
      hours = serviceDurationHours(item, match);
    return {
      name: String(item.nombre),
      quantity,
      price,
      unitPrice: price / quantity,
      hours,
      details: details.length ? details : fallback.length ? fallback : detailLines(item.descripcion || match.descripcionCompleta || match.descripcion)
    };
  });
  const selectedSubtotal = Math.round(lines.reduce((sum, line) => sum + line.price * 100, 0)) / 100;
  const finalTotal = type === 'cotizacion' ? Math.round((selectedSubtotal + transport) * 100) / 100 : total;
  const issue = type === 'cotizacion' && event.fechaEmisionCotizacion ? String(event.fechaEmisionCotizacion).slice(0, 10) : panamaToday();
  const validity = Math.max(1, Math.round(Number(event.vigenciaCotizacion) || 7)),
    validUntil = new Date(`${issue}T12:00:00Z`);
  if (!Number.isFinite(validUntil.getTime())) throw new Error('INVALID_DOCUMENT_DATE');
  validUntil.setUTCDate(validUntil.getUTCDate() + validity);
  return {
    title: config.title,
    number: event[config.field] || 'Pendiente de generar',
    lines,
    total: finalTotal,
    subtotal: type === 'cotizacion' ? selectedSubtotal : Math.max(0, finalTotal - transport),
    transport,
    received,
    balance: Math.max(0, Math.round((finalTotal - received) * 100) / 100),
    issue,
    validity,
    validUntil: validUntil.toISOString().slice(0, 10)
  };
}
export function documentHTML(event, type, company, catalog = []) {
  const data = documentData(event, type, catalog),
    c = companyDetails(company),
    e = escapeHTML,
    m = value => `B/. ${Number(value).toFixed(2)}`,
    date = value => value ? e(String(value).split('-').reverse().join('/')) : 'Por definir';
  const rows = data.lines.map(line => `<tr><td>${e(line.quantity)}</td><td><b>${e(line.name)}</b>${line.details.length ? `<ul>${line.details.map(detail => `<li>${e(detail)}</li>`).join('')}</ul>` : ''}</td><td>${line.hours ? `${e(line.hours)} h` : '—'}</td><td class="money">${m(line.unitPrice)}</td><td class="money">${m(line.price)}</td></tr>`).join('');
  const bank = [['Banco', c.banco], ['Tipo de cuenta', c.tipoCuenta], ['Cuenta', c.numeroCuenta], ['Titular', c.nombreTitular], ['Yappy / Celular', c.telefono]].filter(([, value]) => value).map(([label, value]) => `<p><b>${label}:</b> ${e(value)}</p>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
 @page{size:A4;margin:18mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#202034;font-size:11px;line-height:1.5;margin:0}header{border-bottom:3px solid #7042d9;padding-bottom:18px;margin-bottom:22px}h1{font-size:22px;margin:14px 0 0;letter-spacing:2px;color:#7042d9}h2{font-size:12px;color:#7042d9;margin:0 0 10px}h3{font-size:19px;margin:0}p{margin:4px 0}.muted{color:#686878}.cards{display:table;width:100%;margin:18px 0}.card{display:table-cell;width:50%;vertical-align:top;padding:14px;border:1px solid #e7e4f0;background:#faf9fd;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;margin-top:18px;table-layout:fixed}th{background:#f1edfc;color:#7042d9;text-align:left;font-size:9px;padding:10px}td{padding:10px 8px;vertical-align:top;border-bottom:1px solid #e7e4f0;overflow-wrap:anywhere}tr{break-inside:avoid}.money{text-align:right;white-space:nowrap}ul{padding-left:14px;margin:6px 0;color:#686878;font-size:10px}.totals{margin:18px 0 18px auto;width:48%;border:1px solid #e7e4f0;padding:14px}.totals p{display:table;width:100%}.totals span{display:table-cell;text-align:right}.balance{background:#7042d9;color:white;padding:10px;font-size:14px}.note{padding:14px;border:1px solid #e7e4f0;background:#faf9fd;break-inside:avoid}footer{margin-top:20px;border-top:1px solid #e7e4f0;padding-top:10px;font-size:9px;color:#686878}
 </style></head><body><header><h3>${e(c.nombre)}</h3><p class="muted">${[c.ruc, c.telefono, c.email, c.web].filter(Boolean).map(e).join(' · ')}</p><h1>${data.title}</h1><p><b>${e(data.number)}</b> · Emisión: ${date(data.issue)}</p></header><div class="cards"><section class="card"><h2>DATOS DEL CLIENTE</h2><b>${e(event.cliente || event.nombre || 'Cliente')}</b><p>${e(event.telefono || '')}</p><p>${e(event.email || '')}</p>${event.ruc ? `<p>RUC: ${e(event.ruc)}</p>` : ''}</section><section class="card"><h2>DETALLES DEL EVENTO</h2><p>Fecha: <b>${date(event.fecha)}</b></p><p>Horario: ${e(event.hora || 'Por definir')}</p><p>${e(event.ubicacion || 'Lugar por definir')}</p><p>${e(event.direccion || '')}</p><p>${e(event.referenciaLugar || '')}</p></section></div><table><thead><tr><th style="width:8%">Cant.</th><th style="width:43%">Concepto / Servicio</th><th style="width:13%">Duración</th><th style="width:18%" class="money">P. Unit.</th><th style="width:18%" class="money">Total</th></tr></thead><tbody>${rows}${data.transport > 0 ? `<tr><td>1</td><td>Transporte</td><td>—</td><td class="money">${m(data.transport)}</td><td class="money">${m(data.transport)}</td></tr>` : ''}</tbody></table><section class="totals"><p>Subtotal servicios <span>${m(data.subtotal)}</span></p>${data.transport > 0 ? `<p>Transporte <span>${m(data.transport)}</span></p>` : ''}<p><b>Total ${type === 'cotizacion' ? 'propuesto' : 'facturado'}</b><span><b>${m(data.total)}</b></span></p>${type === 'factura' ? `<p>Abono recibido <span>${m(data.received)}</span></p><p class="balance">Saldo pendiente <span>${m(data.balance)}</span></p>` : ''}</section>${type === 'factura' ? `<section class="note"><h2>DATOS PARA TRANSFERENCIA</h2>${bank || '<p>Contacta a Diverty para coordinar los datos del abono.</p>'}</section><p class="muted">El detalle contractual completo y las condiciones del servicio se encuentran en el contrato asociado.</p>` : `<section class="note"><h2>CONDICIONES DE LA PROPUESTA</h2><p>La fecha queda reservada únicamente al confirmarse el abono acordado.</p><p>La disponibilidad se confirma al momento de aceptar esta cotización.</p><p>Cambios de horario, ubicación o servicios pueden modificar el valor final.</p><p>Esta cotización no constituye comprobante de pago.</p><p>Vigencia: ${e(data.validity)} días, hasta ${date(data.validUntil)}.</p></section>`}<footer>${e(c.nombre)}${c.telefono ? ` · ${e(c.telefono)}` : ''} · Gracias por elegir Diverty.</footer></body></html>`;
}
