const amount = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const money = value => Math.round((value + Number.EPSILON) * 100) / 100;

export const billingMode = line => ['hora', 'unidad', 'paquete'].includes(line?.tipoCobro)
  ? line.tipoCobro : line?.isHourly === true ? 'hora' : 'paquete';

export const unitPrice = line => line?.precioOriginal != null && line.precioOriginal !== ''
  ? Math.max(0, amount(line.precioOriginal))
  : Math.max(0, amount(line?.precio) / Math.max(0.5, amount(line?.cantidad) || 1));

// `precio` remains the full line total used by saved reservations and PDFs.
// Old lines are left untouched until the user edits their quantity or price.
export function editReservationLine(line, patch) {
  const next = {...line, ...patch};
  if ('tipoCobro' in patch) next.isHourly = patch.tipoCobro === 'hora';
  const mode = billingMode(next);
  const quantity = Math.max(0, amount(next.cantidad));
  const price = 'precioOriginal' in patch ? Math.max(0, amount(patch.precioOriginal)) : unitPrice(line);
  next.precioOriginal = patch.precioOriginal === '' ? '' : price;
  next.precio = 'precio' in patch ? Math.max(0, amount(patch.precio)) : money(price * quantity);
  if ('precio' in patch) next.precioOriginal = quantity > 0 ? next.precio / quantity : 0;
  if (mode === 'hora') next.duracionHoras = quantity;
  else if (mode === 'unidad') next.duracionHoras = 0;
  return next;
}

export function addReservationLine(lines, pkg) {
  const index = lines.findIndex(line => line.nombre === pkg.nombre);
  if (index >= 0) return lines.map((line, i) => i === index
    ? editReservationLine(line, {cantidad: (amount(line.cantidad) || 1) + 1}) : line);
  return [...lines, editReservationLine({...pkg, cantidad: 1}, {precioOriginal: amount(pkg.precio)})];
}

export function reservationServices(prev, lines) {
  const total = money(lines.reduce((sum, line) => sum + amount(line.precio), 0) + amount(prev.transporte));
  return {...prev, serviciosSeleccionados: lines,
    servicio: lines.map(line => amount(line.cantidad) !== 1 ? `${line.nombre} (x${line.cantidad})` : line.nombre).join(' + '),
    total: total > 0 ? String(total) : ''};
}

export const clientReservation = (defaults, client, date) => ({...defaults, fecha: date,
  cliente: client.nombre || client.cliente || '', telefono: client.telefono || '',
  email: client.email || '', ruc: client.ruc || ''});
