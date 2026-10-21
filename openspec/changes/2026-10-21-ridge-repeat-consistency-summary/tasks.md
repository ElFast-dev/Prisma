# Tareas: resumen de consistencia Ridge

- [x] RS1. Registrar alcance, cálculo, límites y escenarios de aceptación en SDD.
- [x] RS2. Implementar un resumen puro de dirección y rango a partir de métricas por repetición.
- [x] RS3. Mostrar por separado consistencia entre repeticiones y victorias por pliegue en el Laboratorio.
- [x] RS4. Añadir pruebas unitarias y contratos de integración de UI/caché.
- [x] RS5. Actualizar el mapa de arquitectura, el versionado de activos y la verificación visual.
- [ ] RS6. Confirmar validación, calidad estática y Playwright en el PR.
- [ ] RS7. Archivar los artefactos SDD después de integrar la mejora.

## Criterios de aceptación

- Las diferencias positivas se interpretan coherentemente como favorables a Ridge tanto para MAE como para nDCG@5.
- La métrica muestra cuántas repeticiones favorecen cada modelo y el rango observado de diferencias.
- Las métricas ausentes no se convierten en ceros.
- El resumen no se presenta como significación estadística, no añade datos individuales y no activa Ridge en producción.
