// No commercial installation may silently use Diverty's production database.
export const DIVERTY_PROJECT_ID = 'diverty-eventos';

export function businessFirebaseConfig(raw) {
  if (!raw) return null;
  let value;
  try { value = typeof raw === 'string' ? JSON.parse(raw) : raw; }
  catch { throw new Error('BUSINESS_CONFIG_INVALID'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !/^[a-z][a-z0-9-]{4,29}$/.test(value.projectId || '')
    || value.projectId === DIVERTY_PROJECT_ID
    || value.authDomain !== `${value.projectId}.firebaseapp.com`
    || typeof value.apiKey !== 'string' || value.apiKey.length < 10
    || typeof value.appId !== 'string' || !value.appId
    || !/^\d+$/.test(String(value.messagingSenderId || ''))) {
    throw new Error('BUSINESS_CONFIG_INVALID');
  }
  return Object.fromEntries(['apiKey','authDomain','projectId','appId','messagingSenderId','storageBucket']
    .filter(key => value[key] !== undefined).map(key => [key, value[key]]));
}

export function businessId(uid) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid || '')) throw new Error('BUSINESS_USER_INVALID');
  return `business-${uid}`;
}

export function businessName(value) {
  const name = String(value || '').trim();
  if (name.length < 2 || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) throw new Error('BUSINESS_NAME_INVALID');
  return name;
}

export function businessProfile(user, name, now = new Date().toISOString()) {
  if (!user?.email || user.isAnonymous) throw new Error('BUSINESS_USER_INVALID');
  return { id: businessId(user.uid), ownerUid: user.uid, name: businessName(name), email: user.email, createdAt: now };
}

export function validateBusinessProfile(user, profile) {
  if (!user?.email || user.isAnonymous || !profile || profile.ownerUid !== user.uid || profile.id !== businessId(user.uid)) {
    throw new Error('BUSINESS_ACCESS_DENIED');
  }
  businessName(profile.name);
  return profile;
}

export function workspaceStorageKey(projectId, id, key) {
  if (id === 'diverty-oficial' && projectId === DIVERTY_PROJECT_ID) return key;
  if (!projectId || !id?.startsWith('business-')) throw new Error('BUSINESS_SCOPE_INVALID');
  return `business:${projectId}:${id}:${key}`;
}

export function emptyBusinessSettings(profile) {
  return { metaMensual: 1500, empresa: { nombreComercial: profile.name, nombreTitular: '', ruc: '', banco: '', tipoCuenta: '', numeroCuenta: '', telefono: '', email: profile.email, web: '' } };
}
