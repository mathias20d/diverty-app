import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db, ADMIN_UID, DATA_PATH } from './src/firebase';

function Button({title,onPress,disabled=false}) {
 return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button,disabled&&{opacity:.5}]}><Text style={s.buttonText}>{title}</Text></Pressable>;
}
function Agenda({user}) {
 const [events,setEvents]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  setLoading(true);setError('');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Panama',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  return onSnapshot(query(collection(db,...DATA_PATH,'eventos'),where('fecha','>=',today)),snap=>{
   setEvents(snap.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha))));setLoading(false);
  },()=>{setError('No pudimos cargar la agenda. Revisa tu conexión y reintenta.');setLoading(false);});
 },[user.uid,retry]);
 return <View style={s.page}>
  <View style={s.header}><View><Text style={s.brand}>Diverty</Text><Text style={s.muted}>Tu agenda de eventos</Text></View><Pressable accessibilityRole="button" onPress={()=>signOut(auth).catch(()=>setError('No pudimos cerrar la sesión. Reintenta.'))}><Text style={s.link}>Cerrar sesión</Text></Pressable></View>
  <Text style={s.heading}>Próximas reservas</Text>
  {loading?<ActivityIndicator size="large" color="#7042d9"/>:error?<View style={s.card}><Text accessibilityRole="alert">{error}</Text><Button title="Reintentar" onPress={()=>setRetry(x=>x+1)}/></View>:<FlatList data={events} keyExtractor={e=>e.id} contentContainerStyle={{paddingBottom:24}} ListEmptyComponent={<Text style={s.muted}>No hay reservas próximas.</Text>} renderItem={({item})=><View style={s.card}><Text style={s.date}>{item.fecha}</Text><Text style={s.title}>{item.cliente||'Cliente'}</Text><Text style={s.body}>{item.servicio||'Servicio por definir'}</Text><Text style={s.muted}>{item.ubicacion||'Lugar por confirmar'}</Text><Text style={s.status}>{item.estado||'Pendiente'}</Text></View>}/>}
 </View>;
}
function Session() {
 const [user,setUser]=useState(null),[loading,setLoading]=useState(true),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>onAuthStateChanged(auth,current=>{
  setUser(current?.uid===ADMIN_UID?current:null);setLoading(false);
  if(current&&current.uid!==ADMIN_UID){setError('Esta cuenta no tiene acceso al administrador de Diverty.');signOut(auth).catch(()=>{});}
 },()=>{setLoading(false);setError('No pudimos comprobar tu sesión.');}),[]);
 async function login(){setBusy(true);setError('');try{await signInWithEmailAndPassword(auth,email.trim(),password);setPassword('');}catch{setError('Revisa tu correo, contraseña y conexión.');}finally{setBusy(false);}}
 if(loading)return <View style={s.center}><ActivityIndicator size="large" color="#7042d9"/><Text style={s.muted}>Preparando Diverty…</Text></View>;
 if(user)return <Agenda user={user}/>;
 return <KeyboardAvoidingView style={s.page} behavior={Platform.OS==='ios'?'padding':'height'}><View style={s.center}><Text style={s.brand}>Diverty</Text><Text style={s.heading}>Bienvenido de nuevo</Text><Text style={s.muted}>Accede con tu cuenta de administrador.</Text>
 <TextInput accessibilityLabel="Correo electrónico" placeholder="Correo electrónico" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" style={s.input}/>
 <TextInput accessibilityLabel="Contraseña" placeholder="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" style={s.input} onSubmitEditing={()=>{if(!busy&&email&&password)login();}}/>
 {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}<Button title={busy?'Entrando…':'Entrar a Diverty'} onPress={login} disabled={busy||!email.trim()||!password}/>
 </View></KeyboardAvoidingView>;
}
export default function App(){return <SafeAreaProvider><SafeAreaView style={s.safe}><StatusBar style="dark"/><Session/></SafeAreaView></SafeAreaProvider>;}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#f5f4fa'},page:{flex:1,padding:22},center:{flex:1,justifyContent:'center',gap:16},brand:{fontSize:30,fontWeight:'900',color:'#7042d9'},heading:{fontSize:24,fontWeight:'800',color:'#202034',marginVertical:16},muted:{fontSize:14,color:'#686878',lineHeight:21},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:20},link:{color:'#7042d9',fontWeight:'700'},input:{backgroundColor:'#fff',borderWidth:1,borderColor:'#dbd9e7',borderRadius:14,padding:16,fontSize:16},button:{backgroundColor:'#7042d9',borderRadius:14,padding:16,alignItems:'center',marginTop:12},buttonText:{color:'#fff',fontSize:16,fontWeight:'700'},error:{color:'#b42342'},card:{backgroundColor:'#fff',borderRadius:18,padding:18,marginBottom:14,gap:8,borderWidth:1,borderColor:'#e7e4f0'},date:{fontSize:13,color:'#7042d9',fontWeight:'800'},title:{fontSize:20,fontWeight:'800',color:'#202034'},body:{fontSize:15,color:'#393947'},status:{fontWeight:'700',color:'#7042d9',marginTop:4}});
