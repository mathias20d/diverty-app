import { getFunctions, httpsCallable } from 'firebase/functions';
import { getDoc,doc } from 'firebase/firestore';
import { app } from './firebase-auth.mjs';
export async function confirmCentralRequest(event,santaAsignado,db) {
  if(event?.centralBookingVersion!==1)return null;
  const cfg=await getDoc(doc(db,'artifacts','diverty-oficial','public','data','config_web','global'));
  if(cfg.data()?.centralBookingValidation!==true)return null;
  const response=await httpsCallable(getFunctions(app,'us-central1'),'confirmWebBooking')({id:event.id,santaAsignado});
  return response.data.event;
}
