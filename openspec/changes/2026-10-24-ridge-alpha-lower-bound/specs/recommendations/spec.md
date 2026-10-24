# Delta de especificación: rejilla Ridge de límite inferior ampliado

## ADDED Requirements

### Requirement: Explorar regularización Ridge sin ampliar el coste de la evaluación predeterminada

El evaluador Ridge DEBE conservar la rejilla histórica cuando no se solicite la opción extendida. La batería diagnóstica de un solo paso del Laboratorio DEBE solicitar explícitamente la rejilla extendida para analizar el límite inferior. Los resultados experimentales NO DEBEN modificar por sí solos el modelo, los pesos ni el ranking de producción. La rejilla extendida DEBE incluir los valores históricos, añadir valores positivos por debajo del mínimo histórico y mantener un orden determinista.

#### Scenario: API de evaluación sin opción extendida

- **WHEN** se ejecuta el evaluador Ridge sin `includeExtendedAlphaGrid: true`
- **THEN** utiliza la rejilla histórica de 14 valores
- **AND** el resultado declara esa rejilla sin fingir que probó valores inferiores.

#### Scenario: Batería diagnóstica del Laboratorio

- **WHEN** se abre el Laboratorio y su coordinador solicita la comparación Ridge extendida
- **THEN** MAE y ranking usan la misma rejilla extendida en la validación interior
- **AND** el informe declara exactamente la rejilla usada y sus estadísticas de límite
- **AND** el modelo de producción permanece aditivo.

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
