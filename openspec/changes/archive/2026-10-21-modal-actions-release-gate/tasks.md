# Tareas: acciones del modal y publicación bloqueada por pruebas

- [x] MG1. Corregir los accesos a `modalDraft` usando el contexto inyectado y pasar ese estado desde `app.js`.
- [x] MG2. Añadir pruebas del listener real para emociones y acciones de estado sin ficha activa, conservando la identidad TMDB.
- [x] MG3. Añadir pruebas Playwright para seleccionar/deseleccionar emociones, guardar y verificar la persistencia, cerrar y volver a la ficha, gestionar pendientes y ocultar/mostrar.
- [x] MG4. Encadenar calidad/SDD → Playwright local del mismo SHA → despliegue de ese SHA a GitHub Pages mediante un artefacto de aprobación.
- [x] MG5. Retirar `.github/workflows/validate.yml` duplicado e incorporar la validación del manifest al workflow canónico.
- [x] MG6. Añadir `scripts/test-release-gating.mjs` para comprobar que fallos de calidad o navegador bloquean Pages y que no existen bypasses de publicación.
- [x] MG7. Sincronizar las versiones de caché PWA y publicar requisitos de interfaz y proceso de liberación en las especificaciones permanentes.
- [x] MG8. Integrar el cambio, archivar el expediente SDD y verificar CI, Playwright y Pages en `main`.

## Criterios de aceptación

- Las emociones se activan y desactivan sin `ReferenceError` y se conservan al guardar la valoración.
- Pendientes, historial y ocultación actúan sobre la película correcta, aun sin una ficha de detalle activa.
- Cerrar el editor de calificación restaura la ficha que originó el editor y no inventa una ficha cuando se abrió desde una lista.
- Si una prueba de calidad falla, Playwright y Pages no publican esa versión; si falla Playwright, el deploy no se inicia.
- Pages descarga el artefacto de aprobación, valida el SHA de origen y despliega exactamente ese SHA.
- El workflow duplicado `validate.yml` ha sido eliminado y la cadena canónica conserva SDD, sintaxis y pruebas.

## Evidencia

- Implementación y revisión: [PR #57](https://github.com/ElFast-dev/Prisma/pull/57).
- Calidad y SDD del cambio: [SDD and static quality](https://github.com/ElFast-dev/Prisma/actions/runs/39679504764).
- Pruebas de interfaz del cambio: [Prisma UI screenshots](https://github.com/ElFast-dev/Prisma/actions/runs/39679504793).
- Calidad del commit integrado `4c9f0870c7e79d8899fbe0d7e71389149f77ad0c`: [SDD and static quality](https://github.com/ElFast-dev/Prisma/actions/runs/39679884494).
- Playwright sobre el mismo commit integrado: [Prisma UI screenshots](https://github.com/ElFast-dev/Prisma/actions/runs/39679923987).
- Despliegue aprobado del mismo commit: [Deploy Prisma to GitHub Pages](https://github.com/ElFast-dev/Prisma/actions/runs/39680157220).

## Resultado y límites

La corrección inyecta `modalDraft` correctamente al manejador y usa el borrador como fuente de identidad para acciones de listas si no hay ficha activa. El editor conserva la superficie de origen al cerrarse. La prueba de calidad cubre estas rutas y Playwright pulsa los controles, verifica que la emoción se persiste y comprueba las acciones de estado.

El proceso de liberación ahora es una secuencia de éxito: calidad/SDD, navegador local sobre el SHA aprobado y publicación de ese mismo SHA. Los fallos anteriores del nuevo flujo se mantuvieron sin publicar hasta que las comprobaciones del commit definitivo pasaron.
