# Diverty nativa — primera etapa

React Native y Expo para Android e iPhone. Las pantallas utilizan controles nativos: no cargan la web en una WebView.

## Alcance actual

- Inicio de sesión con la cuenta administradora existente.
- Persistencia de sesión en el dispositivo.
- Agenda de próximas reservas en tiempo real, con estados de carga, error y reintento.
- Mismo Firebase `diverty-eventos` y ruta `artifacts/diverty-oficial/public/data/eventos`.
- Esta etapa consulta reservas; no crea ni modifica documentos de producción.

La app y la web actuales permanecen disponibles. Crear/editar reservas, abonos, gastos, PDF, calendario y notificaciones nativas requieren las siguientes etapas; esta versión inicial todavía no sustituye la app oficial.

## Windows: probar en Android o iPhone

Instala Node.js LTS y Git. Desde la carpeta `mobile`:

```powershell
npm ci
npx expo start --lan
```

Instala Expo Go en el teléfono, conecta la laptop y el teléfono a la misma Wi-Fi y abre el QR. Expo Go debe ser compatible con el SDK indicado en package.json. Si la tienda todavía no ofrece esa versión, usa una compilación de desarrollo compatible en lugar de cambiar versiones arbitrariamente.

Usa la cuenta administradora actual. No introduzcas contraseñas ni claves privadas en archivos o en Git. La configuración Firebase incluida es la configuración pública del cliente; los permisos siguen dependiendo de Authentication y las reglas de Firestore existentes.

## Comprobaciones sin acceder a producción

```sh
npm run check
npm run export:android
npm run export:ios
```

Exportar verifica los bundles JavaScript; no genera APK, AAB ni IPA ni prueba dispositivos físicos. Android instalado necesita Android Studio/JDK y `npm run android`. Compilar iOS localmente requiere macOS/Xcode; desde Windows puede prepararse mediante un servicio de compilación como EAS, previa configuración de la cuenta de Apple y firma.

## Siguientes etapas

1. Validar acceso y lectura de agenda en teléfonos reales.
2. Migrar reservas y clientes reutilizando reglas de cantidades, duración y disponibilidad.
3. Migrar cobros, documentos y administración web.
4. Registrar dispositivos y configurar notificaciones push nativas; las notificaciones del navegador no se trasladan automáticamente.
5. Probar ambos sistemas y preparar versiones firmadas para distribución.

No se ha configurado EAS ni creado una cuenta o proyecto Firebase nuevo. Las identificaciones `com.divertypanama.reservas` son iniciales y deben verificarse antes de registrar las apps en las tiendas.
