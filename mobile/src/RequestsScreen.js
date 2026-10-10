import React,{useState} from 'react';
import {ScrollView,Text,View} from 'react-native';
import useReservations from './useReservations';
import {pendingRequests,requestReview} from './domain/web-request-review.mjs';
import {Action,LoadState,ui} from './native-ui';
import {dateLabel,money} from './workspace-data.mjs';
import useScreenBack from './useScreenBack';
export default function RequestsScreen({onClose,onOpen}){
 const data=useReservations(),[filter,setFilter]=useState('all');useScreenBack(onClose);
 const rows=pendingRequests(data.events,filter);
 return <ScrollView style={ui.page} contentContainerStyle={ui.scroll}><Action title="Volver al administrador" secondary onPress={onClose}/><Text style={ui.heading}>Alertas Web</Text><Text style={ui.muted}>Solicitudes recibidas desde tu página web</Text><View style={ui.chips}>{[['all','Todas'],['review','Por revisar'],['soon','Próximas'],['deposit','Falta abono']].map(([id,title])=><Action key={id} title={title} secondary={id!==filter} onPress={()=>setFilter(id)}/>)}</View><LoadState {...data}/>{!data.loading&&!data.error?rows.map(event=><View key={event.id} style={ui.card}><Text style={ui.title}>{event.cliente}</Text><Text style={ui.body}>{dateLabel(event.fecha)} · {event.hora}</Text><Text style={ui.muted}>{event.servicio}</Text><Text style={ui.body}>Saldo: {money(requestReview(event).balance)}</Text><Text style={ui.muted}>{requestReview(event).issues.join(' · ')||'Lista para revisar'}</Text><Action title="Revisar solicitud" onPress={()=>onOpen(event)}/></View>):null}{!data.loading&&!data.error&&!rows.length?<Text style={ui.muted}>No hay solicitudes en este filtro.</Text>:null}</ScrollView>;
}
