# Seguimiento de reservas, Firebase y rendimiento

Fecha: 6 de octubre de 2026 (UTC). Repositorios: `diverty-app` y `Diverty-`.

Se conservaron el formulario, las pantallas y las funciones existentes. Las reservas utilizadas en las pruebas son ficticias y se guardaron exclusivamente en memoria. Las consultas a Firebase real fueron de lectura y sin sesión.

## 1. Conexión de la web con la app

Se corrigieron estos problemas:

- Cambiar la fecha o la hora de una reserva actualizaba sus datos públicos y privados, pero no trasladaba su candado `slot_*`. Ahora la misma transacción libera el horario anterior y ocupa el nuevo, conservando las otras reservas.
- Cancelar repetidamente una reserva podía descontar más de una vez de un contador antiguo sin `reservationIds`. El cambio de estado se comprueba antes de liberar el cupo. Eliminar una reserva cancelada conserva los cupos de las otras reservas.
- Reactivar una reserva no recuperaba su candado. Ahora lo recupera una sola vez. Pasar una reserva al servicio de Santa utiliza el candado `slot_santa_*` correspondiente.
- Un dispositivo con datos antiguos podía aceptar una reserva cuyo transporte pasó a requerir revisión. La aceptación vuelve a comprobar el documento vigente dentro de la transacción.
- La consulta inicial de horarios normales podía contar filas públicas canceladas antiguas. Ahora las descarta, y continúa reparando IDs huérfanos del candado.
- Web y app sumaban los recursos de todos los eventos que tocaban el intervalo solicitado, aunque fueran consecutivos. Ahora calculan el máximo de personal ocupado al mismo tiempo. Por ejemplo, un animador de 10:00–11:00 y otro evento de 11:00–12:00 ocupan un animador durante 10:00–12:00, no dos simultáneos.

La escritura del evento, del seguimiento `reservas_cliente`, de la disponibilidad pública y de los candados se realiza sin lecturas posteriores a escrituras, como exige Firestore. El administrador conserva sus opciones actuales para gestionar reservas; estos cambios no imponen una nueva prohibición de sobreponer eventos manuales.

Se comprobó el recorrido conectado con los manejadores de ambos repositorios y un almacén transaccional compartido en memoria: solicitud web → aceptación en CRM → estado del cliente → cambio de hora → reserva del horario liberado → rechazo del horario ocupado → cancelación → nueva reserva. Las proyecciones públicas comprobadas no incluyen nombre, teléfono, correo, propietario ni importe.

## 2. Firebase: comprobaciones y pendientes

Ambos proyectos usan `diverty-eventos` y `artifacts/diverty-oficial/public/data`.

| Lectura real sin autenticación | Resultado |
| --- | --- |
| `config_web/disponibilidad` | HTTP 200 |
| `disponibilidad_web`, consulta de un documento como máximo | HTTP 200 |
| `eventos`, consulta limitada | HTTP 403, `PERMISSION_DENIED` |
| `reservas_cliente`, consulta limitada | HTTP 403, `PERMISSION_DENIED` |
| `configuracion`, consulta limitada | HTTP 403, `PERMISSION_DENIED` |
| `tokens`, colección en la raíz | HTTP 403, `PERMISSION_DENIED` |

Estos resultados comprueban únicamente esas consultas sin sesión. No demuestran que un cliente autenticado esté aislado de otros clientes, que los precios estén protegidos ni que la escritura de una reserva sea válida según las reglas reales.

Las reglas de Firestore no están versionadas en los repositorios y no hay acceso administrativo utilizable en este entorno. Se solicitó su texto para revisarlas. No se publicaron reglas nuevas ni se hicieron escrituras, registros de usuarios o reservas de prueba en producción.

### Concurrencia

Las pruebas simuladas verifican que dos solicitudes al mismo horario no ocupen ambas el último cupo, y que ocho solicitudes para un horario con capacidad tres guarden exactamente tres IDs. El candado compartido se lee dentro de la transacción; Firestore puede reintentar si cambia. El almacén de prueba serializa transacciones: no reproduce el servicio real, sus reglas o su latencia.

**Pendiente prioritario:** los candados actuales se separan por hora de inicio. Una solicitud a las 10:00 y otra a las 10:30 no comparten candado aunque ambos eventos duren dos horas. La consulta de personal se hace fuera de esa transacción y las solicitudes públicas pendientes todavía no publican sus necesidades de personal. Por ello el control actual no garantiza capacidad operativa para solicitudes simultáneas que se solapan. La aceptación administrativa tampoco reserva personal mediante un bloqueo transaccional común.

Para resolverlo de forma completa hay que revisar las reglas reales y acordar una validación confiable de intervalos y recursos, idealmente mediante una función de servidor que cree/acepte la reserva y compruebe capacidad de manera atómica. Esa función debe validar también propietario, campos permitidos, paquete/precio y estados. No se añadió otro tipo de documento desde el navegador sin comprobar antes que las reglas lo permiten: podría impedir las reservas existentes.

## 3. Carga inicial de la app

La entrada ahora carga el acceso y Firebase Auth. El panel operativo y Firestore se descargan al recuperar una sesión administrativa o al iniciar sesión. Se reutilizaron el diseño del acceso y la pantalla de carga; PDF, notificaciones y administración web continúan bajo demanda.

| JavaScript de entrada | Antes, compilación conservada | Ahora |
| --- | ---: | ---: |
| Sin comprimir | 1.065.144 bytes | 322.129 bytes |
| Comprimido con gzip en esta máquina | 264.355 bytes | 84.100 bytes |

Reducción aproximada del **70 % antes de iniciar sesión**. No es una medición del tiempo de carga en el teléfono ni del tamaño total después de entrar. El panel operativo sigue siendo un archivo grande (aproximadamente 745 kB) y puede dividirse más en futuras mejoras.

Se comprobó en Chromium que el acceso compilado descarga solamente su archivo de entrada. Las pruebas del acceso simulado también comprobaron credenciales rechazadas, usuario sin permiso, ingreso administrativo, cierre de sesión y nuevo ingreso. Cerrar sesión desmonta el panel y sus datos. Un error al cargar el panel ofrece una opción para reintentar.

## Verificación

- App: `npm test`, **24 pruebas aprobadas**, y `npm run build`, aprobado.
- Web: `npm test`, **22 pruebas aprobadas**, y `npm run build`, aprobado.
- Navegador: acceso móvil/escritorio, configuración local dañada, catálogo y formulario móvil/escritorio, cuatro plantillas PDF, navegación de Agenda/Clientes/Finanzas/Proveedores/Ajustes y seis comprobaciones del acceso simulado, aprobados.
- Calendario: nueve escenarios, incluidos selector nativo ausente/con error, almacenamiento restringido y respuesta de disponibilidad tardía, aprobados.
- Flujo conectado entre los manejadores de web y app, aprobado con datos simulados.
- Acceso móvil de la app compilada, aprobado; panel operativo diferido.

Los ayudantes de navegador y conexión se conservaron en `/workspace/.cloud-setup/`. Las pruebas unitarias y este diagnóstico se versionaron en los repositorios. Para repetir las verificaciones de código en una nueva copia: ejecutar `npm ci`, `npm test` y `npm run build` en cada repositorio.

Faltan la auditoría de las reglas reales, la prueba en el teléfono original y la verificación de estas versiones en el alojamiento después de desplegarlas. Que GitHub reciba un commit no confirma por sí mismo un despliegue correcto.
