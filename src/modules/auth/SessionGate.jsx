import React, { Component, lazy, Suspense, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, ADMIN_UID } from '../../lib/firebase-auth.mjs';
import { AuthLoading, LoginView } from './AuthViews.jsx';

const OperationalApp = lazy(() => import('../../App.jsx'));

class AppLoadBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return (
      <div role="alert" className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p>No se pudo cargar el panel. Comprueba tu conexión y vuelve a intentarlo.</p>
        <button type="button" className="rounded-xl bg-violet-600 text-white px-5 py-3" onClick={() => window.location.reload()}>Reintentar</button>
      </div>
    );
    return this.props.children;
  }
}

export default function SessionGate() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 8000);
    const unsubscribe = onAuthStateChanged(auth, current => {
      clearTimeout(timer);
      setUser(current?.uid === ADMIN_UID ? current : null);
      setLoading(false);
      if (current && current.uid !== ADMIN_UID) {
        setError('Esta cuenta no tiene acceso al panel.');
        signOut(auth).catch(() => {});
      }
    }, () => {
      clearTimeout(timer);
      setLoading(false);
      setError('No se pudo comprobar la sesión. Revisa tu conexión.');
    });
    return () => { clearTimeout(timer); unsubscribe(); };
  }, []);

  const handleLogin = async event => {
    event.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, emailInput, passwordInput);
      try { if (navigator.vibrate) navigator.vibrate(50); } catch (_) {}
      setEmailInput('');
      setPasswordInput('');
    } catch (_) {
      setError('Credenciales incorrectas o conexión no disponible. Intenta nuevamente.');
    }
  };

  if (loading) return <AuthLoading />;
  if (!user) return <LoginView {...{ emailInput, setEmailInput, passwordInput, setPasswordInput, handleLogin, error }} />;
  return (
    <AppLoadBoundary>
      <Suspense fallback={<AuthLoading />}>
        <OperationalApp firebaseUser={user} />
      </Suspense>
    </AppLoadBoundary>
  );
}
