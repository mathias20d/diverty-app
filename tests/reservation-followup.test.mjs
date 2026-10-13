import test from 'node:test';
import assert from 'node:assert/strict';
import {filterReservationControl,reservationControlRows,saveReservationFollowup,validFollowupDate} from '../src/lib/reservation-followup.mjs';

const original={id:'normal',cliente:'Cliente ficticio',estado:'Confirmado',fecha:'2026-10-22',hora:'14:00',total:150,abono:25,
  serviciosSeleccionados:[{nombre:'Plan recreativo',duracionHoras:2}],personalResponsable:[{nombre:'Ana de ejemplo',rol:'Animador(a)'}],
  direccion:'Salón ficticio',numeroFactura:'FAC-1',numeroContrato:'CON-1',_rev:3};
const ids=(rows,filter)=>filterReservationControl(rows,{filter}).map(row=>row.id).sort();
test('separates unaccepted requests and quotes from operational deposits, preparation and receivables',()=>{
  const events=[original,{...original,id:'web',origen:'Web Directa',estado:'Pendiente',abono:0},
    {...original,id:'quote',estado:'Cot. Aprobada',abono:0,fecha:'2026-09-01'},
    {...original,id:'deposit',abono:0,personalResponsable:[],direccion:''},
    {...original,id:'complete',estado:'Completado',fecha:'2026-09-01'},
    {...original,id:'cancel',estado:'Cancelada',abono:0},
    {...original,id:'trash',deletedLocally:true},{...original,id:'paid',abono:150}];
  const rows=reservationControlRows(events,'2026-10-12');
  assert.deepEqual(ids(rows,'web'),['web']);assert.deepEqual(ids(rows,'quotes'),['quote']);
  assert.deepEqual(ids(rows,'deposit'),['deposit']);assert.deepEqual(ids(rows,'preparation'),['deposit']);
  assert.deepEqual(ids(rows,'balance'),['complete','deposit','normal']);
  assert.deepEqual(ids(rows,'contact'),['quote','web']);
  assert.equal(rows.some(row=>row.id==='trash'),false);
  assert.deepEqual(rows.find(row=>row.id==='deposit').issues,['Personal','Lugar']);
  assert.equal(events[3].personalResponsable.length,0);
});
test('prioritizes overdue follow-ups and searches full staff names, notes and accents before pagination',()=>{
  const rows=reservationControlRows([
    {...original,id:'future',seguimientoComercial:{estado:'esperando_cliente',proximoContacto:'2026-10-15'}},
    {...original,id:'today',seguimientoComercial:{estado:'contactado',proximoContacto:'2026-10-12',nota:'Cotización enviada'}},
    {...original,id:'late',seguimientoComercial:{estado:'esperando_cliente',proximoContacto:'2026-10-10'}},
    {...original,id:'stale',estado:'Completado',seguimientoComercial:{estado:'esperando_cliente',proximoContacto:'2026-10-10'}},
  ],'2026-10-12');
  assert.deepEqual(filterReservationControl(rows).map(row=>row.id),['late','today']);
  assert.deepEqual(filterReservationControl(rows,{filter:'all',search:'cotizacion enviada'}).map(row=>row.id),['today']);
  assert.equal(filterReservationControl(rows,{filter:'all',search:'ana de ejemplo',date:'2026-10-22'}).length,4);
});
test('preparation uses saved or catalog duration and Christmas roster; monetary rounding remains precise',()=>{
  const rows=reservationControlRows([
    {...original,id:'legacy',abono:149.99,serviciosSeleccionados:[{nombre:'Plan recreativo'}]},
    {...original,id:'santa',esNavidad:true,santaAsignado:'Santa 1',personalResponsable:[],serviciosSeleccionados:[]},
    {...original,id:'missing',fecha:'',hora:'',personalResponsable:[],serviciosSeleccionados:[{nombre:'Plan a medida'}],requiereRevisionUbicacion:true},
  ],'2026-10-12',[{nombre:'Plan recreativo',duracionHoras:2}]);
  assert.deepEqual(rows.find(row=>row.id==='legacy').issues,[]);
  assert.equal(rows.find(row=>row.id==='legacy').balance,0.01);
  assert.deepEqual(rows.find(row=>row.id==='santa').issues,[]);
  assert.deepEqual(rows.find(row=>row.id==='missing').issues,['Fecha','Hora','Personal','Duración','Transporte']);
  assert.equal(validFollowupDate('2026-13-02'),false);assert.equal(validFollowupDate('2026-02-30'),false);assert.equal(validFollowupDate('2028-02-29'),true);
});
function fixture(current=structuredClone(original),fail=false){
  let value=current,patch=null;
  return {get patch(){return patch;},get value(){return value;},runTransaction:async(_db,callback)=>{
    if(fail)throw new Error('offline');
    const saved=await callback({get:async()=>({exists:()=>!!value,data:()=>structuredClone(value)}),set:(_ref,data,options)=>{assert.equal(options.merge,true);patch=structuredClone(data);}});
    if(patch)value={...value,...patch};return saved;
  }};
}
const draft={estado:'esperando_cliente',proximoContacto:'2026-10-15',nota:' Confirmar disponibilidad por teléfono '};
test('follow-up is atomic and retains simultaneous payments, staff, documents and official status',async()=>{
  const store=fixture({...original,abono:60,_rev:5,estado:'Preparando',personalResponsable:[{nombre:'Otro encargado',rol:'Pintacaritas'}]});
  const saved=await saveReservationFollowup({runTransaction:store.runTransaction,ref:{},event:original,draft,uid:'admin',now:'2026-10-12T15:00:00Z'});
  assert.deepEqual(Object.keys(store.patch).sort(),['_rev','seguimientoComercial','updatedAt']);
  assert.equal(saved.abono,60);assert.equal(saved.estado,'Preparando');assert.equal(saved.numeroFactura,'FAC-1');assert.equal(saved.numeroContrato,'CON-1');
  assert.equal(saved._rev,6);assert.equal(saved.personalResponsable[0].nombre,'Otro encargado');assert.equal(saved.seguimientoComercial.nota,'Confirmar disponibilidad por teléfono');
  assert.equal(original.seguimientoComercial,undefined);
});
test('concurrent follow-up changes, deletion, invalid dates and offline writes preserve existing data',async()=>{
  for(const [current,expected]of [[{...original,seguimientoComercial:{estado:'contactado'}},/FOLLOWUP_CHANGED/],[null,/EVENT_NOT_FOUND/],[{...original,deletedLocally:true},/RESERVATION_IN_TRASH/]]){
    const store=fixture(current);await assert.rejects(saveReservationFollowup({runTransaction:store.runTransaction,ref:{},event:original,draft}),expected);assert.equal(store.patch,null);
  }
  const store=fixture();
  await assert.rejects(saveReservationFollowup({runTransaction:store.runTransaction,event:original,draft:{...draft,proximoContacto:'2026-02-30'}}),/INVALID_FOLLOWUP_DATE/);
  await assert.rejects(saveReservationFollowup({runTransaction:store.runTransaction,event:original,draft:{...draft,nota:'a'.repeat(1001)}}),/FOLLOWUP_NOTE_TOO_LONG/);
  const offline=fixture(original,true);await assert.rejects(saveReservationFollowup({runTransaction:offline.runTransaction,event:original,draft}),/offline/);assert.equal(offline.patch,null);
});
