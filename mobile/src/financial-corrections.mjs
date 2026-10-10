import {paymentSummary} from './payments.mjs';
import {expenseSummary} from './expenses.mjs';
export function correctionAmount(input){
 const text=String(input??'').trim().replace(',','.');
 if(!/^\d+(\.\d{1,2})?$/.test(text)||!Number.isSafeInteger(Math.round(Number(text)*100)))throw new Error('INVALID_CORRECTION');
 return Math.round(Number(text)*100)/100;
}
export function correctionPatch(current,operation){
 if(!current||current.deletedLocally)throw new Error('EVENT_NOT_FOUND');
 const amount=correctionAmount(operation.amount);
 if(!operation.id||!operation.createdAt||!['received','internal'].includes(operation.kind))throw new Error('INVALID_CORRECTION');
 const history=Array.isArray(current.ajustesFinancieros)?current.ajustesFinancieros:[],existing=history.find(item=>item?.id===operation.id);
 if(existing){if(existing.tipo!==operation.kind||existing.montoNuevo!==amount)throw new Error('CORRECTION_CONFLICT');return null;}
 if(Number(current._rev||0)!==Number(operation.revision||0))throw new Error('EDIT_CONFLICT');
 const financial=paymentSummary(current),entry={id:operation.id,tipo:operation.kind,montoNuevo:amount,createdAt:operation.createdAt};
 let patch;
 if(operation.kind==='received'){
  if(amount>financial.total)throw new Error('RECEIVED_EXCEEDS_TOTAL');
  patch={abono:amount};Object.assign(entry,{totalAnterior:financial.total,abonoAnterior:financial.received,totalNuevo:financial.total,abonoNuevo:amount,origen:'correccion_pago_recibido_app'});
 }else{
  const costs=expenseSummary(current);patch={gastos:amount,costosSeparados:true};Object.assign(entry,{gastosAnteriores:costs.internal,gastosNuevos:amount,origen:'correccion_gastos_internos_native'});
 }
 return {...patch,ajustesFinancieros:[...history,entry],_rev:Number(current._rev||0)+1,updatedAt:operation.createdAt};
}
export async function recordCorrection({runTransaction,db,ref,operation}){
 return runTransaction(db,async tx=>{const snap=await tx.get(ref);if(!snap.exists())throw new Error('EVENT_NOT_FOUND');const current=snap.data(),patch=correctionPatch(current,operation);if(patch)tx.set(ref,patch,{merge:true});return {...current,...patch};});
}
export const correctionMessages={INVALID_CORRECTION:'Ingresa un monto válido, desde cero y con hasta dos decimales.',EVENT_NOT_FOUND:'La reserva ya no existe.',EDIT_CONFLICT:'La reserva cambió. Carga los datos actualizados antes de corregir.',RECEIVED_EXCEEDS_TOTAL:'El recibido no puede superar el precio contratado.',CORRECTION_CONFLICT:'Esta corrección necesita revisión antes de continuar.',INVALID_FINANCES:'Los importes guardados necesitan revisión.',INVALID_COSTS:'Los gastos guardados necesitan revisión.'};
