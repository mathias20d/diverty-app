import React,{useEffect,useState} from 'react';
import {doc,onSnapshot,runTransaction} from 'firebase/firestore';
import {closedDates,saveDateClosure} from '../lib/date-availability.mjs';
export default function ChristmasDates({db,appId}){
 const [dates,setDates]=useState({}),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>onSnapshot(doc(db,'artifacts',appId,'public','data','config_web','fechas_cerradas'),{includeMetadataChanges:true},snap=>{setDates(closedDates(snap.data()));setReady(snap.metadata?.fromCache!==true);},()=>{setReady(false);setMessage('No se pudieron consultar las fechas.');}),[db,appId]);
 const toggle=async date=>{if(!['2026-12-24','2026-12-25'].includes(date))return;setBusy(true);try{await saveDateClosure({runTransaction,db,datesRef:doc(db,'artifacts',appId,'public','data','config_web','fechas_cerradas'),syncRef:doc(db,'artifacts',appId,'public','data','config_web','web_sync'),date,closed:!dates[date]});setMessage('Disponibilidad actualizada en la página de reservas.');}catch{setMessage('No se pudo actualizar. Revisa la conexión.');}finally{setBusy(false);}};
 return <details><summary>Abrir o cerrar fechas de Navidad</summary><p>Cerrar una fecha impide recibir solicitudes nuevas. Las reservas guardadas se conservan.</p>{['2026-12-24','2026-12-25'].map(date=><button key={date} type="button" disabled={!ready||busy} onClick={()=>toggle(date)}>{date.endsWith('24')?'24 de diciembre':'25 de diciembre'} · {dates[date]?'Cerrado · Abrir':'Abierto · Cerrar'}</button>)}{!!message&&<p role="status">{message}</p>}</details>;
}
