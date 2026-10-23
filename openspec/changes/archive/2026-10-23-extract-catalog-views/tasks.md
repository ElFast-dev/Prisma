# Tareas: extraer las vistas de Descubrir y catálogo

- [x] CT1. Extraer la tarjeta, cuadrícula, filtro, resultados y página del catálogo a `js/ui/catalog-views.js`.
- [x] CT2. Conservar los cinco renderizadores en la API de `createPageViews(ctx)`.
- [x] CT3. Versionar la vista nueva, `page-views.js`, `app.js` y el shell PWA; precargar la dependencia.
- [x] CT4. Actualizar pruebas de arquitectura, caché, filtrado de Descubrir y procedencia de puntuaciones.
- [x] CT5. Documentar la responsabilidad nueva y añadir el expediente SDD al validador.
- [x] CT6. Ejecutar quality/SDD y regresiones completas; corregir fallos.
- [x] CT7. Ejecutar Playwright sobre el mismo SHA aprobado por quality.
- [x] CT8. Integrar, verificar Pages con el guard anti-SHA obsoleto y archivar este expediente con evidencia.

## Evidencia de finalización

- Código integrado en `main`: `94a93feaa875d95a8a15e8c71b4e89db9b817bf4`.
- Calidad SDD y regresiones: [ejecución 39898552475](https://github.com/ElFast-dev/Prisma/actions/runs/39898552475), correcta sobre el SHA indicado.
- Playwright: [ejecución 39898585458](https://github.com/ElFast-dev/Prisma/actions/runs/39898585458), correcta sobre el mismo SHA.
- GitHub Pages: [ejecución 39898747169](https://github.com/ElFast-dev/Prisma/actions/runs/39898747169), correcta sobre el mismo SHA. La validación final de `main` previa a la publicación terminó correctamente.
