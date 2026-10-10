import React from 'react';
import {ActivityIndicator,Alert,Linking,Pressable,StyleSheet,Text,View} from 'react-native';
import {monthLabel} from './workspace-data.mjs';

export function Action({title,onPress,disabled=false,secondary=false,danger=false}){
 return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[ui.button,secondary&&ui.secondary,danger&&ui.danger,disabled&&{opacity:.45}]}><Text style={[ui.buttonText,secondary&&ui.secondaryText]}>{title}</Text></Pressable>;
}
export function LoadState({loading,error,cached,reload}){
 return <>{loading?<ActivityIndicator size="large" color="#7042d9"/>:null}{error?<View style={ui.card}><Text accessibilityRole="alert" style={ui.error}>{error}</Text><Action title="Reintentar" onPress={reload}/></View>:null}{cached&&!loading&&!error?<Text style={ui.muted}>Datos guardados en este dispositivo. Esperando conexión para actualizar.</Text>:null}</>;
}
export function MonthSelector({month,onMove,disabled=false}){
 return <View style={ui.month}><Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" disabled={disabled} onPress={()=>onMove(-1)} style={ui.arrow}><Text style={ui.arrowText}>‹</Text></Pressable><Text style={ui.monthText}>{monthLabel(month)}</Text><Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" disabled={disabled} onPress={()=>onMove(1)} style={ui.arrow}><Text style={ui.arrowText}>›</Text></Pressable></View>;
}
export async function openLink(url){
 if(!url)return Alert.alert('Contacto no disponible','Revisa el teléfono o la dirección guardada en la reserva.');
 try{await Linking.openURL(url);}catch{Alert.alert('No se pudo abrir','Comprueba que tienes una aplicación para abrir este enlace.');}
}
export const ui=StyleSheet.create({page:{flex:1,paddingHorizontal:18},scroll:{paddingBottom:24,gap:14},heading:{fontSize:25,fontWeight:'800',color:'#202034',marginVertical:14},title:{fontSize:18,fontWeight:'800',color:'#202034'},body:{fontSize:15,color:'#393947',lineHeight:22},muted:{fontSize:13,color:'#686878',lineHeight:20},card:{backgroundColor:'#fff',borderRadius:18,padding:16,gap:10,borderWidth:1,borderColor:'#e7e4f0'},input:{backgroundColor:'#fff',borderWidth:1,borderColor:'#dbd9e7',borderRadius:12,padding:12,fontSize:16,color:'#202034'},button:{backgroundColor:'#7042d9',padding:13,borderRadius:12,marginTop:4},buttonText:{color:'#fff',textAlign:'center',fontWeight:'700',fontSize:14},secondary:{backgroundColor:'#f2eff8'},secondaryText:{color:'#7042d9'},danger:{backgroundColor:'#b42342'},error:{color:'#b42342',lineHeight:21},success:{color:'#14805e',lineHeight:21},row:{flexDirection:'row',gap:10,alignItems:'center'},chips:{flexDirection:'row',flexWrap:'wrap',gap:7},chip:{backgroundColor:'#ece9f5',borderRadius:10,paddingHorizontal:10,paddingVertical:9},activeChip:{backgroundColor:'#7042d9'},chipText:{color:'#686878',fontSize:12,fontWeight:'700'},activeText:{color:'#fff'},month:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},monthText:{fontWeight:'800',fontSize:18,color:'#202034',textTransform:'capitalize',flex:1,textAlign:'center'},arrow:{paddingHorizontal:16,paddingVertical:8,borderRadius:12,backgroundColor:'#ece9f5'},arrowText:{fontSize:24,color:'#7042d9',fontWeight:'700'}});
