import React,{useDeferredValue,useMemo,useState} from 'react';
import {FlatList,Pressable,Text,TextInput,View} from 'react-native';
import ReservationCard from './ReservationCard';
import {Action,LoadState,ui} from './native-ui';
import {searchEvents} from './workspace-data.mjs';

export default function AgendaScreen({data,scope,setScope,onOpen,onNew,onCalendar,onChristmas}){
 const [search,setSearch]=useState(''),[status,setStatus]=useState('todos');
 const deferred=useDeferredValue(search);
 const rows=useMemo(()=>searchEvents(data.events,deferred,status),[data.events,deferred,status]);
 return <View style={ui.page}>
  <FlatList data={data.loading||data.error?[]:rows} keyExtractor={event=>event.id} keyboardShouldPersistTaps="handled" contentContainerStyle={ui.scroll}
   ListHeaderComponent={<View style={{gap:12}}><Text style={ui.heading}>Agenda de reservas</Text>{onChristmas?<Action title="Operación Navidad" secondary onPress={onChristmas}/>:null}<Action title="Calendario" secondary onPress={onCalendar}/><Action title="Nueva reserva" onPress={()=>onNew({})}/>
    <View style={ui.chips}>{[['proximas','Próximas'],['todas','Todas / historial']].map(([value,label])=><Pressable accessibilityRole="button" accessibilityState={{selected:scope===value}} key={value} onPress={()=>setScope(value)} style={[ui.chip,scope===value&&ui.activeChip]}><Text style={[ui.chipText,scope===value&&ui.activeText]}>{label}</Text></Pressable>)}</View>
    <TextInput accessibilityLabel="Buscar reservas" placeholder="Nombre, teléfono, servicio o fecha" style={ui.input} value={search} onChangeText={setSearch}/>
    <View style={ui.chips}>{[['todos','Todos'],['pendientes','Pendientes'],['confirmadas','En proceso'],['cotizaciones','Cotizaciones'],['completadas','Completadas'],['canceladas','Canceladas']].map(([value,label])=><Pressable accessibilityRole="button" accessibilityState={{selected:status===value}} key={value} style={[ui.chip,status===value&&ui.activeChip]} onPress={()=>setStatus(value)}><Text style={[ui.chipText,status===value&&ui.activeText]}>{label}</Text></Pressable>)}</View>
    <LoadState {...data}/>{!data.loading&&!data.error?<Text style={ui.muted}>{rows.length} reservas · {scope==='proximas'?'desde hoy':'incluye fechas anteriores'}</Text>:null}
   </View>}
   ListEmptyComponent={!data.loading&&!data.error?<Text style={ui.muted}>No hay reservas para esta búsqueda.</Text>:null}
   renderItem={({item})=><ReservationCard event={item} onOpen={onOpen}/>}/>
 </View>;
}
