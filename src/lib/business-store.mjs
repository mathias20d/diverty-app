import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { businessId, businessProfile, emptyBusinessSettings, validateBusinessProfile } from './business-workspace.mjs';

export async function loadBusiness(db, user) {
  const ref = doc(db, 'businesses', businessId(user.uid));
  const result = await getDoc(ref);
  return result.exists() ? validateBusinessProfile(user, result.data()) : null;
}

// Profile and initial configuration are one atomic operation, repeatable after
// an interrupted signup. Existing accounts and reservations are never reset.
export async function createBusiness(db, user, name) {
  const profile = businessProfile(user, name);
  const ref = doc(db, 'businesses', profile.id);
  return runTransaction(db, async tx => {
    const existing = await tx.get(ref);
    if (existing.exists()) return validateBusinessProfile(user, existing.data());
    const config = id => doc(db, 'artifacts', profile.id, 'public', 'data', 'configuracion', id);
    tx.set(ref, profile);
    tx.set(config('appSettings'), emptyBusinessSettings(profile));
    tx.set(config('serviciosCustom'), { paquetes: [] });
    tx.set(config('clientesOcultos'), { clients: [] });
    tx.set(doc(db, 'artifacts', profile.id, 'public', 'data', 'config_web', 'global'), { centralBookingValidation: false, capacidadSimultanea: 3, capacidadSanta: 1 });
    return profile;
  });
}

export async function loadBusinessSettings(db, profile) {
  const result = await getDoc(doc(db, 'artifacts', profile.id, 'public', 'data', 'configuracion', 'appSettings'));
  return result.exists() ? result.data() : emptyBusinessSettings(profile);
}
