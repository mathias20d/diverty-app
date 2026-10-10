# Diverty nativa — administración de reservas

React Native y Expo para Android e iPhone. Las pantallas utilizan controles nativos: no cargan la web en una WebView.

## Alcance actual

- Inicio de sesión con la cuenta administradora existente.
- Persistencia de sesión en el dispositivo.
- Navegación inferior: Agenda, Calendario, Clientes y Finanzas.
- Agenda en tiempo real, con próximas reservas o historial completo, búsqueda por nombre/teléfono/servicio/fecha y filtros de estado.
- Mismo Firebase `diverty-eventos` y ruta `artifacts/diverty-oficial/public/data/eventos`.
- Nueva reserva y edición con datos del cliente, servicios por unidad/hora/paquete y transporte.
- Lista de clientes con búsqueda, historial y contacto por WhatsApp. Nueva reserva con nombre, teléfono y correo precargados. Conserva la agrupación por nombre y los clientes ocultos de la app actual.
- Calendario mensual con reservas por día y cierre/reapertura de fechas en la web; conserva las reservas existentes.
- Detalle de cada reserva con contacto, ubicación guardada en Maps, servicios, duración, abonos y gastos.
- Finanzas por mes del evento, con total contratado, recibido, saldo, costos y ganancia estimada. Excluye cotizaciones, cancelaciones, rechazos y solicitudes web pendientes.
- Guardar escribe en Firebase oficial, con revisión de edición simultánea y respeto de fechas cerradas. Las pruebas automatizadas no escriben en producción.
- Conserva abonos, gastos y proveedores existentes; cambiar horarios de reservas especiales sigue en la app actual para mantener los cupos.
- Consulta y registro de abonos con saldo actualizado.
- Consulta y registro de gastos internos por categoría, con historial, proveedores y ganancia estimada.

La app y la web actuales permanecen disponibles. Ajustes de pagos/gastos, gestión de proveedores, aceptación de solicitudes web con asignación de recursos, PDF, administración del catálogo web y notificaciones nativas requieren las siguientes etapas; esta versión todavía no sustituye todas las funciones de la app oficial.

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

1. Validar juntos agenda, calendario, clientes y finanzas en teléfonos reales.
2. Migrar proveedores y aceptación de solicitudes web conservando recursos y cupos.
3. Migrar documentos, ajustes de cobros/gastos y administración del catálogo web.
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

Vuelve a escanear el QR. Las cuatro secciones aparecen abajo. Cada tarjeta tiene Ver reserva y acciones; allí encuentras Editar reserva, Abonos y saldo y Gastos del evento. Nueva reserva aparece en la agenda y en cada cliente, y el calendario permite seleccionar la fecha antes de abrir el formulario. Las fechas y horas se escriben como AAAA-MM-DD y HH:MM en esta etapa. Al guardar, verás confirmación solo después de que Firebase responda. El usuario confirmó el guardado de reservas, abonos y la aparición de gastos en el historial. Los cambios sí afectan los datos oficiales al pulsar Guardar.

La lógica de líneas, duración, fechas cerradas y GPS en `src/domain` es una copia de los módulos puros de la app oficial para evitar que Metro cargue el React de la web. Al modificar esos módulos, conserva su paridad y ejecuta las pruebas de ambas versiones.

## Abonos y saldo

Cada reserva muestra total contratado, recibido y saldo pendiente. Abre Ver reserva y acciones → Abonos y saldo para consultar `pagosItems` y registrar un pago por transferencia, Yappy, efectivo u otro método. No modifica el precio contratado ni confirma automáticamente la reserva.

El registro usa una transacción sobre el saldo actual, conserva el historial existente e incrementa `_rev`. Guarda temporalmente el identificador del pago en el teléfono antes de enviar; si la conexión falla, reintenta con el mismo identificador y evita duplicarlo. Un error de escritura de esta memoria local impide iniciar el cobro, para no perder esa protección.

Las cifras recibidas en reservas antiguas pueden incluir abonos sin detalle individual o correcciones; el saldo se calcula desde `total` y `abono`, no desde la suma del historial. Los ajustes/correcciones de pagos siguen disponibles en la app actual. No registres un abono ya recibido solo para probar esta pantalla.

El usuario confirmó que los abonos funcionan en su prueba.

## Gastos del evento

Cada reserva permite registrar personal/animadores, transporte, adicionales/materiales u otros gastos. Muestra los gastos internos, costos de proveedores y ganancia estimada sobre el total contratado. Un gasto puede superar el precio del evento; en ese caso la ganancia estimada será negativa.

La tarjeta de la agenda muestra estos costos y el último gasto. Dentro de Gastos del evento, los tres registros más recientes aparecen encima del formulario, con opción de ver todo el historial. Al guardar, se cierra el teclado y la pantalla vuelve al resumen con un mensaje persistente de confirmación.

La transacción conserva `gastosItems`, `detalleGastos`, abonos y proveedores, y aumenta `_rev`. En reservas antiguas donde `gastos` ya incluye proveedores, separa los costos una sola vez antes de añadir el nuevo gasto. No recalcula gastos antiguos desde un historial incompleto. La operación queda guardada temporalmente en el teléfono y reutiliza su identificador al reintentar para evitar duplicados.

Primero compara los costos con la app actual. Registra únicamente un gasto real que todavía no esté guardado; los ajustes y eliminación de gastos siguen en la app actual.

## Calendario y comprobación conjunta

Cerrar una fecha escribe en `config_web/fechas_cerradas` y aumenta la versión en `config_web/web_sync`, usando la misma transacción que la app oficial. Reabrir elimina únicamente el cierre de esa fecha; los cupos siguen controlados por la web. El calendario no presenta el número de reservas como disponibilidad garantizada. Los días pasados se pueden consultar, pero no cerrar ni reabrir.

La agenda consulta próximas reservas al abrir. El historial completo se carga al seleccionar Todas / historial o Clientes; Calendario y Finanzas consultan solo el mes seleccionado. La navegación a detalles conserva la búsqueda y la posición de la lista original. Los datos obtenidos de caché se identifican para evitar presentarlos como una actualización confirmada.

Validación: 28 pruebas locales sin datos reales, compatibilidad de dependencias Expo y exportación de los bundles Android/iOS. Una prueba de componentes React recorre clientes → reserva precargada, cierre/reapertura del calendario, contacto, abonos, gastos, regreso a la agenda y finanzas; utiliza controles nativos simulados y Firebase/almacenamiento ficticios. No sustituye la prueba visual y de permisos en Android/iPhone reales.

Después de actualizar una sola vez, revisa las cuatro secciones y compara una reserva existente con la app actual. No vuelvas a registrar abonos o gastos ya guardados para comprobar la nueva navegación.
