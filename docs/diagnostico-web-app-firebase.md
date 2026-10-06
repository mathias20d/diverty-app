Diagnóstico de Diverty: web, app y Firebase
========================================

Este informe documenta las correcciones de ambos repositorios y sus validaciones locales. La publicación de la web y la app se debe confirmar en Netlify/Vercel después de subir los commits a GitHub. No se publicaron reglas de Firebase. Las operaciones de prueba usaron clientes ficticios y almacenamiento simulado; las consultas al Firebase real fueron de lectura y no mostraron datos de clientes.

**Correcciones realizadas**

- El calendario normal ya no bloquea todo un día por tener tres reservas a horas distintas. Un día completo exige alcanzar el cupo configurado en cada horario ofrecido, de 08:00 a 23:30. La comprobación final del formulario conserva las validaciones operativas y el contador transaccional.
- Después de una transacción fallida, un reintento conserva su identificador y recoge el formulario actualizado. Si el envío anterior aún puede completarse, sus datos permanecen inmutables para evitar reemplazos y duplicados.
- El aviso de horario lleno ahora puede acceder al cupo calculado y mostrar el mensaje sin un ReferenceError.
- La app recupera valores predeterminados cuando la configuración del navegador es JSON inválido o tiene una estructura incompatible. Conserva la configuración válida existente.
- Una capacidad de personal igual a cero se respeta en ambos proyectos; antes se reemplazaba por tres animadores o un payaso.
- Un fallo de autenticación del SDK de la web ya no queda guardado como una inicialización exitosa: permite volver a intentar la conexión.
- Se corrigió un rechazo de reproducción de video que quedaba sin manejar al navegar rápidamente desde la portada.
- La navegación de reservas tolera que el navegador bloquee `sessionStorage` o `localStorage`. Los datos de contacto guardados y la marca de sesión siguen utilizándose cuando el almacenamiento está disponible.
- El formulario normal ofrece un calendario propio al tocar Fecha o «Elegir fecha en el calendario», sin depender de que el teléfono abra el selector nativo. Guarda la fecha en el campo original y ejecuta sus eventos de cambio para mantener las comprobaciones de personal.
- Antes de reconstruir el formulario por una actualización automática, se conservan sus datos actuales. Los datos de contacto recordados ya no reemplazan los valores que la persona está editando.

**Cambios de carga y compilación**

La web entrega estilos compilados localmente, sin ejecutar el compilador de Tailwind desde un CDN. El CSS generado pesa 57.015 bytes. El módulo del calendario propio pesa 6.709 bytes sin compresión y no necesita dependencias externas. La compilación agrega versiones basadas en el contenido a los recursos modificados para renovar la caché. Netlify tiene instrucciones explícitas para compilar y publicar `dist`, que contiene las páginas y recursos públicos, sin publicar las herramientas y pruebas en el sitio. El directorio de funciones de Netlify conserva su ubicación y configuración.

La plantilla PDF se separó en un módulo que se carga al abrir un documento. Su contenido y cálculos se compararon con la implementación anterior y se conservaron. La biblioteca de descarga/compartición se solicita al necesitarla y puede reintentarse si falla. Firebase Messaging se carga después de iniciar sesión.

| Archivo principal de la app | Bytes sin compresión |
| --- | ---: |
| Antes | 1.146.952 |
| Después | 1.065.144 |
| Reducción | 7,13 % |

La reducción es de tamaño, no una medición de velocidad en Internet. El archivo principal todavía supera 1 MB; una siguiente optimización puede separar los formularios y pantallas operativas, con pruebas de cada flujo. Fuentes, iconos y otros recursos externos siguen requiriendo conectividad.

**Dependencias de producción**

`npm audit --omit=dev` detectó inicialmente 11 paquetes afectados por alertas transitivas de `undici` y `@grpc/grpc-js`. Se fijaron versiones compatibles de esas dependencias (`6.28.1` y `1.13.6`) mediante overrides, conservando Firebase 10.14.1. La auditoría posterior reportó cero vulnerabilidades conocidas en dependencias de producción. Ese resultado no valida reglas, permisos o servicios externos, y no incluye herramientas de desarrollo.

**Validación completada**

- 14 pruebas automatizadas de la web: creación atómica de los cuatro documentos, competencia por el último cupo, reintentos, transacciones pendientes, disponibilidad por horario, almacenamiento del navegador denegado/disponible, fecha mínima de Panamá, restricciones de Navidad y organización del calendario.
- 11 pruebas automatizadas de la app: proyección pública, estado del cliente, confirmación, cambio de fecha/hora, cancelación, rechazo, lectura de configuración y carga/reintento del generador PDF.
- Chromium en anchuras de 390 y 1280 píxeles: acceso de la app con configuración normal y dañada; navegación de la web entre catálogo, paquete y formulario de reserva, con Firebase simulado.
- Chromium: renderizado de factura, cotización, contrato y acuerdo de proveedor, sin errores de JavaScript. Esto valida las plantillas; no equivale a descargar un PDF usando el CDN real o probar compartir en un teléfono.
- Navegación operativa de la app con Firebase simulado: Agenda, Clientes, Finanzas, Proveedores y Ajustes.
- Reserva web en Chromium con pantalla móvil y controles táctiles, Firebase simulado y cinco escenarios de almacenamiento: normal, lectura de sesión denegada, escritura de sesión denegada, lectura local denegada y acceso a la propiedad de almacenamiento local denegado. En todos se comprobó continuar desde el calendario y, por separado, paquete → contacto → fecha/hora → ubicación, sin enviar solicitudes ni escribir en Firebase real.
- Calendario propio sobre la salida compilada: nueve escenarios de Chromium, incluidos móvil/escritorio, selector nativo ausente o que lanza error, restricciones de almacenamiento y actualización tardía de disponibilidad con datos de contacto recordados. Todos avanzaron hasta Ubicación sin errores de JavaScript. Se verificó tocar el campo Fecha y el botón, cambiar mes, guardar el valor original del formulario, cancelar con Escape y bloquear fechas pasadas y exclusivas de Santa. La actualización tardía conservó el nombre recién editado.
- Compilación de ambos proyectos y repetición de la compilación web con resultados estables. Las páginas y recursos locales del directorio de publicación se comprobaron por HTTP.

Ejecutar `npm ci`, `npm test` y `npm run build` desde la raíz de cada repositorio. La web requiere recompilar si cambian clases, JavaScript o estilos. Para revisar localmente su salida: `python3 -m http.server 4174 --bind 127.0.0.1 --directory dist`. La app dispone de `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`.

**Incidencia documentada en video: el campo Fecha no abre el calendario**

Se revisó visualmente el video adjunto `VID_20261005_225301.mp4`, de aproximadamente 42 segundos. Muestra Android, una barra de navegador con pestañas y la web de Diverty en Netlify. La clienta llega al formulario del PLAN MAGIC y pasa de Contacto a Detalles. Entre aproximadamente los segundos 22 y 38 toca repetidamente el campo Fecha: se resaltan segmentos de día, mes y año, pero no aparece un calendario y el valor sigue vacío (`dd/mm/aaaa`). Tampoco selecciona una hora ni completa un envío.

Esto sitúa el problema visible en la interacción con el selector de fecha del navegador. El video no demuestra un rechazo de escritura de Firebase ni un bloqueo al abrir el formulario. La versión exacta del navegador, su modo móvil/escritorio y el motivo interno por el que no abre su selector siguen sin verificarse en el teléfono original.

La solución preparada añade un calendario propio y un botón visible para abrirlo. El campo original conserva su nombre, valor y validaciones; la selección emite los mismos eventos que un cambio manual. La fecha mínima se genera explícitamente en formato `YYYY-MM-DD` usando la zona de Panamá. No se permiten fechas pasadas ni el 24/25 de diciembre de 2026 para eventos normales. La fecha elegida también queda en el estado del formulario para conservarla durante un refresco.

Durante las pruebas se detectó además una actualización asíncrona capaz de reconstruir el formulario mientras se escribía. Ahora se recoge el formulario actual antes de reconstruirlo y los contactos recordados se usan como valores iniciales, respetando las ediciones posteriores.

Evidencia de la solución conservada en este entorno: `/workspace/.cloud-setup/calendar-picker-browser-check.cjs`, `calendar-picker-results-after.json` y la captura `client-video/calendar-fix.png`. Las pruebas unitarias están versionadas en cada repositorio. Las pruebas de navegador usan el sitio compilado con servicios simulados; falta repetir el flujo en el teléfono original después de publicar. La lectura directa del HTML público desde este entorno fue bloqueada por el proxy de red, por lo que no se verificó el código desplegado actualmente.

**Fallo adicional reproducido: almacenamiento restringido**

Se reprodujo un fallo concreto del código anterior: `setActiveSection('booking')` accedía directamente a `sessionStorage`, y `renderBooking()` leía `localStorage` fuera de un bloque de manejo de errores. Si el navegador rechazaba alguno de esos accesos con `SecurityError`, elegir la fecha funcionaba pero pulsar «Continuar con mi reserva» detenía la navegación antes de mostrar el formulario. El mismo acceso impedía abrir el formulario desde un paquete. El almacenamiento local se usa para recordar datos; no debe ser una condición para reservar.

Las lecturas y escrituras opcionales ahora manejan ese rechazo, incluido el acceso a la propiedad `window.localStorage`. Antes de la corrección, los cuatro escenarios restringidos fallaron; después, los cinco escenarios avanzaron hasta ubicación sin errores de JavaScript. La compilación actualiza las versiones de los recursos modificados para renovar su caché al desplegar.

Evidencia local de almacenamiento: `/workspace/.cloud-setup/date-browser-check.cjs`, `date-browser-results-before.json` y `date-browser-results-after.json`. Este fallo es independiente de lo observado en el video, porque la clienta sí abre el formulario. Las pruebas simulan restricciones en Chromium; no equivalen a probar WhatsApp real ni Safari/iPhone. La validación del sitio publicado se debe repetir una vez finalice el despliegue.

**Firebase real: evidencia y límites**

Ambos proyectos usan `diverty-eventos` y el mismo espacio de datos, `artifacts/diverty-oficial/public/data`.

| Consulta sin sesión | Resultado observado |
| --- | --- |
| `config_web/disponibilidad` | HTTP 200 |
| `disponibilidad_web`, muestra de un documento | HTTP 200 |
| `eventos`, listado limitado a un documento | HTTP 403, PERMISSION_DENIED |
| `reservas_cliente`, listado limitado a un documento | HTTP 403, PERMISSION_DENIED |
| `configuracion`, listado limitado a un documento | HTTP 403, PERMISSION_DENIED |
| `tokens`, listado limitado a un documento | HTTP 403, PERMISSION_DENIED |

Esto demuestra que esas consultas privadas se rechazan sin sesión. No demuestra que un cliente anónimo autenticado no pueda acceder a otro cliente, modificar precios, escribir estados administrativos o manipular cupos. Para verificarlo se necesitan las reglas publicadas y pruebas de autorización, preferentemente con el emulador de Firestore.

La configuración pública de Firebase Auth respondió HTTP 200. Sus dominios autorizados incluyen localhost y los dominios de la app en Vercel y Firebase; no incluyen `divertypanama.netlify.app`. Revisar ese dominio si se usan redirecciones de autenticación o flujos que validen origen. Su ausencia no demuestra que la autenticación anónima actual esté fallando.

No hay reglas, configuración de emuladores ni archivo de índices versionados en estos repositorios. La consulta a la API administrativa de reglas fue bloqueada por la red del entorno. No se encontró una credencial administrativa identificable del proyecto. No se publicaron reglas inferidas ni se modificaron permisos de producción.

**Lo siguiente para completar Firebase**

1. Obtener las reglas actualmente publicadas y la configuración de índices desde la consola o su repositorio. Verificar acceso administrativo y acceso por `ownerUid`, campos permitidos, estados, precios y consistencia entre los documentos de una reserva.
2. Probar en el emulador que un cliente no pueda leer o cambiar reservas ajenas, confirmar/rechazar eventos, modificar tokens administrativos ni exceder cupos mediante escrituras directas.
3. Revisar la concurrencia de recursos entre horarios distintos: los cupos por hora usan transacciones, pero la viabilidad de personal y rutas se calcula desde el cliente. Las reglas o un servicio de confianza deben hacer cumplir las restricciones que sean obligatorias.
4. Revisar el Worker de notificaciones y las restricciones del preset de Cloudinary. Sus implementaciones/configuraciones no están disponibles aquí; no se enviaron notificaciones ni imágenes durante las pruebas.
5. Revisar App Check y la persistencia de sesiones de clientes. El código no inicializa App Check, y el portal identifica las reservas por la identidad anónima del navegador y el teléfono; cambiar de navegador no equivale a recuperar automáticamente esa identidad.
6. Revisar sincronización de historial/proveedores y cambio de día: el bus compartido guarda la última señal, y la consulta operativa fija su fecha mínima al iniciar. Son puntos de robustez para varios dispositivos y sesiones largas; no se modificó su comportamiento en esta corrección.

Las reglas completas, índices, notificaciones, cargas de imágenes, datos reales y ejecución de Edge en Netlify siguen pendientes de validación. Subir el código a GitHub no confirma por sí solo que el despliegue haya terminado correctamente.
