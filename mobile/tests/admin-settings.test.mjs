import test from 'node:test';
import assert from 'node:assert/strict';
import {capacityPayload,resourcesFromConfig,saveCapacity,homeSummary,readPreferences,ADMIN_MENU} from '../src/admin-settings.mjs';
test('menu follows web order and preferences preserve zero goals',()=>{
 assert.deepEqual(ADMIN_MENU.map(item=>item[1]),['Inicio','Agenda','Clientes','Proveedores','Finanzas','Web','Ajustes']);
 assert.equal(readPreferences('{"metaMensual":0}').metaMensual,0);
 assert.equal(readPreferences('broken').metaMensual,1500);
 assert.throws(()=>capacityPayload({animadores:'',payasos:0,capacidadSimultanea:1,capacidadSanta:1}));
 assert.equal(capacityPayload({animadores:0,payasos:0,capacidadSimultanea:1,capacidadSanta:1}).recursosDisponibles.animadores,0);
});
test('capacity transaction preserves web configuration and rejects stale edits',async()=>{
 const original={banner:'keep',recursosDisponibles:{animadores:3,payasos:1},capacidadSimultanea:3,capacidadSanta:1},writes=[];
 const runTransaction=async(db,fn)=>fn({get:async ref=>({data:()=>ref==='global'?original:{version:5,versions:{temas:7,config_web:2}}}),set:(...args)=>writes.push(args)});
 const form={...resourcesFromConfig(original),animadores:0};
 const result=await saveCapacity({runTransaction,ref:'global',syncRef:'sync',form,original});
 assert.equal(result.banner,'keep');assert.equal(result.recursosDisponibles.animadores,0);
 assert.equal(writes[1][1].versions.temas,7);assert.equal(writes[1][1].version,6);assert.deepEqual(writes[0][2],{merge:true});
 writes.length=0;await assert.rejects(saveCapacity({runTransaction,ref:'global',syncRef:'sync',form,original:{capacidadSimultanea:4}}),/CAPACITY_CHANGED/);assert.equal(writes.length,0);
});
test('home month metrics exclude requests quotes and cancelled events',()=>{
 const base={fecha:'2026-10-10',total:100,abono:25,estado:'Confirmado'};
 const summary=homeSummary([base,{...base,estado:'Cotización'},{...base,estado:'Cancelada'},{...base,estado:'Pendiente',origen:'web directa'},{...base,fecha:'2026-11-01'}],'2026-10-10',200);
 assert.equal(summary.finance.received,25);assert.equal(summary.finance.balance,75);assert.equal(summary.progress,50);assert.equal(summary.today.length,1);assert.equal(summary.requests.length,1);assert.equal(summary.quotes.length,1);
});
