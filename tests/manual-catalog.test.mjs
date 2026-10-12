import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogDescription, manualCatalog } from '../src/lib/manual-catalog.mjs';
import { addReservationLine, editReservationLine } from '../src/lib/reservation-lines.mjs';

test('manual selection uses the web price and all descriptions/inclusions instead of an old duplicate', () => {
  const web = {id:'web-plan',nombre:'Plan Recreativo',precio:150,descripcion:'Una tarde de diversión.',serviciosLista:'Juegos dirigidos\nGloboflexia\nPintacaritas',incluye:['Globoflexia','Música'],duracionHoras:2};
  const old = {id:'old-plan',nombre:'Plán recreativo',precio:80,descripcion:'Texto anterior'};
  const catalog = manualCatalog([old,{nombre:'Servicio personalizado',precio:10}],[web]);
  assert.equal(catalog.length,2);
  const line = addReservationLine([],catalog[0])[0];
  assert.equal(line.id,'web-plan');assert.equal(line.precio,150);assert.equal(line.duracionHoras,2);
  assert.deepEqual(line.incluye,['Juegos dirigidos','Globoflexia','Pintacaritas','Música']);
  assert.equal(line.descripcion,'Una tarde de diversión.\n\nTodo lo que incluye:\n• Juegos dirigidos\n• Globoflexia\n• Pintacaritas\n• Música');
  assert.equal(web.descripcion,'Una tarde de diversión.');
  web.serviciosLista='Texto cambiado después';
  assert.match(line.descripcion,/Pintacaritas/);assert.doesNotMatch(line.descripcion,/Texto cambiado/);
  const custom = {...line,descripcion:'Acuerdo particular'};
  assert.equal(addReservationLine([custom],catalog[0])[0].descripcion,'Acuerdo particular');
  assert.equal(editReservationLine(custom,{cantidad:2}).precio,300);
});

test('missing or already included descriptions remain clean and a zero-priced service stays available', () => {
  assert.deepEqual(catalogDescription({descripcion:'Juegos\n• Música',incluye:['Juegos','Música']}),{descripcion:'Juegos\n• Música',incluye:['Juegos','Música']});
  assert.equal(manualCatalog([],[{nombre:'Gratis',precio:0}])[0].precio,0);
  assert.deepEqual(manualCatalog([null,{}],[]),[]);
});
