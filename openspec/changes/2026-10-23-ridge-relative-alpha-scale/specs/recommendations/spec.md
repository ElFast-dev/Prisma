# Delta de especificación: diagnóstico de escala Ridge

## ADDED Requirements

### Requirement: Medición de escala del kernel Ridge sin fuga de información

El evaluador de Ridge DEBE medir la escala solo a partir de la matriz del conjunto de entrenamiento correspondiente. La escala primaria DEBE ser la media de la diagonal del kernel centrado, con estadísticas de distribución y estado de disponibilidad explícitos. Ningún pliegue de validación o prueba puede contribuir a la escala empleada para el ajuste evaluado.

#### Scenario: Ajuste de entrenamiento interior

- **WHEN** se ajusta un candidato con un pliegue interior
- **THEN** la media, mínimo, mediana y máximo de la diagonal centrada se calculan usando únicamente los índices de ese entrenamiento interior
- **AND** los índices de validación interior quedan excluidos de la escala y de la matriz usada para ajustar el modelo.

#### Scenario: Escala degenerada o numéricamente inválida

- **WHEN** la escala no es finita o no supera el umbral numérico documentado
- **THEN** el candidato relativo queda no disponible con un motivo explícito
- **AND** no se sustituye la escala por cero, uno arbitrario ni alpha cero.

### Requirement: Comparación anidada de regularización absoluta y relativa

El evaluador DEBE comparar la selección por MAE y por ranking de alpha absoluto con la selección por MAE y por ranking de lambda relativo, usando las mismas particiones exteriores e interiores y manteniendo la referencia aditiva emparejada.

#### Scenario: Comparación de dos criterios

- **WHEN** ambos criterios cuentan con validación interior suficiente
- **THEN** el informe separa alpha/lambda seleccionados, alpha efectivo, MAE exterior y nDCG@5 por modo
- **AND** reporta deltas, cobertura real, victorias, empates, derrotas y selección del límite inferior por criterio.

#### Scenario: Sin muestra suficiente para ranking

- **WHEN** una partición no alcanza los mínimos de ranking existentes
- **THEN** la variante de ranking figura no disponible con motivo explícito
- **AND** la evaluación por MAE puede continuar independientemente.

### Requirement: Aislamiento del recomendador activo y privacidad del diagnóstico

El experimento relativo DEBE permanecer en la ruta diagnóstica y no alterar el baseline aditivo, los pesos de producción ni el ranking activo. El informe compartible DEBE excluir títulos, IDs, notas individuales, características concretas y predicciones por película.

#### Scenario: Ejecución cancelada

- **WHEN** el usuario invalida la evaluación durante un cálculo asíncrono
- **THEN** no se publica un resultado parcial como completo y el progreso se detiene de forma cooperativa.

#### Scenario: Comparación repetida personal

- **WHEN** el informe agrega tres repeticiones de un historial personal
- **THEN** se etiqueta como comparación descriptiva dependiente y no como tres muestras independientes ni evidencia estadística concluyente.
