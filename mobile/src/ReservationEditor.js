import React,{useEffect,useRef,useState} from 'react';
import {Alert,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {collection,doc,getDoc,getDocs,query,setDoc,where} from 'firebase/firestore';
import {runTransaction} from './booking-transactions';
import {db,DATA_PATH} from './firebase';
import {addReservationLine,editReservationLine,reservationServices,unitPrice} from './domain/reservation-lines.mjs';
import {panamaToday} from './domain/date-availability.mjs';
import {mergeReservation,reservationPatch} from './reservation-data.mjs';
import useScreenBack from './useScreenBack';
import {canConvertQuote} from './reservation-management.mjs';
import {commercialPatch,saveCustomService} from './commercial-tools.mjs';
const initial={cliente:'',telefono:'',email:'',hora:'',ubicacion:'',transporte:'0',serviciosSeleccionados:[]};
function Action({title,onPress,disabled}){return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={[s.action,disabled&&{opacity:.5}]}><Text style={s.actionText}>{title}</Text></Pressable>;}
export default function ReservationEditor({original,initialValues={},converting=false,onClose,onSaved}) {
 const [form,setForm]=useState(()=>({...initial,fecha:panamaToday(),...initialValues,...original,serviciosSeleccionados:(original?.serviciosSeleccionados||initialValues.serviciosSeleccionados||[]).map(line=>({...line,cantidad:line.cantidad??1,precioOriginal:unitPrice(line)}))})),[catalog,setCatalog]=useState([]),[clients,setClients]=useState([]),[search,setSearch]=useState(''),[clientSearch,setClientSearch]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const quoteMode=!converting&&/^cot/i.test(String(original?.estado||initialValues.estado||''));
 const creatingQuote=!original&&quoteMode;
 const saving=useRef(false),saveId=useRef(original?.id||doc(collection(db,...DATA_PATH,'eventos')).id);
 const cancel=()=>Alert.alert('Cerrar formulario','¿Descartar los cambios sin guardar?',[{text:'Seguir editando',style:'cancel'},{text:'Descartar',style:'destructive',onPress:onClose}]);
 useScreenBack(cancel,busy);
 useEffect(()=>{let active=true;getDoc(doc(db,...DATA_PATH,'configuracion','serviciosCustom')).then(snap=>{if(active)setCatalog(snap.data()?.paquetes||[]);}).catch(()=>{if(active)setError('No se pudo cargar el catálogo. Puedes agregar un servicio manual.');});return()=>{active=false;};},[]);
 async function searchClients(){
  if(!clientSearch.trim())return;
  try{const result=await getDocs(query(collection(db,...DATA_PATH,'eventos'),where('telefono','==',clientSearch.trim())));setClients(result.docs.map(d=>d.data()).filter((r,i,all)=>all.findIndex(x=>x.cliente===r.cliente)===i));if(result.empty)setError('No encontramos ese teléfono. Puedes escribir los datos.');}catch{setError('No se pudo buscar el cliente. Puedes escribir sus datos.');}
 }
 function change(key,value){setForm(f=>({...f,[key]:value}));}
 function lines(next){setForm(f=>reservationServices(f,next));}
 function add(item){lines(addReservationLine(form.serviciosSeleccionados,item));setSearch('');}
 async function storeService(line){if(saving.current)return;saving.current=true;setBusy(true);setError('');try{const item=await saveCustomService({runTransaction,db,ref:doc(db,...DATA_PATH,'configuracion','serviciosCustom'),line,id:'c-'+Date.now()});setCatalog(rows=>rows.some(row=>row.id===item.id)?rows:[...rows,item]);Alert.alert('Servicio guardado','Disponible para futuras reservas.');}catch(e){setError(e.message||'No se pudo guardar el servicio.');}finally{saving.current=false;setBusy(false);}}
 async function save(){
  if(saving.current)return;
  let patch;try{patch={...reservationPatch(form,original||{}),...commercialPatch(form,quoteMode,panamaToday())};}catch(e){setError(e.message);return;}
  saving.current=true;setBusy(true);setError('');
  try{
   const ref=doc(db,...DATA_PATH,'eventos',saveId.current),now=new Date().toISOString();
   if(!quoteMode&&(converting || !original || original.fecha!==patch.fecha || original.hora!==patch.hora)) {
    const day=await getDocs(query(collection(db,...DATA_PATH,'eventos'),where('fecha','==',patch.fecha)));
    const minute=time=>{const [h,m]=String(time).split(':').map(Number);return h*60+m;};
    const nearby=day.docs.some(d=>d.id!==saveId.current&&!d.data().deletedLocally&&!/cot|cancel/i.test(d.data().estado||'')&&d.data().hora&&Math.abs(minute(d.data().hora)-minute(patch.hora))<180);
    if(nearby){const allowed=await new Promise(resolve=>Alert.alert('Revisar horario','Hay otro evento con menos de 3 horas de diferencia. ¿Guardar de todos modos?',[{text:'Volver',style:'cancel',onPress:()=>resolve(false)},{text:'Guardar',onPress:()=>resolve(true)}],{cancelable:false}));if(!allowed)return;patch.colisionAprobada=true;}
   }

   await runTransaction(db,async tx=>{
    const current=await tx.get(ref);
    const closures=await tx.get(doc(db,...DATA_PATH,'config_web','fechas_cerradas'));
    if(!quoteMode&&(converting||!original||original.fecha!==patch.fecha)&&closures.data()?.fechas?.[patch.fecha]===true)throw new Error('La fecha está cerrada. Elige otro día.');
    if(converting){if(!current.exists()||!canConvertQuote(current.data()))throw new Error('La cotización cambió o ya fue convertida. Vuelve a abrirla.');patch.estado='Pendiente';}
    if(original){if(!current.exists()||current.data().deletedLocally)throw new Error('La reserva ya no existe.');const next=mergeReservation(current.data(),patch,original._rev,now);tx.set(ref,next,{merge:true});}
    else {if(current.exists())return;tx.set(ref,{...patch,id:saveId.current,createdAt:now,updatedAt:now,_rev:1,estado:creatingQuote?patch.estado:'Pendiente',abono:0,deletedLocally:false,costosSeparados:true});}
   });
   setDoc(doc(db,...DATA_PATH,'configuracion','syncBus'),{entityType:'evento',entityId:saveId.current,action:'update',deviceId:'diverty-native',changedAt:now,nonce:saveId.current+'-'+now}).catch(()=>{});
   onSaved();
  }catch(e){setError(e.message==='EDIT_CONFLICT'?'La reserva cambió en otro dispositivo. Cierra y vuelve a abrirla antes de guardar.':e.code?'No se pudo guardar. Revisa tu conexión y vuelve a intentarlo.':e.message);}finally{saving.current=false;setBusy(false);}
 }
 return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
 <Text style={s.heading}>{converting?'Convertir cotización a reserva':original?'Editar reserva':creatingQuote?'Nueva cotización':'Nueva reserva'}</Text>
 {!original&&<View style={s.card}><Text style={s.label}>Usar un cliente guardado</Text><TextInput accessibilityLabel="Teléfono para buscar cliente" placeholder="Teléfono del cliente" value={clientSearch} onChangeText={setClientSearch} keyboardType="phone-pad" style={s.input}/><Action title="Buscar cliente" onPress={searchClients}/>{clients.map((c,i)=><Action key={i} title={c.cliente} onPress={()=>{setForm(f=>({...f,cliente:c.cliente||'',telefono:c.telefono||'',email:c.email||''}));setClients([]);}}/>)}</View>}
 <View style={s.card}>{[['cliente','Nombre del cliente'],['telefono','Teléfono'],['email','Correo'],['ruc','RUC / Identificación'],['tipoEvento','Tipo de evento'],['ninos','Cantidad de niños'],['direccion','Enlace de Maps / dirección detallada'],['referenciaLugar','Referencia del lugar'],['fecha','Fecha (AAAA-MM-DD)'],['hora','Hora (HH:MM)'],['ubicacion','Dirección / PH / barriada'],['transporte','Transporte ($)']].map(([key,label])=><View key={key}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={String(form[key]??'')} onChangeText={v=>change(key,v)} autoCapitalize={key==='email'?'none':'sentences'} keyboardType={key==='telefono'?'phone-pad':key==='transporte'?'decimal-pad':key==='email'?'email-address':'default'} style={s.input}/></View>)}</View>
 <View style={s.card}><Text style={s.heading}>Productos y servicios</Text><TextInput accessibilityLabel="Buscar servicio" placeholder="Buscar en el catálogo" value={search} onChangeText={setSearch} style={s.input}/>{search.trim()&&catalog.filter(c=>String(c.nombre||'').toLowerCase().includes(search.toLowerCase())).slice(0,15).map((c,i)=><Action key={c.id||i} title={`${c.nombre} · $${c.precio}`} onPress={()=>add(c)}/>)}<Action title="Agregar servicio manual" onPress={()=>add({id:Date.now().toString(),nombre:'Nuevo servicio',precio:0,tipoCobro:'paquete'})}/>
 {form.serviciosSeleccionados.map((line,index)=><View key={index} style={s.line}><Text style={s.label}>Nombre</Text><TextInput accessibilityLabel={`Nombre servicio ${index+1}`} style={s.input} value={line.nombre} onChangeText={v=>lines(form.serviciosSeleccionados.map((x,i)=>i===index?{...x,nombre:v}:x))}/><View style={s.modes}>{[['paquete','Paquete'],['unidad','Unidades'],['hora','Horas']].map(([mode,label])=><Pressable key={mode} accessibilityRole="button" onPress={()=>lines(form.serviciosSeleccionados.map((x,i)=>i===index?editReservationLine(x,{tipoCobro:mode}):x))}><Text style={line.tipoCobro===mode?s.selected:s.label}>{label}</Text></Pressable>)}</View>{[['cantidad','Cantidad / horas',line.cantidad],['precioOriginal','Precio unitario ($)',unitPrice(line)]].map(([key,label,value])=><View key={key}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={`${label} servicio ${index+1}`} keyboardType="decimal-pad" style={s.input} value={String(value??'')} onChangeText={v=>lines(form.serviciosSeleccionados.map((x,i)=>i===index?editReservationLine(x,{[key]:v.replace(',','.')||''}):x))}/></View>)}<Text style={s.label}>Descripción del servicio</Text><TextInput accessibilityLabel={`Descripción servicio ${index+1}`} multiline style={s.input} value={String(line.descripcion||'')} onChangeText={value=>lines(form.serviciosSeleccionados.map((x,i)=>i===index?{...x,descripcion:value}:x))}/><Text style={s.label}>Incluye (uno por línea)</Text><TextInput accessibilityLabel={`Incluye servicio ${index+1}`} multiline style={s.input} value={Array.isArray(line.incluye)?line.incluye.join('\n'):String(line.incluye||'')} onChangeText={value=>lines(form.serviciosSeleccionados.map((x,i)=>i===index?{...x,incluye:value.split('\n')}:x))}/><Action title="Guardar servicio en catálogo" disabled={busy} onPress={()=>storeService(line)}/><Text style={s.total}>Subtotal: ${Number(line.precio||0).toFixed(2)}</Text><Action title="Quitar servicio" onPress={()=>lines(form.serviciosSeleccionados.filter((_,i)=>i!==index))}/></View>)}</View>
 <View style={s.card}>{quoteMode?<><Text style={s.label}>Datos de la cotización</Text><TextInput accessibilityLabel="Vigencia de cotización (días)" style={s.input} keyboardType="number-pad" value={String(form.vigenciaCotizacion??7)} onChangeText={value=>change('vigenciaCotizacion',value)}/><TextInput accessibilityLabel="Fecha de emisión (AAAA-MM-DD)" style={s.input} value={String(form.fechaEmisionCotizacion||panamaToday())} onChangeText={value=>change('fechaEmisionCotizacion',value)}/>{['Cotización','Cot. Aprobada'].map(state=><Action key={state} title={state} disabled={busy} onPress={()=>change('estado',state)}/>)}<Text>Estado: {form.estado||'Cotización'}</Text></>:null}</View><Text style={s.label}>Comentarios</Text><TextInput accessibilityLabel="Comentarios del evento" multiline style={s.input} value={String(form.comentarios||'')} onChangeText={value=>change('comentarios',value)}/>
 <Text style={s.total}>Total: ${Number(reservationServices(form,form.serviciosSeleccionados).total||0).toFixed(2)}</Text>
 {original&&<Text>Abonos conservados: ${Number(original.abono||0).toFixed(2)}</Text>}
 {error?<Text accessibilityRole="alert" style={{color:'#b42342'}}>{error}</Text>:null}
 <Action title={busy?'Guardando…':'Guardar reserva'} onPress={save} disabled={busy}/><Action title="Cancelar" disabled={busy} onPress={cancel}/>
 </ScrollView></KeyboardAvoidingView>;
}
const s=StyleSheet.create({page:{padding:22,paddingBottom:40,gap:14},heading:{fontSize:24,fontWeight:'800',color:'#202034'},card:{backgroundColor:'#fff',borderRadius:18,padding:16,gap:12},label:{fontSize:14,fontWeight:'700',color:'#555365',marginBottom:6},input:{borderWidth:1,borderColor:'#dbd9e7',borderRadius:12,padding:12,fontSize:16,color:'#202034'},action:{backgroundColor:'#7042d9',borderRadius:12,padding:14,marginTop:6},actionText:{color:'#fff',textAlign:'center',fontWeight:'700'},line:{borderTopWidth:1,borderColor:'#e5e2ef',paddingTop:16,gap:8},modes:{flexDirection:'row',justifyContent:'space-between',padding:12},selected:{color:'#7042d9',fontWeight:'900'},total:{fontSize:20,fontWeight:'800',color:'#7042d9'}});
