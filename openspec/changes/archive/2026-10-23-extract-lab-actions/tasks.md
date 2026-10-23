# Tareas completadas: extraer las acciones del Laboratorio

- [x] Inspeccionar el punto de entrada, las vistas del Laboratorio, los evaluadores existentes y los contratos de CI/PWA.
- [x] Extraer las seis acciones del Laboratorio a `js/app/lab-actions.js` con una fábrica y dependencias inyectadas.
- [x] Mantener la API consumida por vistas y eventos mediante delegadores en `app.js`.
- [x] Añadir pruebas aisladas para guardas, progreso, evaluación temporal, proxy experimental, informe local y portapapeles.
- [x] Ajustar pruebas heredadas que debían inspeccionar el módulo nuevo y conservar sus contratos de comportamiento.
- [x] Actualizar la precaché PWA, el nombre del shell y las URL versionadas; protegerlo con pruebas de coherencia.
- [x] Registrar las pruebas en Quality/SDD y validar la especificación activa.
- [x] Pasar Quality/SDD y Playwright sobre el mismo SHA antes de integrar.
- [x] Integrar en `main`, volver a validar CI y desplegar el SHA exacto en GitHub Pages.
- [x] Archivar la propuesta tras verificar el release.

## Criterios de aceptación comprobados

- La coordinación de experimentos se encuentra en `js/app/lab-actions.js`; `app.js` la compone y delega sin conservar la implementación duplicada.
- El ranking de producción, los pesos del recomendador y los protocolos de evaluación permanecen sin cambios.
- Los experimentos siguen bajo demanda, mantienen sus guardas/progreso y descartan resultados obsoletos mediante sus identificadores de ejecución.
- El informe diagnóstico se genera localmente y solo por acción explícita; la copia manual sigue disponible si falla el portapapeles.
- La versión de aplicación, el módulo nuevo y la caché PWA se alinean y las pruebas comprueban esa coherencia.

## Evidencia previa a integración

- PR #111: https://github.com/ElFast-dev/Prisma/pull/111.
- SHA funcional probado: `aaf45db9dc02100f578cc715a19978a406d85759`.
- Quality/SDD: https://github.com/ElFast-dev/Prisma/actions/runs/39913267118 (éxito).
- Playwright sobre el mismo SHA: https://github.com/ElFast-dev/Prisma/actions/runs/39913267114 (éxito).

## Evidencia de integración y publicación

- SHA de `main` integrado y publicado: `ba9ff82636ef2927b524b75867d76e960efb013b`.
- Quality/SDD post-merge: https://github.com/ElFast-dev/Prisma/actions/runs/39913492498 (éxito).
- Playwright post-merge sobre el SHA de `main`: https://github.com/ElFast-dev/Prisma/actions/runs/39913540636 (éxito).
- GitHub Pages: https://github.com/ElFast-dev/Prisma/actions/runs/39913706864 (éxito); los logs confirman `Approved SHA is the current main head`, `Publication SHA still matches main` y `pages_build_version=ba9ff82636ef2927b524b75867d76e960efb013b`.
