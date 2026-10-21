# Tareas: comparación del ranking Ridge

- [x] RQ1. Registrar el protocolo SDD y sus umbrales.
- [x] RQ2. Ampliar Ridge con nDCG@5 emparejado por modo y los mismos pliegues externos.
- [x] RQ3. Garantizar que el ranker no recibe notas retenidas ni IDs TMDB.
- [x] RQ4. Presentar resultados por modo en el Laboratorio y diagnóstico compartible.
- [x] RQ5. Probar determinismo, umbrales, deltas y privacidad con datos sintéticos.
- [x] RQ6. Actualizar esquema del informe, versionado/caché PWA y contratos automáticos.
- [x] RQ7. Ejecutar CI, Playwright y comprobar despliegue; archivar solo con todos los checks verdes.

## Evidencia de cierre

- Continúan pasando las pruebas anteriores del MAE Ridge.
- El test Ridge verifica nDCG@5 de cinco pliegues y candidatas sin información personal.
- El informe contiene solamente métricas agregadas.
- SDD, calidad, validación, capturas y despliegue pasan.

## Evidencia

- Implementación y tests del cambio: [PR #45](https://github.com/ElFast-dev/Prisma/pull/45).
- Validación de la rama principal: [Validate Prisma](https://github.com/ElFast-dev/Prisma/actions/runs/39637723829).
- Contrato SDD y calidad estática: [SDD and static quality](https://github.com/ElFast-dev/Prisma/actions/runs/39637723891).
- Despliegue de GitHub Pages: [Deploy Prisma to GitHub Pages](https://github.com/ElFast-dev/Prisma/actions/runs/39637724031).
- Pruebas de navegador sobre el PR: [Prisma UI screenshots](https://github.com/ElFast-dev/Prisma/actions/runs/39637462047).

- Prueba de navegador del sitio publicado tras el despliegue: [Prisma UI screenshots](https://github.com/ElFast-dev/Prisma/actions/runs/39637878971).
