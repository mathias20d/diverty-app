import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {portalIndex} from '../src/lib/customer-portal.mjs';

const source=readFileSync(new URL('../src/lib/portal-sync.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function prepareCustomerPortal','function prepareCustomerPortal');
const base='artifacts/diverty-oficial/public/data/';
function fixture({fail=false}={}) {
  const rows=new Map(Array.from({length:51},(_,i)=>[base+'eventos/e'+String(i).padStart(3,'0'),{cliente:'María Pérez',telefono:'+507 6000-0000'}]));
  let pages=0,transactions=0;
  const ref=(_db,...parts)=>({id:parts.at(-1),path:parts.join('/')});
  const snapshot=r=>({id:r.id,exists:()=>rows.has(r.path),data:()=>rows.get(r.path)});
  const context={portalIndex,setTimeout,doc:ref,collection:ref,documentId:()=>null,orderBy:()=>({}),limit:n=>({limit:n}),startAfter:row=>({after:row.id}),query:(ref,...filters)=>({...ref,filters}),
    getDoc:async r=>snapshot(r),setDoc:async(r,data)=>rows.set(r.path,structuredClone(data)),
    getDocs:async r=>{
      pages++;
      const after=r.filters.find(f=>f.after)?.after;
      const docs=[...rows.keys()].filter(key=>key.startsWith(base+'eventos/')&&(!after||key.split('/').at(-1)>after)).sort().slice(0,50).map(path=>snapshot({id:path.split('/').at(-1),path}));
      // An administrator edits and deletes records after the page was read.
      if(pages===1){rows.set(base+'eventos/e000',{cliente:'Ana López',telefono:'6123-4567'});rows.delete(base+'eventos/e001');}
      return {docs,size:docs.length,empty:!docs.length};
    },
    runTransaction:async(_db,callback)=>{
      transactions++;
      if(fail){fail=false;throw new Error('Network unavailable');}
      const writes=[];
      await callback({get:async r=>{assert.equal(writes.length,0);return snapshot(r);},set:(r,data)=>writes.push(()=>rows.set(r.path,structuredClone(data))),delete:r=>writes.push(()=>rows.delete(r.path))});
      writes.forEach(write=>write());
    }
  };
  vm.createContext(context);vm.runInContext(source+'\nthis.prepare=prepareCustomerPortal;',context);
  return {rows,prepare:context.prepare,pages:()=>pages,transactions:()=>transactions};
}

test('migration paginates old reservations, rereads concurrent edits/deletes and shares work between callers',async()=>{
  const f=fixture(),db={};
  const first=f.prepare(db,'diverty-oficial');assert.equal(f.prepare(db,'diverty-oficial'),first);
  await first;
  assert.equal(f.pages(),2);
  assert.deepEqual(f.rows.get(base+'portal_busqueda/e000'),{nombreKey:'ana lopez',telefonoKey:'61234567'});
  assert.equal(f.rows.has(base+'portal_busqueda/e001'),false);
  assert.equal(f.rows.has(base+'portal_busqueda/e050'),true);
  assert.equal(f.rows.get(base+'configuracion/migracion_portal_v1').done,true);
  await f.prepare(db,'diverty-oficial');assert.equal(f.pages(),2);
});

test('a failed migration never declares completion and can retry',async()=>{
  const f=fixture({fail:true}),db={};
  await assert.rejects(f.prepare(db,'diverty-oficial'),/Network unavailable/);
  assert.equal(f.rows.has(base+'configuracion/migracion_portal_v1'),false);
  await f.prepare(db,'diverty-oficial');
  assert.equal(f.rows.get(base+'configuracion/migracion_portal_v1').done,true);
  assert.equal(f.transactions(),2);
});
