# Tareas

- [x] Identificar la inconsistencia entre igualdad por ID y búsqueda contextual por título.
- [x] Corregir la búsqueda contextual para priorizar el ID TMDB en el conjunto completo.
- [x] Añadir una prueba de regresión con título alternativo y el mismo ID.
- [x] Actualizar y ejecutar calidad, pruebas de identidad y Playwright (verde sobre el SHA probado `36ec0590f12313a1f81cf5973d5c76a90743f771`).
- [x] Verificar la caché PWA v98 y la compatibilidad: pasan las comprobaciones de versionado, identidad y arquitectura.
- [x] Fusionar el PR #77 tras las compuertas verdes (commit `0aed4fa9cbe4e9c8bdb54d4ab34e4dee0ebcdccc`).
- [x] Verificar el despliegue de GitHub Pages del SHA probado en los workflows posteriores a la fusión.
- [x] Archivar el expediente cuando se pueda confirmar la convergencia del despliegue.

## Evidencia de integración, regresión y despliegue

- PR #77 fusionado: [commit de merge `0aed4fa9cbe4e9c8bdb54d4ab34e4dee0ebcdccc`](https://github.com/ElFast-dev/Prisma/commit/0aed4fa9cbe4e9c8bdb54d4ab34e4dee0ebcdccc).
- Calidad/SDD satisfactoria: [run 39859403312](https://github.com/ElFast-dev/Prisma/actions/runs/39859403312).
- Playwright escritorio/móvil satisfactorio: [run 39859446914](https://github.com/ElFast-dev/Prisma/actions/runs/39859446914).
- GitHub Pages publicó exactamente el SHA probado `0aed4fa9cbe4e9c8bdb54d4ab34e4dee0ebcdccc`: [run 39859666053](https://github.com/ElFast-dev/Prisma/actions/runs/39859666053).
