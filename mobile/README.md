# Diverty nativa — primera etapa

React Native y Expo para Android e iPhone. Las pantallas utilizan controles nativos: no cargan la web en una WebView.

## Alcance actual

- Inicio de sesión con la cuenta administradora existente.
- Persistencia de sesión en el dispositivo.
- Agenda de próximas reservas en tiempo real, con estados de carga, error y reintento.
- Mismo Firebase `diverty-eventos` y ruta `artifacts/diverty-oficial/public/data/eventos`.
- Nueva reserva y edición con datos del cliente, servicios por unidad/hora/paquete y transporte.
- Busca clientes por el teléfono exacto guardado en reservas anteriores.
- Guardar escribe en Firebase oficial, con revisión de edición simultánea y respeto de fechas cerradas. Las pruebas automatizadas no escriben en producción.
- Conserva abonos, gastos y proveedores existentes; cambiar horarios de reservas especiales sigue en la app actual para mantener los cupos.
- Consulta y registro de abonos con saldo actualizado.
- Consulta y registro de gastos internos por categoría, con historial, proveedores y ganancia estimada.

La app y la web actuales permanecen disponibles. Ajustes de pagos/gastos, gestión de proveedores, PDF, calendario y notificaciones nativas requieren las siguientes etapas; esta versión inicial todavía no sustituye la app oficial.

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
npm test
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

## Actualizar la prueba en Windows

Detén Metro con Ctrl+C. Desde `diverty-nativa/mobile`:

```powershell
git pull --ff-only
npm.cmd ci
npx.cmd expo start --lan --clear
```

Vuelve a escanear el QR. Cada tarjeta tiene Editar reserva, Abonos y saldo y Gastos del evento; Nueva reserva aparece encima de la agenda. Las fechas y horas se escriben como AAAA-MM-DD y HH:MM en esta etapa. Al guardar, verás confirmación solo después de que Firebase responda. El usuario confirmó el guardado de reservas y abonos; la nueva pantalla de gastos todavía necesita esa comprobación. Los cambios sí afectan los datos oficiales al pulsar Guardar.

La lógica de líneas y duración en `src/domain` es una copia de los módulos puros de la app oficial para evitar que Metro cargue el React de la web. Al modificar esos módulos, conserva su paridad y ejecuta las pruebas de ambas versiones.

## Abonos y saldo

Cada reserva muestra total contratado, recibido y saldo pendiente. Abonos y saldo permite consultar `pagosItems` y registrar un pago por transferencia, Yappy, efectivo u otro método. No modifica el precio contratado ni confirma automáticamente la reserva.

El registro usa una transacción sobre el saldo actual, conserva el historial existente e incrementa `_rev`. Guarda temporalmente el identificador del pago en el teléfono antes de enviar; si la conexión falla, reintenta con el mismo identificador y evita duplicarlo. Un error de escritura de esta memoria local impide iniciar el cobro, para no perder esa protección.

Las cifras recibidas en reservas antiguas pueden incluir abonos sin detalle individual o correcciones; el saldo se calcula desde `total` y `abono`, no desde la suma del historial. Los ajustes/correcciones de pagos siguen disponibles en la app actual. No registres un abono ya recibido solo para probar esta pantalla.

El usuario confirmó que los abonos funcionan en su prueba.

## Gastos del evento

Cada reserva permite registrar personal/animadores, transporte, adicionales/materiales u otros gastos. Muestra los gastos internos, costos de proveedores y ganancia estimada sobre el total contratado. Un gasto puede superar el precio del evento; en ese caso la ganancia estimada será negativa.

La transacción conserva `gastosItems`, `detalleGastos`, abonos y proveedores, y aumenta `_rev`. En reservas antiguas donde `gastos` ya incluye proveedores, separa los costos una sola vez antes de añadir el nuevo gasto. No recalcula gastos antiguos desde un historial incompleto. La operación queda guardada temporalmente en el teléfono y reutiliza su identificador al reintentar para evitar duplicados.

Primero compara los costos con la app actual. Registra únicamente un gasto real que todavía no esté guardado; los ajustes y eliminación de gastos siguen en la app actual.

Validación: 18 pruebas locales sin datos reales y exportación de los bundles Android/iOS. El registro de gastos en un teléfono real todavía necesita verificación del usuario.
