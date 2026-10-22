# Tareas: fechas de visionado en Panamá

- [x] DP1. Introducir utilidades compartidas para día local `America/Panama` y formato MM/DD/YYYY.
- [x] DP2. Actualizar la importación Android v2 para reconocer la fecha inicial del reto y clasificar los registros previos.
- [x] DP3. Usar día local en el evaluador temporal y evitar que el proxy use fechas retrospectivas.
- [x] DP4. Adaptar las vistas de historial/detalle para no mostrar una fecha retrospectiva como fecha de visionado.
- [x] DP5. Actualizar diagnóstico agregado a v10, documentación y versionado del shell PWA.
- [x] DP6. Añadir regresiones sintéticas de zona horaria, importación, racha, reimportación y privacidad.
- [x] DP9. Verificar con pruebas la precedencia del timestamp fiable frente a una fecha local obsoleta y los días consecutivos cerca de medianoche UTC.
- [x] DP10. Impedir que `rA`, `updatedAt` o `addedAt` se muestren como fecha de visionado; cubrir las fechas reales del 18 al 21 de octubre y el caso sin `watchedAt` explícito.
- [x] DP11. Invalidar la URL de caché de `actions.js`, alinear `app.js`/`sw.js`/entrada PWA y añadir una aserción para impedir que la versión obsoleta vuelva a desplegarse.
- [x] DP12. Ajustar el fixture visual genérico para proporcionar `watchedAt` explícito al validar una fecha de historial; `a` y `rA` continúan sin ser fuentes de fecha de visionado.
- [x] DP7. Ejecutar calidad/SDD/Playwright, fusionar la implementación y verificar el despliegue.
- [x] DP8. Archivar el cambio SDD con evidencia de la integración y los resultados CI.


## Evidencia de validación previa a la integración

- SDD/calidad y pruebas de regresión: [run 39736710445](https://github.com/ElFast-dev/Prisma/actions/runs/39736710445), commit de código `1c09e75101b27f572a355accce949b0bb4be3c23`.
- Playwright de escritorio y móvil: [run 39736710348](https://github.com/ElFast-dev/Prisma/actions/runs/39736710348), mismo commit.
- Regresión de fechas fiables y reconciliación local: [SDD/calidad run 39744437708](https://github.com/ElFast-dev/Prisma/actions/runs/39744437708) — correcto.
- La integración y el despliegue se verificaron después de la fusión de PR #70; véase la evidencia de cierre al final de este expediente.

## Evidencia de integración, regresión y despliegue

- PR #70 sobre las fechas de Panamá está fusionado en `24dce9a5d345581e6bfd7d168c98e94f70f1fbf3`; las mejoras posteriores se validaron en un SHA integrado más reciente.
- Calidad/SDD satisfactoria sobre `d434226476db32d19a5d0f6fdb82ab35632aad7e`: [run 39839611430](https://github.com/ElFast-dev/Prisma/actions/runs/39839611430).
- Playwright de escritorio y móvil sobre el mismo SHA: [run 39839651891](https://github.com/ElFast-dev/Prisma/actions/runs/39839651891).
- GitHub Pages publicó exactamente ese SHA integrado: [run 39839898057](https://github.com/ElFast-dev/Prisma/actions/runs/39839898057).
- La suite de calidad incluye pruebas de importación, zona horaria `America/Panama`, racha diaria, fechas explícitas y perfil vacío.
