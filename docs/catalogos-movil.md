# Catálogos legibles en móvil

La lista de Página Web → Catálogos separa en móvil el nombre/estado de los controles. El nombre completo puede ocupar varias líneas, incluso si contiene una palabra sin espacios; no se usa truncamiento ni límite de líneas. Cada control tiene un área de 44 × 44 px y un nombre accesible que identifica el catálogo. En pantallas desde 640 px se conserva la distribución horizontal, con títulos que también pueden envolver.

Se mantienen crear, editar, eliminar, subir/bajar y copiar el enlace directo con sus funciones actuales. No se cambian campos, credenciales, permisos ni reglas de Firebase. Crear una categoría sigue publicando de forma atómica la categoría y el aviso `web_sync` de `categorias_web`; la web pública ahora muestra categorías visibles incluso antes de añadirles servicios.

`tests/browser/category-mobile-flow.cjs` comprueba nombres extensos, nombres sin espacios, estado oculto, ausencia de desbordamiento, controles táctiles y edición/orden/creación/sincronización en 320, 360, 392, 430, 768 y 1366 px. Usa Firebase simulado y bloquea peticiones externas. Admite `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, `ORIGIN` y `BROWSER_ARTIFACT_DIR`. La compilación y las 81 pruebas de la app pasaron.

Los archivos de operación de reservas que ya estaban sin seguimiento se conservaron fuera de este cambio. La modificación se limita a la presentación de Catálogos.
