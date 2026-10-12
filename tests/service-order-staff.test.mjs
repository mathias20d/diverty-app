import test from 'node:test';
import assert from 'node:assert/strict';
import { saveServiceOrderStaff, serviceOrderStaff } from '../src/lib/service-order.mjs';

const original={id:'event-1',cliente:'Cliente',total:150,abono:25,numeroFactura:'FAC-1',numeroContrato:'CON-1',serviciosSeleccionados:[{nombre:'Plan',duracionHoras:2}],subcontratos:[{nombre:'Proveedor anterior',servicio:'Animación',costo:60,pagado:true}],_rev:3};
function fixture(current=structuredClone(original), fail=false) {
  let value=structuredClone(current),patch=null;
  const runTransaction=async(_db,callback)=>{
    if(fail)throw new Error('offline');
    const result=await callback({get:async()=>({exists:()=>!!value,data:()=>structuredClone(value)}),set:(_ref,data,options)=>{assert.equal(options.merge,true);patch=structuredClone(data);}});
    if(patch)value={...value,...patch};return result;
  };
  return {runTransaction,get value(){return value;},get patch(){return patch;}};
}

test('quick assignment writes only staff metadata and retains concurrent finance edits and suppliers',async()=>{
  const store=fixture({...original,total:180,abono:50,_rev:4});
  const people=[{id:'staff-1',nombre:' Ana ',rol:' Pintacaritas '}];
  const saved=await saveServiceOrderStaff({database:{},runTransaction:store.runTransaction,ref:{},event:original,people,now:'2030-11-10T13:00:00Z'});
  assert.deepEqual(Object.keys(store.patch).sort(),['_rev','personalOrdenConfirmado','personalResponsable','updatedAt']);
  assert.equal(saved.total,180);assert.equal(saved.abono,50);assert.equal(saved._rev,5);
  assert.equal(saved.numeroFactura,'FAC-1');assert.equal(saved.numeroContrato,'CON-1');
  assert.deepEqual(saved.subcontratos,original.subcontratos);assert.deepEqual(saved.serviciosSeleccionados,original.serviciosSeleccionados);
  assert.deepEqual(serviceOrderStaff(saved),[{name:'Ana',role:'Pintacaritas'}]);
  assert.equal(people[0].nombre,' Ana ');assert.equal(original.personalResponsable,undefined);
});

test('concurrent staff edits and network failure cannot overwrite saved staff',async()=>{
  const store=fixture({...original,personalOrdenConfirmado:true,personalResponsable:[{nombre:'Otra persona',rol:'Payaso(a)'}]});
  await assert.rejects(saveServiceOrderStaff({runTransaction:store.runTransaction,ref:{},event:original,people:[{nombre:'Ana',rol:'Animador(a)'}]}),/ORDER_STAFF_CHANGED/);
  assert.equal(store.patch,null);assert.equal(store.value.personalResponsable[0].nombre,'Otra persona');
  const offline=fixture(original,true);
  await assert.rejects(saveServiceOrderStaff({runTransaction:offline.runTransaction,ref:{},event:original,people:[]}),/offline/);
  assert.equal(offline.patch,null);
});

test('clearing the order roster keeps provider accounting and blank names cannot be saved',async()=>{
  const store=fixture();
  const saved=await saveServiceOrderStaff({runTransaction:store.runTransaction,ref:{},event:original,people:[]});
  assert.deepEqual(serviceOrderStaff(saved),[]);assert.deepEqual(saved.subcontratos,original.subcontratos);
  await assert.rejects(saveServiceOrderStaff({runTransaction:store.runTransaction,event:saved,people:[{nombre:' ',rol:'Animador(a)'}]}),/INCOMPLETE_ORDER_STAFF/);
  const missing=fixture(null);
  await assert.rejects(saveServiceOrderStaff({runTransaction:missing.runTransaction,ref:{},event:original,people:[]}),/EVENT_NOT_FOUND/);
});
