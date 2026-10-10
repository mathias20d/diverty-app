import React,{useDeferredValue,useEffect,useMemo,useState} from 'react';
import {FlatList,Text,TextInput,View} from 'react-native';
import {doc,onSnapshot} from 'firebase/firestore';
import {db,DATA_PATH} from './firebase';
import {clientPrefill,clientsFromEvents,dateLabel,normalize,whatsappUrl} from './workspace-data.mjs';
import {Action,LoadState,openLink,ui} from './native-ui';
import ReservationCard from './ReservationCard';
import useScreenBack from './useScreenBack';

export default function ClientsScreen({data,onOpen,onNew}){
 const [search,setSearch]=useState(''),[selected,setSelected]=useState(''),[hidden,setHidden]=useState([]),[ready,setReady]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const deferred=useDeferredValue(search);
 useScreenBack(()=>setSelected(''),false,!!selected);
 useEffect(()=>{setReady(false);setError('');return onSnapshot(doc(db,...DATA_PATH,'configuracion','clientesOcultos'),snapshot=>{setHidden(Array.isArray(snapshot.data()?.clients)?snapshot.data().clients:[]);setReady(true);},()=>{setError('No pudimos consultar la lista de clientes. Reintenta.');});},[retry]);
 const clients=useMemo(()=>clientsFromEvents(data.events,hidden),[data.events,hidden]);
 const rows=useMemo(()=>clients.filter(client=>normalize([client.nombre,client.telefono,client.email].join(' ')).includes(normalize(deferred))||(deferred.replace(/\D/g,'').length>=3&&client.telefono.replace(/\D/g,'').includes(deferred.replace(/\D/g,'')))),[clients,deferred]);
 const current=clients.find(client=>client.key===selected);
 if(current)return <View style={ui.page}><FlatList data={data.loading||data.error?[]:current.reservas.slice().reverse()} keyExtractor={event=>event.id} contentContainerStyle={ui.scroll} ListHeaderComponent={<View style={{gap:12}}><Action title="Volver a clientes" secondary onPress={()=>setSelected('')}/><Text style={ui.heading}>{current.nombre}</Text><Text style={ui.body}>{current.telefono||'Teléfono no registrado'}</Text><Text style={ui.muted}>{current.email||'Correo no registrado'}</Text><Action title="Nueva reserva con este cliente" onPress={()=>onNew(clientPrefill(current))}/><Action title="Abrir WhatsApp" secondary disabled={!whatsappUrl(current.telefono)} onPress={()=>openLink(whatsappUrl(current.telefono))}/><Text style={ui.title}>Historial de reservas</Text><LoadState {...data}/></View>} renderItem={({item})=><ReservationCard event={item} onOpen={onOpen}/>} /></View>;
 return <View style={ui.page}><FlatList data={!ready||data.loading||data.error||error?[]:rows} keyExtractor={client=>client.key} keyboardShouldPersistTaps="handled" contentContainerStyle={ui.scroll} ListHeaderComponent={<View style={{gap:12}}><Text style={ui.heading}>Clientes</Text><TextInput accessibilityLabel="Buscar cliente" placeholder="Nombre, teléfono o correo" value={search} onChangeText={setSearch} style={ui.input}/><LoadState {...data} loading={data.loading||(!ready&&!error)} error={data.error||error} reload={()=>{data.reload();setRetry(value=>value+1);}}/><Text style={ui.muted}>Clientes de reservas guardadas; conserva los clientes ocultos en la app actual.</Text></View>} ListEmptyComponent={ready&&!data.loading&&!data.error&&!error?<Text style={ui.muted}>No encontramos clientes para esta búsqueda.</Text>:null} renderItem={({item})=><View style={ui.card}><Text style={ui.title}>{item.nombre}</Text><Text style={ui.body}>{item.telefono||'Teléfono no registrado'}</Text>{item.email?<Text style={ui.muted}>{item.email}</Text>:null}<Text style={ui.muted}>{item.reservas.length} reservas · Última: {dateLabel(item.ultimaFecha)}</Text><Action title="Nueva reserva con este cliente" onPress={()=>onNew(clientPrefill(item))}/><Action title="Ver historial y contacto" secondary onPress={()=>setSelected(item.key)}/></View>}/></View>;
}
