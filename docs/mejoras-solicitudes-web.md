# Solicitudes web y transporte pendiente

La campana “Solicitudes web” conserva la gestión existente y añade Todas, Por revisar, Próximas (7 días en Panamá) y Falta abono. Las tarjetas muestran qué necesita revisión: ubicación, transporte, personal o Santa. Se ordenan por fecha/hora del evento. El filtro de abono es informativo; no introduce un requisito de pago para aprobar.

La revisión de transporte usa la dirección del evento y los marcadores de la solicitud, incluyendo “Fuera de cobertura automática”. Guardar transporte cero explícitamente también permite resolver esa revisión. Las comprobaciones del documento remoto se conservan para impedir aceptar una solicitud desde información antigua. Navidad sigue exigiendo el punto exacto.

Las nuevas solicitudes creadas por el servicio central (`centralBookingVersion: 1`) se aprueban mediante `confirmWebBooking` cuando `config_web/global.centralBookingValidation` es verdadero. Si la llamada falla, la app muestra el error y no intenta aprobar directamente como alternativa. Las solicitudes históricas mantienen el flujo anterior.

Las ediciones, cambios de estado y eliminaciones de la app actualizan coordinadores privados por fecha en la misma transacción cuando la validación central está habilitada, conservando las proyecciones de disponibilidad y seguimiento del cliente. El servidor puede revalidar frente a operaciones concurrentes, también al pasar medianoche.

El servicio Firebase y su publicación están documentados en el repositorio web: [guía de validación central](https://github.com/mathias20d/Diverty-/blob/main/docs/validacion-central-reservas.md). Subir los cambios de la app a GitHub no publica Cloud Functions ni reglas. No activar el campo hasta publicar funciones, reglas, web y app.

Validación: 30 pruebas unitarias, compilación Vite y recorrido móvil con Firebase simulado (filtros y bloqueo de aprobación con transporte pendiente). Ninguna prueba crea reservas ni notificaciones reales.


## Verificar el lugar desde el celular

Al abrir una solicitud pendiente, pulsa **Ver ubicación en el mapa** y elige Google Maps o Waze. Cuando hay GPS guardado, ambas aplicaciones abren ese punto, no la ubicación actual del administrador. El selector aparece por encima de la solicitud; al cerrarlo se conserva la reserva abierta. Sin coordenadas, el mapa busca la dirección/referencia escrita y se muestra esa limitación.

El campo **Barriada, PH o salón de fiestas** permite añadir o corregir una referencia y guardarla en la reserva existente. Un GPS o enlace sin nombre del lugar bloquea la aprobación hasta que se añada ese dato. La app revalida la referencia del documento remoto para evitar que un dispositivo con información antigua apruebe sin ella. Una dirección escrita que ya identifica el lugar sirve como referencia; no se exige escribirla dos veces.

Estos cambios de la interfaz funcionan con las reglas actuales: usan el campo existente `referenciaLugar` y el acceso administrativo existente. La activación del servicio central de Firebase sigue siendo independiente.

Validación de esta mejora: 34 pruebas de la app, compilación de producción y recorrido a 390 px con Firebase simulado. Se verifican Google Maps/Waze, referencia guardada y bloqueo de transporte pendiente.
