# Tareas: pulir interacciones de interfaz

- [x] Inspeccionar la paleta, las animaciones, el selector genérico de botones y la anatomía de las filas de colección.
- [x] Definir el alcance mínimo y los criterios de aceptación antes de tocar el CSS.
- [x] Añadir hover de baja intensidad a la fila completa en dispositivos con puntero preciso.
- [x] Evitar el desplazamiento vertical genérico del botón de película en hover.
- [x] Versionar el CSS, la caché PWA y la expectativa de Playwright.
- [x] Añadir aserciones de estilos computados a la prueba de navegador.
- [x] Validar sintaxis, SDD, catálogo y flujos UI en GitHub Actions.
- [x] Registrar evidencia y actualizar la especificación principal de interfaz.
- [ ] Cerrar/archivar este expediente después de revisar y aceptar la PR.

## Evidencia de verificación

- GitHub Actions `SDD and static quality`, run #34: sintaxis de `app.js` y `sw.js`, validador SDD y tests sintéticos CSV, todos correctos.
- GitHub Actions `Validate Prisma`, run #141: sintaxis JavaScript y JSON de catálogo, correctos.
- GitHub Actions `Prisma UI screenshots`, run #112: flujo de navegador y captura de pantallas en escritorio y móvil, correctos; se comprobó hover, retorno al estado base, ausencia de movimiento vertical y movimiento reducido.

La ejecución incluye los cambios funcionales y la especificación principal de interfaz. Se archivará el expediente cuando la PR sea revisada y aceptada.

## Restricciones de prueba

Usar los datos sintéticos ya existentes en el workflow UI; no importar historial real ni requerir una credencial TMDB. La prueba debe comprobar estilos computados, no basarse solo en capturas o en la presencia de selectores.
