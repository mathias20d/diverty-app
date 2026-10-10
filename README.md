# diverty-app

Aplicación de administración de Diverty, construida con React, Vite y Firebase.

La misma web se adapta a computadora, tableta y teléfono, también cuando se instala desde el navegador. Desde 900 px el menú se convierte en una barra lateral y deja libre el área inferior; en ventanas menores conserva el menú táctil inferior. En PC hay barras de desplazamiento visibles, foco de teclado, calendario operable con Enter/Espacio y formularios de reservas más amplios. Agenda muestra dos columnas de reservas por día desde 1280 px. La instalación permite orientación vertical u horizontal.

`node tests/browser/responsive-flow.cjs` comprueba las siete secciones a 390, 768, 900, 1024, 1440 y 1920 px, ausencia de desbordamiento horizontal, navegación con teclado, calendario, desplazamiento real de Inicio por rueda hasta el final y desplazamiento del formulario de escritorio. Inicio usa columnas en PC: saludo con indicadores a un lado y operaciones con seguimiento a su lado. Las ventanas de 900–1023 px tienen un menú lateral compacto; Finanzas permite envolver sus controles sin desbordamiento. Las barras de desplazamiento están visibles con mouse, también en ventanas pequeñas. WIDTHS permite seleccionar anchos separados por coma. Usa las mismas variables `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH` y `ORIGIN` que las demás pruebas; `SCREENSHOT_DIR` permite guardar capturas. Firebase está simulado. La prueba del teclado móvil sigue siendo `keyboard-flow.cjs`; queda pendiente comprobar la instalación y los teclados reales en Android/iOS.

```sh
npm ci
npm test
npm run build
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Las pruebas de navegador necesitan Playwright y Chromium. Con el servidor de desarrollo activo, ejecuta:

```sh
PLAYWRIGHT_MODULE=/ruta/a/node_modules/playwright CHROMIUM_PATH=/usr/bin/chromium node tests/browser/reservation-flow.cjs
PLAYWRIGHT_MODULE=/ruta/a/node_modules/playwright CHROMIUM_PATH=/usr/bin/chromium node tests/browser/performance-flow.cjs
PLAYWRIGHT_MODULE=/ruta/a/node_modules/playwright CHROMIUM_PATH=/usr/bin/chromium node tests/browser/panel-flow.cjs
PLAYWRIGHT_MODULE=/ruta/a/node_modules/playwright CHROMIUM_PATH=/usr/bin/chromium node tests/browser/lists-flow.cjs
PLAYWRIGHT_MODULE=/ruta/a/node_modules/playwright CHROMIUM_PATH=/usr/bin/chromium node tests/browser/keyboard-flow.cjs
PLAYWRIGHT_MODULE=/ruta/a/node_modules/playwright CHROMIUM_PATH=/usr/bin/chromium node tests/browser/maps-flow.cjs
```

`ORIGIN` permite usar otro servidor local. Las pruebas simulan la autenticación y Firestore y bloquean las solicitudes externas; no modifican datos reales.

Los enlaces de Google Maps se interpretan usando primero las coordenadas del pin (`!3d…!4d…`), antes que el centro de la vista (`@…`). Los valores numéricos guardados conservan prioridad. `maps-flow.cjs` comprueba que Google Maps y Waze abren ese mismo punto desde las tarjetas. El lector de coordenadas se mantiene también en `Diverty-/assets/js/diverty-gps-point.mjs`.

El recorrido del panel usa reservas pendientes y confirmadas con abonos parciales y comprueba sus tarjetas en Inicio y Agenda, además de los cobros en Finanzas. Así detecta errores de componentes compartidos que no aparecen cuando todas las reservas están completadas.

Agenda y el selector de productos y servicios muestran grupos de 30 resultados con “Mostrar más”. La búsqueda abarca todos los registros y el calendario conserva los conteos completos. `lists-flow.cjs` comprueba 1.200 reservas y 302 conceptos: carga del siguiente grupo, edición, búsqueda de registros posteriores, calendario y selección de servicios. `EVENT_COUNT=300 MEASURE_ONLY=1` ejecuta solo la medición de Agenda con CPU reducida a 4×; los tiempos son de una prueba local con datos simulados.

El formulario de reservas y cotizaciones se adapta al área visible mediante `VisualViewport`, desplaza el campo activo dentro del formulario y ofrece “Listo” para ocultar el teclado. Mientras escribes, el encabezado se reduce y Guardar queda al final del formulario para dejar más espacio. `keyboard-flow.cjs` simula la reducción y el desplazamiento del área visible sin cambiar el tamaño de la página, además del caso sin `VisualViewport`; comprueba campos, cantidades, descripción, guardado y escritorio. Esta simulación no abre un teclado físico de Android o iOS.

El recorrido de reservas comprueba contactos, cantidades, horas, guardado, edición, abonos, gastos, borradores y PDF. El recorrido de rendimiento usa 1.200 reservas con ganancia positiva hoy, limita la CPU a 4× y comprueba que las animaciones no actualicen toda la app, que los informes no se calculen fuera de Finanzas y que el cambio de día/mes siga funcionando. Los importes de `performance-finance.json` se capturaron antes de esta optimización para comprobar que mes, año e histórico mantienen los mismos resultados.

Finanzas y Ajustes se descargan cuando se necesitan. Las listas de Finanzas muestran grupos de 30 movimientos; “Mostrar más” permite acceder al resto. Los totales, gráficos, exportación y copia de cobros no se limitan al grupo visible. La prueba de rendimiento comprueba los siguientes grupos, sus pagos y los ajustes guardados.

Para comprobar los archivos de producción tras compilar, inicia `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort` y ejecuta:

```sh
PLAYWRIGHT_MODULE=/ruta/a/node_modules/playwright CHROMIUM_PATH=/usr/bin/chromium node tests/browser/bundle-flow.cjs
```

Esta prueba bloquea solicitudes externas y comprueba que el inicio de sesión no descarga el panel ni Firestore, y que los módulos separados cargan sin errores. El SDK de Firestore tiene su propio archivo para reutilizar la caché cuando cambia el panel.

En **Web → Servicios y personajes → Nuevo servicio / personaje**, elige **Por cantidad** para configurar el precio unitario, el mínimo, el máximo opcional y cuánto aumenta cada botón. El cliente puede escribir la cantidad directamente. Para ofrecer personajes, elige **Personaje** y completa nombre, foto, precio y temática opcional. La primera ficha crea el catálogo Personajes si hace falta; **Guardar y agregar otro personaje** mantiene la categoría y la temática para agilizar la carga.

Con el servidor de desarrollo activo, `node tests/browser/web-catalog-flow.cjs` comprueba creación, edición, límites inválidos, personajes y sincronización con Firestore simulado. `CATALOG_FIXTURE_PATH=/tmp/diverty-created-catalog.json` exporta los registros creados para probarlos en el recorrido público de `Diverty-`, sin escribir datos de prueba en producción.
