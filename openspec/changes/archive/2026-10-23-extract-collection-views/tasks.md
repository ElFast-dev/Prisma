# Tareas: extraer las vistas de Colección

- [x] CV1. Extraer filas, tarjetas compactas, pósteres recientes, contenido, refresco y página de Colección a `js/ui/collection-views.js`.
- [x] CV2. Mantener todas las funciones públicas de Colección disponibles desde `createPageViews(ctx)`.
- [x] CV3. Versionar el módulo, `page-views.js`, `app.js` y el shell PWA; precargar la nueva URL.
- [x] CV4. Actualizar pruebas de arquitectura, caché, versión del shell y la documentación de arquitectura.
- [x] CV5. Añadir la especificación delta y registrar las tareas en SDD.
- [x] CV6. Ejecutar quality/SDD y regresiones completas; corregir fallos.
- [x] CV7. Ejecutar Playwright sobre el mismo SHA aprobado por quality.
- [ ] CV8. Integrar, comprobar Pages contra el SHA actual y archivar el expediente con evidencia.


## Evidencia de pruebas antes de integrar

- PR de código #93 integrado: https://github.com/ElFast-dev/Prisma/pull/93.
- Quality/SDD y regresiones completas: [run 39890487571](https://github.com/ElFast-dev/Prisma/actions/runs/39890487571), éxito en `52106621a53ad341432a4a7262d5655ae9904a75`.
- Playwright escritorio/móvil: [run 39890487540](https://github.com/ElFast-dev/Prisma/actions/runs/39890487540), éxito sobre el mismo SHA.
