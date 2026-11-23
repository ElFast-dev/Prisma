# Investigación de mejoras para Espectro — noviembre de 2026

**Fecha de corte de la revisión:** 23 de noviembre de 2026  
**Base de código revisada:** `main` tras los cambios de estabilidad, seguridad, accesibilidad de teclado y presupuesto de rendimiento.  
**Alcance:** análisis del código fuente de Espectro y revisión bibliográfica/técnica externa. No se usaron respaldos ni datos personales para esta investigación.

## Resumen ejecutivo

Espectro ya cuenta con una base diferenciadora: análisis local, separación entre valoraciones y favoritos, metadatos cinematográficos trazables a TMDB, agregación por películas distintas, un predictor Kernel Ridge con kernel RBF, descubrimiento de interacciones con validación cruzada y un Web Worker. La mayor oportunidad no consiste en añadir una red neuronal o más pantallas, sino en **mejorar la calidad de la evidencia con la que se evalúa y explica el modelo**.

La recomendación principal es establecer una evaluación temporal reproducible y comparar el RBF con referencias simples y bien ajustadas antes de modificar el algoritmo. Los estudios recientes de RecSys muestran que el protocolo temporal cambia de forma material los resultados y el orden entre modelos; la guía metodológica de ACM de 2026 insiste en ajustar también las referencias y conservar los artefactos para reproducir los experimentos. <https://doi.org/10.1145/3705328.3748164> · <https://doi.org/10.1145/3705328.3759329> · <https://doi.org/10.1145/3800587>

En paralelo, la visualización necesita alternativas tabulares completas. W3C trata los gráficos como imágenes complejas y recomienda una descripción extensa, estructurada y equivalente, no solo una etiqueta corta. Esta mejora se implementa en la rama de trabajo asociada a esta investigación.

## 1. Cómo es Espectro hoy

### Capacidades ya implementadas

- **Local-first:** las notas, favoritos, historial y análisis se leen desde IndexedDB. El cálculo se ejecuta en un Web Worker cuando el navegador lo permite y existe una instantánea versionada ligada a una huella de entrada.
- **Unidad estadística:** el predictor agrupa los revisionados por película y entrena sobre la media de sus notas; así, cuatro sesiones del mismo título no equivalen a cuatro películas independientes.
- **Representación:** combina rasgos estructurados (géneros, países, dirección, reparto, palabras clave, idioma, década y duración) con términos y bigramas TF-IDF de sinopsis. El vocabulario y el IDF se obtienen solo de las películas calificadas.
- **Predicción:** la versión 2.6.0 utiliza Kernel Ridge con kernel RBF, resuelve el sistema con Cholesky y recurre al promedio personal cuando no hay muestra suficiente o el sistema no se resuelve de forma estable.
- **Señales explicables:** afinidades ajustadas frente al promedio personal, favoritos declarados por separado, ejemplos de películas que sostienen rasgos y patrones de interacción calculados con cinco bloques cruzados y corrección Benjamini–Yekutieli.
- **Evolución temporal:** la comparación de periodos utiliza ventanas anteriores y recientes y exige soporte mínimo por rasgo; los revisionados se agregan por película.
- **Enriquecimiento controlado:** la información cinematográfica se completa mediante consultas por identificador TMDB, con cola reanudable. La lógica descrita no envía las valoraciones o comentarios personales a TMDB.
- **Experiencia actual:** Espectro es un panel de seis apartados. Las antiguas vistas separadas de mapa, afinidades, evolución y recomendaciones se retiraron; no se propone reintroducir una página de recomendaciones que contradiga esa arquitectura.

Fuentes de implementación: `src/domain/spectro.ts`, `src/domain/spectroPrediction.ts`, `src/domain/spectroInteractions.ts`, `src/domain/spectroWorkspace.ts`, `src/infrastructure/database/spectroRepository.ts`, `src/infrastructure/database/spectroMetadataService.ts`, `src/infrastructure/database/spectroQuestionService.ts`, `docs/SPECTRO.md` y `docs/SPECTRO-INTELLIGENCE-ARCHITECTURE.md`.

### Límites observados en el código y la documentación

1. **El RBF tiene parámetros fijos.** El código define `gamma = 0.5` y regularización `lambda = 0.25`. La documentación describe una comparación temporal exploratoria en un único perfil, pero no se encontró en el repositorio un pipeline reproducible que compare RBF con referencias, ajuste hiperparámetros en validación y reserve un tramo final intacto.
2. **Las señales de respaldo no son intervalos calibrados.** Las etiquetas `inicial`, `moderada`, `sólida` o `variable` se derivan de tamaño de muestra y dispersión de afinidades. No representan una probabilidad ni la cobertura de un intervalo del predictor.
3. **Los hallazgos de interacción son exploratorios.** La implementación usa residuos fuera de muestra y corrige múltiples comparaciones, pero la inferencia sigue dependiendo de la muestra, de la calidad de metadatos y de las hipótesis exploradas.
4. **Las sinopsis se piden en español mexicano (`es-MX`).** `original_language` se conserva como rasgo aparte, pero el texto localizado puede no ser la sinopsis original del idioma de la película. El TF-IDF reconoce palabras literales; no resuelve por sí solo paráfrasis o equivalencia semántica entre idiomas.
5. **El conjunto de candidatas es local.** No se trata de un catálogo universal ni de una búsqueda ilimitada. Cualquier futura diversificación debe operar sobre candidatas disponibles y presentarse en Descubrir, si se decide incorporarla.
6. **El coste del RBF crece con la muestra.** La matriz del kernel requiere memoria cuadrática y la factorización de Cholesky, tiempo cúbico. El Web Worker protege la fluidez de la interfaz, pero no elimina el uso de CPU, memoria o batería del dispositivo.
7. **Algunas gráficas solo tenían una etiqueta accesible de imagen.** Para una persona que navega con lector de pantalla, esa etiqueta no proporciona todos los valores, dimensiones ni relaciones del gráfico.

## 2. Evidencia externa y qué significa para Prisma

### 2.1 Evaluación temporal y prevención de fuga

El trabajo de Gusak y colaboradores presentado en RecSys 2025 compara varias formas de dividir secuencias. Su resultado central es que la división temporal global, con un periodo futuro separado, puede cambiar los resultados y la clasificación de modelos frente a los esquemas leave-one-out; también distingue distintas formas de definir el objetivo futuro y la validación. Esto respalda la evaluación por ventanas cronológicas en vez de divisiones aleatorias de películas. <https://doi.org/10.1145/3705328.3748164> · <https://arxiv.org/abs/2507.16289>

Le, Liu y Medlar (RecSys 2025) compararon dos protocolos en cuatro conjuntos de datos y observaron caídas de entre 21,7 % y 73,4 % en nDCG@10 al controlar una forma de fuga temporal. Esos porcentajes pertenecen a sus experimentos de recomendación secuencial y no deben trasladarse como estimación del efecto en el historial personal de Prisma; sí muestran que un protocolo aparentemente razonable puede inflar el rendimiento. <https://doi.org/10.1145/3705328.3759329> · <https://researchportal.helsinki.fi/en/publications/dont-get-ahead-of-yourself-a-critical-study-on-data-leakage-in-of/>

Jannach y Chen (ACM Transactions on Recommender Systems, 2026) subrayan que comparar un método nuevo con referencias sin ajustar es un error metodológico grave. Recomiendan documentar el ajuste de hiperparámetros y publicar el flujo de preprocesamiento, entrenamiento, evaluación y análisis para que los resultados puedan reproducirse. Es directamente aplicable a la comparación entre el RBF actual, un modelo lineal regularizado y referencias simples. <https://doi.org/10.1145/3800587> · <https://scholars.hkbu.edu.hk/en/publications/improving-methodological-standards-in-recommender-systems-offline/>

**Aplicación propuesta:** mantener películas distintas como unidad; agrupar sus revisionados antes de entrenar; entrenar únicamente con lo conocido hasta cada corte; ajustar parámetros solo en validación temporal anterior al test y dejar el último tramo cronológico intacto. La evaluación debe usar la misma lista de películas candidatas y el mismo corte para todos los modelos.

### 2.2 Una sola persona no equivale a un conjunto de muchos usuarios

Una revisión sistemática de 2026 sobre preferencias en recomendaciones audiovisuales examina 135 trabajos. Señala que muchos estudios no definen claramente qué entienden por preferencia, dependen de conjuntos offline y priorizan la relevancia computacional sobre la experiencia de usuario; también destaca el interés creciente por preferencias temporales y contextuales, sin descartar la estabilidad a largo plazo. <https://www.sciencedirect.com/science/article/abs/pii/S1071581926000169>

Para Prisma, esto impone una limitación importante: el aprendizaje es de un único perfil local. No hay población de usuarios para entrenar filtrado colaborativo ni para presentar intervalos estadísticos como si se hubiera observado una muestra amplia de personas. Un benchmark público puede ayudar a probar el código, pero no demostrar que el modelo ha aprendido correctamente el gusto privado de una persona.

### 2.3 Predicción, ranking y más allá de la exactitud

La evaluación de una nota predicha y la evaluación de una lista ordenada responden a preguntas distintas. Para las notas deben medirse MAE y RMSE; para una lista, métricas top-K como NDCG, Recall o Hit Rate. Revisiones de métricas de recomendación separan utilidad, novedad, diversidad, inesperado/serendipia y medidas dependientes del usuario. <https://link.springer.com/article/10.1007/s13042-017-0762-9> · <https://pmc.ncbi.nlm.nih.gov/articles/PMC10073543/>

La exactitud no basta para una experiencia cinematográfica. La diversificación puede reducir redundancia entre películas, pero el equilibrio con relevancia es una decisión multiobjetivo, no una mejora gratuita. La literatura advierte que diversidad, novedad, cobertura y serendipia no son equivalentes ni necesariamente correlacionan. En un estudio de RecSys 2025 sobre cómo las personas interpretan los objetivos, más del 30 % confundió diversidad y novedad con exploración; por eso Prisma debe explicar las opciones con lenguaje concreto, no asumir que esas etiquetas son autoexplicativas. <https://doi.org/10.1145/3705328.3748066> <https://doi.org/10.1016/j.knosys.2017.02.009> · <https://www.sciencedirect.com/science/article/pii/S0950705117300680>

En 2026 se propuso BIG-PU, una medida de exploración basada en información de preferencia, evaluada en tres conjuntos de datos. Es una línea interesante para comparar exploración, pero no justifica incorporar esa métrica sin definir primero qué significa explorar en la biblioteca concreta y sin un conjunto fiable de juicios futuros. <https://doi.org/10.1016/j.eswa.2025.131077>

**Aplicación propuesta:** si se decide mostrar candidatas en Descubrir, mantener el encaje, la nota prevista y el respaldo como conceptos separados. Después de ordenar por relevancia, probar una reordenación MMR (Maximal Marginal Relevance) o similar, midiendo relevancia junto a similitud interna de la lista, novedad y cobertura. Dejar que la persona elija cuánto desea explorar. No convertir el panel actual de Espectro en otra página de recomendaciones.

### 2.4 Incertidumbre y abstención

El artículo de JMLR de Oliveira y colaboradores analiza Split Conformal Prediction cuando los datos no son intercambiables. Explica que la teoría original asume intercambiabilidad y que los datos temporales pueden incumplirla; propone resultados bajo condiciones adicionales y una penalización de cobertura. Por eso no sería correcto añadir un intervalo conformal estándar al RBF y afirmar automáticamente que ofrece cobertura garantizada sobre preferencias que cambian con el tiempo. <https://jmlr.org/papers/v25/23-1553.html>

**Aplicación propuesta:** usar ventanas cronológicas de calibración separadas y evaluar empíricamente la cobertura y anchura de los intervalos por ventana. Si la muestra de calibración es insuficiente o el error cambia con el tiempo, el modelo debe abstenerse de dar una cifra precisa. Hasta entonces, llamar a `inicial/moderada/sólida` niveles de respaldo de rasgos, no confianza calibrada del predictor.

### 2.5 Preguntar por valoraciones: información frente a carga para la persona

De Pessemier, Willems y Martens (Scientific Reports, 2025) estudian selección activa de títulos para solicitar pocas valoraciones que aclaren preferencias y mitiguen el arranque en frío. Qian y colaboradores (2026) proponen adaptar dinámicamente la cantidad de rondas de aprendizaje activo; otro estudio de 2025 analiza cómo el tipo de elicitación de preferencias afecta tanto al rendimiento como a la experiencia. <https://doi.org/10.1038/s41598-025-09708-2> · <https://doi.org/10.1016/j.eswa.2025.128765> · <https://doi.org/10.1016/j.csl.2024.101696>

Espectro ya presenta una sola pregunta contextual sobre un visionado sin nota, permite posponerla y la respuesta actualiza ese visionado real. La mejora futura sería priorizar la pregunta que más reduzca la incertidumbre entre modelos o rasgos, no preguntar más a menudo. Debe mantenerse la posibilidad de ignorar la pregunta y no convertir una respuesta en otro visionado.

### 2.6 Texto y embeddings multilingües

El TF-IDF de Espectro aporta trazabilidad y coste bajo, pero no capta bien sinónimos, paráfrasis ni equivalencias semánticas entre idiomas. Hay modelos descargables que podrían compararse como un canal opcional: `paraphrase-multilingual-MiniLM-L12-v2` cubre 50 idiomas, tiene licencia Apache 2.0 y ofrece una variante ONNX cuantizada qint8 para ARM64 de 118 MB; `multilingual-e5-small` declara cobertura de 94 idiomas, licencia MIT, 12 capas y vectores de 384 dimensiones. <https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2> · <https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2/tree/main/onnx> · <https://huggingface.co/intfloat/multilingual-e5-small>

Transformers.js puede ejecutar modelos ONNX en el navegador, normalmente con WASM en CPU; WebGPU puede acelerar, pero la documentación lo sigue describiendo como experimental y recomienda cuantización en entornos con recursos limitados. La biblioteca permite configurar caché propia y caché de WASM, lo que puede apoyar el uso offline después de descargar los archivos. <https://huggingface.co/docs/transformers.js/> · <https://huggingface.co/docs/transformers.js/api/env> · <https://github.com/huggingface/transformers.js> · <https://onnxruntime.ai/docs/tutorials/web/>

**Decisión:** no descargar un modelo en la primera instalación ni convertirlo en requisito de Espectro. Solo experimentar tras comparar en español, medir precisión de recuperación de películas similares y mejora fuera de muestra, medir el tiempo/memoria en Android real, ofrecer descarga voluntaria, mostrar tamaño/licencia, usar WASM como alternativa y permitir borrar sus archivos.

### 2.7 Explicaciones fieles, no narrativas inventadas

La revisión de sistemas de recomendación explicables de Zhang y Chen diferencia explicaciones directamente interpretables de explicaciones post-hoc. Para Espectro, los motivos más seguros son rasgos reales, contribuciones trazables y películas concretas que respaldan cada afinidad. <https://doi.org/10.1561/1500000066>

Una explicación generada por un LLM puede sonar convincente sin reproducir fielmente el cálculo. Las revisiones recientes sobre explicación mediante LLM señalan que la evidencia aplicada todavía es incipiente; no existe razón para enviar historial local a un modelo externo ni para añadir texto generado como si fuera evidencia del predictor. <https://pmc.ncbi.nlm.nih.gov/articles/PMC11808143/>

### 2.8 Accesibilidad y visualización

W3C WAI clasifica gráficas y diagramas como imágenes complejas. Recomienda una descripción breve que identifique la gráfica y una descripción larga que conserve su información esencial; una tabla estructurada puede ser parte de esa alternativa. <https://www.w3.org/WAI/tutorials/images/complex/>

WCAG 2.2 exige que las operaciones con teclado tengan foco visible (2.4.7), que la información no dependa solo del color (1.4.1), que las gráficas significativas y controles tengan contraste no textual adecuado (1.4.11) y que los objetivos de puntero cumplan el mínimo general de 24 × 24 píxeles CSS o una excepción válida (2.5.8). <https://www.w3.org/TR/WCAG22/> · <https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast>

**Cambio actual:** esta rama añade una tabla desplegable para barras, distribución de notas, series mensuales, donut, mapa horario, revisionados y afinidades, y prueba que pueda abrirse en Playwright. Esto amplía el acceso a los valores; no certifica conformidad WCAG ni sustituye pruebas con TalkBack.

### 2.9 Rendimiento real y almacenamiento en PWA

El presupuesto gzip que se fusionó en PR #50 ayuda a detectar regresiones de empaquetado, pero no mide por sí solo experiencia percibida. Google recomienda evaluar Core Web Vitals con LCP ≤ 2,5 s, INP ≤ 200 ms y CLS ≤ 0,1 en el percentil 75; debe medirse la publicación real, no inferir esos valores del tamaño de los bundles. <https://developers.google.com/search/docs/appearance/core-web-vitals>

El navegador guarda IndexedDB y Cache Storage en modo best-effort por defecto; el origen puede solicitar persistencia, pero debe medir el uso y tratar errores de cuota. Por ello, los modelos descargables, embeddings y nuevas cachés deben ser regenerables, eliminables y estar claramente separados del historial personal. <https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria> · <https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist>

## 3. Plan de mejora priorizado

| Prioridad | Trabajo | Valor esperado | Prueba de aceptación |
|---|---|---|---|
| P0 | Alternativa tabular para gráficas (en esta rama) | Permite consultar valores sin depender del SVG o del color | E2E en Chromium/Firefox/WebKit; tabla con caption, encabezados y filas correctas |
| P1 | Evaluador reproducible de RBF y baselines | Saber si la complejidad mejora realmente la predicción personal | Cortes temporales, ajuste solo en validación, test final intacto, métricas pareadas y reporte versionado |
| P1 | Medición de incertidumbre y abstención | Evita presentar una nota precisa sin respaldo suficiente | Cobertura empírica en ventanas futuras y umbral de abstención probado |
| P2 | Preferencias estables frente a intereses recientes | Detecta cambios sin sobre-reaccionar a una sola nota | Pruebas sintéticas y cronológicas con soporte mínimo y regresiones controladas |
| P2 | Reordenación diversa dentro de Descubrir | Reduce listas redundantes cuando haya candidatas disponibles | Comparar relevancia, NDCG/Hit Rate y diversidad intra-lista, con control de exploración |
| P3 | Embeddings opcionales | Detecta similitud semántica entre sinopsis equivalentes | Ganancia fuera de muestra en español; descarga, licencia, coste Android, caché y borrado verificados |
| P3 | Estudio de experiencia de pregunta contextual | Reduce interrupciones y mejora información útil | Registrar localmente aceptación/posposición con consentimiento; no exponer historial |
| P3 | Lighthouse/Core Web Vitals y TalkBack físico | Verifica la experiencia instalada más allá del CI | LCP/INP/CLS de producción y checklist Android con modelo/versión de dispositivo |

## 4. Protocolo de evaluación que debería preceder a un cambio de modelo

1. Crear cortes temporales globales: entrenamiento anterior al corte, validación posterior y test final aún más reciente. No usar particiones aleatorias como prueba de una predicción temporal.
2. Mantener todas las sesiones de una película en el mismo lado del corte y crear una sola observación por título para el modelo de nota, agregando los revisionados como lo hace el predictor actual.
3. Construir vocabulario TF-IDF, escalados, estadísticas y rasgos solo con el tramo de entrenamiento. No permitir que sinopsis o metadatos posteriores al corte entren en el vocabulario.
4. Ajustar en validación una cuadrícula pequeña y reproducible para RBF (`gamma` y regularización), junto a un modelo promedio/mediana, similitud de vecinos y una referencia lineal regularizada. Las referencias también deben ajustarse.
5. Evaluar notas con MAE y RMSE; evaluar ranking de candidatas con NDCG@K, Recall@K y Hit Rate sobre el mismo conjunto local de candidatas conocido en el corte. No cambiar el conjunto de negativas o candidatas entre modelos.
6. Reportar películas distintas evaluadas, ventanas, errores por ventana y sensibilidad a retirar títulos. Estimar incertidumbre con remuestreo por película y bloques temporales, evitando tratar visionados repetidos como observaciones independientes.
7. Reservar el último tramo para una única evaluación final. Si hay muy pocas películas o muy poca variedad, informar que la muestra no permite decidir entre algoritmos y mantener el modelo sencillo.
8. Evaluar intervalos de predicción por cobertura y amplitud únicamente con residuos futuros de calibración. No llamar calibrado al modelo antes de demostrarlo.
9. Solo después de mejorar de forma estable la predicción, evaluar diversidad/novedad como objetivos separados y revisar que la lista resultante sea útil para la persona.

## 5. Decisiones que se desaconsejan

- No introducir filtrado colaborativo como si Prisma tuviera un conjunto de usuarios: el perfil está diseñado para ser individual y local.
- No entrenar una red profunda desde cero con unas pocas decenas o cientos de valoraciones.
- No priorizar un embedding por aparecer en un benchmark; debe superar al TF-IDF y a metadatos sobre los cortes temporales del dominio.
- No convertir `confidence` heurística de afinidad en probabilidad o intervalo de predicción.
- No tratar favoritos como notas ni convertir ausencia de metadatos en una señal negativa.
- No reconstruir el mapa/recomendaciones como secciones separadas que contradigan el panel actual.
- No enviar puntuaciones, comentarios, historial, favoritos ni embeddings personales a servicios externos.
- No afirmar que el sitio cumple WCAG o que TalkBack ha sido probado en dispositivo físico sin hacer las verificaciones correspondientes.

## 6. Bibliografía y documentación consultada

1. Gusak et al. (2025), *Time to Split: Exploring Data Splitting Strategies for Offline Evaluation of Sequential Recommenders*, ACM RecSys. https://doi.org/10.1145/3705328.3748164
2. Le, Liu & Medlar (2025), *Don't Get Ahead of Yourself: A Critical Study on Data Leakage in Offline Evaluation of Sequential Recommenders*, ACM RecSys. https://doi.org/10.1145/3705328.3759329
3. Jannach & Chen (2026), *Improving Methodological Standards in Recommender Systems Offline Evaluation*, ACM TORS. https://doi.org/10.1145/3800587
4. (2026), *Understanding user preferences in recommender systems: A systematic review with a user-centric perspective in the audiovisual domain*, International Journal of Human-Computer Studies. https://www.sciencedirect.com/science/article/abs/pii/S1071581926000169
5. De Pessemier et al. (2025), *Active learning algorithm for alleviating the user cold start problem of recommender systems*, Scientific Reports. https://doi.org/10.1038/s41598-025-09708-2
6. Qian et al. (2026), *A personalized active learning strategy with enhanced user satisfaction for recommender systems*, Expert Systems with Applications. https://doi.org/10.1016/j.eswa.2025.128765
7. Ziegfeld, Di Scala & Cremers (2025), *The effect of preference elicitation methods on the user experience in conversational recommender systems*. https://doi.org/10.1016/j.csl.2024.101696
8. Ishii, Yang & Goto (2026), *BIG-PU: An evaluation metric for exploration based on preference elicitation in recommender systems*, Expert Systems with Applications. https://doi.org/10.1016/j.eswa.2025.131077
9. Kunaver & Požrl (2017), *Diversity in recommender systems – A survey*, Knowledge-Based Systems. https://doi.org/10.1016/j.knosys.2017.02.009
10. *A survey on multi-objective recommender systems*, PMC. https://pmc.ncbi.nlm.nih.gov/articles/PMC10073543/
11. Oliveira et al. (2024), *Split Conformal Prediction and Non-Exchangeable Data*, Journal of Machine Learning Research. https://jmlr.org/papers/v25/23-1553.html
12. Zhang & Chen (2020), *Explainable Recommendation: A Survey and New Perspectives*, Foundations and Trends in Information Retrieval. https://doi.org/10.1561/1500000066
13. W3C WAI, *Complex Images*. https://www.w3.org/WAI/tutorials/images/complex/
14. W3C, *Web Content Accessibility Guidelines (WCAG) 2.2*. https://www.w3.org/TR/WCAG22/
15. W3C WAI, *Understanding Non-text Contrast*. https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast
16. Hugging Face, *paraphrase-multilingual-MiniLM-L12-v2* (50 idiomas, Apache 2.0, variantes ONNX cuantizadas). https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
17. Hugging Face, *multilingual-e5-small* (94 idiomas, MIT, 12 capas, 384 dimensiones). https://huggingface.co/intfloat/multilingual-e5-small
18. Hugging Face, *Transformers.js* y documentación de caché. https://huggingface.co/docs/transformers.js/ · https://huggingface.co/docs/transformers.js/api/env
19. ONNX Runtime Web, documentación de ejecución y backends. https://onnxruntime.ai/docs/tutorials/web/
20. Google, *Understanding Core Web Vitals*. https://developers.google.com/search/docs/appearance/core-web-vitals
21. MDN, *Storage quotas and eviction criteria*. https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
22. (RecSys 2025), *How Do Users Perceive Recommender Systems’ Objectives?* Estudio sobre la interpretación de relevancia, diversidad, novedad y exploración. https://doi.org/10.1145/3705328.3748066
