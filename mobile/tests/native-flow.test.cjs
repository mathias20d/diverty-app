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
 records.set(base+'configuracion/clientesOcultos',{clients:['Cliente oculto']});
 records.set(base+'eventos/hidden',{...current,cliente:'Cliente oculto',fecha:'2024-01-01',telefono:'60000000',total:0,abono:0});
 records.set(base+'configuracion/serviciosCustom',{paquetes:[{id:'catalog-native',nombre:'Servicio de catálogo',precio:40,tipoCobro:'paquete'}]});
 records.set(base+'configuracion/contador_factura',{ultimo:7});
 records.set(base+'configuracion/contador_cotizacion',{ultimo:3});
 records.set(base+'configuracion/contador_contrato',{ultimo:2});
 records.set(base+'proveedores/provider1',{nombre:'Proveedor de prueba',telefono:'60000000',activo:true,servicios:[{id:'s1',nombre:'Pintacaritas',costo:30,activo:true}]});
 records.set(base+'categorias_web/comida',{nombre:'Comida',orden:1,activo:true,visible:true,custom:'preserved'});
 const files=[],shares=[],previews=[],clipboard=[];
 const listeners=new Set(),storage=new Map(),alerts=[],backListeners=[],links=[];
 let nextID=0,dismissed=0,scrolled=0,lostAcknowledgement=false;
 const native={};
 for(const type of ['View','Text','TextInput','Pressable','ScrollView','KeyboardAvoidingView','ActivityIndicator','Image','Switch'])native[type]=type;
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
 let catalogFailure=false,printFailure=false,shareFailure=false;
 const firestore={
  increment:value=>({__increment:value}),
  writeBatch:()=>{
   const writes=[];
   const merge=(previous,patch)=>Object.fromEntries(Object.entries({...previous,...patch}).map(([key,value])=>[key,value?.__increment?Number(previous?.[key]||0)+value.__increment:value&&typeof value==='object'&&!Array.isArray(value)?merge(previous?.[key]||{},value):value]));
   return {set:(ref,patch,options)=>writes.push({ref,patch,options}),delete:ref=>writes.push({ref,remove:true}),commit:async()=>{writes.forEach(({ref,patch,options,remove})=>remove?records.delete(ref.path):records.set(ref.path,merge(options?.merge?records.get(ref.path)||{}:{},patch)));notify();}};
  },
  collection:(_, ...segments)=>({kind:'collection',path:segments.join('/')}),
  doc:(first,...segments)=>segments.length?{kind:'doc',path:segments.join('/'),id:segments.at(-1)}:{kind:'doc',path:first.path+'/new-'+(++nextID),id:'new-'+nextID},
  where:(field,operator,value)=>({field,operator,value}),
  query:(ref,...constraints)=>({...ref,constraints}),
  onSnapshot:(ref,options,callback,onError)=>{if(typeof options==='function'){onError=callback;callback=options;}if(catalogFailure&&ref.path.endsWith('configuracion/serviciosCustom')){onError?.({code:'unavailable'});return()=>{};}const listener={ref,callback};listeners.add(listener);callback(snapshot(ref));return()=>listeners.delete(listener);},
  getDoc:async ref=>document(ref),getDocs:async ref=>snapshot(ref),
  setDoc:async(ref,patch,options)=>{records.set(ref.path,options?.merge?{...records.get(ref.path),...patch}:patch);notify();},
  runTransaction:async(_,callback)=>{
   const writes=[];
   const result=await callback({get:async ref=>document(ref),set:(ref,patch,options)=>writes.push({ref,patch,options}),delete:ref=>writes.push({ref,remove:true})});
   writes.forEach(({ref,patch,options,remove})=>remove?records.delete(ref.path):records.set(ref.path,options?.merge?{...records.get(ref.path),...patch}:patch));notify();if(lostAcknowledgement){lostAcknowledgement=false;throw new Error('NETWORK_ACK_LOST');}return result;
  }
 };
 const asyncStorage={getItem:async key=>storage.get(key)||null,setItem:async(key,value)=>storage.set(key,value),removeItem:async key=>storage.delete(key)};
 firestore.getDocFromServer=firestore.getDoc;firestore.getDocsFromServer=firestore.getDocs;
 const source=path.resolve(__dirname,'../src'),firebaseFile=path.join(source,'firebase.js');
 const oldLoad=Module._load,oldJS=Module._extensions['.js'];
 Module._load=function(request,parent,isMain){
  if(request==='react-native')return native;
  if(request==='expo-linear-gradient')return {LinearGradient:'View'};
  if(request==='expo-image-picker')return {launchImageLibraryAsync:async()=>({canceled:true})};
  if(request==='expo-clipboard')return {setStringAsync:async value=>clipboard.push(value)};
  if(request==='react-native-webview')return {WebView:'WebView'};
  if(request==='expo-print')return {printToFileAsync:async value=>{if(printFailure)throw new Error('PRINT_TEST_FAILURE');files.push(value);return {uri:'file:///host/Print/denied-document.pdf',base64:Buffer.from('%PDF-1.4 test').toString('base64')};},printAsync:async value=>previews.push(value)};
  if(request==='expo-file-system')return {Paths:{cache:{uri:'file:///experience/cache/'}},File:class {constructor(directory,name){this.uri=directory.uri+name;this.exists=false;this.size=0;}create(){this.exists=true;}write(value,options){assert.equal(options.encoding,'base64');this.size=Buffer.from(value,'base64').length;}}};
  if(request==='expo-sharing')return {isAvailableAsync:async()=>true,shareAsync:async(uri,options)=>{if(shareFailure)throw new Error('SHARE_TEST_FAILURE');assert.ok(uri.startsWith('file:///experience/cache/'));shares.push({uri,options});}};
  if(request==='firebase/firestore')return firestore;
  if(request==='firebase/functions')return {getFunctions:(_,region)=>{assert.equal(region,'us-central1');return {};},httpsCallable:(_,name)=>{assert.equal(name,'confirmWebBooking');return async payload=>{assert.equal(payload.id,'central-test');throw new Error('CENTRAL_TEST_FAILURE');};}};
  if(request==='firebase/auth')return {signOut:async()=>{}};
  if(request==='@react-native-async-storage/async-storage')return asyncStorage;
  if(request.endsWith('firebase')&&Module._resolveFilename(request,parent)===firebaseFile)return {db:{},auth:{currentUser:{uid:'test-admin'}},ADMIN_UID:'test-admin',DATA_PATH:['artifacts','diverty-oficial','public','data']};
  return oldLoad.call(this,request,parent,isMain);
 };
 Module._extensions['.js']=function(module,filename){
  if(!filename.startsWith(source+path.sep))return oldJS(module,filename);
  const {code}=babel.transformSync(fs.readFileSync(filename,'utf8'),{filename,babelrc:false,configFile:false,plugins:[['@babel/plugin-transform-react-jsx',{runtime:'automatic'}],'@babel/plugin-transform-modules-commonjs']});
  module._compile(code,filename);
 };
 let view;
 const text=node=>typeof node==='string'||typeof node==='number'?String(node):Array.isArray(node)?node.map(text).join(''):node?.props?text(node.props.children):'';
 const visible=node=>{for(let current=node;current;current=current.parent){if(current.props?.accessibilityElementsHidden)return false;}return true;};
 const buttons=(label,role='button')=>view.root.findAllByType('Pressable').filter(node=>visible(node)&&node.props.accessibilityRole===role&&(text(node.props.children)===label||node.props.accessibilityLabel===label));
 const press=async(label,role='button')=>{const button=buttons(label,role)[0];assert.ok(button,`Missing ${label}`);assert.ok(!button.props.disabled,`Disabled ${label}`);await Renderer.act(async()=>{await button.props.onPress();});};
 const input=label=>view.root.findAllByType('TextInput').find(node=>node.props.accessibilityLabel===label);
 const hasText=label=>view.root.findAllByType('Text').some(node=>text(node.props.children).includes(label));
 try{
  const Workspace=require('../src/Workspace').default;
  await Renderer.act(async()=>{view=Renderer.create(React.createElement(Workspace),{createNodeMock:element=>element.type==='ScrollView'?{scrollTo:()=>scrolled++}:null});});
  assert.ok(hasText('Hola Diverty'));
  await press('Ajustes','tab');assert.ok(hasText('Personal disponible'));await press('Meta mensual');await Renderer.act(async()=>input('Meta mensual').props.onChangeText('2000'));await press('Guardar ajustes');await press('Inicio','tab');assert.ok(hasText('$2000.00'));
  await press('Agenda','tab');assert.ok(hasText('Agenda de reservas'));
  await press('Todas / historial');assert.ok(hasText('10 de enero'));
  await press('Clientes','tab');assert.ok(hasText('2 reservas'));assert.ok(!hasText('Cliente oculto'));
  await press('Nueva reserva con este cliente');
  assert.equal(input('Nombre del cliente').props.value,'Ana');
  assert.equal(input('Teléfono').props.value,'60702108');
  assert.equal(input('Correo').props.value,'ana@example.test');
  assert.equal(input('Fecha (AAAA-MM-DD)').props.value,today);
  await Renderer.act(async()=>input('Buscar servicio').props.onChangeText('catálogo'));assert.ok(buttons('Servicio de catálogo · $40').length);
  await press('Cancelar');await Renderer.act(async()=>alerts.at(-1).buttons.find(b=>b.text==='Descartar').onPress());
  await press('Agenda','tab');await press('Calendario');assert.ok(hasText('Web habilitada según cupos'));
  await press('Cotización');assert.ok(hasText('COTIZACIÓN'));await press('Volver a la reserva');
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
  await press('Proveedores','tab');await press('Nuevo proveedor');
  await Renderer.act(async()=>input('Nombre del proveedor').props.onChangeText('Nuevo proveedor test'));
  await press('Añadir servicio del proveedor');
  await Renderer.act(async()=>{input('Nombre del servicio 1').props.onChangeText('Globos');input('Costo del servicio 1').props.onChangeText('20');});
  lostAcknowledgement=true;await press('Guardar proveedor');assert.equal(input('Nombre del proveedor').props.editable,false);
  await press('Reintentar proveedor');assert.ok(hasText('Nuevo proveedor test'));
  assert.equal([...records].filter(([path])=>path.startsWith(base+'proveedores/')).length,2);
  await press('Agenda','tab');await Renderer.act(async()=>buttons('Ver reserva y acciones').at(-1).props.onPress());
  await press('Proveedores del evento');await press('Proveedor de prueba');await press('Pintacaritas · $30.00');
  await press('Guardar asignación');assert.ok(records.get(base+'eventos/current').subcontratos,view.root.findAllByType('Text').map(node=>text(node.props.children)).join(' | '));assert.equal(records.get(base+'eventos/current').subcontratos[0].costo,30);assert.equal(records.get(base+'eventos/current').gastos,10);
  await press('Marcar proveedor pagado');await Renderer.act(async()=>{await alerts.at(-1).buttons.find(button=>button.text==='Sí, ya pagué').onPress();});
  assert.equal(records.get(base+'eventos/current').subcontratos[0].pagado,true);assert.equal(records.get(base+'eventos/current').abono,45);
  await press('Volver a la reserva');await press('Facturas y cotizaciones');
  assert.ok(buttons('Compartir PDF')[0].props.disabled);
  assert.ok(hasText('Revisa los datos de empresa'));await press('Guardar datos y habilitar PDF');assert.ok(hasText('Documento listo para generar'));await press('Compartir PDF');
  assert.ok(shares.at(-1).uri.startsWith('file:///experience/cache/FAC-00008-'));assert.equal(shares.at(-1).options.mimeType,'application/pdf');assert.ok(files.at(-1).html.includes('2 h'));
  assert.equal(records.get(base+'eventos/current').numeroFactura,'FAC-00008');
  await press('Vista previa / imprimir');assert.equal(previews.length,1);assert.equal(records.get(base+'configuracion/contador_factura').ultimo,8);
  await press('Cotización');await press('Compartir PDF');assert.equal(records.get(base+'eventos/current').numeroCotizacion,'COT-00004');
  await press('Contrato');await press('Compartir PDF');assert.ok(files.at(-1).html.includes('12. Aceptación.'));assert.ok(files.at(-1).html.includes('Firma del cliente'));assert.equal(records.get(base+'eventos/current').numeroContrato,'CON-00003');await press('Compartir PDF');assert.equal(records.get(base+'configuracion/contador_contrato').ultimo,3);
  await press('Volver a la reserva');await press('Volver');await press('Finanzas','tab');assert.ok(hasText('$60.00'));
  await press('Agenda','tab');await Renderer.act(async()=>input('Buscar reservas').props.onChangeText('60702108'));await Renderer.act(async()=>buttons('Factura').at(-1).props.onPress());assert.ok(hasText('FACTURA COMERCIAL'));assert.ok(hasText('FAC-00008'));await press('Volver a la reserva');
  assert.ok(records.has(base+'configuracion/syncBus'));assert.ok(!records.has(base+'config_web/syncBus'));
  assert.equal(records.get(base+'eventos/current').total,100);
  assert.equal(month,today.slice(0,7));
  const unchangedEvent=JSON.stringify(records.get(base+'eventos/current'));
  await press('Administrar página web');assert.ok(hasText('Página Web'));
  await press('Catálogos');await press('Editar');await Renderer.act(async()=>input('Nombre del catálogo').props.onChangeText('Comida y bebidas'));await press('Guardar catálogo');
  assert.equal(records.get(base+'categorias_web/comida').nombre,'Comida y bebidas');assert.equal(records.get(base+'categorias_web/comida').custom,'preserved');
  assert.equal(records.get(base+'config_web/web_sync').versions.categorias_web,1);assert.equal(records.get(base+'config_web/web_sync').versions.config_web,2);
  await press('Copiar enlace directo');assert.equal(new URL(clipboard.at(-1)).searchParams.get('categoria'),'comida');
  await press('Volver a Administrar página web');await press('Servicios y personajes');await press('Nuevo servicio');await press('Personaje');
  await Renderer.act(async()=>{input('Nombre del servicio').props.onChangeText('Personaje test');input('Precio').props.onChangeText('40');input('Imagen principal').props.onChangeText('https://example.test/photo.jpg');});
  await press('Guardar y agregar otro personaje');assert.equal(input('Nombre del servicio').props.value,'');assert.equal(records.get(base+'categorias_web/personajes').nombre,'Personajes');
  const catalogRows=[...records].filter(([key])=>key.startsWith(base+'catalogo_web/'));assert.equal(catalogRows.length,1);assert.equal(catalogRows[0][1].tipoServicio,'personaje');assert.equal(catalogRows[0][1].tipoCobro,'paquete');
  await press('Cerrar edición');await press('Volver a Administrar página web');await press('Banner y ajustes');
  await Renderer.act(async()=>input('Texto del banner').props.onChangeText('Promoción test'));await press('Guardar ajustes');assert.equal(records.get(base+'config_web/global').bannerText,'Promoción test');
  await press('Cupones');await press('Nuevo cupón');await Renderer.act(async()=>{input('Código').props.onChangeText('fiesta');input('Descuento').props.onChangeText('10');});await press('Guardar cupón');assert.equal(records.get(base+'cupones_web/FIESTA').discount,10);
  await press('Eliminar');await Renderer.act(async()=>alerts.at(-1).buttons.find(button=>button.text==='Eliminar').onPress());assert.ok(!records.has(base+'cupones_web/FIESTA'));
  await press('Volver a Administrar página web');await press('Temas');await press('Nuevo tema');await Renderer.act(async()=>input('Nombre del tema').props.onChangeText('Nuevo tema'));await press('Cerrar edición');assert.ok(input('Nombre del tema'));await Renderer.act(async()=>alerts.at(-1).buttons.find(button=>button.text==='Descartar').onPress());
  await press('Volver a Administrar página web');await press('Volver al administrador');assert.ok(hasText('Agenda de reservas'));assert.equal(JSON.stringify(records.get(base+'eventos/current')),unchangedEvent);
  await press('Inicio','tab');await press('Cotizar');assert.ok(hasText('Nueva cotización'));
  await Renderer.act(async()=>{input('Nombre del cliente').props.onChangeText('Cotización nativa');input('Teléfono').props.onChangeText('60001111');input('Hora (HH:MM)').props.onChangeText('09:00');input('Dirección / PH / barriada').props.onChangeText('Panamá');});
  await press('Agregar servicio manual');await Renderer.act(async()=>input('Precio unitario ($) servicio 1').props.onChangeText('40'));await press('Guardar reserva');
  assert.ok([...records.values()].some(value=>value.cliente==='Cotización nativa'&&value.estado==='Cotización'));
  await press('Agenda','tab');await Renderer.act(async()=>input('Buscar reservas').props.onChangeText('60001111'));await Renderer.act(async()=>buttons('Ver reserva y acciones').at(-1).props.onPress());await press('Editar reserva');
  const quoteAlerts=alerts.length;await Renderer.act(async()=>input('Hora (HH:MM)').props.onChangeText('14:00'));await press('Guardar reserva');
  const editedQuote=[...records.values()].find(value=>value.cliente==='Cotización nativa'&&value._rev===2);assert.equal(editedQuote.estado,'Cotización');assert.equal(editedQuote.hora,'14:00');assert.ok(!records.has(base+'disponibilidad_web/'+editedQuote.id));assert.ok(!alerts.slice(quoteAlerts).some(alert=>alert.title==='Revisar horario'));
  const closedBefore=structuredClone(records.get(base+'config_web/fechas_cerradas'));records.set(base+'config_web/fechas_cerradas',{fechas:{'2027-02-12':true}});await press('Editar reserva');await Renderer.act(async()=>input('Fecha (AAAA-MM-DD)').props.onChangeText('2027-02-12'));await press('Guardar reserva');assert.equal(records.get(base+'eventos/'+editedQuote.id).fecha,'2027-02-12');assert.equal(records.get(base+'eventos/'+editedQuote.id).estado,'Cotización');assert.ok(!records.has(base+'disponibilidad_web/'+editedQuote.id));records.set(base+'config_web/fechas_cerradas',closedBefore);
  const quoteSource=structuredClone(records.get(base+'eventos/'+editedQuote.id));await press('Duplicar evento');assert.equal(input('Precio unitario ($) servicio 1').props.value,'40');await Renderer.act(async()=>input('Nombre del cliente').props.onChangeText('Copia cotización'));await press('Guardar reserva');const quoteCopy=[...records.values()].find(value=>value.cliente==='Copia cotización'&&value._rev===1);assert.ok(quoteCopy);assert.notEqual(quoteCopy.id,editedQuote.id);assert.equal(quoteCopy.estado,'Cotización');assert.equal(quoteCopy.abono,0);assert.equal(quoteCopy.total,40);assert.deepEqual(records.get(base+'eventos/'+editedQuote.id),quoteSource);assert.ok(!records.has(base+'disponibilidad_web/'+quoteCopy.id));await press('Volver');
  await Renderer.act(async()=>input('Buscar reservas').props.onChangeText('Copia cotización'));await Renderer.act(async()=>buttons('Ver reserva y acciones').at(-1).props.onPress());await press('Convertir a reserva');assert.ok(hasText('Convertir cotización a reserva'));
  records.set(base+'config_web/fechas_cerradas',{fechas:{'2027-02-12':true}});await press('Guardar reserva');assert.ok(hasText('La fecha está cerrada. Elige otro día.'));assert.equal(records.get(base+'eventos/'+quoteCopy.id).estado,'Cotización');
  await Renderer.act(async()=>{input('Fecha (AAAA-MM-DD)').props.onChangeText('2027-03-11');input('Comentarios del evento').props.onChangeText('Comentario ficticio');});await press('Guardar reserva');assert.equal(records.get(base+'eventos/'+quoteCopy.id).estado,'Pendiente');assert.equal(records.get(base+'eventos/'+quoteCopy.id).comentarios,'Comentario ficticio');assert.equal(records.get(base+'eventos/'+quoteCopy.id)._rev,2);assert.ok(records.get(base+'disponibilidad_web/slot_2027-03-11_14-00').reservationIds.includes(quoteCopy.id));assert.deepEqual(records.get(base+'eventos/'+editedQuote.id),quoteSource);
  await press('Eliminar registro');assert.ok(records.has(base+'eventos/'+quoteCopy.id));await Renderer.act(async()=>alerts.at(-1).buttons.find(button=>button.text==='Eliminar').onPress());for(const collection of ['eventos','disponibilidad_web','portal_busqueda','reservas_cliente'])assert.ok(!records.has(base+collection+'/'+quoteCopy.id));assert.ok(!records.has(base+'disponibilidad_web/slot_2027-03-11_14-00'));records.set(base+'config_web/fechas_cerradas',closedBefore);
  await press('Ajustes','tab');await press('Personal disponible');await Renderer.act(async()=>input('animadores').props.onChangeText('0'));await press('Guardar ajustes');assert.equal(records.get(base+'config_web/global').recursosDisponibles.animadores,0);assert.equal(records.get(base+'config_web/global').bannerText,'Promoción test');
  const webEvent={id:'web-native-test',cliente:'Solicitud nativa',telefono:'60002222',origen:'Web Directa',estado:'Pendiente',fecha:today,hora:'23:00',direccion:'PH Prueba',servicio:'Animador',total:100,abono:20,transporte:10,_rev:1,ownerUid:'test-customer',resourceRequirements:{animadores:1,payasos:0,durationMinutes:120}};
  records.set(base+'eventos/'+webEvent.id,webEvent);await Renderer.act(async()=>notify());await press('Inicio','tab');await press('Solicitudes web (1)');await Renderer.act(async()=>buttons('Revisar solicitud').at(-1).props.onPress());assert.ok(hasText('Solicitud nativa'));
  await Renderer.act(async()=>input('Transporte de la solicitud').props.onChangeText('15,25'));await press('Confirmar transporte');assert.equal(records.get(base+'eventos/'+webEvent.id).total,105.25);assert.equal(records.get(base+'eventos/'+webEvent.id).abono,20);
  await press('Aceptar reserva');await Renderer.act(async()=>alerts.at(-1).buttons.find(button=>button.text==='Aceptar').onPress());assert.ok(hasText('No hay suficiente personal'));assert.equal(records.get(base+'eventos/'+webEvent.id).estado,'Pendiente');
  records.set(base+'config_web/global',{...records.get(base+'config_web/global'),recursosDisponibles:{animadores:3,payasos:1}});await Renderer.act(async()=>notify());await press('Aceptar reserva');await Renderer.act(async()=>alerts.at(-1).buttons.find(button=>button.text==='Aceptar').onPress());assert.equal(records.get(base+'eventos/'+webEvent.id).estado,'Confirmado');assert.equal(records.get(base+'reservas_cliente/'+webEvent.id).estado,'Confirmado');assert.equal(records.get(base+'disponibilidad_web/'+webEvent.id).resourceRequirements.animadores,1);assert.ok(records.has(base+'portal_busqueda/'+webEvent.id));
  const actions=require('../src/request-actions');const central={...webEvent,id:'central-test',_rev:1,centralBookingVersion:1};records.set(base+'eventos/central-test',central);records.set(base+'config_web/global',{centralBookingValidation:true});await assert.rejects(actions.confirmRequest(central),/CENTRAL_TEST_FAILURE/);assert.equal(records.get(base+'eventos/central-test').estado,'Pendiente');
  await Renderer.act(async()=>actions.rejectRequest(central));assert.equal(records.get(base+'eventos/central-test').estado,'Rechazada');assert.ok(!records.has(base+'disponibilidad_web/central-test'));assert.equal(records.get(base+'reservas_cliente/central-test').estado,'Rechazada');
  const legacySanta={...webEvent,id:'legacy-santa',fecha:'2026-12-24',hora:'10:00',esNavidad:true,_rev:1,servicio:'Entregas de Nochebuena'},occupiedSanta={...legacySanta,id:'occupied-santa',estado:'Confirmado',hora:'10:30',santaAsignado:'Santa 1'};
  records.set(base+'eventos/legacy-santa',legacySanta);records.set(base+'eventos/occupied-santa',occupiedSanta);records.set(base+'config_web/global',{centralBookingValidation:true,capacidadSanta:2});await assert.rejects(actions.confirmRequest(legacySanta,'Santa 1'),/SANTA_ROUTE_CONFLICT/);assert.equal(records.get(base+'eventos/legacy-santa').estado,'Pendiente');await assert.rejects(actions.confirmRequest(legacySanta,'Santa 3'),/SANTA_UNAVAILABLE/);
  await Renderer.act(async()=>actions.confirmRequest(legacySanta,'Santa 2'));assert.equal(records.get(base+'eventos/legacy-santa').santaAsignado,'Santa 2');assert.equal(records.get(base+'eventos/legacy-santa').abono,20);assert.equal(records.get(base+'reservas_cliente/legacy-santa').estado,'Confirmado');assert.equal(records.get(base+'disponibilidad_web/legacy-santa').santaAsignado,'Santa 2');assert.ok(records.has(base+'portal_busqueda/legacy-santa'));await assert.rejects(actions.confirmRequest(legacySanta,'Santa 2'),/ALREADY_PROCESSED/);
  for(const id of ['legacy-santa','occupied-santa'])for(const collection of ['eventos','reservas_cliente','disponibilidad_web','portal_busqueda'])records.delete(base+collection+'/'+id);
  const latest=records.get(base+'eventos/'+webEvent.id);await assert.rejects(actions.updateRequest({...latest,id:webEvent.id},'transport','0'),/ALREADY_PROCESSED/);assert.equal(records.get(base+'eventos/'+webEvent.id).total,105.25);
  records.set(base+'eventos/deleted-review',{...webEvent,id:'deleted-review'});await Renderer.act(async()=>notify());await Renderer.act(async()=>buttons('Revisar solicitud').at(-1).props.onPress());records.delete(base+'eventos/deleted-review');await Renderer.act(async()=>notify());assert.ok(hasText('procesada o eliminada'));
  await press('Volver a solicitudes');await press('Volver al administrador');await press('Agenda','tab');await Renderer.act(async()=>input('Buscar reservas').props.onChangeText('60702108'));await Renderer.act(async()=>buttons('Ver reserva y acciones').at(-1).props.onPress());await press('Abonos y saldo');
  const originalPayments=structuredClone(records.get(base+'eventos/current').pagosItems);await press('Corregir recibido');await Renderer.act(async()=>input('Importe corregido').props.onChangeText('10'));lostAcknowledgement=true;await press('Guardar corrección');await Renderer.act(async()=>alerts.at(-1).buttons.find(button=>button.text==='Guardar').onPress());assert.ok(hasText('Corrección pendiente'));await press('Reintentar corrección');assert.equal(records.get(base+'eventos/current').abono,10);assert.equal(records.get(base+'eventos/current').total,100);assert.deepEqual(records.get(base+'eventos/current').pagosItems,originalPayments);assert.equal(records.get(base+'eventos/current').ajustesFinancieros.length,1);
  await press('Volver a la reserva');await press('Gastos del evento');const originalExpenses=structuredClone(records.get(base+'eventos/current').gastosItems),originalProviders=structuredClone(records.get(base+'eventos/current').subcontratos);await press('Corregir gastos internos');await Renderer.act(async()=>input('Importe corregido').props.onChangeText('5'));await press('Guardar corrección');await Renderer.act(async()=>alerts.at(-1).buttons.find(button=>button.text==='Guardar').onPress());assert.equal(records.get(base+'eventos/current').gastos,5);assert.deepEqual(records.get(base+'eventos/current').gastosItems,originalExpenses);assert.deepEqual(records.get(base+'eventos/current').subcontratos,originalProviders);assert.ok(hasText('Gastos corregidos:'));
  await press('Volver a la reserva');catalogFailure=true;await press('Facturas y cotizaciones');assert.ok(buttons('Compartir PDF')[0].props.disabled);await press('Usar servicios guardados en la reserva');assert.ok(!buttons('Compartir PDF')[0].props.disabled);await press('Compartir PDF');assert.equal(shares.at(-1).options.mimeType,'application/pdf');assert.ok(files.at(-1).html.includes('FAC-00008'));assert.equal(records.get(base+'configuracion/contador_factura').ultimo,8);
  printFailure=true;await press('Compartir PDF');assert.ok(alerts.at(-1).message.includes('PRINT_TEST_FAILURE'));assert.equal(records.get(base+'configuracion/contador_factura').ultimo,8);printFailure=false;shareFailure=true;await press('Compartir PDF');assert.ok(alerts.at(-1).message.includes('El PDF se creó'));assert.ok(alerts.at(-1).message.includes('SHARE_TEST_FAILURE'));shareFailure=false;await press('Contrato');await press('Compartir PDF');assert.ok(files.at(-1).html.includes('CON-00003'));assert.equal(records.get(base+'configuracion/contador_contrato').ultimo,3);
  await press('Volver a la reserva');await press('Proveedores del evento');records.set(base+'configuracion/contador_subcontrato',{ultimo:4});await press('Subcontrato del evento');await press('Compartir PDF');assert.ok(files.at(-1).html.includes('SUB-00005'));assert.ok(files.at(-1).html.includes('SUBCONTRATO DEL EVENTO'));assert.equal(records.get(base+'configuracion/contador_subcontrato').ultimo,5);await press('Compartir PDF');assert.equal(records.get(base+'configuracion/contador_subcontrato').ultimo,5);
  await press('Volver');await press('Volver a la reserva');await press('Volver');await press('Proveedores','tab');await press('Contrato marco');await press('Compartir PDF');assert.ok(files.at(-1).html.includes('ACUERDO MARCO DE PROVEEDOR'));assert.ok(files.at(-1).html.includes('SUB-00006'));assert.equal(records.get(base+'configuracion/contador_subcontrato').ultimo,6);
  await press('Volver');await press('Inicio','tab');
  const christmas={cliente:'Entrega prueba',telefono:'60000000',fecha:'2026-12-24',hora:'14:00',estado:'Confirmado',esNavidad:true,santaAsignado:'Santa 1',servicio:'Entregas de Nochebuena',direccion:'PH Navidad',total:90,abono:20,_rev:1,ownerUid:'customer-xmas'};
  records.set(base+'eventos/xmas',christmas);records.set(base+'config_web/global',{centralBookingValidation:true,capacidadSanta:2});await Renderer.act(async()=>notify());await press('Operación Navidad');assert.ok(hasText('24 y 25 de diciembre'));await press('14:00 · Entrega prueba');await press('Asignar Santa 2');assert.equal(records.get(base+'eventos/xmas').santaAsignado,'Santa 2');assert.equal(records.get(base+'disponibilidad_web/xmas').santaAsignado,'Santa 2');assert.equal(records.get(base+'reservas_cliente/xmas').estado,'Confirmado');
  await press('Ruta pendiente de Santa 2');assert.ok(links.at(-1).includes('PH%20Navidad'));await press('Marcar entrega realizada');assert.equal(records.get(base+'eventos/xmas').estado,'Completado');assert.equal(records.get(base+'eventos/xmas').abono,20);assert.equal(records.get(base+'reservas_cliente/xmas').estado,'Completado');assert.equal(buttons('Ruta pendiente de Santa 2').length,0);await press('Volver a pendiente');assert.equal(records.get(base+'eventos/xmas').estado,'Confirmado');
  await press('Eliminar reserva y liberar cupo');assert.ok(records.has(base+'eventos/xmas'));await Renderer.act(async()=>alerts.at(-1).buttons.find(button=>button.text==='Eliminar').onPress());assert.ok(!records.has(base+'eventos/xmas'));assert.ok(!records.has(base+'disponibilidad_web/xmas'));assert.ok(!records.has(base+'reservas_cliente/xmas'));assert.ok(!records.has(base+'portal_busqueda/xmas'));assert.ok(records.get(base+'booking_control/2026-12-24').revision>=4);
  await press('Finalizar temporada y ocultar módulo');await Renderer.act(async()=>alerts.at(-1).buttons.find(button=>button.text==='Ocultar').onPress());assert.equal(buttons('Operación Navidad').length,0);await press('Ajustes','tab');await press('Herramientas del sistema');records.set(base+'configuracion/migracion_segura_v2',{completada:true});await press('Preparar actualización');assert.equal(alerts.at(-1).title,'Preparar actualización');await Renderer.act(async()=>alerts.at(-1).buttons.find(button=>button.text==='Preparar').onPress());assert.equal(alerts.at(-1).title,'Preparación completada');await press('Mostrar Operación Navidad');await press('Inicio','tab');assert.equal(buttons('Operación Navidad').length,1);
  await press('Agenda','tab');await Renderer.act(async()=>input('Buscar reservas').props.onChangeText('60702108'));await Renderer.act(async()=>buttons('Ver reserva y acciones').at(-1).props.onPress());
  records.set(base+'eventos/current',{...records.get(base+'eventos/current'),ownerUid:'customer-current'});await Renderer.act(async()=>notify());
  const beforeStatus=structuredClone(records.get(base+'eventos/current'));await press('Iniciar preparación');assert.equal(records.get(base+'eventos/current').estado,'Preparando');assert.ok(records.get(base+'eventos/current').preparingAt);await press('Salir al evento');await press('Ya llegamos');await press('Marcar evento realizado');assert.equal(records.get(base+'eventos/current').estado,'Completado');assert.equal(records.get(base+'reservas_cliente/current').estado,'Completado');assert.deepEqual(records.get(base+'eventos/current').pagosItems,beforeStatus.pagosItems);assert.deepEqual(records.get(base+'eventos/current').subcontratos,beforeStatus.subcontratos);
  await press('Cancelar reserva');assert.equal(records.get(base+'eventos/current').estado,'Completado');await Renderer.act(async()=>alerts.at(-1).buttons.find(button=>button.text==='Cancelar reserva').onPress());assert.equal(records.get(base+'eventos/current').estado,'Cancelado');assert.equal(records.get(base+'eventos/current').abono,beforeStatus.abono);assert.ok(!records.has(base+'disponibilidad_web/current'));assert.equal(records.get(base+'reservas_cliente/current').estado,'Cancelado');
  await press('Volver');await press('Inicio','tab');await press('Nueva Reserva');
  await Renderer.act(async()=>{input('Nombre del cliente').props.onChangeText('Reserva sincronizada');input('Teléfono').props.onChangeText('60009988');input('Fecha (AAAA-MM-DD)').props.onChangeText('2027-02-10');input('Hora (HH:MM)').props.onChangeText('09:00');input('Dirección / PH / barriada').props.onChangeText('PH ficticio');});
  await press('Agregar servicio manual');await Renderer.act(async()=>input('Precio unitario ($) servicio 1').props.onChangeText('40'));await press('Guardar reserva');
  const created=[...records.values()].find(value=>value.cliente==='Reserva sincronizada'&&value._rev===1);assert.ok(created);
  assert.equal(records.get(base+'disponibilidad_web/'+created.id).fecha,'2027-02-10');assert.ok(records.has(base+'portal_busqueda/'+created.id));assert.ok(records.get(base+'disponibilidad_web/slot_2027-02-10_09-00').reservationIds.includes(created.id));
  await press('Agenda','tab');await Renderer.act(async()=>input('Buscar reservas').props.onChangeText('60009988'));await Renderer.act(async()=>buttons('Ver reserva y acciones').at(-1).props.onPress());await press('Editar reserva');
  await Renderer.act(async()=>input('Fecha (AAAA-MM-DD)').props.onChangeText('2027-02-11'));await press('Guardar reserva');
  assert.equal(records.get(base+'eventos/'+created.id)._rev,2);assert.equal(records.get(base+'eventos/'+created.id).abono,0);assert.equal(records.get(base+'disponibilidad_web/'+created.id).fecha,'2027-02-11');assert.ok(!records.has(base+'disponibilidad_web/slot_2027-02-10_09-00'));assert.ok(records.get(base+'disponibilidad_web/slot_2027-02-11_09-00').reservationIds.includes(created.id));
  const quote=[...records.values()].find(value=>value.cliente==='Cotización nativa'&&value.estado==='Cotización');assert.ok(!records.has(base+'disponibilidad_web/'+quote.id));
  await press('Editar reserva');records.set(base+'eventos/'+created.id,{...records.get(base+'eventos/'+created.id),deletedLocally:true});await Renderer.act(async()=>notify());await press('Guardar reserva');assert.ok(hasText('La reserva ya no existe.'));assert.equal(records.get(base+'eventos/'+created.id)._rev,2);assert.equal(records.get(base+'eventos/'+created.id).deletedLocally,true);
 }finally{
  if(view)await Renderer.act(async()=>view.unmount());
  Module._load=oldLoad;Module._extensions['.js']=oldJS;
 }
});

