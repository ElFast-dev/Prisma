## ADDED Requirements

### Requirement: Diagnóstico de estabilidad por pliegue de Ridge

El experimento Ridge DEBE informar recuentos agregados de victorias, empates y derrotas frente al predictor aditivo por pliegue externo, tanto para el MAE como para cada modo de nDCG@5 cuando la métrica esté disponible. El diagnóstico NO DEBE exponer filas por película ni tratar cinco pliegues como prueba de significación estadística.

#### Scenario: Estabilidad del error de nota

- DADO que Ridge y el predictor aditivo se evalúan sobre las mismas filas externas
- CUANDO termina la evaluación
- ENTONCES el resultado informa cuántos pliegues favorecen a Ridge, empatan o favorecen la base, y esos recuentos suman los pliegues evaluados

#### Scenario: Estabilidad del ranking por modo

- DADO que nDCG@5 está disponible
- CUANDO se muestra el resultado por Equilibrado, Más afines y Más variedad
- ENTONCES cada modo informa los pliegues válidos donde Ridge gana, empata o pierde y los recuentos suman sus pliegues evaluados

#### Scenario: Privacidad y límites estadísticos

- DADO que se exporta el informe de diagnóstico
- CUANDO se incluyen los nuevos indicadores
- ENTONCES solo se exportan recuentos agregados y se explica que estos no demuestran significación estadística ni garantizan satisfacción futura
