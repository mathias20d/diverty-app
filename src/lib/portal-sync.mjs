import { collection, doc, documentId, getDoc, getDocs, limit, orderBy, query, runTransaction, setDoc, startAfter } from 'firebase/firestore';
import { portalIndex } from './customer-portal.mjs';

const preparations=new WeakMap();
export function prepareCustomerPortal(db, appId) {
  let apps=preparations.get(db);
  if(!apps){apps=new Map();preparations.set(db,apps);}
  if(!apps.has(appId)){
    const work=migrateCustomerPortal(db,appId).catch(error=>{apps.delete(appId);throw error;});
    apps.set(appId,work);
  }
  return apps.get(appId);
}

async function migrateCustomerPortal(db, appId) {
  const base=['artifacts',appId,'public','data'];
  const marker=doc(db,...base,'configuracion','migracion_portal_v1');
  if((await getDoc(marker)).data()?.done===true)return;
  let cursor=null;
  do {
    const filters=[orderBy(documentId()),limit(50)];
    if(cursor)filters.push(startAfter(cursor));
    const page=await getDocs(query(collection(db,...base,'eventos'),...filters));
    if(page.empty)break;
    await runTransaction(db,async tx=>{
      const refs=page.docs.map(event=>doc(db,...base,'eventos',event.id));
      const events=await Promise.all(refs.map(ref=>tx.get(ref)));
      events.forEach((event,i)=>{
        const index=event.exists()?portalIndex(event.data()):null;
        const ref=doc(db,...base,'portal_busqueda',refs[i].id);
        if(index)tx.set(ref,index);else tx.delete(ref);
      });
    });
    cursor=page.docs.at(-1);
    if(page.size<50)break;
    // Yield between pages so a one-time migration doesn't block the interface.
    await new Promise(resolve=>setTimeout(resolve,0));
  }while(cursor);
  await setDoc(marker,{done:true,completedAt:new Date().toISOString()});
}
