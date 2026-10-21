# Diseño: evaluación comparable de los modos de recomendación

## Fundamento metodológico

- Cañamares, Castells y Moffat (2020), [Offline evaluation options for recommender systems](https://doi.org/10.1007/s10791-020-09371-3): la partición, el conjunto de candidatos y el protocolo influyen en los resultados offline.
- Castells y Moffat (2022), [Offline recommender system evaluation: Challenges and new directions](https://doi.org/10.1002/aaai.12051): la evaluación debe ser adecuada a la tarea y sus límites deben explicitarse.
- Jeunen, Potapov y Ustimenko (2024), [On (Normalised) Discounted Cumulative Gain as an Off-Policy Evaluation Metric for Top-n Recommendation](https://doi.org/10.1145/3637528.3671687): analiza el uso e interpretación de nDCG en recomendaciones top-N.

Estas referencias respaldan el protocolo comparable y sus cautelas; no prueban que un modo sea el mejor para cada usuario.

## Decisiones técnicas

- Extraer `rankCandidates(candidates, limit, mode)` de la lógica que usa Descubrir y exportarla desde `createRecommendationRanking`. La función no lee catálogo, estado, DOM ni almacenamiento y copia las candidatas antes de ordenarlas.
- En cada partición determinista del historial, construir el perfil usando únicamente los cuatro pliegues de entrenamiento. La candidata retenida puede mantener sus metadatos, pero su nota solo se convierte en ganancia de relevancia para medir el orden después de que se hayan calculado las predicciones.
- Para cada pliegue, generar una única lista de candidatas puntuadas y pasársela a Equilibrado, Más afines y Más variedad. Las tres variantes reciben las mismas identidades y el mismo predictor; únicamente varía la regla de ranking.
- Usar la función de producción `rankCandidates` para ordenar las candidatas retenidas. Calcular nDCG@5 con ganancia `max(0, rating - 6)`, descuento `log2(rank + 1)`, y agregar DCG/ideal DCG sobre los mismos pliegues para cada modo.
- Mantener los mínimos de 50 observaciones únicas con características y 10 notas relevantes de 7 o más. Si no se cumplen, el panel explica el mínimo requerido y no muestra un falso cero.
- Mantener la diversidad Jaccard de las primeras cinco películas del catálogo actual como medida separada: su conjunto de candidatas es distinto al pliegue offline, por lo que no debe mezclarse con nDCG ni describirse como la misma evaluación.
- No ajustar automáticamente pesos ni modificar las selecciones del usuario. Las diferencias pueden orientar un experimento posterior, pero por sí solas no prueban satisfacción, diversidad percibida, significación estadística ni comportamiento sobre todas las películas aún no vistas.
- Actualizar las versiones de entrada y caché PWA coordinadamente para entregar la evaluación renovada a instalaciones existentes.

## Riesgos y mitigaciones

- El historial personal es seleccionado por lo que la persona decidió ver; se exige muestra mínima y se etiqueta el indicador como offline.
- La métrica está limitada al conjunto de películas valoradas retenidas, no a todo TMDB. La interfaz expone esa distinción.
- La diversidad del catálogo actual puede variar a medida que cambien los metadatos; sigue siendo independiente del nDCG de las particiones.
