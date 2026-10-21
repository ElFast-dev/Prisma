## ADDED Requirements

### Requirement: Comparación local de ranking Ridge

El experimento Ridge DEBE comparar el modelo Ridge y el predictor aditivo sobre las mismas candidatas retenidas y los mismos cinco pliegues externos en cada modo de ranking. DEBE seleccionar alpha solamente con pliegues internos, calcular nDCG@5 con ganancia max(0, rating - 6), mantener resultados agregados y locales, y NO DEBE modificar las recomendaciones activas.

#### Scenario: Métricas emparejadas por modo

- DADO que hay al menos 50 películas únicas evaluables y 10 valoraciones de 7 o más
- CUANDO se ejecuta el experimento Ridge
- ENTONCES el Laboratorio informa nDCG@5 aditivo, nDCG@5 Ridge y la diferencia Ridge menos aditivo para Equilibrado, Más afines y Más variedad sobre idénticos pliegues

#### Scenario: Datos insuficientes

- DADO que hay menos de 50 películas evaluables o menos de 10 valoraciones relevantes
- CUANDO termina la evaluación Ridge
- ENTONCES el ranking se marca como no disponible con motivo y recuento, sin inventar ceros

#### Scenario: Sin fuga de nota ni identificadores

- DADO que se ordenan películas de un pliegue externo
- CUANDO el ranker recibe candidatas
- ENTONCES no recibe la nota personal retenida ni los identificadores TMDB de las películas

#### Scenario: Se conserva la producción

- DADO que Ridge mejora MAE o nDCG@5 en el perfil local
- CUANDO Prisma genera recomendaciones normales
- ENTONCES el predictor y el ranking activos permanecen sin cambios hasta una decisión SDD posterior