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
- [ ] Cerrar y archivar este expediente tras la revisión/aceptación de la PR.

## Casos de prueba

- Mismo título + IDs TMDB 990001 y 990002: conservar ambos.
- Reimportar ID TMDB 990001: una sola entrada para ese ID.
- Columna genérica `movieId`: no crear `tmdbId`.
- Fila sin valor TMDB válido: no inventar un ID.


## Evidencia local previa a CI

La lógica pura extraída de `parseCatalogCSV` pasó cuatro casos sintéticos durante la revisión: dos remakes con IDs TMDB distintos, un ID genérico de MovieLens, rechazo de notación científica como ID TMDB y deduplicación por título cuando no existe ID TMDB. Además, GitHub Actions pasó `SDD and static quality` (run #15), `Validate Prisma` (run #122) y `Prisma UI screenshots` (run #95). La prueba de navegador verificó la persistencia de dos IDs TMDB distintos, su visualización por separado en el catálogo combinado, los IDs genéricos y la reimportación sin duplicados. El expediente queda pendiente de revisión y merge antes de archivar.
