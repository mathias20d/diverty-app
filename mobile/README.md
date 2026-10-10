# Diverty nativa — administración de reservas

React Native y Expo para Android e iPhone. Las pantallas de administración utilizan controles nativos. Solo la vista previa del tema carga la página de prueba existente en una WebView; no sustituye los formularios ni permite reservas.

## Alcance actual

- Inicio de sesión con la cuenta administradora existente.
- Persistencia de sesión en el dispositivo.
- Navegación inferior original: Inicio, Agenda, Clientes, Proveedores, Finanzas, Web y Ajustes. Calendario se abre desde Agenda.
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
- Directorio de proveedores, edición de datos y servicios, activación/desactivación y contacto.
- Asignación de servicios de proveedores a reservas y registro del estado de pago.
- Facturas, cotizaciones, contratos de cliente, acuerdos marco de proveedores y subcontratos del evento con numeración oficial, impresión y menú nativo para compartir.
- Operación Navidad: visitas del 24 y 25 de diciembre de 2026, rutas por Santa, reasignación, entregas realizadas, reapertura y eliminación confirmada.
- Administrar página web: Catálogos, Servicios y personajes, Campañas, Temas, Galería, Cupones y Banner y ajustes, con las colecciones oficiales y sincronización de la web.

La app y la web actuales permanecen disponibles. Las correcciones auditadas de cobros/gastos, contratos y revisión de solicitudes web ya están migradas. La edición de horarios especiales, herramientas avanzadas y notificaciones nativas siguen pendientes; esta versión todavía no sustituye todas las funciones de la app oficial. El menú principal ya sigue el orden del administrador web. La equivalencia visual exacta y la migración completa de todas las pantallas siguen pendientes; este bloque amplía la versión nativa existente sin sustituir sus pantallas ya migradas.

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

1. Validar navegación, proveedores y PDF en Android/iPhone reales.
2. Completar la edición de horarios especiales conservando cupos y proyecciones.
3. Completar herramientas avanzadas y comparar la equivalencia visual de todas las pantallas con la web.
4. Registrar dispositivos y configurar notificaciones push nativas; las notificaciones del navegador no se trasladan automáticamente.
5. Probar ambos sistemas y preparar versiones firmadas para distribución.

No se ha configurado EAS ni creado una cuenta o proyecto Firebase nuevo. Las identificaciones `com.divertypanama.reservas` son iniciales y deben verificarse antes de registrar las apps en las tiendas.

## Actualizar la prueba en Windows

Detén Metro con Ctrl+C. Desde `diverty-app/mobile`:

```powershell
git pull --ff-only
npm.cmd ci
npx.cmd expo start --lan --clear
```

Vuelve a escanear el QR. Las siete secciones originales aparecen abajo. Cada tarjeta tiene Ver reserva y acciones; allí encuentras Editar reserva, Abonos y saldo, Gastos del evento, Proveedores del evento y Facturas y cotizaciones. Nueva reserva aparece en la agenda y en cada cliente, y el calendario permite seleccionar la fecha antes de abrir el formulario. Las fechas y horas se escriben como AAAA-MM-DD y HH:MM en esta etapa. Al guardar, verás confirmación solo después de que Firebase responda. El usuario confirmó el guardado de reservas, abonos y la aparición de gastos en el historial. Los cambios sí afectan los datos oficiales al pulsar Guardar.

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

Validación: 39 pruebas locales sin datos reales, compatibilidad de dependencias Expo y exportación de los bundles Android/iOS. Una prueba de componentes React recorre clientes → reserva precargada, cierre/reapertura del calendario, contacto, abonos, gastos, regreso a la agenda y finanzas; utiliza controles nativos simulados y Firebase/almacenamiento ficticios. No sustituye la prueba visual y de permisos en Android/iPhone reales.

Después de actualizar una sola vez, revisa las cinco secciones y compara una reserva existente con la app actual. No vuelvas a registrar abonos o gastos ya guardados para comprobar la nueva navegación.


## Proveedores y documentos

Proveedores usa la colección oficial `proveedores`. Permite crear/editar datos y costos de servicios, desactivar servicios sin borrar las asignaciones anteriores y abrir WhatsApp. Editar comprueba tanto `updatedAt` como `_rev` para detectar cambios de la app web, y conserva campos oficiales adicionales.

Desde una reserva, Proveedores del evento asigna un servicio y su costo acordado a `subcontratos`, con identificador persistido en el dispositivo para reintentos sin duplicados. Separa una sola vez los costos antiguos que incluían proveedores. Marcar pagado registra únicamente el estado: no envía dinero, no suma otro gasto ni cambia los abonos del cliente. No ofrece eliminar asignaciones en esta etapa.

Facturas y cotizaciones genera PDF mediante Expo Print y comparte mediante Expo Sharing. Conserva los números de documentos existentes y asigna los nuevos con la misma transacción de la app oficial: `configuracion/contador_factura` o `configuracion/contador_cotizacion`, más `numeroFactura`/`numeroCotizacion` en la reserva. Si el contador no está preparado, solicita usar Ajustes → Preparar actualización en la app actual; no inventa un número ni inicia migraciones desde la app nativa. Generar asigna un número oficial aunque después cierres el menú para compartir.

El PDF usa los servicios de esa reserva, precios guardados, cantidades y duración total del paquete, incluida Diverty Amigo de 2 horas. El catálogo solo completa descripciones/duración. La factura conserva el total contratado y abono; la cotización calcula el total desde los servicios seleccionados y transporte, igual que la plantilla web. Todo texto se escapa al generar HTML y el PDF no necesita cargar imágenes o fuentes remotas. Los contratos de cliente y proveedor están disponibles desde las versiones 0.7.0 y 0.8.0.

Los datos de empresa de la app web están en su navegador (`diverty_settings`), no en Firebase. Antes del primer PDF, revisa Datos de la empresa para PDF y pulsa Guardar datos para documentos. Se guardan por cuenta administradora en ese teléfono; puedes editarlos antes de generar y debes configurarlos también en otro teléfono. Los datos bancarios no se rellenan con valores antiguos ni se cambia la configuración de la web.

El catálogo (`serviciosCustom`), clientes ocultos (`clientesOcultos`) y señales internas (`syncBus`) usan `configuracion`, conforme a la app oficial. Solo los cierres y la versión pública de la web usan `config_web`.

Las pruebas usan Firebase, archivos PDF y menú de compartir simulados; no envían mensajes ni modifican producción. Verifican altas de proveedores, asignaciones, estado de pago, numeración repetida, conservación de costos antiguos, cantidades/duración, datos de clientes ocultos y lectura del catálogo en su ruta oficial. Los bundles JavaScript Android/iOS no sustituyen comprobar el PDF y la hoja de compartir en teléfonos físicos.


Desde la versión 0.2.1, cada tarjeta de reserva en Agenda, Calendario e historial de clientes tiene botones Factura y Cotización. Abren directamente el documento escogido. La versión aparece debajo de Diverty para comprobar que Expo Go está mostrando la actualización. También se conserva Facturas y cotizaciones dentro del detalle.

## Administrar página web — 0.3.0

Desde la cabecera, abre **Administrar página web**. Conserva las siete secciones del módulo web, sus nombres, datos y reglas. Las referencias son `src/modules/web/WebAdmin.jsx`, `useWebAdminData.jsx` y el repositorio `Diverty-`. El centro de control conserva la paleta violeta, el encabezado oscuro con degradado y las tarjetas blancas del módulo original, adaptados a controles nativos. La igualdad visual exacta todavía necesita comparación en Android/iPhone; no se ha verificado en dispositivos físicos.

- Catálogos: crear, editar, eliminar, ordenar, visibilidad y fechas de temporada; la eliminación conserva sus servicios.
- Servicios y personajes: categoría, tipo de cobro, cantidades, unidad, temática, precios, ofertas, destacados, orden, descripción, servicios incluidos y dos imágenes. Crea Personajes cuando corresponde y permite guardar y agregar otro personaje.
- Campañas: títulos, descripción, fechas, precios, incluidos, botón, acción, activación, destacados, duplicación y prioridad.
- Temas: colores, degradado, decoración, animaciones, fechas, modo automático/manual y tema predeterminado. La vista previa usa el mismo `theme-preview.html`, recibe borradores sin escribir en Firebase y limita la comunicación a la web oficial. Requiere conexión y que ese recurso esté publicado.
- Galería: imágenes por selección del teléfono o URL y eliminación del registro público.
- Cupones: porcentaje/monto fijo, edición, activación y eliminación; conserva compatibilidad con el campo antiguo `active`.
- Banner y ajustes: texto y activación del banner público.

Las fotos se suben al mismo Cloudinary/preset que la web. Seleccionar una foto prepara la URL; **Guardar** publica el registro. Catálogos y servicios copian los mismos enlaces `categoria`/`plan`, con `pv` para renovar la vista previa social. La disponibilidad se mantiene en Calendario, con cierre/reapertura de fechas ya migrados.

Se reutiliza el controlador de datos de la web en `src/useWebAdminData.js`. Cada operación agrupa el registro y los incrementos de `config_web/web_sync` en un batch. No modifica reservas, contadores de facturas, Firebase ni las rutas oficiales. Los campos no editados se conservan mediante merge. Una edición de catálogo desde dos administradores mantiene el comportamiento de la web: prevalece la última escritura de los campos editados; no hay resolución de conflictos por campo. Un error conserva el formulario y ofrece reintento; una nueva ficha mantiene su identificador durante los reintentos de ese editor. Las URLs subidas sin guardar no se eliminan automáticamente de Cloudinary, igual que en la web.

Pruebas sin producción: validación de temporadas, cantidades, ofertas, campañas, cupones y temas; paridad de módulos compartidos; navegación por el administrador web nativo, edición conservando campos adicionales, alta de personajes, banner, eliminación de cupones, enlaces y descarte de borradores. Se conserva el recorrido de reservas, abonos, gastos, proveedores y PDF. No se han probado permisos de fotos, portapapeles, WebView ni Firebase en teléfonos reales. Los bundles no generan APK/IPA.

Para probar este bloque en Windows, desde `diverty-app/mobile`, ejecuta `npm.cmd ci` y `npx.cmd expo start --lan --clear`, y vuelve a escanear el QR. Comprueba **Versión 0.3.0** en la cabecera. Usa únicamente cambios reales al guardar: los formularios escriben en los datos oficiales.


## Inicio y Ajustes — 0.4.0

Menú: Inicio, Agenda, Clientes, Proveedores, Finanzas, Web, Ajustes. El calendario se abre desde Agenda. Inicio incluye indicadores de eventos, cobros del mes, clientes visibles, saldos, cotizaciones, solicitudes web, meta y próximos eventos. Cotizar reutiliza el editor existente.

Ajustes conserva las nueve categorías web. Mi negocio, Facturación y banco y Documentos comparten los datos locales del teléfono con el editor de PDF; Meta mensual también se guarda por usuario en el teléfono. Personal disponible guarda animadores, payasos y capacidades en config_web/global mediante una transacción que conserva otros campos y detecta cambios concurrentes. Notificaciones, herramientas avanzadas y zona de peligro están identificadas como pendientes y no ejecutan migraciones ni borrados. No se afirma equivalencia gráfica exacta todavía.

Validación: 49 pruebas nativas y 61 web; exportaciones Android/iOS. No se escribieron datos de producción durante las pruebas. Para probar, reinicia Expo con `npx.cmd expo start --lan --clear` desde esta carpeta y comprueba Versión 0.4.0.


## Solicitudes web — 0.5.0

Inicio → Solicitudes web abre Alertas Web con los filtros Todas, Por revisar, Próximas y Falta abono. También se puede revisar una solicitud desde su detalle de Agenda. La revisión permite guardar referencia, confirmar transporte y personal, aceptar y rechazar; no requiere abono para aceptar. Los cambios conservan los abonos y detectan revisiones de otros dispositivos.

Las reservas centralBookingVersion=1 con centralBookingValidation activo utilizan la función oficial confirmWebBooking en us-central1, sin recurrir a la confirmación local si falla. Las normales anteriores reutilizan la lógica de personal y transacción del administrador web, incluidas las proyecciones disponibilidad_web, reservas_cliente, portal_busqueda, bloqueos de horario y booking_control. Esta ruta anterior conserva la comprobación de personal del administrador web; no incorpora un servidor nuevo de asignación. Las solicitudes Santa anteriores deben aceptarse desde la web hasta migrar las reglas de traslado y ruta. Rechazar libera la proyección y el bloqueo de horario mediante las mismas reglas web.

52 pruebas nativas y 61 web, con Firebase simulado y sin escrituras de producción; exportaciones Android/iOS verificadas. La equivalencia visual exacta del administrador y contratos, correcciones de pagos/gastos y herramientas avanzadas siguen pendientes. Reinicia Expo y comprueba Versión 0.5.0.


## Correcciones financieras — 0.6.0

Abonos y saldo → Corregir recibido ajusta el total recibido sin cambiar el precio contratado ni borrar pagosItems. Gastos del evento → Corregir gastos internos ajusta el costo interno, separando los proveedores de los totales antiguos una sola vez, y conserva gastosItems y subcontratos. El total corregido puede diferir del desglose histórico; este permanece visible. Las correcciones quedan registradas en ajustesFinancieros con importes anteriores y nuevos.

Se admite cero, se exige un máximo de dos decimales y se impide que el recibido supere el total. Las transacciones detectan cambios de revisión, conservan las proyecciones de disponibilidad y cliente y no recrean reservas eliminadas. Las operaciones pendientes se guardan por usuario y reserva en el teléfono; reintentar tras perder la confirmación de red conserva el mismo ID y no duplica el ajuste.

Validación: 56 pruebas nativas y 61 web, incluida la repetición después de una confirmación de red perdida, y exportaciones Android/iOS. Sin escrituras de producción durante pruebas. Contratos, Santa con rutas anteriores, equivalencia visual exacta y herramientas avanzadas aún pendientes. Comprueba Versión 0.6.0 al reiniciar Expo.


## Contratos de cliente — 0.7.0

Detalle de reserva → Facturas y cotizaciones → Contrato genera y comparte el contrato de servicio con las doce cláusulas copiadas literalmente del Contract de la web, servicios contratados, duración, transporte, precio, abonos, saldo y espacios para firma del cliente y de Diverty. Generar no firma ni acepta el contrato.

Usa numeroContrato y configuracion/contador_contrato con el prefijo CON, y conserva la numeración al repetir. Si el contador no está preparado, exige prepararlo desde la web, como los otros documentos. Las condiciones no se reformularon ni se incorporaron cláusulas nuevas. La disposición de PDF nativo adapta la plantilla al motor de impresión; aún no se afirma equivalencia visual exacta con toda la web. Contratos de proveedores y Santa con rutas anteriores siguen pendientes.

57 pruebas nativas y 61 web; muestra A4 renderizada y revisada visualmente, y exportaciones Android/iOS. No se escribieron datos de producción. Los avisos de Firebase/consola reportados por el usuario siguen pendientes del mensaje exacto para diagnóstico; no se ocultaron ni se consideran resueltos. Comprueba Versión 0.7.0 al reiniciar Expo.


## Conexión Firebase — 0.7.1

Firestore se inicializa con el transporte oficial experimentalForceLongPolling y autodetección desactivada para evitar problemas de respuestas streaming en redes móviles/Expo. El proyecto, autenticación y datos oficiales se conservan. Administrar página web espera un aviso de web_sync confirmado por servidor antes de cargar configuración; una instantánea de caché no inicia getDoc ni habilita guardados. Al desconectar conserva los datos y muestra el estado; al reconectar recupera la carga automáticamente. Errores de permisos y de conexión muestran instrucciones distintas.

La prueba simula arranque offline, reconexión, desconexión con datos ya cargados, bloqueo de escrituras y rechazo de permisos. 59 pruebas nativas y 61 web; exportaciones Android/iOS. La conectividad del teléfono real debe comprobarse después de instalar la actualización: detén Metro, cierra Expo Go completamente, reinicia con npx.cmd expo start --lan --clear y verifica Versión 0.7.1. Si persiste un error, conserva el mensaje completo; no se modificaron reglas ni se ocultaron errores inesperados.


## PDF desactivado — 0.7.2

Documentos de la reserva muestra Preparación del PDF con el motivo del bloqueo. En el primer uso, Guardar datos y habilitar PDF guarda explícitamente la empresa mostrada en el teléfono; los datos fiscales y bancarios se pueden completar en el formulario. Editar sin guardar mantiene los botones de generación bloqueados.

Si el catálogo no carga, Usar servicios guardados en la reserva permite generar con el desglose de esa reserva, sin completar descripciones ni duraciones desde el catálogo. Esta elección no omite la revisión de importes, los datos de empresa ni la numeración oficial. Un error de conexión o permisos durante la numeración muestra el diagnóstico de Firebase.

61 pruebas nativas y 61 web; se verificó la generación desde el primer guardado de empresa y con catálogo no disponible, manteniendo el mismo número oficial. Exportaciones Android/iOS. Reinicia Expo y verifica Versión 0.7.2 antes de probar Compartir PDF.

## Contratos de proveedores — 0.8.0

Proveedores → Contrato marco y Reserva → Proveedores del evento → Subcontrato del evento permiten compartir PDF o imprimir. Las doce cláusulas se copian literalmente de la web. El subcontrato agrupa únicamente los servicios asignados al proveedor y sus costos guardados. Ambos usan el contador oficial contador_subcontrato: el marco guarda numeroSubcontrato en el proveedor; el evento guarda numeroSubcontratoEvento en sus asignaciones. Repetir conserva el número; importes o contadores inválidos bloquean la generación. Los datos de empresa deben guardarse antes en Ajustes o Facturas y cotizaciones.

64 pruebas nativas y 61 web, exportaciones Android/iOS y muestra A4 revisada. No se escribieron datos de producción. La disposición de impresión adapta la web; equivalencia visual exacta de toda la app y rutas anteriores de Santa siguen pendientes. La generación física en Expo Go necesita verificación en el teléfono.

## Compartir PDF en Expo Go — 0.8.1

El error Not allowed to read file under given URL aparece al pasar a Expo Sharing la ruta de impresión del host, fuera de los directorios autorizados de la experiencia de Expo Go. La app solicita los bytes base64 a Expo Print y los escribe con File de expo-file-system en Paths.cache antes de compartir. No lee ni copia la ruta rechazada. El mismo flujo cubre factura, cotización, contrato de cliente, acuerdo marco y subcontrato de evento. La numeración oficial se conserva al reintentar.

Facturas y contratos muestran la etapa (numeración, creación, guardado, compartir) y un aviso visible con el detalle del error. 66 pruebas nativas: bytes PDF exactos en caché, ruta de impresión inaccesible, fallos de creación/compartir sin renumerar y navegación completa. Dependencias compatibles con SDK 57. La comprobación final en el teléfono requiere reiniciar Metro y cerrar Expo Go.

## Operación Navidad — 0.9.0

Inicio y Agenda abren Operación Navidad para las entregas del 24 y 25 de diciembre de 2026, igual que la temporada del administrador web. Muestra pendientes, realizadas, solicitudes por revisar y grupos por Santa. Conserva las asignaciones a Santas que ya no estén habilitados, identifica la siguiente parada y avisa de horarios incompatibles. El motor de servicio (30 min) y traslados por GPS se copia literalmente de la web, con prueba de paridad. Las rutas de Maps incluyen únicamente visitas pendientes del primer día pendiente.

Permite reasignar Santa, marcar entrega realizada, devolver a pendiente y eliminar una reserva tras confirmación. Las transacciones leen datos actuales, comprueban revisión y capacidad, conservan abonos/proveedores y utilizan el wrapper migrado que actualiza disponibilidad_web, reservas_cliente, portal_busqueda y booking_control. Reasignar un horario conflictivo requiere confirmación explícita. Cerrar una temporada oculta el módulo solo en este teléfono; Herramientas del sistema permite volver a mostrarlo sin borrar datos.

71 pruebas nativas y 61 web. La prueba de navegación recorre reasignación, rutas, entrega/reapertura, eliminación con proyecciones y visibilidad. No se escribieron datos de producción. Continúan pendientes la confirmación de solicitudes Santa anteriores a la validación central, edición de horarios especiales, herramientas avanzadas y notificaciones nativas. No se afirma equivalencia visual exacta; requiere comparación en teléfonos físicos.

## Aceptar solicitudes Santa anteriores — 0.10.0

Solicitud Web → Asignar Santa → Aceptar reserva ya procesa las solicitudes navideñas anteriores a centralBookingVersion=1. Valida la capacidad actual y el motor de rutas migrado (visita de 30 minutos y traslados por GPS, 15 minutos si falta un pin); muestra errores para Santa deshabilitado o ruta incompatible. Las visitas canceladas, realizadas, eliminadas, solicitudes sin aceptar y otras fechas no bloquean esa ruta. No confirma solicitudes con referencia o transporte pendientes de revisión.

El destino de la escritura conserva los mismos campos de la confirmación web: Confirmado, esNavidad, recursoNavidad y santaAsignado, con incremento de revisión. Lee datos actuales en la transacción y usa las proyecciones migradas para disponibilidad, estado del cliente, portal y booking_control. La validación central sigue usando exclusivamente confirmWebBooking cuando está activa para esa reserva, sin recurrir a confirmación local si falla. La ruta anterior utiliza consulta y transacción como el administrador existente; no introduce una nueva garantía de asignación de servidor.

73 pruebas nativas y 61 web. La prueba integrada verifica conflicto, Santa deshabilitado, aceptación con otro Santa, conservación del abono, proyecciones y bloqueo de repetición. Pruebas con datos ficticios; sin escrituras en producción. Pendiente comprobar aceptación en Expo Go con una solicitud real que el administrador desee aceptar y equivalencia visual.

## Seguimiento de eventos normales — 0.11.0

Detalle de reserva → Seguimiento del evento incorpora la secuencia del administrador web: Pendiente → Confirmado → Preparando → En camino → En el evento → Completado. Conserva sus acciones Confirmar reserva, Iniciar preparación, Salir al evento, Ya llegamos y Marcar evento realizado, y sus marcas confirmedAt, preparingAt, enCaminoAt, enEventoAt, completedAt y estadoOperativoActualizadoAt.

Cancelar reserva requiere confirmación, guarda cancelledAt y libera la disponibilidad pública mediante la transacción migrada. Conserva total, abonos, pagosItems, gastos y proveedores. Las escrituras detectan revisiones de otros dispositivos; repetir una etapa ya confirmada no incrementa revisión ni marca de tiempo. Los botones se bloquean durante actualización, carga, error o datos de caché. Solicitudes web, cotizaciones, Navidad y reservas archivadas conservan sus flujos propios.

75 pruebas nativas y 61 web. La prueba integrada recorre las etapas, comprueba el historial intacto, estado del portal y cancelación con eliminación de disponibilidad. No se escribieron datos reales. Queda pendiente revisar el seguimiento visual en Expo Go y comparar la disposición completa con la web.

## Versión 0.11.1 — sincronización al guardar reservas

Crear y editar reservas reutiliza las transacciones del administrador web (`src/App.jsx`): sincroniza disponibilidad, búsqueda del portal, seguimiento del cliente y cupos por horario. Cambiar la fecha libera el cupo anterior. Una reserva eliminada lógicamente no puede restaurarse desde un formulario antiguo. Las cotizaciones no ocupan disponibilidad.

Verificación con datos ficticios: 75 pruebas nativas y 61 web; creación, cambio de fecha, liberación de cupo, cotización y edición tras eliminación. Exportaciones Android/iOS. Pendiente en teléfono: comprobar sincronización con la web y compartir factura y contrato en Expo Go. No se modificaron datos de producción. Siguen pendientes la equivalencia visual completa y las funciones indicadas en el alcance.

## Versión 0.11.2 — edición de cotizaciones

El formulario identifica también las cotizaciones existentes (Cotización y Cot. Aprobada). Cambiar su horario no dispara la confirmación de colisión ni la restricción de fecha cerrada de una reserva, y conserva su estado sin ocupar disponibilidad. Sigue el criterio de cotización del guardado web en src/App.jsx. Las reservas normales conservan sus comprobaciones.

Verificación: 75 pruebas nativas y 61 web con datos ficticios, incluyendo editar una cotización a la misma hora que una reserva y comprobar estado, revisión y ausencia de disponibilidad. Exportaciones Android/iOS. Pendiente revisar edición y presentación visual en Expo Go; continúan los pendientes anteriores. Sin escrituras en producción.

## Versión 0.12.0 — gestión de reservas y cotizaciones

Bloque conjunto comparado con handleDuplicateEvento, handleConvertirReserva y handleDeleteEvento de src/App.jsx:

- Duplicar evento abre un formulario revisable para reservas normales y cotizaciones, con cliente, contacto, fecha/hora, dirección, transporte, comentarios y selección de servicios. Crea un ID nuevo al guardar, sin propietario, números de documentos, abonos ni historiales financieros anteriores. Corregida la precarga de servicios en formularios nuevos.
- Convertir a reserva abre la cotización existente para revisar. Guardar conserva su ID, número de cotización y datos existentes, cambia a Pendiente y sincroniza disponibilidad/cupos. Comprueba fecha cerrada, choque de horario y revisión simultánea. Descartar no convierte el registro.
- Eliminar registro requiere confirmación; la transacción verifica la revisión actual y elimina evento, proyecciones y cupos. Reintentar una eliminación ya aplicada es seguro. Navidad y solicitudes pendientes conservan sus flujos específicos.
- Agenda incorpora filtro Cotizaciones (incluye Cot. Aprobada). El formulario permite editar comentarios y el detalle los muestra.

Limitación: duplicar y convertir reservas con horarios/cupos especiales sigue pendiente. La copia comercial no copia campos adicionales que el formulario nativo aún no edita. Continúan pendientes equivalencia visual completa, horarios especiales, herramientas avanzadas y notificaciones.

Verificación: 79 pruebas nativas y 61 web con datos ficticios. La navegación integrada duplica una cotización sin alterar el original, rechaza conversión a fecha cerrada, guarda comentarios, convierte con el mismo ID y elimina con liberación de cupo y proyecciones. Pruebas de revisión simultánea, reintentos, filtro y exclusión de reservas especiales. Exportaciones Android/iOS. Pendiente en Expo Go: duplicar/descartar, convertir, filtrar y eliminar únicamente registros de prueba autorizados; compartir factura/contrato continúa pendiente. No se modificaron datos reales.
