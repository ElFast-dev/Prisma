# Tareas: preservar identidad TMDB en CSV

- [x] Inspeccionar la normalización CSV, la deduplicación de filas y la combinación de catálogo existentes.
- [x] Definir los requisitos delta antes de implementar.
- [x] Reconocer de forma separada encabezados TMDB y genéricos.
- [x] Deduplicar filas CSV por ID TMDB cuando esté presente.
- [x] Cambiar el mapa de importación para combinar por identidad estable.
- [x] Añadir al workflow de navegador un fixture sintético de dos remakes con IDs distintos.
- [x] Verificar sintaxis, validador SDD, catálogo JSON y workflow Playwright.
- [x] Actualizar `openspec/specs/catalog/spec.md` tras la convergencia.
- [x] Registrar evidencia final de verificación automatizada.
- [x] Completar la revisión técnica, confirmar los checks finales y archivar el expediente.

## Casos de prueba

- Mismo título + IDs TMDB 990001 y 990002: conservar ambos.
- Reimportar ID TMDB 990001: una sola entrada para ese ID.
- Columna genérica `movieId`: no crear `tmdbId`.
- Fila sin valor TMDB válido: no inventar un ID.


## Evidencia de verificación

La lógica pura extraída de `parseCatalogCSV` pasó cuatro casos sintéticos durante la revisión: dos remakes con IDs TMDB distintos, un ID genérico de MovieLens, rechazo de notación científica como ID TMDB y deduplicación por título cuando no existe ID TMDB. Verificación final: [SDD and static quality, run #36](https://github.com/ElFast-dev/Prisma/actions/runs/39477186262), [Validate Prisma, run #143](https://github.com/ElFast-dev/Prisma/actions/runs/39477186146) y [Prisma UI screenshots, run #114](https://github.com/ElFast-dev/Prisma/actions/runs/39477186149), los tres con resultado correcto. La prueba de navegador verificó la persistencia de dos IDs TMDB distintos, su visualización por separado en el catálogo combinado, los IDs genéricos y la reimportación sin duplicados. El expediente queda pendiente de revisión y merge antes de archivar.
