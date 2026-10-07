# diverty-app

Aplicación de administración de Diverty, construida con React, Vite y Firebase.

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
```

`ORIGIN` permite usar otro servidor local. Las pruebas simulan la autenticación y Firestore y bloquean las solicitudes externas; no modifican datos reales.

El recorrido del panel usa reservas pendientes y confirmadas con abonos parciales y comprueba sus tarjetas en Inicio y Agenda, además de los cobros en Finanzas. Así detecta errores de componentes compartidos que no aparecen cuando todas las reservas están completadas.

El recorrido de reservas comprueba contactos, cantidades, horas, guardado, edición, abonos, gastos, borradores y PDF. El recorrido de rendimiento usa 1.200 reservas con ganancia positiva hoy, limita la CPU a 4× y comprueba que las animaciones no actualicen toda la app, que los informes no se calculen fuera de Finanzas y que el cambio de día/mes siga funcionando. Los importes de `performance-finance.json` se capturaron antes de esta optimización para comprobar que mes, año e histórico mantienen los mismos resultados.

Finanzas y Ajustes se descargan cuando se necesitan. Las listas de Finanzas muestran grupos de 30 movimientos; “Mostrar más” permite acceder al resto. Los totales, gráficos, exportación y copia de cobros no se limitan al grupo visible. La prueba de rendimiento comprueba los siguientes grupos, sus pagos y los ajustes guardados.

Para comprobar los archivos de producción tras compilar, inicia `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort` y ejecuta:

```sh
PLAYWRIGHT_MODULE=/ruta/a/node_modules/playwright CHROMIUM_PATH=/usr/bin/chromium node tests/browser/bundle-flow.cjs
```

Esta prueba bloquea solicitudes externas y comprueba que el inicio de sesión no descarga el panel ni Firestore, y que los módulos separados cargan sin errores. El SDK de Firestore tiene su propio archivo para reutilizar la caché cuando cambia el panel.
