# Prisma — Diseño de producto y arquitectura del rediseño

**Estado:** propuesta de arquitectura aprobada para guiar el desarrollo; no describe funcionalidades ya publicadas.  
**Fecha:** 16 de noviembre de 2026.  
**Base técnica revisada:** main en `1886f825368dcca573d4eaa7de15185f5d6b280a`, Espectro 2.2.0.

## 1. Propósito y alcance

Prisma evoluciona desde una aplicación que registra y explora películas hacia un diario cinematográfico personal cuya función principal es ayudar a elegir qué ver, descubrir cine y comprender los gustos que se forman con la experiencia.

Este documento fija el lenguaje común de producto, las responsabilidades de cada espacio, los contratos entre capas, los límites de la inteligencia y las condiciones para proteger los datos personales. Es una guía de implementación incremental, no una autorización para reconstruir la aplicación ni para modificar el almacenamiento personal.

### Resultados que debe producir el producto

1. Reducir el esfuerzo que supone decidir qué película ver.
2. Facilitar descubrimientos cinematográficos con contexto y razones claras.
3. Conservar la experiencia personal completa: películas, visionados, notas, listas y colecciones.
4. Convertir la experiencia registrada en conocimiento local, prudente y útil.

### Principios que no cambian

- Aplicación gratuita, sin monetización, cuentas obligatorias, perfiles públicos ni sincronización en la nube.
- Local-first: los datos personales permanecen en el dispositivo.
- IndexedDB mediante Dexie es la fuente de verdad de la experiencia personal.
- TMDB es la fuente principal de metadatos cinematográficos.
- El análisis de gustos y la inferencia personalizada se ejecutan localmente.
- La PWA debe seguir siendo instalable en Android y mantener offline las funciones compatibles.
- React, TypeScript, Vite, Dexie, Zod, Lucide React, Workbox, Vitest y Playwright siguen siendo la base.
- Las dependencias pesadas solo se incorporan cuando una prueba demuestra una mejora que compensa su coste.
- Ninguna pantalla, indicador o recomendación debe aparentar más certeza que la evidencia disponible.

## 2. Punto de partida real

La implementación actual está organizada en tres destinos principales: Personal, Descubrir y Espectro. Ya existen Biblioteca, Historial, Colecciones, Perfil, ficha cinematográfica, integración TMDB, cachés locales, enriquecimiento de metadatos, copias de seguridad, recomendaciones explicables, afinidades, evolución y mapa de relaciones.

La base Dexie actual contiene las tablas movies, libraryEntries, viewings, collections, collectionMovies, profile, preferences, catalogCache, availabilityCache, peopleCache, spectroSnapshots y appMetadata. El esquema instalado es la versión 1.

Las entidades conservan separaciones que el rediseño debe respetar:

- Movie representa la película y sus metadatos cinematográficos.
- LibraryEntry representa el estado actual en Biblioteca y el favorito.
- Viewing representa una experiencia individual, con su fecha, calificación y comentario.
- Collection y CollectionMovie representan las colecciones.
- Profile y Preferences representan datos personales locales.
- Las cachés e instantáneas son derivadas y regenerables; no sustituyen la fuente de verdad.

Una película puede tener muchos visionados. La calificación pertenece al visionado, no a un campo único de la película. Mover una película a Pendientes no elimina su historial. Los favoritos son una declaración personal independiente de la nota.

### Limitaciones funcionales detectadas que orientan el trabajo

1. El repositorio actual de Espectro construye sus candidatas excluyendo películas ya registradas en Biblioteca. Por tanto, sus recomendaciones no aprovechan directamente Pendientes.
2. La cola específica de metadatos de Espectro prioriza visionados y favoritos, además de títulos no guardados; no cubre de forma suficiente las películas pendientes.
3. La cola general de enriquecimiento cubre la Biblioteca, pero su consulta se centra en los detalles básicos y no reemplaza el enriquecimiento de créditos y temas que requiere el análisis.
4. La hoja de filtros de Descubrir existe visualmente, pero aún no aplica criterios.
5. La navegación principal tiene tres destinos. Inicio y Mi cine son objetivos del rediseño, no rutas ya publicadas.
6. La región de proveedores de disponibilidad se lee desde localStorage, mientras que Preferences también contiene un campo region en Dexie. Esta duplicidad debe resolverse con una migración de preferencia explícita y conservadora; nunca se deben unificar valores automáticamente.

Estos límites deben abordarse aprovechando los servicios existentes, no duplicándolos sin necesidad.

## 3. Arquitectura de producto: cuatro espacios

La navegación principal objetivo consta de cuatro espacios. Ajustes y las fichas de película siguen siendo destinos contextuales, no pestañas principales.

| Espacio | Pregunta que resuelve | Responsabilidad |
|---|---|---|
| Inicio | ¿Qué película podría ver ahora? | Selección personalizada y breve |
| Descubrir | ¿Qué cine puedo explorar? | Búsqueda y descubrimiento |
| Mi cine | ¿Qué he visto y cómo lo organizo? | Diario y biblioteca personales |
| Espectro | ¿Qué ha aprendido Prisma de mis gustos? | Inteligencia explicable |

### 3.1 Inicio — Elegir una película

Inicio debe reducir la indecisión. La experiencia inicial no será un feed infinito ni un panel de estadísticas.

Presentará tres propuestas distintas:

**Apuesta segura.** Una candidata con evidencia favorable relativamente consistente en las características que suelen acompañar las valoraciones altas. Debe privilegiar soporte y confianza, no solo una puntuación elevada.

**Nuevo descubrimiento.** Una candidata que comparte algunas señales favorables, pero combina esas características con elementos menos explorados. La finalidad es ampliar la experiencia sin perder toda conexión con los gustos conocidos.

**Fuera de tu zona.** Una candidata que se aleja de patrones frecuentes o introduce una combinación cinematográfica diferente. La explicación debe decir qué la hace distinta y por qué merece consideración; no debe disfrazar una elección aleatoria como una recomendación inteligente.

Las tres tarjetas deben contener, cuando exista evidencia:

- Título y arte cinematográfico.
- Encaje relativo, separado de la nota estimada.
- Una explicación breve y verificable.
- Nivel de confianza y limitaciones relevantes.
- Acceso a la ficha completa.

Cuando no haya datos suficientes para respaldar una categoría, Inicio debe decirlo de manera útil y ofrecer una alternativa, no fabricar una estimación.

#### Fuentes de candidatas

El motor debe poder trabajar con tres conjuntos diferenciados:

1. **Pendientes:** títulos elegidos previamente por el propietario; prioridad natural para la acción «Elegir desde pendientes».
2. **Catálogo local no guardado:** películas ya almacenadas por consultas, fichas o recomendaciones de TMDB, que no están vistas ni pendientes.
3. **Catálogo mundial:** resultados de una búsqueda o consulta explícita a TMDB. No debe confundirse con un catálogo mundial descargado por completo.

Vistas se excluye de la selección habitual. Podrá volver a aparecer únicamente en flujos explícitos de revisionado, cuando exista esa función y el propietario lo solicite.

La elegibilidad no debe depender de que una película tenga una puntuación TMDB alta. Debe depender de metadatos suficientes para el tipo de selección, ausencia de conflicto con el historial y criterios del usuario.

#### Acciones contextuales

La experiencia básica debe funcionar sin formularios. Las acciones adicionales se ofrecen cuando aportan valor:

- Elegir por mí.
- Estoy de humor para… (estado de ánimo como filtro temporal, no como preferencia permanente implícita).
- Tengo poco tiempo (duración máxima).
- Quiero algo parecido a… (película de referencia).
- Quiero descubrir algo diferente.
- Duelo cinematográfico (comparar dos o más candidatas y permitir que el propietario elija).
- Elegir desde Pendientes.
- Elegir desde el catálogo mundial.

Un filtro de sesión no debe reescribir el perfil de gustos. Solo una acción explícita puede guardar una preferencia persistente.

#### Reglas de selección

- Limitar el resultado inicial a tres propuestas bien diferenciadas.
- Evitar repetir inmediatamente una película descartada, sin eliminarla del catálogo.
- Evitar que las tres tarjetas sean variaciones del mismo género, director o franquicia.
- Aplicar restricciones duras antes de ordenar candidatas.
- Considerar diversidad, novedad, cobertura de metadatos y confianza después de calcular la afinidad.
- No convertir popularidad, valoración externa o disponibilidad de proveedor en una señal de gusto personal.
- Mantener la elección final en manos del propietario.

### 3.2 Descubrir — Explorar el cine

Descubrir debe ofrecer herramientas reales para recorrer el catálogo cinematográfico.

#### Búsqueda y filtros

Los filtros previstos son:

- Géneros.
- Rango de años y décadas.
- Duración mínima y máxima.
- Países de producción.
- Idioma original.
- Personas y profesionales: dirección, actuación, guion y otros créditos que TMDB exponga.
- Palabras clave temáticas.
- Disponibilidad por proveedor, solo cuando TMDB la ofrezca para una región seleccionada.

TMDB dispone de un endpoint de descubrimiento de películas con filtros y opciones de ordenación. La interfaz debe traducir controles comprensibles a parámetros soportados por ese endpoint y reutilizar la capa de caché existente.

La semántica de filtros debe ser visible: TMDB permite combinar algunos valores mediante AND (coma) u OR (barra vertical). Prisma debe definir qué comportamiento corresponde a cada control y evitar combinaciones sorprendentes.

Las regiones deben conservar conceptos distintos:

- region: contexto de estrenos regionales cuando proceda.
- watch_region: región para disponibilidad de proveedores.
- production countries / origin country: datos de producción u origen de la película.

No deben compartir un único campo de preferencias ni confundirse con lugares de rodaje o ambientación narrativa.

#### Descubrimiento por personas

La búsqueda de personas debe permitir abrir una ficha de profesional y recorrer sus créditos cinematográficos. Cada relación se presenta con el tipo de crédito y la fuente. No debe asumirse que una persona fue directora, guionista o compositora solo porque aparece en el reparto.

#### Descubrimiento semántico

La consulta en lenguaje natural podrá entender peticiones del tipo «algo parecido a Dark, pero más corto» o «películas melancólicas sobre identidad».

Su implementación tendrá dos rutas:

1. Filtros y búsqueda léxica para una experiencia inmediata y ligera.
2. Embeddings semánticos locales cuando el modelo esté instalado y disponible.

Si el modelo no está instalado, la búsqueda básica debe seguir funcionando. La interfaz no afirmará que comprende una intención semántica cuando únicamente ha aplicado filtros literales.

#### Ficha cinematográfica

La ficha sigue siendo el lugar principal para presentar:

- Datos y sinopsis.
- Encaje relativo y nota estimada, si hay suficiente evidencia.
- Explicación, confianza y límites de cada estimación.
- Créditos y equipo.
- Disponibilidad de streaming, alquiler o compra por región.
- Relaciones y películas similares.
- Acciones personales de Biblioteca y visionado.

El porcentaje de encaje y la nota estimada no deben convertirse en una sección independiente del producto: son información contextual de la película.

### 3.3 Mi cine — Diario cinematográfico personal

Mi cine agrupa las funciones que hoy están dentro de Personal. Debe conservar las rutas y operaciones existentes, aunque cambie la presentación.

Apartados:

- Biblioteca: Vistas, Pendientes y Favoritos.
- Historial: experiencias y revisionados.
- Colecciones: selecciones personales.
- Perfil: identidad local, preferencias y actividad.
- Estadísticas: resúmenes útiles derivados de los registros existentes.

Principios:

- La Biblioteca representa el estado actual; el Historial representa experiencias.
- Eliminar una colección nunca elimina películas.
- Borrar un visionado no debe eliminar automáticamente una película de Biblioteca.
- Una nota nueva crea o edita la experiencia seleccionada, no una calificación global de película.
- Los comentarios son privados y permanecen locales.
- Las estadísticas distinguen películas diferentes de número total de visionados.
- Los filtros personalizados no deben escribir sobre el catálogo cinematográfico.

Las posibles colecciones automáticas deben ser vistas como consultas derivadas, no como colecciones manuales que alteren relaciones persistidas.

### 3.4 Espectro — Inteligencia cinematográfica

Espectro es un servicio de conocimiento local que alimenta Inicio y la ficha cinematográfica. No es solo una pantalla de gráficos.

Su experiencia debe organizarse alrededor de tres recorridos comprensibles, sin crear seis pestañas independientes:

**Identidad y descubrimientos.** Resumen narrativo del perfil, afinidades respaldadas, patrones, contrastes y evolución. Cada hallazgo explica qué se observó, en qué títulos, con qué muestra, confianza y limitaciones.

**Explorador de relaciones.** Comienza con una película seleccionada y presenta solo relaciones relevantes. Permite profundizar por rasgo, encontrar películas puente y comparar títulos. No muestra todo el grafo de golpe.

**Atlas cinematográfico.** Mapa combinado con dos alcances —Mi Prisma y Cine mundial— y tres capas geográficas independientes:

| Capa | Significado | Fuente principal prevista |
|---|---|---|
| Países de producción | Países asociados a la producción de la película | TMDB |
| Lugares de rodaje | Lugares reales donde se filmó | Wikidata, P915 |
| Ambientación narrativa | Lugares donde ocurre la historia | Wikidata, P840 |

Las coordenadas proceden de la entidad geográfica (por ejemplo, Wikidata P625), no se deben inventar a partir de un país ni de una mención textual ambigua.

Mi Prisma toma como universo las películas de Biblioteca. Cine mundial consulta el catálogo disponible bajo filtros y paginación; no debe presentarse como cobertura exhaustiva de todas las películas del mundo.

El Atlas diferencia claramente país, región, ciudad y punto geográfico. Cada dato muestra procedencia, precisión, cobertura y momento de consulta.

## 4. Contrato de inteligencia y recomendación

El motor de recomendación debe separar tres problemas distintos:

1. **Estimación de nota:** inferir una calificación esperada en la escala personal de 1 a 10.
2. **Encaje:** producir un índice relativo de compatibilidad entre la candidata y señales de gusto observadas.
3. **Selección:** ordenar y diversificar candidatas para una intención concreta (segura, descubrimiento o fuera de zona).

No son métricas intercambiables.

### 4.1 Entradas

El servicio recibe datos normalizados y explícitos:

- Visionados y sus notas, fechas y secuencias.
- Películas y sus metadatos cinematográficos.
- Favoritos declarados.
- Estado Vistas/Pendientes.
- Candidatas elegibles.
- Restricciones de sesión (por ejemplo, duración o estado de ánimo).
- Metadatos que indican cobertura y procedencia.

Los comentarios personales no se interpretan automáticamente como señales de sentimiento. Si en el futuro se estudia su uso, debe ser opcional, local y claramente explicado.

### 4.2 Baseline heredado

Espectro 2.2.0 es la referencia inicial y no debe desaparecer sin comparación. Actualmente calcula afinidades por género, dirección, reparto, país, época, idioma, duración y temas; usa regularización por tamaño de muestra, separación entre favoritos y calificaciones, y explicaciones por contribución.

Su encaje 0–100 es una puntuación relativa, no una probabilidad calibrada. La nota prevista se calcula aparte. Las etiquetas actuales de confianza son descriptivas y no deben interpretarse como intervalos estadísticos.

Toda modificación que altere resultados debe incrementar la versión del algoritmo y generar instantáneas con una clave distinta. No se reutilizan instantáneas incompatibles.

### 4.3 Confianza explicable

La confianza debe basarse en evidencia medible, como:

- Número de películas distintas que respaldan la señal.
- Diversidad de géneros, autores o temas dentro de la muestra.
- Dispersión de las notas asociadas a esa característica.
- Cobertura y calidad de los metadatos.
- Estabilidad del resultado en validación temporal.
- Incertidumbre de la predicción cuando se disponga de una estimación calibrada.

Una misma película con varios revisionados no equivale a varias películas independientes. Las repeticiones se agregan por título antes de calcular soporte por característica.

Cuando no exista soporte, la respuesta correcta es «aún no hay evidencia suficiente».

### 4.4 Evidencia visible

Cada recomendación debe permitir responder:

- ¿Qué características la favorecen?
- ¿Qué características la alejan?
- ¿Qué películas respaldan la inferencia?
- ¿Qué cantidad de títulos diferentes intervino?
- ¿Qué parte de los datos falta?
- ¿Qué limitación puede afectar el resultado?

Los motivos deben corresponder a contribuciones reales del modelo. No se generarán explicaciones libres que no puedan rastrearse a las entradas.

## 5. Evaluación de modelos tradicionales y neuronales

Prisma no descarta una red neuronal por principio. Tampoco la adopta por apariencia o novedad. Se selecciona el mejor sistema que demuestre valor para este caso de uso.

### 5.1 Sistemas que se compararán

| Familia | Uso previsto | Papel de evaluación |
|---|---|---|
| Espectro 2.2.0 | Afinidades y recomendaciones existentes | Baseline |
| Promedio personal y predictores simples | Predicción de notas | Baseline mínimo |
| Regresión regularizada | Nota estimada y combinación de señales | Candidato clásico |
| Modelo bayesiano / jerárquico | Regularizar señales con pocas observaciones | Candidato clásico |
| TF-IDF / BM25 | Recuperación léxica y búsqueda de temas | Baseline semántico |
| Embeddings preentrenados | Similitud de sinopsis y consultas en lenguaje natural | Candidato neuronal |
| Modelo neuronal personalizado | Aprendizaje específico de preferencias | Solo si la muestra y la validación lo permiten |

No se entrenará una red neuronal compleja desde cero con una muestra personal pequeña.

### 5.2 Protocolo de evaluación

- Usar validación temporal cuando las fechas permitan ordenar correctamente las observaciones.
- Agrupar revisionados por película antes de crear los conjuntos de entrenamiento y evaluación.
- No permitir que una película, sus metadatos derivados o una recomendación futura filtren información al pasado.
- Fijar y documentar corte temporal, semillas, versiones de modelo y transformaciones.
- Si la cronología no es fiable, declarar esa limitación y usar validaciones agrupadas complementarias; no etiquetarlas como temporales.
- Comparar todos los modelos sobre las mismas películas evaluables.
- Mantener una evaluación independiente para nota, ranking, diversidad y recuperación semántica.

Métricas previstas:

- MAE y RMSE para predicción de notas.
- NDCG@K y métricas de ranking para calidad de las primeras recomendaciones.
- Cobertura, diversidad y novedad para evitar recomendaciones repetitivas.
- Calibración e intervalos de incertidumbre para confianza, cuando el método lo permita.
- Tiempo de inferencia, RAM, almacenamiento, descarga, CPU, batería y rendimiento percibido en Android.

El modelo ganador no será necesariamente el que obtenga el mejor MAE aislado. Debe mejorar el resultado útil del producto y mantener un coste móvil razonable.

### 5.3 Inferencia local y descarga opcional

ONNX Runtime Web y Transformers.js son tecnologías candidatas para ejecutar modelos en el navegador. La integración debe diseñarse con estas condiciones:

- WASM/CPU como ruta general compatible.
- WebGPU como aceleración opcional cuando el dispositivo la soporte.
- Carga bajo demanda y nunca en el arranque obligatorio.
- Descarga con tamaño y revisión fijados, verificación de integridad y licencia revisada.
- Inferencia fuera del hilo de interfaz mediante Web Worker cuando sea viable.
- Cancelación, limpieza y límites para evitar consumo excesivo.
- Caché local compatible con el almacenamiento del navegador.
- Posibilidad de eliminar los archivos del modelo sin tocar biblioteca, historial ni preferencias.
- Fallback funcional completo sin modelo y sin conexión.

Los embeddings de metadatos cinematográficos pueden precalcularse y almacenarse como artefactos derivados versionados. No deben convertirse en registros personales ni contaminar los respaldos.

Ningún historial, calificación, comentario, lista privada o perfil se enviará a un endpoint externo para generar embeddings o inferencias.

## 6. Calidad y enriquecimiento de metadatos

El motor no puede compensar metadatos ausentes con puntuaciones arbitrarias. La cobertura de las películas pendientes es una dependencia prioritaria del recomendador.

### 6.1 Coordinación de consultas

Actualmente hay dos mecanismos de enriquecimiento con objetivos distintos. La evolución debe coordinarlos para no lanzar colas independientes que se solapen y superen en conjunto el ritmo permitido:

- **Enriquecimiento de Biblioteca:** detalles básicos y persistencia de metadatos.
- **Enriquecimiento de Espectro:** detalles, créditos y palabras clave necesarios para el análisis.

Se debe avanzar hacia un coordinador de consultas reutilizable, con prioridades y tareas por recurso. No se justifica una tercera cola paralela.

### 6.2 Prioridad de enriquecimiento

1. Pendientes que el propietario quiere utilizar en Inicio o filtrar en Descubrir.
2. Películas vistas y favoritas que aún tengan datos necesarios para el perfil.
3. Candidatas locales con metadatos insuficientes.
4. Resto del catálogo solo bajo una acción explícita o una necesidad concreta.

El orden debe ser interrumpible y reanudable. La aplicación debe indicar cuántas películas y recursos se consultarán antes de una operación amplia.

### 6.3 Reutilización, caché y errores

- Reutilizar detalles, créditos, palabras clave y recursos ya almacenados.
- Evitar repetir solicitudes cuando la caché siga siendo válida.
- Mantener caducidades específicas por recurso.
- Aplicar límite de ritmo compartido y respetar Retry-After ante HTTP 429.
- Aplicar reintentos con espera progresiva a errores temporales.
- Distinguir 404, autenticación, límite de solicitudes, desconexión y error permanente.
- Guardar estados operativos reanudables separados de la información personal.
- No borrar metadatos válidos por un fallo de revalidación.

### 6.4 Límite de escritura

El enriquecimiento puede actualizar únicamente campos cinematográficos del registro Movie, como títulos, sinopsis, fecha, duración, géneros, países de producción, idioma, imágenes, dirección, reparto y palabras clave.

No puede modificar:

- Estados de Biblioteca.
- Favoritos.
- Visionados, secuencias, fechas ni calificaciones.
- Comentarios y notas personales.
- Colecciones y sus relaciones.
- Perfil o preferencias.

Las escrituras deben realizarse con un parche explícito de metadatos y pruebas que demuestren que las tablas personales permanecen intactas.

## 7. Atlas: modelo de procedencia geográfica

No todas las capas geográficas tienen la misma fuente ni la misma precisión.

### 7.1 Producción

La ficha de TMDB expone países de producción. Es información a nivel de país, no una lista de ciudades de rodaje ni de ambientaciones narrativas.

El mapa puede agregar producción por país si cada código y etiqueta están normalizados y su procedencia queda visible. El centroide de un país, si se usa para una visualización, solo sirve para dibujar el área y nunca se etiquetará como un lugar donde se rodó la película.

### 7.2 Rodaje y ambientación

Wikidata diferencia expresamente:

- P915: lugar real de rodaje.
- P840: lugar donde se sitúa la narración.
- P625: coordenadas geográficas de una entidad.

El Atlas debe conservar el identificador de entidad, propiedad, etiqueta, coordenadas disponibles, nivel geográfico, referencia y momento de recuperación. No debe inferir una coordenada por coincidencia de nombres.

Una afirmación sin coordenadas puede aparecer en una lista geográfica si su entidad es identificable, pero no se dibuja como un punto inventado. Una localización ficticia debe identificarse como ficticia o narrativa, no como ciudad real.

### 7.3 Cobertura y precisión

Cada capa mostrará:

- Número de películas analizadas.
- Número con datos disponibles.
- Número sin información.
- Fuente y fecha de consulta.
- Precisión geográfica del dato.
- Si se trata de una afirmación con referencia o de un dato sin referencia visible.

Los mapas nunca comunicarán cobertura mundial completa cuando la fuente solo contenga una parte de los títulos.

### 7.4 Consulta y caché

Las consultas geográficas deben hacerse bajo demanda, por película o por conjuntos pequeños, reutilizando la caché. Deben existir límites de frecuencia y tratamiento de errores de la fuente.

Antes de adoptar una consulta masiva de Wikidata se deben medir cobertura, latencia, términos de uso y coste operativo. La integración no debe ser necesaria para consultar la Biblioteca offline.

## 8. Arquitectura técnica objetivo

Se mantiene la arquitectura por capas que ya usa el proyecto:

### Presentación React

Páginas y componentes de Inicio, Descubrir, Mi cine, Espectro y ficha. No acceden directamente a Dexie ni realizan fetch a TMDB/Wikidata.

### Dominio puro

Funciones TypeScript deterministas y testeables para:

- Elegibilidad de candidatas.
- Normalización de filtros.
- Encaje, nota y confianza.
- Diversidad y selección de propuestas.
- Evidencia y contrastes.
- Agrupación de relaciones.
- Normalización y validación geográfica.

Las reglas del dominio no dependen de React, DOM, IndexedDB ni fetch.

### Repositorios y servicios locales

Los repositorios leen las tablas de Dexie, ensamblan entradas para el dominio y guardan únicamente resultados derivados en las tablas ya existentes cuando sea apropiado.

Las instantáneas se identifican con versión de algoritmo y huella de entrada. La caché de TMDB y las consultas geográficas se mantienen independientes de los registros personales.

### Integraciones

- TMDB: cliente y servicios existentes.
- Wikidata: adaptador independiente, consultas limitadas y caché trazable.
- Motor semántico local: interfaz desacoplada del runtime concreto, con fallback sin modelo.

La aplicación debe poder utilizar biblioteca, historial, fichas guardadas y funciones locales compatibles si una integración falla.

### Esquema Dexie

No se propone una reconstrucción ni una migración inicial del esquema. El rediseño de navegación, los contratos del recomendador y las primeras pruebas deben funcionar con el esquema actual.

Si posteriormente una capacidad necesita una tabla o índice nuevo, la propuesta de migración debe justificarlo, ser aditiva siempre que sea posible y tener pruebas de apertura de bases antiguas, rollback de aplicación y conservación de cada tabla personal.

No se debe limpiar ni reemplazar la base de datos para regenerar cachés o instantáneas.

### Rutas y compatibilidad

Las rutas personales existentes deben seguir resolviéndose. Inicio se incorpora como destino principal nuevo; Mi cine puede conservar internamente las rutas /personal existentes mientras cambia el texto y la navegación visible.

Los enlaces antiguos y los marcadores no deben romperse. El cambio de ruta inicial se probará en instalación nueva y en una PWA ya instalada con una versión anterior.

## 9. Seguridad, privacidad y funcionamiento offline

### Datos personales

Los datos personales son locales y no se incluyen en telemetría. Las funciones de análisis leen esos datos desde IndexedDB. El catálogo externo no recibe notas, comentarios, historial ni perfil.

### Cachés y copias

- Las cachés regenerables no son parte de la copia personal.
- Los artefactos de modelo no se incluyen en el JSON de respaldo.
- Los estados de cola de enriquecimiento no se mezclan con visionados ni preferencias.
- La exportación/restauración de respaldo mantiene su contrato y validaciones actuales.
- Ninguna prueba automatizada utiliza el perfil real.

### Offline

Sin red deben seguir funcionando los datos personales, las fichas ya guardadas, la Biblioteca, el Historial, las colecciones, el perfil y cualquier análisis que dependa exclusivamente de datos locales.

La búsqueda remota, los metadatos no consultados, los proveedores y la descarga de modelos pueden requerir conexión. Los límites deben comunicarse en contexto.

Los modelos ya descargados podrán inferir offline si el almacenamiento y el runtime están disponibles, pero el producto no debe depender de ello.

## 10. Experiencia visual y accesibilidad

Dirección artística: diario cinematográfico premium, oscuro, elegante y minimalista. Las portadas y fotografías tienen prioridad; los metadatos y controles ocupan solo el espacio necesario.

Se conserva el sistema visual existente: fondo #0E1117, superficies #171D26 y #222B37, texto #F1EEE8 y acento #D9BD91. Se utiliza la pila de fuentes del sistema para no depender de recursos externos y conservar rendimiento offline.

Criterios de interacción:

- Navegación inferior simple con cuatro destinos principales.
- Controles táctiles con áreas suficientes para Android.
- Jerarquía clara, tipografía legible y espacio generoso.
- Animaciones discretas y respeto por prefers-reduced-motion.
- Estados vacíos que expliquen qué falta y qué puede hacerse.
- Paneles de filtros que realmente apliquen y permitan limpiar criterios.
- Sin gráficos ni contadores que no ayuden a una decisión.
- Foco visible y etiquetas accesibles para lectores de pantalla.
- Diseño adaptable en anchuras móviles y escritorio.

## 11. Secuencia de implementación y dependencias

La secuencia se ordena por dependencias reales y valor entregado, no por una numeración de etapa heredada.

| Entrega | Alcance | Dependencia / criterio de salida |
|---|---|---|
| A. Contrato de producto | Navegación, especificación visual, límites de datos y contratos de servicios | Este documento revisado y aceptado |
| B. Fundación de Inicio | Ruta, navegación de cuatro espacios y motor de candidatas locales | Pruebas de elegibilidad, tres intenciones y razones reproducibles |
| C. Pendientes y metadatos | Coordinación de enriquecimiento y priorización de Pendientes | Cobertura medible, cola reanudable y pruebas de no alteración personal |
| D. Descubrir funcional | Filtros TMDB, personas, similitudes y consulta semántica básica | Filtros combinables correctos, caché y comportamiento offline |
| E. Modelos híbridos | Baselines, regresión/bayesiano, embeddings y benchmark móvil | Mejora demostrada y confianza documentada antes de adopción |
| F. Espectro renovado | Identidad, hallazgos, contrastes, evolución y explorador progresivo | Evidencia y soporte comprobables por cada salida |
| G. Atlas | Producción, rodaje y ambientación con dos alcances | Procedencia, precisión y cobertura visibles |
| H. Mi cine | Refinamiento de Biblioteca, Historial, Colecciones y Perfil | Funciones previas y datos preservados |
| I. Cierre | Rendimiento, accesibilidad, Android, PWA y publicación | Controles obligatorios aprobados y Pages verificada |

Inicio puede comenzar con películas locales que ya tengan metadatos suficientes. El enriquecimiento de Pendientes se ejecutará en paralelo bajo un coordinador, evitando que todo el producto dependa de una descarga masiva.

## 12. Criterios de aceptación transversales

### Producto

- Cada función resuelve una necesidad dentro de los cuatro objetivos de Prisma.
- No exige formularios para la acción básica.
- Cada recomendación explica su evidencia y admite «datos insuficientes».
- El usuario puede comprender la diferencia entre encaje, nota y confianza.
- No se muestran relaciones, localizaciones ni descubrimientos sin respaldo.

### Datos

- No hay operaciones de restauración, importación, borrado masivo ni consolidación implícitas.
- Las pruebas usan datos ficticios y bases temporales.
- Las escrituras de metadatos se prueban con snapshots de tablas personales antes y después.
- Los cambios de algoritmo invalidan solo artefactos derivados incompatibles.
- El respaldo existente sigue siendo válido y se puede restaurar con el flujo explícito ya documentado.

### Inteligencia

- Baselines tradicionales conservados y comparables.
- Validación temporal o limitación temporal explicada.
- Métricas calculadas sobre los mismos datos de prueba.
- Modelo neuronal adoptado únicamente ante mejora repetible.
- Modo sin modelo siempre disponible.
- Coste móvil medido en dispositivos reales de referencia.

### Calidad y entrega

Se mantienen los controles obligatorios documentados en QUALITY-GATE.md:

1. TypeScript, unit tests, build y smoke test.
2. Playwright E2E.

La verificación PWA/offline sigue siendo informativa y paralela, no un nuevo requisito de protección de main. Las pruebas no se desactivan para conseguir una CI verde.

Cada entrega se realiza en su propia rama y PR. Un PR que modifique la aplicación no se integra si falla cualquiera de los controles obligatorios aplicables. Tras fusionar se verifican GitHub Pages, recursos publicados y manifiesto PWA. La revisión en Android físico no se sustituye por la CI.

## 13. Fuera de alcance

No forman parte del rediseño:

- Cuentas obligatorias, perfiles públicos, funciones sociales o nube obligatoria.
- Monetización, publicidad o recomendaciones patrocinadas.
- Un backend propio para procesar perfiles personales.
- Entrenar una red neuronal compleja desde cero con una muestra insuficiente.
- Descargar de una vez el catálogo mundial de TMDB o todas las ubicaciones de Wikidata.
- Presentar popularidad externa como gusto del propietario.
- Convertir comentarios privados en señales semánticas sin consentimiento explícito.
- Reemplazar la base de datos personal, cambiar identificadores o reconstruir el respaldo.
- Introducir estadísticas, gráficos o secciones independientes que no mejoren la elección o comprensión del cine.

## 14. Referencias técnicas

Documentación oficial consultada para las capacidades descritas:

- TMDB — Discover Movies: https://developer.themoviedb.org/reference/discover-movie
- TMDB — Movie Details: https://developer.themoviedb.org/reference/movie-details
- ONNX Runtime Web: https://onnxruntime.ai/docs/get-started/with-javascript/web.html
- ONNX Runtime WebGPU Execution Provider: https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html
- Hugging Face Transformers.js: https://huggingface.co/docs/transformers.js
- Hugging Face Transformers.js Pipelines: https://huggingface.co/docs/transformers.js/en/pipelines
- Wikidata P915 — filming location: https://www.wikidata.org/wiki/Property:P915
- Wikidata P840 — narrative location: https://www.wikidata.org/wiki/Property:P840
- Wikidata P625 — coordinate location: https://www.wikidata.org/wiki/Property:P625
- Prisma — modelo de datos: DATA-MODEL.md
- Prisma — arquitectura técnica: TECHNICAL-ARCHITECTURE.md
- Prisma — Espectro 2.2: SPECTRO.md
- Prisma — integración TMDB: TMDB-INTEGRATION.md
- Prisma — control de calidad: QUALITY-GATE.md

Las referencias externas describen capacidades técnicas de las fuentes, no garantizan cobertura, exactitud ni disponibilidad para todas las películas. La implementación debe validar la respuesta real de cada consulta y respetar las condiciones de uso y autorización aplicables.

---

**Regla final:** Prisma debe ser una herramienta cinematográfica personal que ayuda a decidir, descubrir, conservar y comprender. La inteligencia sirve a esa experiencia; nunca debe convertirse en un fin que comprometa la privacidad, la claridad, el rendimiento o los datos del propietario.
