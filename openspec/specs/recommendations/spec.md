# Recomendador personal

## Requirements

### Requirement: Perfil explicable basado en señales disponibles

Prisma DEBE basar sus predicciones en señales que existan en los registros, como géneros y etiquetas, y mostrar una explicación que no atribuya al modelo información que no tiene.

#### Scenario: Película con coincidencias de perfil

- DADO que una película comparte géneros o etiquetas con el historial valorado
- CUANDO se calcula una predicción
- ENTONCES la explicación identifica señales coincidentes disponibles en el perfil

#### Scenario: Película sin metadatos suficientes

- DADO que una película carece de características vinculadas al perfil
- CUANDO se calcula una predicción
- ENTONCES la explicación comunica la falta de señales en vez de inventar motivos

### Requirement: Puntuaciones acotadas

Prisma DEBE mantener las puntuaciones predichas dentro del rango de 1 a 10 y distinguir una estimación del usuario de una valoración real del usuario.

#### Scenario: Perfil todavía inicial

- DADO que hay pocos registros personales con metadatos enlazados
- CUANDO se muestran recomendaciones
- ENTONCES el resultado se presenta como una estimación de confianza limitada

### Requirement: Exclusión de películas ya conocidas

Prisma DEBE excluir de candidatos las películas ya valoradas, vistas, pendientes u ocultas, así como registros que solo representan una importación del historial sin metadatos de catálogo suficientes para descubrimiento.

#### Scenario: Película ya valorada

- DADO que una película forma parte de las valoraciones personales
- CUANDO se construye la lista de recomendaciones
- ENTONCES no aparece como un nuevo descubrimiento

### Requirement: Evaluación con muestra útil

El laboratorio DEBE evitar presentar la evaluación experimental como disponible cuando no hay una muestra mínima útil.

#### Scenario: Menos de cinco valoraciones con características

- DADO que hay menos de cinco valoraciones válidas con características enlazadas
- CUANDO se calcula la evaluación experimental
- ENTONCES no se muestra un error medio como si tuviera una muestra suficiente

## Limitaciones conocidas

El algoritmo actual es una línea base heurística basada en géneros y etiquetas. Sus puntuaciones son aproximaciones explicables y no una garantía de gusto futuro ni una validación científica.


### Requirement: Recomendaciones únicas y exclusión fiable de la colección

Prisma DEBE mostrar como máximo una tarjeta por película en las recomendaciones. La identidad primaria DEBE ser un ID TMDB positivo; sin IDs, se DEBE usar el título normalizado y el año disponible, y no fusionar remakes con IDs TMDB distintos. Las recomendaciones DEBEN excluir las películas vistas, valoradas, pendientes u ocultas incluso cuando una de las entradas carezca de ID.

#### Scenario: Película duplicada con el mismo ID TMDB

- DADO que el catálogo contiene varias entradas con el mismo ID TMDB
- CUANDO se calcula «Recomendadas para ti»
- ENTONCES solo se muestra una tarjeta para esa película

#### Scenario: Remakes con IDs diferentes

- DADO que dos películas tienen el mismo título pero IDs TMDB distintos
- CUANDO se deduplican candidatos
- ENTONCES cada película conserva su propia identidad

#### Scenario: Película ya vista o valorada

- DADO que una película pertenece al historial personal
- CUANDO aparece en las fuentes del catálogo local o remoto de Descubrir
- ENTONCES no se muestra como una película nueva

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

### Requirement: Puntuación consciente del tipo de señal y su cobertura

Prisma DEBE ponderar con mayor influencia directa los géneros que las etiquetas/keywords poco respaldadas al calcular una estimación. Las características de la candidata que todavía no tienen evidencia en el perfil DEBEN reducir proporcionalmente la corrección respecto a la nota media, no inventar una preferencia. La explicación DEBE reflejar las contribuciones efectivas y la confianza DEBE tener en cuenta la cobertura de características y el soporte del historial.

#### Scenario: Género y etiqueta apuntan en sentidos opuestos

- DADO un perfil donde el peso aprendido de un género es positivo y el peso aprendido de una etiqueta es negativo con magnitudes equivalentes
- CUANDO se predice una película con ambas señales
- ENTONCES la señal de género tiene mayor influencia directa en la nota estimada

#### Scenario: Una parte de los metadatos no se conoce

- DADO una película con varias características y solo una señal con peso aprendido
- CUANDO se calcula su estimación
- ENTONCES las características sin evidencia reducen la corrección respecto a la nota media del perfil

#### Scenario: Cobertura baja de las señales

- DADO un perfil amplio pero una película candidata con una única coincidencia y muchas características desconocidas
- CUANDO se predice su nota
- ENTONCES no se declara confianza moderada ni se describen las características desconocidas como preferencias

#### Scenario: Varias señales con respaldo

- DADO una película cuyas señales aprendidas cubren la mayoría de sus características y hay coincidencias repetidas en el historial
- CUANDO se calcula la predicción
- ENTONCES la confianza puede ser moderada y la explicación muestra contribuciones relevantes

#### Scenario: Nota predicha extrema

- DADO que las señales aprendidas producirían una puntuación fuera del rango permitido
- CUANDO Prisma calcula la nota estimada
- ENTONCES la limita al rango de 1 a 10


### Requirement: Modos de recomendación ajustables

Prisma DEBE ofrecer Equilibrado como modo predeterminado y permitir elegir Más afines o Más variedad. Los modos DEBEN conservar exclusiones de la colección e identidad única; la preferencia DEBE guardarse solo en el dispositivo y mantenerse separada del perfil personal exportable.

#### Scenario: Afinidad frente a variedad

- DADO que hay candidatas con puntuaciones estimadas comparables
- CUANDO se elige Más afines o Más variedad
- ENTONCES Más afines prioriza la puntuación prevista y sus señales coincidentes, mientras Más variedad favorece géneros menos representados con una penalización moderada

#### Scenario: Equilibrado como opción inicial

- DADO que no existe una elección válida guardada
- CUANDO se abre Descubrir
- ENTONCES se utiliza Equilibrado y su control aparece como activo

#### Scenario: Preferencia guardada localmente

- DADO que el usuario escoge Más variedad
- CUANDO recarga la aplicación en el mismo navegador
- ENTONCES se restaura esa elección sin enviar la preferencia ni el perfil a un servidor

#### Scenario: Fallo de localStorage

- DADO que el navegador bloquea localStorage
- CUANDO Prisma lee o cambia la preferencia
- ENTONCES la aplicación continúa sin error y usa Equilibrado al no disponer de un modo guardado

#### Scenario: Colección excluida con todos los modos

- DADO que una candidata pertenece a vistas, valoradas, pendientes u ocultas
- CUANDO se generan recomendaciones con cualquiera de los tres modos
- ENTONCES esa candidata no aparece como nuevo descubrimiento


### Requirement: Señal de década de estreno de influencia secundaria

Prisma DEBE usar la década de estreno como señal contextual débil cuando el año sea válido y esté disponible. Su influencia directa DEBE ser inferior a la de género y etiqueta; la ausencia o invalidez del año NO DEBE producir una época inventada. La explicación DEBE describir la década en lenguaje legible y la señal por sí sola NO DEBE elevar la confianza a moderada.

#### Scenario: Característica temporal válida

- DADO un registro de película con año o fecha de estreno fiable
- CUANDO se extraen características para el recomendador
- ENTONCES Prisma genera una única señal de década y le asigna una influencia inferior a las de género y etiqueta

#### Scenario: Fecha ausente

- DADO un registro sin año o fecha de estreno válido
- CUANDO se calculan características
- ENTONCES Prisma no produce una señal temporal ni deduce la época de la fecha en que se vio la película

### Requirement: Evaluación aislada de la señal de década

El Laboratorio DEBE comparar la predicción completa con una variante que excluye década, usando las mismas muestras retenidas y el mismo pliegue de entrenamiento. El efecto específico de la década DEBE mostrarse solo cuando al menos cinco muestras evaluadas tengan año válido; Prisma NO DEBE autoajustar pesos a partir de esta evaluación experimental.

#### Scenario: Comparación por ablación

- DADO un historial con al menos cinco películas evaluables y años válidos
- CUANDO se ejecuta la evaluación leave-one-out
- ENTONCES Prisma informa de si incluir la década reduce, mantiene o aumenta el MAE frente a la misma variante sin década

#### Scenario: Años insuficientes para medir el efecto

- DADO un historial con menos de cinco películas evaluadas con año válido
- CUANDO se renderiza el Laboratorio
- ENTONCES se explica que faltan datos para valorar por separado la señal de década y no se presenta un efecto numérico


### Requirement: Evaluación offline de la calidad del orden

Prisma DEBE medir de forma experimental el orden de las películas valoradas retenidas usando nDCG@5 y pliegues de prueba que no participan en la creación del perfil usado para predecirlas. La evaluación DEBE indicar el tamaño de la muestra y DEBE permanecer no disponible cuando haya menos de 50 registros únicos con características o menos de 10 notas relevantes (7 o más). Los empates no DEBEN resolverse usando la nota retenida.

#### Scenario: Perfil sin la nota de prueba

- DADO un historial con suficientes valoraciones enlazadas
- CUANDO Prisma evalúa el ranking en un pliegue
- ENTONCES las notas del pliegue retenido no participan en el perfil y los candidatos de prueba se ordenan por la predicción, sin usar su nota real para desempatar

#### Scenario: Muestra insuficiente para top cinco

- DADO que existen menos de 50 películas únicas con características o menos de 10 valoraciones con nota 7 o superior
- CUANDO se abre el Laboratorio
- ENTONCES el nDCG@5 se presenta como no disponible e informa los contadores y el mínimo requerido

#### Scenario: Nota relevante ordenada correctamente

- DADO un conjunto de prueba en el que el orden previsto coincide con el orden de relevancia graduada de las notas
- CUANDO se calcula nDCG@5
- ENTONCES la métrica alcanza 1 dentro del margen numérico de precisión


### Requirement: Diagnóstico de diversidad de género de las listas

Prisma DEBE describir la diversidad por géneros de las listas top cinco de Equilibrado, Más afines y Más variedad usando la disimilitud Jaccard media entre pares comparables. El diagnóstico DEBE informar el tamaño de lista, pares comparables y géneros distintos, y NO DEBE presentarse como una medida de serendipia ni de satisfacción de la persona.

#### Scenario: Comparación de los modos

- DADO un catálogo con candidatos y metadatos de género
- CUANDO se abre el Laboratorio
- ENTONCES se informa la disimilitud de género de los primeros cinco resultados de cada modo sin cambiar sus puntuaciones

#### Scenario: Lista sin suficientes géneros

- DADO que hay menos de dos películas con géneros comparables en la lista
- CUANDO se calcula el diagnóstico de diversidad
- ENTONCES la métrica se muestra como no disponible e informa que faltan metadatos comparables
