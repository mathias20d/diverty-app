import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {collection,doc,onSnapshot,runTransaction,setDoc} from 'firebase/firestore';
import {auth,db,DATA_PATH} from './firebase';
import {panamaToday} from './domain/date-availability.mjs';
import {paymentAmount,paymentSummary,recordPayment} from './payments.mjs';
import useScreenBack from './useScreenBack';
const money=value=>`$${Number(value||0).toFixed(2)}`;
function Action({title,onPress,disabled}){return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={[s.button,disabled&&{opacity:.5}]}><Text style={s.buttonText}>{title}</Text></Pressable>;}
const errorText=error=>({INVALID_PAYMENT:'Escribe un monto mayor que cero con hasta dos decimales.',PAYMENT_EXCEEDS_BALANCE:'El saldo cambió o el abono es mayor que lo pendiente. Revisa el saldo actual.',EVENT_NOT_FOUND:'Esta reserva ya no existe.',INVALID_FINANCES:'Los importes de esta reserva necesitan revisión en la app actual.',PAYMENT_CONFLICT:'Este registro de pago necesita revisión antes de continuar.'}[error.message]||'No se pudo confirmar el abono. Revisa la conexión y pulsa Reintentar; no se duplicará el mismo registro.');
export default function PaymentScreen({event,onClose}){
 const [current,setCurrent]=useState(event),[loading,setLoading]=useState(true),[amount,setAmount]=useState(''),[method,setMethod]=useState('Transferencia'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[pending,setPending]=useState(null),[storageReady,setStorageReady]=useState(false),[retry,setRetry]=useState(0);
 const lock=useRef(false),ref=doc(db,...DATA_PATH,'eventos',event.id),key=`diverty-payment:${auth.currentUser.uid}:${event.id}`;
 useScreenBack(onClose,busy);
 useEffect(()=>{let active=true;AsyncStorage.getItem(key).then(value=>{if(!active)return;if(value){const operation=JSON.parse(value);setPending(operation);setAmount(String(operation.monto));setMethod(operation.metodo);}setStorageReady(true);}).catch(()=>{if(active)setError('No pudimos preparar el registro de pago. Cierra y vuelve a abrir.');});return()=>{active=false;};},[key]);
 useEffect(()=>{setLoading(true);return onSnapshot(doc(db,...DATA_PATH,'eventos',event.id),snap=>{if(snap.exists()){setCurrent({...snap.data(),id:event.id});setLoading(false);}else{setError('La reserva ya no existe.');setLoading(false);}},()=>{setError('No se pudo actualizar el saldo. Revisa tu conexión.');setLoading(false);});},[event.id,retry]);
 let summary;try{summary=paymentSummary(current);}catch{summary=null;}
 async function submit(){
  if(lock.current)return;
  let operation=pending;
  try{if(!operation){const value=paymentAmount(amount);operation={id:`pago-${doc(collection(db,...DATA_PATH,'eventos')).id}`,monto:value,metodo:method,fecha:panamaToday(),createdAt:new Date().toISOString()};}}catch(e){setError(errorText(e));return;}
  lock.current=true;setBusy(true);setError('');
  try{
   await AsyncStorage.setItem(key,JSON.stringify(operation));setPending(operation);
   const saved=await recordPayment({runTransaction,db,ref,operation});setCurrent({...saved,id:event.id});
   // A failed local cleanup must not turn a confirmed payment into an error.
   await AsyncStorage.removeItem(key).catch(()=>{});setPending(null);setAmount('');
   setDoc(doc(db,...DATA_PATH,'config_web','syncBus'),{entityType:'evento',entityId:event.id,action:'update',deviceId:'diverty-native',changedAt:new Date().toISOString(),nonce:operation.id}).catch(()=>{});
   Alert.alert('Abono registrado',`${money(operation.monto)} recibidos. Saldo pendiente: ${money(paymentSummary(saved).balance)}.`);
  }catch(e){
   if(['INVALID_PAYMENT','PAYMENT_EXCEEDS_BALANCE','EVENT_NOT_FOUND','INVALID_FINANCES'].includes(e.message)){
    try{await AsyncStorage.removeItem(key);setPending(null);}catch{}
   }
   setError(errorText(e));
  }finally{lock.current=false;setBusy(false);}
 }
 return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
 <Text style={s.heading}>Abonos y saldo</Text><Text style={s.client}>{current.cliente}</Text><Text>{current.fecha} · {current.servicio}</Text>
 <View style={s.card}>{summary?<><Text>Total de la reserva: {money(summary.total)}</Text><Text>Recibido: {money(summary.received)}</Text><Text style={s.balance}>Pendiente: {money(summary.balance)}</Text></>:<Text>Importes por revisar en la app actual.</Text>}{loading&&<ActivityIndicator color="#7042d9"/>}</View>
 {summary&&(summary.balance>0||pending)&&<View style={s.card}><Text style={s.client}>Registrar abono</Text>{pending&&<Text>Hay un registro por confirmar. Reintentar conserva el mismo pago y evita duplicarlo.</Text>}<TextInput accessibilityLabel="Monto del abono" placeholder="Monto recibido" style={s.input} keyboardType="decimal-pad" value={amount} editable={!busy&&!pending} onChangeText={setAmount}/><View style={s.methods}>{['Transferencia','Yappy','Efectivo','Otro'].map(value=><Pressable accessibilityRole="button" disabled={busy||!!pending} key={value} onPress={()=>setMethod(value)}><Text style={method===value?s.selected:s.method}>{value}</Text></Pressable>)}</View><Action title={busy?'Registrando…':pending?'Reintentar abono':'Guardar abono'} onPress={submit} disabled={busy||!storageReady||loading}/></View>}
 {summary&&summary.balance===0&&!pending&&<Text style={s.selected}>Esta reserva está pagada por completo.</Text>}
 {error?<View><Text accessibilityRole="alert" style={s.error}>{error}</Text><Action title="Actualizar saldo" onPress={()=>{setError('');setRetry(n=>n+1);}} disabled={busy}/></View>:null}
 <Text style={s.client}>Historial de abonos</Text>
 {(Array.isArray(current.pagosItems)?current.pagosItems:[]).map((payment,index)=><View key={payment.id||index} style={s.card}><Text style={s.client}>{money(payment.monto)}</Text><Text>{payment.fecha||'Fecha no registrada'} · {payment.metodo||'Método no registrado'}</Text></View>)}
 <Text>El recibido total puede incluir abonos antiguos sin registro individual o correcciones realizadas desde la app actual.</Text>
 <Action title="Volver a la reserva" onPress={onClose} disabled={busy}/>
 </ScrollView></KeyboardAvoidingView>;
}
const s=StyleSheet.create({page:{padding:22,paddingBottom:40,gap:16},heading:{fontSize:26,fontWeight:'800',color:'#202034'},client:{fontSize:18,fontWeight:'700',color:'#202034'},card:{padding:18,borderRadius:18,backgroundColor:'#fff',gap:12},balance:{fontSize:24,fontWeight:'800',color:'#7042d9'},input:{borderWidth:1,borderColor:'#dbd9e7',borderRadius:12,padding:14,fontSize:18},button:{backgroundColor:'#7042d9',padding:15,borderRadius:12},buttonText:{color:'#fff',textAlign:'center',fontWeight:'700'},methods:{flexDirection:'row',flexWrap:'wrap',gap:16},method:{color:'#686878'},selected:{color:'#7042d9',fontWeight:'800'},error:{color:'#b42342'}});
