# Tareas: isotipo y recursos de marca

## Especificación
- [x] Documentar alcance, colores, URLs versionadas e invalidación de la PWA antes de implementar.
- [x] Definir el requisito para que favicon, logo del encabezado y icono del manifest compartan una identidad visual coherente.

## Implementación
- [x] Actualizar la paleta del SVG sin alterar su geometría.
- [x] Versionar favicon, logo y recurso del manifest con una URL idéntica.
- [x] Incrementar la versión del manifest y del shell de la PWA.
- [x] Añadir una prueba estática de paleta y referencias y conectarla a CI.
- [x] Añadir una aserción Playwright para verificar favicon y logo en la interfaz.

## Validación y cierre
- [x] Ejecutar checks SDD, sintaxis y pruebas estáticas en CI.
- [x] Revisar Playwright, fusionar el cambio y confirmar el despliegue de GitHub Pages.
- [x] Verificar el isotipo publicado en escritorio y móvil.
- [x] Archivar el expediente con la evidencia final de CI y publicación.


## Evidencia

- PR: https://github.com/ElFast-dev/Prisma/pull/14
- Commit main: https://github.com/ElFast-dev/Prisma/commit/401a019219e0e1479b1ecc83fc3b4a7e8854a423
- SDD y calidad: https://github.com/ElFast-dev/Prisma/actions/runs/39517055755
- Validate Prisma: https://github.com/ElFast-dev/Prisma/actions/runs/39517055850
- Deploy Pages: https://github.com/ElFast-dev/Prisma/actions/runs/39517055749
- Playwright publicado, escritorio/móvil: https://github.com/ElFast-dev/Prisma/actions/runs/39517091542
