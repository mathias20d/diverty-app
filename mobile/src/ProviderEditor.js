import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { collection, doc, runTransaction, setDoc } from 'firebase/firestore';
import { db, DATA_PATH } from './firebase';
import { Action, ui } from './native-ui';
import { providerDraft, providerServices, saveProvider } from './providers.mjs';
import useScreenBack from './useScreenBack';
const messages = {
  PROVIDER_NAME_REQUIRED: 'Escribe el nombre del proveedor.',
  SERVICE_NAME_REQUIRED: 'Todos los servicios deben tener un nombre.',
  INVALID_PROVIDER_COST: 'El costo debe ser cero o mayor y tener hasta dos decimales.',
  PROVIDER_CHANGED: 'El proveedor cambió en otro dispositivo. Vuelve a la lista y abre sus datos actualizados.'
};
export default function ProviderEditor({
  original,
  onClose
}) {
  const [draft, setDraft] = useState(() => ({
      ...original,
      nombre: original?.nombre || '',
      activo: original?.activo !== false,
      servicios: original ? providerServices(original) : [],
      condicionesPago: original?.condicionesPago || 'Pago contra prestación satisfactoria del servicio.'
    })),
    [pending, setPending] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const ref = useRef(original ? doc(db, ...DATA_PATH, 'proveedores', original.id) : doc(collection(db, ...DATA_PATH, 'proveedores'))),
    operation = useRef(`prov-${doc(collection(db, ...DATA_PATH, 'proveedores')).id}`),
    lock = useRef(false);
  useScreenBack(onClose, busy);
  const change = (key, value) => setDraft(current => ({
    ...current,
    [key]: value
  }));
  function serviceChange(id, key, value) {
    setDraft(current => ({
      ...current,
      servicios: current.servicios.map(item => item.id === id ? {
        ...item,
        [key]: value
      } : item)
    }));
  }
  async function save() {
    if (lock.current) return;
    let payload=pending;
    try { if(!payload) payload=providerDraft(draft); } catch(e) { setError(messages[e.message] || 'Revisa los datos del proveedor.'); return; }
    setPending(payload);
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await saveProvider({
        runTransaction,
        db,
        ref: ref.current,
        draft:payload,
        original,
        operationId: operation.current,
        now: new Date().toISOString()
      });
      setDoc(doc(db, ...DATA_PATH, 'configuracion', 'syncBus'), {
        entityType: 'proveedor',
        entityId: ref.current.id,
        action: 'update',
        deviceId: 'diverty-native',
        changedAt: new Date().toISOString(),
        nonce: operation.current
      }).catch(() => {});
      Alert.alert('Proveedor guardado', 'Sus datos y servicios se guardaron en Diverty.');
      onClose();
    } catch (e) {
      setError(messages[e.message] || 'No pudimos confirmar el guardado. Revisa la conexión y reintenta.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return <KeyboardAvoidingView style={{
    flex: 1
  }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView style={ui.page} contentContainerStyle={ui.scroll} keyboardShouldPersistTaps="handled"><Text style={ui.heading}>{original ? 'Editar proveedor' : 'Nuevo proveedor'}</Text>{[['nombre', 'Nombre del proveedor'], ['telefono', 'Teléfono del proveedor'], ['email', 'Correo del proveedor'], ['identificacion', 'Identificación / RUC'], ['direccion', 'Dirección del proveedor'], ['condicionesPago', 'Condiciones de pago']].map(([key, label]) => <View key={key}><Text style={ui.body}>{label}</Text><TextInput accessibilityLabel={label} value={draft[key] || ''} onChangeText={value => change(key, value)} editable={!busy&&!pending} style={ui.input} keyboardType={key === 'telefono' ? 'phone-pad' : key === 'email' ? 'email-address' : 'default'} autoCapitalize={key === 'email' ? 'none' : 'sentences'} multiline={key === 'condicionesPago' || key === 'direccion'} /></View>)}<Action title={draft.activo ? 'Proveedor activo · Desactivar' : 'Proveedor inactivo · Activar'} secondary disabled={busy||!!pending} onPress={() => change('activo', !draft.activo)} />{pending?<Text style={ui.muted}>Hay un guardado por confirmar. Reintentar conserva los mismos datos para evitar duplicarlo.</Text>:null}<Text style={ui.title}>Servicios y costos</Text>{draft.servicios.map((item, index) => <View key={item.id} style={ui.card}><Text style={ui.muted}>Servicio {index + 1}</Text><TextInput accessibilityLabel={`Nombre del servicio ${index + 1}`} value={item.nombre} placeholder="Ej.: Pintacaritas" editable={!busy&&!pending} onChangeText={value => serviceChange(item.id, 'nombre', value)} style={ui.input} /><TextInput accessibilityLabel={`Costo del servicio ${index + 1}`} value={String(item.costo ?? 0)} keyboardType="decimal-pad" editable={!busy&&!pending} onChangeText={value => serviceChange(item.id, 'costo', value)} style={ui.input} /><Action title={item.activo === false ? 'Activar servicio' : 'Desactivar servicio'} secondary disabled={busy||!!pending} onPress={() => serviceChange(item.id, 'activo', item.activo === false)} /></View>)}<Action title="Añadir servicio del proveedor" secondary disabled={busy||!!pending} onPress={() => change('servicios', [...draft.servicios, {
        id: `srv-${doc(collection(db, ...DATA_PATH, 'proveedores')).id}`,
        nombre: '',
        costo: 0,
        activo: true
      }])} /><Text style={ui.muted}>Desactivar impide nuevas asignaciones y conserva las reservas que ya lo usan.</Text>{error ? <Text accessibilityRole="alert" style={ui.error}>{error}</Text> : null}<Action title={busy ? 'Guardando proveedor…' : pending ? 'Reintentar proveedor' : 'Guardar proveedor'} disabled={busy} onPress={save} /><Action title="Volver a proveedores" secondary disabled={busy} onPress={onClose} /></ScrollView></KeyboardAvoidingView>;
}
