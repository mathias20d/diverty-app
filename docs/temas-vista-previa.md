# Temas y vista previa

En la app administrativa: **Web → Temas → Editar** o **Nuevo tema**.

- Los seis colores, el estilo de botón, la decoración y las animaciones se muestran en la vista previa de la web real.
- **Móvil** usa un ancho de 390 px y **Escritorio** de 1080 px. El panel escala la vista para que quepa en el teléfono.
- Cambiar Botón selecciona Color sólido; se puede volver a Degradado. Vaciar el degradado usa Botón y Secundario.
- Automática conserva el efecto de temporada. Ninguna elimina los adornos; también se pueden elegir nieve, confeti, murciélagos, burbujas u hojas.
- Apagar Animaciones detiene animaciones y transiciones.
- La vista previa no guarda el borrador, no crea reservas ni carga analítica. Permite desplazarse; sus botones y formularios están desactivados.
- **Guardar tema** conserva las fechas, el estado activo y el predeterminado. Si se edita el tema activo, guardar publica sus cambios. Para otro tema, **Activar manual** lo muestra en la web; el modo automático sigue usando las fechas.

Compatibilidad: los temas existentes siguen funcionando sin migrar la base de datos. Navidad conserva azul y plateado al abrir un tema antiguo; después de guardar, respeta los colores elegidos. Los campos actuales prevalecen sobre alias históricos al guardar la versión 2.

`theme-preview.html` se genera durante la compilación a partir de `index.html`: comparte plantillas, estilos, catálogo e imágenes publicados. No contiene una segunda copia mantenida manualmente y tiene `noindex,nofollow`.

## Validación

En el proyecto de la web (`Diverty-`):

```sh
npm test
npm run build
node tests/browser/web-stability.cjs
```

El navegador usa Firebase simulado. Incluye cinco temporadas con colores personalizados, decoraciones y movimiento desactivado, recarga, conservación del formulario, carrito, reservas normales/Navidad, cantidades y personajes.

En la app también se comprueban edición, guardado y vista previa sin escrituras:

```sh
npm test
npm run build
# Con Vite en 5173 y Diverty-/dist compilado:
node tests/browser/web-theme-flow.cjs
node tests/browser/web-catalog-flow.cjs
# Con vite preview en 4173:
node tests/browser/bundle-flow.cjs
```

`VITE_THEME_PREVIEW_ORIGIN` permite apuntar la vista previa a otro despliegue público; por defecto usa https://divertypanama.netlify.app. La app comprueba el origen y la ventana del iframe al recibir mensajes. El borrador viaja con postMessage, sin datos en la URL.
