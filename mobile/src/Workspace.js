import React, { useState } from 'react';
import appConfig from '../app.json';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const routeView = route?.type === 'provider-document' ? <ProviderDocumentsScreen provider={route.provider} event={route.event} onClose={back}/> : route?.type === 'correction' ? <FinancialCorrectionScreen event={route.event} kind={route.kind} onClose={back}/> : route?.type === 'requests' ? <RequestsScreen onClose={back} onOpen={event => push({type:'request-review',event})}/> : route?.type === 'request-review' ? <RequestReviewScreen event={route.event} onClose={back}/> : route?.type === 'web' ? <WebAdminScreen onClose={back}/> : route?.type === 'editor' ? <ReservationEditor original={route.original} initialValues={route.initialValues} onClose={back} onSaved={() => {
    back();
    Alert.alert('Reserva guardada', 'Los datos se guardaron en Diverty.');
  }} /> : route?.type === 'payment' ? <PaymentScreen onCorrection={event => push({type:'correction',kind:'received',event})} event={route.event} onClose={back} /> : route?.type === 'expense' ? <ExpenseScreen onCorrection={event => push({type:'correction',kind:'internal',event})} event={route.event} onClose={back} /> : route?.type === 'provider-editor' ? <ProviderEditor original={route.original} onClose={back} /> : route?.type === 'providers' ? <ProviderAssignments event={route.event} onClose={back} onContract={(provider,event) => push({type:'provider-document',provider,event})} /> : route?.type === 'documents' ? <DocumentsScreen onCompanySaved={settings.acceptCompany} event={route.event} initialType={route.initialType} onClose={back} /> : route?.type === 'detail' ? <ReservationDetail onReview={event => push({type:'request-review',event})} event={route.event} onClose={back} onEdit={original => push({
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
    flex: 1
  }}>
  <View style={{
      flex: 1,
      display: route ? 'none' : 'flex'
    }} accessibilityElementsHidden={!!route} importantForAccessibility={route ? 'no-hide-descendants' : 'auto'}>
  <View style={s.header}><View><Text style={s.brand}>Diverty</Text><Text style={ui.muted}>Administración · Versión {appConfig.expo.version}</Text></View><View><Pressable accessibilityRole="button" disabled={blocked} onPress={() => navigate(() => push({type:'web'}))}><Text style={s.link}>Administrar página web</Text></Pressable><Pressable accessibilityRole="button" disabled={blocked} onPress={() => navigate(() => signOut(auth).catch(() => Alert.alert('No se pudo cerrar la sesión', 'Revisa tu conexión y reintenta.')))}><Text style={s.link}>Salir</Text></Pressable></View></View>
  {tab === 'inicio' ? <HomeScreen onRequests={() => push({type:'requests'})} data={data} today={today} settings={settings} onNew={create} onOpen={open} onAgenda={() => setTab('agenda')}/> : tab === 'ajustes' ? <SettingsScreen settings={settings} onDirtyChange={setSettingsDirty} onBusyChange={setSettingsBusy} onSignOut={() => signOut(auth).catch(() => Alert.alert('No se pudo cerrar la sesión'))}/> : tab === 'agenda' ? <AgendaScreen data={data} scope={scope} setScope={setScope} onCalendar={() => setTab('calendario')} onOpen={open} onNew={create} /> : tab === 'calendario' ? <CalendarScreen data={data} month={month} onMove={move} selected={selected} setSelected={setSelected} onOpen={open} onNew={create} onBusyChange={setCalendarBusy} /> : tab === 'clientes' ? <ClientsScreen data={data} onOpen={open} onNew={create} /> : tab === 'proveedores' ? <ProvidersScreen onContract={provider => push({type:'provider-document',provider})} onEdit={original => push({
        type: 'provider-editor',
        original
      })} /> : <FinanceScreen data={data} month={month} onMove={move} />}
  <View style={s.tabs}>{tabs.map(([value, label]) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{
          selected: tab === value || value === 'agenda' && tab === 'calendario',
          disabled: blocked
        }} disabled={blocked} style={[s.tab, tab === value && s.active]} onPress={() => navigate(() => value === 'web' ? push({type:'web'}) : setTab(value))}><Text style={[s.tabText, tab === value && s.activeText]}>{label}</Text></Pressable>)}</View>
  </View>
  {routeView}
 </View>;
}
const s = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#e7e4f0'
  },
  brand: {
    fontSize: 24,
    fontWeight: '900',
    color: '#7042d9'
  },
  link: {
    padding: 10,
    fontWeight: '700',
    color: '#7042d9'
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#e7e4f0',
    backgroundColor: '#fff',
    gap: 4
  },
  tab: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12
  },
  active: {
    backgroundColor: '#eee9fb'
  },
  tabText: {
    fontWeight: '700',
    fontSize: 9,
    color: '#686878'
  },
  activeText: {
    color: '#7042d9'
  }
});
