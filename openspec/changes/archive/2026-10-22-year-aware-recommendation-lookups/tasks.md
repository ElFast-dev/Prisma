# Tareas

- [x] Inspeccionar los puntos de búsqueda de películas usados en aprendizaje, ranking y experimentos.
- [x] Confirmar que el catálogo soporta una consulta por título, ID TMDB y año.
- [x] Pasar el año disponible a las búsquedas del motor, MAE, nDCG, normalización y Ridge.
- [x] Añadir una regresión sintética que demuestra que no se mezclan características entre remakes.
- [x] Versionar módulos, entrada, caché PWA y verificaciones de lanzamiento.
- [x] Ejecutar todas las pruebas de calidad y Playwright; corregir los fallos detectados.
- [x] Fusionar cuando calidad y Playwright pasen en el mismo SHA.
- [x] Verificar despliegue de Pages del SHA integrado y archivar este expediente.


## Evidencia de integración y publicación

- PR #83 integrado: https://github.com/ElFast-dev/Prisma/pull/83.
- SHA de la rama verificada antes de la integración: `0b877d67813c467b337c8cf7109479adf996d061`.
- Calidad/SDD y pruebas del modelo sobre el mismo SHA del PR: [run 39872902186](https://github.com/ElFast-dev/Prisma/actions/runs/39872902186), resultado satisfactorio.
- Playwright de la rama, sobre el mismo SHA: [run 39872902161](https://github.com/ElFast-dev/Prisma/actions/runs/39872902161), resultado satisfactorio en escritorio y móvil.
- Commit integrado y publicado: `694c447a9f9fff184c48b230e6da851531c58f56`.
- Calidad/SDD de `main`: [run 39873996738](https://github.com/ElFast-dev/Prisma/actions/runs/39873996738), resultado satisfactorio.
- Playwright de `main`: [run 39874037295](https://github.com/ElFast-dev/Prisma/actions/runs/39874037295), resultado satisfactorio; el artefacto incluía el SHA exacto probado.
- Despliegue de GitHub Pages: [run 39874226011](https://github.com/ElFast-dev/Prisma/actions/runs/39874226011), resultado satisfactorio. El log de `Validate approved source SHA` confirma el SHA anterior y Pages registra el mismo valor como `pages_build_version`.
