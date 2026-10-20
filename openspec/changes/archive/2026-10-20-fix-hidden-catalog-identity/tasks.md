# Tareas: filtrar películas ocultas por identidad estable

- [x] Inspeccionar `filterCatalog`, `isHidden`, `sameMovieRecord` y el filtro del recomendador.
- [x] Registrar el caso reproducible y el alcance en proposal/design/spec delta.
- [x] Cambiar el filtro local para comprobar ocultación por identidad TMDB.
- [x] Ampliar la prueba Playwright para ocultar un remake y conservar visible el otro.
- [x] Actualizar la especificación vigente de catálogo tras pasar el test.
- [x] Ejecutar y revisar los checks finales de SDD, sintaxis, importación y navegador.
- [x] Aceptar el cambio mediante revisión técnica delegada tras comprobar todos los checks y archivar el expediente.

## Evidencia

Todos los checks finales pasaron en el commit de implementación, antes del cierre documental:
- [SDD and static quality, run #41](https://github.com/ElFast-dev/Prisma/actions/runs/39480110881): correcto.
- [Validate Prisma, run #148](https://github.com/ElFast-dev/Prisma/actions/runs/39480110970): correcto.
- [Prisma UI screenshots, run #119](https://github.com/ElFast-dev/Prisma/actions/runs/39480110813): correcto; la prueba de ocultación por identidad pasó en escritorio y móvil.

El commit de cierre documental volverá a pasar por los workflows antes de integrar la PR.
