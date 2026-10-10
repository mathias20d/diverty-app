import { expenseSummary } from './expenses.mjs';
export function providerCost(value) {
  const amount = Number(String(value ?? '').trim().replace(',', '.'));
  if (String(value ?? '').trim() === '' || !Number.isFinite(amount) || amount < 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) throw new Error('INVALID_PROVIDER_COST');
  return Math.round(amount * 100) / 100;
}
export function providerServices(provider) {
  if (Array.isArray(provider.servicios) && provider.servicios.length) return provider.servicios.filter(Boolean);
  return provider.especialidad ? [{
    id: 'srv-legacy',
    nombre: provider.especialidad,
    costo: provider.costoBase ?? 0,
    activo: true
  }] : [];
}
export function providerDraft(input) {
  const nombre = String(input.nombre || '').trim();
  if (!nombre) throw new Error('PROVIDER_NAME_REQUIRED');
  const servicios = providerServices(input).map(item => {
    if (!item.id || !String(item.nombre || '').trim()) throw new Error('SERVICE_NAME_REQUIRED');
    return {
      ...item,
      nombre: String(item.nombre).trim(),
      costo: providerCost(item.costo),
      activo: item.activo !== false
    };
  });
  if (new Set(servicios.map(item => item.id)).size !== servicios.length) throw new Error('INVALID_PROVIDER');
  const fields = ['telefono', 'email', 'identificacion', 'direccion', 'especialidad', 'condicionesPago'];
  return {
    nombre,
    ...Object.fromEntries(fields.map(key => [key, String(input[key] || '').trim()])),
    costoBase: providerCost(input.costoBase ?? 0),
    activo: input.activo !== false,
    servicios
  };
}
export const providerVersion = provider => JSON.stringify([provider?.updatedAt ?? null, provider?._rev ?? null]);
export async function saveProvider({
  runTransaction,
  db,
  ref,
  draft,
  original,
  operationId,
  now
}) {
  const patch = providerDraft(draft);
  return runTransaction(db, async tx => {
    const snap = await tx.get(ref),
      current = snap.exists() ? snap.data() : null;
    if (current?._nativeSaveId === operationId) return current;
    if (original ? !current || providerVersion(current) !== providerVersion(original) : !!current) throw new Error('PROVIDER_CHANGED');
    const saved = {
      ...patch,
      _nativeSaveId: operationId,
      updatedAt: now,
      _rev: (Number(current?._rev) || 0) + 1
    };
    tx.set(ref, saved, {
      merge: true
    });
    return {
      ...current,
      ...saved
    };
  });
}
export function assignmentOperation(input) {
  if (!input.id || !input.proveedorId || !input.servicioId || !input.createdAt) throw new Error('INVALID_ASSIGNMENT');
  return {
    id: input.id,
    proveedorId: input.proveedorId,
    servicioId: input.servicioId,
    costo: providerCost(input.costo),
    createdAt: input.createdAt
  };
}
export function assignmentPatch(current, provider, input) {
  const operation = assignmentOperation(input),
    items = Array.isArray(current.subcontratos) ? current.subcontratos : [];
  const existing = items.find(item => item?.id === operation.id);
  if (existing) {
    if (existing.proveedorId !== operation.proveedorId || existing.servicioId !== operation.servicioId || Number(existing.costo) !== operation.costo) throw new Error('ASSIGNMENT_CONFLICT');
    return null;
  }
  const service = providerServices(provider).find(item => item.id === operation.servicioId && item.activo !== false);
  if (provider.activo === false || !service) throw new Error('PROVIDER_UNAVAILABLE');
  return {
    subcontratos: [...items, {
      ...operation,
      nombre: provider.nombre,
      servicio: service.nombre,
      estadoPago: 'pendiente',
      pagado: false
    }],
    gastos: expenseSummary(current).internal,
    costosSeparados: true,
    _rev: (Number(current._rev) || 0) + 1,
    updatedAt: operation.createdAt
  };
}
export async function assignProvider({
  runTransaction,
  db,
  ref,
  providerRef,
  operation
}) {
  return runTransaction(db, async tx => {
    const snap = await tx.get(ref),
      supplier = await tx.get(providerRef);
    if (!snap.exists() || snap.data().deletedLocally) throw new Error('EVENT_NOT_FOUND');
    // A confirmed retry remains valid even if the supplier was later deactivated.
    const current = snap.data(),
      existing = (Array.isArray(current.subcontratos) ? current.subcontratos : []).find(item => item?.id === operation.id);
    if (!supplier.exists() && !existing) throw new Error('PROVIDER_UNAVAILABLE');
    const patch = assignmentPatch(current, supplier.data() || {}, operation);
    if (patch) tx.set(ref, patch, {
      merge: true
    });
    return {
      ...current,
      ...(patch || {})
    };
  });
}
export const providerPaid = item => item.pagado === true || String(item.estadoPago || '').trim().toLowerCase() === 'pagado';
export async function markProviderPayment({
  runTransaction,
  db,
  ref,
  id,
  paid,
  now
}) {
  return runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists() || snap.data().deletedLocally) throw new Error('EVENT_NOT_FOUND');
    const current = snap.data(),
      items = Array.isArray(current.subcontratos) ? current.subcontratos : [];
    const item = items.find(item => item?.id === id);
    if (!item) throw new Error('ASSIGNMENT_NOT_FOUND');
    if (providerPaid(item) === paid) return current;
    const patch = {
      subcontratos: items.map(item => item?.id === id ? {
        ...item,
        pagado: paid,
        estadoPago: paid ? 'pagado' : 'pendiente'
      } : item),
      updatedAt: now,
      _rev: (Number(current._rev) || 0) + 1
    };
    tx.set(ref, patch, {
      merge: true
    });
    return {
      ...current,
      ...patch
    };
  });
}
