import React,{useEffect,useState} from 'react';
import {doc,onSnapshot} from 'firebase/firestore';
import {db,DATA_PATH} from './firebase';
import {ScrollView,Text,View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Action,LoadState,ui} from './native-ui';
import {homeSummary} from './admin-settings.mjs';
import {clientsFromEvents,money} from './workspace-data.mjs';
import ReservationCard from './ReservationCard';
export default function HomeScreen({data,today,settings,onNew,onOpen,onAgenda}){
 const [hidden,setHidden]=useState(null);
 useEffect(()=>onSnapshot(doc(db,...DATA_PATH,'configuracion','clientesOcultos'),snapshot=>setHidden(Array.isArray(snapshot.data()?.clients)?snapshot.data().clients:[]),()=>setHidden(null)),[]);
 const summary=homeSummary(data.events,today,settings.preferences.metaMensual);
 return <ScrollView style={ui.page} contentContainerStyle={ui.scroll}>
  <LinearGradient colors={['#07162F','#0A1A3A','#25104B']} style={{padding:24,borderRadius:30,gap:12,marginTop:16}}><Text style={{color:'#fff',fontSize:28,fontWeight:'800'}}>Hola Diverty 👋</Text><Text style={{color:'#ddd',lineHeight:22}}>Gestiona tus reservas, contratos y finanzas al instante.</Text><Action title="Nueva Reserva" onPress={()=>onNew({})}/></LinearGradient>
  <LoadState {...data}/>
  {!data.loading&&!data.error?<>
   <View style={ui.chips}>{[['Eventos Hoy',summary.today.length],['Ingresos Mes',money(summary.finance.received)],['Clientes Activos',hidden?clientsFromEvents(data.events,hidden).length:'—'],['Por cobrar este mes',money(summary.finance.balance)]].map(([title,value])=><View key={title} style={[ui.card,{flexGrow:1}]}><Text style={ui.muted}>{title}</Text><Text style={ui.title}>{value}</Text></View>)}</View>
   <View style={ui.row}><View style={{flex:1}}><Action title="Cotizar" secondary onPress={()=>onNew({estado:'Cotización'})}/></View><View style={{flex:1}}><Action title="Operativo" secondary onPress={onAgenda}/></View></View>
   <Action title="Refrescar" secondary onPress={data.reload}/>
   <View style={ui.card}><Text style={ui.title}>Centro de operaciones</Text><Text style={ui.body}>Hoy: {summary.today.length} · Mañana: {summary.tomorrow.length} · Semana: {summary.week.length}</Text><Text style={ui.muted}>Cotizaciones: {summary.quotes.length} · Solicitudes web: {summary.requests.length}</Text></View>
   <View style={ui.card}><Text style={ui.title}>Meta mensual</Text><Text style={ui.body}>{money(summary.finance.total)} / {money(summary.goal)}</Text><View style={{height:8,backgroundColor:'#ece9f5',borderRadius:8}}><View style={{height:8,width:`${summary.progress}%`,backgroundColor:'#7042d9',borderRadius:8}}/></View></View>
   <Text style={ui.heading}>Próximos eventos</Text>{summary.upcoming.slice(0,5).map(event=><ReservationCard key={event.id} event={event} onOpen={onOpen}/>)}{!summary.upcoming.length?<Text style={ui.muted}>No hay eventos próximos.</Text>:null}
  </>:null}
 </ScrollView>;
}
