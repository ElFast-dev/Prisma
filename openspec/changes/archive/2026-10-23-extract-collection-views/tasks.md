# Tareas: extraer las vistas de Colección

- [x] CV1. Extraer filas, tarjetas compactas, pósteres recientes, contenido, refresco y página de Colección a `js/ui/collection-views.js`.
- [x] CV2. Mantener todas las funciones públicas de Colección disponibles desde `createPageViews(ctx)`.
- [x] CV3. Versionar el módulo, `page-views.js`, `app.js` y el shell PWA; precargar la nueva URL.
- [x] CV4. Añadir una regresión específica de Historial, Pendientes, Ocultos, vista compacta, escape HTML y refresco parcial; actualizar arquitectura y caché.
- [x] CV5. Añadir la especificación delta y registrar las tareas en SDD.
- [x] CV6. Ejecutar quality/SDD y regresiones completas; corregir fallos.
- [x] CV7. Ejecutar Playwright sobre el mismo SHA aprobado por quality.
- [x] CV8. Integrar, comprobar Pages contra el SHA actual y archivar el expediente con evidencia.

## Evidencia de finalización

- Código integrado en `main`: `94a93feaa875d95a8a15e8c71b4e89db9b817bf4`.
- Calidad SDD y regresiones: [ejecución 39898552475](https://github.com/ElFast-dev/Prisma/actions/runs/39898552475), correcta sobre el SHA indicado.
- Playwright: [ejecución 39898585458](https://github.com/ElFast-dev/Prisma/actions/runs/39898585458), correcta sobre el mismo SHA.
- GitHub Pages: [ejecución 39898747169](https://github.com/ElFast-dev/Prisma/actions/runs/39898747169), correcta sobre el mismo SHA. La validación final de `main` previa a la publicación terminó correctamente.
