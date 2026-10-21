# Tareas: validación temporal Ridge

- [x] TR1. Especificar fechas válidas, límites, privacidad y escenarios walk-forward.
- [x] TR2. Implementar cruce por identidad, impedir que la edición de notas genere fechas de visionado desde updatedAt y validar selección temporal sin fuga.
- [x] TR3. Añadir ejecución bajo demanda, progreso, cancelación y resultados diferenciados en el Laboratorio.
- [x] TR4. Incorporar métricas agregadas temporales al diagnóstico y versionar su esquema a v5.
- [x] TR5. Probar fechas ausentes, límites de muestra, orden temporal, selección de alpha y ausencia de fuga.
- [x] TR6. Actualizar documentación, inventario de caché PWA y contratos de CI/Playwright; advertir que la procedencia de algunos watchedAt históricos no puede verificarse retrospectivamente.
- [x] TR7. Confirmar checks del PR, publicar, verificar navegador y archivar el expediente.

## Criterios de aceptación

- Ningún registro del entrenamiento tiene una fecha de visionado igual o posterior al inicio de su ventana exterior de prueba.
- La selección de alpha usa solo ventanas internas anteriores a cada ventana exterior.
- Las películas con fecha ausente/inválida no participan, y su cantidad se informa sin nombres ni fechas.
- Fechas, IDs, títulos, notas y predicciones individuales no se exportan.
- El cálculo no se ejecuta al abrir el Laboratorio, cancela resultados obsoletos y no altera recomendaciones ni almacenamiento.
- Los mínimos insuficientes devuelven métricas no disponibles en vez de cifras parciales fabricadas.

## Evidencia de cierre

- Implementación temporal y procedencia de fechas: [PR #53](https://github.com/ElFast-dev/Prisma/pull/53).
- Validación del PR: [Validate Prisma](https://github.com/ElFast-dev/Prisma/actions/runs/39660198386).
- SDD y calidad estática del PR: [SDD and static quality](https://github.com/ElFast-dev/Prisma/actions/runs/39660198395).
- Playwright del PR: [Prisma UI screenshots](https://github.com/ElFast-dev/Prisma/actions/runs/39660198378).
- Validación de `main`: [Validate Prisma](https://github.com/ElFast-dev/Prisma/actions/runs/39660442119).
- SDD y calidad estática de `main`: [SDD and static quality](https://github.com/ElFast-dev/Prisma/actions/runs/39660442240).
- Despliegue a GitHub Pages: [Deploy Prisma to GitHub Pages](https://github.com/ElFast-dev/Prisma/actions/runs/39660442166).
- Playwright después de publicar: [Prisma UI screenshots](https://github.com/ElFast-dev/Prisma/actions/runs/39660650832).

## Resultado y límites

El Laboratorio ofrece validación temporal walk-forward con cinco ventanas futuras y selección de alpha en tres ventanas internas anteriores, y exporta solo agregados en el informe v5. La edición de una nota existente sin fecha fiable ya no crea `watchedAt` a partir de `updatedAt`; una acción explícita de marcar como vista sí registra la fecha de esa acción.

No se puede verificar retrospectivamente la procedencia de todos los campos `watchedAt` que versiones antiguas ya guardaron. Por ello la interfaz advierte que estos resultados son descriptivos. No se muestran fechas ni identidades individuales en resultados o informes, y Ridge permanece experimental: el recomendador activo continúa siendo aditivo.
