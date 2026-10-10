import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { auth, db, DATA_PATH } from './firebase';
import useProviders from './useProviders';
import { Action, LoadState, ui } from './native-ui';
import { money } from './workspace-data.mjs';
import { expenseSummary } from './expenses.mjs';
import { assignmentOperation, assignProvider, markProviderPayment, providerPaid, providerServices } from './providers.mjs';
import useScreenBack from './useScreenBack';
const messages = {
  INVALID_PROVIDER_COST: 'Escribe un costo válido (cero o mayor, hasta dos decimales).',
  INVALID_ASSIGNMENT: 'Selecciona un proveedor y su servicio.',
  PROVIDER_UNAVAILABLE: 'Este proveedor o servicio ya no está activo. Actualiza la selección.',
  EVENT_NOT_FOUND: 'La reserva ya no está disponible.',
  INVALID_COSTS: 'Los costos antiguos necesitan revisión en la app actual.',
  ASSIGNMENT_CONFLICT: 'Este registro necesita revisión antes de reintentarlo.'
};
export default function ProviderAssignments({
  event,
  onClose
}) {
  const data = useProviders(),
    [current, setCurrent] = useState(event),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(''),
    [retry, setRetry] = useState(0),
    [supplier, setSupplier] = useState(''),
    [service, setService] = useState(''),
    [cost, setCost] = useState(''),
    [pending, setPending] = useState(null),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState('');
  const lock = useRef(false),
    key = `diverty-provider-assignment:${auth.currentUser.uid}:${event.id}`;
  useScreenBack(onClose, busy);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key).then(value => {
      if (!active) return;
      if (value) {
        const operation = assignmentOperation(JSON.parse(value));
        setPending(operation);
        setSupplier(operation.proveedorId);
        setService(operation.servicioId);
        setCost(String(operation.costo));
      }
      setReady(true);
    }).catch(() => {
      if (active) setError('No pudimos recuperar el registro pendiente. Cierra y vuelve a abrir.');
    });
    return () => {
      active = false;
    };
  }, [key]);
  useEffect(() => {
    setLoading(true);
    setLoadError('');
    return onSnapshot(doc(db, ...DATA_PATH, 'eventos', event.id), snap => {
      if (snap.exists() && !snap.data().deletedLocally) setCurrent({
        ...snap.data(),
        id: event.id
      });else setLoadError('La reserva ya no está disponible.');
      setLoading(false);
    }, () => {
      setLoading(false);
      setLoadError('No pudimos actualizar los costos.');
    });
  }, [event.id, retry]);
  const provider = data.providers.find(item => item.id === supplier),
    services = provider ? providerServices(provider).filter(item => item.activo !== false) : [],
    items = (Array.isArray(current.subcontratos) ? current.subcontratos : []).filter(Boolean);
  let totals;
  try {
    totals = expenseSummary(current);
  } catch {
    totals = null;
  }
  function signal(nonce) {
    setDoc(doc(db, ...DATA_PATH, 'configuracion', 'syncBus'), {
      entityType: 'evento',
      entityId: event.id,
      action: 'update',
      deviceId: 'diverty-native',
      changedAt: new Date().toISOString(),
      nonce
    }).catch(() => {});
  }
  async function save() {
    if (lock.current) return;
    let operation = pending;
    try {
      if (!operation) operation = assignmentOperation({
        id: `sub-${doc(collection(db, ...DATA_PATH, 'eventos')).id}`,
        proveedorId: supplier,
        servicioId: service,
        costo: cost,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      setError(messages[e.message] || 'Revisa el proveedor y el costo.');
      return;
    }
    lock.current = true;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await AsyncStorage.setItem(key, JSON.stringify(operation));
      setPending(operation);
      const saved = await assignProvider({
        runTransaction,
        db,
        ref: doc(db, ...DATA_PATH, 'eventos', event.id),
        providerRef: doc(db, ...DATA_PATH, 'proveedores', operation.proveedorId),
        operation
      });
      setCurrent({
        ...saved,
        id: event.id
      });
      await AsyncStorage.removeItem(key).catch(() => {});
      setPending(null);
      setSupplier('');
      setService('');
      setCost('');
      signal(operation.id);
      setSuccess('Proveedor asignado. El costo ya aparece en los gastos y las finanzas del evento.');
    } catch (e) {
      if (['PROVIDER_UNAVAILABLE', 'INVALID_ASSIGNMENT', 'INVALID_PROVIDER_COST', 'INVALID_COSTS', 'EVENT_NOT_FOUND'].includes(e.message)) {
        try {
          await AsyncStorage.removeItem(key);
          setPending(null);
        } catch {}
      }
      setError(messages[e.message] || 'No se pudo confirmar. Reintenta con el mismo registro para evitar duplicarlo.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function payment(item, paid) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const saved = await markProviderPayment({
        runTransaction,
        db,
        ref: doc(db, ...DATA_PATH, 'eventos', event.id),
        id: item.id,
        paid,
        now: new Date().toISOString()
      });
      setCurrent({
        ...saved,
        id: event.id
      });
      signal(`payment-${item.id}-${Date.now()}`);
      setSuccess(paid ? 'Pago del proveedor marcado como realizado.' : 'Pago del proveedor marcado como pendiente.');
    } catch (e) {
      setError(messages[e.message] || 'No pudimos confirmar el estado del pago. Reintenta.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function confirmPayment(item) {
    const paid = !providerPaid(item);
    Alert.alert(paid ? '¿Ya pagaste al proveedor?' : '¿Marcar como pendiente?', `${item.nombre} · ${item.servicio} · ${money(item.costo)}. Este botón registra el estado; no envía dinero.`, [{
      text: 'Cancelar',
      style: 'cancel'
    }, {
      text: paid ? 'Sí, ya pagué' : 'Marcar pendiente',
      onPress: () => payment(item, paid)
    }]);
  }
  const blocked = busy || loading || !!loadError || data.loading || !!data.error || !ready || !totals;
  return <KeyboardAvoidingView style={{
    flex: 1
  }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView style={ui.page} contentContainerStyle={ui.scroll} keyboardShouldPersistTaps="handled"><Text style={ui.heading}>Proveedores del evento</Text><Text style={ui.body}>{current.cliente} · {current.fecha}</Text><LoadState loading={loading} error={loadError} reload={() => setRetry(value => value + 1)} />{totals ? <View style={ui.card}><Text style={ui.body}>Gastos internos: {money(totals.internal)}</Text><Text style={ui.title}>Proveedores: {money(totals.providers)}</Text><Text style={ui.body}>Costo total: {money(totals.total)}</Text><Text style={ui.body}>Ganancia estimada: {money(totals.profit)}</Text></View> : <Text style={ui.error}>Los costos requieren revisión en la app actual.</Text>}{success ? <Text accessibilityRole="alert" style={ui.success}>{success}</Text> : null}{items.length ? items.map((item, index) => <View key={item.id || index} style={ui.card}><Text style={ui.title}>{item.nombre || 'Proveedor'}</Text><Text style={ui.body}>{item.servicio} · {money(item.costo)}</Text><Text style={ui.muted}>{providerPaid(item) ? 'Pagado' : 'Pago pendiente'}</Text><Action title={providerPaid(item) ? 'Marcar pago pendiente' : 'Marcar proveedor pagado'} secondary disabled={blocked || !item.id} onPress={() => confirmPayment(item)} /></View>) : <Text style={ui.muted}>Aún no hay proveedores asignados.</Text>}<View style={ui.card}><Text style={ui.title}>Asignar proveedor</Text><LoadState {...data} />{pending ? <Text style={ui.muted}>Hay una asignación por confirmar; reintentar conserva el mismo registro.</Text> : null}{data.providers.filter(item => item.activo !== false).map(item => <Action key={item.id} title={item.nombre} secondary={supplier !== item.id} disabled={blocked || !!pending} onPress={() => {
          setSupplier(item.id);
          setService('');
          setCost('');
        }} />)}{provider ? <Text style={ui.muted}>Servicios de {provider.nombre}</Text> : null}{services.map(item => <Action key={item.id} title={`${item.nombre} · ${money(item.costo)}`} secondary={service !== item.id} disabled={blocked || !!pending} onPress={() => {
          setService(item.id);
          setCost(String(item.costo));
        }} />)}<Text style={ui.body}>Costo acordado ($)</Text><TextInput accessibilityLabel="Costo acordado del proveedor" value={cost} onChangeText={setCost} keyboardType="decimal-pad" editable={!blocked && !pending} style={ui.input} /><Text style={ui.muted}>El costo del proveedor no cambia el precio ni los abonos del cliente.</Text><Action title={busy ? 'Guardando asignación…' : pending ? 'Reintentar asignación' : 'Guardar asignación'} onPress={save} disabled={blocked} /></View>{error ? <Text accessibilityRole="alert" style={ui.error}>{error}</Text> : null}<Action title="Volver a la reserva" secondary disabled={busy} onPress={onClose} /></ScrollView></KeyboardAvoidingView>;
}
