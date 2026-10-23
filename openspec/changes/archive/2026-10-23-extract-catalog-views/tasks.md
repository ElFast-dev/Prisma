# Tareas: extraer las vistas de Descubrir y catálogo

- [x] CT1. Extraer la tarjeta, cuadrícula, filtro, resultados y página del catálogo a `js/ui/catalog-views.js`.
- [x] CT2. Conservar los cinco renderizadores en la API de `createPageViews(ctx)`.
- [x] CT3. Versionar la vista nueva, `page-views.js`, `app.js` y el shell PWA; precargar la dependencia.
- [x] CT4. Actualizar pruebas de arquitectura, caché, filtrado de Descubrir y procedencia de puntuaciones.
- [x] CT5. Documentar la responsabilidad nueva y añadir el expediente SDD al validador.
- [x] CT6. Ejecutar quality/SDD y regresiones completas; corregir fallos.
- [x] CT7. Ejecutar Playwright sobre el mismo SHA aprobado por quality.
- [x] CT8. Integrar, verificar Pages con el guard anti-SHA obsoleto y archivar este expediente con evidencia.


## Evidencia de integración y publicación

- Cambio integrado: [PR #94](https://github.com/ElFast-dev/Prisma/pull/94).
- Calidad/SDD previa a integrar: [run 39891652820](https://github.com/ElFast-dev/Prisma/actions/runs/39891652820), éxito; Playwright: [run 39891652681](https://github.com/ElFast-dev/Prisma/actions/runs/39891652681), éxito sobre el mismo SHA.
- Quality/SDD y Playwright sobre el main combinado: [39898552475](https://github.com/ElFast-dev/Prisma/actions/runs/39898552475) y [39898585458](https://github.com/ElFast-dev/Prisma/actions/runs/39898585458), ambos con éxito sobre `94a93feaa875d95a8a15e8c71b4e89db9b817bf4`.
- Pages: [run 39898747169](https://github.com/ElFast-dev/Prisma/actions/runs/39898747169), éxito. `pages_build_version=94a93feaa875d95a8a15e8c71b4e89db9b817bf4`; el SHA aprobado coincidió con main al inicio y justo antes de publicar.
