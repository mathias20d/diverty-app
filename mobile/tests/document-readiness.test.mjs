import test from 'node:test';
import assert from 'node:assert/strict';
import {documentReadiness} from '../src/document-readiness.mjs';
const ready={busy:false,ready:true,settings:true,editing:false,catalogReady:true,catalogError:'',summary:{total:100}};
test('first document explains company setup and enables generation after the explicit save',()=>{
 assert.ok(documentReadiness({...ready,settings:false,editing:true}).message.includes('Guardar datos'));
 assert.equal(documentReadiness({...ready,settings:false}).disabled,true);
 assert.equal(documentReadiness(ready).disabled,false);
 assert.equal(documentReadiness({...ready,editing:true}).disabled,true);
});
test('optional catalog failure can use booked services but never bypasses invalid amounts or company setup',()=>{
 const failed={...ready,catalogReady:false,catalogError:'No se pudo cargar el catálogo'};
 assert.equal(documentReadiness(failed).disabled,true);
 assert.equal(documentReadiness({...failed,savedServicesOnly:true}).disabled,false);
 assert.equal(documentReadiness({...failed,savedServicesOnly:true,summary:null}).disabled,true);
 assert.equal(documentReadiness({...failed,savedServicesOnly:true,settings:false}).disabled,true);
 assert.equal(documentReadiness({...ready,busy:true,savedServicesOnly:true}).disabled,true);
});
