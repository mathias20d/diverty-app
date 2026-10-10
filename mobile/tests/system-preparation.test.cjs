const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),babel=require('@babel/core');
test('manual system preparation reuses web reconciliation, restores projections and counters, and retries safely',async()=>{
 const source=path.resolve(__dirname,'../src'),file=path.join(source,'system-preparation.js'),oldLoad=Module._load,oldJS=Module._extensions['.js'];
 const base='artifacts/diverty-oficial/public/data/',records=new Map(),user={uid:'admin'},auth={currentUser:user};
 let offline=false,failBatch=false,reads=0,commits=0,maxBatch=0;
 const ref=p=>({path:p,id:p.split('/').at(-1)}),snap=r=>({id:r.id,ref:r,exists:()=>records.has(r.path),data:()=>structuredClone(records.get(r.path))});
 const write=(r,value,options)=>records.set(r.path,options?.merge?{...records.get(r.path),...structuredClone(value)}:structuredClone(value));
 const sdk={doc:(_, ...parts)=>ref(parts.join('/')),collection:(_, ...parts)=>ref(parts.join('/')),
  getDocFromServer:async r=>{reads++;if(offline)throw new Error('OFFLINE');return snap(r);},
  getDocsFromServer:async r=>{reads++;if(offline)throw new Error('OFFLINE');return {docs:[...records.keys()].filter(p=>p.startsWith(r.path+'/')&&!p.slice(r.path.length+1).includes('/')).map(p=>snap(ref(p)))};},
  writeBatch:()=>{const queue=[];return {set:(...args)=>queue.push(['set',...args]),delete:r=>queue.push(['delete',r]),commit:async()=>{maxBatch=Math.max(maxBatch,queue.length);if(failBatch){failBatch=false;throw new Error('BATCH_FAILURE');}commits++;for(const [kind,r,v,o]of queue)kind==='delete'?records.delete(r.path):write(r,v,o);}};},
  runTransaction:async(_,fn)=>{const queue=[];await fn({get:async r=>snap(r),set:(...args)=>queue.push(args)});for(const args of queue)write(...args);}};
 Module._load=function(request,parent,isMain){if(request==='firebase/firestore')return sdk;if(request.endsWith('firebase')&&parent?.filename.startsWith(source+path.sep))return {db:{},auth,ADMIN_UID:'admin',DATA_PATH:base.split('/').filter(Boolean)};return oldLoad.call(this,request,parent,isMain);};
 Module._extensions['.js']=function(module,filename){if(!filename.startsWith(source+path.sep))return oldJS(module,filename);module._compile(babel.transformSync(fs.readFileSync(filename,'utf8'),{filename,babelrc:false,configFile:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code,filename);};
 const load=()=>{delete require.cache[file];return require(file).prepareDivertyData;};
 try{
  const web=fs.readFileSync(path.resolve(__dirname,'../../src/App.jsx'),'utf8');const start=web.indexOf('async function prepareDivertyData()');const routine=web.slice(start,web.indexOf('// --- 2.',start)).trim();assert.ok(fs.readFileSync(file,'utf8').replace(/\r/g,'').includes(routine.replace(/\r/g,'')),'web preparation routine must remain identical');
  user.uid='wrong';await assert.rejects(load()(),/ADMIN_REQUIRED/);assert.equal(reads,0);user.uid='admin';offline=true;await assert.rejects(load()(),/OFFLINE/);assert.equal(commits,0);offline=false;
  records.set(base+'config_web/global',{capacidadSimultanea:4,capacidadSanta:2});
  records.set(base+'configuracion/contador_factura',{ultimo:80});
  records.set(base+'eventos/normal',{cliente:'Prueba',telefono:'60009900',ownerUid:'customer',fecha:'2027-01-01',hora:'10:00',estado:'Confirmado',total:50,abono:10,numeroFactura:'FAC-00012',numeroContrato:'CON-00009'});
  records.set(base+'eventos/quote',{fecha:'2027-01-01',hora:'10:00',estado:'Cotización',numeroCotizacion:'COT-00015'});
  records.set(base+'eventos/cancel',{fecha:'2027-01-01',hora:'10:00',estado:'Cancelado'});
  records.set(base+'eventos/santa',{cliente:'Santa ficticio',telefono:'60001122',fecha:'2026-12-24',hora:'11:00',estado:'Confirmado',esNavidad:true,santaAsignado:'Santa 1'});
  for(let i=0;i<180;i++)records.set(base+'eventos/extra-'+i,{fecha:'2027-01-02',hora:'12:00',estado:'Confirmado'});
  for(const id of ['orphan','slot_1999-01-01_10-00','quote','cancel'])records.set(base+'disponibilidad_web/'+id,{count:99});
  const eventsBefore=[...records].filter(([p])=>p.startsWith(base+'eventos/'));
  failBatch=true;const prepare=load();await assert.rejects(prepare(),/BATCH_FAILURE/);assert.ok(!records.has(base+'configuracion/migracion_segura_v2'));await prepare();
  assert.deepEqual([...records].filter(([p])=>p.startsWith(base+'eventos/')),eventsBefore);assert.equal(records.get(base+'reservas_cliente/normal').abono,'10');assert.ok(records.has(base+'portal_busqueda/normal'));assert.equal(records.get(base+'disponibilidad_web/normal').hora,'10:00');
  for(const id of ['orphan','slot_1999-01-01_10-00','quote','cancel'])assert.ok(!records.has(base+'disponibilidad_web/'+id));
  assert.equal(records.get(base+'disponibilidad_web/slot_2027-01-01_10-00').capacity,4);assert.deepEqual(records.get(base+'disponibilidad_web/slot_2027-01-01_10-00').reservationIds,['normal']);assert.equal(records.get(base+'disponibilidad_web/slot_santa_2026-12-24_11-00').capacity,2);assert.equal(records.get(base+'disponibilidad_web/slot_2027-01-02_12-00').count,180);
  assert.equal(records.get(base+'configuracion/contador_factura').ultimo,80);assert.equal(records.get(base+'configuracion/contador_contrato').ultimo,9);assert.equal(records.get(base+'configuracion/contador_cotizacion').ultimo,15);assert.equal(records.get(base+'config_web/disponibilidad').lista,true);assert.ok(maxBatch<=500);
  const finishedReads=reads;await prepare();assert.equal(reads,finishedReads);const finishedCommits=commits;await load()();assert.equal(commits,finishedCommits);
 }finally{Module._load=oldLoad;Module._extensions['.js']=oldJS;}
});
