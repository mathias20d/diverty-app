import React, { Component, useEffect, useRef, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { businessFirebaseConfig, businessName } from '../../lib/business-workspace.mjs';
import { createBusiness, loadBusiness, loadBusinessSettings } from '../../lib/business-store.mjs';

function clients() {
  const config = businessFirebaseConfig(import.meta.env.VITE_BUSINESS_FIREBASE_CONFIG);
  if (!config) return null;
  let app = getApps().find(item => item.name === 'diverty-business-pilot');
  const fresh = !app;
  app ||= initializeApp(config, 'diverty-business-pilot');
  const auth = getAuth(app), db = getFirestore(app);
  if (fresh && import.meta.env.VITE_BUSINESS_EMULATORS === '1') {
    if (!['localhost','127.0.0.1'].includes(window.location.hostname) || !config.projectId.startsWith('demo-')) throw new Error('EMULATOR_LOCAL_ONLY');
    connectAuthEmulator(auth, 'http://127.0.0.1:9098', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8089);
  }
  return { app, auth, db, projectId: config.projectId };
}

const errorMessage = error => ({
  'auth/email-already-in-use': 'Ese correo ya tiene una cuenta. Entra con tu contraseña o recupérala.',
  'auth/weak-password': 'Usa una contraseña de al menos 8 caracteres.',
  'auth/invalid-email': 'Revisa el correo que escribiste.',
  'auth/invalid-credential': 'Revisa tu correo y contraseña.',
  'auth/too-many-requests': 'Espera un momento antes de volver a intentarlo.',
  'auth/network-request-failed': 'No pudimos conectar. Revisa tu conexión y vuelve a intentarlo.',
  'permission-denied': 'El proyecto comercial aún necesita sus reglas de acceso. Tu cuenta se conserva; puedes reintentar después de configurarlas.',
  'auth/operation-not-allowed': 'El registro por correo aún necesita activarse en el proyecto comercial.',
  'auth/configuration-not-found': 'El acceso por correo del piloto aún necesita activarse en Firebase. Tu app actual de Diverty sigue funcionando.',
  'BUSINESS_NAME_INVALID': 'Escribe un nombre de negocio de entre 2 y 80 caracteres.'
}[error?.code || error?.message] || 'No pudimos completar la operación. Vuelve a intentarlo.');

class PanelBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <Frame><h1>No pudimos abrir tu administrador</h1><p>Tu información se conserva. Revisa la conexión y vuelve a intentarlo.</p><button className="business-primary" onClick={() => window.location.reload()}>Reintentar</button></Frame>;
    return this.props.children;
  }
}

function Frame({ children }) {
  return <main className="business-entry"><section className="business-intro"><span className="business-wordmark"><img src="/business-icon.svg" alt="" width="36" height="36"/> Diverty Negocios</span><span className="business-eyebrow">TU NEGOCIO, EN ORDEN</span><h2>Más tiempo para crear.<br/><span>Todo listo para reservar.</span></h2><p>Organiza tus clientes, agenda, servicios y pagos desde un solo lugar.</p><div className="business-features"><span>✓ Agenda y reservas</span><span>✓ Clientes y abonos</span><span>✓ Facturas y cotizaciones</span></div><p className="business-pilot">Versión piloto gratuita · Compras todavía no activadas</p></section><section className="business-entry-card">{children}</section></main>;
}

export default function BusinessGate() {
  const [client] = useState(() => { try { return { value: clients(), error: false }; } catch { return { value: null, error: true }; } });
  const [user, setUser] = useState(null), [profile, setProfile] = useState(null), [Panel, setPanel] = useState(null);
  const [loading, setLoading] = useState(!!client.value), [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('login'), [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const revision = useRef(0);

  const openBusiness = async current => {
    const token = ++revision.current;
    setPanel(null); setProfile(null); setUser(current); setLoading(!!current); setError(''); setPassword('');
    if (!current) { setMode('login'); setName(''); setEmail(''); setNotice(''); return; }
    try {
      const business = await loadBusiness(client.value.db, current);
      if (token !== revision.current) return;
      if (!business) { setLoading(false); return; }
      const settings = await loadBusinessSettings(client.value.db, business);
      const { createWorkspaceApp } = await import('../../App.jsx');
      if (token !== revision.current || client.value.auth.currentUser?.uid !== current.uid) return;
      const ScopedPanel = createWorkspaceApp({ ...client.value, appId: business.id, adminUid: current.uid, businessName: business.name, initialSettings: settings, commercial: true });
      setProfile(business); setPanel(() => ScopedPanel);
    } catch (failure) { console.warn('No se pudo abrir el negocio:', failure?.code || failure?.message); if (token === revision.current) setError(errorMessage(failure)); }
    finally { if (token === revision.current) setLoading(false); }
  };

  useEffect(() => {
    if (!client.value) return;
    const unsubscribe = onAuthStateChanged(client.value.auth, openBusiness, () => { setLoading(false); setError('No pudimos comprobar la sesión. Reintenta.'); });
    return () => { revision.current++; unsubscribe(); };
  }, [client.value]);

  const submit = async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (user) {
        await createBusiness(client.value.db, user, businessName(name));
        await openBusiness(user);
      } else if (mode === 'signup') {
        const validName = businessName(name);
        if (password.length < 8) throw Object.assign(new Error(), { code: 'auth/weak-password' });
        const result = await createUserWithEmailAndPassword(client.value.auth, email.trim(), password);
        await createBusiness(client.value.db, result.user, validName);
        await openBusiness(result.user);
      } else if (mode === 'reset') {
        await sendPasswordResetEmail(client.value.auth, email.trim());
        setNotice('Si existe una cuenta con ese correo, recibirás instrucciones para recuperar el acceso.');
      } else {
        await signInWithEmailAndPassword(client.value.auth, email.trim(), password);
      }
    } catch (failure) { console.warn('No se pudo completar el acceso:', failure?.code || failure?.message); setError(errorMessage(failure)); }
    finally { setBusy(false); }
  };

  if (!client.value) return <Frame><span className="business-eyebrow">PREPARACIÓN DEL PILOTO</span><h1>{client.error ? 'Revisa la configuración' : 'Tu próxima app de reservas'}</h1><p>El registro necesita conectar un proyecto Firebase comercial separado. Esta pantalla no crea cuentas ni consulta las reservas de Diverty.</p><div className="business-notice">La instalación y configuración están descritas en la guía de la versión comercial.</div></Frame>;
  if (loading) return <Frame><div role="status" className="business-loading"><span className="business-spinner"/><h1>Abriendo tu negocio…</h1><p>Comprobando tu cuenta y tu espacio de trabajo.</p></div></Frame>;
  if (Panel && user && profile) return <PanelBoundary key={profile.id}><Panel firebaseUser={user}/></PanelBoundary>;

  const setup = !!user;
  const changeMode = value => { setMode(value); setPassword(''); setError(''); setNotice(''); };
  return <Frame>
    <span className="business-eyebrow">{setup ? 'TU ESPACIO DE TRABAJO' : 'BIENVENIDO'}</span>
    <h1>{setup ? 'Configura tu negocio' : mode === 'signup' ? 'Crea tu negocio' : mode === 'reset' ? 'Recupera tu acceso' : 'Entra a tu negocio'}</h1>
    <p>{setup ? `Tu cuenta ${user.email} está creada. Completa el nombre para abrir tu administrador.` : 'Tu información estará separada de la de otros negocios.'}</p>
    {error && <div className="business-error" role="alert">{error}</div>}
    {notice && <div className="business-notice" role="status">{notice}</div>}
    <form onSubmit={submit}>
      {(setup || mode === 'signup') && <label>Nombre del negocio<input autoComplete="organization" required minLength="2" maxLength="80" value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Fiesta Mágica" disabled={busy}/></label>}
      {!setup && <label>Correo electrónico<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@negocio.com" disabled={busy}/></label>}
      {!setup && mode !== 'reset' && <label>Contraseña<input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={mode === 'signup' ? 8 : undefined} value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'Al menos 8 caracteres' : 'Tu contraseña'} disabled={busy}/></label>}
      <button className="business-primary" disabled={busy}>{busy ? 'Un momento…' : setup ? 'Abrir mi administrador' : mode === 'signup' ? 'Crear mi negocio' : mode === 'reset' ? 'Enviar instrucciones' : 'Entrar'}</button>
    </form>
    {setup ? <div className="business-entry-actions"><button disabled={busy} onClick={() => openBusiness(user)}>Reintentar conexión</button><button disabled={busy} onClick={() => signOut(client.value.auth).catch(failure => setError(errorMessage(failure)))}>Cerrar sesión</button></div> : <div className="business-entry-actions"><button disabled={busy} onClick={() => changeMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'Crear un negocio' : 'Ya tengo cuenta'}</button>{mode === 'login' && <button disabled={busy} onClick={() => changeMode('reset')}>Olvidé mi contraseña</button>}</div>}
    <p className="business-footnote">El piloto no solicita pagos ni datos de tarjeta.</p>
  </Frame>;
}
