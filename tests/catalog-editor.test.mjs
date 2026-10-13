import test from 'node:test';
import assert from 'node:assert/strict';
import {categorySlug,createCategoryWithSync,catalogDurationFields,catalogDurationForm} from '../src/lib/catalog-editor.mjs';
import {serviceDurationHours} from '../src/lib/service-duration.mjs';
import {addReservationLine} from '../src/lib/reservation-lines.mjs';

test('equivalent category names cannot overwrite a previously created category, including a concurrent creation',async()=>{
  const rows=new Map();let tail=Promise.resolve();
  const runTransaction=(_,fn)=>{const job=tail.then(async()=>{const writes=[];const result=await fn({get:async ref=>({exists:()=>rows.has(ref)}),set:(ref,value)=>writes.push([ref,value])});writes.forEach(([r,v])=>rows.set(r,v));return result;});tail=job.catch(()=>{});return job;};
  const id=categorySlug(' Fiéstas ');assert.equal(id,categorySlug('fiestas'));
  const create=name=>createCategoryWithSync({database:{},runTransaction,ref:id,data:{nombre:name},syncRef:'sync',syncUpdate:{version:1}});
  const result=await Promise.allSettled([create('Fiestas'),create('Fiéstas')]);
  assert.equal(result[0].status,'fulfilled');assert.match(result[1].reason.message,/CATEGORY_EXISTS/);
  assert.equal(rows.get(id).nombre,'Fiestas');assert.deepEqual(rows.get('sync'),{version:1});
});
test('explicit catalog duration wins over activity text and is copied to an immutable booking snapshot',()=>{
  const pkg={nombre:'Paquete especial',tipoCobro:'paquete',precio:100,descripcion:'Animación 1 hora. Duración total 3 horas',...catalogDurationFields('1.5')};
  assert.equal(serviceDurationHours(pkg),1.5);assert.equal(catalogDurationForm(pkg),1.5);
  const booked=addReservationLine([],pkg)[0];
  assert.equal(serviceDurationHours(booked,{...pkg,duracionHoras:4}),1.5);
  assert.equal(booked.precio,100);assert.equal(booked.cantidad,1);
  assert.equal(serviceDurationHours({duracion:'45 minutos'}),.75);
  assert.throws(()=>catalogDurationFields('-2'),/duración/);
  assert.throws(()=>catalogDurationFields('abc'),/duración/);
  assert.deepEqual(catalogDurationFields('', 'paquete'),{duracionHoras:null,duracionCatalogoDefinida:false});
  assert.equal(serviceDurationHours({...pkg,tipoCobro:'unidad'}),0);
  assert.equal(serviceDurationHours({...pkg,tipoCobro:'hora',cantidad:2}),2);
});
