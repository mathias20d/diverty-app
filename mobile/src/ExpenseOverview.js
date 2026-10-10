import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {EXPENSE_CATEGORIES,expenseSummary} from './expenses.mjs';

const money=value=>`$${Number(value).toFixed(2)}`;

export default function ExpenseOverview({event}){
 let totals;
 try{totals=expenseSummary(event);}catch{return <Text style={s.error}>Gastos por revisar. Abre Gastos del evento.</Text>;}
 const items=Array.isArray(event.gastosItems)?event.gastosItems:[];
 const latest=items.filter(Boolean).at(-1);
 return <View style={s.panel}>
  <View style={s.row}><Text style={s.label}>Gastos internos</Text><Text style={s.cost}>{money(totals.internal)}</Text></View>
  {totals.providers>0&&<View style={s.row}><Text style={s.label}>Proveedores</Text><Text style={s.cost}>{money(totals.providers)}</Text></View>}
  <View style={s.row}><Text style={s.label}>Costo total</Text><Text style={s.cost}>{money(totals.total)}</Text></View>
  <View style={s.row}><Text style={s.label}>Ganancia estimada</Text><Text style={[s.profit,totals.profit<0&&s.error]}>{money(totals.profit)}</Text></View>
  {latest&&<Text style={s.latest}>Último gasto: {money(latest.monto)} · {EXPENSE_CATEGORIES.find(c=>c.id===latest.categoria)?.label||'Otro gasto'}{latest.detalle?` · ${latest.detalle}`:''}</Text>}
 </View>;
}

const s=StyleSheet.create({panel:{backgroundColor:'#f7f5fc',borderRadius:12,padding:12,gap:7,marginTop:4},row:{flexDirection:'row',justifyContent:'space-between',gap:12},label:{color:'#64748B',fontSize:13,flex:1},cost:{color:'#b42342',fontFamily:'Outfit_700Bold',fontSize:14},profit:{color:'#14805e',fontFamily:'Outfit_700Bold',fontSize:14},error:{color:'#b42342'},latest:{color:'#475569',fontSize:13,lineHeight:19,borderTopWidth:1,borderTopColor:'#E2E8F0',paddingTop:8,marginTop:2}});
