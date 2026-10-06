# Auditoría de las reglas recibidas de Firestore

Fecha: 6 de octubre de 2026, Panamá. Esta revisión completa la comprobación de permisos que quedó pendiente en el diagnóstico anterior. Se recibió el texto de las reglas del propietario y se probó su lógica en el emulador; no se confirmó administrativamente su versión publicada ni se hicieron escrituras en Firebase de producción.

## Resultado

Se preparó una propuesta compatible con el esquema actual de reservas y se aprobaron **32 pruebas del emulador**: 14 con las reglas recibidas y 18 con la propuesta. Se usó el proyecto ficticio `demo-diverty` en `127.0.0.1:8089`, Firebase SDK 10.14.1, Firestore Emulator 1.22.0 y Java 21.

La web aprobó además **28 pruebas unitarias** y su compilación. El flujo conectado web → CRM siguió aprobando con datos en memoria. La app mantiene sus 24 pruebas unitarias previamente aprobadas; su código operativo no se cambió en esta revisión.

Los archivos se guardan en el repositorio de la web:

- [Reglas propuestas y probadas](https://github.com/mathias20d/Diverty-/blob/main/firebase/firestore.proposed.rules).
- [Reglas recibidas, con comentarios/espacios compactados](https://github.com/mathias20d/Diverty-/blob/main/firebase/test/received.rules).
- [Pruebas reproducibles](https://github.com/mathias20d/Diverty-/blob/main/firebase/test/rules.test.mjs).
- [Instrucciones y condiciones de publicación](https://github.com/mathias20d/Diverty-/blob/main/firebase/README.md).

## Fallos reproducidos

| Caso probado | Reglas recibidas | Propuesta |
| --- | --- | --- |
| Crear un candado sin ninguna reserva | Permitido | Denegado |
| Crear una reserva sin actualizar el cupo | Permitido | Denegado |
| Crear una reserva sin seguimiento del cliente | Permitido | Denegado |
| Elegir capacidad 100 cuando la configuración es 2 | Permitido | Denegado |
| Sustituir el ID de otra reserva en un candado | Permitido | Denegado |
| Publicar metadatos normales para una reserva privada de Santa | Permitido | Denegado |
| Repetir el mismo ID para ocupar dos cupos | Permitido | Denegado |
| Repetir sin cambios una reserva guardada y su cupo | Denegado | Permitido, sin incrementar cupos |

Las reglas originales de lectura del cliente se probaron y respetan la propiedad: cada cliente puede consultar su seguimiento usando `ownerUid`, no el seguimiento ajeno ni el listado completo. La colección privada `eventos` continúa reservada al administrador. No se abrió su lectura a los visitantes.

### Corrección de la web

Antes, tras un timeout o respuesta perdida, la web intentaba comprobar el guardado leyendo `eventos/{id}`. Las reglas lo prohíben a un cliente. Esto podía mostrar un fallo aunque los cuatro documentos se hubieran guardado y dejar un reintento que posteriormente se rechazaba por no aumentar el contador.

Ahora la verificación utiliza `reservas_cliente/{id}`, comprueba el propietario y rechaza escrituras locales todavía pendientes. Si la confirmación y la primera lectura se pierden, el siguiente intento busca ese recibo antes de validar o cambiar el formulario. Cuando ya existe, conserva la reserva original, informa su fecha y hora y evita otra transacción. Si el guardado falló sin llegar a Firebase, conserva el mismo ID y permite corregir el formulario y volver a enviarlo.

La comprobación de respuesta perdida se probó con el manejador real de la web y las reglas originales y propuestas en el emulador. Las lecturas ajenas, cambios de propietario, cambios de importe/estado sobre reservas existentes, escrituras de configuración y de tokens desde un cliente fueron denegadas como se esperaba.

### Capacidad

La propuesta vincula el candado a una nueva reserva del usuario, exige que el horario y el tipo coincidan y obtiene la capacidad desde `config_web/global`. La transacción debe crear los cuatro documentos relacionados. Los IDs son únicos y se conservan las otras reservas.

La prueba concurrente utilizó el SDK real y el manejador web: tres visitantes solicitaron el mismo horario, la configuración permitía dos y se guardaron exactamente dos reservas. También se comprobó la reparación de un único ID público huérfano mediante una lectura verificada; migraciones mayores quedan reservadas al administrador.

La lectura pública real, limitada a datos de disponibilidad y a estadísticas agregadas, encontró capacidad normal 2 y capacidad de Santa 1. Había 174 documentos públicos, siete reservas futuras en siete grupos de horario y todos esos grupos tenían candado. Se encontró un candado con al menos un ID huérfano. No se listaron nombres, teléfonos, coordenadas ni IDs en el informe. No se repararon datos de producción desde estas pruebas.

## Lo que sigue pendiente

1. **Publicar las reglas en Firebase.** Los archivos de GitHub y el despliegue de la web no publican reglas. Este entorno aún carece de acceso administrativo a Firebase. El propietario puede abrir Firestore Database → Reglas, conservar una copia actual, pegar la propuesta revisada y publicarla siguiendo las instrucciones del repositorio.
2. **Precios confiables.** Estas reglas validan que los importes tengan formato numérico, pero no recomputan el total, descuentos y transporte a partir del catálogo. La propuesta no presenta ese problema como resuelto: la reserva sigue en estado Pendiente y debe revisarse antes de aceptarla. Se necesita validación en un servicio de servidor.
3. **Personal para eventos solapados con distintas horas de inicio.** Cada horario tiene su propio candado. Ni las reglas recibidas ni la propuesta reservan animadores/payasos de forma atómica entre esos horarios o al aceptar desde el CRM. La validación de intervalos debe hacerse en un servidor y serializar las reservas por día/recurso.
4. **Datos antiguos.** Crear un candado nuevo desde la web solo puede iniciar con una reserva. Los horarios con varias reservas anteriores sin candado, los contadores sin IDs y más de un ID huérfano necesitan reconstrucción administrativa. Antes de publicar hay que volver a comprobar los datos, porque pueden cambiar.
5. **Alojamiento y teléfono original.** Los nuevos commits y las pruebas no prueban por sí solos que Vercel/Netlify haya publicado la versión ni que el teléfono del video esté resuelto. El fallo visible del selector de fecha del video sigue siendo independiente de esta verificación de Firebase.

Para repetir: ejecutar `npm ci --prefix firebase --ignore-scripts` y `npm --prefix firebase test` desde `Diverty-`. Se requiere Java 21 y acceso a los destinos de descarga. Las rutas de caché del entorno están documentadas en `firebase/README.md`; el dominio del emulador y los pasos de instalación se añadieron a la configuración reutilizable.
