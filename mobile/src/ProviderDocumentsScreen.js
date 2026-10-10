import React, {useEffect,useRef,useState} from 'react';
import {ScrollView,Text} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {File,Paths} from 'expo-file-system';
import {sharePDF} from './pdf-sharing.mjs';
import {doc,runTransaction} from 'firebase/firestore';
import {auth,db,DATA_PATH} from './firebase';
import {Action,ui} from './native-ui';
import useScreenBack from './useScreenBack';
import {ensureProviderNumber,providerDocumentHTML} from './provider-documents.mjs';
import {firestoreErrorMessage} from './firebase-errors.mjs';
export default function ProviderDocumentsScreen({provider,event,onClose}) {
  const [company,setCompany]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[ready,setReady]=useState(false);
  const lock=useRef(false);
  useScreenBack(onClose,busy);
  useEffect(()=>{let active=true;AsyncStorage.getItem(`diverty-document-company:${auth.currentUser.uid}`).then(value=>{if(active){setCompany(value?JSON.parse(value):null);setReady(true);}}).catch(()=>{if(active)setError('No pudimos leer los datos de la empresa. Cierra y vuelve a abrir.');});return()=>{active=false;};},[]);
  async function generate(share) {
    if(lock.current)return;
    lock.current=true;setBusy(true);setError('');
    try {
      if(share && !await Sharing.isAvailableAsync())throw new Error('SHARING_UNAVAILABLE');
      const result=await ensureProviderNumber({runTransaction,db,providerRef:doc(db,...DATA_PATH,'proveedores',provider.id),eventRef:event?doc(db,...DATA_PATH,'eventos',event.id):null,counterRef:doc(db,...DATA_PATH,'configuracion','contador_subcontrato'),providerId:provider.id,now:new Date().toISOString()});
      const html=providerDocumentHTML(result.provider,result.event,result.number,company);
      if(share){await sharePDF({Print,Sharing,File,Paths,html,name:result.number,title:event?'Subcontrato del evento':'Acuerdo marco de proveedor'});}else await Print.printAsync({html});
    }catch(e){const messages={COUNTER_NOT_READY:'Prepara la numeración desde Ajustes → Preparar actualización en el administrador web.',INVALID_DOCUMENT_COUNTER:'El contador de subcontratos requiere revisión.',NO_ASSIGNED_SERVICES:'Este proveedor ya no tiene servicios asignados a esta reserva.',PROVIDER_NOT_FOUND:'El proveedor ya no está disponible.',EVENT_NOT_FOUND:'La reserva ya no está disponible.',CONFLICTING_NUMBERS:'Los servicios tienen números de subcontrato distintos. Revisa esta reserva en el administrador web.',SHARING_UNAVAILABLE:'Compartir archivos no está disponible en este dispositivo.',INVALID_PROVIDER_COST:'Revisa los costos guardados del proveedor.'};setError(messages[e.message] || firestoreErrorMessage(e,'No pudimos generar el contrato. Reintenta.'));}
    finally{lock.current=false;setBusy(false);}
  }
  return <ScrollView style={ui.page} contentContainerStyle={ui.scroll}><Text style={ui.heading}>{event?'Subcontrato del evento':'Acuerdo marco de proveedor'}</Text><Text style={ui.title}>{provider.nombre}</Text>{event?<Text style={ui.body}>{event.cliente} · {event.fecha}</Text>:null}<Text style={ui.body}>{event?'Incluye únicamente los servicios asignados a este proveedor en la reserva.':'Incluye las tarifas del perfil del proveedor para futuras asignaciones.'}</Text>{!ready?<Text style={ui.muted}>Cargando datos de la empresa…</Text>:!company?<Text style={ui.error}>Guarda los datos de la empresa en Ajustes o en Facturas y cotizaciones para habilitar el PDF.</Text>:null}<Action title={busy?'Preparando PDF…':'Compartir PDF'} disabled={!company||busy} onPress={()=>generate(true)}/><Action title="Vista previa / imprimir" secondary disabled={!company||busy} onPress={()=>generate(false)}/>{error?<Text accessibilityRole="alert" style={ui.error}>{error}</Text>:null}<Action title="Volver" secondary disabled={busy} onPress={onClose}/></ScrollView>;
}
