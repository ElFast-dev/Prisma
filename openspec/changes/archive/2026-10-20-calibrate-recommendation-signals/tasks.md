# Tareas: calibración de señales

- [x] R1. Especificar y probar la jerarquía género/etiqueta y el efecto de la cobertura antes de implementar.
- [x] R2. Cambiar la contribución de señales y el cálculo de confianza/explicaciones en `predictRating`.
- [x] R3. Añadir pruebas sintéticas a CI y actualizar las especificaciones/documentación vigentes.
- [x] R4. Ejecutar tests SDD, evaluación, caché, sintaxis y regresión visual de móvil/escritorio.
- [x] R5. Actualizar versión de app.js y del service worker; archivar SDD después de los checks del PR.

## Evidencia de verificación

- SDD, sintaxis y todas las pruebas funcionales, incluida la nueva prueba de ponderación/confianza: correcto, [workflow 39499322969](https://github.com/ElFast-dev/Prisma/actions/runs/39499322969).
- Validación de Prisma: correcta, [workflow 39499322946](https://github.com/ElFast-dev/Prisma/actions/runs/39499322946).
- Playwright escritorio y móvil: correcto, [workflow 39499322940](https://github.com/ElFast-dev/Prisma/actions/runs/39499322940).

## Cierre y límites

Las pruebas verifican el comportamiento esperado con datos sintéticos, no la calidad del gusto individual. El MAE leave-one-out del Laboratorio continúa siendo la referencia experimental para observar el desempeño en el perfil real cuando haya al menos cinco valoraciones con características enlazadas.

El JavaScript queda versionado como `ui-20261020-20` y el shell de la PWA como `prisma-shell-v24`; la prueba automática verifica que no haya divergencias entre HTML, service worker y Playwright.
