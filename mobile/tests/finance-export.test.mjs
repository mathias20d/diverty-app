import {test} from 'node:test';import assert from 'node:assert/strict';import {financeCSV,shareFinanceCSV} from '../src/finance-export.mjs';
const event={id:'a',fecha:'2026-10-10',cliente:'=cliente,"test"',estado:'Confirmado',total:100,abono:20,costosSeparados:true,gastos:30,gastosItems:[{monto:40,categoria:'personal'}],subcontratos:[{costo:10}]};
test('finance CSV retains web columns, capped categories and excludes quotes or other months',()=>{
 const csv=financeCSV([event,{...event,id:'q',estado:'Cotización'},{...event,id:'old',fecha:'2025-01-01'}],'2026-10');assert.ok(csv.startsWith('\uFEFF'));assert.equal(csv.split('\r\n').length,3);assert.ok(csv.includes('"\'=cliente,""test"""'));assert.ok(csv.includes('100.00,20.00,80.00,30.00,30.00,0.00,0.00,0.00,10.00,40.00,60.00'));assert.throws(()=>financeCSV([{...event,abono:'error'}],'2026-10'));
});
test('balance sharing uses experience cache and does not mutate source events',async()=>{
 let content,uri;class File{constructor(directory,name){this.uri=directory+name;this.exists=false;}create(){this.exists=true;}write(text){content=text;this.size=text.length;}}
 const original=structuredClone(event);await shareFinanceCSV({File,Paths:{cache:'file:///experience/cache/'},Sharing:{shareAsync:async(url,options)=>{uri=url;assert.equal(options.mimeType,'text/csv');}},events:[event],month:'2026-10'});assert.ok(uri.startsWith('file:///experience/cache/'));assert.ok(content.includes('Facturado'));assert.deepEqual(event,original);
});
