# Espectro

Espectro es el análisis cinematográfico personal de Prisma. Se ejecuta en el dispositivo, utiliza datos locales ya guardados y conserva sus instantáneas en IndexedDB. La información cinematográfica que falta se puede consultar directamente a TMDB por identificador, sin tener que abrir una ficha.

## Versión del algoritmo

La versión activa es **2.6.0** (`SPECTRO_ALGORITHM_VERSION`). Todo cambio de lógica que pueda alterar los resultados debe incrementar esta versión. Las instantáneas se identifican por versión y huella de entrada; las versiones anteriores nunca sustituyen un cálculo 2.6.0.

## Información que utiliza

Espectro combina señales que Prisma puede verificar:

- Calificaciones, fechas y revisionados de visionados.
- Géneros TMDB (identificadores y nombres).
- Directores y reparto principal.
- Palabras clave temáticas de TMDB, como memoria, identidad o viajes en el tiempo.
- Países de producción y década de estreno.
- Idioma original y duración.
- Favoritos marcados explícitamente en Biblioteca.
- Películas candidatas del catálogo local, incluidas las que el propietario ha marcado como Pendientes. Las Vistas y cualquier título con un visionado registrado quedan excluidos.

Las sinopsis se utilizan en el detector de interacciones mediante términos y expresiones léxicas, no como comprensión semántica: no se infieren emociones, atmósferas ni temas filosóficos. Los comentarios personales no se interpretan como señales. Tampoco se envían el historial, el perfil o sus inferencias a terceros.

Cuando existen visionados sin calificación, Espectro puede hacer una pregunta contextual en la propia vista: pide una nota del 1 al 10 para una experiencia registrada, sin abrir la ficha. La respuesta actualiza solo el campo de calificación de ese visionado y vuelve a calcular el perfil. Se formula como máximo una pregunta cada 24 horas y se puede posponer; no se crean experiencias nuevas ni se alteran fechas, revisionados o comentarios.

## Obtención automática de metadatos

Cuando Espectro detecta campos cinematográficos que faltan, solicita a TMDB los detalles, créditos y palabras clave temáticas usando el identificador TMDB local. Los tres recursos se guardan en la caché local; no es necesario abrir la ficha.

- Prioriza las películas Pendientes, después los favoritos y los visionados, además de candidatas locales no guardadas. Las Pendientes permanecen elegibles para recomendaciones cuando sus metadatos son suficientes.
- Consulta detalles, créditos y palabras clave; no descarga proveedores ni recomendaciones solo para construir el perfil.
- Reutiliza la caché local de TMDB antes de hacer una solicitud nueva.
- Limita el ritmo de consultas, reintenta errores temporales y respeta el tiempo indicado por TMDB ante HTTP 429.
- Los errores temporales quedan en pausa automática durante 12 horas. Prisma programa el siguiente intento sin requerir una acción manual; los errores de credencial esperan a que se guarde un token válido.
- Registra películas no encontradas (404) para no repetir consultas inútiles.
- Si falta la credencial TMDB, no hace solicitudes y muestra cómo configurarla.
- Si se pierde la conexión, conserva el progreso y continúa cuando vuelve la conexión.
- La cola no borra datos ni crea películas duplicadas: solo completa metadatos de registros que ya existen.

El proceso actualiza exclusivamente campos cinematográficos del registro de película: títulos, sinopsis, estreno, duración, géneros, países, idioma, palabras clave, póster, fondo, dirección y reparto. No modifica visionados, secuencias, calificaciones, fechas, comentarios, favoritos, estados de Biblioteca, colecciones, perfil ni preferencias.

## Criterios de señal y respaldo

- El promedio personal y cada afinidad se calculan por película distinta. Los revisionados se promedian dentro de cada título y no multiplican la muestra.
- Una afinidad aparece con un mínimo de dos películas distintas. Con dos títulos se etiqueta como inicial y no se usa para recomendar.
- La diferencia observada se reduce hacia el promedio personal mediante `diferencia × n / (n + 3)`. Es una regularización explícita, no una probabilidad ni un intervalo de confianza.
- El respaldo combina cantidad de títulos distintos y dispersión de sus valoraciones.
- Las afinidades moderadas y sólidas pueden intervenir en recomendaciones. Las señales iniciales o variables no sostienen por sí solas una recomendación.
- Un favorito es una señal declarada explícitamente. No se transforma en una calificación ni aumenta el promedio de notas.
- Las señales ausentes no se inventan.

## Interacciones cinematográficas

La versión 2.4.0 sustituyó la lista fija de combinaciones por una búsqueda general de parejas entre características presentes en películas distintas. Explora todas las parejas de categorías diferentes disponibles en los datos, sin limitarse a una lista escrita a mano como género + dirección o género + tema.

Las señales disponibles incluyen:

- Datos estructurados existentes: género, dirección, reparto, país, época, idioma, duración y palabras clave de TMDB.
- Términos y expresiones consecutivas extraídos de la sinopsis. Se etiquetan como señales léxicas, no como temas confirmados ni como embeddings semánticos.

Cada película aporta una sola observación a cada pareja. Los revisionados se promedian dentro del título, por lo que no aumentan el tamaño de muestra.

### Cómo se calcula

1. Espectro ajusta un perfil aditivo de efectos individuales.
2. Divide los títulos en cinco bloques deterministas. Para cada bloque, estima la expectativa de las películas excluidas sin utilizar sus valoraciones para ajustar ese perfil.
3. Calcula el residuo de cada título: nota observada menos nota esperada por el modelo aditivo.
4. Agrupa esos residuos para todas las parejas de características cuyos rasgos aparecen en al menos cuatro películas distintas.
5. Calcula diferencia media, dispersión, número de títulos, prueba t bilateral y consistencia de la dirección entre bloques.
6. Corrige conjuntamente los valores p mediante Benjamini–Yekutieli, un procedimiento conservador ante dependencias entre las comparaciones.

Solo se presentan parejas con al menos cuatro películas distintas, q ajustado ≤ 0,05, al menos dos películas de soporte en cada uno de tres o más bloques y consistencia de dirección ≥ 0,75. Se muestran hasta ocho resultados ordenados por evidencia corregida. Estos límites sirven para descartar patrones que no pueden replicarse en diferentes bloques; no convierten una asociación en causalidad.

### Qué muestra cada hallazgo

- Características y categorías que forman la interacción.
- Nota media observada y expectativa estimada por separado.
- Diferencia residual, dispersión y número de películas distintas que respaldan el patrón.
- Valor p y valor q después de corregir las comparaciones múltiples.
- Cantidad de bloques donde aparece y consistencia de su dirección.
- Hasta tres películas de evidencia, con su nota y desviación respecto de la expectativa.

El valor q es una medida de evidencia estadística corregida, no la probabilidad de que te guste una película. La consistencia entre bloques indica estabilidad interna, no validación temporal ni causalidad. Las pruebas t son una aproximación sobre residuos y siguen dependiendo de la calidad, independencia y distribución de las observaciones. La ausencia de patrones que superen los controles es un resultado válido.

La versión 2.5.0 sustituyó la nota prevista anterior por Kernel Ridge RBF. La versión 2.6.0 cambia el orden de las recomendaciones para priorizar esa nota prevista y utiliza el encaje como desempate. No incorpora aún árboles, boosting, Factorization Machines ni redes neuronales; siguen siendo alternativas para futuras comparaciones.


## Modelo predictivo interno

El motor conserva estimaciones locales de candidatas como capacidad analítica, pero Espectro ya no las presenta en una pantalla independiente de recomendaciones. La experiencia visible se centra en explicar el gusto registrado y en mostrar solo señales que cuentan con respaldo.

**Encaje.** Es una puntuación relativa que resume señales positivas y negativas de ocho familias: género, dirección, reparto, temas, país, época, idioma y duración. Las coincidencias se limitan dentro de cada familia y los favoritos añaden un refuerzo explícito moderado. No es una probabilidad de que una película guste.

**Nota prevista (0–10).** El motor utiliza regresión Kernel Ridge con kernel RBF. Entrena sobre la media de las calificaciones de cada película distinta y representa géneros, países, dirección, reparto, palabras clave, idioma, década, duración y términos de las sinopsis. El vocabulario TF‑IDF se ajusta solo con películas calificadas; las candidatas no intervienen en el entrenamiento. La solución regularizada usa Cholesky y recurre al promedio personal cuando hay menos de tres títulos, faltan rasgos comparables o el sistema no puede resolverse de forma estable.

El orden interno de candidatas prioriza la nota prevista y utiliza el encaje como desempate. Esta salida no constituye una lista visible dentro de Espectro. Los títulos comparables del historial se calculan por similitud coseno y son cercanía descriptiva, no probabilidad ni una valoración prevista.

La evaluación temporal del modelo sigue siendo exploratoria y personal. Ridge puede superar a RBF en algunas métricas; por eso no se presenta el predictor como calibrado, definitivo ni universalmente superior. Los niveles Inicial, Moderada, Sólida, Variable y Explícita describen el respaldo de señales concretas; no son intervalos de confianza ni la confianza calibrada del modelo RBF.

## Experiencia de analítica visual

Espectro se presenta como un centro de analítica personal con seis secciones navegables. Las gráficas se calculan en el dispositivo a partir de las tablas locales de películas, visionados, Biblioteca y colecciones; no se envían calificaciones, fechas, comentarios ni preferencias personales a TMDB.

1. **Resumen.** Indicadores principales; línea temporal mensual de sesiones; distribución de calificaciones; proporción de títulos vistos, pendientes y otros títulos locales; cobertura de metadatos disponible.
2. **Actividad.** Evolución de sesiones mes a mes, meses sin actividad entre registros, distribución por día de la semana y mapa de calor por día/hora local. El mapa horario solo utiliza visionados con hora local válida guardada.
3. **Calificaciones.** Histograma de notas de 1 a 10 por sesión, promedio mensual de las notas de cada sesión, títulos más y menos valorados por media de sus propias sesiones, películas revisionadas y cambio entre su primera y última nota disponible.
4. **Universo cinematográfico.** Géneros, décadas de estreno, países de producción, idiomas originales, dirección, reparto principal, duración y palabras clave temáticas. Las categorías cuentan títulos únicos; una película puede participar en más de una categoría.
5. **Perfil.** Diferencias ajustadas de afinidad contra el promedio personal, señales de favoritos declarados e interacciones cinematográficas validadas. Las muestras pequeñas o variables se etiquetan y no se convierten en certezas.
6. **Biblioteca.** Distribución de películas vistas, pendientes y otros títulos guardados; tamaño de cada colección; comentarios, sesiones sin nota y favoritos explícitos.

### Reglas de cómputo y lectura

- Una sesión de visionado siempre cuenta como una sesión. Una película con cuatro revisionados suma cuatro sesiones, pero sigue siendo un solo título en las estadísticas de catálogo.
- El promedio global por película promedia primero las notas de cada título; así un título muy revisionado no domina el perfil por cantidad de sesiones.
- El histograma de notas refleja las sesiones individuales. El promedio por título y los listados de películas mejor/menos valoradas reflejan la media de las sesiones calificadas de cada película.
- Las tendencias mensuales se construyen por la fecha local `watchedOn` registrada. Los meses intermedios sin registros aparecen con cero para que no parezca que el tiempo desapareció.
- La distribución horaria utiliza `watchedAtLocalTime` si existe y es válida. No intenta deducir horas faltantes a partir de fechas, zona horaria o creación del registro.
- Los géneros, años, países, directores, reparto, idioma, duración y temas dependen de metadatos cinematográficos que pueden no estar completos. Cada sección muestra cobertura observada para evitar interpretar un dato ausente como una categoría con cero películas.
- La duración acumulada es una estimación: duración registrada de cada película multiplicada por sus sesiones; las sesiones sin duración quedan contabilizadas como faltantes.
- Los favoritos son selecciones expresas y no se convierten en calificaciones. Pendientes, estado de visionado y favoritos son dimensiones distintas de Biblioteca.
- La lectura de afinidades compara cada rasgo con el promedio de notas por película, usando el ajuste conservador del motor Espectro. Son asociaciones descriptivas, no probabilidades ni causas.
- Los patrones conjuntos conservan los controles estadísticos y la validación cruzada del motor. No se inventan hallazgos cuando la muestra no respalda ninguno.

No se añade una dependencia de gráficas: las visualizaciones usan SVG y CSS locales para mantener el funcionamiento sin conexión y el tamaño de la aplicación contenido. El panel lee datos de IndexedDB y no modifica visionados, valoraciones, fechas, comentarios, favoritos, estados, colecciones, perfil o preferencias.

## Huella e instantáneas

La huella incluye visionados, calificaciones, fechas, sinopsis, metadatos utilizados (incluidas las palabras clave), identificadores de candidatas y favoritos. Los cambios de metadatos o de películas elegibles invalidan la instantánea. El identificador utiliza dos hashes ligeros concatenados; no es una firma criptográfica. La versión 2.6.0 usa una clave de instantánea distinta de las versiones anteriores, sin migrar ni eliminar registros Dexie. Las instantáneas antiguas se conservan, pero no se reutilizan para el nuevo contrato que incluye interacciones generales y términos de sinopsis.

Antes de calcular, el repositorio comprueba si ya existe una instantánea de la versión y huella actuales. Así evita repetir el análisis cuando la entrada no ha cambiado.

## Límites conocidos

- La precisión depende de la diversidad de las valoraciones y de los metadatos disponibles en el dispositivo.
- El encaje es un orden relativo, no una probabilidad calibrada.
- La nota prevista es una proyección de las valoraciones conocidas, no una promesa sobre la reacción futura del usuario.
- Las recomendaciones solo pueden salir de candidatas que Prisma ya tenga localmente. Las películas Pendientes se incluyen cuando disponen de metadatos suficientes; las Vistas y los títulos con visionados quedan excluidos. Espectro no realiza búsquedas ilimitadas por su cuenta.
- Una afinidad es una asociación en los datos registrados, no una relación causal ni una preferencia permanente.
- Los comentarios escritos todavía no se interpretan como señales semánticas.

La arquitectura de evolución, evaluación de modelos, semántica local y ejecución Android se describe en [Arquitectura de inteligencia cinematográfica](./SPECTRO-INTELLIGENCE-ARCHITECTURE.md).

## Principios

- Local-first y privacidad por diseño.
- Diferenciar observaciones, preferencias declaradas e inferencias.
- No presentar preferencias concluyentes con muestras pequeñas.
- Explicar recomendaciones con datos verificables y evidencia visible.
- Preservar compatibilidad mediante versionado y huellas.
- Enriquecer solo metadatos cinematográficos; no alterar experiencias personales.
