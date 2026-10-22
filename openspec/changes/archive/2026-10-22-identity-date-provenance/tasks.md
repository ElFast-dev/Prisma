# Tareas

- [x] Inspeccionar identidad actual, catálogo, acciones, historial, importación y procedencia temporal.
- [x] Especificar el fallback por título/año y el comportamiento ante correspondencias ambiguas.
- [x] Aplicar correspondencia segura a normalización, catálogo, colección, acciones e importaciones.
- [x] Impedir que las marcas `action-time` se presenten como fecha de visionado.
- [x] Añadir pruebas sintéticas para remakes, registros legados incompletos y fechas.
- [x] Actualizar las URLs versionadas, caché PWA y compuerta de calidad.
- [x] Añadir deltas SDD para catálogo, recomendaciones y procedencia de fechas.
- [x] Ejecutar la calidad completa y Playwright en el PR (ambas compuertas verdes sobre el SHA probado `7a5ec208519244403f461d6db08b3ca3e8dab0d7`).
- [x] Corregir las regresiones detectadas y volver a comprobarlas; las suites de identidad, fechas, arquitectura, PWA y UX pasan.
- [x] Fusionar el PR #76 tras las compuertas verdes (commit de fusión `fe673dc02d7431aea30918ce041eb78418301bc6`).
- [x] Verificar el despliegue de GitHub Pages del SHA probado en el flujo posterior a la fusión.
- [x] Archivar este expediente y verificar la convergencia entre código, especificaciones y despliegue.

## Evidencia de integración, regresión y despliegue

- PR #76 fusionado: [commit `fe673dc02d7431aea30918ce041eb78418301bc6`](https://github.com/ElFast-dev/Prisma/commit/fe673dc02d7431aea30918ce041eb78418301bc6).
- Calidad/SDD satisfactoria sobre el SHA fusionado: [run 39858438343](https://github.com/ElFast-dev/Prisma/actions/runs/39858438343).
- Playwright escritorio/móvil satisfactorio sobre ese SHA: [run 39858484611](https://github.com/ElFast-dev/Prisma/actions/runs/39858484611).
- GitHub Pages publicó exactamente `fe673dc02d7431aea30918ce041eb78418301bc6`: [run 39858718539](https://github.com/ElFast-dev/Prisma/actions/runs/39858718539).
- La corrección contextual posterior volvió a pasar las compuertas y su merge se desplegó como `0aed4fa9cbe4e9c8bdb54d4ab34e4dee0ebcdccc`: [calidad](https://github.com/ElFast-dev/Prisma/actions/runs/39859403312), [Playwright](https://github.com/ElFast-dev/Prisma/actions/runs/39859446914) y [Pages](https://github.com/ElFast-dev/Prisma/actions/runs/39859666053).
