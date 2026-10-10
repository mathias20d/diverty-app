import {escapeHTML as esc, companyDetails} from './documents.mjs';
import {providerServices, providerCost} from './providers.mjs';
import {PROVIDER_CONTRACT_CLAUSES} from './domain/provider-contract-clauses.mjs';

export function providerDocumentData(provider, event) {
  const lines = event ? (event.subcontratos || []).filter(row => row?.proveedorId === provider.id).map(row => ({nombre:row.servicio || 'Servicio', costo:providerCost(row.costo)})) : providerServices(provider).map(row => ({nombre:row.nombre, costo:providerCost(row.costo)}));
  if (event && !lines.length) throw new Error('NO_ASSIGNED_SERVICES');
  return {lines, total:lines.reduce((sum,row) => sum + Math.round(row.costo*100),0)/100};
}

export async function ensureProviderNumber({runTransaction,db,providerRef,eventRef,counterRef,providerId,now}) {
  return runTransaction(db, async tx => {
    const providerSnap = await tx.get(providerRef);
    if (!providerSnap.exists()) throw new Error('PROVIDER_NOT_FOUND');
    const provider = {...providerSnap.data(),id:providerId};
    const eventSnap = eventRef ? await tx.get(eventRef) : null;
    if (eventRef && (!eventSnap.exists() || eventSnap.data().deletedLocally)) throw new Error('EVENT_NOT_FOUND');
    const event = eventSnap?.data();
    providerDocumentData(provider,event);
    const assigned = event?.subcontratos.filter(row => row?.proveedorId === providerId);
    const numbers = [...new Set(assigned?.map(row => String(row.numeroSubcontratoEvento || '').trim()).filter(Boolean) || [])];
    if (numbers.length > 1) throw new Error('CONFLICTING_NUMBERS');
    let number = event ? numbers[0] : provider.numeroSubcontrato;
    if (!number) {
      const counter = await tx.get(counterRef);
      if (!counter.exists()) throw new Error('COUNTER_NOT_READY');
      const last = Number(counter.data().ultimo);
      if (!Number.isSafeInteger(last) || last < 0 || !Number.isSafeInteger(last+1)) throw new Error('INVALID_DOCUMENT_COUNTER');
      number = `SUB-${String(last+1).padStart(5,'0')}`;
      tx.set(counterRef,{ultimo:last+1},{merge:true});
    }
    if (event) {
      if (assigned.some(row => row.numeroSubcontratoEvento !== number)) {
        const patch = {subcontratos:event.subcontratos.map(row => row?.proveedorId === providerId ? {...row,numeroSubcontratoEvento:number} : row),updatedAt:now,_rev:(Number(event._rev)||0)+1};
        tx.set(eventRef,patch,{merge:true});
        Object.assign(event,patch);
      }
    } else if (provider.numeroSubcontrato !== number) {
      tx.set(providerRef,{numeroSubcontrato:number,updatedAt:now},{merge:true});
    }
    return {provider,event,number};
  });
}

export function providerDocumentHTML(provider,event,number,company) {
  const saved = companyDetails(company), {lines,total} = providerDocumentData(provider,event);
  const money = value => `B/. ${value.toFixed(2)}`;
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><style>
  @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#334155;font-size:10px}header{background:linear-gradient(120deg,#7657ff,#c257bd);color:white;padding:20px;border-radius:14px;margin-bottom:16px}h1{font-size:20px;margin:0 0 8px}h2{font-size:11px;color:#7657ff}p{line-height:1.4;overflow-wrap:anywhere}.grid{display:grid;grid-template-columns:1.35fr .85fr;gap:14px}.card{border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:14px;break-inside:avoid}.dark{background:#0f172a;color:white}table{width:100%;border-collapse:collapse}th,td{padding:9px;border-bottom:1px solid #eee;text-align:left}td:last-child,th:last-child{text-align:right}.clauses{display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:9px}.clauses p{margin:0;break-inside:avoid}.signature{height:45px;border-bottom:1px solid #94a3b8}footer{font-size:9px;color:#64748b}</style></head><body>
  <header><h1>${event?'SUBCONTRATO DEL EVENTO':'ACUERDO MARCO DE PROVEEDOR'}</h1><b>${esc(number)}</b><p>${esc(saved.nombre)} · ${esc(saved.telefono)} · ${esc(saved.email)}</p></header>
  <div class="grid"><section class="card"><h2>Proveedor / contratista independiente</h2><h1>${esc(provider.nombre)}</h1><p>WhatsApp: ${esc(provider.telefono)}<br>ID / RUC: ${esc(provider.identificacion || provider.ruc)}<br>Correo: ${esc(provider.email)}<br>Dirección: ${esc(provider.direccion)}</p></section><section class="card dark">${event?`<b>Asignación específica</b><p>${esc(event.cliente)}<br>Fecha: ${esc(event.fecha)}<br>Hora: ${esc(event.hora)}<br>Ubicación: ${esc(event.ubicacion || 'Por definir')}</p><b>Total proveedor: ${money(total)}</b>`:'<b>Contrato marco de servicios</b><p>Acuerdo general para futuras asignaciones independientes. Las tarifas listadas corresponden al perfil del proveedor y no representan una reserva concreta.</p>'}</section></div>
  <section class="card"><h2>${event?'Servicios seleccionados para este evento':'Servicios y tarifas del proveedor'}</h2><table><thead><tr><th>Servicio</th><th>${event?'Monto acordado':'Tarifa base'}</th></tr></thead><tbody>${lines.map(row=>`<tr><td>${esc(row.nombre)}</td><td>${row.costo>0?money(row.costo):'Por acordar'}</td></tr>`).join('')}</tbody>${event?`<tfoot><tr><th>Total a pagar</th><th>${money(total)}</th></tr></tfoot>`:''}</table></section>
  <div class="grid"><section><h2>Condiciones del subcontrato</h2><div class="clauses">${PROVIDER_CONTRACT_CLAUSES.map(row=>`<p><b>${esc(row.title)}</b> ${esc(row.text)}</p>`).join('')}</div></section><section><div class="card"><h2>Condición de pago</h2><p>${esc(provider.condicionesPago || 'Pago contra prestación satisfactoria del servicio.')}</p></div><div class="card"><h2>Coordinación</h2><p>Cada evento podrá incluir instrucciones adicionales de horario, contacto, ubicación, uniforme, materiales o protocolo operativo.</p></div><div class="card">Firma Diverty<div class="signature"></div>${esc(saved.nombreTitular)}</div><div class="card">Firma proveedor<div class="signature"></div>${esc(provider.nombre)}</div></section></div>
  <footer><p>${event?'Este subcontrato corresponde exclusivamente a los servicios seleccionados para el evento indicado. Cualquier servicio adicional deberá acordarse y registrarse por separado.':'Documento marco de coordinación de servicios. Las condiciones particulares de cada evento prevalecen cuando hayan sido aceptadas expresamente por ambas partes.'}</p></footer></body></html>`;
}
