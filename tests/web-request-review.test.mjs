import test from 'node:test';
import assert from 'node:assert/strict';
import { transportPending, requestReview, pendingRequests } from '../src/lib/web-request-review.mjs';
const event = {id:'a',estado:'Pendiente',origen:'Web Directa',fecha:'2026-10-08',hora:'09:00',total:'100',abono:'0',direccion:'PH destino'};
test('outside coverage is pending regardless of country; explicit zero transport review clears it',()=>{
  assert.equal(transportPending({...event,ubicacion:'Fuera de cobertura automática'}),true);
  assert.equal(transportPending({...event,ubicacion:'Fuera del área automática',transporteRevisadoEnApp:true,transporte:'0'}),false);
});
test('pending list prioritizes event dates and preserves all requests across filters',()=>{
  const events=[event,{...event,id:'b',fecha:'2026-11-10'},{...event,id:'c',fecha:'2026-10-07',estado:'Confirmado'}];
  const now=new Date('2026-10-06T16:00:00Z');
  assert.deepEqual(pendingRequests(events,'all',now).map(e=>e.id),['a','b']);
  assert.deepEqual(pendingRequests(events,'soon',now).map(e=>e.id),['a']);
  assert.equal(pendingRequests(events,'deposit',now).length,2);
  assert.equal(pendingRequests([{...event,abono:'30'}],'deposit',now).length,0);
});
test('review labels retain operational requirements without making a deposit mandatory',()=>{
  assert.deepEqual(requestReview({...event,requiereRevisionUbicacion:true}).issues,['Transporte','Personal']);
  assert.deepEqual(requestReview({...event,esNavidad:true}).issues,['Asignar Santa']);
  assert.deepEqual(requestReview({...event,esNavidad:true,santaAsignado:'Santa 1'}).issues,[]);
  assert.deepEqual(requestReview({...event,esNavidad:true,lat:9,lng:-79.5,santaAsignado:'Santa 1'}).issues,[]);
});
