import React from 'react';
import {Text,View} from 'react-native';
import ExpenseOverview from './ExpenseOverview';
import {Action,ui} from './native-ui';
import {dateLabel,money,webRequest} from './workspace-data.mjs';
import {Calendar,MapPin,Sparkles,Receipt,FileText} from 'lucide-react-native';
import {WEB_THEME as T,WEB_FONTS as F} from './web-theme.mjs';

export default function ReservationCard({event,onOpen}){
 const color=/cancel|rechaz/i.test(event.estado||'')?'#E11D48':/complet/i.test(event.estado||'')?T.green:/cot/i.test(event.estado||'')?'#F59E0B':T.purple;
 return <View style={[ui.card,{overflow:'hidden',paddingLeft:24}]}>
  <View style={{position:'absolute',left:0,top:0,bottom:0,width:5,backgroundColor:color}}/>
  <Text style={[ui.title,{fontSize:19}]}>{event.cliente||'Cliente'}</Text>
  <View style={{alignSelf:'flex-start',backgroundColor:color+'12',borderRadius:10,paddingHorizontal:10,paddingVertical:5}}><Text style={{color,fontFamily:F.black,fontSize:10,textTransform:'uppercase',letterSpacing:.5}}>{webRequest(event)?'Solicitud web por revisar':event.estado||'Pendiente'}</Text></View>
  <View style={ui.row}><Calendar size={15} color={T.purple}/><Text style={ui.muted}>{dateLabel(event.fecha)} · {event.hora||'Hora por definir'}</Text></View>
  <View style={ui.row}><Sparkles size={15} color={T.purple}/><Text style={[ui.body,{flex:1}]}>{event.servicio||'Servicio por definir'}</Text></View>
  <View style={ui.row}><MapPin size={15} color={T.purple}/><Text style={[ui.muted,{flex:1}]}>{event.ubicacion||event.direccion||'Lugar por confirmar'}</Text></View>
  <View style={ui.row}>
   <View style={{flex:1}}><Action title="Factura" icon={Receipt} secondary onPress={()=>onOpen(event,'factura')}/></View>
   <View style={{flex:1}}><Action title="Cotización" icon={FileText} secondary onPress={()=>onOpen(event,'cotizacion')}/></View>
  </View>
  <Text style={ui.body}>Total: {money(event.total)} · Recibido: {money(event.abono)}</Text>
  <Text style={ui.title}>Saldo: {money(Math.max(0,Number(event.total||0)-Number(event.abono||0)))}</Text>
  <ExpenseOverview event={event}/>
  <Action title="Ver reserva y acciones" onPress={()=>onOpen(event)}/>
 </View>;
}
