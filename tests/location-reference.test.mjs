import test from 'node:test';
import assert from 'node:assert/strict';
import {hasPlaceDescription,needsPlaceReference} from '../src/lib/location-reference.mjs';
test('a GPS pin, coordinates or map link need a written venue reference',()=>{
  for(const direccion of ['https://www.google.com/maps?q=9.01,-79.5','https://maps.app.goo.gl/example','9.01,-79.5',''])assert.equal(needsPlaceReference({direccion,lat:9.01,lng:-79.5}),true);
  assert.equal(needsPlaceReference({direccion:'https://www.google.com/maps?q=9.01,-79.5',referenciaLugar:'PH Las Palmeras, salón social'}),false);
  assert.equal(hasPlaceDescription('https://www.waze.com/ul?ll=9.01,-79.5'),false);
});
test('remote bookings retain a complete written address without asking for it twice',()=>{
  assert.equal(needsPlaceReference({direccion:'PH Las Palmeras, Brisas del Golf, casa 18'}),false);
  assert.equal(needsPlaceReference({direccion:'PH Prueba https://maps.app.goo.gl/example'}),false);
});
