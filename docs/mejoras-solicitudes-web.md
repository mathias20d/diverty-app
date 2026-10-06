# Solicitudes web y transporte pendiente

La campana “Solicitudes web” conserva la gestión existente y añade Todas, Por revisar, Próximas (7 días en Panamá) y Falta abono. Las tarjetas muestran qué necesita revisión: ubicación, transporte, personal o Santa. Se ordenan por fecha/hora del evento. El filtro de abono es informativo; no introduce un requisito de pago para aprobar.

La revisión de transporte usa la dirección del evento y los marcadores de la solicitud, incluyendo “Fuera de cobertura automática”. Guardar transporte cero explícitamente también permite resolver esa revisión. Las comprobaciones del documento remoto se conservan para impedir aceptar una solicitud desde información antigua. Navidad sigue exigiendo el punto exacto.

Las nuevas solicitudes creadas por el servicio central (`centralBookingVersion: 1`) se aprueban mediante `confirmWebBooking` cuando `config_web/global.centralBookingValidation` es verdadero. Si la llamada falla, la app muestra el error y no intenta aprobar directamente como alternativa. Las solicitudes históricas mantienen el flujo anterior.

Las ediciones, cambios de estado y eliminaciones de la app actualizan coordinadores privados por fecha en la misma transacción cuando la validación central está habilitada, conservando las proyecciones de disponibilidad y seguimiento del cliente. El servidor puede revalidar frente a operaciones concurrentes, también al pasar medianoche.

El servicio Firebase y su publicación están documentados en el repositorio web: [guía de validación central](https://github.com/mathias20d/Diverty-/blob/main/docs/validacion-central-reservas.md). Subir los cambios de la app a GitHub no publica Cloud Functions ni reglas. No activar el campo hasta publicar funciones, reglas, web y app.

Validación: 30 pruebas unitarias, compilación Vite y recorrido móvil con Firebase simulado (filtros y bloqueo de aprobación con transporte pendiente). Ninguna prueba crea reservas ni notificaciones reales.
