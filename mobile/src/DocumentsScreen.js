import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {File,Paths} from 'expo-file-system';
import {sharePDF} from './pdf-sharing.mjs';
import { doc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { auth, db, DATA_PATH } from './firebase';
import { Action, ui } from './native-ui';
import { money } from './workspace-data.mjs';
import { companyDetails, DEFAULT_COMPANY, documentData, documentHTML, ensureDocumentNumber } from './documents.mjs';
import useScreenBack from './useScreenBack';
import {documentReadiness} from './document-readiness.mjs';
import {documentErrorMessage} from './document-errors.mjs';
const labels = {
  nombre: 'Nombre de la empresa',
  telefono: 'Teléfono de la empresa',
  email: 'Correo de la empresa',
  web: 'Web de la empresa',
  ruc: 'RUC de la empresa',
  nombreTitular: 'Titular de la cuenta',
  banco: 'Banco',
  tipoCuenta: 'Tipo de cuenta',
  numeroCuenta: 'Número de cuenta'
};
const messages = {
  COUNTER_NOT_READY: 'Abre Ajustes → Preparar actualización en la app actual para preparar la numeración. No se generó ningún número.',
  INVALID_DOCUMENT_COUNTER: 'El contador de documentos necesita revisión en la app actual.',
  EVENT_NOT_FOUND: 'La reserva ya no existe.',
  INVALID_DOCUMENT_AMOUNT: 'Revisa los montos guardados en la reserva.',
  INVALID_DOCUMENT_QUANTITY: 'Revisa las cantidades guardadas en la reserva.',
  COMPANY_NAME_REQUIRED: 'Escribe el nombre de la empresa.'
};
export default function DocumentsScreen({
  event,
  initialType = 'factura',
  onClose, onCompanySaved
}) {
  const [type, setType] = useState(initialType),
    [company, setCompany] = useState(DEFAULT_COMPANY),
    [settings, setSettings] = useState(false),
    [ready, setReady] = useState(false),
    [editing, setEditing] = useState(false),
    [catalog, setCatalog] = useState([]),
    [catalogReady, setCatalogReady] = useState(false),
    [catalogError, setCatalogError] = useState(''),
    [retry, setRetry] = useState(0),
    [busy, setBusy] = useState(false),
    [progress,setProgress] = useState(''),
    [error, setError] = useState(''),
    [current, setCurrent] = useState(event);
  const [savedServicesOnly,setSavedServicesOnly]=useState(false);
  const key = `diverty-document-company:${auth.currentUser.uid}`,
    lock = useRef(false);
  useScreenBack(onClose, busy);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key).then(value => {
      if (!active) return;
      if (value) {
        setCompany(companyDetails(JSON.parse(value)));
        setSettings(true);
      } else setEditing(true);
      setReady(true);
    }).catch(() => {
      if (active) setError('No pudimos leer los datos de la empresa. Cierra y vuelve a abrir.');
    });
    return () => {
      active = false;
    };
  }, [key]);
  useEffect(() => {
    setCatalogReady(false);
    setCatalogError('');
    return onSnapshot(doc(db, ...DATA_PATH, 'configuracion', 'serviciosCustom'), snap => {
      setCatalog(Array.isArray(snap.data()?.paquetes) ? snap.data().paquetes : []);
      setCatalogReady(true);
    }, () => {
      setCatalogError('No pudimos consultar las duraciones y descripciones del catálogo.');
    });
  }, [retry]);
  let summary;
  try {
    summary = documentData(current, type, savedServicesOnly?[]:catalog);
  } catch {
    summary = null;
  }
  async function saveSettings() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const saved = companyDetails(company);
      await AsyncStorage.setItem(key, JSON.stringify(saved));
      setCompany(saved);
      onCompanySaved?.(saved);
      setSettings(true);
      setEditing(false);
    } catch (e) {
      setError(messages[e.message] || 'No se pudieron guardar los datos de la empresa.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function generate(share) {
    let stage = 'availability';
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      if (share && !(await Sharing.isAvailableAsync())) throw new Error('SHARING_UNAVAILABLE');
      stage='number';setProgress('Confirmando numeración con Firebase…');
      const saved = await ensureDocumentNumber({
        runTransaction,
        db,
        ref: doc(db, ...DATA_PATH, 'eventos', event.id),
        counterRef: doc(db, ...DATA_PATH, 'configuracion', `contador_${type}`),
        type,
        now: new Date().toISOString()
      });
      setCurrent({
        ...saved,
        id: event.id
      });
      stage='html';setProgress('Preparando contenido…');
      const html = documentHTML(saved, type, company, savedServicesOnly?[]:catalog);
      setDoc(doc(db, ...DATA_PATH, 'configuracion', 'syncBus'), {
        entityType: 'evento',
        entityId: event.id,
        action: 'update',
        deviceId: 'diverty-native',
        changedAt: new Date().toISOString(),
        nonce: `doc-${type}-${Date.now()}`
      }).catch(() => {});
      if (share) {
        await sharePDF({Print,Sharing,File,Paths,html,name:saved[type==='factura'?'numeroFactura':type==='cotizacion'?'numeroCotizacion':'numeroContrato'],title:summary.title,onStage:value=>{stage=value;setProgress({pdf:'Creando archivo PDF…',file:'Guardando PDF para compartir…',share:'Abriendo menú para compartir…'}[value]);}});
      } else {stage='print';setProgress('Abriendo vista de impresión…');await Print.printAsync({html});}
    } catch (e) {
      const message = documentErrorMessage(e,stage);
      setError(message);
      Alert.alert(share?'No se pudo compartir el PDF':'No se pudo imprimir el PDF',message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const readiness=documentReadiness({busy,ready,settings,editing,catalogReady,catalogError,summary,savedServicesOnly});
  const disabled=readiness.disabled;
  return <KeyboardAvoidingView style={{
    flex: 1
  }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView style={ui.page} contentContainerStyle={ui.scroll} keyboardShouldPersistTaps="handled"><Text style={ui.heading}>Documentos de la reserva</Text><Text style={ui.body}>{current.cliente} · {current.fecha}</Text><View style={ui.card}><Text style={ui.title}>Preparación del PDF</Text><Text accessibilityRole="alert" style={ui.body}>{busy&&progress?progress:readiness.message}</Text>{ready&&(!settings||editing)?<><Text style={ui.muted}>Empresa: {company.nombre||'Sin nombre'}. Puedes completar los datos fiscales y bancarios en el formulario de abajo.</Text><Action title="Guardar datos y habilitar PDF" disabled={busy||!company.nombre?.trim()} onPress={saveSettings}/></>:null}{!savedServicesOnly&&(!catalogReady||catalogError)?<Action title="Usar servicios guardados en la reserva" secondary disabled={busy} onPress={()=>setSavedServicesOnly(true)}/>:null}</View><View style={ui.row}>{['factura', 'cotizacion', 'contrato'].map(value => <View key={value} style={{
          flex: 1
        }}><Action title={value === 'factura' ? 'Factura' : value === 'contrato' ? 'Contrato' : 'Cotización'} secondary={type !== value} disabled={busy} onPress={() => setType(value)} /></View>)}</View>{summary ? <View style={ui.card}><Text style={ui.title}>{summary.title}</Text><Text style={ui.muted}>{summary.number}</Text>{summary.lines.map((line, index) => <Text key={index} style={ui.body}>{line.name} · {line.quantity}{line.hours ? ` · ${line.hours} h` : ''} · {money(line.price)}</Text>)}<Text style={ui.title}>Total: {money(summary.total)}</Text>{type !== 'cotizacion' ? <Text style={ui.body}>Abono: {money(summary.received)} · Saldo: {money(summary.balance)}</Text> : <Text style={ui.muted}>Vigencia: {summary.validity} días</Text>}</View> : <Text style={ui.error}>Los montos o cantidades de la reserva requieren revisión.</Text>}{catalogError ? <View><Text style={ui.error}>{catalogError}</Text><Action title="Actualizar catálogo" disabled={busy} onPress={() => setRetry(value => value + 1)} /></View> : null}<Text style={ui.muted}>Se usan solo los servicios reservados. Generar conserva el número oficial; repetir no crea otro número de documento. El PDF usa los datos actualizados al generar.</Text>{editing ? <View style={ui.card}><Text style={ui.title}>Datos de la empresa para PDF</Text><Text style={ui.muted}>Revisa estos datos antes de generar. Los ajustes de la app web se guardan en el navegador y no se copian automáticamente. Estos datos se guardan en este teléfono.</Text>{Object.entries(labels).map(([field, label]) => <View key={field}><Text style={ui.body}>{label}</Text><TextInput accessibilityLabel={label} value={company[field]} onChangeText={value => setCompany(current => ({
            ...current,
            [field]: value
          }))} editable={!busy} style={ui.input} autoCapitalize={['email', 'web'].includes(field) ? 'none' : 'sentences'} keyboardType={field === 'telefono' ? 'phone-pad' : field === 'email' ? 'email-address' : 'default'} /></View>)}<Action title="Guardar datos para documentos" onPress={saveSettings} disabled={busy || !ready} /></View> : <><Text style={ui.muted}>{company.nombre} · {company.telefono || 'Teléfono no indicado'}</Text><Action title="Editar datos de la empresa" secondary onPress={() => setEditing(true)} disabled={busy} /></>}<Action title={busy ? 'Preparando documento…' : 'Compartir PDF'} onPress={() => generate(true)} disabled={disabled} /><Action title="Vista previa / imprimir" secondary onPress={() => generate(false)} disabled={disabled} /><Text style={ui.muted}>Compartir abre el menú de tu teléfono para elegir WhatsApp u otra aplicación. Contrato incluye las condiciones del administrador web y espacios para firmas.</Text>{error ? <Text accessibilityRole="alert" style={ui.error}>{error}</Text> : null}<Action title="Volver a la reserva" secondary disabled={busy} onPress={onClose} /></ScrollView></KeyboardAvoidingView>;
}
