import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Alert,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {doc,onSnapshot,runTransaction} from 'firebase/firestore';
import {db,DATA_PATH} from './firebase';
import {closedDates,panamaToday,saveDateClosure} from './domain/date-availability.mjs';
import {calendarCells,dateLabel,archived,quote} from './workspace-data.mjs';
import {Action,LoadState,MonthSelector,ui} from './native-ui';
import ReservationCard from './ReservationCard';

export default function CalendarScreen({data,month,onMove,selected,setSelected,onOpen,onNew,onBusyChange}){
 const [dates,setDates]=useState({}),[ready,setReady]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);
 const lock=useRef(false),today=panamaToday();
 useEffect(()=>{onBusyChange(busy);return()=>onBusyChange(false);},[busy,onBusyChange]);
 useEffect(()=>{
  setReady(false);setError('');
  return onSnapshot(doc(db,...DATA_PATH,'config_web','fechas_cerradas'),{includeMetadataChanges:true},snap=>{setDates(closedDates(snap.data()));setReady(!snap.metadata.fromCache);},()=>{setReady(false);setError('No pudimos consultar las fechas cerradas. Reintenta antes de cambiar la disponibilidad.');});
 },[retry]);
 const counts=useMemo(()=>data.events.filter(e=>!archived(e)&&!quote(e)).reduce((all,e)=>({...all,[e.fecha]:(all[e.fecha]||0)+1}),{}),[data.events]);
 const dayEvents=data.events.filter(e=>e.fecha===selected);
 function toggle(){
  if(lock.current||!ready||selected<today)return;
  const date=selected,closed=!dates[date];
  lock.current=true;setBusy(true);setMessage('');setError('');
  Alert.alert(closed?'Cerrar reservas para esta fecha':'Reabrir reservas para esta fecha',`${dateLabel(date)}. ${closed?'La web no permitirá nuevas solicitudes. Las reservas existentes se conservan.':'La web volverá a comprobar los cupos disponibles.'}`,[
   {text:'Cancelar',style:'cancel',onPress:()=>{lock.current=false;setBusy(false);}},
   {text:closed?'Cerrar fecha':'Reabrir',onPress:async()=>{
    try{const saved=await saveDateClosure({runTransaction,db,datesRef:doc(db,...DATA_PATH,'config_web','fechas_cerradas'),syncRef:doc(db,...DATA_PATH,'config_web','web_sync'),date,closed});setDates(closedDates(saved));setMessage(closed?'Fecha cerrada para nuevas reservas en la web.':'Fecha reabierta; la web comprobará los cupos.');}
    catch{setError('No se pudo guardar el cambio. Comprueba tu conexión y reintenta.');}
    finally{lock.current=false;setBusy(false);}
   }}
  ],{cancelable:false});
 }
 return <ScrollView style={ui.page} contentContainerStyle={ui.scroll}>
  <Text style={ui.heading}>Calendario</Text><MonthSelector month={month} disabled={busy} onMove={onMove}/>
  <View style={s.grid}>{['Lu','Ma','Mi','Ju','Vi','Sá','Do'].map(day=><View key={day} style={s.cell}><Text style={s.week}>{day}</Text></View>)}
   {calendarCells(month).map((date,index)=>date?<View key={date} style={s.cell}><Pressable accessibilityRole="button" accessibilityLabel={`${dateLabel(date)}: ${counts[date]||0} reservas${dates[date]?', cerrada para la web':''}`} accessibilityState={{selected:date===selected,disabled:busy}} disabled={busy} onPress={()=>{setSelected(date);setMessage('');setError('');}} style={[s.day,dates[date]&&s.closed,date===selected&&s.selected]}><Text style={[s.number,date<today&&s.past,date===selected&&s.white]}>{Number(date.slice(-2))}</Text><Text style={[s.count,date===selected&&s.white]}>{dates[date]?'Cerrada':counts[date]?`${counts[date]} res.`:'·'}</Text></Pressable></View>:<View key={`empty-${index}`} style={s.cell}/>)}</View>
  <Text style={ui.muted}>Rojo: fecha cerrada para la web. El número muestra reservas y solicitudes, no cupos libres.</Text>
  <LoadState {...data}/>
  <View style={ui.card}><Text style={ui.title}>{dateLabel(selected)}</Text><Text style={dates[selected]?ui.error:ui.muted}>{!ready?'Comprobando disponibilidad…':dates[selected]?'Cerrada para nuevas reservas web':'Web habilitada según cupos disponibles'}</Text>
   <Action title={busy?'Guardando…':dates[selected]?'Reabrir esta fecha':'Cerrar esta fecha en la web'} danger={!dates[selected]} disabled={!ready||busy||selected<today} onPress={toggle}/>
   <Action title="Nueva reserva este día" secondary disabled={busy||!ready||dates[selected]||selected<today} onPress={()=>onNew({fecha:selected})}/>
  </View>
  {message?<Text accessibilityRole="alert" style={ui.success}>{message}</Text>:null}
  {error?<View><Text accessibilityRole="alert" style={ui.error}>{error}</Text><Action title="Reintentar disponibilidad" secondary disabled={busy} onPress={()=>setRetry(value=>value+1)}/></View>:null}
  {!data.loading&&!data.error?<><Text style={ui.title}>Reservas del día ({dayEvents.length})</Text>{dayEvents.length===0?<Text style={ui.muted}>No hay reservas para esta fecha.</Text>:dayEvents.map(event=><ReservationCard key={event.id} event={event} onOpen={(value,documentType)=>{if(!busy)onOpen(value,documentType);}}/>)}</>:null}
 </ScrollView>;
}
const s=StyleSheet.create({grid:{flexDirection:'row',flexWrap:'wrap',backgroundColor:'#fff',borderRadius:18,padding:8},cell:{width:'14.2857%',padding:2},week:{textAlign:'center',fontSize:12,fontWeight:'700',color:'#686878',paddingVertical:8},day:{minHeight:54,justifyContent:'center',alignItems:'center',borderRadius:10,backgroundColor:'#f5f4fa'},closed:{backgroundColor:'#ffe9ee'},selected:{backgroundColor:'#7042d9'},number:{fontSize:16,fontWeight:'700',color:'#202034'},past:{color:'#898590'},count:{fontSize:8,color:'#686878',marginTop:3},white:{color:'#fff'}});
