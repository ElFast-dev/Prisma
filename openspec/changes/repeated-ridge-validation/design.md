# Diseño: validación Ridge repetida

## Protocolo
Mantener intacta la primera evaluación de cinco pliegues como referencia compatible. Añadir tres pasadas completas de validación cruzada anidada de cinco pliegues. La primera pasada reutiliza exactamente la partición histórica `ridge-outer`; las dos siguientes usan sales fijas distintas y deterministas. El selector de alpha recibe un salt que identifica tanto la repetición como el pliegue externo, sin usar la nota retenida en la selección.

## Métricas agregadas
- MAE Ridge y MAE aditivo por cada repetición y agrupados a través de las 15 evaluaciones externas.
- Recuentos de pliegues donde Ridge gana, empata o pierde en MAE.
- nDCG@5 por modo agregado con la ganancia ideal correspondiente a cada pliegue; además, recuentos de victorias/empates/derrotas y nDCG por repetición.
- Los reportes identifican 3 repeticiones, 5 pliegues por repetición y 15 pliegues externos acumulados.

## Coste y experiencia
La evaluación es explícita bajo demanda, nunca durante cada renderizado. El Laboratorio comunica que se están calculando 3 × 5 pliegues. La validación repetida multiplica el cómputo de Ridge; las métricas históricas de una sola pasada permanecen visibles para hacer la comparación transparente.

## Privacidad y producción
Solo se serializan métricas agregadas y resúmenes por repetición; no se incluyen filas, identidades ni errores individuales. La variante experimental no modifica el motor de recomendaciones activo.

## Validación
Probar determinismo, separación interna/externa, cobertura exacta de pliegues, dirección de diferencias, umbrales de nDCG y serialización sin datos individuales. Sincronizar el versionado PWA e integrar requisitos SDD antes de fusionar.
