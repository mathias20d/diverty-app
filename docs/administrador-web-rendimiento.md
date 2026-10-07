# Paso 3: administrador web con menos recargas

El administrador conserva catálogos, productos por cantidad, personajes, campañas,
temas y vista previa, galería, cupones, banner, enlaces directos y ordenamiento.

## Cambios

- Los filtros y la búsqueda trabajan con los datos de la sesión. Cambiar el filtro
  ya no reinicia la carga por una dependencia del callback de React.
- Cada guardado actualiza únicamente las colecciones que modifica. Crear la
  categoría Personajes y su primer personaje refresca ambas colecciones.
- El botón de actualización refresca la sección abierta; desde el inicio refresca
  todas. Cada sección aparece cuando termina su lectura.
- Una caché en memoria, separada por instancia de Firebase, proyecto y usuario,
  permite volver al administrador sin descargar otra vez contenido sin cambios.
  No se escriben estos datos en localStorage ni se añaden dependencias.
- Una suscripción al documento pequeño `config_web/web_sync` detecta cambios de
  otros dispositivos. Se recargan las colecciones indicadas en `versions`. Si un
  administrador antiguo incrementa solo `version`, se actualiza todo.
- La escritura de contenido y de la versión pública sigue siendo un único batch
  de Firebase. Escrituras y avisos se procesan en orden; la confirmación de una
  escritura propia no provoca otra recarga idéntica. Salir de la pantalla no
  cancela un guardado que ya se solicitó.
- Los formularios abiertos conservan sus borradores durante la sincronización,
  incluido el banner. Si la conexión falla, se conservan los datos disponibles y
  se muestra una opción para reintentar. Datos devueltos por la caché offline de
  Firebase no se consideran verificados para futuras aperturas.

## Comprobación

En Chromium, con Firebase simulado y registros de llamadas de lectura:

| Recorrido | Antes | Después |
| --- | ---: | ---: |
| Cambiar filtro de categoría | 8 consultas | 0 |
| Guardar/editar un servicio | 8 consultas | 1 (catálogo) |
| Guardar ajustes del banner | 8 consultas | 2 (configuración) |
| Volver al administrador en la misma sesión sin cambios | 8 consultas | 0 consultas de contenido |

La primera visita sigue cargando seis colecciones y dos documentos para mantener
completos todos los contadores. La suscripción al documento de versión permite
comprobar la vigencia de la caché y recibir cambios sin suscribirse a cada colección.
Las cifras de la tabla cuentan consultas de contenido, no documentos individuales
ni lecturas facturadas por Firebase. No equivalen a una nueva medición de PageSpeed
ni a tiempos medidos en el teléfono del usuario.

El flujo `tests/browser/web-admin-performance.cjs` comprueba filtros, búsqueda,
rerender del padre, guardado, cambios remotos, borradores, errores y recuperación,
compatibilidad con versiones globales, caché entre aperturas y separación de cuentas.
Los flujos de catálogo y temas verifican las funciones incorporadas en los pasos 1
y 2. El flujo de bundle verifica los módulos compilados de producción.

Ejecutar con el servidor Vite disponible:

```sh
npm test
npm run build
node tests/browser/web-admin-performance.cjs
node tests/browser/web-catalog-flow.cjs
node tests/browser/web-theme-flow.cjs
```

Los flujos admiten `ORIGIN`, `PLAYWRIGHT_MODULE` y la ruta de Chromium indicada por
cada prueba. La vista previa de temas usa la compilación pública local del otro
repositorio. El cliente de desarrollo de Vite se simula únicamente en estas pruebas
para impedir recargas HMR que destruirían el Firebase simulado; los estilos se
aplican normalmente. Las pruebas no modifican reservas ni catálogos reales.
