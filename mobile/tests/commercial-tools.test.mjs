import {test} from 'node:test';import assert from 'node:assert/strict';
import {commercialPatch,saveCustomService,hideClient} from '../src/commercial-tools.mjs';
test('quote details preserve approval and validate issuance, validity and children',()=>{
 const patch=commercialPatch({estado:'Cot. Aprobada',ruc:' R-1 ',ninos:'12',vigenciaCotizacion:'15'},true,'2026-10-10');assert.equal(patch.estado,'Cot. Aprobada');assert.equal(patch.fechaEmisionCotizacion,'2026-10-10');assert.equal(patch.vigenciaCotizacion,15);assert.equal(patch.ruc,'R-1');assert.ok(!('estado' in commercialPatch({},false,'2026-10-10')));
 for(const form of [{vigenciaCotizacion:0},{vigenciaCotizacion:1.5},{fechaEmisionCotizacion:'2026-02-30'},{ninos:'-2'}])assert.throws(()=>commercialPatch(form,true,'2026-10-10'));
});
test('custom service merges latest catalog, uses unit price and avoids normalized duplicates',async()=>{
 let data={custom:'preserved',paquetes:[{id:'old',nombre:'Otro servicio',precio:5}]},writes=0;
 const runTransaction=async(_,fn)=>fn({get:async()=>({data:()=>data}),set:(_,patch)=>{writes++;data={...data,...patch};}});
 const options={runTransaction,db:{},ref:{},id:'new',line:{nombre:' Animación ',tipoCobro:'unidad',cantidad:3,precioOriginal:2,precio:6,incluye:['A']}};
 const item=await saveCustomService(options);assert.equal(item.precio,2);assert.equal(data.paquetes.length,2);assert.equal(data.custom,'preserved');assert.equal((await saveCustomService({...options,id:'again',line:{...options.line,nombre:'animacion'}})).id,'new');assert.equal(writes,1);
});
test('hiding client merges other hidden markers and changes no event documents',async()=>{
 let data={clients:['Otro cliente'],extra:1};const ref={id:'hidden'};
 const runTransaction=async(_,fn)=>fn({get:async()=>({data:()=>data}),set:(target,patch,options)=>{assert.equal(target,ref);assert.equal(options.merge,true);data={...data,...patch};}});
 const args={runTransaction,db:{},ref,client:{key:'nom:ana'}};await hideClient(args);await hideClient(args);assert.deepEqual(data.clients,['Otro cliente','key:nom:ana']);assert.equal(data.extra,1);
});
