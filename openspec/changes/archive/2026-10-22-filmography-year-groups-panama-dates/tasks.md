# Tareas: filmografía por año y fechas de calendario

- [x] Revisar fichas, utilidades de fecha, pruebas existentes y caché PWA.
- [x] Añadir el módulo puro de agrupación de filmografía y selección por identidad TMDB.
- [x] Renderizar «En producción» y los años descendentes en la ficha de persona.
- [x] Preservar las fechas ISO sin hora y convertir timestamps al día de Panamá.
- [x] Añadir pruebas sintéticas para años, duplicados, filtro por identidad y límites de fecha.
- [x] Actualizar SDD vigente, arquitectura, workflow de sintaxis y versionado PWA.
- [x] Confirmar los checks de CI y la revisión visual escritorio/móvil antes de integrar.
- [x] Archivar el cambio solo cuando exista evidencia satisfactoria de integración.

## Evidencia de integración, regresión y despliegue

- PRs de integración verificados como fusionados: #70 (fechas de Panamá), #72 (filmografía y calendario), #73 (metadatos ricos), #74 (enriquecimiento del historial) y #75 (compuerta de Pages).
- Calidad/SDD satisfactoria sobre el SHA integrado `d434226476db32d19a5d0f6fdb82ab35632aad7e`: [run 39839611430](https://github.com/ElFast-dev/Prisma/actions/runs/39839611430).
- Playwright escritorio/móvil satisfactorio sobre el mismo SHA: [run 39839651891](https://github.com/ElFast-dev/Prisma/actions/runs/39839651891).
- GitHub Pages desplegó exactamente `d434226476db32d19a5d0f6fdb82ab35632aad7e`: [run 39839898057](https://github.com/ElFast-dev/Prisma/actions/runs/39839898057).
- La suite de regresión incluye importación, calendario local de Panamá, racha diaria, metadatos TMDB, modularidad y versionado PWA.
