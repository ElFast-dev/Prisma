# Tareas: Clarificar la procedencia de puntuaciones

- [x] Inspeccionar ficha, normalización, persistencia y versiones PWA.
- [x] Definir escenarios SDD para origen, recuento de votos y enlaces.
- [x] Preservar vote_count desde TMDB por la normalización y persistencia.
- [x] Separar renderizado y corregir el enlace IMDb sin ID.
- [x] Añadir pruebas sintéticas de casos positivos, ausentes y sin procedencia confirmada.
- [x] Ejecutar node --check app.js y node --check sw.js; ambos pasan.
- [x] Ejecutar node scripts/validate-sdd.mjs; pasa.
- [x] Ejecutar node scripts/test-catalog-import.mjs; pasa.
- [x] Ejecutar node scripts/test-movie-rating-sources.mjs; pasa tras corregir una aserción.
- [x] Completar la regresión visual con Playwright en GitHub Actions; pasa.
- [x] Actualizar especificaciones, modelo de datos y esta evidencia; archivar el cambio.

## Evidencia CI

- [SDD y calidad estática](https://github.com/ElFast-dev/Prisma/actions/runs/39488143372)
- [Validar Prisma](https://github.com/ElFast-dev/Prisma/actions/runs/39488143306)
- [Pruebas visuales de interfaz](https://github.com/ElFast-dev/Prisma/actions/runs/39488143276)
