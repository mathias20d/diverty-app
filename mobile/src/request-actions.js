import {doc,getDoc,getDocs,collection,query,where,setDoc} from 'firebase/firestore';
import {getFunctions,httpsCallable} from 'firebase/functions';
import {app,db,DATA_PATH} from './firebase';
import {runTransaction,getResourceAvailability,inferResourceRequirements} from './booking-transactions';
import {assertPending,assertReview,requestPatch,christmasRequest} from './request-data.mjs';
import {resourcesFromConfig} from './admin-settings.mjs';
const ref=id=>doc(db,...DATA_PATH,'eventos',id);
async function signal(id){try{await setDoc(doc(db,...DATA_PATH,'configuracion','syncBus'),{entityType:'evento',entityId:id,action:'update',deviceId:'diverty-native',changedAt:new Date().toISOString(),nonce:`${id}-${Date.now()}`});}catch{/* Reservation is already committed; listeners remain the source of truth. */}}
export async function updateRequest(event,kind,value){
 const saved=await runTransaction(db,async tx=>{const snap=await tx.get(ref(event.id));const current=snap.exists()?snap.data():null;assertPending(current,event._rev);const patch=requestPatch(current,kind,value);tx.set(ref(event.id),{...patch,_rev:Number(current._rev||0)+1,decisionSource:'app',updatedAt:new Date().toISOString()},{merge:true});return {...current,...patch,id:event.id,_rev:Number(current._rev||0)+1};});await signal(event.id);return saved;
}
export async function rejectRequest(event){
 await runTransaction(db,async tx=>{const snap=await tx.get(ref(event.id)),current=snap.exists()?snap.data():null;assertPending(current,event._rev);const now=new Date().toISOString();tx.set(ref(event.id),{estado:'Rechazada',rejectedAt:now,decisionSource:'app',_rev:Number(current._rev||0)+1,updatedAt:now},{merge:true});});await signal(event.id);
}
export async function confirmRequest(event,santaAsignado=''){
 const fresh=await getDoc(ref(event.id)),current=fresh.exists()?fresh.data():null;assertPending(current,event._rev);assertReview(current);
 const configRef=doc(db,...DATA_PATH,'config_web','global'),config=(await getDoc(configRef)).data()||{};
 if(current.centralBookingVersion===1&&config.centralBookingValidation===true){
  await httpsCallable(getFunctions(app,'us-central1'),'confirmWebBooking')({id:event.id,santaAsignado});await signal(event.id);return;
 }
 if(christmasRequest(current))throw new Error('LEGACY_SANTA');
 const rows=await getDocs(query(collection(db,...DATA_PATH,'eventos'),where('fecha','==',current.fecha)));
 await runTransaction(db,async tx=>{
  const snapshot=await tx.get(ref(event.id)),remote=snapshot.exists()?snapshot.data():null;assertPending(remote,event._rev);assertReview(remote);
  const cfg=(await tx.get(configRef)).data()||{};
  if(cfg.centralBookingValidation===true&&remote.centralBookingVersion===1)throw new Error('STALE_CONFIG');
  const events=[];for(const row of rows.docs){if(row.id===event.id)continue;const snap=await tx.get(ref(row.id));if(snap.exists())events.push({...snap.data(),id:row.id});}
  if(!getResourceAvailability({...remote,id:event.id},events,resourcesFromConfig(cfg)).feasible)throw new Error('NO_CAPACITY');
  const resourceRequirements=inferResourceRequirements(remote),now=new Date().toISOString();
  tx.set(ref(event.id),{estado:'Confirmado',resourceRequirements,duracionMinutos:resourceRequirements.durationMinutes,recursosRevisadosEnApp:remote.recursosRevisadosEnApp===true,_rev:Number(remote._rev||0)+1,updatedAt:now},{merge:true});
 });await signal(event.id);
}
