import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canConvertQuote,deleteReservation} from '../src/reservation-management.mjs';
import {searchEvents} from '../src/workspace-data.mjs';
test('quote filter and conversion eligibility preserve approved quotes and exclude special flows',()=>{
 const quotes=[{id:'q',estado:'Cotización'},{id:'a',estado:'Cot. Aprobada'}];
 assert.deepEqual(searchEvents([...quotes,{id:'r',estado:'Pendiente'}],'','cotizaciones').map(e=>e.id).sort(),['a','q']);
 for(const event of quotes)assert.equal(canConvertQuote(event),true);
 for(const event of [{estado:'Pendiente'},{estado:'Cotización',deletedLocally:true},{estado:'Cotización',esNavidad:true},{estado:'Cotización',centralBookingVersion:1}])assert.equal(canConvertQuote(event),false);
});
test('deletion rejects stale confirmations and special flows, and missing rows are safe to retry',async()=>{
 let row={_rev:3,estado:'Pendiente'},deleted=0;
 const runTransaction=async(db,fn)=>fn({get:async()=>({exists:()=>!!row,data:()=>row}),delete:()=>{deleted++;row=null;}});
 const options={runTransaction,db:{},ref:{},event:{_rev:2}};
 await assert.rejects(deleteReservation(options),/EVENT_CHANGED/);assert.equal(deleted,0);
 row={_rev:2,origen:'Web Directa',estado:'Pendiente'};await assert.rejects(deleteReservation(options),/SPECIAL_RESERVATION/);assert.equal(deleted,0);
 row={_rev:2,estado:'Cotización'};await deleteReservation(options);await deleteReservation(options);assert.equal(deleted,1);
});
