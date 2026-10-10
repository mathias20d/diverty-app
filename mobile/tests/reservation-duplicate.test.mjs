import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canDuplicateReservation,duplicateReservationDraft} from '../src/reservation-duplicate.mjs';
test('duplicate preserves commercial selection without identity, ownership or financial histories',()=>{
 const event={id:'old',cliente:'Ana',telefono:'60000000',fecha:'2027-01-01',hora:'10:00',ubicacion:'PH',estado:'Completado',abono:30,numeroFactura:'FAC-1',ownerUid:'owner',_rev:8,pagosItems:[{monto:30}],subcontratos:[{costo:10}],serviciosSeleccionados:[{nombre:'Servicio',incluye:['A'],precio:40}]};
 const copy=duplicateReservationDraft(event);assert.equal(copy.estado,'Pendiente');assert.equal(copy.cliente,'Ana');assert.deepEqual(copy.serviciosSeleccionados,event.serviciosSeleccionados);
 for(const key of ['id','abono','numeroFactura','ownerUid','_rev','pagosItems','subcontratos'])assert.ok(!(key in copy));
 copy.serviciosSeleccionados[0].incluye.push('B');assert.deepEqual(event.serviciosSeleccionados[0].incluye,['A']);
 assert.equal(duplicateReservationDraft({...event,estado:'Cot. Aprobada'}).estado,'Cotización');
});
test('special reservations, pending web requests and tombstones require their own flow',()=>{
 for(const event of [{esNavidad:true},{centralBookingVersion:1},{resourceRequirements:{}},{deletedLocally:true},{origen:'Web Directa',estado:'Pendiente'}]){assert.equal(canDuplicateReservation(event),false);assert.throws(()=>duplicateReservationDraft(event),/SPECIAL_RESERVATION/);}
});
