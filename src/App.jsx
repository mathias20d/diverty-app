import ChristmasCompanySettings from './components/ChristmasCompanySettings.jsx';
import ChristmasPublishCard from './components/ChristmasPublishCard.jsx';
import ChristmasKidsSetting from './components/ChristmasKidsSetting.jsx';
import {profileErrorMessage} from './lib/christmas-publish.mjs';
import {navidadApi} from './lib/navidad-api.mjs';
import React,{useState,useEffect,useRef,useMemo,useCallback} from 'react';
import {collection,doc,onSnapshot,getDocs,query,where,writeBatch} from 'firebase/firestore';
import {signOut} from 'firebase/auth';
import {auth,app,LOGO_URL} from './lib/firebase-auth.mjs';
import ChristmasDates from './components/ChristmasDates.jsx';
import ChristmasOperation from './ChristmasOperation.jsx';
import {createChristmasStore,utils,isPendingWebRequest,publicSlot,christmasInsertionPlan,christmasEventGps,confirmCentralRequest as legacyConfirmCentralRequest,needsPlaceReference,transportPending,inferResourceRequirements,NotifModal,Confirm,NavigationChoiceModal} from './christmas-core.jsx';
import {isChristmasRecord,isChristmasService,assertChristmasRecord} from './lib/christmas-scope.mjs';
import ChristmasReservationForm from './components/ChristmasReservationForm.jsx';
import ChristmasTransportSettings from './components/ChristmasTransportSettings.jsx';
import {Gift,CalendarPlus,Inbox,ClipboardList,Settings2,LogOut,Route,X,ExternalLink,Bell} from 'lucide-react';

// Retain the legacy transaction/projections/slot counters, while disallowing edits outside Navidad.
const scopedTransaction=store=>(database,callback)=>store.runTransaction(database,async tx=>{
 const appId=store.appId;
 const current=new Map(),isEvent=ref=>ref.path.startsWith('artifacts/'+appId+'/public/data/eventos/');
 const scoped={get:async ref=>{const snap=await tx.get(ref);if(isEvent(ref)&&snap.exists()){assertChristmasRecord(snap.data());current.set(ref.path,snap.data());}return snap;},set:(ref,value,options)=>{if(isEvent(ref))assertChristmasRecord(options?.merge?{...current.get(ref.path),...value}:value);tx.set(ref,value,options);return scoped;},delete:ref=>{if(isEvent(ref))assertChristmasRecord(current.get(ref.path));tx.delete(ref);return scoped;}};
 return callback(scoped);
});

export default function App({firebaseUser}){
 const store=useMemo(()=>createChristmasStore(firebaseUser.uid),[firebaseUser.uid]);
 const {db,appId,getDocRef,getConfigRef,setDoc,availabilityRef}=store;
 const runTransaction=useMemo(()=>scopedTransaction(store),[store]);
 const confirmCentralRequest=useCallback(async(event,santa,database)=>store.legacy&&event.centralBookingVersion!==1?legacyConfirmCentralRequest(event,santa,database):navidadApi('confirm',{id:event.id,santaAsignado:santa},firebaseUser),[store,firebaseUser]);
 const [messaging,setMessaging]=useState(null);
 const [companyName,setCompanyName]=useState(store.legacy?'Diverty Eventos':firebaseUser.displayName||'Tu empresa');
 const [eventos,setEventos]=useState([]),[catalog,setCatalog]=useState([]),[loaded,setLoaded]=useState(false),[configured,setConfigured]=useState(false),[error,setError]=useState('');
 const [christmasSantaCapacity,setChristmasSantaCapacity]=useState(1),[capacityDraft,setCapacityDraft]=useState('1'),[isChristmasOpsOpen,setIsChristmasOpsOpen]=useState(true),[christmasModuleVisible,setVisible]=useState(()=>utils.getSafeLocal('diverty_christmas_module_visible')!=='false');
 const [christmasDayFilter,setChristmasDayFilter]=useState('all'),[expandedChristmasId,setExpandedChristmasId]=useState(null),[isNotifOpen,setIsNotifOpen]=useState(false),[settings,setSettings]=useState(false),[manage,setManage]=useState(false),[editing,setEditing]=useState(null),[saving,setSaving]=useState(false),[notice,setNotice]=useState('');
 const [transportConfig,setTransportConfig]=useState(null);
 const [navigationModal,setNavigationModal]=useState({isOpen:false}),[confirmModal,setConfirmModal]=useState({isOpen:false});
 const christmasAutoAssignBusyRef=useRef(false),noticeTimer=useRef(null),deviceIdRef=useRef('navidad-'+Math.random().toString(36).slice(2));
 const handledIntent=useRef(false);
 const ready=loaded&&configured,eventosActivos=useMemo(()=>eventos.filter(isChristmasRecord),[eventos]);
 const showAlert=useCallback(message=>{clearTimeout(noticeTimer.current);setNotice(message);noticeTimer.current=setTimeout(()=>setNotice(''),6000);},[]);
 const showConfirm=useCallback((message,onConfirm)=>setConfirmModal({isOpen:true,message,onConfirm}),[]);
 const publishSync=useCallback(async(entityType,entityId,action='update')=>{try{await setDoc(getConfigRef('syncBus'),{entityType,entityId:entityId||'',action,deviceId:deviceIdRef.current,changedAt:new Date().toISOString(),nonce:Date.now()+'-'+Math.random().toString(36).slice(2)});}catch{showAlert('El cambio se guardó; la señal adicional de sincronización está pendiente.');}},[showAlert]);
 const setChristmasVisibility=value=>{setVisible(value);utils.setSafeLocal('diverty_christmas_module_visible',String(value));if(!value)setIsChristmasOpsOpen(false);};
 useEffect(()=>{
  if(!firebaseUser)return;
  const unsubscribe=onSnapshot(query(collection(db,'artifacts',appId,'public','data','eventos'),where('fecha','>=','2026-12-24'),where('fecha','<=','2026-12-25')),snap=>{setEventos(snap.docs.map(d=>({...d.data(),id:d.id})).filter(isChristmasRecord));setLoaded(true);setError('');},()=>{setError('No se pudo cargar la agenda navideña. Revisa la conexión y vuelve a abrir la app.');setLoaded(false);});
  const unsubscribeConfig=onSnapshot(doc(db,'artifacts',appId,'public','data','config_web','global'),snap=>{const n=Number(snap.data()?.capacidadSanta??1);setCompanyName(snap.data()?.nombreEmpresa||(store.legacy?'Diverty Eventos':firebaseUser.displayName||'Tu empresa'));setChristmasSantaCapacity(Number.isInteger(n)&&n>=1&&n<=20?n:1);setConfigured(true);},()=>{setConfigured(false);setError('No se pudo comprobar la cantidad de Santas. No se harán asignaciones automáticas.');});
  const unsubscribeTransport=onSnapshot(doc(db,'artifacts',appId,'public','data','config_web','disponibilidad'),snap=>setTransportConfig(snap.data()?.transporte||null),()=>setTransportConfig(null));
  const unsubscribeCatalog=onSnapshot(collection(db,'artifacts',appId,'public','data','catalogo_web'),snap=>setCatalog(snap.docs.map(d=>({...d.data(),id:d.id})).filter(isChristmasService)),()=>showAlert('No se pudo cargar el catálogo navideño. Puedes conservar el servicio escrito en la reserva.'));
  return()=>{unsubscribe();unsubscribeConfig();unsubscribeTransport();unsubscribeCatalog();clearTimeout(noticeTimer.current);};
 },[firebaseUser,showAlert]);

const patchEventoAtomic = useCallback(async (id, patch) => {
      let saved = null;
      await runTransaction(db, async (tx) => {
          const ref = getDocRef(id);
          const snap = await tx.get(ref);
          if (!snap.exists()) throw new Error('EVENT_NOT_FOUND');
          const current = snap.data();
          saved = { ...patch, _rev: (Number(current._rev) || 0) + 1, updatedAt: new Date().toISOString() };
          tx.set(ref, saved, { merge: true });
      });
      await publishSync('evento', id, 'update');
      return saved;
  }, [publishSync]);
const transitionEventStatus = useCallback(async (id, nuevoEstado, { requirePendingWeb = false, extra = {} } = {}) => {
      if (!id) throw new Error('EVENT_ID_REQUIRED');
      let updatedData = null;
      await runTransaction(db, async tx => {
          const ref = getDocRef(id);
          const snap = await tx.get(ref);
          if (!snap.exists()) throw new Error('EVENT_NOT_FOUND');
          const current = snap.data() || {};
          if (requirePendingWeb) {
              if (utils.normalizeText(current.origen) !== 'web directa') throw new Error('NOT_WEB_REQUEST');
              if (utils.normalizeText(current.estado) !== 'pendiente') throw new Error('ALREADY_PROCESSED');
          }

          const nextState = utils.normalizeText(nuevoEstado);
          const nowIso = new Date().toISOString();
          const stateMeta = nextState.includes('rechaz')
              ? { rejectedAt: nowIso }
              : (nextState === 'cancelado' || nextState === 'cancelada'
                  ? { cancelledAt: nowIso }
                  : nextState === 'preparando'
                      ? { preparingAt: nowIso, estadoOperativoActualizadoAt: nowIso }
                      : nextState === 'en camino'
                          ? { enCaminoAt: nowIso, estadoOperativoActualizadoAt: nowIso }
                          : nextState === 'en el evento'
                              ? { enEventoAt: nowIso, estadoOperativoActualizadoAt: nowIso }
                              : nextState === 'completado'
                                  ? { completedAt: nowIso, estadoOperativoActualizadoAt: nowIso }
                                  : nextState.startsWith('confirmad')
                                      ? { confirmedAt: current.confirmedAt || nowIso, estadoOperativoActualizadoAt: nowIso }
                                      : {});
          const patch = {
              estado: nuevoEstado,
              ...stateMeta,
              ...extra,
              _rev: (Number(current._rev) || 0) + 1,
              updatedAt: nowIso
          };
          updatedData = { ...current, ...patch, id };
          tx.set(ref, patch, { merge: true });

      });
      await publishSync('evento', id, 'update');
      setEventos(prev => prev.map(e => e.id === id ? updatedData : e));
      return updatedData;
  }, [publishSync]);
const handleConfirmWebRequest = useCallback(async (event, santaAsignado = '') => {
      if (!event?.id || utils.normalizeText(event.origen) !== 'web directa') return false;
      if(needsPlaceReference(event)) {showAlert('Añade la barriada, PH o salón del evento antes de aceptar.',false);return false;}
      const needsTransportReview = transportPending(event);
      if (needsTransportReview && event?.transporteRevisadoEnApp !== true) {
          showAlert('Revisa y confirma el transporte de esta ubicación antes de aceptar la reserva.', false);
          return false;
      }
      try {
          utils.triggerHaptic('light');
          let confirmedData = await confirmCentralRequest(event, santaAsignado, db);
          if (!confirmedData) await runTransaction(db, async tx => {
              const ref = getDocRef(event.id);
              const snap = await tx.get(ref);
              if (!snap.exists()) throw new Error('EVENT_NOT_FOUND');
              const remote = snap.data();
              if (utils.normalizeText(remote.origen) !== 'web directa') throw new Error('NOT_WEB_REQUEST');
              if (utils.normalizeText(remote.estado) !== 'pendiente') throw new Error('ALREADY_PROCESSED');
              if(needsPlaceReference(remote)) throw new Error('PLACE_REFERENCE_REQUIRED');
              const remoteNeedsTransportReview = transportPending(remote);
              if (remoteNeedsTransportReview && remote.transporteRevisadoEnApp !== true) throw new Error('TRANSPORT_REVIEW_REQUIRED');
              const esNavidad = remote.esNavidad === true || /entregas de nochebuena/i.test(String(remote.servicio || ''));
              const normalResources = esNavidad ? null : inferResourceRequirements(remote);
              confirmedData = {
                  ...remote,
                  estado: 'Confirmado',
                  ...(esNavidad
                    ? { esNavidad: true, recursoNavidad: 'Santa', santaAsignado: santaAsignado || remote.santaAsignado || 'Santa 1' }
                    : { resourceRequirements: normalResources, duracionMinutos: normalResources.durationMinutes, recursosRevisadosEnApp: remote.recursosRevisadosEnApp === true }),
                  _rev: (Number(remote._rev) || 0) + 1,
                  updatedAt: new Date().toISOString()
              };
              tx.set(ref, confirmedData);
          });
          await publishSync('evento', event.id, 'update');
          setEventos(prev => prev.map(ev => ev.id === event.id ? confirmedData : ev));
          showAlert('¡Reserva web confirmada!', true);
          return true;
      } catch (err) {
          console.error('Error confirmando solicitud web:', err);
          if (err?.message === 'ALREADY_PROCESSED') showAlert('Esta solicitud ya fue procesada en otro dispositivo.', false);
          else if (err?.message === 'PLACE_REFERENCE_REQUIRED') showAlert('Confirma la barriada, PH o salón antes de aceptar la solicitud.',false);
          else if (err?.message === 'TRANSPORT_REVIEW_REQUIRED') showAlert('Revisa y confirma el transporte de esta ubicación antes de aceptar la reserva.', false);
          else if(err?.details?.reason) showAlert(err.message || 'Revisa la disponibilidad y los datos de la solicitud.', false);
          else showAlert('No se pudo confirmar la reserva. Revisa la conexión e intenta nuevamente.', false);
          return false;
      }
  }, [publishSync, showAlert]);
const handleRejectWebRequest = useCallback(async (event) => {
      if (!event?.id || utils.normalizeText(event.origen) !== 'web directa') return false;
      try {
          utils.triggerHaptic('light');
          await transitionEventStatus(event.id, 'Rechazada', { requirePendingWeb: true, extra: { decisionSource: 'app' } });
          showAlert('Solicitud rechazada. El horario quedó liberado.', true);
          return true;
      } catch (err) {
          console.error('Error rechazando solicitud web:', err);
          if (err?.message === 'ALREADY_PROCESSED') showAlert('Esta solicitud ya fue procesada en otro dispositivo.', false);
          else showAlert('No se pudo rechazar la reserva. Revisa la conexión e intenta nuevamente.', false);
          return false;
      }
  }, [transitionEventStatus, showAlert]);
const handleUpdateWebRequest = useCallback(async (event, patch) => {
      if (!event?.id || utils.normalizeText(event.origen) !== 'web directa') return null;
      try {
          const saved = await patchEventoAtomic(event.id, {
              ...patch,
              decisionSource: 'app',
              updatedAt: new Date().toISOString()
          });
          const merged = { ...event, ...saved, ...patch };
          setEventos(prev => prev.map(ev => ev.id === event.id ? merged : ev));
          showAlert('Solicitud actualizada.', true);
          return merged;
      } catch (err) {
          console.error('Error actualizando solicitud web:', err);
          showAlert('No se pudo actualizar la solicitud.', false);
          return null;
      }
  }, [patchEventoAtomic, showAlert]);
const reconcileChristmasAvailability = useCallback(async () => {
      if (!firebaseUser) return;
      const eventsRef = collection(db, 'artifacts', appId, 'public', 'data', 'eventos');
      const availabilityCol = collection(db, 'artifacts', appId, 'public', 'data', 'disponibilidad_web');
      const [eventsSnap, availabilitySnap] = await Promise.all([
          getDocs(query(eventsRef, where('fecha','>=','2026-12-24'), where('fecha','<=','2026-12-25'))),
          getDocs(query(availabilityCol, where('fecha','>=','2026-12-24'), where('fecha','<=','2026-12-25')))
      ]);

      const eventRows = eventsSnap.docs.filter(d => !d.data()?._system).map(d => ({ id:d.id, ...d.data() })).filter(isChristmasRecord);
      const eventById = new Map(eventRows.map(ev => [String(ev.id), ev]));
      const isChristmas = ev =>
          (ev?.esNavidad === true || /entregas de nochebuena/i.test(String(ev?.servicio || ''))) &&
          ['2026-12-24','2026-12-25'].includes(String(ev?.fecha || ''));
      const isActiveChristmas = ev => isChristmas(ev) && publicSlot(ev) !== null;
      const activeChristmas = eventRows.filter(isActiveChristmas);
      const capacity = Math.max(1, Number(christmasSantaCapacity) || 1);

      const grouped = new Map();
      activeChristmas.forEach(ev => {
          if (!ev.hora) return;
          const safeSlot = `${String(ev.fecha)}_${String(ev.hora).replace(':','-')}`.replace(/[^0-9A-Za-z_-]/g,'');
          const key = `slot_santa_${safeSlot}`;
          if (!grouped.has(key)) grouped.set(key, { fecha:String(ev.fecha), hora:String(ev.hora), ids:[] });
          grouped.get(key).ids.push(String(ev.id));
      });

      let batch = writeBatch(db);
      let writes = 0;
      const commitIfNeeded = async (force = false) => {
          if (!writes) return;
          if (!force && writes < 400) return;
          await batch.commit();
          batch = writeBatch(db);
          writes = 0;
      };
      const queueSet = async (ref, data) => { batch.set(ref, data); writes++; await commitIfNeeded(false); };
      const queueDelete = async ref => { batch.delete(ref); writes++; await commitIfNeeded(false); };

      // Repara también los documentos individuales que la web usa para rutas y cupos.
      for (const ev of eventRows) {
          const slot = publicSlot(ev);
          const ref = availabilityRef(ev.id);
          if (slot) await queueSet(ref, slot);
          else await queueDelete(ref);
      }

      // Borra documentos individuales huérfanos del 24/25 que ya no tienen evento.
      for (const row of availabilitySnap.docs) {
          if (row.id.startsWith('slot_')) continue;
          if ((row.data()?.esNavidad === true || row.data()?.recursoNavidad === 'Santa') && !eventById.has(String(row.id))) await queueDelete(row.ref);
      }

      // Reconstruye los contadores de Santa y elimina contadores fantasmas.
      const existingSantaSlots = new Map(availabilitySnap.docs
          .filter(d => d.id.startsWith('slot_santa_'))
          .map(d => [d.id, d]));
      for (const [slotId, info] of grouped) {
          const ids = Array.from(new Set(info.ids));
          await queueSet(availabilityRef(slotId), {
              fecha: info.fecha,
              hora: info.hora,
              count: ids.length,
              capacity,
              reservationIds: ids,
              updatedAt: new Date().toISOString()
          });
          existingSantaSlots.delete(slotId);
      }
      for (const stale of existingSantaSlots.values()) await queueDelete(stale.ref);
      await commitIfNeeded(true);
  }, [firebaseUser, christmasSantaCapacity]);
const deleteEventoSynced = useCallback(async (id) => {
      if (!id) throw new Error('EVENT_ID_REQUIRED');
      let deletedWasChristmas = false;
      await runTransaction(db, async tx => {
          const ref = getDocRef(id);
          const snap = await tx.get(ref);
          if (!snap.exists()) return;
          const ev = snap.data() || {};
          deletedWasChristmas = ev.esNavidad === true || /entregas de nochebuena/i.test(String(ev.servicio || ''));
          tx.delete(ref);
      });
      // Christmas also keeps its dedicated route/capacity reconciliation.
      if (deletedWasChristmas) {
          try { await reconcileChristmasAvailability(); }
          catch (err) { console.warn('Reserva eliminada; quedó pendiente reconciliar cupos de Navidad:', err); }
      }
  }, [reconcileChristmasAvailability]);
const openGoogleMaps = useCallback((dir, ubi, eventData = null) => {
    utils.triggerHaptic('light');
    const rawDir = String(dir || '').trim();
    const rawUbi = String(ubi || '').trim();
    const mapUrlMatch = rawDir.match(/https?:\/\/(?:www\.)?(?:(?:google\.[^\s/]+\/maps|maps\.google\.[^\s/]+)|maps\.app\.goo\.gl)[^\s]*/i);
    const gps = christmasEventGps(eventData || { direccion:rawDir });
    const queryText = [rawDir.replace(/https?:\/\/\S+/g,'').trim(), String(eventData?.referenciaLugar||'').trim(), rawUbi, 'Panamá'].filter(Boolean).join(' ').trim();

    let googleUrl = '';
    let wazeUrl = '';
    if (gps) {
        googleUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${gps.lat},${gps.lng}`)}`;
        wazeUrl = `https://www.waze.com/ul?ll=${encodeURIComponent(`${gps.lat},${gps.lng}`)}&navigate=yes`;
    } else {
        googleUrl = mapUrlMatch?.[0] || `https://maps.google.com/maps?q=${encodeURIComponent(queryText || rawDir || rawUbi)}`;
        wazeUrl = `https://www.waze.com/ul?q=${encodeURIComponent(queryText || rawUbi || rawDir)}&navigate=yes`;
    }

    setNavigationModal({
        isOpen:true,
        googleUrl,
        wazeUrl,
        label: String(eventData?.referenciaLugar || '').trim() || rawUbi || 'Ubicación de la reserva'
    });
  }, []);
  const handleRegistrarAbono = useCallback(async (ev) => {
      utils.triggerHaptic('light');
      const totalVista = utils.safeNum(ev.total);
      const recibidoVista = utils.safeNum(ev.abono);
      const pendienteVista = Math.max(0, totalVista - recibidoVista);
      if (pendienteVista <= 0) return showAlert("Esta reserva ya está pagada por completo.", true);
      const entrada = window.prompt(`Monto del nuevo abono (pendiente: $${pendienteVista.toFixed(2)}):`);
      if (entrada === null) return;
      const monto = Number(String(entrada).replace(',', '.').trim());
      if (!Number.isFinite(monto) || monto <= 0) return showAlert("Ingresa un monto válido mayor que 0.", false);
      try {
          let nuevoAbono = 0;
          let nuevoRev = 0;
          let nuevosPagosItems = null;
          await runTransaction(db, async (tx) => {
              const ref = getDocRef(ev.id);
              const snap = await tx.get(ref);
              if (!snap.exists()) throw new Error('EVENT_NOT_FOUND');
              const actual = snap.data();
              const totalActual = utils.safeNum(actual.total);
              const recibidoActual = utils.safeNum(actual.abono);
              const pendienteActual = Math.max(0, totalActual - recibidoActual);
              if (monto > pendienteActual) {
                  const error = new Error('PAYMENT_EXCEEDS_BALANCE');
                  error.pendiente = pendienteActual;
                  throw error;
              }
              nuevoAbono = Number((recibidoActual + monto).toFixed(2));
              nuevoRev = (Number(actual._rev) || 0) + 1;
              const nowIso = new Date().toISOString();
              const pagosItems = [...(Array.isArray(actual.pagosItems) ? actual.pagosItems : []), {
                  id:`pago-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
                  monto:Number(monto.toFixed(2)),
                  fecha:utils.getLocalYYYYMMDD(new Date()),
                  createdAt:nowIso,
                  origen:'abono_rapido'
              }];
              nuevosPagosItems = pagosItems;
              tx.set(ref, { abono: nuevoAbono, pagosItems, _rev: nuevoRev, updatedAt: nowIso }, { merge: true });
          });
          await publishSync('evento', ev.id, 'update');
          setEventos(prev => prev.map(item => item.id === ev.id ? { ...item, abono: nuevoAbono, ...(nuevosPagosItems ? {pagosItems:nuevosPagosItems} : {}), _rev: nuevoRev, updatedAt: new Date().toISOString() } : item));
          showAlert(`Abono de $${monto.toFixed(2)} registrado correctamente.`, true);
      } catch (err) {
          console.error("Error registrando abono:", err);
          if (err?.message === 'PAYMENT_EXCEEDS_BALANCE') return showAlert(`Otro dispositivo actualizó esta reserva. El saldo actual es $${utils.safeNum(err.pendiente).toFixed(2)}.`, false);
          showAlert("No se pudo registrar el abono. Verifica tu conexión e intenta nuevamente.", false);
      }
  }, [showAlert, publishSync]);



 const tokenRef=token=>store.legacy?doc(db,'tokens',token):doc(db,'artifacts',appId,'public','data','tokens',token);
  useEffect(() => {
      if (!firebaseUser) { setMessaging(null); return; }
      let cancelled = false;
      import('firebase/messaging').then(async sdk => {
          if (await sdk.isSupported() && !cancelled) setMessaging({ sdk, instance: sdk.getMessaging(app) });
      }).catch(() => {});
      return () => { cancelled = true; };
  }, [firebaseUser]);

  // NOTIFICACIONES: conserva el flujo que ya funcionaba y repara silenciosamente
  // el token FCM si Android/Chrome lo renueva después de una actualización de la PWA.
  // No pide permisos nuevos ni requiere cambios manuales en Firebase.
  useEffect(() => {
      if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
      const respondToDisplayModeQuery = (event) => {
          if (event?.data?.type !== 'DIVERTY_QUERY_DISPLAY_MODE') return;
          const standalone = !!(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator?.standalone === true);
          try { event.ports?.[0]?.postMessage({ standalone, url: window.location.href }); } catch (_) {}
      };
      navigator.serviceWorker.addEventListener('message', respondToDisplayModeQuery);
      return () => navigator.serviceWorker.removeEventListener('message', respondToDisplayModeQuery);
  }, []);

  useEffect(() => {
      if (!messaging || !firebaseUser || typeof window === 'undefined') return;
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      if (!('serviceWorker' in navigator)) return;
      let cancelled = false;
      (async () => {
          try {
              const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { updateViaCache: 'none' });
              await swRegistration.update().catch(() => {});
              await navigator.serviceWorker.ready;
              if (cancelled) return;
              const token = await messaging.sdk.getToken(messaging.instance, {
                  vapidKey: "BEmGfQ2ANNd-fwu25Nd7OyRnzCbX8pdIoYxreafTsk5R5PKoAIfom-tDJIMS4Slpu5XjK0vvwLxHCS5_09B8YrQ",
                  serviceWorkerRegistration: swRegistration
              });
              if (!token || cancelled) return;
              await setDoc(tokenRef(token), {
                  token,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  userAgent: navigator.userAgent || '',
                  enabled: true
              }, { merge: true });
          } catch (error) {
              // No interrumpe el uso de la app: el botón manual de notificaciones
              // continúa disponible con el mismo comportamiento anterior.
              console.warn('No se pudo renovar el token de notificaciones:', error);
          }
      })();
      return () => { cancelled = true; };
  }, [messaging, firebaseUser]);
  const activarNotificaciones = useCallback(async () => {
    if (!messaging) { showAlert("Notificaciones no disponibles.", false); return; }
    try { if (!('Notification' in window)) { showAlert("Navegador no soporta notificaciones.", false); return; } if (!('serviceWorker' in navigator)) { showAlert("Service Worker no disponible.", false); return; } const permiso = await Notification.requestPermission(); if (permiso !== "granted") { showAlert("Debes permitir notificaciones", false); return; } showAlert("Generando token, espera...", true); const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { updateViaCache: 'none' }); await swRegistration.update().catch(() => {}); await navigator.serviceWorker.ready; const token = await messaging.sdk.getToken(messaging.instance, { vapidKey: "BEmGfQ2ANNd-fwu25Nd7OyRnzCbX8pdIoYxreafTsk5R5PKoAIfom-tDJIMS4Slpu5XjK0vvwLxHCS5_09B8YrQ", serviceWorkerRegistration: swRegistration }); if (token) { await setDoc(tokenRef(token), { token: token, createdAt: new Date(), updatedAt: new Date(), userAgent: navigator.userAgent || '', enabled: true }); console.log("Notificaciones registradas correctamente."); showAlert("✅ ¡Notificaciones activadas!", true); } else { showAlert("No se generó ningún token.", false); } } catch (error) { console.error("Error obteniendo token:", error); const detalle = error?.code || error?.name || error?.message || "desconocido"; showAlert("No se pudieron activar los avisos. Revisa los permisos del navegador.", false); }
  }, [messaging, showAlert]);
 useEffect(()=>{const id=new URLSearchParams(location.search).get('reserva');if(!loaded||!id||handledIntent.current)return;handledIntent.current=true;const found=eventosActivos.find(e=>e.id===id);if(!found)return showAlert('Esta reserva no está en la agenda de la cuenta abierta.');if(isPendingWebRequest(found))setIsNotifOpen(true);else{setIsChristmasOpsOpen(true);setExpandedChristmasId(found.id);}},[loaded,eventosActivos,showAlert]);
 const saveCapacity=async()=>{const n=Number(capacityDraft);if(!Number.isInteger(n)||n<1||n>20)return showAlert('Elige entre 1 y 20 Santas.');setSaving(true);try{if(store.legacy)await setDoc(doc(db,'artifacts',appId,'public','data','config_web','global'),{capacidadSanta:n,updatedAt:new Date().toISOString()},{merge:true});else await navidadApi('profile',{profile:{capacidadSanta:n}},firebaseUser);showAlert('Cantidad de Santas guardada. La web utilizará estos cupos.');}catch(e){showAlert(store.legacy?'No se pudo guardar la cantidad de Santas.':profileErrorMessage(e.message));}finally{setSaving(false);}};
 const saveReservation=async draft=>{setSaving(true);try{
  const eventId=editing?.id||editing?.draftId||('navidad-'+crypto.randomUUID());
  if(isPendingWebRequest(editing)&&draft.estado!=='Pendiente')throw Error('USE_REQUEST_REVIEW');
  const sameSanta=eventosActivos.filter(e=>e.id!==eventId&&!isPendingWebRequest(e)&&!/cancel|rechaz|cot/i.test(e.estado)&&e.santaAsignado===draft.santaAsignado);
  if(!christmasInsertionPlan({...draft,id:eventId},sameSanta).feasible&&!window.confirm('El horario puede cruzarse con otra entrega de este Santa. ¿Guardar de todos modos?'))return;
  await runTransaction(db,async tx=>{const ref=getDocRef(eventId),snap=await tx.get(ref),current=snap.exists()?snap.data():null;if(current&&Number(current._rev||0)!==Number(editing?._rev||0))throw Error('EDIT_CONFLICT');if(!current&&editing?.id)throw Error('EVENT_NOT_FOUND');const value={...current,...draft,esNavidad:true,recursoNavidad:'Santa',_rev:Number(current?._rev||0)+1,updatedAt:new Date().toISOString(),...(current?{}:{origen:'App Diverty',abono:'0',gastos:'0',subcontratos:[],personalResponsable:[],createdAt:new Date().toISOString()})};tx.set(ref,value);});
  void publishSync('evento',eventId);setEditing(null);showAlert('Reserva navideña guardada.');
 }catch(e){showAlert(e.message==='USE_REQUEST_REVIEW'?'Usa Revisar solicitud para aceptar o rechazar una solicitud de la web.':e.message==='EDIT_CONFLICT'?'La reserva cambió en otro dispositivo. Ciérrala y vuelve a editarla.':'No se pudo guardar. Revisa la conexión y los datos.');}finally{setSaving(false);}};
 useEffect(()=>{if(!messaging)return;return messaging.sdk.onMessage(messaging.instance,()=>showAlert('Tienes una actualización. Revisa las solicitudes de Navidad.'));},[messaging,showAlert]);
 const [settingsTab,setSettingsTab]=useState('company');
 const openSettings=(tab='company')=>{setCapacityDraft(String(christmasSantaCapacity));setSettingsTab(typeof tab==='string'?tab:'company');setSettings(true);};
 const pendingRequestCount=eventosActivos.filter(isPendingWebRequest).length;
 const bookedEvents=eventosActivos.filter(e=>!isPendingWebRequest(e)&&!/cancel|rechaz|cot/i.test(String(e.estado||'')));
 const deliveredEvents=bookedEvents.filter(e=>e.entregaNavidadRealizada===true||utils.normalizeText(e.estado)==='completado').length;
 const pendingBalance=bookedEvents.reduce((sum,e)=>sum+Math.max(0,utils.safeNum(e.total)-utils.safeNum(e.abono)),0);
 const statusTone=state=>{const s=utils.normalizeText(state);return s.startsWith('confirmad')?'nv-pill-ok':s==='completado'?'nv-pill-ok':s==='pendiente'?'nv-pill-warn':/cancel|rechaz/.test(s)?'nv-pill-bad':'';};
 const formatDay=date=>String(date)==='2026-12-24'?'24 dic':String(date)==='2026-12-25'?'25 dic':String(date||'—');
 return <div className="navidad-app">
   <header style={{display:isChristmasOpsOpen&&christmasModuleVisible?"none":undefined}} className="navidad-shell"><div className="nv-brand"><img className="nv-brand-logo" src={LOGO_URL} alt="" width="40" height="40"/><div style={{minWidth:0}}><h1>Operación Navidad</h1><p>{companyName} · 24 y 25 de diciembre de 2026</p></div></div><button className="nv-btn-ghost" onClick={()=>signOut(auth).then(()=>location.reload())}><LogOut size={17}/><span>Cerrar sesión</span></button></header>
   {!!error&&<p role="alert" className="navidad-error">{error}</p>}
   {!ready&&!error&&<p role="status" className="navidad-loading">Cargando agenda y Santas…</p>}
   {ready&&<><main className="nv-home">
    <section className="nv-hero" aria-labelledby="nv-home-title"><span className="nv-eyebrow"><Gift size={15}/> Temporada 2026</span><h2 id="nv-home-title">Entregas de Santa</h2><p>Organiza las rutas de cada Santa, revisa las solicitudes de la web y registra los cobros desde un solo lugar.</p><div className="nv-hero-actions"><button className="nv-btn nv-btn-light" onClick={()=>{setChristmasVisibility(true);setIsChristmasOpsOpen(true);}}><Route size={18}/> Abrir operación</button><button className="nv-btn" onClick={()=>setEditing({draftId:'navidad-'+crypto.randomUUID()})}><CalendarPlus size={18}/> Nueva entrega</button></div></section>
    <ChristmasPublishCard store={store} user={firebaseUser} catalog={catalog} onMessage={showAlert} onOpenSettings={openSettings}/>
    <section className="nv-stats" aria-label="Resumen de la temporada"><button type="button" className={'nv-stat'+(pendingRequestCount?' nv-stat-alert':'')} onClick={()=>setIsNotifOpen(true)}><span className="nv-stat-label"><Bell size={15}/> Solicitudes por revisar</span><span className="nv-stat-value">{pendingRequestCount}</span></button><div className="nv-stat"><span className="nv-stat-label">Entregas reservadas</span><span className="nv-stat-value">{bookedEvents.length}</span></div><div className="nv-stat"><span className="nv-stat-label">Entregas realizadas</span><span className="nv-stat-value">{deliveredEvents}</span></div><div className="nv-stat"><span className="nv-stat-label">Saldo por cobrar</span><span className="nv-stat-value">${pendingBalance.toFixed(2)}</span></div></section>
    <h2 className="nv-section-title">Gestión</h2>
    <nav className="nv-tiles" aria-label="Gestión de Navidad"><button className="nv-tile" onClick={()=>{setChristmasVisibility(true);setIsChristmasOpsOpen(true);}}><span className="nv-tile-icon"><Route size={20}/></span><span><strong>Abrir operación</strong><span>Rutas por Santa, siguiente parada y entregas realizadas.</span></span></button><button className="nv-tile nv-tile-pine" onClick={()=>setEditing({draftId:'navidad-'+crypto.randomUUID()})}><span className="nv-tile-icon"><CalendarPlus size={20}/></span><span><strong>Nueva entrega</strong><span>Registra una reserva tomada por teléfono o en persona.</span></span></button><button className="nv-tile nv-tile-gold" onClick={()=>setIsNotifOpen(true)}><span className="nv-tile-icon"><Inbox size={20}/></span><span><strong>Solicitudes<span className="nv-count">{pendingRequestCount}</span></strong><span>Acepta o rechaza las reservas que llegan desde tu página.</span></span></button><button className="nv-tile nv-tile-ink" onClick={()=>setManage(true)}><span className="nv-tile-icon"><ClipboardList size={20}/></span><span><strong>Reservas</strong><span>Edita reservas, revisa saldos y registra abonos.</span></span></button><button className="nv-tile nv-tile-ink" onClick={()=>openSettings()}><span className="nv-tile-icon"><Settings2 size={20}/></span><span><strong>Ajustes</strong><span>Empresa, servicios, transporte, Santas y avisos.</span></span></button></nav>
    {!christmasModuleVisible&&<p className="nv-note">La temporada está oculta. Pulsa «Abrir operación» para mostrarla otra vez.</p>}
   </main>
   {isChristmasOpsOpen&&christmasModuleVisible&&<ChristmasOperation {...{eventosActivos,christmasDayFilter,setExpandedChristmasId,setChristmasDayFilter,setIsChristmasOpsOpen,christmasSantaCapacity,patchEventoAtomic,setEventos,showAlert,openGoogleMaps,showConfirm,deleteEventoSynced,publishSync,setChristmasVisibility,setIsNotifOpen,expandedChristmasId}} onNew={()=>setEditing({draftId:'navidad-'+crypto.randomUUID()})} onSettings={openSettings} onManage={()=>setManage(true)} onLogout={()=>signOut(auth).then(()=>location.reload())} onEdit={setEditing} onPay={handleRegistrarAbono} companyName={companyName}/>}
   </>}
   <NotifModal isOpen={isNotifOpen} onClose={()=>setIsNotifOpen(false)} eventosActivos={eventosActivos} onConfirmWebRequest={handleConfirmWebRequest} onRejectWebRequest={handleRejectWebRequest} onUpdateWebRequest={handleUpdateWebRequest} onMapClick={openGoogleMaps} christmasSantaCapacity={christmasSantaCapacity} staffCapacity={{animadores:0,payasos:0}} targetReservationId={new URLSearchParams(location.search).get('reserva')||''}/>
   <NavigationChoiceModal modal={navigationModal} onClose={()=>setNavigationModal({isOpen:false})}/>
   <Confirm modal={confirmModal} setModal={setConfirmModal}/>
   {settings&&<div className="navidad-dialog-overlay"><section role="dialog" aria-modal="true" aria-label="Ajustes" className="navidad-dialog nv-settings"><div className="nv-dialog-head"><div><h2>Ajustes</h2><p>Elige qué quieres configurar.</p></div><button type="button" className="nv-btn-ghost nv-icon-btn" aria-label="Cerrar ajustes" disabled={saving} onClick={()=>setSettings(false)}><X size={20}/></button></div>
    <div className="nv-tabs" role="tablist" aria-label="Secciones de ajustes">{[['company','Empresa'],['services','Servicios'],['transport','Transporte'],['santas','Santas y avisos']].map(([id,label])=><button key={id} type="button" role="tab" aria-selected={settingsTab===id} className={'nv-tab'+(settingsTab===id?' is-active':'')} onClick={()=>setSettingsTab(id)}>{label}</button>)}</div>
    {settingsTab==='company'&&<ChristmasCompanySettings part="company" store={store} user={firebaseUser} catalog={catalog} onMessage={showAlert}/>}
    {settingsTab==='services'&&<ChristmasCompanySettings part="services" store={store} user={firebaseUser} catalog={catalog} onMessage={showAlert}/>}
    {settingsTab==='transport'&&<ChristmasTransportSettings db={db} appId={appId} saved={transportConfig} onMessage={showAlert}/>}
    {settingsTab==='santas'&&<>
    <section className="nv-section" aria-labelledby="nv-santas-title"><h3 id="nv-santas-title">Cantidad de Santas</h3><p>Define cuántas rutas se pueden atender. Con 2 Santas tendrás Santa 1 y Santa 2, cada uno con su agenda y sus traslados.</p><div className="nv-stepper-row"><span>Santas disponibles</span><div className="nv-stepper"><button type="button" aria-label="Un Santa menos" disabled={saving||Number(capacityDraft)<=1} onClick={()=>setCapacityDraft(String(Math.max(1,Number(capacityDraft||1)-1)))}>−</button><input aria-label="Santas disponibles" inputMode="numeric" value={capacityDraft} onFocus={e=>e.target.select()} onChange={e=>setCapacityDraft(e.target.value.replace(/[^0-9]/g,'').slice(0,2))}/><button type="button" aria-label="Un Santa más" disabled={saving||Number(capacityDraft)>=20} onClick={()=>setCapacityDraft(String(Math.min(20,Number(capacityDraft||0)+1)))}>+</button></div><button className="nv-btn-primary" disabled={saving||String(capacityDraft)===String(christmasSantaCapacity)} onClick={saveCapacity}>{saving?'Guardando…':'Guardar'}</button></div></section>
    <ChristmasKidsSetting store={store} user={firebaseUser} onMessage={showAlert}/>
    <section className="nv-section" aria-labelledby="nv-avisos-title"><h3 id="nv-avisos-title">Avisos</h3><p>Recibe una notificación en este dispositivo cuando llegue una solicitud nueva.</p><button disabled={saving} onClick={activarNotificaciones} style={{justifySelf:'start'}}><Bell size={17}/> Activar avisos en este dispositivo</button></section>
    <ChristmasDates db={db} appId={appId}/>
    <details><summary>Revisar cupos de Navidad</summary><p>Reconstruye únicamente los cupos navideños con las reservas guardadas; no borra reservas.</p><button disabled={saving} onClick={async()=>{setSaving(true);try{await reconcileChristmasAvailability();showAlert('Cupos navideños revisados.');}catch{showAlert('No se pudieron revisar los cupos.');}finally{setSaving(false);}}}>Revisar cupos</button></details>
    </>}
    <div className="nv-dialog-foot"><a className="nv-btn" href={store.legacy?'https://entregasnavidad.netlify.app/':'https://entregasnavidad.netlify.app/?empresa='+encodeURIComponent(firebaseUser.uid)} target="_blank" rel="noopener noreferrer"><ExternalLink size={17}/> Abrir página de reservas de Navidad</a><button className="nv-btn-primary" disabled={saving} onClick={()=>setSettings(false)}>Cerrar</button></div></section></div>}
   {manage&&<div className="navidad-dialog-overlay"><section role="dialog" aria-modal="true" aria-label="Reservas de Navidad" className="navidad-dialog"><div className="nv-dialog-head"><div><h2>Reservas de Navidad</h2><p>{eventosActivos.length} {eventosActivos.length===1?'reserva':'reservas'} del 24 y 25 de diciembre.</p></div><button onClick={()=>setManage(false)}>Cerrar</button></div>
    {eventosActivos.length===0&&<p className="nv-empty">Aún no hay reservas de Navidad. Las nuevas entregas y las solicitudes de la web aparecerán aquí.</p>}
    {eventosActivos.map(event=>{const balance=Math.max(0,utils.safeNum(event.total)-utils.safeNum(event.abono));return <article className="navidad-record" key={event.id}><div className="nv-record-head"><b>{event.cliente}</b><span className={'nv-pill '+statusTone(event.estado)}>{event.estado||'Pendiente'}</span></div><div className="nv-meta"><span>{formatDay(event.fecha)} · {utils.formatTime12h(event.hora)}</span><span>{event.santaAsignado||'Sin asignar'}</span><span>Saldo: <span className={balance>0?'nv-money-due':'nv-money-ok'}>$ {balance.toFixed(2)}</span></span></div><div className="nv-record-actions"><button onClick={()=>setEditing(event)}>Editar</button><button onClick={()=>handleRegistrarAbono(event)}>Registrar abono</button>{isPendingWebRequest(event)&&<button className="nv-btn-primary" onClick={()=>{setManage(false);setIsNotifOpen(true);}}>Revisar solicitud</button>}</div></article>;})}</section></div>}
   {editing&&<ChristmasReservationForm event={editing} catalog={catalog} santaCount={christmasSantaCapacity} busy={saving} onClose={()=>setEditing(null)} onSave={saveReservation} transportConfig={transportConfig}/>}
   {!!notice&&<div role="status" className="navidad-toast"><span>{notice}</span><button aria-label="Cerrar aviso" onClick={()=>setNotice('')}>×</button></div>}
 </div>;
}
