import {test} from 'node:test';
import assert from 'node:assert/strict';
import {santaConfirmationPatch} from '../src/legacy-santa.mjs';
const event={id:'candidate',fecha:'2026-12-24',hora:'14:00',esNavidad:true,estado:'Pendiente',origen:'Web Directa'};
const stop={id:'stop',fecha:event.fecha,hora:'14:30',esNavidad:true,estado:'Confirmado',santaAsignado:'Santa 1'};
test('legacy Santa acceptance checks enabled Santa and reuses visit plus conservative travel buffer',()=>{
 assert.throws(()=>santaConfirmationPatch(event,[],{capacidadSanta:1},'Santa 2'),/SANTA_UNAVAILABLE/);
 assert.throws(()=>santaConfirmationPatch(event,[stop],{capacidadSanta:2},'Santa 1'),/SANTA_ROUTE_CONFLICT/);
 assert.deepEqual(santaConfirmationPatch(event,[stop],{capacidadSanta:2},'Santa 2'),{esNavidad:true,recursoNavidad:'Santa',santaAsignado:'Santa 2'});
 assert.deepEqual(santaConfirmationPatch(event,[{...stop,hora:'14:45'}],{},'Santa 1'),{esNavidad:true,recursoNavidad:'Santa',santaAsignado:'Santa 1'});
});
test('legacy routes ignore requests, cancelled, completed, deleted and other-date visits',()=>{
 for(const patch of [{origen:'Web Directa',estado:'Pendiente'},{estado:'Cancelado'},{estado:'Completado'},{entregaNavidadRealizada:true},{deletedLocally:true},{fecha:'2026-12-25'}])assert.doesNotThrow(()=>santaConfirmationPatch(event,[{...stop,...patch}],{},'Santa 1'));
 assert.throws(()=>santaConfirmationPatch({...event,hora:''},[],{},'Santa 1'),/SANTA_ROUTE_CONFLICT/);
});
