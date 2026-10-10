const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const Module=require('node:module');
const React=require('react');
const Renderer=require('react-test-renderer');
const babel=require('@babel/core');
const {panamaToday}=require('../src/domain/date-availability.mjs');

global.IS_REACT_ACT_ENVIRONMENT=true;

test('native navigation connects clients, calendar availability, payments, expenses and finance',async()=>{
 const today=panamaToday(),month=today.slice(0,7),past=`${Number(today.slice(0,4))-1}-01-10`;
 const base='artifacts/diverty-oficial/public/data/';
 const current={cliente:'Ana',telefono:'60702108',email:'ana@example.test',fecha:today,hora:'14:00',ubicacion:'PH de prueba',estado:'Confirmado',total:100,abono:20,gastos:0,costosSeparados:true,_rev:1,servicio:'Diverty Amigo',serviciosSeleccionados:[{nombre:'Diverty Amigo',cantidad:1,precio:100,tipoCobro:'paquete',incluye:['Duración 2 horas']}]};
 const records=new Map([[base+'eventos/current',current],[base+'eventos/past',{...current,fecha:past,total:50,abono:50,estado:'Completado'}]]);
 const listeners=new Set(),storage=new Map(),alerts=[],backListeners=[],links=[];
 let nextID=0,dismissed=0,scrolled=0;
 const native={};
 for(const type of ['View','Text','TextInput','Pressable','ScrollView','KeyboardAvoidingView','ActivityIndicator'])native[type]=type;
 native.FlatList=({data,renderItem,ListHeaderComponent,ListEmptyComponent})=>React.createElement(React.Fragment,null,ListHeaderComponent,data.length?data.map((item,index)=>React.createElement(React.Fragment,{key:item.id||item.key||index},renderItem({item,index}))):ListEmptyComponent);
 native.StyleSheet={create:value=>value};native.Platform={OS:'android'};
 native.Alert={alert:(title,message,buttons)=>alerts.push({title,message,buttons})};
 native.Keyboard={dismiss:()=>dismissed++};
 native.Linking={openURL:async url=>links.push(url)};
 native.BackHandler={addEventListener:(_,callback)=>{backListeners.push(callback);return {remove:()=>{const index=backListeners.indexOf(callback);if(index>=0)backListeners.splice(index,1);}};}};
 const document=ref=>({exists:()=>records.has(ref.path),data:()=>records.get(ref.path),metadata:{fromCache:false}});
 function snapshot(ref){
  if(ref.kind==='doc')return document(ref);
  const docs=[...records.entries()].filter(([key,value])=>key.startsWith(ref.path+'/')&&(ref.constraints||[]).every(({field,operator,value:filter})=>operator==='>='?value[field]>=filter:operator==='<='?value[field]<=filter:value[field]===filter)).map(([key,value])=>({id:key.split('/').at(-1),data:()=>value}));
  return {docs,empty:docs.length===0,metadata:{fromCache:false}};
 }
 const notify=()=>listeners.forEach(({ref,callback})=>callback(snapshot(ref)));
 const firestore={
  collection:(_, ...segments)=>({kind:'collection',path:segments.join('/')}),
  doc:(first,...segments)=>segments.length?{kind:'doc',path:segments.join('/')}:{kind:'doc',path:first.path+'/new-'+(++nextID),id:'new-'+nextID},
  where:(field,operator,value)=>({field,operator,value}),
  query:(ref,...constraints)=>({...ref,constraints}),
  onSnapshot:(ref,options,callback)=>{if(typeof options==='function')callback=options;const listener={ref,callback};listeners.add(listener);callback(snapshot(ref));return()=>listeners.delete(listener);},
  getDoc:async ref=>document(ref),getDocs:async ref=>snapshot(ref),
  setDoc:async(ref,patch,options)=>{records.set(ref.path,options?.merge?{...records.get(ref.path),...patch}:patch);notify();},
  runTransaction:async(_,callback)=>{
   const writes=[];
   const result=await callback({get:async ref=>document(ref),set:(ref,patch,options)=>writes.push({ref,patch,options})});
   writes.forEach(({ref,patch,options})=>records.set(ref.path,options?.merge?{...records.get(ref.path),...patch}:patch));notify();return result;
  }
 };
 const asyncStorage={getItem:async key=>storage.get(key)||null,setItem:async(key,value)=>storage.set(key,value),removeItem:async key=>storage.delete(key)};
 const source=path.resolve(__dirname,'../src'),firebaseFile=path.join(source,'firebase.js');
 const oldLoad=Module._load,oldJS=Module._extensions['.js'];
 Module._load=function(request,parent,isMain){
  if(request==='react-native')return native;
  if(request==='firebase/firestore')return firestore;
  if(request==='firebase/auth')return {signOut:async()=>{}};
  if(request==='@react-native-async-storage/async-storage')return asyncStorage;
  if(request.endsWith('firebase')&&Module._resolveFilename(request,parent)===firebaseFile)return {db:{},auth:{currentUser:{uid:'test-admin'}},DATA_PATH:['artifacts','diverty-oficial','public','data']};
  return oldLoad.call(this,request,parent,isMain);
 };
 Module._extensions['.js']=function(module,filename){
  if(!filename.startsWith(source+path.sep))return oldJS(module,filename);
  const {code}=babel.transformSync(fs.readFileSync(filename,'utf8'),{filename,babelrc:false,configFile:false,plugins:[['@babel/plugin-transform-react-jsx',{runtime:'automatic'}],'@babel/plugin-transform-modules-commonjs']});
  module._compile(code,filename);
 };
 let view;
 const text=node=>typeof node==='string'||typeof node==='number'?String(node):Array.isArray(node)?node.map(text).join(''):node?.props?text(node.props.children):'';
 const buttons=(label,role='button')=>view.root.findAllByType('Pressable').filter(node=>node.props.accessibilityRole===role&&text(node.props.children)===label);
 const press=async(label,role='button')=>{const button=buttons(label,role)[0];assert.ok(button,`Missing ${label}`);assert.ok(!button.props.disabled,`Disabled ${label}`);await Renderer.act(async()=>{await button.props.onPress();});};
 const input=label=>view.root.findAllByType('TextInput').find(node=>node.props.accessibilityLabel===label);
 const hasText=label=>view.root.findAllByType('Text').some(node=>text(node.props.children).includes(label));
 try{
  const Workspace=require('../src/Workspace').default;
  await Renderer.act(async()=>{view=Renderer.create(React.createElement(Workspace),{createNodeMock:element=>element.type==='ScrollView'?{scrollTo:()=>scrolled++}:null});});
  assert.ok(hasText('Agenda de reservas'));
  await press('Todas / historial');assert.ok(hasText('10 de enero'));
  await press('Clientes','tab');assert.ok(hasText('2 reservas'));
  await press('Nueva reserva con este cliente');
  assert.equal(input('Nombre del cliente').props.value,'Ana');
  assert.equal(input('Teléfono').props.value,'60702108');
  assert.equal(input('Correo').props.value,'ana@example.test');
  assert.equal(input('Fecha (AAAA-MM-DD)').props.value,today);
  await press('Cancelar');await Renderer.act(async()=>alerts.at(-1).buttons.find(b=>b.text==='Descartar').onPress());
  await press('Calendario','tab');assert.ok(hasText('Web habilitada según cupos'));
  await press('Cerrar esta fecha en la web');await Renderer.act(async()=>{await alerts.at(-1).buttons.find(b=>b.text==='Cerrar fecha').onPress();});
  assert.equal(records.get(base+'config_web/fechas_cerradas').fechas[today],true);
  assert.equal(records.get(base+'config_web/web_sync').versions.config_web,1);
  assert.deepEqual(records.get(base+'eventos/current'),current);
  await press('Reabrir esta fecha');await Renderer.act(async()=>{await alerts.at(-1).buttons.find(b=>b.text==='Reabrir').onPress();});
  assert.equal(records.get(base+'config_web/fechas_cerradas').fechas[today],undefined);
  await press('Nueva reserva este día');assert.equal(input('Fecha (AAAA-MM-DD)').props.value,today);
  await press('Cancelar');await Renderer.act(async()=>alerts.at(-1).buttons.find(b=>b.text==='Descartar').onPress());
  await press('Agenda','tab');
  await Renderer.act(async()=>input('Buscar reservas').props.onChangeText('6070-2108'));
  // All/history remains selected after returning from another screen.
  assert.ok(hasText('incluye fechas anteriores'));
  const openCurrent=buttons('Ver reserva y acciones').at(-1);
  await Renderer.act(async()=>openCurrent.props.onPress());
  await press('Contactar por WhatsApp');assert.equal(links.at(-1),'https://wa.me/50760702108');
  await press('Abonos y saldo');await Renderer.act(async()=>input('Monto del abono').props.onChangeText('25'));
  await press('Guardar abono');assert.equal(records.get(base+'eventos/current').abono,45);
  await press('Volver a la reserva');await press('Gastos del evento');
  await Renderer.act(async()=>input('Monto ($)').props.onChangeText('10'));
  await press('Guardar gasto');assert.equal(records.get(base+'eventos/current').gastos,10);
  assert.equal(records.get(base+'eventos/current').gastosItems.length,1);
  assert.ok(hasText('Gasto registrado: $10.00'));assert.ok(dismissed>0);assert.ok(scrolled>0);
  await press('Volver a la reserva');assert.ok(hasText('Último gasto: $10.00'));
  await Renderer.act(async()=>{assert.equal(backListeners.at(-1)(),true);});
  assert.equal(input('Buscar reservas').props.value,'6070-2108');
  await press('Finanzas','tab');assert.ok(hasText('Ganancia estimada'));assert.ok(hasText('$90.00'));
  assert.equal(records.get(base+'eventos/current').total,100);
  assert.equal(month,today.slice(0,7));
 }finally{
  if(view)await Renderer.act(async()=>view.unmount());
  Module._load=oldLoad;Module._extensions['.js']=oldJS;
 }
});
