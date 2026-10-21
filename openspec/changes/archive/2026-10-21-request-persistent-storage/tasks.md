# Tareas: solicitar persistencia del almacenamiento local

- [x] R1. Confirmar el almacenamiento actual y verificar la API de persistencia en fuentes web actuales.
- [x] R2. Definir el alcance y las limitaciones; no solicitar persistencia al abrir la aplicación.
- [x] R3. Crear el expediente SDD y añadir la especificación activa antes de modificar el código de ejecución.
- [x] R4. Implementar el módulo puro de inspección/solicitud y sus pruebas aisladas.
- [x] R5. Integrar el estado y la acción explícita en Ajustes, con mensajes que no prometan protección absoluta.
- [x] R6. Actualizar arquitectura, producto, modularidad, validación SDD y el requisito permanente de almacenamiento.
- [x] R7. Sincronizar las URL versionadas, la caché PWA y las pruebas que las verifican.
- [x] R8. Ejecutar pruebas automatizadas, validación SDD, CI y pruebas visuales del PR.
- [x] R9. Fusionar, desplegar y comprobar las pruebas de UI posteriores al despliegue.
- [x] R10. Archivar el expediente solo cuando toda la evidencia pertinente sea correcta.

## Criterios de aceptación

La comprobación de estado nunca llama a `persist()`; solo el control explícito puede hacerlo. Un API ausente, una denegación o un error no rompe Ajustes ni el inicio. La UI explica que la copia de seguridad sigue siendo necesaria. La versión de `app.js`, el inventario del service worker, las aserciones automatizadas y el nombre de caché permanecen coordinados.


## Evidencia de cierre

- PR #34 integrado en `main`: https://github.com/ElFast-dev/Prisma/pull/34
- Calidad/SDD del PR: https://github.com/ElFast-dev/Prisma/actions/runs/39547558465
- Validación del PR: https://github.com/ElFast-dev/Prisma/actions/runs/39547558459
- Pruebas visuales del PR: https://github.com/ElFast-dev/Prisma/actions/runs/39547558511
- Calidad/SDD en `main`: https://github.com/ElFast-dev/Prisma/actions/runs/39547727289
- Validación en `main`: https://github.com/ElFast-dev/Prisma/actions/runs/39547727292
- Despliegue de GitHub Pages: https://github.com/ElFast-dev/Prisma/actions/runs/39547727347
- Pruebas visuales posteriores al despliegue: https://github.com/ElFast-dev/Prisma/actions/runs/39547758242

## Resultado y límites

Prisma informa del estado de persistencia que devuelve el navegador y permite solicitarla únicamente mediante una acción explícita en Ajustes. Las consultas de estado y cuota son opcionales y no bloquean la aplicación si fallan. El resultado no promete protección absoluta ni sustituye una copia de seguridad. Se mantiene la arquitectura estática y local, sin cambios en valoraciones, colecciones, recomendaciones ni TMDB.
