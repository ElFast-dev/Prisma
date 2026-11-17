# Arquitectura de inteligencia cinematográfica de Espectro

**Alcance:** evolución interna de Espectro. Prisma conserva Personal · Descubrir · Espectro.  
**Principios:** local-first, privacidad por diseño, modelos comparados con evidencia, ausencia de cambios destructivos y funcionamiento útil sin modelos descargables.  
**Estado:** arquitectura objetivo. La sección «Estado implementado» distingue lo que ya existe de lo que todavía debe desarrollarse.

## 1. Decisión arquitectónica

Espectro evolucionará hacia un motor híbrido de aprendizaje de preferencias, no hacia una colección de estadísticas ni hacia una red neuronal monolítica.

La arquitectura tendrá cinco capas separadas:

1. **Evidencia cinematográfica:** metadatos verificables, procedencia, calidad y fecha de obtención.
2. **Representación:** vectores de características estructuradas, textuales y, cuando se justifique, semánticas.
3. **Aprendizaje personal:** modelos que relacionan características con las valoraciones y las elecciones explícitas del propietario.
4. **Descubrimiento y recomendación:** interacciones, ranking, nota prevista, incertidumbre y relaciones.
5. **Explicación y evaluación:** evidencia rastreable, validación fuera de muestra y métricas que deciden qué modelo se utiliza.

Cada capa debe poder probarse y cambiarse sin reconstruir Dexie, la navegación o el resto de Prisma.

## 2. Contrato de datos y procedencia

### 2.1 Fuentes

- **TMDB** continúa como fuente principal para identificadores, títulos, sinopsis, géneros, países de producción, idiomas, duración, palabras clave y créditos.
- **Wikidata** puede complementar las localizaciones geográficas que no son el país de producción: P915 para lugares de rodaje, P840 para ambientación narrativa y P625 para coordenadas. Cada relación debe conservar su fuente y la entidad geográfica a la que se refiere.
- Las sinopsis son texto de catálogo, no declaraciones del propietario. Una palabra extraída de una sinopsis no equivale a una etiqueta temática confirmada.
- Las valoraciones y los favoritos tienen significados diferentes: la nota es una observación de experiencia; el favorito es una preferencia declarada. Ninguno se sustituye por la valoración externa de TMDB.

### 2.2 Procedencia y calidad

A medida que se amplíe el modelo de metadatos, cada dato enriquecido deberá poder identificar, cuando la fuente lo permita:

- Fuente e identificador externo.
- Campo y entidad a la que corresponde.
- Fecha de consulta y versión del recurso.
- Estado: confirmado, inferido, incompleto o desconocido.
- Precisión o confianza de la relación.
- Motivo de cualquier transformación aplicada.

Los datos ausentes no se convierten en valores negativos. Un campo vacío significa que no hay evidencia local suficiente, no que la película carezca de esa característica.

La información geográfica debe conservar tres conceptos independientes: producción, rodaje y ambientación. No se deducirá un lugar de rodaje a partir de un país de producción.

### 2.3 Datos personales y cronología

Las valoraciones se analizan por película distinta. Los revisionados se conservan como experiencias separadas, pero no multiplican el número de películas que respaldan una preferencia. La agregación de notas por título debe permanecer explícita y el modelo de ranking puede estudiar por separado cambios entre visionados cuando existan datos suficientes.

Una fecha sin hora no establece el orden de dos películas vistas el mismo día. La zona horaria ausente tampoco se reconstruye. Las validaciones temporales deben agrupar las observaciones de una misma fecha y declarar sus limitaciones.

## 3. Representación multidimensional

Cada película se convertirá en una representación con varios canales. No se mezclarán indiscriminadamente datos de distinto significado.

### 3.1 Características estructuradas

- Géneros identificados por ID estable de TMDB.
- Dirección y, cuando haya cobertura fiable, guion, fotografía, montaje, música, producción y otros cargos de equipo.
- Reparto identificado por persona y no solamente por texto libre.
- Países e idiomas.
- Año o época, duración y otras variables numéricas.
- Palabras clave temáticas de TMDB, distinguidas de los términos extraídos de una sinopsis.

Los créditos se asignan a sus roles reales. Un integrante del equipo técnico no se clasifica automáticamente como director o guionista.

### 3.2 Representación textual

La sinopsis puede aportar señales léxicas antes de disponer de embeddings: términos y expresiones, ponderados según su frecuencia y capacidad para distinguir documentos. Esta representación permite descubrir lenguaje recurrente, pero no entiende por sí sola una emoción, una atmósfera ni el significado filosófico de una película.

Los términos frecuentes sin capacidad discriminativa, las palabras funcionales y las señales con procedencia insuficiente se filtran. La representación debe distinguir una palabra literal de una categoría narrativa inferida.

### 3.3 Representación semántica opcional

Una fase posterior podrá añadir embeddings multilingües preentrenados para comparar sinopsis y descripciones. El codificador permanecerá congelado: el aprendizaje personal se realizará en una capa pequeña y regularizada sobre los vectores, no entrenando un gran modelo desde cero con unas pocas centenas de valoraciones.

Las características semánticas conservarán el modelo, la versión, la licencia, el idioma, la configuración y la fecha de generación. El sistema no describirá una película como «melancólica», «existencial» o «surrealista» solo porque una similitud vectorial sea elevada. Esas interpretaciones necesitan un clasificador validado, una fuente explícita o una explicación prudente como hipótesis.

### 3.4 Normalización

Los canales se normalizan por separado para que una película con muchos actores o palabras no domine por cantidad de etiquetas. Las variables numéricas se escalan; las categorías utilizan identificadores estables; el texto usa ponderación estadística. Las señales ausentes se representan como ausentes, no como ceros semánticos.

La codificación y cualquier vocabulario aprendido se ajustan con el conjunto de entrenamiento de cada corte de validación. Así se evita utilizar información de las películas de prueba para preparar el modelo.

## 4. Arquitectura de aprendizaje

El flujo de aprendizaje será:

`Registros locales → control de calidad → representación → entrenamiento → validación → calibración → predicción y explicación`

### 4.1 Modelos de referencia

Todo modelo nuevo se compara, sobre exactamente los mismos títulos y cortes, con:

1. Promedio y mediana personal.
2. Predicción regularizada hacia el promedio, sin características.
3. Afinidades actuales de Espectro 2.3.
4. Modelo aditivo regularizado.
5. Modelo jerárquico o bayesiano de características.

Si un modelo complejo no supera estos controles, Espectro conserva el modelo más sencillo y fiable.

### 4.2 Modelos no lineales e interacciones

Se compararán modelos capaces de aprender relaciones más allá de la suma de efectos individuales:

- Árboles de decisión y bosques aleatorios: pueden aprender condiciones encadenadas e interacciones de varias características.
- Boosting de árboles: se evaluará con regularización y profundidad limitada.
- Modelos de kernel lineal, polinómico o RBF: permiten probar espacios de características no lineales.
- Factorization Machines y variantes con regularización de interacciones: representan interacciones de segundo orden mediante factores de bajo rango.
- Modelos bayesianos jerárquicos: comparten información entre características relacionadas y estabilizan estimaciones escasas.

Los parámetros se seleccionan solo en los cortes de validación. La complejidad no se considera una mejora en sí misma. Las interacciones de orden superior solo se conservarán si mejoran resultados fuera de muestra y mantienen estabilidad.

### 4.3 Redes neuronales

No se entrenará una red neuronal profunda desde cero con el historial personal actual. Una muestra pequeña no permite aprender de forma fiable un espacio cinematográfico de gran dimensión.

La vía neuronal razonable es:

1. Usar un codificador multilingüe preentrenado para generar embeddings de sinopsis.
2. Congelar el codificador y reutilizar sus vectores en el dispositivo.
3. Comparar la similitud semántica con el canal léxico y las características estructuradas.
4. Aprender una capa personal pequeña —por ejemplo, regresión regularizada o árboles— con las valoraciones reales.
5. Mantener el codificador como opción descargable, nunca como requisito para abrir Espectro.

Transformers.js utiliza ONNX Runtime para ejecutar modelos en el navegador. ONNX Runtime Web ofrece WASM como base de compatibilidad amplia y WebGPU como aceleración opcional; los operadores y navegadores compatibles no son idénticos. La arquitectura utilizará WASM como alternativa funcional y WebGPU solo cuando esté disponible y probado.

Fuentes técnicas: [Transformers.js](https://huggingface.co/docs/transformers.js/), [caché y modelos locales](https://huggingface.co/docs/transformers.js/api/env), [compatibilidad de ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript/web.html) y [proveedor WebGPU](https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html).

## 5. Evaluación científica

### 5.1 División de datos

La evaluación preferida es temporal y de origen global:

- Ordenar por fecha de experiencia válida.
- Mantener las películas de una fecha juntas.
- Entrenar únicamente con información anterior al corte.
- Ajustar hiperparámetros en ventanas históricas anteriores.
- Reservar el tramo final como prueba que no intervenga en la selección.
- Agrupar todas las valoraciones de una película dentro de la misma unidad para evitar fuga entre revisionados.

Si las fechas no permiten una evaluación temporal fiable, se utilizará una partición agrupada por película y se identificará como tal. No se llamará validación temporal a una división aleatoria.

Los metadatos actuales pueden no reflejar cuándo estuvieron disponibles históricamente. Mientras no haya fechas fiables de enriquecimiento, una prueba temporal medirá el cambio de preferencias, no necesariamente la capacidad exacta de recomendar con el catálogo que existía en aquella fecha.

### 5.2 Métricas

**Predicción de nota:** MAE, RMSE y error por segmentos de nota.

**Ranking:** precisión y recuperación en los primeros puestos, concordancia por pares, NDCG@K y ranking de títulos mejor valorados. Los empates se tratarán explícitamente.

**Calidad de catálogo:** cobertura de candidatas, diversidad entre recomendaciones, novedad y redundancia.

**Incertidumbre:** calibración de intervalos, cobertura observada, error por nivel de confianza y capacidad de abstenerse cuando faltan datos.

**Estabilidad:** variación de parámetros y hallazgos al retirar películas, modificar el corte temporal o incorporar nuevas valoraciones.

Las diferencias entre modelos se calcularán sobre predicciones pareadas de los mismos títulos. La incertidumbre se estimará respetando bloques temporales cuando proceda. No se cambiará de modelo por una mejora minúscula que no resulte estable.

### 5.3 Evolución tras nuevas valoraciones

Cada nueva película calificada actualiza el conjunto de entrenamiento. El modelo se vuelve a evaluar con la huella de entrada y la versión correspondientes. Los parámetros no se actualizarán con una nota aislada como si constituyera evidencia concluyente. Se conservará la referencia anterior para comprobar si la nueva versión mejora o se vuelve inestable.

## 6. Descubrimiento de interacciones

Las afinidades individuales responden a qué características se asocian con determinadas notas. El detector de interacciones responde a otra pregunta: qué combinaciones presentan un resultado distinto del esperado a partir de sus efectos individuales.

El procedimiento debe:

1. Construir un modelo aditivo de referencia.
2. Obtener predicciones fuera de muestra mediante validación cruzada: el título evaluado no participa en el ajuste que genera su expectativa.
3. Calcular el residuo entre la nota observada y la expectativa aditiva.
4. Explorar las parejas de características disponibles entre categorías distintas, sin una lista predefinida de combinaciones permitidas.
5. Contar títulos distintos y calcular dispersión, tamaño de efecto y variabilidad entre bloques.
6. Corregir las comparaciones múltiples mediante Benjamini–Yekutieli, conservador bajo dependencias entre hipótesis.
7. Presentar solo señales que superen tanto la corrección estadística como la comprobación de estabilidad.

Un patrón debe explicar las características que lo forman, títulos de respaldo, tamaño de muestra, nota observada, expectativa, diferencia, p y q ajustados, consistencia y limitaciones. Las asociaciones no establecen causalidad. La ausencia de hallazgos es un resultado válido.

La corrección múltiple no convierte automáticamente una prueba aproximada en una prueba causal o perfecta. Los resultados seguirán sujetos a calidad de metadatos, independencia de observaciones, tamaño de muestra y replicación posterior.

## 7. Recomendaciones

Cada candidata local se evaluará con la misma representación utilizada para aprender las preferencias. Los títulos con visionados permanecen fuera del flujo habitual; las películas Pendientes pueden competir cuando los metadatos permitan representarlas.

La salida mantendrá separados:

- **Encaje:** puntuación relativa para ordenar candidatas; nunca se muestra como probabilidad de que guste.
- **Nota estimada:** predicción personal en la escala de 0 a 10, acompañada de intervalo cuando la calibración lo permita.
- **Confianza:** fiabilidad estimada con errores fuera de muestra, cantidad/diversidad de evidencia y cobertura de características.

Los motivos pueden incluir afinidades, interacciones validadas, cercanía semántica y títulos comparables. Cada motivo debe poder trazarse hasta características y películas reales.

La lista combinará cuatro intenciones dentro de la experiencia ya existente: afinidad conocida, descubrimiento cercano, ampliación de intereses y contraste. La diversidad se optimizará después de estimar el mérito individual para no devolver doce variaciones de la misma película.

## 8. Grafo, atlas y evolución

### Grafo

El grafo utilizará entidades estables y relaciones tipadas: película, persona, tema, género, época, país y localización. Las aristas conservarán la razón de la conexión, fuente, confianza y soporte. Se priorizarán caminos relevantes, comunidades y películas puente; el usuario profundizará desde un elemento sin desplegar toda la red.

### Atlas

El Atlas mantendrá los alcances Mi Prisma y Cine mundial, y separará países de producción, sitios reales de rodaje y lugares narrativos. Wikidata podrá aportar P915, P840 y P625, con procedencia y precisión. Un punto desconocido no se colocará en un mapa por inferencia aproximada.

### Evolución

Se distinguirán preferencias estables, intereses recientes y señales circunstanciales. Los periodos se compararán con soporte suficiente y fechas válidas. Las tendencias no se inferirán de recuentos de actividad ni se presentarán como cambios permanentes por una pequeña muestra reciente.

## 9. Ejecución local y rendimiento

- El entrenamiento, las inferencias y los perfiles permanecen en el dispositivo.
- Los cálculos intensivos se moverán a un Web Worker para evitar bloquear la interfaz.
- El motor básico no dependerá de conexión ni de un modelo descargado.
- Los modelos semánticos se descargarán bajo demanda, con tamaño, licencia, versión y almacenamiento visibles.
- Una descarga incompleta o un navegador sin WebGPU debe volver al modo WASM o al motor clásico.
- Las inferencias se harán en lotes y reutilizarán embeddings, vectores y cachés cuya huella siga vigente.
- Se medirán memoria, tiempo de entrenamiento e inferencia, transferencia inicial, espacio persistente y consumo en Android físico antes de habilitar un modelo por defecto.

Transformers.js puede utilizar la Cache API del navegador y cachear los binarios WASM; la disponibilidad offline dependerá de haber completado la descarga y de las reglas de caché de Prisma. No se prometerá funcionamiento sin conexión antes de verificarlo en la PWA publicada.

## 10. Almacenamiento y privacidad

No se reconstruye el esquema Dexie. Los metadatos derivados y las instantáneas se guardan mediante los mecanismos existentes y claves versionadas. Cualquier nueva caché debe ser regenerable y prescindible.

Quedan fuera de alcance las escrituras sobre visionados, secuencias, calificaciones, fechas, comentarios, favoritos, estados de Biblioteca, colecciones, perfil y preferencias. El enriquecimiento solo puede parchear metadatos cinematográficos de películas ya existentes y estado técnico de la cola.

Las notas, el historial, los favoritos, los comentarios, el perfil y los embeddings personales no se envían a TMDB, Wikidata ni al proveedor del modelo. La descarga de un modelo obtiene archivos del modelo, nunca transmite el perfil personal.

Las pruebas utilizan películas ficticias e IndexedDB temporal. El respaldo personal no se incorpora a repositorios, artefactos de CI ni servicios externos.

## 11. Estado implementado y siguientes entregas

### Implementado en Espectro 2.4.0, 2.5.0 y 2.6.0

**Versión 2.4.0 — descubrimiento de interacciones**

- Búsqueda general de parejas de características de categorías distintas, sin lista cerrada de familias permitidas.
- Términos y expresiones de sinopsis como señales léxicas, separados de las palabras clave TMDB.
- Expectativa aditiva estimada fuera de muestra mediante cinco bloques deterministas.
- Corrección Benjamini–Yekutieli de comparaciones múltiples.
- Consistencia entre bloques y evidencia por películas distintas.
- Huella de entrada sensible a cambios de sinopsis y explicación dentro de Afinidades.

**Versión 2.5.0 — predicción no lineal local**

- Regresión Kernel Ridge con kernel gaussiano RBF, sin dependencia externa.
- Características estructuradas y TF‑IDF de términos y bigramas de sinopsis. Vocabulario, IDF y selección de términos se aprenden exclusivamente con películas calificadas.
- Una observación de entrenamiento por película distinta: los revisionados se promedian antes de entrenar.
- Sistema lineal regularizado resuelto con Cholesky; promedio personal como fallback cuando faltan rasgos, la muestra es demasiado pequeña o el sistema no puede resolverse de forma estable.
- Hasta tres películas similares del historial como evidencia descriptiva calculada con similitud coseno. No es probabilidad de gusto.
- La nota prevista utiliza el modelo RBF; el encaje conserva su escala relativa anterior y continúa siendo el orden principal de recomendaciones hasta validar un modelo de ranking separado.
- Los niveles de confianza existentes describen el respaldo de las afinidades; no son intervalos de predicción ni confianza calibrada del modelo RBF.
 
**Versión 2.6.0 — ranking por predicción personal**

- Ordena candidatas primero por la nota RBF prevista y utiliza el encaje relativo como desempate.
- Mantiene separadas nota prevista, encaje y respaldo explicable; el encaje no se interpreta como probabilidad.
- El cambio se apoya en una comparación temporal exploratoria del historial local. Es evidencia de un solo perfil y no demuestra que RBF supere a Ridge ni que esté calibrado.
- Los resultados numéricos derivados del historial personal no se incorporan a la documentación pública.

Los parámetros actuales son una configuración candidata. La exploración temporal inicial mostró una mejora pequeña de MAE frente a Ridge, pero no una mejora concluyente de NDCG ni una comparación externa definitiva contra el estimador histórico. No se presenta como modelo calibrado ni ganador definitivo.

### Siguientes entregas

1. **Evaluación predictiva independiente:** mantener validación temporal anidada, tramo final reservado y comparación pareada del RBF con promedios, Ridge, árboles, boosting y Factorization Machines; incluir MAE, RMSE, NDCG y estabilidad.
2. **Calibración y ranking:** calibrar intervalos/errores fuera de muestra y reemplazar el ranking por encaje solo si mejora la calidad de primeras recomendaciones de manera reproducible.
3. **Rendimiento Android:** mover entrenamiento e inferencia a Web Worker y medir memoria, latencia, batería y almacenamiento en dispositivos reales.
4. **Semántica local opcional:** embeddings multilingües preentrenados descargables, comparados contra TF‑IDF y metadatos sin transmitir historial personal.
5. **Recomendación y exploración:** diversidad, novedad, películas puente, contrastes, Atlas con procedencia y evolución temporal más profunda.

La navegación Personal · Descubrir · Espectro, las funciones ajenas a Espectro y los datos personales permanecen fuera de los cambios de esta arquitectura.
