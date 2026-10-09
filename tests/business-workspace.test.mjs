import test from 'node:test';
import assert from 'node:assert/strict';
import { businessFirebaseConfig, businessId, businessProfile, validateBusinessProfile, workspaceStorageKey, emptyBusinessSettings } from '../src/lib/business-workspace.mjs';

const user = { uid: 'alice', email: 'alice@example.invalid' };
const config = { projectId: 'demo-business-pilot', authDomain: 'demo-business-pilot.firebaseapp.com', apiKey: 'fake-key-for-local-tests', appId: 'fake-app', messagingSenderId: '1234' };

test('commercial configuration requires its own project and never falls back to Diverty', () => {
  assert.equal(businessFirebaseConfig(''), null);
  assert.equal(businessFirebaseConfig(JSON.stringify(config)).projectId, config.projectId);
  assert.throws(() => businessFirebaseConfig('{'), /CONFIG_INVALID/);
  assert.throws(() => businessFirebaseConfig({ ...config, projectId: 'diverty-eventos', authDomain: 'diverty-eventos.firebaseapp.com' }), /CONFIG_INVALID/);
  assert.throws(() => businessFirebaseConfig({ ...config, authDomain: 'diverty-eventos.firebaseapp.com' }), /CONFIG_INVALID/);
});

test('profiles cannot select another account or a legacy workspace', () => {
  const profile = businessProfile(user, ' Fiesta Mágica ');
  assert.equal(profile.id, 'business-alice'); assert.equal(profile.name, 'Fiesta Mágica');
  assert.equal(validateBusinessProfile(user, profile), profile);
  assert.throws(() => validateBusinessProfile({ uid: 'bob', email: 'bob@example.invalid' }, profile), /ACCESS_DENIED/);
  assert.throws(() => validateBusinessProfile(user, { ...profile, id: 'diverty-oficial' }), /ACCESS_DENIED/);
  assert.throws(() => businessId('../alice'), /USER_INVALID/);
  assert.throws(() => businessProfile({ ...user, isAnonymous: true }, 'Prueba'), /USER_INVALID/);
  assert.throws(() => businessProfile(user, ' '), /NAME_INVALID/);
});

test('drafts and business settings are separated by owner and project; legacy keys remain compatible', () => {
  const a = workspaceStorageKey(config.projectId, 'business-alice', 'diverty_form_draft');
  const b = workspaceStorageKey(config.projectId, 'business-bob', 'diverty_form_draft');
  assert.notEqual(a, b);
  assert.notEqual(a, workspaceStorageKey('another-project', 'business-alice', 'diverty_form_draft'));
  assert.equal(workspaceStorageKey('diverty-eventos', 'diverty-oficial', 'diverty_settings'), 'diverty_settings');
  assert.throws(() => workspaceStorageKey('', 'business-alice', 'draft'), /SCOPE_INVALID/);
  const settings = emptyBusinessSettings(businessProfile(user, 'Fiesta Mágica'));
  assert.equal(settings.empresa.nombreComercial, 'Fiesta Mágica');
  assert.equal(settings.empresa.email, user.email);
  for (const key of ['banco','numeroCuenta','nombreTitular','telefono','web']) assert.equal(settings.empresa[key], '');
});
