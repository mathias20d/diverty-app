import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ensureProviderNumber,providerDocumentHTML,providerDocumentData} from '../src/provider-documents.mjs';
import {DEFAULT_COMPANY} from '../src/documents.mjs';
import {PROVIDER_CONTRACT_CLAUSES} from '../src/domain/provider-contract-clauses.mjs';
const provider={id:'p',nombre:'<script>Proveedor</script>',servicios:[{nombre:'No asignado',costo:999}]};
const event={cliente:'Cliente',total:900,abono:200,subcontratos:[{proveedorId:'p',servicio:'Animación',costo:30,pagado:true},{proveedorId:'otro',servicio:'Otro',costo:50}]};
test('provider event PDF contains exact web clauses, booked costs, escaped fields and only assigned services',()=>{
 const web=readFileSync(new URL('../../src/modules/documents/PdfTemplate.jsx',import.meta.url),'utf8');assert.equal(PROVIDER_CONTRACT_CLAUSES.length,12);
 for(const row of PROVIDER_CONTRACT_CLAUSES){assert.ok(web.includes(row.title));assert.ok(web.includes(row.text));}
 const html=providerDocumentHTML(provider,event,'SUB-00005',DEFAULT_COMPANY);assert.ok(html.includes('B/. 30.00'));assert.ok(!html.includes('999'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('No asignado'));assert.equal(providerDocumentData(provider,event).total,30);
 assert.ok(providerDocumentHTML(provider,null,'SUB-00006',DEFAULT_COMPANY).includes('No asignado'));
});
function setup(input=event,counter={ultimo:4}){
 const records=new Map([['p',structuredClone(provider)],['e',structuredClone(input)],['c',counter]]);
 const runTransaction=async(db,fn)=>{const writes=[];const value=await fn({get:async ref=>({exists:()=>records.has(ref),data:()=>structuredClone(records.get(ref))}),set:(ref,patch)=>writes.push([ref,patch])});for(const [ref,patch] of writes)records.set(ref,{...records.get(ref),...patch});return value;};
 return {records,args:{runTransaction,db:{},providerRef:'p',eventRef:'e',counterRef:'c',providerId:'p',now:'test'}};
}
test('event and framework share official counter, preserve financial rows and retries do not renumber',async()=>{
 const {records,args}=setup();const first=await ensureProviderNumber(args);assert.equal(first.number,'SUB-00005');assert.equal(records.get('e').subcontratos[0].pagado,true);assert.equal(records.get('e').subcontratos[1].numeroSubcontratoEvento,undefined);assert.equal(records.get('e').total,900);assert.equal(records.get('p').numeroSubcontrato,undefined);
 await ensureProviderNumber(args);assert.equal(records.get('c').ultimo,5);assert.equal(records.get('e')._rev,1);
 const framework=await ensureProviderNumber({...args,eventRef:null});assert.equal(framework.number,'SUB-00006');await ensureProviderNumber({...args,eventRef:null});assert.equal(records.get('c').ultimo,6);
});
test('invalid counters, missing assignments and conflicting official numbers cause no writes',async()=>{
 for(const counter of [undefined,{ultimo:-1},{ultimo:'bad'}]){const {records,args}=setup(event,counter);if(!counter)records.delete('c');await assert.rejects(ensureProviderNumber(args),/COUNTER/);assert.deepEqual(records.get('e'),event);}
 const empty=setup({...event,subcontratos:[]});await assert.rejects(ensureProviderNumber(empty.args),/NO_ASSIGNED_SERVICES/);
 const conflict=setup({...event,subcontratos:[{proveedorId:'p',costo:1,numeroSubcontratoEvento:'SUB-1'},{proveedorId:'p',costo:1,numeroSubcontratoEvento:'SUB-2'}]});await assert.rejects(ensureProviderNumber(conflict.args),/CONFLICTING_NUMBERS/);assert.equal(conflict.records.get('c').ultimo,4);
});
