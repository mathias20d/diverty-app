# Diverty Negocios: piloto comercial

Primera etapa: administrador web para negocios independientes. No activa cobros, licencias comerciales, publicación en Play Store ni una aplicación Android instalada.

## Qué funciona

- Registro, inicio de sesión y recuperación por correo/contraseña de Firebase.
- Cada propietario tiene un espacio `business-<uid>` para agenda, reservas, clientes, proveedores, abonos, servicios personalizados, cantidades y documentos.
- Datos bancarios y ajustes iniciales vacíos, sin los datos de Diverty. Los ajustes se guardan en la nube.
- Nombre del negocio en el panel y documentos; icono genérico del piloto.
- Borradores y preferencias del navegador separados por proyecto y cuenta. La caché Firestore del piloto permanece en memoria; no comparte la persistencia del administrador original.
- Cierre de sesión desmonta el panel anterior. Las reglas impiden acceso entre cuentas, acceso anónimo y creación de licencias desde el cliente.

Una cuenta corresponde a un propietario y un negocio. Invitaciones a empleados, edición del nombre/logo, páginas públicas por negocio, notificaciones push comerciales, facturación de licencias y Android quedan para próximas etapas. La sección Web informa de esta limitación.

## Proyectos separados

- Diverty actual: `diverty-eventos`, entrada `index.html` y compilación `npm run build`. Sus reglas y configuración no se modifican al publicar el piloto.
- Piloto gratuito: `diverty-negocios-piloto-261009`. Base Firestore estándar `nam5`, sin recuperación pagada y sin cuenta de facturación vinculada.
- Entrada comercial: `negocios.html`. Rechaza configuraciones que apunten a `diverty-eventos`.
- Hosting del piloto: https://diverty-negocios-piloto-261009.web.app/

En Firebase Console, abrir Authentication → Comenzar → Método de acceso → Correo electrónico/contraseña. Activar solo correo/contraseña y guardar. Mantener el plan Spark; no activar SMS ni vincular facturación. La recuperación de contraseña usa correos de Firebase, no campañas promocionales.

## Construcción en Windows o cloud

Instalar Node.js 24, abrir una terminal en el repositorio y ejecutar `npm ci`.

Crear `.env.pilot.local` (ignorado por Git) con la configuración pública de la aplicación web que muestra Firebase Console. Ejemplo, sustituyendo todos los valores:

```dotenv
VITE_BUSINESS_FIREBASE_CONFIG='{"projectId":"mi-proyecto-piloto","authDomain":"mi-proyecto-piloto.firebaseapp.com","apiKey":"CONFIGURACION_PUBLICA_FIREBASE","appId":"1:123456:web:miapp","messagingSenderId":"123456"}'
```

Este objeto identifica al cliente Firebase; no usar claves de administrador, cuentas de servicio ni tokens de acceso. La protección de los datos depende de Authentication y las reglas.

```sh
npm run build:business
```

Produce `firebase-business/site/`, con el acceso comercial en la raíz y sin el manifiesto/service worker de Diverty. El comando rechaza una configuración ausente o de emuladores. La compilación normal `dist/` permanece independiente.

Con Firebase CLI autenticado y verificando explícitamente el ID del proyecto comercial:

```sh
firebase deploy --only firestore:rules,hosting --config firebase-business/firebase.json --project diverty-negocios-piloto-261009
```

**Nunca desplegar `firebase-business/firestore.rules` al proyecto `diverty-eventos`.** No hay migración de clientes ni reservas existentes. Spark tiene cuotas gratuitas: revisar su uso antes de invitar muchos negocios; el piloto no ofrece capacidad ilimitada.

## Pruebas locales sin clientes reales

`npm test` comprueba la lógica habitual y los límites del espacio comercial. `npm run build` verifica ambas entradas.

Con Java 21 y Firebase CLI, las reglas se prueban contra un proyecto ficticio:

```sh
firebase emulators:exec --project demo-business-pilot --config firebase-business/firebase.json --only firestore "node --test --test-concurrency=1 firebase-business/isolation.test.mjs"
```

Para la prueba completa de registro, abrir primero Vite en el puerto 5174 con `VITE_BUSINESS_EMULATORS=1` y una configuración pública ficticia cuyo `projectId` sea `demo-business-pilot`, `authDomain` sea `demo-business-pilot.firebaseapp.com`, `apiKey` sea `fake-key-for-local-tests`, `appId` sea `1:1234:web:testpilot` y `messagingSenderId` sea `1234`.

En PowerShell se pueden establecer estas variables con `$env:VITE_BUSINESS_EMULATORS='1'` y `$env:VITE_BUSINESS_FIREBASE_CONFIG='...'`. Luego:

```sh
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

En otra terminal, con Chromium disponible:

```sh
firebase emulators:exec --project demo-business-pilot --config firebase-business/firebase.json --only auth,firestore "node tests/browser/business-flow.cjs"
```

La prueba bloquea servicios externos, crea dos cuentas ficticias y verifica reservas, importes, ajustes, borradores, reapertura y rechazo de acceso cruzado. No genera reservas reales ni envía correos reales. En cloud, usar las variables de caché indicadas en las instrucciones de inicio del entorno.

## Siguiente etapa Android

Primero validar este piloto con el propietario. Después añadir el contenedor Android, probar en una laptop Windows con Android Studio y generar un APK de prueba. Antes de venderlo: verificar licencias en servidor, integrar el método de cobro permitido por Google Play para funciones digitales, definir soporte y límites, y completar los requisitos de publicación. No hay cobros automáticos ni una licencia activa en esta etapa.
