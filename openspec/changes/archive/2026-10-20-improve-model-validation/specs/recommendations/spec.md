## ADDED Requirements

### Requirement: Evaluación del recomendador con identidad y referencia comparables

La evaluación experimental DEBE resolver las películas retenidas por ID TMDB cuando esté disponible, calcular el MAE del modelo y el de una referencia basada en la media de las notas del pliegue de entrenamiento sobre las mismas muestras, e informar el tamaño de muestra. Prisma DEBE mostrar la mejora relativa solo si el MAE de referencia es positivo y DEBE explicar por qué no está disponible la evaluación cuando hay menos de cinco películas con características enlazadas.

#### Scenario: Remakes con el mismo título durante la validación

- DADO que dos películas valoradas comparten título pero tienen IDs TMDB diferentes
- CUANDO la validación leave-one-out evalúa cada película
- ENTONCES cada predicción usa las características de la película retenida con su ID correspondiente

#### Scenario: Comparación con un predictor base

- DADO que hay al menos cinco películas valoradas con características enlazadas y la referencia tiene MAE positivo
- CUANDO el laboratorio muestra la validación
- ENTONCES presenta el MAE del modelo, el MAE de referencia, el tamaño de muestra y la mejora relativa, que puede ser negativa

#### Scenario: Referencia perfecta

- DADO que la media de las notas de entrenamiento produce un MAE base igual a cero
- CUANDO el laboratorio muestra la validación
- ENTONCES no calcula ni muestra un porcentaje de mejora indefinido

#### Scenario: Muestra insuficiente

- DADO que hay menos de cinco películas valoradas con características enlazadas
- CUANDO se muestra el laboratorio
- ENTONCES la evaluación indica que faltan datos e informa del mínimo necesario sin inventar una métrica
