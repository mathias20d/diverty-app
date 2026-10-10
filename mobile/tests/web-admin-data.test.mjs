import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {webForm,webPayload,themeWinner,themePreviewHTML,WEB_MENU} from '../src/web-admin-data.mjs';
test('native web menu preserves all seven official web sections and domain modules',()=>{
  assert.deepEqual(WEB_MENU.map(row=>row[3]),['categorias_web','catalogo_web','campanas_web','temas_web','galeria_web','cupones_web','config_web']);
  for(const name of ['catalog-product','theme-options'])assert.equal(fs.readFileSync(new URL(`../src/domain/${name}.mjs`,import.meta.url),'utf8'),fs.readFileSync(new URL(`../../src/lib/${name}.mjs`,import.meta.url),'utf8'));
});
test('seasonal categories keep legacy visibility and require ordered dates',()=>{
  const form=webForm('categories',{nombre:'Navidad',visible:false});assert.equal(form.visibilidad,'oculto');
  assert.equal(webPayload('categories',form).activo,false);
  assert.throws(()=>webPayload('categories',{...form,visibilidad:'temporada'}),/fechas/);
  assert.throws(()=>webPayload('categories',{...form,fechaInicio:'2026-12-25',fechaFin:'2026-12-24'}),/final/);
  assert.throws(()=>webPayload('categories',{...form,fechaInicio:'2026-02-30'}),/válidas/);
});
test('preview only talks to the official non-booking preview, and never embeds draft HTML',()=>{
  const html=themePreviewHTML('desktop');assert.ok(html.includes('width:1080px'));assert.ok(html.includes('/theme-preview.html'));assert.ok(html.includes('e.origin===origin&&e.source===frame.contentWindow'));assert.ok(html.includes("postMessage({type:'diverty:theme-preview',theme},origin)"));
});
test('catalog products reuse quantity rules and character pricing',()=>{
  const form=webForm('packages',{nombre:'Raspado',imagen:'https://example.test/photo.jpg',categoria:'comida',precio:2,tipoCobro:'unidad',cantidadMinima:20,cantidadMaxima:100,incrementoCantidad:10});
  const saved=webPayload('packages',form);assert.equal(saved.cantidadMinima,20);assert.equal(saved.tipoServicio,'producto');
  assert.throws(()=>webPayload('packages',{...form,cantidadMaxima:10}),/mínima/);
  assert.throws(()=>webPayload('packages',{...form,oferta:true,precioOriginal:1}),/original/);
  const character=webPayload('packages',{...form,tipoServicio:'personaje',tematica:'Héroes'});assert.equal(character.tipoCobro,'paquete');assert.equal(character.cantidadMaxima,null);
});
test('campaigns preserve included services and reject invalid price or periods',()=>{
  const original={titulo:'Promoción',imagen:'https://example.test/photo.jpg',incluye:['Animador','Música'],fechaInicio:'2026-12-01',fechaFin:'2026-12-31'};
  const form=webForm('campaigns',original),saved=webPayload('campaigns',form,{original});assert.deepEqual(saved.incluye,original.incluye);
  assert.equal(saved.precio,null);assert.throws(()=>webPayload('campaigns',{...form,precio:'NaN'}),/precios/);
});
test('coupon validation normalizes code and prevents impossible discounts',()=>{
  assert.deepEqual({...webPayload('coupons',{code:' fiesta ',type:'percent',discount:20,activo:true}),updatedAt:null},{code:'FIESTA',type:'percent',discount:20,activo:true,updatedAt:null});
  assert.throws(()=>webPayload('coupons',{code:'fiesta',type:'percent',discount:101}),/descuento/);
});
test('themes keep defaults, apply seasonal winner and validate colors before publishing',()=>{
  const original={nombre:'Navidad',isDefault:true,activo:true},form=webForm('themes',original),saved=webPayload('themes',form,{original});assert.equal(saved.isDefault,true);assert.equal(saved.activo,true);assert.equal(saved.themeVersion,2);
  assert.throws(()=>webPayload('themes',{...form,colorPrimary:'invalid'}),/colores/);
  const themes=[{id:'normal',isDefault:true},{id:'navidad',fechaInicio:'2026-12-01',fechaFin:'2026-12-31'}];
  assert.equal(themeWinner(themes,{modo:'automatico'},'2026-12-10'),'navidad');assert.equal(themeWinner(themes,{modo:'automatico'},'2027-01-10'),'normal');assert.equal(themeWinner(themes,{modo:'manual',temaManualActivo:'normal'},'2026-12-10'),'normal');
});
