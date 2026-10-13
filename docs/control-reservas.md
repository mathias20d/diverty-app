# Control de reservas y seguimiento

Bloque web/PWA del 13 de octubre de 2026. Acceso desde **Inicio → Control de reservas** o **Agenda → Control de reservas**. Reutiliza los estados, abonos, revisión de solicitudes y documentos existentes. No crea una segunda agenda ni modifica la web pública o sus reglas Firebase.

## Filtros

| Filtro | Contenido |
| --- | --- |
| Por contactar | Solicitudes web, cotizaciones y reservas manuales pendientes sin contacto registrado ni fecha programada; también contactos programados para hoy o fechas anteriores en registros activos. Los vencidos aparecen primero. |
| Solicitudes web | Solicitudes pendientes de origen Web Directa. Revisar solicitud abre el detalle correcto en Alertas Web; no permite saltarse aceptación, transporte ni disponibilidad. |
| Cotizaciones | Cotizaciones y Cot. Aprobada, incluso anteriores a hoy. Se conservan la cotización PDF y la conversión mediante el formulario de reserva existente. |
| Sin anticipo | Reservas operativas de hoy/futuras o sin fecha, con precio mayor que cero y ningún abono. Excluye solicitudes sin aceptar, cotizaciones, canceladas y completadas. |
| Por preparar | Reservas operativas próximas sin fecha, hora, personal, duración recuperable, transporte revisado o referencia del lugar. Santa usa su asignación navideña y no se obliga a tener animador adicional. |
| Con saldo | Reservas aceptadas/manuales con saldo positivo, incluidos eventos realizados o pasados. Excluye cotizaciones, solicitudes sin aceptar y canceladas/rechazadas. |
| Todas | Todos los registros cargados, excepto papelera y documentos de sistema. Los filtros no son grupos exclusivos y sus conteos no se suman. |

Buscar combina cliente, teléfono, servicio, estado, dirección, referencia del lugar, personal y nota, sin distinguir tildes/mayúsculas. La fecha filtra por fecha del evento, no por fecha de contacto. Búsqueda y filtros abarcan todos los registros antes de paginar. Se muestran grupos de 30 con **Mostrar más registros**. PC usa tabla con desplazamiento horizontal propio y móvil usa tarjetas con nombres completos y controles de al menos 44 px.

## Contactos y equipo

**Seguimiento** registra Por contactar, Contactado o Esperando al cliente, una próxima fecha de contacto opcional y una nota de hasta 1000 caracteres. Esta información es interna, se guarda en `eventos/{id}.seguimientoComercial` y no se envía a Analytics, WhatsApp ni al PDF del cliente. La fecha ayuda a encontrar pendientes en el panel; no programa notificaciones ni mensajes automáticos. Confirmación oficial y cobros siguen usando los estados y pagos de la reserva.

La transacción lee el documento actual y escribe solo seguimiento, revisión y fecha de actualización. Conserva finanzas, personal, documentos y otros cambios simultáneos. Un seguimiento modificado por otro equipo se rechaza; Cancelar y reabrir muestra el dato reciente. Si falla Internet, el editor conserva sus campos para reintentar. Si el registro ya se guardó pero falla la señal de sincronización, no se invita a duplicar el guardado. Duplicar una reserva no hereda el seguimiento del cliente anterior.

**Personal / orden** abre el PDF y su editor existente de asignación sin entrar al formulario completo. Añadir animador, payaso o pintacaritas actualiza la reserva y la orden; al volver al control desaparece el pendiente de Personal. La duración histórica se comprueba con el catálogo web y su caché existente, conservando la duración ya contratada. Factura, contrato y cotización reutilizan sus números y generadores anteriores. Registrar abono conserva la transacción de pagos; Avanzar estado reutiliza los pasos operativos y su confirmación al completar. Navidad mantiene su operación especializada.

## Carga y alcance de las verificaciones

Al abrir se solicita el historial completo paginado si aún no estaba cargado en esta sesión. Después se reutilizan los registros y la sincronización existente. Una carga fallida muestra Reintentar reservas y no presenta una lista parcial como si estuviera completa. El catálogo se consulta solo mientras el control está abierto, reutilizando `useWebAdminData` y su caché. El módulo visual se descarga al abrirlo. No se añadieron listeners de colección permanentes.

Pruebas de funciones: `node --test tests/*.test.mjs`. Recorrido: `node tests/browser/reservation-control-flow.cjs`, con `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, `ORIGIN` y `SCREENSHOT_DIR` opcionales. Usa Firebase simulado y bloquea conexiones externas: fallos de carga/guardado, conflictos de seguimiento, búsqueda, paginación, abono, personal/orden, avance de estado, apertura de la solicitud correcta, recarga, foco, Escape y teclado simulado a 320/392/1366 px. La prueba conserva el backend ficticio durante la recarga; la app real guarda el seguimiento en Firestore.

Se verifica también la navegación general (`responsive-flow.cjs`), la compilación de producción y los PDFs reales (`service-order-flow.cjs`). La impresión, compartir del sistema, instalación y teclado físico de Android/iOS siguen requiriendo una comprobación en los dispositivos del usuario. No se crearon reservas de prueba en producción, no se modificaron clientes reales ni se enviaron mensajes.
