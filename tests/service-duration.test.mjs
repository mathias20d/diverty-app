import test from 'node:test';
import assert from 'node:assert/strict';
import {serviceDurationHours} from '../src/lib/service-duration.mjs';
import {editReservationLine} from '../src/lib/reservation-lines.mjs';

const amigo={nombre:'Diverty Amigo(a)',cantidad:1,precio:95,duracionHoras:1,incluye:['1 Animador (a)','Animación Infantil 1 Hora','Pintacaritas Básicas 1 Hora','Duración 2 Horas']};
test('the package total repairs the first-activity hour in historical invoice lines',()=>{
  assert.equal(serviceDurationHours(amigo),2);
  assert.equal(serviceDurationHours({...amigo,incluye:undefined,descripcion:amigo.incluye.join('\n')}),2);
  assert.equal(serviceDurationHours({...amigo,incluye:undefined},{serviciosLista:amigo.incluye.join('\n')}),2);
  const repaired=editReservationLine(amigo,{cantidad:1});assert.equal(repaired.duracionHoras,2);assert.equal(repaired.precio,95);assert.equal(amigo.duracionHoras,1,'rendering and edits cannot mutate the old source record');
});

test('custom duration edits survive stale descriptions, pricing and quantity changes',()=>{
  const line={nombre:'Plan a medida',cantidad:1,precio:150,descripcion:'Duración total 3 horas'};
  const edited=editReservationLine(line,{duracionHoras:1.5});
  assert.equal(serviceDurationHours(edited),1.5);assert.equal(edited.precio,150);
  assert.equal(editReservationLine(edited,{cantidad:2}).duracionHoras,1.5);
  assert.equal(editReservationLine(edited,{precioOriginal:175}).duracionHoras,1.5);
  assert.equal(serviceDurationHours(editReservationLine(edited,{duracionHoras:''})),0);
  assert.equal(serviceDurationHours({duracion:'45 minutos'}),.75);
  assert.equal(serviceDurationHours({descripcion:'Actividad 1 hora, duración total: 90 minutos'}),1.5);
  assert.equal(serviceDurationHours({duracion:'1 hora y 30 minutos'}),1.5);
});
test('booked totals win over a changed catalog and package quantities are not hours',()=>{
  assert.equal(serviceDurationHours({...amigo,cantidad:2},{duracionTexto:'3 horas'}),2);
  assert.equal(serviceDurationHours({duracionHoras:4,descripcion:'Animación 1 hora'}),4);
  assert.equal(serviceDurationHours({nombre:'Diverty Amigo(a)'}),2);
});
test('hourly quantities, unit products and fractional package totals keep their meaning',()=>{
  assert.equal(serviceDurationHours({...amigo,tipoCobro:'hora',cantidad:.5}),.5);
  assert.equal(serviceDurationHours({...amigo,tipoCobro:'unidad',cantidad:200}),0);
  assert.equal(serviceDurationHours({descripcion:'Pintacaritas 1 hora. Duración total: 2,5 horas'}),2.5);
  assert.equal(serviceDurationHours({descripcion:'Duración: 1 hora y media'}),1.5);
  assert.equal(serviceDurationHours({duracion:'2 Horas'}),2);
  assert.equal(serviceDurationHours({}),0);
});
