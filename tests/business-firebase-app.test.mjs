import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';

test('a commercial Firebase app initialized first does not replace or prevent the legacy default app', async () => {
  const pilot = initializeApp({ projectId: 'demo-business-pilot', apiKey: 'fake-key-for-local-tests', appId: 'fake-app' }, 'diverty-business-pilot');
  const { app } = await import('../src/lib/firebase-auth.mjs');
  assert.equal(app.name, '[DEFAULT]');
  assert.equal(app.options.projectId, 'diverty-eventos');
  assert.notEqual(app, pilot);
  await deleteApp(pilot); await deleteApp(app);
});
