# Prisma — Evolución de Espectro

**Alcance vigente:** evolucionar Espectro y llevar su inteligencia a Descubrir, además de mejorar la búsqueda y los filtros.  
**Experiencia que se conserva:** Personal · Descubrir · Espectro.  
**Estado:** especificación de trabajo que sustituye el plan anterior de cuatro destinos.

## 1. Decisión de producto

Prisma conserva la navegación principal Personal · Descubrir · Espectro. No se incorporará Inicio como nuevo destino. Descubrir sí forma parte de esta evolución: su exploración y clasificación de películas estarán impulsadas por Espectro, sin duplicar el motor de preferencias ni crear una cuarta sección.

El desarrollo se concentra en Espectro para que comprenda mejor la experiencia cinematográfica registrada, encuentre patrones fiables, explique sus conclusiones y aporte mejores recomendaciones.

Espectro debe ser el cerebro cinematográfico de Prisma, no solo un panel estadístico. Su perfil, afinidades y predictor deben impulsar las recomendaciones y el orden personalizado de Descubrir; los filtros controlan el catálogo sin enviar datos personales a TMDB.

### Principios que permanecen

- Aplicación gratuita, local-first, sin cuentas obligatorias, perfiles públicos ni sincronización en la nube.
- Datos personales almacenados en IndexedDB mediante Dexie.
- TMDB como fuente principal de metadatos.
- Análisis de gustos ejecutado localmente.
- PWA instalable y funcionamiento offline para las funciones compatibles.
- Sin dependencias pesadas salvo que una evaluación demuestre una mejora real.
- Sin modificaciones destructivas de Biblioteca, visionados, calificaciones, fechas, comentarios, favoritos, colecciones, perfil o preferencias.

## 2. Punto de partida existente

Espectro 2.2 ya incluye cuatro apartados dentro de su espacio actual:

1. **Mapa cinematográfico:** relaciones entre películas, géneros, profesionales y temas.
2. **Afinidades:** análisis de señales y diferencias asociadas a las calificaciones.
3. **Evolución:** lectura temporal de la experiencia cinematográfica.
4. **Recomendaciones:** encaje relativo, nota estimada y razones.

La implementación existente utiliza TypeScript, Dexie, repositorios locales, instantáneas versionadas, cachés TMDB, algoritmos tradicionales y un grafo de relaciones. Esa base debe evolucionar; no debe reemplazarse por una reconstrucción.

La navegación de nivel superior continúa siendo Personal, Descubrir y Espectro. Las rutas y operaciones ya existentes deben conservarse.

## 3. Qué debe mejorar Espectro y Descubrir

### 3.0 Descubrir impulsado por Espectro

- Usar el perfil y el predictor locales de Espectro para priorizar resultados de búsqueda y exploración.
- Reutilizar entre páginas el modelo de predicción entrenado con el historial local mediante una caché en memoria acotada; invalidarla si cambian las notas o metadatos de entrenamiento, sin persistir ni transmitir el perfil.
- Mantener la búsqueda textual real de TMDB: escribir un título ejecuta una búsqueda, no limita la coincidencia a una página ya cargada.
- Combinar búsqueda y filtros avanzados; cuando TMDB no permite combinar texto y todos los criterios en un solo endpoint, aplicar filtros adicionales a los resultados y completar metadatos faltantes bajo demanda.
- Permitir ocultar por separado películas ya vistas y pendientes consultando solo la Biblioteca local.
- Indicar cuándo falta evidencia personal suficiente y conservar un orden neutral como alternativa.
- No enviar historial, calificaciones, favoritos ni listas personales a TMDB.


### 3.1 Identidad cinematográfica

Construir una representación dinámica del gusto a partir de características verificables:

- Géneros y combinaciones de géneros.
- Temas y palabras clave.
- Estructuras narrativas y atmósferas, únicamente cuando existan datos que las respalden.
- Directores, reparto, guionistas, fotografía y música.
- Países, idiomas, épocas y duración.
- Otras características cinematográficas obtenibles de fuentes identificables.

No basta con contar apariciones. La pregunta importante es qué señales se asocian con valoraciones altas, bajas o variables.

Cada rasgo debe distinguir frecuencia, valoración media, dispersión, cantidad de películas distintas y confianza. Los revisionados no deben contabilizarse como películas independientes.

### 3.2 Hallazgos y patrones

Detectar patrones que no sean obvios para el propietario, por ejemplo:

- Géneros que funcionan mejor en combinación con ciertos temas.
- Directores con afinidad alta en determinados tipos de películas.
- Atmósferas o temas recurrentes entre títulos bien valorados.
- Características asociadas a valoraciones más bajas o variables.
- Películas que rompen patrones habituales.

Un hallazgo solo puede mostrarse cuando tenga evidencia suficiente. Debe incluir explicación, películas utilizadas como evidencia, número de películas distintas, distribución de sus notas, tamaño de muestra, confianza y limitaciones.

No se presentarán correlaciones como causalidad ni se inventarán temas a partir de sinopsis insuficientes.

### 3.3 Explorador de relaciones

La experiencia seguirá siendo progresiva:

- Comenzar por una película, género, persona o tema.
- Mostrar únicamente conexiones significativas.
- Explicar la razón de cada relación.
- Permitir profundizar hacia características y películas puente.
- Comparar títulos y descubrir conexiones menos evidentes.

No se debe saturar la pantalla con cientos de nodos ni relaciones débiles. El grafo debe priorizar relevancia, cobertura y legibilidad.

### 3.4 Atlas cinematográfico

El Atlas continúa siendo una capacidad interna de Espectro, no una nueva sección principal de navegación.

Debe conservar dos alcances: **Mi Prisma** (películas de la Biblioteca) y **Cine mundial** (títulos accesibles mediante consultas y filtros disponibles en TMDB).

Debe distinguir tres capas geográficas:

| Capa | Significado | Fuente principal |
|---|---|---|
| Países de producción | Países vinculados a la producción | TMDB |
| Lugares de rodaje | Sitios reales donde se filmó | Wikidata P915 |
| Ambientación narrativa | Sitios donde transcurre la historia | Wikidata P840 |

Las coordenadas de entidades geográficas pueden utilizar Wikidata P625. No se deducirán ciudades ni puntos a partir del país de producción.

Cada dato deberá mostrar fuente, precisión geográfica y cobertura. Una localización no confirmada no debe aparecer como un hecho.

### 3.5 Evolución cinematográfica

Analizar cambios y continuidad de los gustos: etapas cinematográficas, géneros y temas, nuevos intereses, rasgos que reaparecen, cambios en la distribución de calificaciones y películas que representan giros relevantes.

La cronología debe tratar con prudencia fechas importadas, datos sin zona horaria, múltiples visionados en una misma fecha y revisionados. No se inventarán horas ni se asumirán duplicados por compartir día.

### 3.6 Contrastes

Permitir investigar por qué títulos similares recibieron notas distintas, qué rasgos distinguen películas muy valoradas de otras poco valoradas, qué resultados son variables por director, qué títulos contradicen afinidades frecuentes y qué combinaciones merecen exploración.

Los contrastes deben basarse en grupos comparables y mostrar el tamaño de cada grupo. Una diferencia descriptiva no prueba una relación causal.

## 4. Contrato de inteligencia

Espectro debe separar tres indicadores:

- **Encaje:** índice relativo de coincidencia entre una película y las características del perfil conocido. No es una probabilidad.
- **Nota estimada:** estimación de una posible valoración personal en la escala utilizada por el propietario. Debe compararse contra baselines simples.
- **Confianza:** solidez de la evidencia utilizada. No puede derivarse únicamente del porcentaje de encaje ni de una etiqueta arbitraria.

La explicación de cada resultado debe permitir identificar las características que contribuyen positiva y negativamente, las películas que respaldan la señal, el tamaño de muestra y las limitaciones.

Cuando no exista evidencia suficiente, Espectro debe indicarlo y abstenerse de producir una predicción.

### 4.1 Calidad de evidencia

- Contar películas distintas, no filas de revisionados.
- Agrupar las calificaciones por título para análisis de soporte.
- Mostrar dispersión y estabilidad, no únicamente promedios.
- Penalizar estimaciones sustentadas por muestras pequeñas.
- Diferenciar preferencias declaradas (favoritos) de preferencias inferidas mediante notas.
- No interpretar automáticamente la ausencia de una película como rechazo.
- No convertir puntuaciones externas de TMDB en gustos personales.

## 5. Evaluación de modelos

El propietario ha solicitado evaluar redes neuronales cuando puedan demostrar una mejora real. No se descartan por principio, pero tampoco se incorporan por apariencia.

### 5.1 Modelos que se deben comparar

| Modelo | Uso previsto |
|---|---|
| Espectro actual | Referencia inicial |
| Promedio global y regularización simple | Baselines de nota |
| Regresión regularizada | Predicción con características |
| Métodos bayesianos | Estabilizar señales de muestras pequeñas |
| TF-IDF / BM25 | Búsqueda y similitud léxica |
| Embeddings multilingües preentrenados | Temas, sinopsis y similitud semántica |
| Redes neuronales personalizadas | Solo con datos y validación que justifiquen entrenarlas |

No se entrenará una red compleja desde cero con una muestra personal pequeña.

**Implementación actual · Espectro 2.7.0.** El predictor local utiliza Kernel Ridge con kernel RBF y características estructuradas (géneros, país, dirección, reparto, idioma, época y duración), combinadas con TF-IDF de sinopsis. El vocabulario textual se ajusta solo con películas calificadas; no se incorporan embeddings multilingües ni comprensión semántica de sinopsis. El kernel parte de similitud cero cuando no hay rasgos compartidos y la desviación de la nota se contrae según la similitud del vecino más cercano. Por tanto, las candidatas con pocos metadatos mantienen una estimación próxima al promedio personal en vez de recibir un ajuste optimista sin respaldo. Las valoraciones previstas siguen siendo estimaciones, no probabilidades.

### 5.2 Validación

- Usar validación temporal cuando las fechas permitan ordenar correctamente las observaciones.
- Agrupar revisionados por película antes de crear conjuntos de entrenamiento y evaluación.
- No permitir que una película o sus metadatos derivados filtren información al pasado.
- Comparar modelos sobre los mismos títulos y cortes temporales.

Métricas previstas: MAE y RMSE para notas; NDCG@K y precisión de ranking; cobertura, diversidad y novedad; calibración e incertidumbre; tiempo de ejecución, RAM, almacenamiento, descarga y consumo en Android.

Si la cronología no permite validación temporal fiable, debe reconocerse expresamente y complementar con evaluaciones agrupadas sin etiquetarlas como temporales.

### 5.3 Ejecución local

ONNX Runtime Web y Transformers.js son candidatos, no requisitos.

- WASM será la opción general de compatibilidad.
- WebGPU será opcional.
- Los modelos se descargarán bajo demanda, con tamaño y licencia visibles.
- La descarga no será necesaria para utilizar Espectro.
- Se conservará un fallback tradicional.
- El procesamiento personal permanecerá local.
- Los modelos y embeddings derivados no formarán parte del respaldo personal.
- El usuario podrá borrar los recursos del modelo sin afectar sus películas o visionados.

## 6. Enriquecimiento cinematográfico

La calidad de metadatos limita la calidad del análisis. El enriquecimiento debe seguir siendo una función de Espectro, controlada y con caché local.

La cola ya fue actualizada para priorizar Pendientes por delante de favoritos, visionados y otros títulos del catálogo. Esa mejora debe conservarse.

El trabajo adicional debe centrarse en detalles, créditos, palabras clave temáticas, metadatos para relaciones y cobertura/procedencia de fuentes.

El enriquecimiento será selectivo, reanudable y limitado por lotes. Debe reutilizar cachés, respetar límites de TMDB, reintentar errores temporales y explicar qué se consultará.

### Límite de escritura

Solo puede actualizar metadatos cinematográficos del registro Movie. Está prohibido modificar como efecto secundario el estado de Biblioteca, favoritos, visionados, secuencias, fechas, calificaciones, comentarios, colecciones, perfil o preferencias.

Las operaciones deben demostrar con pruebas que los datos personales no cambian.

## 7. Modelo de almacenamiento y arquitectura

Se mantiene la arquitectura actual: React, dominio TypeScript puro, repositorios Dexie, servicios TMDB, cachés locales, adaptador independiente para Wikidata y runtime opcional para modelos semánticos locales.

No se reconstruirá Dexie ni se hará una migración de esquema por el rediseño de Espectro. El esquema v1 y sus tablas personales se preservan.

Las instantáneas de Espectro seguirán identificándose por versión de algoritmo y huella de entradas. Al cambiar un algoritmo, solo se invalidarán los resultados derivados incompatibles.

Los metadatos externos y las entidades geográficas tendrán procedencia y fecha de consulta. No deben confundirse con información declarada por el propietario.

## 8. Protección de datos y funcionamiento offline

- No enviar notas, historial, comentarios, favoritos, Biblioteca o perfil a servicios externos.
- No ejecutar restauraciones, importaciones, reinicios o borrados como parte de Espectro.
- Mantener las funciones locales compatibles sin conexión.
- Tratar TMDB y Wikidata como fuentes externas opcionales.
- No incluir copias de respaldo reales en pruebas automatizadas.
- Ejecutar CI con datos ficticios e IndexedDB temporal.
- Enriquecer metadatos mediante parches explícitos y acotados.
- No cambiar la preferencia regional ni la región de disponibilidad automáticamente.

## 9. Secuencia de trabajo de Espectro y su integración

| Orden | Trabajo | Resultado esperado |
|---|---|---|
| 1 | Auditoría de datos, cobertura y calidad temporal | Saber qué evidencia existe y qué falta |
| 2 | Enriquecimiento prioritario de Pendientes | Mejor cobertura para análisis y relaciones |
| 3 | Perfil estadístico robusto | Afinidades con dispersión, soporte e incertidumbre |
| 4 | Hallazgos y patrones combinados | Descubrimientos explicables y sustentados |
| 5 | Comparación de modelos | Decidir si embeddings o redes neuronales mejoran resultados |
| 6 | Explorador progresivo | Relaciones relevantes, películas puente y contrastes |
| 7 | Atlas geográfico | Producción, rodaje y ambientación con procedencia |
| 8 | Evolución y análisis temporal | Etapas y cambios sin falsas conclusiones |

El modelo y los cálculos personales siguen perteneciendo a Espectro. Descubrir consume sus resultados para ordenar la exploración, mientras sus filtros y búsqueda siguen siendo controles de catálogo; no se crea un nuevo destino ni se reemplazan Personal o Descubrir.

## 10. Criterios de aceptación

### Funcionales

- Cada hallazgo presenta evidencia, soporte, confianza y limitaciones.
- No aparecen patrones cuando la muestra es insuficiente.
- Las relaciones del grafo tienen un motivo verificable.
- El Atlas distingue producción, rodaje y ambientación.
- La evolución no inventa fechas ni relaciones causales.
- Las recomendaciones separan encaje, nota estimada y confianza.

### Datos

- El enriquecimiento no modifica tablas personales.
- No existen cambios destructivos en Dexie.
- Los datos de pruebas son ficticios.
- Los resultados derivados pueden regenerarse sin tocar el historial.

### Inteligencia y rendimiento

- Se comparan baselines tradicionales con modelos nuevos.
- Las redes neuronales se adoptan únicamente si superan la evaluación.
- El modo sin modelo sigue disponible.
- El rendimiento se comprueba en Android real cuando corresponda.

### Calidad

Se mantienen los controles actuales de Prisma: TypeScript, unit tests, build, smoke test y Playwright. PWA/offline continúa como control informativo paralelo. Ninguna prueba se desactiva para lograr una CI verde. Cada entrega se realiza en su rama y PR. Después de fusionar, se verifica GitHub Pages y la PWA publicada.

---

**Decisión final:** Prisma conserva Personal, Descubrir y Espectro. Espectro es el motor inteligente que también impulsa Descubrir. La búsqueda debe consultar realmente TMDB, los filtros deben ofrecer más control y ninguna mejora puede alterar los registros personales.
