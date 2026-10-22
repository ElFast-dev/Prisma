# Tareas: fechas de visionado en Panamá

- [x] DP1. Introducir utilidades compartidas para día local `America/Panama` y formato MM/DD/YYYY.
- [x] DP2. Actualizar la importación Android v2 para reconocer la fecha inicial del reto y clasificar los registros previos.
- [x] DP3. Usar día local en el evaluador temporal y evitar que el proxy use fechas retrospectivas.
- [x] DP4. Adaptar las vistas de historial/detalle para no mostrar una fecha retrospectiva como fecha de visionado.
- [x] DP5. Actualizar diagnóstico agregado a v10, documentación y versionado del shell PWA.
- [x] DP6. Añadir regresiones sintéticas de zona horaria, importación, racha, reimportación y privacidad.
- [x] DP9. Verificar con pruebas la precedencia del timestamp fiable frente a una fecha local obsoleta y los días consecutivos cerca de medianoche UTC.
- [x] DP10. Impedir que `rA`, `updatedAt` o `addedAt` se muestren como fecha de visionado; cubrir las fechas reales del 18 al 21 de octubre y el caso sin `watchedAt` explícito.
- [ ] DP7. Ejecutar calidad/SDD/Playwright, fusionar la implementación y verificar el despliegue.
- [ ] DP8. Archivar el cambio SDD con evidencia de la integración y los resultados CI.


## Evidencia de validación previa a la integración

- SDD/calidad y pruebas de regresión: [run 39736710445](https://github.com/ElFast-dev/Prisma/actions/runs/39736710445), commit de código `1c09e75101b27f572a355accce949b0bb4be3c23`.
- Playwright de escritorio y móvil: [run 39736710348](https://github.com/ElFast-dev/Prisma/actions/runs/39736710348), mismo commit.
- Regresión de fechas fiables y reconciliación local: [SDD/calidad run 39744437708](https://github.com/ElFast-dev/Prisma/actions/runs/39744437708) — correcto.
- Integración y despliegue siguen pendientes en [PR #70](https://github.com/ElFast-dev/Prisma/pull/70); por eso DP7 y DP8 no se marcan como completadas.
