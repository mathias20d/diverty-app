import {test} from 'node:test';
import assert from 'node:assert/strict';
import {paymentAmount,paymentPatch,paymentSummary,recordPayment} from '../src/payments.mjs';
const op={id:'p-1',monto:25.15,fecha:'2026-10-10',createdAt:'2026-10-10T15:00:00Z',metodo:'Yappy'};
test('accepts comma decimal input and rejects non-money amounts',()=>{
 assert.equal(paymentAmount('25,15'),25.15);
 for(const value of ['',0,-1,'NaN','0.001','25.159'])assert.throws(()=>paymentAmount(value),/INVALID_PAYMENT/);
});
test('appends payment without changing contracted price or other financial records',()=>{
 const old={total:100,abono:10.1,_rev:4,pagosItems:[{id:'old',monto:10.1}],gastos:[{monto:5}],subcontratos:[{costo:20}]};
 const saved={...old,...paymentPatch(old,op)};
 assert.equal(saved.total,100);assert.equal(saved.abono,35.25);assert.equal(saved._rev,5);assert.equal(saved.pagosItems.length,2);
 assert.deepEqual(saved.gastos,old.gastos);assert.deepEqual(saved.subcontratos,old.subcontratos);assert.equal(saved.pagosItems[1].metodo,'Yappy');
});
test('remaining balance uses integer cents and legacy received total',()=>{
 assert.deepEqual(paymentSummary({total:.3,abono:.1}),{total:.3,received:.1,balance:.2});
 assert.equal(paymentPatch({total:100,abono:50},op).abono,75.15);
 assert.throws(()=>paymentPatch({total:100,abono:90},op),/PAYMENT_EXCEEDS_BALANCE/);
});
test('same operation is safe to retry after lost acknowledgement',()=>{
 const saved={total:100,...paymentPatch({total:100,abono:0},op)};
 assert.equal(paymentPatch(saved,op),null);
 assert.throws(()=>paymentPatch(saved,{...op,monto:20}),/PAYMENT_CONFLICT/);
});
test('transaction reads updated balance and merges only payment fields',async()=>{
 let current={total:100,abono:60,pagosItems:[],_rev:2},writes=0;
 const ref={id:'e'};
 const transaction=async(_,callback)=>callback({get:async actual=>{assert.equal(actual,ref);return {exists:()=>true,data:()=>current};},set:(actual,patch,options)=>{assert.equal(actual,ref);assert.deepEqual(options,{merge:true});current={...current,...patch};writes++;}});
 const args={runTransaction:transaction,db:{},ref,operation:op};
 await recordPayment(args);await recordPayment(args);assert.equal(writes,1);assert.equal(current.abono,85.15);
 await assert.rejects(recordPayment({...args,operation:{...op,id:'p-2',monto:20}}),/PAYMENT_EXCEEDS_BALANCE/);
 assert.equal(writes,1);
});
test('does not create a reservation when recording payment for a removed event',async()=>{
 await assert.rejects(recordPayment({runTransaction:async(_,cb)=>cb({get:async()=>({exists:()=>false}),set:()=>assert.fail('Unexpected write')}),db:{},ref:{},operation:op}),/EVENT_NOT_FOUND/);
});
