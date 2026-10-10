import test from 'node:test';
import assert from 'node:assert/strict';
import { closedDates, panamaToday, saveDateClosure } from '../src/domain/date-availability.mjs';

test('closures validate real dates using the Panama business day', async () => {
  assert.equal(panamaToday(new Date('2026-10-08T02:00:00Z')), '2026-10-07');
  assert.deepEqual(closedDates({fechas:{'2026-02-30':true,'2026-10-08':true,'2026-10-09':false}}), {'2026-10-08':true});
  for (const date of ['2026-02-30','2026-10-06','not-a-date']) await assert.rejects(saveDateClosure({date,closed:true,now:new Date('2026-10-07T12:00:00Z')}), /INVALID_DATE/);
});

test('concurrent closures preserve other dates and versions; reopening never deletes reservations', async () => {
  const rows = new Map([['sync',{version:7,versions:{catalogo_web:3,config_web:2}}],['event',{fecha:'2026-10-08',cliente:'Existing'}]]);
  let queue = Promise.resolve();
  const runTransaction = (_db, callback) => {
    const work = queue.then(async () => {
      const writes = new Map();
      const value = await callback({get:async ref => {assert.equal(writes.size,0);return {data:()=>rows.get(ref)};},set:(ref,data,options)=>writes.set(ref,options?.merge?{...rows.get(ref),...data}:data)});
      writes.forEach((data,ref)=>rows.set(ref,data));return value;
    });
    queue = work.catch(()=>{});return work;
  };
  const change = (date,closed) => saveDateClosure({runTransaction,db:{},datesRef:'dates',syncRef:'sync',date,closed,now:new Date('2026-10-07T12:00:00Z')});
  await Promise.all([change('2026-10-08',true),change('2026-10-09',true)]);
  assert.deepEqual(rows.get('dates').fechas,{'2026-10-08':true,'2026-10-09':true});
  await change('2026-10-08',false);
  assert.deepEqual(rows.get('dates').fechas,{'2026-10-09':true});
  assert.deepEqual(rows.get('sync').versions,{catalogo_web:3,config_web:5});
  assert.equal(rows.get('sync').version,10);
  assert.deepEqual(rows.get('event'),{fecha:'2026-10-08',cliente:'Existing'});
});
