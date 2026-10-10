import React from 'react';
import {Text,View} from 'react-native';
import ExpenseOverview from './ExpenseOverview';
import {Action,ui} from './native-ui';
import {dateLabel,money,webRequest} from './workspace-data.mjs';

export default function ReservationCard({event,onOpen}){
 return <View style={ui.card}>
  <Text style={{color:'#7042d9',fontWeight:'800',fontSize:13}}>{dateLabel(event.fecha)} · {event.hora||'Hora por definir'}</Text>
  <Text style={ui.title}>{event.cliente||'Cliente'}</Text>
  <Text style={ui.body}>{event.servicio||'Servicio por definir'}</Text>
  <Text style={ui.muted}>{event.ubicacion||event.direccion||'Lugar por confirmar'}</Text>
  <Text style={{color:'#7042d9',fontWeight:'700'}}>{webRequest(event)?'Solicitud web por revisar':event.estado||'Pendiente'}</Text>
  <View style={ui.row}>
   <View style={{flex:1}}><Action title="Factura" secondary onPress={()=>onOpen(event,'factura')}/></View>
   <View style={{flex:1}}><Action title="Cotización" secondary onPress={()=>onOpen(event,'cotizacion')}/></View>
  </View>
  <Text style={ui.body}>Total: {money(event.total)} · Recibido: {money(event.abono)}</Text>
  <Text style={ui.title}>Saldo: {money(Math.max(0,Number(event.total||0)-Number(event.abono||0)))}</Text>
  <ExpenseOverview event={event}/>
  <Action title="Ver reserva y acciones" onPress={()=>onOpen(event)}/>
 </View>;
}
