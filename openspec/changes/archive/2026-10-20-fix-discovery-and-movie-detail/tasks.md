# Tareas: Descubrir y ficha de película

- [x] Inspeccionar el flujo de catálogo/recomendaciones y el modelo de identidad de Prisma.
- [x] Definir requisitos y escenarios SDD para deduplicación, exclusión del historial, scroll, fecha y puntuaciones.
- [x] Añadir deduplicación que preserva remakes con IDs TMDB distintos.
- [x] Excluir el historial en Descubrir local y remoto; excluir toda la colección de recomendaciones.
- [x] Limitar el alto de la ficha para que la sinopsis se pueda recorrer con scroll.
- [x] Cambiar la fecha del historial a MM/DD/YYYY sin hora.
- [x] Compactar visualmente las tarjetas de puntuación.
- [x] Ejecutar node --check app.js y node --check sw.js.
- [x] Ejecutar node scripts/validate-sdd.mjs y las pruebas de importación CSV.
- [x] Ejecutar las pruebas de procedencia de puntuaciones.
- [x] Ejecutar scripts/test-discovery-detail-polish.mjs.
- [x] Ejecutar regresión Playwright en escritorio y móvil, incluida la prueba real de scroll de una sinopsis larga.
- [x] Actualizar requisitos permanentes, el modelo de datos y archivar este expediente.

## Evidencia CI

- [SDD y calidad estática](https://github.com/ElFast-dev/Prisma/actions/runs/39492427765)
- [Validación de Prisma](https://github.com/ElFast-dev/Prisma/actions/runs/39492427548)
- [Regresión visual Playwright](https://github.com/ElFast-dev/Prisma/actions/runs/39492427518)
