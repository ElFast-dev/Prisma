# Tareas

- [x] Inspeccionar el motor de recomendación, la identidad de películas, el flujo de calificación y la integración TMDB.
- [x] Definir la nota del 1 al 10 como única entrada personal necesaria para recomendar.
- [x] Eliminar el registro de emociones y texto libre del panel de calificación.
- [x] Añadir familias de características cinematográficas y mapeo de metadatos TMDB.
- [x] Permitir que una primera nota alta o baja aporte una señal mediante suavizado.
- [x] Acotar el enriquecimiento de candidatas remotas y mantenerlo en memoria.
- [x] Añadir pruebas sintéticas para metadatos, calificación y primera nota.
- [x] Actualizar versionado de módulos y caché PWA.
- [x] Actualizar producto, arquitectura, modelo de datos y especificaciones.
- [x] Ejecutar todos los checks de calidad y la prueba Playwright; corregir los fallos.
- [x] Fusionar y comprobar el despliegue únicamente si las verificaciones terminan satisfactoriamente.

## Evidencia de integración, regresión y despliegue

- PR #73 fusionado en `6c8e117d9d30aa6e5fd32574f63d9397396a426b`; el motor y los metadatos ricos están incluidos en el SHA integrado `d434226476db32d19a5d0f6fdb82ab35632aad7e`.
- Calidad/SDD satisfactoria, incluidas las regresiones de notas y metadatos: [run 39839611430](https://github.com/ElFast-dev/Prisma/actions/runs/39839611430).
- Playwright escritorio/móvil satisfactorio sobre el mismo SHA integrado: [run 39839651891](https://github.com/ElFast-dev/Prisma/actions/runs/39839651891).
- GitHub Pages publicó exactamente `d434226476db32d19a5d0f6fdb82ab35632aad7e`: [run 39839898057](https://github.com/ElFast-dev/Prisma/actions/runs/39839898057).
- Los checks incluyen extracción de señales cinematográficas, ponderación, modos y evaluación experimental; el modelo sigue siendo heurístico y no aprende emociones ni notas libres.
