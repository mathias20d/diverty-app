import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { createBusiness, loadBusiness, loadBusinessSettings } from '../src/lib/business-store.mjs';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8089') throw new Error('Local demo emulator on 127.0.0.1:8089 required.');
let env;
const user = uid => ({ uid, email: `${uid}@example.invalid`, isAnonymous: false });
const dbFor = uid => env.authenticatedContext(uid, { email: user(uid).email, firebase: { sign_in_provider: 'password' } }).firestore();
const data = (db, uid, section = 'eventos', id = 'booking-1') => doc(db, 'artifacts', `business-${uid}`, 'public', 'data', section, id);
before(async () => { env = await initializeTestEnvironment({ projectId: 'demo-business-pilot', firestore: { host: '127.0.0.1', port: 8089, rules: readFileSync(new URL('firestore.rules', import.meta.url), 'utf8') } }); });
beforeEach(async () => env.clearFirestore());
after(async () => env?.cleanup());

test('production signup initializes two businesses atomically and does not reset existing data', async () => {
  for (const uid of ['alice','bob']) {
    const db = dbFor(uid);
    const profile = await createBusiness(db, user(uid), `Fiestas ${uid}`);
    assert.equal((await loadBusiness(db, user(uid))).ownerUid, uid);
    assert.equal((await loadBusinessSettings(db, profile)).empresa.email, user(uid).email);
    await setDoc(data(db, uid), { cliente: `Cliente ${uid}`, total: 95 });
    await setDoc(data(db, uid, 'configuracion', 'serviciosCustom'), { paquetes: [{ nombre: 'Servicio propio' }] });
    await createBusiness(db, user(uid), 'No debe reemplazarlo');
    assert.equal((await loadBusiness(db, user(uid))).name, `Fiestas ${uid}`);
    assert.equal((await getDoc(data(db, uid))).data().cliente, `Cliente ${uid}`);
    assert.equal((await getDoc(data(db, uid, 'configuracion', 'serviciosCustom'))).data().paquetes.length, 1);
  }
});

test('another business cannot read, list, create, update or delete reservations and configuration', async () => {
  for (const uid of ['alice','bob']) await createBusiness(dbFor(uid), user(uid), `Fiestas ${uid}`);
  const alice = dbFor('alice'), bob = dbFor('bob');
  for (const section of ['eventos','configuracion','proveedores','reservas_cliente','portal_busqueda','disponibilidad_web','config_web']) {
    await setDoc(data(alice, 'alice', section), { cliente: 'Privado', total: 95 });
    await assertFails(getDoc(data(bob, 'alice', section)));
    await assertFails(getDocs(collection(bob, 'artifacts','business-alice','public','data', section)));
    await assertFails(setDoc(data(bob, 'alice', section), { total: 0 }));
    await assertFails(deleteDoc(data(bob, 'alice', section)));
    await assertSucceeds(getDoc(data(alice, 'alice', section)));
  }
});

test('anonymous and signed-out users cannot read profiles or business data', async () => {
  await createBusiness(dbFor('alice'), user('alice'), 'Fiestas Alice');
  await setDoc(data(dbFor('alice'), 'alice'), { cliente: 'Privado' });
  for (const db of [env.unauthenticatedContext().firestore(), env.authenticatedContext('alice', { firebase: { sign_in_provider: 'anonymous' } }).firestore()]) {
    await assertFails(getDoc(data(db, 'alice')));
    await assertFails(getDoc(doc(db, 'businesses', 'business-alice')));
    await assertFails(setDoc(data(db, 'alice'), { cliente: 'Intruso' }));
  }
});

test('ownership, workspace ID and licence cannot be changed by a client', async () => {
  const db = dbFor('alice'), profile = await createBusiness(db, user('alice'), 'Fiestas Alice');
  await assertFails(setDoc(doc(db,'businesses',profile.id), { ...profile, ownerUid: 'bob' }));
  await assertFails(setDoc(doc(db,'businesses',profile.id), { ...profile, id: 'business-bob' }));
  await assertFails(setDoc(doc(db,'businesses',profile.id), { ...profile, paid: true }));
  await assertFails(getDocs(collection(db,'businesses')));
  await assertFails(setDoc(doc(db,'licenses',profile.id), { paid: true }));
  await assertFails(deleteDoc(doc(db,'businesses',profile.id)));
  await assertFails(getDocs(collection(db,'artifacts','diverty-oficial','public','data','eventos')));
  await assertFails(setDoc(doc(db,'tokens','invented'), { token: 'invented' }));
});

test('an unconfigured account cannot write data; a rejected onboarding batch creates nothing', async () => {
  const db = dbFor('alice');
  await assertFails(setDoc(data(db,'alice'), { cliente: 'Sin perfil' }));
  const batch = writeBatch(db);
  batch.set(doc(db,'businesses','business-alice'), { id: 'business-alice', ownerUid: 'bob', name: 'Intruso', email: user('alice').email, createdAt: new Date().toISOString() });
  batch.set(data(db,'alice'), { cliente: 'No guardar' });
  await assertFails(batch.commit());
  assert.equal((await getDoc(doc(db,'businesses','business-alice'))).exists(), false);
});
