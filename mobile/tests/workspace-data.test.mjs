import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calendarCells,clientPrefill,clientsFromEvents,financeSummary,mapsUrl,monthRange,moveMonth,searchEvents,whatsappUrl} from '../src/workspace-data.mjs';

test('calendar uses Monday first, leap years, and year rollover without timezone shifts',()=>{
 assert.deepEqual(monthRange('2028-02'),{start:'2028-02-01',end:'2028-02-29',count:29});
 assert.equal(moveMonth('2026-12',1),'2027-01');
 assert.equal(moveMonth('2027-01',-1),'2026-12');
 const cells=calendarCells('2026-10');
 assert.deepEqual(cells.slice(0,4),[null,null,null,'2026-10-01']);
 assert.equal(cells.filter(Boolean).length,31);
 assert.throws(()=>monthRange('2026-13'),/INVALID_MONTH/);
});

test('reservation search normalizes accents and phones and hides tombstones and system records',()=>{
 const rows=[{id:'1',cliente:'María Pérez',telefono:'6070-2108',fecha:'2026-10-10',hora:'14:00',estado:'Confirmado'},
  {id:'2',cliente:'Ana',fecha:'2026-10-10',hora:'09:00',estado:'Cancelada'},
  {id:'hidden',cliente:'María Pérez',deletedLocally:true},{id:'system',_system:true,cliente:'María Pérez'}];
 assert.deepEqual(searchEvents(rows,'maria').map(e=>e.id),['1']);
 assert.deepEqual(searchEvents(rows,'60702108').map(e=>e.id),['1']);
 assert.deepEqual(searchEvents(rows,'','canceladas').map(e=>e.id),['2']);
 assert.deepEqual(searchEvents(rows,'','confirmadas').map(e=>e.id),['1']);
 assert.deepEqual(searchEvents(rows,'').map(e=>e.id),['2','1']);
});

test('CRM follows official name grouping, keeps latest available contacts and hidden clients',()=>{
 const rows=[{cliente:'María Pérez',telefono:'60702108',email:'old@example.test',fecha:'2026-01-10'},
  {cliente:'Maria Perez',telefono:'60001111',email:'new@example.test',fecha:'2026-10-10'},
  {cliente:'Ana',telefono:'60002222',fecha:'2026-10-11'},
  {cliente:'Solicitud',estado:'Pendiente',origen:'Web directa'},
  {cliente:'Cancelado',estado:'Cancelado'},{cliente:'Cotización',estado:'Cotización'}];
 const clients=clientsFromEvents(rows,['key:nom:ana']);
 assert.equal(clients.length,1);
 assert.equal(clients[0].reservas.length,2);
 assert.equal(clients[0].telefono,'60001111');
 assert.deepEqual(clientPrefill(clients[0]),{cliente:'Maria Perez',telefono:'60001111',email:'new@example.test'});
 assert.equal(Object.hasOwn(clientPrefill(clients[0]),'total'),false);
 assert.equal(clientsFromEvents(rows,['Maria Perez']).some(c=>c.key==='nom:maria perez'),false);
});

test('monthly finance keeps legacy supplier costs separate and excludes web requests and quotes',()=>{
 const rows=[{total:200,abono:50,gastos:100,subcontratos:[{costo:30}]},
  {total:100,abono:150,gastos:20,costosSeparados:true,subcontratos:[{costo:10}]},
  {total:900,estado:'Cancelada'},{total:800,estado:'Rechazado'},
  {total:700,estado:'Cotización'},{total:600,estado:'Pendiente',origen:'Web directa'},
  {total:500,deletedLocally:true},{total:400,_system:true}];
 assert.deepEqual(financeSummary(rows),{reservas:2,total:300,received:150,balance:150,internal:90,providers:40,costs:130,profit:170,invalid:0,webRequests:1});
});

test('finance uses cents, retains losses, and reports invalid rows rather than silently counting them',()=>{
 const summary=financeSummary([{total:.3,abono:.1,gastos:.5,costosSeparados:true},{total:'invalid',gastos:20}]);
 assert.equal(summary.total,.3);assert.equal(summary.balance,.2);assert.equal(summary.profit,-.2);assert.equal(summary.invalid,1);
});

test('WhatsApp uses Panama prefix for local phones and preserves international contacts',()=>{
 assert.equal(whatsappUrl('6070-2108'),'https://wa.me/50760702108');
 assert.equal(whatsappUrl('+1 305 555 0123'),'https://wa.me/13055550123');
 assert.equal(whatsappUrl('00507 60702108'),'https://wa.me/50760702108');
 assert.equal(whatsappUrl('123'),null);
});

test('Maps prioritizes saved GPS, uses Maps links, and safely encodes text addresses',()=>{
 assert.equal(mapsUrl({lat:9,lng:-79.5,direccion:'Otra dirección'}),'https://www.google.com/maps/search/?api=1&query=9%2C-79.5');
 assert.equal(mapsUrl({direccion:'https://maps.app.goo.gl/abc',ubicacion:'Panamá'}),'https://maps.app.goo.gl/abc');
 assert.equal(mapsUrl({direccion:'https://google.com/maps/@1,2,12z/data=!3d9.1!4d-79.6'}),'https://www.google.com/maps/search/?api=1&query=9.1%2C-79.6');
 assert.equal(mapsUrl({direccion:'javascript:alert(1)'}).startsWith('https://www.google.com/maps/'),true);
 assert.equal(mapsUrl({}),null);
});
