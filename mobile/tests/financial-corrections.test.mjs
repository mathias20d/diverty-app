import test from 'node:test';
import assert from 'node:assert/strict';
import {correctionAmount,correctionPatch,recordCorrection} from '../src/financial-corrections.mjs';
const event={total:100,abono:40,gastos:50,subcontratos:[{costo:30,pagado:true}],pagosItems:[{id:'old',monto:40}],gastosItems:[{id:'old-expense',monto:20}],_rev:3};
const operation={id:'fix-1',kind:'received',amount:0,revision:3,createdAt:'2026-10-10T12:00:00Z'};
test('received correction allows zero preserves contracted price and item history',()=>{
 const patch=correctionPatch(event,operation),saved={...event,...patch};assert.equal(saved.total,100);assert.equal(saved.abono,0);assert.deepEqual(saved.pagosItems,event.pagosItems);assert.deepEqual(saved.subcontratos,event.subcontratos);assert.equal(saved._rev,4);assert.equal(saved.ajustesFinancieros[0].abonoAnterior,40);
 assert.throws(()=>correctionPatch(event,{...operation,amount:101}),/RECEIVED_EXCEEDS_TOTAL/);
 for(const value of ['', '-1','1.001','Infinity'])assert.throws(()=>correctionAmount(value));assert.equal(correctionAmount('12,25'),12.25);
});
test('legacy expense correction separates providers exactly once and retains individual records',()=>{
 const patch=correctionPatch(event,{...operation,kind:'internal',amount:10}),saved={...event,...patch};assert.equal(patch.ajustesFinancieros[0].gastosAnteriores,20);assert.equal(saved.gastos,10);assert.equal(saved.costosSeparados,true);assert.deepEqual(saved.gastosItems,event.gastosItems);assert.equal(saved.abono,40);assert.deepEqual(saved.subcontratos,event.subcontratos);
});
test('retry after lost acknowledgement is idempotent even if later payments changed the reservation',()=>{
 const saved={...event,...correctionPatch(event,operation)};assert.equal(correctionPatch({...saved,abono:25,_rev:5},operation),null);assert.throws(()=>correctionPatch(saved,{...operation,amount:1}),/CORRECTION_CONFLICT/);assert.throws(()=>correctionPatch({...event,_rev:4},operation),/EDIT_CONFLICT/);
});
test('transaction reads fresh data rejects deleted events and writes only correction fields',async()=>{
 let current=event,writes=0;const runTransaction=async(_,fn)=>fn({get:async()=>({exists:()=>!!current,data:()=>current}),set:(_,patch,options)=>{assert.deepEqual(options,{merge:true});assert.ok(!('total' in patch));current={...current,...patch};writes++;}});
 await recordCorrection({runTransaction,operation});await recordCorrection({runTransaction,operation});assert.equal(writes,1);current=null;await assert.rejects(recordCorrection({runTransaction,operation}),/EVENT_NOT_FOUND/);
});
