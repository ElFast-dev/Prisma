# Tareas: extraer las vistas de Colección

- [x] CV1. Extraer filas, tarjetas compactas, pósteres recientes, contenido, refresco y página de Colección a `js/ui/collection-views.js`.
- [x] CV2. Mantener todas las funciones públicas de Colección disponibles desde `createPageViews(ctx)`.
- [x] CV3. Versionar el módulo, `page-views.js`, `app.js` y el shell PWA; precargar la nueva URL.
- [x] CV4. Añadir una regresión específica de Historial, Pendientes, Ocultos, vista compacta, escape HTML y refresco parcial; actualizar arquitectura y caché.
- [x] CV5. Añadir la especificación delta y registrar las tareas en SDD.
- [x] CV6. Ejecutar quality/SDD y regresiones completas; corregir fallos.
- [x] CV7. Ejecutar Playwright sobre el mismo SHA aprobado por quality.
- [x] CV8. Integrar, comprobar Pages contra el SHA actual y archivar el expediente con evidencia.


## Evidencia de integración y publicación

- Cambio integrado: [PR #93](https://github.com/ElFast-dev/Prisma/pull/93); regresiones de Historial/Pendientes/Ocultos: [PR #99](https://github.com/ElFast-dev/Prisma/pull/99).
- Calidad/SDD y Playwright de la extracción: [quality 39890487571](https://github.com/ElFast-dev/Prisma/actions/runs/39890487571) y [UI 39890487540](https://github.com/ElFast-dev/Prisma/actions/runs/39890487540), éxito en el mismo SHA. Las regresiones adicionales de colección también pasaron: [quality 39895924915](https://github.com/ElFast-dev/Prisma/actions/runs/39895924915), [UI 39895924974](https://github.com/ElFast-dev/Prisma/actions/runs/39895924974).
- Quality/SDD y Playwright de main combinado: [39898552475](https://github.com/ElFast-dev/Prisma/actions/runs/39898552475) y [39898585458](https://github.com/ElFast-dev/Prisma/actions/runs/39898585458), ambos con éxito sobre `94a93feaa875d95a8a15e8c71b4e89db9b817bf4`.
- Pages: [run 39898747169](https://github.com/ElFast-dev/Prisma/actions/runs/39898747169), éxito; `pages_build_version=94a93feaa875d95a8a15e8c71b4e89db9b817bf4`, con ambas comprobaciones de vigencia aprobadas.
