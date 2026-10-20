# Tareas: preservar identidad TMDB en CSV

- [x] Inspeccionar la normalización CSV, la deduplicación de filas y la combinación de catálogo existentes.
- [x] Definir los requisitos delta antes de implementar.
- [ ] Reconocer de forma separada encabezados TMDB y genéricos.
- [ ] Deduplicar filas CSV por ID TMDB cuando esté presente.
- [ ] Cambiar el mapa de importación para combinar por identidad estable.
- [ ] Añadir al workflow de navegador un fixture sintético de dos remakes con IDs distintos.
- [ ] Verificar sintaxis, validador SDD, catálogo JSON y workflow Playwright.
- [ ] Actualizar `openspec/specs/catalog/spec.md` tras la convergencia.
- [ ] Registrar evidencia final y cerrar/archivar este expediente.

## Casos de prueba

- Mismo título + IDs TMDB 990001 y 990002: conservar ambos.
- Reimportar ID TMDB 990001: una sola entrada para ese ID.
- Columna genérica `movieId`: no crear `tmdbId`.
- Fila sin valor TMDB válido: no inventar un ID.
