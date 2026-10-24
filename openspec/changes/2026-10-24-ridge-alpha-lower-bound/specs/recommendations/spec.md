# Delta de especificación: rejilla Ridge de límite inferior ampliado

## ADDED Requirements

### Requirement: Explorar regularización Ridge sin ampliar el coste de la evaluación predeterminada

El Laboratorio DEBE conservar la rejilla histórica en su evaluación automática y solo DEBE usar la rejilla extendida cuando se solicite explícitamente el experimento manual. La rejilla extendida DEBE incluir los valores históricos, añadir valores positivos por debajo del mínimo histórico y mantener orden determinista.

#### Scenario: Evaluación automática

- **WHEN** el Laboratorio ejecuta su batería predeterminada sin solicitar el experimento extendido
- **THEN** Ridge usa la rejilla histórica y conserva el coste/flujo de ejecución actual
- **AND** los resultados no afirman que se exploraron valores de la rejilla extendida.

#### Scenario: Experimento extendido solicitado

- **WHEN** el usuario inicia explícitamente el experimento de escala relativa Ridge
- **THEN** ambos criterios de selección usan la rejilla extendida en la validación interior
- **AND** el resultado declara exactamente la rejilla utilizada y la estadística del límite inferior se refiere a su valor mínimo.

### Requirement: Selección anidada sin fuga de parámetros

Prisma DEBE seleccionar alpha por MAE y por nDCG@5 solo con particiones interiores construidas desde el entrenamiento exterior. Los pliegues exteriores DEBEN reservarse para evaluación emparejada final contra la referencia aditiva.

#### Scenario: El pliegue exterior evalúa, no selecciona

- **WHEN** termina la selección interna de un pliegue exterior
- **THEN** las notas exteriores solo contribuyen a MAE y ranking de evaluación
- **AND** no afectan la rejilla, alpha/lambda seleccionados ni escala de entrenamiento.

#### Scenario: Extremo inferior seleccionado repetidamente

- **WHEN** el alpha más pequeño de la rejilla extendida se elige en la mayoría de los pliegues evaluados
- **THEN** el informe marca el límite como no resuelto
- **AND** la elección no provoca por sí sola una reducción posterior de alpha ni activa Ridge en producción.
