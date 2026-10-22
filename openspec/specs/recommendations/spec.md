# Recomendador personal

## Requirements

### Requirement: Aprendizaje desde notas y metadatos cinematográficos, sin emociones

Prisma DEBE aprender de las notas personales del 1 al 10 y de características cinematográficas verificables. Puede utilizar géneros, palabras clave, sinopsis, reparto, dirección, guion, música, productoras, países, idiomas, franquicia, duración y década cuando existan metadatos fiables. NO DEBE usar emociones, sentimientos, análisis de sentimientos ni comentarios personales como señales de recomendación.

#### Scenario: Primera película valorada positivamente

- DADO un perfil vacío y una primera película con nota 10 y metadatos enlazados
- CUANDO Prisma construye el perfil y puntúa otras candidatas
- ENTONCES las características compartidas aportan señales positivas, la base se mantiene suavizada y la confianza no se presenta como alta

#### Scenario: Primera película valorada negativamente

- DADO un perfil vacío y una primera película con nota 1 y metadatos enlazados
- CUANDO Prisma construye el perfil y puntúa otras candidatas
- ENTONCES sus características aportan señales negativas respecto a candidatas sin esas coincidencias

#### Scenario: Características cinematográficas adicionales

- DADO que TMDB proporciona créditos, palabras clave o detalles técnicos
- CUANDO Prisma normaliza la ficha
- ENTONCES utiliza solo los campos recibidos y no inventa datos ausentes

#### Scenario: Campos emocionales antiguos

- DADO que una importación contiene los campos heredados `emotions` o `note`
- CUANDO se construye el perfil o se predice una candidata
- ENTONCES estos campos no generan características ni modifican la predicción

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

El algoritmo actual es una línea base heurística que usa géneros, palabras clave, términos disponibles de la sinopsis, reparto, dirección, guion, música y otros metadatos cinematográficos verificables. Sus pesos no han demostrado ser óptimos y sus puntuaciones son aproximaciones explicables, no una garantía de gusto futuro ni una validación científica. Para la identidad se prioriza el ID TMDB; en su ausencia se usa título normalizado y año fiable. Los registros incompletos ambiguos deben mantenerse separados en vez de atribuirse a un remake por conjetura.


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


### Requirement: Comparación offline de los modos de ranking

Prisma DEBE calcular nDCG@5 por separado para Equilibrado, Más afines y Más variedad con el mismo conjunto de candidatas retenidas y la misma partición determinista de cinco pliegues. Cada perfil de entrenamiento DEBE excluir todas las valoraciones de su pliegue de prueba. La diversidad de géneros de las recomendaciones del catálogo actual DEBE presentarse como un diagnóstico separado, no como parte del nDCG.

#### Scenario: Comparación justa entre modos

- DADO un historial con suficientes películas valoradas y características enlazadas
- CUANDO el Laboratorio compara los tres modos
- ENTONCES cada modo recibe las mismas candidatas de cada pliegue de prueba y presenta su nDCG@5 por separado

#### Scenario: Sin fuga de valoraciones retenidas

- DADO un pliegue de evaluación con notas personales retenidas
- CUANDO se entrena el perfil para predecir su orden
- ENTONCES ninguna de las notas retenidas participa en la construcción de ese perfil

#### Scenario: Datos insuficientes

- DADO que el historial no cumple los mínimos de observaciones y relevancia
- CUANDO el Laboratorio calcula el ranking offline
- ENTONCES los tres modos indican que la métrica no está disponible, sin sustituirla por cero ni cambiar sus pesos

#### Scenario: Separación entre calidad y diversidad

- DADO que los tres modos tienen nDCG@5 calculado y listas actuales de recomendación
- CUANDO se muestran los diagnósticos
- ENTONCES nDCG@5 describe el orden entre candidatas valoradas retenidas y Jaccard describe por separado la diversidad de géneros en las listas actuales


### Requirement: Diferencia descriptiva de nDCG frente a Más afines

Cuando la evaluación por modo está disponible, Prisma DEBE mostrar para Equilibrado y Más variedad la diferencia absoluta de nDCG@5 frente a Más afines, calculada con las mismas muestras y pliegues. El Laboratorio DEBE identificar Más afines como referencia y DEBE explicar que esta diferencia es descriptiva, no una prueba de significación estadística ni de satisfacción. Si la métrica de referencia no está disponible, Prisma DEBE indicarlo en vez de fabricar una diferencia.

#### Scenario: Mostrar la diferencia entre modos

- DADO que nDCG@5 está disponible para Más afines y para otro modo
- CUANDO se muestra el diagnóstico de calidad del ranking
- ENTONCES el otro modo muestra su nDCG@5 y su diferencia con respecto a Más afines en la misma línea

#### Scenario: Usar Más afines como referencia

- DADO el modo Más afines
- CUANDO se muestran sus resultados
- ENTONCES se identifica como referencia y su diferencia propia no se presenta como una mejora

#### Scenario: Referencia no disponible

- DADO que la evaluación de Más afines no está disponible
- CUANDO otro modo presenta un resultado
- ENTONCES no se calcula ni muestra una diferencia numérica sin referencia válida

#### Scenario: No exagerar las diferencias pequeñas

- DADO que la diferencia entre dos modos es pequeña
- CUANDO el Laboratorio la presenta
- ENTONCES la describe como diferencia numérica y aclara que no demuestra una mejora estadísticamente significativa


### Requirement: Informe de diagnóstico del recomendador con datos locales

Prisma DEBE permitir generar bajo demanda un informe reproducible con las métricas de evaluación calculadas sobre las valoraciones locales reales. El informe DEBE ser agregado y NO DEBE incluir títulos, IDs TMDB, registros individuales de valoraciones, fechas personales, emociones, notas libres, credenciales ni copias de seguridad. La interfaz DEBE enumerar los tipos de datos incluidos antes de copiarlo y DEBE dejar claro que las estadísticas agregadas de señales pueden revelar parte de los gustos de la persona. Prisma NO DEBE transmitir ni guardar el informe de forma automática.

#### Scenario: Copiar diagnóstico

- DADO que el usuario está en el Laboratorio
- CUANDO pulsa «Copiar diagnóstico técnico»
- ENTONCES Prisma genera un informe con los recuentos de muestra, distribución agregada de notas, cobertura de metadatos, resumen de señales, MAE, comparación de modos nDCG@5 y diversidad disponible

#### Scenario: Privacidad del informe

- DADO que el informe se ha generado usando valoraciones reales
- CUANDO se inspecciona su contenido
- ENTONCES no contiene títulos, identificadores TMDB, filas de películas, notas libres, emociones, fechas personales ni credenciales

#### Scenario: Portapapeles no disponible

- DADO que el navegador deniega el portapapeles o no ofrece la API
- CUANDO el usuario intenta copiar el informe
- ENTONCES Prisma mantiene el contenido en un campo visible que se puede seleccionar manualmente y no afirma que la copia haya funcionado


### Requirement: Pool híbrido de candidatas para recomendaciones personales

Prisma DEBE combinar candidatas válidas del catálogo local con resultados populares de TMDB cargados durante la sesión y puntuar ambas fuentes con el mismo perfil personal y el mismo ranking. Las consultas de búsqueda manual NO DEBEN reemplazar el pool genérico de populares. Las candidatas remotas NO DEBEN persistirse automáticamente.

#### Scenario: Candidatas populares cargadas

- DADO que TMDB ha devuelto una página de películas populares
- CUANDO se recalculan las recomendaciones
- ENTONCES las películas nuevas elegibles entran en el ranking local junto con el catálogo personal, sin guardarse automáticamente

#### Scenario: Paginación de películas populares

- DADO que se carga una página adicional de películas populares
- CUANDO termina la consulta
- ENTONCES el pool temporal incorpora las nuevas candidatas y elimina identidades duplicadas sin borrar las páginas ya cargadas

#### Scenario: Búsqueda manual separada

- DADO que se ejecuta una búsqueda de películas por texto
- CUANDO llegan sus resultados
- ENTONCES la lista de recomendaciones sigue utilizando el pool genérico de populares y no se adapta el endpoint a las valoraciones personales

#### Scenario: Exclusión de la colección

- DADO que una candidata remota o local está valorada, vista, pendiente u oculta
- CUANDO se construye la lista final
- ENTONCES se excluye en todos los modos de ranking


#### Scenario: Fallo al actualizar películas populares

- DADO que ya existe un pool válido de candidatas y falla una nueva consulta de películas populares
- CUANDO termina la petición fallida
- ENTONCES Prisma conserva las candidatas anteriores en memoria y mantiene disponible el ranking, sin crear ni persistir registros nuevos


### Requirement: Evaluación experimental de regularización por soporte de temas

Prisma DEBE poder comparar de forma local el modelo activo con una variante de diagnóstico que atenúe temas respaldados por pocas valoraciones. La comparación DEBE usar las mismas muestras leave-one-out, entrenar ambos perfiles sin la nota retenida y calcular el MAE para cada variante. La variante experimental NO DEBE cambiar las recomendaciones activas de forma automática.

#### Scenario: Tema poco respaldado

- DADO un tema presente en una única película valorada del pliegue de entrenamiento
- CUANDO se construye el perfil experimental con regularización por soporte
- ENTONCES su peso se multiplica por un tercio y el perfil base permanece sin cambios

#### Scenario: Comparación con la misma muestra

- DADO un conjunto de películas evaluables
- CUANDO se comparan las dos variantes
- ENTONCES ambas predicciones usan la misma película retenida y el mismo conjunto de entrenamiento por cada iteración

#### Scenario: Datos insuficientes

- DADO que hay menos de cinco películas valoradas con características
- CUANDO se calcula el Laboratorio
- ENTONCES la evaluación experimental se muestra como no disponible en vez de inventar una cifra

#### Scenario: Conservar el modelo activo

- DADO que existe una puntuación regularizada experimental
- CUANDO Prisma recomienda películas durante el uso normal
- ENTONCES sigue usando el perfil base y no la variante experimental hasta que una decisión separada se apoye en los resultados


### Requirement: Experimento comparativo Ridge local

El Laboratorio DEBE permitir evaluar una variante Ridge con regularización L2 de forma local y bajo demanda. La selección de alpha DEBE ocurrir en pliegues internos del entrenamiento y la comparación con la base aditiva DEBE usar exactamente las mismas películas retenidas externas. El resultado NO DEBE modificar automáticamente el modelo activo ni contener filas individuales en diagnósticos compartidos.

#### Scenario: Selección de regularización sin fuga

- DADO que hay al menos 30 valoraciones únicas válidas con características
- CUANDO se ejecuta el experimento Ridge
- ENTONCES alpha se selecciona dentro del entrenamiento de cada uno de cinco pliegues externos mediante tres pliegues internos, y ambas variantes se comparan sobre las mismas filas externas

#### Scenario: Muestra insuficiente o error numérico

- DADO que hay menos de 30 valoraciones únicas o un sistema no puede resolverse de forma estable
- CUANDO se ejecuta el experimento Ridge
- ENTONCES Prisma informa que el experimento no está disponible en lugar de mostrar una métrica parcial o inventada


### Requirement: Comparación del orden con Ridge

El experimento Ridge DEBE comparar el orden producido por Ridge y el predictor aditivo sobre las mismas candidatas retenidas y los mismos pliegues externos. DEBE reutilizar los tres modos de ranking, calcular nDCG@5 con ganancia graduada para valoraciones de 7 o más y mantenerse local y agregado; NO DEBE cambiar el predictor ni el ranking activo.

#### Scenario: Comparación emparejada de modos

- DADO que hay al menos 50 películas únicas con características y 10 valoraciones de 7 o más
- CUANDO se completa el experimento Ridge
- ENTONCES Equilibrado, Más afines y Más variedad informan nDCG@5 de ambos modelos sobre las mismas películas retenidas por pliegue

#### Scenario: Muestra insuficiente para el ranking

- DADO que hay menos de 50 películas únicas evaluables o menos de 10 valoraciones de 7 o más
- CUANDO se completa el experimento Ridge
- ENTONCES nDCG@5 se marca como no disponible con motivo y recuento, sin ceros ficticios

#### Scenario: Preservar producción y privacidad

- DADO que el experimento produce métricas Ridge de MAE y nDCG@5
- CUANDO Prisma recomienda películas o exporta el diagnóstico
- ENTONCES el motor activo permanece aditivo y el informe incluye solo métricas agregadas sin identidades ni puntuaciones individuales

### Requirement: Diagnóstico agregado de estabilidad por pliegue de Ridge

El experimento Ridge DEBE resumir cuántos pliegues externos favorecen a Ridge, empatan o favorecen al predictor aditivo para el MAE y, por cada modo disponible, para nDCG@5. Estos datos DEBEN ser agregados y descriptivos; NO DEBEN exponer métricas individuales por película ni presentarse como prueba de significación estadística. La variante Ridge NO DEBE modificar automáticamente el modelo activo.

#### Scenario: Recuento de estabilidad de MAE

- DADO que termina una evaluación Ridge con pliegues externos válidos
- CUANDO el Laboratorio muestra la comparación de MAE
- ENTONCES informa las victorias, empates y derrotas por pliegue y sus recuentos suman el total evaluado

#### Scenario: Recuento de estabilidad de nDCG por modo

- DADO que nDCG@5 está disponible para un modo de ranking
- CUANDO el Laboratorio presenta su comparación con Ridge
- ENTONCES informa los pliegues válidos donde Ridge gana, empata o pierde, sin mezclar los resultados de los distintos modos

#### Scenario: Compartir sin datos individuales

- DADO que se genera un informe técnico
- CUANDO incluye estabilidad por pliegue
- ENTONCES únicamente serializa recuentos agregados y conserva la advertencia de que estos resultados no prueban significación estadística

### Requirement: Validación Ridge repetida para evaluar sensibilidad a particiones

El Laboratorio DEBE poder evaluar Ridge en tres repeticiones deterministas de cinco pliegues externos y selección anidada de alpha mediante tres pliegues internos. DEBE conservar la evaluación histórica de cinco pliegues separada. Los resultados repetidos DEBEN incluir métricas agregadas globales y resúmenes agregados por repetición, con MAE, nDCG@5 por modo y recuentos de victorias/empates/derrotas. La interfaz DEBE explicar que son análisis de sensibilidad del mismo historial, no pruebas de significación estadística. El experimento NO DEBE alterar automáticamente las recomendaciones activas ni exportar resultados por película.

#### Scenario: Repeticiones con particiones distintas

- DADO que hay al menos 30 películas únicas valoradas con características
- CUANDO se ejecuta la validación repetida
- ENTONCES se evalúan tres pasadas deterministas de cinco pliegues y alpha se selecciona únicamente con el entrenamiento interno de cada pliegue externo

#### Scenario: Agregados comparables

- DADO que termina el experimento repetido
- CUANDO se presentan sus resultados
- ENTONCES se muestran MAE y nDCG@5 globales y por repetición, y los modelos comparados usan las mismas películas retenidas por pliegue

#### Scenario: Límites de interpretación y privacidad

- DADO que el informe incluye resultados de varias repeticiones
- CUANDO se exporta el diagnóstico
- ENTONCES contiene solo métricas agregadas, sin errores o predicciones individuales, y aclara que las repeticiones no son muestras independientes

### Requirement: Resumen agregado de consistencia de validación Ridge

El experimento Ridge DEBE resumir la dirección y el rango observado de las métricas agregadas por repetición, separándolos de los contadores por pliegue. Un delta positivo DEBE significar que Ridge favorece en MAE cuando se calcula base menos Ridge y en nDCG@5 cuando se calcula Ridge menos base. La síntesis DEBE conservar únicamente agregados y NO DEBE cambiar el modelo activo.

#### Scenario: Resumir MAE y nDCG@5 disponibles

- DADO que la validación repetida tiene al menos una repetición con MAE o nDCG@5 disponible
- CUANDO se calcula el resumen de consistencia
- ENTONCES Prisma informa el número de repeticiones favorables a Ridge, empates y resultados favorables a la base, además de los mínimos y máximos observados

#### Scenario: Métrica no disponible en una repetición

- DADO que una repetición no tiene una comparación de nDCG@5 válida
- CUANDO se calcula el resumen de ese modo
- ENTONCES esa repetición se omite del denominador de la métrica y Prisma no sustituye el dato faltante por cero

#### Scenario: Mantener separación entre experimento y producción

- DADO que se muestra un resumen favorable a Ridge
- CUANDO el usuario vuelve a Descubrir
- ENTONCES las recomendaciones siguen usando el modelo aditivo y no se interpretan las repeticiones como muestras independientes o prueba de significación

### Requirement: Evaluación temporal de recomendaciones sin fuga de futuro

Prisma DEBE ofrecer un experimento temporal, local y bajo demanda que entrene con valoraciones de visionado anteriores a cada ventana exterior y pruebe con valoraciones posteriores. Por defecto, la fecha DEBE provenir de `watchedAt` válido en la valoración o su registro de visionado relacionado. Prisma NO DEBE convertir `updatedAt`, `addedAt` ni la fecha de estreno en una fecha de visionado confirmada. `updatedAt` y la fecha de estreno NUNCA DEBEN servir como proxy. `addedAt` solo puede emplearse como proxy temporal exploratorio cuando la persona activa expresamente esa opción; entonces DEBE clasificarse como no verificado, nunca DEBE crear ni modificar `watchedAt` y el resultado DEBE etiquetarse como exploratorio. La selección de alpha DEBE usar solamente ventanas de validación temporal internas anteriores a la ventana exterior de prueba.

#### Scenario: Entrenar y probar en orden cronológico

- DADO que hay suficientes valoraciones únicas con características y fechas de visionado válidas
- CUANDO se ejecuta el experimento temporal
- ENTONCES cada ventana se predice con un perfil construido solo con registros de días anteriores y las notas de su prueba no participan en el entrenamiento ni en la selección de alpha

#### Scenario: Fecha de visionado ausente o inválida

- DADO que una valoración no tiene una fecha `watchedAt` válida ni un registro de visionado relacionado
- CUANDO se prepara la muestra temporal
- ENTONCES esa valoración no se usa para entrenar ni probar, y solo se informa su recuento agregado

#### Scenario: Editar una nota sin fecha de visionado fiable

- DADO que una valoración existente tiene `updatedAt` pero no tiene un `watchedAt` válido ni una fecha en el historial de visionados
- CUANDO se vuelve a guardar o editar la nota
- ENTONCES Prisma no debe crear `watchedAt` a partir de `updatedAt` y la valoración queda excluida de la evaluación temporal hasta que haya una fecha de visionado fiable

#### Scenario: Marcar una película explícitamente como vista

- DADO que una película no tiene una fecha de visionado previa
- CUANDO el usuario activa la acción explícita «marcar como vista»
- ENTONCES Prisma registra el momento de esa acción como `watchedAt`

#### Scenario: Procedencia incierta de fechas históricas

- DADO que una entrada antigua ya contiene `watchedAt` pero proviene de una versión que pudo copiar `updatedAt`
- CUANDO se muestra la evaluación temporal
- ENTONCES Prisma advierte que no puede certificar la procedencia de todas las fechas antiguas y no presenta esos resultados como evidencia concluyente

#### Scenario: Datos temporales insuficientes

- DADO que hay menos de 100 valoraciones únicas fechadas con características o menos de 12 días válidos distintos
- CUANDO se solicita la evaluación temporal
- ENTONCES Prisma informa que no está disponible y no presenta métricas inventadas

#### Scenario: Separar experimento y recomendaciones de producción

- DADO que termina la evaluación temporal
- CUANDO se vuelve a Descubrir o se exporta el diagnóstico
- ENTONCES el ranking activo continúa aditivo y el informe comparte únicamente métricas agregadas sin fechas, películas ni predicciones individuales

### Requirement: Procedencia de fechas en evaluación temporal

La evaluación temporal DEBE distinguir fechas de visionado importadas explícitamente, fechas generadas al registrar una acción y timestamps antiguos sin procedencia verificable. El importador NO DEBE interpretar `raw.a` (fecha de añadido) como `watchedAt`. Si existe una fecha explícita en el historial para una identidad, esta DEBE prevalecer sobre una fecha heredada sin procedencia. Los resultados que incluyan filas sin procedencia fiable DEBEN marcarse como exploratorios y compartir solo agregados.

#### Scenario: Importar colección con solo fecha de añadido

- DADO un registro que contiene `a` pero no `watchedAt` ni `watched_at`
- CUANDO se importa el historial
- ENTONCES Prisma conserva `a` como `addedAt` y no fabrica `watchedAt`

#### Scenario: Proxy de fecha de incorporación activado de forma explícita

- DADO un registro importado de la lista de vistas con `addedAtSource = "imported-collection"` y sin fecha de visionado fiable
- CUANDO la persona activa el proxy temporal y ejecuta la evaluación
- ENTONCES Prisma puede usar `addedAt` solo en ese experimento, cuenta la fila como no verificada, etiqueta el resultado como exploratorio y mantiene `watchedAt` intacto

#### Scenario: Proxy temporal desactivado por defecto

- DADO un registro que solo contiene `addedAt`
- CUANDO la persona no activa el proxy
- ENTONCES Prisma excluye esa fecha de la evaluación temporal y no crea un `watchedAt` derivado

#### Scenario: Etiquetas de resultados según la fuente temporal

- DADO que el proxy de fecha de incorporación está activo
- CUANDO se muestra la evaluación temporal
- ENTONCES Prisma etiqueta las ventanas, el conjunto de prueba y el nDCG como ordenados por fecha de incorporación, y no como fechas reales de visionado futuro

#### Scenario: Importar fecha explícita de visionado

- DADO un registro con el campo `watchedAt` o `watched_at` explícito
- CUANDO se importa el historial
- ENTONCES Prisma conserva la fecha y etiqueta la procedencia como importada explícitamente

#### Scenario: Conflicto entre fecha explícita y heredada

- DADO que una valoración tiene una marca `watchedAt` antigua sin fuente y su historial correspondiente tiene una fecha explícita
- CUANDO se prepara la muestra walk-forward
- ENTONCES prevalece la fecha explícita y la fila se cuenta como fecha de procedencia explícita

#### Scenario: Fechas heredadas

- DADO que una fila solo contiene una fecha antigua sin marcador fiable
- CUANDO se calcula la evaluación temporal
- ENTONCES puede participar solo en resultados exploratorios y los agregados distinguen esa fila de las fechas explícitas

#### Scenario: Privacidad

- DADO que se comparte el diagnóstico de la versión vigente
- CUANDO incluye procedencia de fechas
- ENTONCES exporta únicamente recuentos agregados y estado de fiabilidad, nunca fechas, títulos o IDs de películas


### Requirement: Evaluación diagnóstica aislada de una mezcla híbrida fija

Prisma DEBE ofrecer en el Laboratorio una comparación local y reproducible de una mezcla fija 50/50 entre las predicciones Ridge y el modelo aditivo sobre las mismas particiones externas de validación. La mezcla DEBE calcularse sin optimizar su proporción con las notas retenidas; DEBE informar MAE y, cuando se satisfagan los mínimos de ranking, nDCG@5 para Equilibrado, Más afines y Más variedad. El recomendador de producción DEBE seguir usando el modelo aditivo hasta que una propuesta independiente tenga evidencia suficiente y pase sus propios criterios de aceptación. Los resultados DEBEN describirse como diagnósticos experimentales, no como garantía de gusto futuro ni prueba de significación.

#### Scenario: Mezcla sin fuga de notas retenidas

- DADO un pliegue con candidatas retenidas fuera del entrenamiento
- CUANDO se calcula una predicción híbrida
- ENTONCES se usa la media acotada al rango 1–10 de las predicciones Ridge y aditiva, sin utilizar la nota real retenida para elegir el peso

#### Scenario: Ranking comparable entre modelos

- DADO que la muestra satisface los mínimos de evaluación de nDCG@5
- CUANDO el Laboratorio compara los modelos
- ENTONCES la base aditiva, Ridge y la mezcla usan las mismas candidatas, relevancias y particiones externas, y la mezcla informa sus diferencias y recuentos descriptivos por modo

#### Scenario: Muestra insuficiente para ranking

- DADO que la muestra no satisface los mínimos existentes para la evaluación de ranking
- CUANDO se ejecuta el experimento
- ENTONCES las métricas de ranking del híbrido se muestran como no disponibles, no como ceros medidos

#### Scenario: Separación de producción y privacidad

- DADO que se ha ejecutado el experimento híbrido y se genera el diagnóstico de la versión vigente
- CUANDO se muestran recomendaciones normales o se comparte el informe
- ENTONCES la producción sigue siendo aditiva y el informe contiene solo estadísticas agregadas, sin títulos, IDs TMDB, registros individuales ni fechas personales



### Requirement: Claves de género consistentes entre fuentes

Prisma DEBE normalizar los alias de género con la misma función canónica al construir el perfil de valoraciones y al puntuar candidatas. La clave DEBE ser independiente de mayúsculas/minúsculas, diacríticos y alias conocidos de localización. La normalización NO DEBE cambiar la identidad de la película ni mezclar géneros distintos.

#### Scenario: Historial inglés y candidata en español

- DADO que una valoración contiene el género `science fiction` y una candidata contiene `Ciencia ficción`
- CUANDO Prisma extrae características para perfil y candidata
- ENTONCES ambas producen la clave `género: ciencia ficción` y pueden coincidir

#### Scenario: Alias de un mismo género

- DADO que los datos mezclan `sci-fi`, `sci fi`, `ciencia ficción` y `ciencia ficcion`
- CUANDO se construyen las características
- ENTONCES todos los alias conocidos generan una sola señal canónica

#### Scenario: Ausencia de duplicados

- DADO que una fuente incluye repetidamente el mismo género mediante varios alias
- CUANDO Prisma normaliza el catálogo y las características
- ENTONCES conserva solo una característica de género canónica


### Requirement: Comparación aislada de normalización de influencia

Prisma DEBE permitir evaluar localmente el denominador de influencia actual frente a variantes diagnósticas con las mismas particiones y muestras externas. El denominador actual DEBE permanecer como predeterminado de producción. El experimento DEBE comparar MAE y estabilidad por pliegue, y nDCG@5 por modo cuando haya una muestra suficiente. Los resultados del experimento DEBEN mantenerse en memoria hasta que la persona decida copiarlos como estadísticas agregadas.

#### Scenario: Comparación sin fuga de valoraciones

- DADO un conjunto de valoraciones con características válidas
- CUANDO se ejecutan las variantes de normalización en el Laboratorio
- ENTONCES cada perfil de pliegue se entrena sin las valoraciones retenidas y las variantes comparten candidatas y particiones

#### Scenario: Penalización gradual de cobertura

- DADO que una candidata tiene menos características coincidentes que características totales
- CUANDO se prueba la variante \`coverage-sqrt\`
- ENTONCES la corrección conserva una penalización por señales desconocidas, pero menos agresiva que la media actual

#### Scenario: Control sin penalización de cobertura

- DADO que se ejecuta \`matched-only\`
- CUANDO se calcula la influencia
- ENTONCES solo se divide por las señales coincidentes y el resultado se etiqueta como diagnóstico exploratorio, no como configuración activa

#### Scenario: Separación de producción y privacidad

- DADO que finaliza el experimento
- CUANDO se vuelve a Descubrir o se copia el informe técnico
- ENTONCES el modelo activo sigue usando la normalización actual y el informe incluye solo métricas agregadas, sin títulos, IDs ni predicciones individuales


### Requirement: Semántica temporal local de los visionados

Prisma DEBE conservar la marca temporal original del registro y convertirla al día calendario de `America/Panama` al mostrar la fecha de visionado o agrupar filas en una evaluación temporal. La conversión de zona horaria NO DEBE sobrescribir ni truncar el instante almacenado. Para la exportación de reto diario reconocida, el primer día verificable es el 15 de enero de 2026, identificado por `Source Code` (TMDB 45612); las marcas anteriores de esa misma exportación DEBEN clasificarse como retrospectivas no verificadas y NO DEBEN alimentar la cronología, incluso cuando se active el proxy de fecha añadida. Una fecha confirmada manualmente DEBE prevalecer sobre este marcador.

#### Scenario: Una marca UTC cambia de día en Panamá

- DADO un visionado cuyo instante UTC es `2025-11-06T00:22:23.302Z`
- CUANDO Prisma calcula su día de visionado
- ENTONCES usa el 5 de noviembre de 2025 en `America/Panama` y conserva el instante UTC original

#### Scenario: Racha verificada del reto personal

- DADO la exportación Android v2 que contiene `Source Code` (TMDB 45612) el 15 de enero de 2026 según el día panameño
- CUANDO Prisma importa el historial y ejecuta la evaluación temporal
- ENTONCES considera los visionados del 15 de enero en adelante, excluye del cómputo las marcas anteriores no verificadas y agrupa varias películas de un mismo día como un día calendario

#### Scenario: Proxy habilitado con marcas retrospectivas

- DADO un registro previo al 15 de enero de 2026 marcado como `pre-streak-unverified`
- CUANDO se activa el proxy experimental de fechas añadidas
- ENTONCES el proxy no lo convierte en un día de visionado válido ni lo presenta como una fecha confirmada

#### Scenario: Fecha confirmada por la persona

- DADO un registro retrospectivo con una fecha de visionado posteriormente confirmada de forma manual
- CUANDO Prisma vuelve a importar el historial
- ENTONCES conserva la fecha confirmada manualmente sin reemplazarla por la marca retrospectiva


### Requirement: Exclusión por identidad conservadora

La exclusión de películas valoradas, vistas, pendientes u ocultas DEBE usar el ID TMDB cuando exista y aplicar el fallback por título/año cuando falte. Una correspondencia incompleta solo DEBE excluir una candidata si el título no es ambiguo y no contradice años o IDs conocidos.

#### Scenario: Candidata homónima de otro año

- DADO que la colección contiene una película de 1998 y TMDB devuelve una película homónima de 2024 con otra identidad
- CUANDO Prisma filtra candidatas de Descubrir
- ENTONCES no excluye la película de 2024 por compartir solamente el título

#### Scenario: Registro de colección incompleto y varios remakes

- DADO que una entrada personal sin ID ni año coincide en título con dos remakes TMDB diferentes
- CUANDO Prisma filtra las recomendaciones
- ENTONCES no asigna esa entrada a un remake arbitrario ni fusiona las dos identidades
