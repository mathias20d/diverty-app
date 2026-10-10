import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, DATA_PATH } from './firebase';
export default function useProviders() {
  const [providers, setProviders] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [cached, setCached] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    setLoading(true);
    setError('');
    return onSnapshot(collection(db, ...DATA_PATH, 'proveedores'), {
      includeMetadataChanges: true
    }, snap => {
      setProviders(snap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es')));
      setCached(snap.metadata.fromCache);
      setLoading(false);
    }, () => {
      setLoading(false);
      setError('No pudimos consultar los proveedores. Revisa tu conexión.');
    });
  }, [retry]);
  return {
    providers,
    loading,
    error,
    cached,
    reload: () => setRetry(value => value + 1)
  };
}
