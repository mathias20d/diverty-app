# Reservas desde clientes, cantidades y horas

En **Clientes → Reservar**, el formulario trae nombre, teléfono, correo y RUC disponibles. La nueva reserva empieza sin servicios, importes ni pagos anteriores. Un borrador de otro cliente no reemplaza esos contactos. La creación desde Inicio sigue recuperando el borrador habitual.

En **Productos y servicios**, busca un concepto existente o crea uno. Selecciona **Cobrar por**:

- **Unidad / producto**: escribe la cantidad directamente. Por ejemplo, 200 Hot dogs a $2 dan $400.
- **Hora de servicio**: escribe las horas y la tarifa por hora. Por ejemplo, 2 horas de Pintacaritas a $25 dan $50; 3 horas dan $75.
- **Paquete / servicio completo**: conserva la contratación y la duración del paquete.

El precio base y el total del concepto siguen siendo editables. Transporte se suma una sola vez; abonos, gastos y proveedores se conservan. Los conceptos guardan su modalidad, cantidad y tarifa para reabrirlos y mostrarlos en factura, cotización y contrato. Los importes históricos no se recalculan al abrir una reserva antigua.

El formulario se monta solo al abrirse y su estado se actualiza independientemente de Inicio o Clientes. La búsqueda del catálogo se prepara cuando se abre el selector. El panel usa un fondo opaco para evitar el desenfoque de pantalla completa.

## Comprobaciones

```sh
npm test
npm run build
```

La prueba de navegador necesita Vite en el puerto 5173, Playwright y Chromium. Con ambos repositorios instalados en este entorno:

```sh
# En una terminal, dentro de diverty-app:
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort

# En otra, dentro de diverty-app:
PLAYWRIGHT_MODULE=/workspace/Diverty-/node_modules/playwright \
CHROMIUM_PATH=/usr/bin/chromium \
node tests/browser/reservation-flow.cjs
```

También admite `ORIGIN` para otro servidor Vite y `BROWSER_ARTIFACT_DIR` para capturas. La prueba simula autenticación y Firestore y bloquea todas las solicitudes externas. Comprueba contactos, cantidades, guardado, reapertura, edición, borradores, Atrás, creación de conceptos y PDF. Usa 1.200 eventos ficticios y 302 conceptos, limita CPU y verifica que abrir el formulario no vuelve a renderizar App. Los tiempos son observaciones locales; no son una garantía de latencia en teléfonos o producción.
