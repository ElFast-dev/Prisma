# Diseño: evaluación local de orden y diversidad

## Base de la investigación

- Cañamares, Castells y Moffat (2020), [Offline evaluation options for recommender systems](https://doi.org/10.1007/s10791-020-09371-3): los resultados offline pueden cambiar según cómo se separen los datos, se elijan candidatos y se aplique una métrica.
- Castells y Moffat (2022), [Offline recommender system evaluation: Challenges and new directions](https://doi.org/10.1002/aaai.12051): explica por qué la evaluación debe corresponder a la tarea y por qué precisión y descubrimiento no se reducen a una sola métrica.
- Jesse, Bauer y Jannach (2023), [Intra-list similarity and human diversity perceptions of recommendations: the details matter](https://doi.org/10.1007/s11257-022-09351-w): la disimilitud entre los artículos de una lista es una medida usada para aproximar diversidad, pero los detalles y la percepción humana importan.
- Jeunen, Potapov y Ustimenko (2024), [On (Normalised) Discounted Cumulative Gain as an Off-Policy Evaluation Metric for Top-n Recommendation](https://doi.org/10.1145/3637528.3671687): estudia nDCG en evaluación de recomendaciones top-N.
- ACM Transactions on Recommender Systems (2026), [Improving Methodological Standards in Recommender Systems Offline Evaluation](https://doi.org/10.1145/3800587): resalta el riesgo de comparaciones offline mal configuradas y la necesidad de baselines y metodología reproducible.

Estos trabajos sustentan el método de medición y sus cautelas; no prueban que los pesos actuales de Prisma sean óptimos ni que el diagnóstico sustituya una evaluación con la persona usuaria.

## Decisiones técnicas

- Añadir `js/recommendations/evaluation.js` como un servicio de dominio separado. Recibe por inyección las valoraciones, búsqueda de metadatos, extracción de características, creación de perfil, predictor y ranking actual. No importa el DOM ni lee directamente estado global.
- Conservar solo una observación por identidad TMDB; si un registro no tiene ID, usar título normalizado y año. Se evalúan únicamente notas válidas con al menos una característica enlazada.
- Asignar las películas a cinco pliegues con un hash estable de su identidad y un reparto equilibrado por índice. En cada iteración, entrenar con los otros cuatro pliegues y ordenar únicamente las películas explícitamente valoradas del pliegue retenido. Los metadatos de una película pueden describir el candidato; su nota queda excluida del perfil de entrenamiento.
- Calcular ganancia graduada `max(0, rating - 6)`. Para cada pliegue, `DCG@5 = sum(gain_i / log2(rank_i + 1))`, con rango de posiciones comenzando en 1. Dividir la suma de DCG por la suma del DCG ideal de los pliegues con al menos un elemento relevante. Los empates de predicción se resuelven por identidad/título estable, nunca por la nota retenida.
- Umbrales explícitos: 50 observaciones únicas con características (al menos 10 candidatas por pliegue para nDCG@5 significativo) y 10 valoraciones con nota >= 7. Si no se cumplen, el resultado lleva `available: false`, motivo y contadores, no un cero ficticio.
- Para cada modo de ranking, calcular diversidad del top 5 en los candidatos disponibles en el catálogo actual. Convertir géneros conocidos a claves normalizadas y hallar la distancia de Jaccard `1 - |A ∩ B| / |A ∪ B|` por cada par que tenga géneros en ambas películas; informar la media, pares medidos, cantidad de títulos y géneros únicos. Si no hay pares comparables, la diversidad es `null`.
- En UI, presentar el nDCG con los tamaños de muestra y la regla de relevancia. Mostrar una fila por modo con disimilitud de géneros y cantidad de películas/géneros. No comparar los números como si fueran satisfacción, serendipia ni significación estadística.
- No modificar las puntuaciones del motor ni las constantes de ranking. Los resultados sirven como instrumentación para una iteración de calibración posterior.
- Añadir el módulo a `APP_ASSETS`, mantener sincronizados el test de caché y el manifiesto/entrada si es necesario, e incrementar la versión de shell para actualizar instalaciones PWA.

## Riesgos

- Un historial individual es pequeño y sesgado por las películas que la persona decidió ver. Se marca la medida como experimental y se exige una muestra mínima alta.
- El umbral de nota 7 y las ganancias no equivalen a una verdad universal de relevancia; solo operacionalizan la nota explícita de esta persona para esta evaluación.
- La diversidad por géneros puede considerar muy similares películas que difieren por tema, tono o dirección y no mide serendipia.
- La validación de ranking sobre películas valoradas no valida directamente la satisfacción de futuras recomendaciones desconocidas. No se harán tales afirmaciones.
