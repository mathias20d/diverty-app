import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextOperationalState,operationalLabel,transitionOperationalStatus} from '../src/operational-status.mjs';
const event={id:'e',estado:'Pendiente',_rev:1,total:100,abono:20,gastos:10,pagosItems:[{id:'pay'}],subcontratos:[{id:'provider'}]};
function fixture(input=event){let current=structuredClone(input),writes=0;const runTransaction=async(_,fn)=>fn({get:async()=>({exists:()=>!!current,data:()=>current}),set:(_,patch)=>{current={...current,...patch};writes++;}});return {args:{runTransaction,db:{},ref:{},event,now:'test-time'},get:()=>current,writes:()=>writes};}
test('operational progression records web timestamps and preserves financial history on every stage',async()=>{
 const f=fixture();assert.equal(operationalLabel('En camino'),'Ya llegamos');
 for(const [target,field] of [['Confirmado','confirmedAt'],['Preparando','preparingAt'],['En camino','enCaminoAt'],['En el evento','enEventoAt'],['Completado','completedAt']]){const opened=f.get();assert.equal(nextOperationalState(opened.estado),target);await transitionOperationalStatus({...f.args,event:opened,target});assert.equal(f.get()[field],'test-time');assert.equal(f.get().abono,20);assert.deepEqual(f.get().pagosItems,event.pagosItems);assert.deepEqual(f.get().subcontratos,event.subcontratos);}
 assert.equal(nextOperationalState('Completado'),null);assert.equal(f.writes(),5);await transitionOperationalStatus({...f.args,target:'Completado'});assert.equal(f.writes(),5);
 await transitionOperationalStatus({...f.args,event:f.get(),target:'Cancelado'});assert.equal(f.get().cancelledAt,'test-time');assert.equal(f.get().gastos,10);
});
test('stale, missing, special and skipped transitions cannot mutate a reservation',async()=>{
 for(const input of [null,{...event,_rev:2},{...event,esNavidad:true},{...event,origen:'Web Directa'},{...event,estado:'Cotización'},{...event,estado:'Cancelado'}]){const f=fixture(input);await assert.rejects(transitionOperationalStatus({...f.args,target:'Preparando'}));assert.equal(f.writes(),0);}
 const f=fixture();await assert.rejects(transitionOperationalStatus({...f.args,target:null}),/INVALID_STATUS_TRANSITION/);await assert.rejects(transitionOperationalStatus({...f.args,target:'Completado'}),/INVALID_STATUS_TRANSITION/);assert.equal(f.writes(),0);
});
