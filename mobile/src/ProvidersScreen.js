import React, { useDeferredValue, useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import useProviders from './useProviders';
import { Action, LoadState, openLink, ui } from './native-ui';
import { money, normalize, whatsappUrl } from './workspace-data.mjs';
import { providerServices } from './providers.mjs';
export default function ProvidersScreen({
  onEdit, onContract
}) {
  const data = useProviders(),
    [search, setSearch] = useState(''),
    deferred = useDeferredValue(search);
  const rows = data.providers.filter(item => normalize([item.nombre, item.telefono, ...providerServices(item).map(service => service.nombre)].join(' ')).includes(normalize(deferred)));
  return <View style={ui.page}><FlatList data={data.loading || data.error ? [] : rows} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" contentContainerStyle={ui.scroll} ListHeaderComponent={<View style={{
      gap: 12
    }}><Text style={ui.heading}>Proveedores</Text><Action title="Nuevo proveedor" onPress={() => onEdit(null)} /><TextInput accessibilityLabel="Buscar proveedor" value={search} onChangeText={setSearch} placeholder="Nombre o servicio" style={ui.input} /><LoadState {...data} /></View>} ListEmptyComponent={!data.loading && !data.error ? <Text style={ui.muted}>No hay proveedores para esta búsqueda.</Text> : null} renderItem={({
      item
    }) => <View style={ui.card}><Text style={ui.title}>{item.nombre}</Text><Text style={ui.muted}>{item.activo === false ? 'Inactivo' : 'Activo'} · {item.telefono || 'Sin teléfono'}</Text>{providerServices(item).map(service => <Text key={service.id} style={ui.body}>{service.nombre} · {money(service.costo)}{service.activo === false ? ' · Inactivo' : ''}</Text>)}<Action title="Contrato marco" secondary onPress={() => onContract(item)} /><Action title="Editar proveedor" onPress={() => onEdit(item)} /><Action title="WhatsApp del proveedor" secondary disabled={!whatsappUrl(item.telefono)} onPress={() => openLink(whatsappUrl(item.telefono))} /></View>} /></View>;
}
