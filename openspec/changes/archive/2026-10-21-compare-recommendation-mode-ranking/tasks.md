# Tareas: comparar modos de recomendación

- [x] R1. Revisar cómo se calculan nDCG@5 y la diversidad antes de modificar el algoritmo.
- [x] R2. Crear el expediente SDD y fijar un protocolo común de candidatas retenidas.
- [x] R3. Extraer y probar la función pura de ranking compartida por producción y evaluación.
- [x] R4. Calcular nDCG@5 por modo en los mismos cinco pliegues y excluir las notas retenidas del entrenamiento.
- [x] R5. Actualizar Laboratorio, especificación permanente y documentación de arquitectura/producto.
- [x] R6. Actualizar pruebas de evaluación, caché PWA y versiones de entrada coordinadamente.
- [x] R7. Pasar CI, validación y pruebas visuales del PR; corregir cualquier regresión.
- [x] R8. Fusionar, desplegar y verificar las pruebas del navegador sobre el sitio publicado.
- [x] R9. Archivar el expediente SDD solo después de que toda la evidencia sea correcta.

## Evidencia

- PR #30 integrado: https://github.com/ElFast-dev/Prisma/pull/30
- Calidad, SDD y pruebas funcionales del PR: https://github.com/ElFast-dev/Prisma/actions/runs/39545427965
- Validación de Prisma en el PR: https://github.com/ElFast-dev/Prisma/actions/runs/39545427969
- Pruebas visuales de escritorio y móvil del PR: https://github.com/ElFast-dev/Prisma/actions/runs/39545428014
- Calidad/SDD en `main`: https://github.com/ElFast-dev/Prisma/actions/runs/39545580099
- Validación de Prisma en `main`: https://github.com/ElFast-dev/Prisma/actions/runs/39545579965
- Despliegue de GitHub Pages: https://github.com/ElFast-dev/Prisma/actions/runs/39545579972
- Pruebas visuales posteriores al despliegue: https://github.com/ElFast-dev/Prisma/actions/runs/39545617416

## Resultado y límites

Equilibrado, Más afines y Más variedad ahora se comparan mediante nDCG@5 por separado sobre las mismas candidatas retenidas y los mismos pliegues. Las notas retenidas no se entregan al predictor ni al algoritmo que ordena la lista; se usan de forma aislada para calcular la ganancia de evaluación. Jaccard sigue midiendo diversidad de géneros en las listas actuales del catálogo, de forma independiente.

Los pesos de recomendación y las exclusiones no se modificaron. nDCG@5 y Jaccard son indicadores offline/locales, no garantías de satisfacción, serendipia, significación estadística ni preferencias futuras.
