# Tareas: pulir interacciones de interfaz

- [x] Inspeccionar la paleta, las animaciones, el selector genérico de botones y la anatomía de las filas de colección.
- [x] Definir el alcance mínimo y los criterios de aceptación antes de tocar el CSS.
- [x] Añadir hover de baja intensidad a la fila completa en dispositivos con puntero preciso.
- [x] Evitar el desplazamiento vertical genérico del botón de película en hover.
- [x] Versionar el CSS, la caché PWA y la expectativa de Playwright.
- [x] Añadir aserciones de estilos computados a la prueba de navegador.
- [x] Validar sintaxis, SDD, catálogo y flujos UI en GitHub Actions.
- [x] Registrar evidencia y actualizar la especificación principal de interfaz.
- [x] Revisar técnicamente, registrar los checks finales y archivar el expediente.

## Evidencia de verificación

- [SDD and static quality, run #36](https://github.com/ElFast-dev/Prisma/actions/runs/39477186262): sintaxis de `app.js` y `sw.js`, validador SDD y pruebas CSV sintéticas correctas.
- [Validate Prisma, run #143](https://github.com/ElFast-dev/Prisma/actions/runs/39477186146): sintaxis y catálogo JSON correctos.
- [Prisma UI screenshots, run #114](https://github.com/ElFast-dev/Prisma/actions/runs/39477186149): flujos de navegador y capturas de escritorio y viewport móvil correctos; se comprobó hover, retorno al estado base, ausencia de movimiento vertical y movimiento reducido.

La revisión técnica no detectó regresiones dentro del alcance acotado. El expediente se archiva por convergencia entre especificación, implementación y evidencia automatizada.

## Restricciones de prueba

Usar los datos sintéticos ya existentes en el workflow UI; no importar historial real ni requerir una credencial TMDB. La prueba debe comprobar estilos computados, no basarse solo en capturas o en la presencia de selectores.
