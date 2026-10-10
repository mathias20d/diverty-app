// Same reconciliation routine as the web administrator; manual execution only.
// Server reads prevent offline snapshots from being used for maintenance.
import {collection,doc,getDocFromServer as getDoc,getDocsFromServer as getDocs,writeBatch,runTransaction as rawRunTransaction} from 'firebase/firestore';
import {auth,db,ADMIN_UID,DATA_PATH} from './firebase';
import {projectEvent,publicSlot,availabilityRef} from './booking-transactions';
const appId='diverty-oficial';
const getConfigRef=id=>doc(db,...DATA_PATH,'configuracion',id);
let preparationComplete=false,preparationPromise=null;
async function prepareDivertyData() {
  if (preparationComplete) return;
  if (preparationPromise) return preparationPromise;
  preparationPromise = (async () => {
    if (auth.currentUser?.uid !== ADMIN_UID) throw new Error('ADMIN_REQUIRED');
    // v2 also reconciles disponibilidad_web. This removes old test reservations and
    // orphan slot_* locks that could leave dates blocked on the public website.
    const marker = getConfigRef('migracion_segura_v2');
    if ((await getDoc(marker)).exists()) {preparationComplete=true; return;}

    // One intentional admin-only reconciliation read. `eventos` is the source of truth.
    const [snap, availabilitySnap, globalSnap] = await Promise.all([
      getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'eventos')),
      getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'disponibilidad_web')),
      getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config_web', 'global')).catch(() => null)
    ]);
    const max = {factura: 0, contrato: 0, cotizacion: 0};
    const fields = {factura: 'numeroFactura', contrato: 'numeroContrato', cotizacion: 'numeroCotizacion'};
    const prefixes = {factura: 'FAC', contrato: 'CON', cotizacion: 'COT'};
    const activeAvailabilityIds = new Set();
    const slotGroups = new Map();
    const globalConfig = globalSnap?.exists?.() ? (globalSnap.data() || {}) : {};
    const normalCapacity = Number.isInteger(Number(globalConfig.capacidadSimultanea)) && Number(globalConfig.capacidadSimultanea) >= 1
      ? Number(globalConfig.capacidadSimultanea) : 3;
    const santaCapacity = Number.isInteger(Number(globalConfig.capacidadSanta)) && Number(globalConfig.capacidadSanta) >= 1
      ? Number(globalConfig.capacidadSanta) : 1;

    let batch = writeBatch(db), size = 0;
    for (const row of snap.docs) {
      const ev = row.data();
      for (const type of Object.keys(fields)) {
        const match = String(ev[fields[type]] || '').match(new RegExp('^' + prefixes[type] + '-(\\d+)$', 'i'));
        if (match) max[type] = Math.max(max[type], Number(match[1]));
      }
      if (!ev._system) {
        projectEvent(batch, row.ref, ev);
        size += 2; // availability + client status (worst case)
        const slot = publicSlot(ev);
        if (slot) {
          activeAvailabilityIds.add(String(row.id));
          if (slot.fecha && slot.hora) {
            const isChristmas = ev.esNavidad === true || /entregas de nochebuena/i.test(String(ev.servicio || ''));
            const safeSlot = `${String(slot.fecha)}_${String(slot.hora).replace(':','-')}`.replace(/[^0-9A-Za-z_-]/g,'');
            const slotId = `${isChristmas ? 'slot_santa_' : 'slot_'}${safeSlot}`;
            if (!slotGroups.has(slotId)) slotGroups.set(slotId, {
              fecha: String(slot.fecha), hora: String(slot.hora), ids: [],
              capacity: isChristmas ? santaCapacity : normalCapacity
            });
            slotGroups.get(slotId).ids.push(String(row.id));
          }
        }
      }
      if (size >= 300) { await batch.commit(); batch = writeBatch(db); size = 0; }
    }
    if (size) await batch.commit();

    // Keep disponibilidad_web as an exact public projection of active reservations.
    // Internal slot_* documents are rebuilt from the real events, never treated as events.
    batch = writeBatch(db); size = 0;
    const flush = async () => { if (!size) return; await batch.commit(); batch = writeBatch(db); size = 0; };
    const queueDelete = async ref => { batch.delete(ref); size++; if (size >= 350) await flush(); };
    const queueSet = async (ref, data) => { batch.set(ref, data); size++; if (size >= 350) await flush(); };

    for (const row of availabilitySnap.docs) {
      const id = String(row.id);
      if (id.startsWith('slot_')) {
        if (!slotGroups.has(id)) await queueDelete(row.ref);
      } else if (!activeAvailabilityIds.has(id)) {
        await queueDelete(row.ref);
      }
    }
    for (const [slotId, info] of slotGroups) {
      const ids = Array.from(new Set(info.ids));
      await queueSet(availabilityRef(slotId), {
        fecha: info.fecha,
        hora: info.hora,
        count: ids.length,
        capacity: info.capacity,
        reservationIds: ids,
        updatedAt: new Date().toISOString()
      });
    }
    await flush();

    await rawRunTransaction(db, async tx => {
      const types = Object.keys(max);
      const refs = types.map(type => getConfigRef('contador_' + type));
      const values = [];
      for (const ref of refs) values.push(await tx.get(ref));
      refs.forEach((ref, i) => tx.set(ref, {ultimo: Math.max(max[types[i]], Number(values[i].data()?.ultimo) || 0)}));
      tx.set(marker, {completada: true, fecha: new Date().toISOString()});
      tx.set(doc(db, 'artifacts', appId, 'public', 'data', 'config_web', 'disponibilidad'), {lista: true});
    });
  })();
  try { await preparationPromise; preparationComplete=true; } finally { preparationPromise = null; }
}
export {prepareDivertyData};

