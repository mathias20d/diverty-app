import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeReservation,reservationPatch} from '../src/reservation-data.mjs';
import {editReservationLine} from '../src/domain/reservation-lines.mjs';
const line=(mode,q,p)=>editReservationLine({nombre:'Servicio',tipoCobro:mode,cantidad:q},{precioOriginal:p});
const form=lines=>({cliente:' Ana ',telefono:'60000000',email:'ana@example.com',fecha:'2026-12-10',hora:'14:00',ubicacion:'PH Prueba',transporte:'0',serviciosSeleccionados:lines});
test('200 products save $400 total and $2 unit price',()=>{
 const result=reservationPatch(form([line('unidad',200,2)]));
 assert.equal(result.total,400);assert.equal(result.serviciosSeleccionados[0].precioOriginal,2);assert.equal(result.servicio,'Servicio (x200)');
});
test('fractional hours and total package duration',()=>{
 const hourly=line('hora',2.5,50);assert.equal(reservationPatch(form([hourly])).total,125);assert.equal(hourly.duracionHoras,2.5);
 const pkg=editReservationLine({nombre:'Diverty Amigo(a)',tipoCobro:'paquete',cantidad:1,descripcion:'Duración 2 horas'},{precioOriginal:95});assert.equal(pkg.duracionHoras,2);
});
test('rejects impossible dates, fractional units, missing phone and total below deposit',()=>{
 assert.throws(()=>reservationPatch({...form([line('paquete',1,95)]),fecha:'2026-02-30'}));
 assert.throws(()=>reservationPatch(form([line('unidad',1.5,2)])));
 assert.throws(()=>reservationPatch({...form([line('hora',1,50)]),telefono:''}));
 assert.throws(()=>reservationPatch(form([line('paquete',1,95)]),{abono:100}));
});
test('keeps deposits, costs, contracts and rejects edits from stale revisions',()=>{
 const old={...form([]),id:'e',_rev:3,abono:40,pagos:[{monto:40}],gastos:[{monto:5}],subcontratos:[{costo:20}],portalToken:'keep',createdAt:'original'};
 const saved=mergeReservation(old,reservationPatch(form([line('paquete',1,95)]),old),3,'now');
 for(const key of ['abono','pagos','gastos','subcontratos','portalToken','createdAt'])assert.deepEqual(saved[key],old[key]);
 assert.equal(saved._rev,4);assert.throws(()=>mergeReservation(old,{},2,'now'),/EDIT_CONFLICT/);
});
test('special reservations cannot change scheduling without updating resources',()=>{
 assert.throws(()=>reservationPatch(form([line('paquete',1,95)]),{id:'santa',esNavidad:true,fecha:'2026-12-24',hora:'14:00'}),/reserva especial/);
});
