import { useCallback, useEffect, useRef, useState } from 'react';
import { collection, doc, getDoc, getDocs, increment, onSnapshot, writeBatch } from 'firebase/firestore';
import {firestoreErrorMessage} from './firebase-errors.mjs';

export const WEB_SECTIONS = ['categorias_web', 'catalogo_web', 'campanas_web', 'temas_web', 'galeria_web', 'cupones_web', 'config_web'];
export const VIEW_SECTIONS = {
  categories: ['categorias_web'], packages: ['categorias_web', 'catalogo_web'],
  campaigns: ['campanas_web'], themes: ['temas_web', 'config_web'],
  gallery: ['galeria_web'], coupons: ['cupones_web'], settings: ['config_web'],
};
const sessionCaches = new WeakMap();
const sectionVersion = (sync, name) => Object.keys(sync?.versions || {}).length
  ? String(sync.versions[name] ?? 0) : `legacy:${sync?.version ?? 0}`;
const emptyData = () => Object.fromEntries(WEB_SECTIONS.map(name => [name, name === 'config_web' ? {
  theme: { modo: 'automatico', temaManualActivo: 'normal' },
  settings: { bannerActive: false, bannerText: '' },
} : []]));
const changedSections = (previous, next) => {
  const keys = new Set([...Object.keys(previous.versions || {}), ...Object.keys(next.versions || {})]);
  const changed = [...keys].filter(name => String(previous.versions?.[name] ?? 0) !== String(next.versions?.[name] ?? 0));
  // Administradores anteriores pueden publicar solo una versión global.
  return changed.length ? changed.filter(name => WEB_SECTIONS.includes(name))
    : String(previous.version ?? 0) !== String(next.version ?? 0) ? WEB_SECTIONS : [];
};

export default function useWebAdminData({ db, appId, currentUser }) {
  const uid = currentUser?.uid;
  const [data, setData] = useState(() => sessionCaches.get(db)?.get(`${appId}\0${uid}`)?.data || emptyData());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState('');
  const controllerRef = useRef(null);

  useEffect(() => {
    if (!db || !uid) { setLoading(false); return; }
    let caches = sessionCaches.get(db);
    if (!caches) { caches = new Map(); sessionCaches.set(db, caches); }
    const cacheKey = `${appId}\0${uid}`;
    let cache = caches.get(cacheKey);
    if (!cache) { cache = { data: emptyData(), versions: {}, sync: null }; caches.set(cacheKey, cache); }
    setData(cache.data); setLoading(true); setLoadError(false);
    const col = name => collection(db, 'artifacts', appId, 'public', 'data', name);
    const item = (name, id) => doc(db, 'artifacts', appId, 'public', 'data', name, id);
    const controller = { db, appId, uid, active: true, connected:false, seen: null, started: false, failed: new Set(), syncFailed: false, tail: Promise.resolve() };
    controllerRef.current = controller;
    const reportError = () => { if (controller.active) setLoadError(controller.syncFailed || controller.failed.size > 0); };
    // Serializa escrituras y avisos de sincronización. Una respuesta antigua no
    // puede reemplazar una edición recién guardada ni duplicar su recarga.
    const enqueue = (operation, completeOnUnmount = false) => {
      const job = controller.tail.then(() => controller.active || completeOnUnmount ? operation() : undefined);
      controller.tail = job.catch(() => {});
      return job;
    };
    const load = async names => {
      if (!controller.active) return;
      setLoading(true);
      await Promise.all([...new Set(names)].filter(name => WEB_SECTIONS.includes(name)).map(async name => {
        try {
          const version = controller.seen ? sectionVersion(controller.seen, name) : null;
          let value, fromCache = false;
          if (name === 'config_web') {
            const [theme, settings] = await Promise.all([getDoc(item(name, 'tema_global')), getDoc(item(name, 'global'))]);
            fromCache = !!(theme.metadata?.fromCache || settings.metadata?.fromCache);
            value = {
              theme: { ...emptyData().config_web.theme, ...(theme.exists() ? theme.data() : {}) },
              settings: { ...emptyData().config_web.settings, ...(settings.exists() ? settings.data() : {}) },
            };
          } else {
            const snapshot = await getDocs(col(name));
            fromCache = !!snapshot.metadata?.fromCache;
            value = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            if (['categorias_web', 'catalogo_web', 'campanas_web'].includes(name)) value.sort((a,b) => (Number(a.orden)||999) - (Number(b.orden)||999));
          }
          if (!controller.active) return;
          if (fromCache) controller.failed.add(name);
          else controller.failed.delete(name);
          cache.data = { ...cache.data, [name]: value };
          if (version !== null && !fromCache) cache.versions[name] = version;
          else delete cache.versions[name];
          // Cada sección aparece en cuanto está lista, sin esperar a las demás.
          setData(previous => ({ ...previous, [name]: value }));
        } catch (error) {
          if (!controller.active) return;
          console.error('WebAdmin load error', name, error);
          setLoadErrorMessage(firestoreErrorMessage(error));
          controller.failed.add(name);
        }
      }));
      if (controller.active) { setLoading(false); reportError(); }
      return names.every(name => !controller.failed.has(name));
    };
    const startSync = () => {
      controller.unsubscribe?.();
      controller.syncFailed = false;
      controller.unsubscribe = onSnapshot(item('config_web', 'web_sync'), { includeMetadataChanges: true }, snapshot => {
        if (!controller.active || snapshot.metadata.hasPendingWrites) return;
        // A cache snapshot does not prove that absent configuration documents
        // exist on the server. Wait for connectivity instead of loading defaults.
        if(snapshot.metadata.fromCache){
          controller.connected=false;controller.syncFailed=true;
          setLoading(false);setLoadErrorMessage('Esperando conexión con Firebase. Los datos guardados se conservan; la edición se habilitará al conectar.');reportError();return;
        }
        controller.connected=true;controller.syncFailed=false;
        const next = snapshot.exists() ? snapshot.data() : {};
        enqueue(async () => {
          if (!controller.started) {
            controller.started = true; controller.seen = next;
            const changed = cache.sync ? changedSections(cache.sync, next) : [];
            const missing = WEB_SECTIONS.filter(name => changed.includes(name) || cache.versions[name] !== sectionVersion(next, name));
            cache.sync = next;
            if (missing.length) await load(missing);
            else {setLoading(false);reportError();}
            return;
          }
          // Un aviso pudo llegar antes de terminar un guardado que ya contamos.
          if (Number(next.version || 0) < Number(controller.seen?.version || 0)) return;
          const names = controller.seen ? changedSections(controller.seen, next) : WEB_SECTIONS;
          controller.seen = next; cache.sync = next;
          const retry = snapshot.metadata.fromCache ? [] : [...controller.failed];
          if (names.length || retry.length) await load([...new Set([...names, ...retry])]);
          else reportError();
        });
      }, error => {
        if (!controller.active) return;
        console.error('WebAdmin sync error', error);
        controller.connected=false;controller.syncFailed = true;
        setLoading(false);setLoadErrorMessage(firestoreErrorMessage(error));reportError();
      });
    };
    controller.refresh = names => enqueue(async () => {
      if (controller.syncFailed) startSync();
      if(!controller.connected)return;
      await load(names);
    });
    controller.commit = (mutations, names) => enqueue(async () => {
      if(!controller.connected||controller.syncFailed||controller.failed.size)throw new Error('WEB_OFFLINE');
      const dirty = [...new Set(names)];
      const batch = writeBatch(db); mutations(batch);
      const versions = Object.fromEntries(dirty.map(name => [name, increment(1)]));
      batch.set(item('config_web', 'web_sync'), { versions, version: increment(1), updatedAt: new Date().toISOString() }, { merge: true });
      await batch.commit();
      if (!controller.active) return;
      if (controller.seen) {
        controller.seen = {
          ...controller.seen, version: Number(controller.seen.version || 0) + 1,
          versions: { ...controller.seen.versions, ...Object.fromEntries(dirty.map(name => [name, Number(controller.seen.versions?.[name] || 0) + 1])) },
        };
      }
      cache.sync = controller.seen;
      return load(dirty);
    }, true);
    startSync();
    return () => { controller.active = false; controller.unsubscribe?.(); };
  }, [db, appId, uid]);

  const refresh = useCallback((names = WEB_SECTIONS) => controllerRef.current?.refresh(names), []);
  const commitMutation = useCallback((mutations, names) => {
    const controller = controllerRef.current;
    if (!uid || !controller?.active || controller.db !== db || controller.appId !== appId || controller.uid !== uid) return Promise.reject(new Error('AUTH_REQUIRED'));
    return controller.commit(mutations, names);
  }, [db, appId, uid]);
  const setCategories = useCallback(update => setData(previous => ({ ...previous, categorias_web: typeof update === 'function' ? update(previous.categorias_web) : update })), []);
  const setCampaigns = useCallback(update => setData(previous => ({ ...previous, campanas_web: typeof update === 'function' ? update(previous.campanas_web) : update })), []);
  return { categories: data.categorias_web, packages: data.catalogo_web, campaigns: data.campanas_web,
    themes: data.temas_web, gallery: data.galeria_web, coupons: data.cupones_web,
    themeConfig: data.config_web.theme, settings: data.config_web.settings,
    setCategories, setCampaigns, loading, loadError, loadErrorMessage, refresh, commitMutation };
}
