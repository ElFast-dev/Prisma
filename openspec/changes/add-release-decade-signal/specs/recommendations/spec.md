## ADDED Requirements

### Requirement: Señal de década de estreno de influencia secundaria

Prisma DEBE usar la década de estreno como señal contextual débil cuando el año de la película sea válido y esté disponible. La influencia directa DEBE ser inferior a la de los géneros y a la de las etiquetas/keywords; la ausencia o invalidez del año NO DEBE generar una década inventada. La explicación DEBE describir la década de manera comprensible y la señal, por sí sola, NO DEBE elevar la confianza a moderada.

#### Scenario: Año válido

- DADO una película cuyo año de estreno válido está disponible
- CUANDO Prisma extrae las características para el recomendador
- ENTONCES genera una característica para la década correspondiente y la pondera por debajo del género y de las etiquetas

#### Scenario: Año ausente o inválido

- DADO un registro sin año de estreno fiable
- CUANDO Prisma extrae características
- ENTONCES no crea una característica temporal ni trata la fecha de visionado como fecha de estreno

#### Scenario: Explicación de la señal temporal

- DADO que la década aprendida contribuye de manera efectiva a la estimación
- CUANDO Prisma explica una recomendación
- ENTONCES describe la contribución como una década legible y no atribuye preferencias a años desconocidos

### Requirement: Evaluación aislada de la señal de década

La evaluación experimental DEBE comparar el modelo actual y la variante sin señal de década con las mismas particiones leave-one-out, sin modificar datos de entrenamiento o prueba entre variantes. El Laboratorio DEBE mostrar el efecto de la década solo cuando haya al menos cinco muestras evaluadas con año de estreno válido y NO DEBE ajustar automáticamente los pesos a partir de ese resultado.

#### Scenario: Comparación justa de las variantes

- DADO un historial con suficiente información para la evaluación leave-one-out
- CUANDO se calcula la evaluación del modelo
- ENTONCES compara el MAE del modelo completo y el MAE sin década sobre las mismas películas retenidas

#### Scenario: Años válidos insuficientes

- DADO que menos de cinco películas evaluadas contienen un año válido
- CUANDO se muestra el Laboratorio
- ENTONCES explica que faltan datos para evaluar por separado la década y no presenta un efecto numérico como evidencia suficiente

#### Scenario: Efecto de la década

- DADO que al menos cinco películas evaluadas tienen año válido
- CUANDO el modelo con década tiene un MAE menor, igual o mayor que la variante sin década
- ENTONCES el Laboratorio informa de la mejora, ausencia de efecto o empeoramiento sin reinterpretar un empeoramiento como mejora
