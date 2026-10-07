import test from 'node:test';
import assert from 'node:assert/strict';
import {productOptionsForSave,productOptionsFromItem} from '../src/lib/catalog-product.mjs';
test('editing retains a product minimum, maximum, step and unit label',()=>{
 const product={tipoCobro:'unidad',cantidadMinima:50,cantidadMaxima:500,incrementoCantidad:25,unidadEtiqueta:'hot dog'};
 assert.deepEqual(productOptionsForSave({...product,...productOptionsFromItem(product)}),{...product,tipoServicio:'producto',tematica:''});
});
test('invalid quantities cannot be published and blank maximum is retained',()=>{
 const options={...productOptionsFromItem(),tipoCobro:'unidad'};
 for(const patch of [{cantidadMinima:0},{cantidadMinima:1.5},{cantidadMaxima:-1},{cantidadMinima:50,cantidadMaxima:20},{incrementoCantidad:0},{incrementoCantidad:Infinity}])assert.throws(()=>productOptionsForSave({...options,...patch}));
 assert.equal(productOptionsForSave(options).cantidadMaxima,null);
});
test('character prices are fixed and preserve their theme when editing',()=>{
 assert.deepEqual(productOptionsForSave({...productOptionsFromItem(),tipoServicio:'personaje',tipoCobro:'unidad',tematica:' Superhéroes '}),{tipoServicio:'personaje',tipoCobro:'paquete',cantidadMinima:1,cantidadMaxima:null,incrementoCantidad:1,unidadEtiqueta:'unidad',tematica:'Superhéroes'});
});
