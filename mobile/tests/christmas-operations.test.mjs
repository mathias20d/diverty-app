import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {christmasInsertionPlan,christmasLeg} from '../src/domain/christmas-route.mjs';
import {assignSanta,changeChristmasDelivery,christmasSummary,deleteChristmasReservation,santaRouteUrl,santaConflict} from '../src/christmas-operations.mjs';
const event={id:'e',cliente:'Cliente',fecha:'2026-12-24',hora:'14:00',estado:'Confirmado',esNavidad:true,santaAsignado:'Santa 1',total:100,abono:20,gastos:10,pagosItems:[{id:'payment'}],subcontratos:[{id:'provider'}],_rev:2};
test('route motor retains exact web service and travel rules',()=>{
 const web=readFileSync(new URL('../../src/App.jsx',import.meta.url),'utf8');const start=web.indexOf('const CHRISTMAS_SERVICE_BUFFER_MINUTES'),end=web.indexOf('const publicSlot =',start);
 const native=readFileSync(new URL('../src/domain/christmas-route.mjs',import.meta.url),'utf8');assert.ok(native.includes(web.slice(start,end)));
 assert.equal(christmasLeg(event,event).minutes,15);
 assert.equal(christmasInsertionPlan(event,[{...event,id:'other',hora:'14:30'}]).feasible,false);
 assert.equal(christmasInsertionPlan(event,[{...event,id:'other',hora:'14:45'}]).feasible,true);
});
test('operation groups preserve disabled Santa assignments, hide requests and route pending visits on one date only',()=>{
 const next={...event,id:'next',hora:'15:00',direccion:'PH A & B',santaAsignado:'Santa 2'},tomorrow={...next,id:'tomorrow',fecha:'2026-12-25'},done={...event,id:'done',hora:'13:00',estado:'Completado'},request={...event,id:'request',origen:'Web Directa',estado:'Pendiente'};
 const summary=christmasSummary([event,next,tomorrow,done,request,{...event,id:'cancel',estado:'Cancelado'}],1,'24');assert.equal(summary.pending,2);assert.equal(summary.completed,1);assert.equal(summary.requests.length,1);assert.ok(summary.groups.some(row=>row.name==='Santa 2'));assert.equal(summary.groups[0].next.id,'e');assert.equal(summary.all.length,4);
 const route=santaRouteUrl([done,{...event,direccion:'Primera'},next,tomorrow]);assert.equal(new URL(route).searchParams.get('destination'),'PH A & B');assert.equal(new URL(route).searchParams.get('waypoints'),'Primera');assert.ok(!route.includes('tomorrow'));
 assert.equal(santaConflict({...event,santaAsignado:''},[]),true);assert.equal(santaConflict(done,[]),false);
});
function fixture(input=event){
 const records=new Map([['event',structuredClone(input)],['config',{capacidadSanta:2}]]),writes=[];
 const runTransaction=async(db,fn)=>{const queued=[];const result=await fn({get:async ref=>{const key=typeof ref==='string'?ref:ref.key;return {exists:()=>records.has(key),data:()=>structuredClone(records.get(key))};},set:(ref,patch)=>queued.push(['set',ref,patch]),delete:ref=>queued.push(['delete',ref])});for(const [kind,ref,patch] of queued){writes.push([kind,ref,patch]);if(kind==='delete')records.delete(ref);else records.set(ref,{...records.get(ref),...patch});}return result;};
 return {records,writes,args:{runTransaction,db:{},ref:'event',event,now:'2026-12-24T20:00:00Z',configRef:'config',otherRefs:[]}};
}
test('delivery and reopening preserve costs and payments, are idempotent and reject stale changes',async()=>{
 const {records,writes,args}=fixture();const completed=await changeChristmasDelivery({...args,complete:true});assert.equal(completed.estado,'Completado');assert.equal(completed.entregaNavidadRealizadaAt,args.now);assert.deepEqual(completed.pagosItems,event.pagosItems);assert.deepEqual(completed.subcontratos,event.subcontratos);assert.equal(completed.abono,20);await changeChristmasDelivery({...args,complete:true});assert.equal(writes.length,1);
 await assert.rejects(changeChristmasDelivery({...args,complete:false}),/EVENT_CHANGED/);await changeChristmasDelivery({...args,event:completed,complete:false});assert.equal(records.get('event').estado,'Confirmado');assert.equal(records.get('event').entregaNavidadRealizadaAt,'');
 const missing=fixture();missing.records.delete('event');await assert.rejects(changeChristmasDelivery({...missing.args,complete:true}),/EVENT_NOT_FOUND/);
});
test('Santa reassignment validates live capacity and route conflict before committing; override is explicit',async()=>{
 const {records,writes,args}=fixture();records.set('other',{...event,id:'other',hora:'14:30',santaAsignado:'Santa 2'});args.otherRefs=[{key:'other',id:'other'}];await assert.rejects(assignSanta({...args,santa:'Santa 3'}),/SANTA_UNAVAILABLE/);await assert.rejects(assignSanta({...args,santa:'Santa 2'}),/SANTA_CONFLICT/);assert.equal(writes.length,0);
 const saved=await assignSanta({...args,santa:'Santa 2',allowConflict:true});assert.equal(saved.santaAsignado,'Santa 2');assert.equal(saved.total,event.total);await assignSanta({...args,santa:'Santa 2'});assert.equal(writes.length,1);
});
test('deleting a Christmas reservation rejects a stale confirmation and is safe to retry',async()=>{
 const {records,writes,args}=fixture();await assert.rejects(deleteChristmasReservation({...args,event:{...event,_rev:1}}),/EVENT_CHANGED/);assert.equal(writes.length,0);await deleteChristmasReservation(args);assert.equal(records.has('event'),false);await deleteChristmasReservation(args);assert.equal(writes.length,1);
 const inactive=fixture({...event,estado:'Cancelado'});await assert.rejects(deleteChristmasReservation(inactive.args),/NOT_ACTIVE_CHRISTMAS/);
});
