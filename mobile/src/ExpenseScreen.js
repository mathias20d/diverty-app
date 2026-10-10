import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,Keyboard,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {collection,doc,onSnapshot,runTransaction,setDoc} from 'firebase/firestore';
import {auth,db,DATA_PATH} from './firebase';
import {panamaToday} from './domain/date-availability.mjs';
import {EXPENSE_CATEGORIES,expenseOperation,expenseSummary,recordExpense} from './expenses.mjs';
const money=value=>`$${Number(value||0).toFixed(2)}`;
function Action({title,onPress,disabled}){return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={[s.button,disabled&&{opacity:.5}]}><Text style={s.buttonText}>{title}</Text></Pressable>;}
const message=e=>({INVALID_EXPENSE:'Revisa el monto (hasta dos decimales), la categoría y la fecha AAAA-MM-DD.',INVALID_COSTS:'Los costos guardados necesitan revisión en la app actual.',EXPENSE_CONFLICT:'Este registro necesita revisión antes de continuar.',EVENT_NOT_FOUND:'La reserva ya no existe.'}[e.message]||'No se pudo confirmar el gasto. Revisa tu conexión y reintenta; se conserva el mismo registro para evitar duplicarlo.');
export default function ExpenseScreen({event,onClose}){
 const [current,setCurrent]=useState(event),[loading,setLoading]=useState(true),[amount,setAmount]=useState(''),[category,setCategory]=useState('personal'),[detail,setDetail]=useState(''),[date,setDate]=useState(panamaToday()),[error,setError]=useState(''),[pending,setPending]=useState(null),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);
 const [showAll,setShowAll]=useState(false),[savedMessage,setSavedMessage]=useState('');
 const scroll=useRef(null),lock=useRef(false),key=`diverty-expense:${auth.currentUser.uid}:${event.id}`;
 useEffect(()=>{let active=true;AsyncStorage.getItem(key).then(value=>{if(!active)return;if(value){const operation=expenseOperation(JSON.parse(value));setPending(operation);setAmount(String(operation.monto));setCategory(operation.categoria);setDetail(operation.detalle);setDate(operation.fecha);}setReady(true);}).catch(()=>{if(active)setError('No pudimos preparar el gasto pendiente. Cierra y vuelve a abrir.');});return()=>{active=false;};},[key]);
 useEffect(()=>{setLoading(true);return onSnapshot(doc(db,...DATA_PATH,'eventos',event.id),snap=>{if(snap.exists())setCurrent({...snap.data(),id:event.id});else setError('La reserva ya no existe.');setLoading(false);},()=>{setError('No pudimos actualizar los costos. Revisa tu conexión.');setLoading(false);});},[event.id,retry]);
 let totals;try{totals=expenseSummary(current);}catch{totals=null;}
 const history=(Array.isArray(current.gastosItems)?current.gastosItems:[]).filter(Boolean).slice().reverse();
 async function submit(){
  if(lock.current)return;
  let operation=pending;
  try{if(!operation)operation=expenseOperation({id:`gas-${doc(collection(db,...DATA_PATH,'eventos')).id}`,monto:amount,categoria:category,detalle:detail,fecha:date,createdAt:new Date().toISOString()});}catch(e){setError(message(e));return;}
  lock.current=true;setBusy(true);setError('');setSavedMessage('');
  try{
   await AsyncStorage.setItem(key,JSON.stringify(operation));setPending(operation);
   const saved=await recordExpense({runTransaction,db,ref:doc(db,...DATA_PATH,'eventos',event.id),operation});setCurrent({...saved,id:event.id});
   await AsyncStorage.removeItem(key).catch(()=>{});setPending(null);setAmount('');setDetail('');
   setSavedMessage(`Gasto registrado: ${money(operation.monto)}. Puedes verlo en el historial y en la agenda.`);
   setShowAll(false);Keyboard.dismiss();scroll.current?.scrollTo({y:0,animated:true});
   setDoc(doc(db,...DATA_PATH,'config_web','syncBus'),{entityType:'evento',entityId:event.id,action:'update',deviceId:'diverty-native',changedAt:new Date().toISOString(),nonce:operation.id}).catch(()=>{});
   Alert.alert('Gasto registrado',`${money(operation.monto)} guardados. Gastos internos: ${money(expenseSummary(saved).internal)}.`);
  }catch(e){if(['INVALID_EXPENSE','INVALID_COSTS','EVENT_NOT_FOUND'].includes(e.message)){try{await AsyncStorage.removeItem(key);setPending(null);}catch{}}setError(message(e));}finally{lock.current=false;setBusy(false);}
 }
 return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}><ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
 <Text style={s.heading}>Gastos del evento</Text><Text style={s.title}>{current.cliente}</Text><Text>{current.fecha} · {current.servicio}</Text>
 {savedMessage?<View style={s.card}><Text accessibilityRole="alert" style={{color:'#14805e',fontWeight:'700'}}>{savedMessage}</Text></View>:null}
 <View style={s.card}>{totals?<><Text>Gastos internos: {money(totals.internal)}</Text><Text>Proveedores: {money(totals.providers)}</Text><Text style={s.title}>Costo total: {money(totals.total)}</Text><Text style={s.title}>Ganancia estimada: {money(totals.profit)}</Text></>:<Text>Costos por revisar en la app actual.</Text>}{loading&&<ActivityIndicator color="#7042d9"/>}</View>
 <Text style={s.title}>Gastos registrados ({history.length})</Text>
 {history.length===0?<Text>Todavía no hay gastos individuales registrados para esta reserva.</Text>:null}
 {(showAll?history:history.slice(0,3)).map((item,index)=><View key={item.id||index} style={s.card}><Text style={s.title}>{money(item.monto)}</Text><Text>{EXPENSE_CATEGORIES.find(c=>c.id===item.categoria)?.label||'Otro gasto'} · {item.fecha||'Fecha no registrada'}</Text>{item.detalle?<Text>{item.detalle}</Text>:null}</View>)}
 {history.length>3?<Action title={showAll?'Mostrar solo los últimos 3':`Ver todos los gastos (${history.length})`} onPress={()=>setShowAll(value=>!value)}/>:null}
 <View style={s.card}><Text style={s.title}>Registrar gasto</Text>{pending&&<Text>Hay un gasto por confirmar. Reintentar usa el mismo registro para evitar duplicarlo.</Text>}
 <Text>Categoría</Text><View style={s.categories}>{EXPENSE_CATEGORIES.map(c=><Pressable accessibilityRole="button" key={c.id} disabled={busy||!!pending} style={[s.chip,category===c.id&&s.selected]} onPress={()=>setCategory(c.id)}><Text style={category===c.id?s.chosen:s.label}>{c.label}</Text></Pressable>)}</View>
 {[['Monto ($)',amount,setAmount,'decimal-pad'],['Fecha (AAAA-MM-DD)',date,setDate,'default'],['Detalle del gasto',detail,setDetail,'default']].map(([label,value,change,keyboard])=><View key={label}><Text>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={change} editable={!busy&&!pending} keyboardType={keyboard} style={s.input}/></View>)}
 <Action title={busy?'Registrando…':pending?'Reintentar gasto':'Guardar gasto'} onPress={submit} disabled={busy||loading||!ready||!totals}/></View>
 {error?<View><Text accessibilityRole="alert" style={s.error}>{error}</Text><Action title="Actualizar costos" onPress={()=>{setError('');setRetry(n=>n+1);}} disabled={busy}/></View>:null}
 <Text>Los gastos antiguos pueden no tener registros individuales. Los proveedores se muestran por separado y se administran desde la app actual.</Text>
 <Action title="Volver a la agenda" disabled={busy} onPress={onClose}/>
 </ScrollView></KeyboardAvoidingView>;
}
const s=StyleSheet.create({page:{padding:22,paddingBottom:40,gap:16},heading:{fontSize:26,fontWeight:'800',color:'#202034'},title:{fontSize:18,fontWeight:'700',color:'#202034'},card:{padding:18,borderRadius:18,backgroundColor:'#fff',gap:12},input:{borderWidth:1,borderColor:'#dbd9e7',borderRadius:12,padding:14,fontSize:16},button:{backgroundColor:'#7042d9',padding:15,borderRadius:12},buttonText:{color:'#fff',textAlign:'center',fontWeight:'700'},categories:{flexDirection:'row',flexWrap:'wrap',gap:8},chip:{padding:10,borderRadius:10,backgroundColor:'#f2eff8'},selected:{backgroundColor:'#7042d9'},chosen:{color:'#fff',fontWeight:'700'},label:{color:'#686878'},error:{color:'#b42342'}});
