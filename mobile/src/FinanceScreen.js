import React,{useMemo,useState} from 'react';
import {ScrollView,Text,View} from 'react-native';
import {financeSummary,money} from './workspace-data.mjs';
import {Action,LoadState,MonthSelector,ui} from './native-ui';
import {File,Paths} from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {shareFinanceCSV} from './finance-export.mjs';

export default function FinanceScreen({data,month,onMove}){
 const summary=useMemo(()=>financeSummary(data.events),[data.events]);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function exportBalance(){if(busy)return;setBusy(true);setError('');try{await shareFinanceCSV({File,Paths,Sharing,events:data.events,month});}catch(e){setError(e.message||'No se pudo compartir el balance.');}finally{setBusy(false);}}
 return <ScrollView style={ui.page} contentContainerStyle={ui.scroll}>
  <Text style={ui.heading}>Finanzas</Text><MonthSelector month={month} onMove={onMove}/><LoadState {...data}/><Action title={busy?'Exportando…':'Exportar balance'} disabled={busy||data.loading||!!data.error||data.cached||summary.invalid>0} onPress={exportBalance}/>{error?<Text accessibilityRole="alert" style={ui.error}>{error}</Text>:null}
  {!data.loading&&!data.error?<>
   <View style={ui.card}><Text style={ui.title}>{summary.reservas} reservas del mes</Text><Text style={ui.muted}>Se agrupan por fecha del evento. Los abonos reflejan el recibido total de esas reservas.</Text></View>
   {[['Total contratado',summary.total],['Abonos recibidos',summary.received],['Saldo por cobrar',summary.balance],['Gastos internos',summary.internal],['Costos de proveedores',summary.providers],['Costo total',summary.costs],['Ganancia estimada',summary.profit]].map(([label,value])=><View key={label} style={ui.card}><Text style={ui.muted}>{label}</Text><Text style={[ui.heading,{marginVertical:0,color:label==='Ganancia estimada'&&value<0?'#b42342':'#7657FF'}]}>{money(value)}</Text></View>)}
   <Text style={ui.muted}>Excluye cotizaciones, cancelaciones, rechazos y solicitudes web pendientes ({summary.webRequests}). La ganancia estimada se calcula sobre el total contratado.</Text>
   {summary.invalid>0?<Text accessibilityRole="alert" style={ui.error}>{summary.invalid} reservas tienen importes que necesitan revisión y no se incluyen en estos totales.</Text>:null}
  </>:null}
 </ScrollView>;
}
