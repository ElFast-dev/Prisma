# Diseño: microinteracción de filas de colección

## Estado actual observado

- La hoja de estilos usa una paleta oscura azul y múltiples transiciones limitadas por `prefers-reduced-motion`.
- Las filas de colección se representan con `.collection-row`, el área principal clicable `.collection-row-main` y una región lateral `.collection-row-side`.
- Existe un foco visible en `.collection-row-main:focus-visible`.
- Un selector global `button:hover` puede aplicar transformación vertical y color al área principal, pero el contenedor de fila no recibe un estado hover unitario.

## Solución

Añadir al final de `styles.css` reglas acotadas a las filas de colección. En dispositivos con hover y puntero preciso, la fila completa obtiene un fondo azul de baja intensidad. El botón principal cancela su desplazamiento genérico para que la geometría de la fila no cambie. En interacción táctil se conserva la señal activa existente sin depender de hover.

No se cambia HTML ni JavaScript, se evita ampliar la animación de entrada y se mantiene la política de movimiento reducido que ya cubre todas las transiciones.

## Versionado y PWA

- Incrementar el identificador de recurso CSS de `ui-20261020-12` a `ui-20261020-13` en `index.html` y `sw.js`.
- Incrementar la versión de caché del shell de `prisma-shell-v16` a `prisma-shell-v17`.
- Actualizar la aserción de versión del CSS en el workflow Playwright.

## Verificación

El workflow UI ya recorre la colección en los tamaños móvil y escritorio. Se añade una aserción Playwright de estilos computados para verificar que el fondo hover de la fila es distinto del fondo normal y que el botón principal no tiene transformación en hover. Los tests de movimiento reducido se aplican a las reglas CSS y se validan mediante comprobación computada cuando el contexto del navegador permite simularlo.
