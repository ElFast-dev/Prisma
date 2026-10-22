# Requisitos delta: calibración de influencia

## ADDED Requirements

### Requirement: Comparación aislada de normalización de influencia

Prisma DEBE permitir evaluar localmente el denominador de influencia actual frente a variantes diagnósticas con las mismas particiones y muestras externas. El denominador actual DEBE permanecer como predeterminado de producción. El experimento DEBE comparar MAE y estabilidad por pliegue, y nDCG@5 por modo cuando haya una muestra suficiente.

#### Scenario: Comparación sin fuga de valoraciones

- DADO un conjunto de valoraciones con características válidas
- CUANDO se ejecutan las variantes de normalización en el Laboratorio
- ENTONCES cada perfil de pliegue se entrena sin las valoraciones retenidas y las variantes comparten candidatas y particiones

#### Scenario: Penalización gradual de cobertura

- DADO que una candidata tiene menos características coincidentes que características totales
- CUANDO se prueba la variante \`coverage-sqrt\`
- ENTONCES la corrección conserva una penalización por señales desconocidas, pero menos agresiva que la media actual

#### Scenario: Control sin penalización de cobertura

- DADO que se ejecuta \`matched-only\`
- CUANDO se calcula la influencia
- ENTONCES solo se divide por las señales coincidentes y el resultado se etiqueta como diagnóstico exploratorio, no como configuración activa

#### Scenario: Separación de producción y privacidad

- DADO que finaliza el experimento
- CUANDO se vuelve a Descubrir o se copia el informe técnico
- ENTONCES el modelo activo sigue usando la normalización actual y el informe incluye solo métricas agregadas, sin títulos, IDs ni predicciones individuales
