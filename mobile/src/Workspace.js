import {Home,Calendar,Users,Truck,PieChart,Globe2,Settings,BellRing,LogOut} from 'lucide-react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {WEB_THEME as T,WEB_FONTS as F} from './web-theme.mjs';
import {duplicateReservationDraft} from './reservation-duplicate.mjs';
import React, { useState } from 'react';
import appConfig from '../app.json';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { panamaToday } from './domain/date-availability.mjs';
import { monthRange, moveMonth } from './workspace-data.mjs';
import useReservations from './useReservations';
import { ui } from './native-ui';
import AgendaScreen from './AgendaScreen';
import CalendarScreen from './CalendarScreen';
import ClientsScreen from './ClientsScreen';
import FinanceScreen from './FinanceScreen';
import ReservationDetail from './ReservationDetail';
import ReservationEditor from './ReservationEditor';
import PaymentScreen from './PaymentScreen';
import ExpenseScreen from './ExpenseScreen';
import ProvidersScreen from './ProvidersScreen';
import ProviderEditor from './ProviderEditor';
import ProviderAssignments from './ProviderAssignments';
import ProviderDocumentsScreen from './ProviderDocumentsScreen';
import DocumentsScreen from './DocumentsScreen';
import useScreenBack from './useScreenBack';
import WebAdminScreen from './WebAdminScreen';
import {ADMIN_MENU as tabs} from './admin-settings.mjs';
import useAdminSettings from './useAdminSettings';
import HomeScreen from './HomeScreen';
import SettingsScreen from './SettingsScreen';
import RequestsScreen from './RequestsScreen';
import RequestReviewScreen from './RequestReviewScreen';
import FinancialCorrectionScreen from './FinancialCorrectionScreen';
import ChristmasOperationsScreen from './ChristmasOperationsScreen';
export default function Workspace() {
  const today = panamaToday();
  const settings = useAdminSettings();
  const [settingsBusy,setSettingsBusy] = useState(false);
  const [settingsDirty,setSettingsDirty] = useState(false);
  const navigate = action => {if(settingsDirty)Alert.alert('Cambios sin guardar','¿Descartar los cambios de ajustes?',[{text:'Continuar editando',style:'cancel'},{text:'Descartar',style:'destructive',onPress:()=>{setSettingsDirty(false);action();}}]);else action();};
  const [tab, setTab] = useState('inicio'),
    [scope, setScope] = useState('proximas'),
    [month, setMonth] = useState(today.slice(0, 7)),
    [selected, setSelected] = useState(today),
    [routes, setRoutes] = useState([]),
    [calendarBusy, setCalendarBusy] = useState(false);
  const blocked = settingsBusy || calendarBusy;
  const range = tab === 'calendario' || tab === 'finanzas' ? monthRange(month) : tab === 'agenda' && scope === 'proximas' ? {
    start: today
  } : {};
  const data = useReservations(range);
  const route = routes[routes.length - 1];
  useScreenBack(() => navigate(() => setTab('inicio')), blocked, !route && (blocked || tab !== 'inicio'));
  const push = route => setRoutes(value => [...value, route]),
    back = () => setRoutes(value => value.slice(0, -1));
  const open = (event, documentType) => push(['factura','cotizacion'].includes(documentType)
    ? {type:'documents',event,initialType:documentType}
    : {type:'detail',event}),
    create = initialValues => push({
      type: 'editor',
      original: null,
      initialValues
    });
  function move(delta) {
    const next = moveMonth(month, delta);
    setMonth(next);
    setSelected(next === today.slice(0, 7) ? today : `${next}-01`);
  }
  const routeView = route?.type === 'christmas' ? <ChristmasOperationsScreen settings={settings} onClose={back} onOpen={open} onRequests={() => push({type:'requests'})}/> : route?.type === 'provider-document' ? <ProviderDocumentsScreen provider={route.provider} event={route.event} onClose={back}/> : route?.type === 'correction' ? <FinancialCorrectionScreen event={route.event} kind={route.kind} onClose={back}/> : route?.type === 'requests' ? <RequestsScreen onClose={back} onOpen={event => push({type:'request-review',event})}/> : route?.type === 'request-review' ? <RequestReviewScreen event={route.event} onClose={back}/> : route?.type === 'web' ? <WebAdminScreen onClose={back}/> : route?.type === 'editor' ? <ReservationEditor converting={route.converting} original={route.original} initialValues={route.initialValues} onClose={back} onSaved={() => {
    back();
    Alert.alert('Reserva guardada', 'Los datos se guardaron en Diverty.');
  }} /> : route?.type === 'payment' ? <PaymentScreen onCorrection={event => push({type:'correction',kind:'received',event})} event={route.event} onClose={back} /> : route?.type === 'expense' ? <ExpenseScreen onCorrection={event => push({type:'correction',kind:'internal',event})} event={route.event} onClose={back} /> : route?.type === 'provider-editor' ? <ProviderEditor original={route.original} onClose={back} /> : route?.type === 'providers' ? <ProviderAssignments event={route.event} onClose={back} onContract={(provider,event) => push({type:'provider-document',provider,event})} /> : route?.type === 'documents' ? <DocumentsScreen onCompanySaved={settings.acceptCompany} event={route.event} initialType={route.initialType} onClose={back} /> : route?.type === 'detail' ? <ReservationDetail onConvert={original => push({type:'editor',original,converting:true})} onDuplicate={event => create(duplicateReservationDraft(event))} onReview={event => push({type:'request-review',event})} event={route.event} onClose={back} onEdit={original => push({
    type: 'editor',
    original
  })} onPayment={event => push({
    type: 'payment',
    event
  })} onExpense={event => push({
    type: 'expense',
    event
  })} onProviders={event => push({
    type: 'providers',
    event
  })} onDocuments={event => push({
    type: 'documents',
    event
  })} /> : null;
  return <View style={{
    backgroundColor:T.background,flex: 1
  }}>
  <View style={{
      flex: 1,
      display: route ? 'none' : 'flex'
    }} accessibilityElementsHidden={!!route} importantForAccessibility={route ? 'no-hide-descendants' : 'auto'}>
  <View style={s.header}><View style={{flexDirection:'row',alignItems:'center',gap:10}}><Image source={require('../assets/diverty-logo.png')} style={{width:40,height:40,borderRadius:13,backgroundColor:'#fff'}} resizeMode="contain"/><Text style={s.brand}>Diverty CRM</Text></View><View style={{flexDirection:'row',alignItems:'center',gap:3}}><Pressable accessibilityRole="button" accessibilityLabel="Solicitudes web" disabled={blocked} onPress={()=>navigate(()=>push({type:'requests'}))} style={s.headerButton}><BellRing size={22} color="#CBD5E1"/></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Administrar página web" disabled={blocked} onPress={()=>navigate(()=>push({type:'web'}))} style={s.headerButton}><Globe2 size={21} color="#CBD5E1"/></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Salir" disabled={blocked} onPress={()=>navigate(()=>signOut(auth).catch(()=>Alert.alert('No se pudo cerrar la sesión')))} style={s.headerButton}><LogOut size={18} color="#CBD5E1"/></Pressable></View></View>
  {tab === 'inicio' ? <HomeScreen onChristmas={() => push({type:'christmas'})} onRequests={() => push({type:'requests'})} data={data} today={today} settings={settings} onNew={create} onOpen={open} onAgenda={() => setTab('agenda')}/> : tab === 'ajustes' ? <SettingsScreen settings={settings} onDirtyChange={setSettingsDirty} onBusyChange={setSettingsBusy} onSignOut={() => signOut(auth).catch(() => Alert.alert('No se pudo cerrar la sesión'))}/> : tab === 'agenda' ? <AgendaScreen onChristmas={settings.preferences.christmasModuleVisible ? () => push({type:'christmas'}) : null} data={data} scope={scope} setScope={setScope} onCalendar={() => setTab('calendario')} onOpen={open} onNew={create} /> : tab === 'calendario' ? <CalendarScreen data={data} month={month} onMove={move} selected={selected} setSelected={setSelected} onOpen={open} onNew={create} onBusyChange={setCalendarBusy} /> : tab === 'clientes' ? <ClientsScreen data={data} onOpen={open} onNew={create} /> : tab === 'proveedores' ? <ProvidersScreen onContract={provider => push({type:'provider-document',provider})} onEdit={original => push({
        type: 'provider-editor',
        original
      })} /> : <FinanceScreen data={data} month={month} onMove={move} />}
  <View style={s.tabs}>{tabs.map(([value,label])=>{const selected=tab===value||value==='agenda'&&tab==='calendario',Icon=({inicio:Home,agenda:Calendar,clientes:Users,proveedores:Truck,finanzas:PieChart,web:Globe2,ajustes:Settings})[value];return <Pressable key={value} accessibilityRole="tab" accessibilityState={{selected,disabled:blocked}} disabled={blocked} style={[s.tab,selected&&s.active]} onPress={()=>navigate(()=>value==='web'?push({type:'web'}):setTab(value))}>{selected?<LinearGradient colors={[T.pink,T.purple]} start={{x:0,y:0}} end={{x:1,y:0}} style={s.indicator}/>:null}<Icon size={selected?23:21} strokeWidth={selected?2.6:2.1} color={selected?T.pink:'#94A3B8'}/><Text numberOfLines={1} style={[s.tabText,selected&&s.activeText]}>{label}</Text></Pressable>;})}</View>
  </View>
  {routeView}
 </View>;
}
const s=StyleSheet.create({header:{backgroundColor:T.navy,paddingHorizontal:14,paddingVertical:12,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1,borderColor:'#FFFFFF18'},brand:{fontSize:20,fontFamily:F.black,color:'#fff',letterSpacing:-.5},headerButton:{padding:9,borderRadius:14},tabs:{height:70,flexDirection:'row',paddingHorizontal:6,paddingTop:6,backgroundColor:'#fff',borderTopWidth:1,borderColor:'#F1F5F9',shadowColor:'#0F172A',shadowOffset:{width:0,height:-5},shadowOpacity:.07,shadowRadius:15,elevation:12},tab:{flex:1,minWidth:0,height:58,gap:4,justifyContent:'center',alignItems:'center',borderRadius:14},active:{backgroundColor:'#FFF4FA'},indicator:{position:'absolute',top:0,height:3,width:28,borderRadius:3},tabText:{fontFamily:F.bold,fontSize:8,color:'#94A3B8',textTransform:'uppercase',letterSpacing:.3},activeText:{fontFamily:F.black,color:T.pink}});
