# Diseño: separar estilos preservando la cascada

## Estrategia

Dividir el archivo original solo en límites de líneas ya separadas por reglas completas y comentarios de sección. Los bloques se publican en el mismo orden que tenían en el archivo original. No se reescriben reglas ni se combinan selectores, para que el cambio sea puramente estructural.

## Módulos

- `styles.css`: tokens, base y estructura general.
- `styles/movie-cards.css`: tarjetas y composición de películas.
- `styles/dialogs-feedback.css`: diálogos, hojas modales y avisos.
- `styles/responsive.css`: reglas responsive iniciales y movimiento reducido.
- `styles/visual-refinements.css`: refinamientos visuales posteriores.
- `styles/collection.css`: experiencia de colección.
- `styles/accessibility.css`: interacción accesible y estados de foco.
- `styles/catalog.css`: tarjetas poster-first de Descubrir.
- `styles/collection-content.css`: jerarquía y diseño del contenido de colección.
- `styles/movie-details.css`: ajustes de ficha y puntuaciones externas.

## Versionado

Todas las URLs de hojas de estilo usarán la versión compartida `ui-20261020-18`. El service worker incluirá todas esas URLs y aumentará su caché de shell a `prisma-shell-v28`. La prueba automatizada comparará HTML, inventario PWA y versión utilizada por Playwright.

## Riesgos

El riesgo es cambiar accidentalmente la cascada al mover reglas entre archivos. La mitigación es preservar el orden original de los bloques, cargar las hojas en el mismo orden y comparar las capturas desktop/móvil antes de integrar.
