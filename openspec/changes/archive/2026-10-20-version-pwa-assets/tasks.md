# Tareas: versionado de recursos PWA

- [x] R1. Cambiar la URL versionada de app.js e incrementar la versión de la caché del shell.
- [x] R2. Mantener sincronizados index.html, APP_ASSETS y la versión esperada por Playwright.
- [x] R3. Añadir una prueba estática de coherencia y exigirla en CI.
- [x] R4. Actualizar la especificación vigente, ejecutar checks y publicar con verificación posterior.

## Evidencia de verificación

- SDD y calidad estática, incluyendo el test de versionado de caché: correcto, [workflow 39496579332](https://github.com/ElFast-dev/Prisma/actions/runs/39496579332).
- Validación de Prisma: correcta, [workflow 39496579305](https://github.com/ElFast-dev/Prisma/actions/runs/39496579305).
- Playwright sobre escritorio y móvil: correcto en el PR, [workflow 39496579380](https://github.com/ElFast-dev/Prisma/actions/runs/39496579380).

## Cierre

index.html y sw.js usan app.js?v=ui-20261020-19; el shell actual es prisma-shell-v23. La prueba estática compara la URL en HTML, service worker y Playwright para detectar desincronizaciones futuras. La comprobación real del sitio público ocurrirá tras el despliegue del merge.
