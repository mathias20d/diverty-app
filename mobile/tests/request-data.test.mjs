import test from 'node:test';
import assert from 'node:assert/strict';
import {assertPending,assertReview,requestPatch} from '../src/request-data.mjs';
const event={estado:'Pendiente',origen:'Web Directa',_rev:2,total:100,transporte:10,abono:90,direccion:'PH Prueba'};
test('request edits reject stale and processed records and require venue and transport review',()=>{
 assertPending(event,2);assert.throws(()=>assertPending(event,1),/EDIT_CONFLICT/);assert.throws(()=>assertPending({...event,estado:'Confirmado'},2),/ALREADY_PROCESSED/);
 assertReview(event);assert.throws(()=>assertReview({...event,direccion:'https://maps.test/pin'}),/PLACE_REFERENCE_REQUIRED/);assert.throws(()=>assertReview({...event,totalPendienteTransporte:true}),/TRANSPORT_REVIEW_REQUIRED/);
});
test('transport updates use cents preserve deposits and explicitly allow zero after review',()=>{
 assert.deepEqual(requestPatch(event,'transport','0'),{transporte:0,total:90,transporteRevisadoEnApp:true,requiereRevisionUbicacion:false,totalPendienteTransporte:false});
 assert.equal(requestPatch(event,'transport','15,25').total,105.25);assert.equal(event.abono,90);
 assert.throws(()=>requestPatch({...event,abono:95},'transport','0'),/TOTAL_BELOW_PAYMENTS/);
 for(const value of ['', '-1','Infinity','0.001'])assert.throws(()=>requestPatch(event,'transport',value),/INVALID_TRANSPORT/);
});
test('resource review retains explicit zero staff and validates duration limits',()=>{
 const patch=requestPatch(event,'resources',{animadores:'0',payasos:'0',durationMinutes:'30'});assert.equal(patch.resourceRequirements.animadores,0);assert.equal(patch.recursosRevisadosEnApp,true);
 assert.throws(()=>requestPatch(event,'resources',{animadores:'',payasos:0,durationMinutes:30}),/INVALID_RESOURCES/);
 assert.throws(()=>requestPatch(event,'resources',{animadores:1,payasos:0,durationMinutes:721}),/INVALID_RESOURCES/);
 assert.throws(()=>requestPatch(event,'reference','9.01,-79.02'),/INVALID_REFERENCE/);
});
