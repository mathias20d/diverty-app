const text = value => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
const key = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
const lines = value => Array.isArray(value) ? value.flatMap(lines) : text(value).split(/\r?\n/).map(line => line.replace(/^[•\-–—*]\s*/, '').trim()).filter(Boolean);

// Same fields shown by the public catalogue. Copy at selection time so later
// catalogue edits never change an already agreed reservation.
export function catalogDescription(item = {}) {
  const description = text(item.descripcionCompleta || item.descripcion);
  const includes = [...new Map(lines([item.serviciosLista, item.incluye]).map(line => [key(line), line])).values()];
  const existing = new Set(lines(description).map(key));
  const missing = includes.filter(line => !existing.has(key(line)));
  return { descripcion: [description, missing.length ? `Todo lo que incluye:\n${missing.map(line => `• ${line}`).join('\n')}` : ''].filter(Boolean).join('\n\n'), incluye: includes };
}

export function manualCatalog(custom = [], web = []) {
  const items = new Map();
  for (const item of [...custom, ...web]) {
    if (!item || !key(item.nombre)) continue;
    items.set(key(item.nombre), { ...item, ...catalogDescription(item) });
  }
  return [...items.values()];
}
