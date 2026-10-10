import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, DATA_PATH } from './firebase';
import ExpenseOverview from './ExpenseOverview';
import { Action, LoadState, openLink, ui } from './native-ui';
import { dateLabel, mapsUrl, money, webRequest, whatsappUrl } from './workspace-data.mjs';
import { serviceDurationHours } from './domain/service-duration.mjs';
import useScreenBack from './useScreenBack';
export default function ReservationDetail({
  event,
  onClose,
  onEdit,
  onPayment,
  onExpense,
  onProviders,
  onDocuments, onReview
}) {
  useScreenBack(onClose);
  const [current, setCurrent] = useState(event),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0),
    [exists, setExists] = useState(true),
    [cached, setCached] = useState(false);
  useEffect(() => {
    setLoading(true);
    setError('');
    return onSnapshot(doc(db, ...DATA_PATH, 'eventos', event.id), {
      includeMetadataChanges: true
    }, snap => {
      setExists(snap.exists() && !snap.data()?.deletedLocally);
      if (snap.exists()) setCurrent({
        ...snap.data(),
        id: event.id
      });
      setCached(snap.metadata.fromCache);
      setLoading(false);
    }, () => {
      setLoading(false);
      setError('No pudimos actualizar esta reserva. Reintenta.');
    });
  }, [event.id, retry]);
  const lines = Array.isArray(current.serviciosSeleccionados) ? current.serviciosSeleccionados : [];
  return <ScrollView style={ui.page} contentContainerStyle={ui.scroll}>
  <Action title="Volver" secondary onPress={onClose} /><Text style={ui.heading}>Detalle de reserva</Text><LoadState loading={loading} error={error} cached={cached} reload={() => setRetry(value => value + 1)} />
  {!exists ? <Text style={ui.error}>La reserva ya no está disponible.</Text> : <>
   <View style={ui.card}><Text style={ui.title}>{current.cliente || 'Cliente'}</Text><Text style={ui.body}>{dateLabel(current.fecha)} · {current.hora || 'Hora por definir'}</Text><Text style={{
          color: '#7042d9',
          fontWeight: '700'
        }}>{webRequest(current) ? 'Solicitud web por revisar' : current.estado || 'Pendiente'}</Text><Text style={ui.body}>{current.telefono || 'Teléfono no registrado'}</Text>{current.email ? <Text style={ui.muted}>{current.email}</Text> : null}<Action title="Contactar por WhatsApp" secondary disabled={!whatsappUrl(current.telefono)} onPress={() => openLink(whatsappUrl(current.telefono))} /></View>
   <View style={ui.card}><Text style={ui.title}>Lugar del evento</Text><Text style={ui.body}>{current.ubicacion || 'Lugar por confirmar'}</Text>{current.direccion ? <Text style={ui.body}>{current.direccion}</Text> : null}{current.referenciaLugar ? <Text style={ui.muted}>{current.referenciaLugar}</Text> : null}<Action title="Abrir ubicación guardada" secondary disabled={!mapsUrl(current)} onPress={() => openLink(mapsUrl(current))} /></View>
   <View style={ui.card}><Text style={ui.title}>Productos y servicios</Text>{lines.length ? lines.filter(Boolean).map((line, index) => <View key={line.id || index} style={{
          gap: 5,
          paddingVertical: 8
        }}><Text style={ui.body}>{line.nombre || 'Servicio'}</Text><Text style={ui.muted}>Cantidad: {line.cantidad ?? 1}{serviceDurationHours(line) > 0 ? ` · Duración: ${serviceDurationHours(line)} h` : ''} · Subtotal: {money(line.precio)}</Text>{line.descripcion ? <Text style={ui.muted}>{line.descripcion}</Text> : null}{Array.isArray(line.incluye) ? line.incluye.map((item, i) => <Text key={i} style={ui.muted}>• {String(item)}</Text>) : line.incluye ? <Text style={ui.muted}>{String(line.incluye)}</Text> : null}</View>) : <Text style={ui.body}>{current.servicio || 'Servicio por definir'}</Text>}<Text style={ui.muted}>Transporte: {money(current.transporte)}</Text></View>
   {current.comentarios ? <View style={ui.card}><Text style={ui.title}>Comentarios</Text><Text style={ui.body}>{String(current.comentarios)}</Text></View> : null}
   <View style={ui.card}><Text style={ui.title}>Total: {money(current.total)}</Text><Text style={ui.body}>Abonos: {money(current.abono)}</Text><Text style={ui.title}>Saldo: {money(Math.max(0, Number(current.total || 0) - Number(current.abono || 0)))}</Text><ExpenseOverview event={current} /><Action title="Abonos y saldo" disabled={loading || !!error} onPress={() => onPayment(current)} /><Action title="Gastos del evento" disabled={loading || !!error} onPress={() => onExpense(current)} /><Action title="Proveedores del evento" disabled={loading || !!error} onPress={() => onProviders(current)} /><Action title="Facturas y cotizaciones" secondary disabled={loading || !!error} onPress={() => onDocuments(current)} /><Action title="Editar reserva" secondary disabled={loading || !!error} onPress={() => onEdit(current)} /></View>
   {webRequest(current) ? <Action title="Revisar solicitud web" disabled={loading || !!error || cached} onPress={() => onReview(current)}/> : null}
  </>}
 </ScrollView>;
}
