import {paymentAmount} from './payments.mjs';
import {validDate} from './domain/date-availability.mjs';
export const EXPENSE_CATEGORIES=[{id:'personal',label:'Personal / animadores'},{id:'transporte',label:'Transporte'},{id:'globos',label:'Adicionales / materiales'},{id:'otros',label:'Otro gasto'}];
const number=value=>{if(value==null||value==='')return 0;const result=typeof value==='number'?value:parseFloat(String(value).replace(/[^0-9.-]/g,''));if(!Number.isFinite(result))throw new Error('INVALID_COSTS');return result;};
const cents=value=>Math.round(value*100);
export function expenseSummary(event){
 const stored=number(event.gastos),providers=(Array.isArray(event.subcontratos)?event.subcontratos:[]).reduce((sum,line)=>sum+cents(number(line.costo)),0);
 const internal=event.costosSeparados===true?cents(stored):Math.max(0,cents(stored)-providers);
 if(internal<0||providers<0)throw new Error('INVALID_COSTS');
 return {internal:internal/100,providers:providers/100,total:(internal+providers)/100,profit:(cents(number(event.total))-internal-providers)/100};
}
export function expenseOperation({id,monto,categoria,detalle,fecha,createdAt}){
 let amount;try{amount=paymentAmount(monto);}catch{throw new Error('INVALID_EXPENSE');}
 if(!EXPENSE_CATEGORIES.some(c=>c.id===categoria)||!validDate(fecha)||!id||!createdAt)throw new Error('INVALID_EXPENSE');
 return {id,monto:amount,categoria,detalle:String(detalle||'').trim(),fecha,createdAt};
}
export function expensePatch(current,input){
 const operation=expenseOperation(input),items=Array.isArray(current.gastosItems)?current.gastosItems:[];
 const existing=items.find(item=>item?.id===operation.id);
 if(existing){if(cents(number(existing.monto))!==cents(operation.monto)||existing.categoria!==operation.categoria||String(existing.detalle||'')!==operation.detalle||existing.fecha!==operation.fecha)throw new Error('EXPENSE_CONFLICT');return null;}
 const base=expenseSummary(current).internal;
 const label=EXPENSE_CATEGORIES.find(c=>c.id===operation.categoria).label;
 const detail=`${operation.fecha} · ${label}: $${operation.monto.toFixed(2)}${operation.detalle?` · ${operation.detalle}`:''}`;
 return {gastos:(cents(base)+cents(operation.monto))/100,gastosItems:[...items,operation],detalleGastos:[String(current.detalleGastos||'').trim(),detail].filter(Boolean).join('\n'),costosSeparados:true,_rev:(Number(current._rev)||0)+1,updatedAt:operation.createdAt};
}
export async function recordExpense({runTransaction,db,ref,operation}){
 return runTransaction(db,async tx=>{const snap=await tx.get(ref);if(!snap.exists())throw new Error('EVENT_NOT_FOUND');const current=snap.data(),patch=expensePatch(current,operation);if(patch)tx.set(ref,patch,{merge:true});return {...current,...(patch||{})};});
}
