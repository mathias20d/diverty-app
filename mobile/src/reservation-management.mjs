import {quote,webRequest} from './workspace-data.mjs';
import {christmasRequest} from './request-data.mjs';
export const canConvertQuote=event=>!!event&&!event.deletedLocally&&quote(event)&&!christmasRequest(event)&&!event.centralBookingVersion&&!event.resourceRequirements;
export const canDeleteReservation=event=>!!event&&!christmasRequest(event)&&!webRequest(event);
export async function deleteReservation({runTransaction,db,ref,event}) {
 return runTransaction(db,async tx=>{
  const snap=await tx.get(ref);if(!snap.exists())return;
  const current=snap.data();
  if(!canDeleteReservation(current))throw new Error('SPECIAL_RESERVATION');
  if(Number(current._rev||0)!==Number(event._rev||0))throw new Error('EVENT_CHANGED');
  tx.delete(ref);
 });
}
