import {Action,ui} from './src/native-ui';
import {useFonts,Outfit_400Regular,Outfit_600SemiBold,Outfit_700Bold,Outfit_800ExtraBold,Outfit_900Black} from '@expo-google-fonts/outfit';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, ADMIN_UID } from './src/firebase';
import Workspace from './src/Workspace';

function Button(props){return <Action {...props}/>;}
function Session() {
 const [user,setUser]=useState(null),[loading,setLoading]=useState(true),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>onAuthStateChanged(auth,current=>{
  setUser(current?.uid===ADMIN_UID?current:null);setLoading(false);
  if(current&&current.uid!==ADMIN_UID){setError('Esta cuenta no tiene acceso al administrador de Diverty.');signOut(auth).catch(()=>{});}
 },()=>{setLoading(false);setError('No pudimos comprobar tu sesión.');}),[]);
 async function login(){setBusy(true);setError('');try{await signInWithEmailAndPassword(auth,email.trim(),password);setPassword('');}catch{setError('Revisa tu correo, contraseña y conexión.');}finally{setBusy(false);}}
 if(loading)return <View style={s.center}><ActivityIndicator size="large" color="#7657FF"/><Text style={[s.muted,{fontFamily:'Outfit_600SemiBold'}]}>Preparando Diverty…</Text></View>;
 if(user)return <Workspace/>;
 return <KeyboardAvoidingView style={s.page} behavior={Platform.OS==='ios'?'padding':'height'}><View style={s.center}><Image source={require('./assets/diverty-logo.png')} style={{width:170,height:100,alignSelf:'center',borderRadius:22}} resizeMode="contain"/><Text style={s.brand}>Diverty CRM</Text><Text style={s.heading}>Bienvenido de nuevo</Text><Text style={[s.muted,{fontFamily:'Outfit_600SemiBold'}]}>Accede con tu cuenta de administrador.</Text>
 <TextInput accessibilityLabel="Correo electrónico" placeholder="Correo electrónico" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" style={[s.input,{fontFamily:'Outfit_400Regular'}]}/>
 <TextInput accessibilityLabel="Contraseña" placeholder="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" style={[s.input,{fontFamily:'Outfit_400Regular'}]} onSubmitEditing={()=>{if(!busy&&email&&password)login();}}/>
 {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}<Button title={busy?'Entrando…':'Entrar a Diverty'} onPress={login} disabled={busy||!email.trim()||!password}/>
 </View></KeyboardAvoidingView>;
}
export default function App(){const [fontsLoaded,fontError]=useFonts({Outfit_400Regular,Outfit_600SemiBold,Outfit_700Bold,Outfit_800ExtraBold,Outfit_900Black});if(!fontsLoaded&&!fontError)return <View style={{flex:1,backgroundColor:'#071126',alignItems:'center',justifyContent:'center'}}><ActivityIndicator color="#FF3EA5"/></View>;return <SafeAreaProvider><SafeAreaView style={s.safe}><StatusBar style="light"/><Session/></SafeAreaView></SafeAreaProvider>;}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#071126'},page:{flex:1,padding:22,backgroundColor:'#F7F8FC'},center:{flex:1,justifyContent:'center',gap:16},brand:{fontSize:30,fontFamily:'Outfit_900Black',color:'#7657FF'},heading:{fontSize:24,fontFamily:'Outfit_800ExtraBold',color:'#0F172A',marginVertical:16},muted:{fontSize:14,color:'#64748B',lineHeight:21},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:20},link:{color:'#7657FF',fontFamily:'Outfit_700Bold'},input:{backgroundColor:'#fff',borderWidth:1,borderColor:'#E2E8F0',borderRadius:14,padding:16,fontSize:16},button:{backgroundColor:'#7657FF',borderRadius:14,padding:16,alignItems:'center',marginTop:12},buttonText:{color:'#fff',fontSize:16,fontFamily:'Outfit_700Bold'},error:{color:'#b42342'},card:{backgroundColor:'#fff',borderRadius:18,padding:18,marginBottom:14,gap:8,borderWidth:1,borderColor:'#e7e4f0'},date:{fontSize:13,color:'#7657FF',fontFamily:'Outfit_800ExtraBold'},title:{fontSize:20,fontFamily:'Outfit_800ExtraBold',color:'#0F172A'},body:{fontSize:15,color:'#393947'},status:{fontFamily:'Outfit_700Bold',color:'#7657FF',marginTop:4}});
