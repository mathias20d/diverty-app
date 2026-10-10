const cents=value=>Math.round(Number(value)*100);
export function paymentAmount(input){
 const value=Number(String(input).trim().replace(',','.'));
 if(!Number.isFinite(value)||value<=0||cents(value)<=0||Math.abs(value*100-cents(value))>0.000001)throw new Error('INVALID_PAYMENT');
 return cents(value)/100;
}
export function paymentSummary(event){
 const total=Number(event.total),received=Number(event.abono??0);
 if(!Number.isFinite(total)||total<0||!Number.isFinite(received)||received<0)throw new Error('INVALID_FINANCES');
 return {total:cents(total)/100,received:cents(received)/100,balance:Math.max(0,cents(total)-cents(received))/100};
}
export function paymentPatch(current,operation){
 const summary=paymentSummary(current);
 const payments=Array.isArray(current.pagosItems)?current.pagosItems:[];
 const existing=payments.find(p=>p.id===operation.id);
 if(existing){if(cents(existing.monto)!==cents(operation.monto))throw new Error('PAYMENT_CONFLICT');return null;}
 const amount=paymentAmount(operation.monto);
 if(cents(amount)>cents(summary.balance))throw new Error('PAYMENT_EXCEEDS_BALANCE');
 return {abono:(cents(summary.received)+cents(amount))/100,pagosItems:[...payments,{id:operation.id,monto:amount,fecha:operation.fecha,createdAt:operation.createdAt,origen:'abono_native',metodo:operation.metodo||'Otro'}],_rev:(Number(current._rev)||0)+1,updatedAt:operation.createdAt};
}
export async function recordPayment({runTransaction,db,ref,operation}){
 return runTransaction(db,async tx=>{
  const snap=await tx.get(ref);
  if(!snap.exists())throw new Error('EVENT_NOT_FOUND');
  const current=snap.data(),patch=paymentPatch(current,operation);
  if(patch)tx.set(ref,patch,{merge:true});
  return {...current,...(patch||{})};
 });
}
