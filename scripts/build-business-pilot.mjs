import { build, loadEnv } from 'vite';
import { readFile, rename, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { businessFirebaseConfig } from '../src/lib/business-workspace.mjs';

const root = process.cwd();
const env = { ...loadEnv('pilot', root, 'VITE_'), ...process.env };
const config = businessFirebaseConfig(env.VITE_BUSINESS_FIREBASE_CONFIG);
if (!config || env.VITE_BUSINESS_EMULATORS === '1') {
  throw new Error('Configura un Firebase comercial real en .env.pilot.local antes de construir el piloto.');
}
const site = resolve(root, 'firebase-business/site');
await build({ root, mode: 'pilot', build: { outDir: site, emptyOutDir: true } });
const html = await readFile(resolve(site, 'negocios.html'), 'utf8');
if (!html.includes('noindex') || !html.includes('Diverty Negocios')) throw new Error('Entrada comercial inválida');
await rm(resolve(site, 'index.html'));
await rename(resolve(site, 'negocios.html'), resolve(site, 'index.html'));
// El piloto es web: no instala el service worker ni el manifiesto de Diverty.
await rm(resolve(site, 'firebase-messaging-sw.js'), { force: true });
await rm(resolve(site, 'manifest.json'), { force: true });
console.log(`Piloto construido para ${config.projectId}; la compilación habitual de Diverty no se modifica.`);
