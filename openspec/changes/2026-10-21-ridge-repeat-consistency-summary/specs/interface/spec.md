## ADDED Requirements

### Requirement: Mostrar consistencia entre repeticiones de Ridge

El Laboratorio DEBE mostrar, de forma diferenciada de la estabilidad por pliegue, cuántas repeticiones favorecen a Ridge y el rango de diferencias MAE y nDCG@5 observado cuando la métrica está disponible. La interfaz DEBE indicar que el rango describe las repeticiones realizadas sobre el mismo historial y NO constituye un intervalo de confianza.

#### Scenario: Lectura rápida de consistencia

- DADO que las métricas por repetición están disponibles
- CUANDO el usuario consulta el experimento Ridge
- ENTONCES puede distinguir el resultado agregado por repetición del recuento de victorias, empates y derrotas por pliegue

#### Scenario: Advertencia de interpretación

- DADO que se presentan recuentos y rangos de tres repeticiones
- CUANDO la persona consulta el resumen
- ENTONCES Prisma explica que son medidas descriptivas sobre el mismo historial, no evidencia estadística independiente
