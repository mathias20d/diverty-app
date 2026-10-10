import React,{useEffect,useRef,useState} from 'react';
import {Alert,ScrollView,Text,TextInput,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {collection,doc,onSnapshot,setDoc} from 'firebase/firestore';
import {auth,db,DATA_PATH} from './firebase';
import {runTransaction} from './booking-transactions';
import {correctionAmount,correctionMessages,recordCorrection} from './financial-corrections.mjs';
import {expenseSummary} from './expenses.mjs';
import {money} from './workspace-data.mjs';
import {Action,ui} from './native-ui';
import useScreenBack from './useScreenBack';
export default function FinancialCorrectionScreen({event,kind,onClose}){
 const initial=()=>kind==='received'?Number(event.abono||0):expenseSummary(event).internal;
 const [current,setCurrent]=useState(event),[amount,setAmount]=useState(()=>{try{return String(initial());}catch{return '';}}),[revision,setRevision]=useState(event._rev||0),[ready,setReady]=useState(false),[storageReady,setStorageReady]=useState(false),[pending,setPending]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[exists,setExists]=useState(true);
 const lock=useRef(false),key=`diverty-correction:${auth.currentUser.uid}:${event.id}:${kind}`;
 const close=()=>Alert.alert('Cerrar corrección',pending?'La corrección pendiente se conservará para reintentar.':'¿Cerrar sin guardar la corrección?',[{text:'Continuar',style:'cancel'},{text:'Cerrar',onPress:onClose}]);useScreenBack(close,busy);
 useEffect(()=>{let active=true;AsyncStorage.getItem(key).then(value=>{if(!active)return;if(value){const operation=JSON.parse(value);if(operation.kind!==kind||!operation.id||!operation.createdAt)throw new Error('INVALID_CORRECTION');correctionAmount(operation.amount);setPending(operation);setAmount(String(operation.amount));setRevision(operation.revision);}setStorageReady(true);}).catch(()=>{if(active)setError('No se pudo leer la corrección pendiente. Cierra y reintenta.');});return()=>{active=false;};},[key,kind]);
 useEffect(()=>onSnapshot(doc(db,...DATA_PATH,'eventos',event.id),{includeMetadataChanges:true},snap=>{setExists(snap.exists()&&!snap.data()?.deletedLocally);setReady(snap.exists()&&!snap.metadata.fromCache&&!snap.metadata.hasPendingWrites);if(snap.exists())setCurrent({...snap.data(),id:event.id});},()=>{setReady(false);setError('No se pudieron actualizar los datos. Cierra y reintenta.');}),[event.id]);
 async function save(){
  if(lock.current)return;
  let operation=pending;try{if(!operation)operation={id:`ajuste-${doc(collection(db,...DATA_PATH,'eventos')).id}`,kind,amount:correctionAmount(amount),revision,createdAt:new Date().toISOString()};}catch(err){setError(correctionMessages[err.message]);return;}
  lock.current=true;setBusy(true);setError('');
  try{await AsyncStorage.setItem(key,JSON.stringify(operation));setPending(operation);const saved=await recordCorrection({runTransaction,db,ref:doc(db,...DATA_PATH,'eventos',event.id),operation});await AsyncStorage.removeItem(key).catch(()=>{});setPending(null);setCurrent({...saved,id:event.id});setRevision(saved._rev);setAmount(String(operation.amount));setDoc(doc(db,...DATA_PATH,'configuracion','syncBus'),{entityType:'evento',entityId:event.id,action:'update',deviceId:'diverty-native',changedAt:operation.createdAt,nonce:operation.id}).catch(()=>{});Alert.alert('Corrección guardada','Se actualizó el importe y se conservó el historial.');onClose();}catch(err){if(correctionMessages[err.message]&&err.message!=='CORRECTION_CONFLICT'){try{await AsyncStorage.removeItem(key);setPending(null);}catch{}}setError(correctionMessages[err.message]||'No se pudo confirmar la corrección. Reintenta: se conserva el mismo registro para evitar duplicarlo.');}finally{lock.current=false;setBusy(false);}
 }
 const stale=Number(current._rev||0)!==Number(revision||0);
 return <ScrollView style={ui.page} contentContainerStyle={ui.scroll}><Text style={ui.heading}>{kind==='received'?'Corregir recibido':'Corregir gastos internos'}</Text><View style={ui.card}><Text style={ui.title}>{current.cliente}</Text><Text style={ui.body}>Precio contratado: {money(current.total)}</Text><Text style={ui.body}>Recibido actual: {money(current.abono)}</Text><Text style={ui.muted}>{kind==='received'?'Corrige el total recibido hasta ahora. El precio contratado y los registros de abonos se conservan.':'Corrige el total de gastos internos. Los proveedores y los registros individuales se conservan; el total corregido puede diferir de su suma.'}</Text></View>
 {!exists?<Text style={ui.error}>La reserva ya no existe.</Text>:!ready?<Text style={ui.muted}>Esperando datos del servidor…</Text>:null}
 {stale&&!pending?<><Text style={ui.error}>La reserva cambió desde que abriste la corrección.</Text><Action title="Cargar importes actuales" disabled={busy||!ready} onPress={()=>{try{setAmount(String(kind==='received'?current.abono||0:expenseSummary(current).internal));setRevision(current._rev||0);setError('');}catch{setError('Los importes necesitan revisión.');}}}/></>:null}
 <TextInput accessibilityLabel="Importe corregido" style={ui.input} value={amount} keyboardType="decimal-pad" editable={!busy&&!pending} onChangeText={setAmount}/>{pending?<Text style={ui.muted}>Corrección pendiente. Reintentar conserva el mismo registro.</Text>:null}
 {error?<Text accessibilityRole="alert" style={ui.error}>{error}</Text>:null}<Action title={busy?'Guardando…':pending?'Reintentar corrección':'Guardar corrección'} disabled={busy||!storageReady||!ready||!exists||stale&&!pending} onPress={()=>pending?save():Alert.alert('Confirmar corrección',`¿Guardar ${money(amount.replace(',','.'))} como ${kind==='received'?'total recibido':'gastos internos'}?`,[{text:'Volver',style:'cancel'},{text:'Guardar',onPress:save}])}/><Action title="Volver sin corregir" secondary disabled={busy} onPress={close}/>
 </ScrollView>;
}
