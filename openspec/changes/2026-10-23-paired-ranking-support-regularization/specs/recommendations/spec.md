## ADDED Requirements

### Requirement: Validación repetida, emparejada y sin fuga

Prisma DEBE comparar las cuatro familias de características mediante tres repeticiones de cinco pliegues externos, compartiendo en cada repetición las identidades de entrenamiento y prueba entre todos los comparadores. DEBE informar MAE y nDCG@5 por modo con relevancia >=7 y >=9, con métricas por pliegue y por repetición y victorias/empates/derrotas emparejadas. NO DEBE presentar los 15 pliegues como observaciones independientes de 15 historiales de usuario.

#### Scenario: Identidades y remakes

- DADO que dos películas comparten título/año aproximado pero tienen IDs TMDB distintos
- CUANDO se deduplican valoraciones para formar pliegues
- ENTONCES las identidades TMDB se mantienen separadas y cada ID solo puede aparecer en un conjunto de prueba por repetición.

#### Scenario: Particiones comunes

- DADO que se comparan familias y lambdas diferentes
- CUANDO se evalúa una repetición
- ENTONCES todos los modelos emplean los mismos índices de prueba y entrenamiento en cada pliegue exterior.

#### Scenario: Umbrales de relevancia

- DADO un pliegue que no contiene ganancia positiva para un umbral
- CUANDO se calcula nDCG@5
- ENTONCES ese resultado se marca como no disponible, sin reemplazarlo por cero ni consultar la nota exterior durante la selección del modelo.

### Requirement: Contracción diagnóstica por soporte

Prisma DEBE comparar una rejilla declarada de lambda, incluido lambda=0, aplicando `w' = w * n/(n+lambda)` a una copia del perfil entrenado. Las características de soporte uno NO DEBEN eliminarse automáticamente. La selección de lambda DEBE permanecer dentro de los pliegues internos del entrenamiento exterior. La variante NO DEBE influir en recomendaciones activas.

#### Scenario: Soporte singular

- DADO que una característica tiene soporte uno en el entrenamiento
- CUANDO lambda es mayor que cero
- ENTONCES su peso se atenúa según la fórmula, se mantiene la característica y se informa el efecto agregado de su tipo.

### Requirement: Selección interna de alpha Ridge por dos criterios

Prisma DEBE evaluar alphas menores que 0,1 y comparar la selección interna por MAE con selección interna por nDCG@5. Las dos estrategias DEBEN compartir pliegues internos dentro de cada pliegue exterior y SOLO las etiquetas internas podrán intervenir en la selección. Los resultados se contrastan en los pliegues externos sin alterar producción.

#### Scenario: Criterios internos emparejados

- DADO un conjunto de entrenamiento exterior con muestra suficiente para medir nDCG@5
- CUANDO Prisma selecciona alpha mediante validación interna por MAE y, por separado, por ranking
- ENTONCES ambas estrategias utilizan los mismos pliegues internos y se comparan en el mismo pliegue exterior, sin consultar sus notas retenidas para seleccionar el parámetro

### Requirement: Privacidad y disponibilidad de candidatas

El informe compartible DEBE excluir etiquetas concretas de características por defecto y conservar únicamente agregados por tipo. El Laboratorio DEBE distinguir candidatas remotas, candidatas locales elegibles, resultados disponibles y límite solicitado/retornado. El déficit de diversidad DEBE explicarse a partir del tamaño real del pool y de filtros aplicados, no suponerse un defecto sin reproducción.

#### Scenario: Informe compartible por defecto

- DADO un perfil que incluye nombres de señales como temas, directores o reparto
- CUANDO el usuario copia el diagnóstico sin optar expresamente por incluir etiquetas
- ENTONCES el JSON contiene `featureLabelsIncluded=false`, agregados por tipo y ningún nombre concreto de característica.
