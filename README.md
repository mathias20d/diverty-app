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
```

`ORIGIN` permite usar otro servidor local. Las pruebas simulan la autenticación y Firestore y bloquean las solicitudes externas; no modifican datos reales.

El recorrido de reservas comprueba contactos, cantidades, horas, guardado, edición, abonos, gastos, borradores y PDF. El recorrido de rendimiento usa 1.200 reservas con ganancia positiva hoy, limita la CPU a 4× y comprueba que las animaciones no actualicen toda la app, que los informes no se calculen fuera de Finanzas y que el cambio de día/mes siga funcionando. Los importes de `performance-finance.json` se capturaron antes de esta optimización para comprobar que mes, año e histórico mantienen los mismos resultados.
