import {getResourceAvailability} from './booking-transactions';
import {resourcesFromConfig} from './admin-settings.mjs';
import React,{useEffect,useState} from 'react';
import {doc,onSnapshot} from 'firebase/firestore';
import {db,DATA_PATH} from './firebase';
import {ScrollView,Text,View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Action,LoadState,ui} from './native-ui';
import {homeSummary} from './admin-settings.mjs';
import {clientsFromEvents,money} from './workspace-data.mjs';
import ReservationCard from './ReservationCard';
export default function HomeScreen({data,today,settings,onNew,onOpen,onAgenda,onRequests,onChristmas}){
 const [hidden,setHidden]=useState(null),[capacity,setCapacity]=useState(null);
 useEffect(()=>onSnapshot(doc(db,...DATA_PATH,'config_web','global'),{includeMetadataChanges:true},snapshot=>setCapacity(snapshot.metadata?.fromCache?null:resourcesFromConfig(snapshot.data()||{})),()=>setCapacity(null)),[]);
 useEffect(()=>onSnapshot(doc(db,...DATA_PATH,'configuracion','clientesOcultos'),snapshot=>setHidden(Array.isArray(snapshot.data()?.clients)?snapshot.data().clients:[]),()=>setHidden(null)),[]);
 const summary=homeSummary(data.events,today,settings.preferences.metaMensual);
 const operations=summary.today.filter(e=>!e.esNavidad&&!/entregas de nochebuena/i.test(e.servicio||'')),pending=operations.filter(e=>e.estado!=='Completado'),next=pending.find(e=>['En el evento','En camino','Preparando'].includes(e.estado))||pending[0],resources=next&&capacity?getResourceAvailability(next,data.events,capacity):null;
 return <ScrollView style={ui.page} contentContainerStyle={ui.scroll}>
  <LinearGradient colors={['#07162F','#0A1A3A','#25104B']} style={{padding:24,borderRadius:30,gap:12,marginTop:16}}><Text style={{color:'#fff',fontSize:28,fontWeight:'800'}}>Hola Diverty 👋</Text><Text style={{color:'#ddd',lineHeight:22}}>Gestiona tus reservas, contratos y finanzas al instante.</Text><Action title="Nueva Reserva" onPress={()=>onNew({})}/></LinearGradient>
  {settings.preferences.christmasModuleVisible?<Action title="Operación Navidad" secondary onPress={onChristmas}/>:null}<LoadState {...data}/>
  {!data.loading&&!data.error?<>
   <View style={ui.chips}>{[['Eventos Hoy',summary.today.length],['Ingresos Mes',money(summary.finance.received)],['Clientes Activos',hidden?clientsFromEvents(data.events,hidden).length:'—'],['Por cobrar este mes',money(summary.finance.balance)]].map(([title,value])=><View key={title} style={[ui.card,{flexGrow:1}]}><Text style={ui.muted}>{title}</Text><Text style={ui.title}>{value}</Text></View>)}</View>
   <View style={ui.row}><View style={{flex:1}}><Action title="Cotizar" secondary onPress={()=>onNew({estado:'Cotización'})}/></View><View style={{flex:1}}><Action title="Operativo" secondary onPress={onAgenda}/></View></View>
   <Action title={`Solicitudes web (${summary.requests.length})`} secondary onPress={onRequests}/><Action title="Refrescar" secondary onPress={data.reload}/>
   <View style={ui.card}><Text style={ui.title}>Centro de operaciones</Text><Text style={ui.body}>Hoy: {summary.today.length} · Mañana: {summary.tomorrow.length} · Semana: {summary.week.length}</Text><Text style={ui.muted}>Cotizaciones: {summary.quotes.length} · Solicitudes web: {summary.requests.length}</Text></View>
   <View style={ui.card}><Text style={ui.title}>Operación de hoy</Text><Text style={ui.body}>{operations.length} eventos · {operations.length-pending.length} realizados · {pending.length} pendientes</Text>{next?<><Text style={ui.title}>{next.cliente} · {next.hora}</Text><Text style={ui.body}>{next.estado}</Text>{resources?<Text style={resources.feasible?ui.body:ui.error}>Animadores libres: {resources.available.animadores} / {resources.capacity.animadores} · Payasos libres: {resources.available.payasos} / {resources.capacity.payasos}{resources.feasible?'':' · Revisa la disponibilidad de personal'}</Text>:<Text style={ui.muted}>Esperando capacidad del servidor…</Text>}<Action title="Abrir siguiente evento" onPress={()=>onOpen(next)}/></>:<Text style={ui.body}>Sin eventos pendientes hoy.</Text>}</View><View style={ui.card}><Text style={ui.title}>Meta mensual</Text><Text style={ui.body}>{money(summary.finance.total)} / {money(summary.goal)}</Text><View style={{height:8,backgroundColor:'#ece9f5',borderRadius:8}}><View style={{height:8,width:`${summary.progress}%`,backgroundColor:'#7042d9',borderRadius:8}}/></View></View>
   <Text style={ui.heading}>Próximos eventos</Text>{summary.upcoming.slice(0,5).map(event=><ReservationCard key={event.id} event={event} onOpen={onOpen}/>)}{!summary.upcoming.length?<Text style={ui.muted}>No hay eventos próximos.</Text>:null}
  </>:null}
 </ScrollView>;
}
