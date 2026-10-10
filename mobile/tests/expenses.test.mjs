import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expenseOperation,expensePatch,expenseSummary,recordExpense} from '../src/expenses.mjs';

const operation={id:'gas-1',monto:20.15,categoria:'personal',detalle:'Animador',fecha:'2026-10-10',createdAt:'2026-10-10T15:00:00Z'};

test('legacy costs include suppliers and are separated only once',()=>{
 const old={total:200,gastos:100,subcontratos:[{costo:30}]};
 assert.deepEqual(expenseSummary(old),{internal:70,providers:30,total:100,profit:100});
 const saved={...old,...expensePatch(old,operation)};
 assert.equal(saved.gastos,90.15);
 assert.equal(saved.costosSeparados,true);
 assert.deepEqual(expenseSummary(saved),{internal:90.15,providers:30,total:120.15,profit:79.85});
 assert.equal(expensePatch(saved,{...operation,id:'gas-2',monto:10}).gastos,100.15);
});

test('separated costs preserve old unitemized expenses and supplier records',()=>{
 const old={total:200,abono:50,gastos:70,costosSeparados:true,subcontratos:[{costo:30}],pagosItems:[{id:'p-1',monto:50}],detalleGastos:'Gasto antiguo',_rev:5};
 const patch=expensePatch(old,operation),saved={...old,...patch};
 assert.equal(saved.gastos,90.15);
 assert.equal(saved._rev,6);
 assert.equal(saved.gastosItems.length,1);
 assert.equal(saved.detalleGastos,'Gasto antiguo\n2026-10-10 · Personal / animadores: $20.15 · Animador');
 assert.deepEqual(saved.subcontratos,old.subcontratos);
 assert.deepEqual(saved.pagosItems,old.pagosItems);
 assert.equal(saved.abono,50);
 assert.equal(saved.total,200);
 for(const field of ['total','abono','subcontratos','pagosItems','estado'])assert.equal(Object.hasOwn(patch,field),false);
});

test('expense validation accepts comma decimals and rejects invalid input',()=>{
 assert.equal(expenseOperation({...operation,monto:'20,15',detalle:' Animador '}).monto,20.15);
 assert.equal(expenseOperation({...operation,detalle:' Animador '}).detalle,'Animador');
 for(const monto of ['',0,-1,'abc','20.159'])assert.throws(()=>expenseOperation({...operation,monto}),/INVALID_EXPENSE/);
 assert.throws(()=>expenseOperation({...operation,categoria:'inexistente'}),/INVALID_EXPENSE/);
 assert.throws(()=>expenseOperation({...operation,fecha:'2026-02-30'}),/INVALID_EXPENSE/);
 assert.throws(()=>expenseOperation({...operation,id:''}),/INVALID_EXPENSE/);
});

test('expense can exceed reservation price and retain a negative estimated profit',()=>{
 const old={total:10,gastos:0,costosSeparados:true};
 assert.deepEqual(expenseSummary({...old,...expensePatch(old,operation)}),{internal:20.15,providers:0,total:20.15,profit:-10.15});
});

test('same expense retries safely and conflicting reuse of its ID is rejected',()=>{
 const saved={total:200,...expensePatch({total:200,gastos:0},operation)};
 assert.equal(expensePatch(saved,operation),null);
 for(const change of [{monto:10},{categoria:'otros'},{detalle:'Otro detalle'},{fecha:'2026-10-11'}])assert.throws(()=>expensePatch(saved,{...operation,...change}),/EXPENSE_CONFLICT/);
});

test('transaction reads latest costs, preserves payments, and deduplicates lost acknowledgement',async()=>{
 let current={total:200,gastos:50,costosSeparados:true,gastosItems:[{id:'remote',monto:10}],abono:75,pagosItems:[{id:'remote-payment',monto:75}],subcontratos:[{costo:30}],_rev:9},writes=0;
 const ref={id:'event'};
 const transaction=async(_,callback)=>callback({
  get:async actual=>{assert.equal(actual,ref);return {exists:()=>true,data:()=>current};},
  set:(actual,patch,options)=>{assert.equal(actual,ref);assert.deepEqual(options,{merge:true});current={...current,...patch};writes++;}
 });
 const args={runTransaction:transaction,db:{},ref,operation};
 const saved=await recordExpense(args);
 await recordExpense(args);
 assert.equal(writes,1);
 assert.equal(saved.gastos,70.15);
 assert.equal(current._rev,10);
 assert.equal(current.gastosItems.length,2);
 assert.equal(current.abono,75);
 assert.deepEqual(current.pagosItems,[{id:'remote-payment',monto:75}]);
 assert.deepEqual(current.subcontratos,[{costo:30}]);
});

test('recording expense does not recreate a deleted reservation',async()=>{
 await assert.rejects(recordExpense({runTransaction:async(_,callback)=>callback({get:async()=>({exists:()=>false}),set:()=>assert.fail('Unexpected write')}),db:{},ref:{},operation}),/EVENT_NOT_FOUND/);
});
