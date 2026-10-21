## ADDED Requirements

### Requirement: Resumen agregado de consistencia de validación Ridge

El experimento Ridge DEBE resumir la dirección y el rango observado de las métricas agregadas por repetición, separándolos de los contadores por pliegue. Un delta positivo DEBE significar que Ridge favorece en MAE cuando se calcula base menos Ridge y en nDCG@5 cuando se calcula Ridge menos base. La síntesis DEBE conservar únicamente agregados y NO DEBE cambiar el modelo activo.

#### Scenario: Resumir MAE y nDCG@5 disponibles

- DADO que la validación repetida tiene al menos una repetición con MAE o nDCG@5 disponible
- CUANDO se calcula el resumen de consistencia
- ENTONCES Prisma informa el número de repeticiones favorables a Ridge, empates y resultados favorables a la base, además de los mínimos y máximos observados

#### Scenario: Métrica no disponible en una repetición

- DADO que una repetición no tiene una comparación de nDCG@5 válida
- CUANDO se calcula el resumen de ese modo
- ENTONCES esa repetición se omite del denominador de la métrica y Prisma no sustituye el dato faltante por cero

#### Scenario: Mantener separación entre experimento y producción

- DADO que se muestra un resumen favorable a Ridge
- CUANDO el usuario vuelve a Descubrir
- ENTONCES las recomendaciones siguen usando el modelo aditivo y no se interpretan las repeticiones como muestras independientes o prueba de significación
