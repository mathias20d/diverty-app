import {financialEvent,sortEvents} from './workspace-data.mjs';
import {expenseSummary} from './expenses.mjs';
const cell=value=>'"'+String(value??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';
export function financeCSV(events,month){
 const rows=[['Fecha','Cliente','Tipo Evento','Ubicacion','Facturado','Cobrado','Por Cobrar','Gastos Internos','Personal','Transporte','Globos-Materiales','Otros','Proveedores','Costos Totales','Ganancia Estimada','Estado']];
 for(const e of sortEvents(events).filter(e=>financialEvent(e)&&String(e.fecha||'').startsWith(month)&&Number(e.total)>0)){
  const total=Number(e.total),received=Math.min(total,Number(e.abono||0)),cost=expenseSummary(e);if(!Number.isFinite(total)||!Number.isFinite(received)||received<0)throw new Error('Hay importes que necesitan revisión antes de exportar.');
  const categories={personal:0,transporte:0,globos:0,otros:0};let sum=0;for(const item of e.gastosItems||[]){const amount=Number(item.monto);if(!Number.isFinite(amount)||amount<0)throw new Error('Revisa los gastos antes de exportar.');sum+=amount;const key=String(item.categoria||'').toLowerCase();categories[key in categories?key:'otros']+=amount;}
  if(sum>cost.internal&&sum>0)for(const key of Object.keys(categories))categories[key]*=cost.internal/sum;else categories.otros+=Math.max(0,cost.internal-sum);
  rows.push([e.fecha,e.cliente,e.tipoEvento,e.ubicacion,total,received,total-received,cost.internal,...Object.values(categories),cost.providers,cost.total,total-cost.total,e.estado]);
 }
 return '\uFEFF'+rows.map(row=>row.map(value=>typeof value==='number'?value.toFixed(2):cell(value)).join(',')).join('\r\n')+'\r\n';
}
export async function shareFinanceCSV({File,Paths,Sharing,events,month}){const file=new File(Paths.cache,`Reporte_Finanzas_Diverty_${month}-${Date.now()}.csv`);const content=financeCSV(events,month);file.create();file.write(content);if(!file.exists||file.size<=0)throw new Error('No se pudo guardar el reporte.');await Sharing.shareAsync(file.uri,{mimeType:'text/csv',UTI:'public.comma-separated-values-text',dialogTitle:'Exportar balance'});return file.uri;}
