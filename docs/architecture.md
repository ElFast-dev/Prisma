# Arquitectura de Prisma

## Resumen

Prisma es una aplicación estática de cliente escrita con HTML, CSS y JavaScript nativos. No necesita un backend ni dependencias de ejecución; GitHub Pages sirve los archivos estáticos y el navegador carga ES modules directamente.

## Mapa de módulos

| Ruta | Responsabilidad |
| --- | --- |
| `index.html` | Documento, navegación, puntos de montaje y entrada ES module versionada. |
| `app.js` | Punto de entrada y composición: mantiene el estado global de interfaz e inyecta dependencias entre los módulos. Los renderizadores, acciones de dominio, ciclo de vida y servicios principales viven en módulos dedicados. |
| `js/core/movie-utils.js` | Identidad y normalización de películas, alias canónicos de géneros, listas, validación de notas y escape de texto. |
| `js/core/state-model.js` | Estado inicial y normalización del estado persistido/importado. |
| `js/core/storage.js` | IndexedDB y fallback a localStorage. |
| `js/core/storage-protection.js` | Consulta persistencia/cuota del almacenamiento y solicita persistencia solo tras una acción explícita. |
| `js/recommendations/features.js` | Extrae géneros, palabras clave, términos de sinopsis, reparto, dirección, guion, música, compañías, países, idiomas, franquicia, duración y década fiable; excluye emociones y notas libres. |
| `js/recommendations/engine.js` | Perfil y predicción explicable a partir de notas numéricas, con prior suavizado y ponderación diferenciada de géneros, temas, sinopsis, reparto y demás metadatos cinematográficos. |
| `js/recommendations/ridge-evaluation.js` | Experimento local y bajo demanda de Ridge: conserva validación de cinco pliegues y tres repeticiones y walk-forward temporal en cinco ventanas futuras. La fecha de incorporación a una colección importada solo puede usarse mediante un proxy explícito, marcado no verificado y exploratorio; nunca modifica `watchedAt` ni las recomendaciones activas. |
| `js/recommendations/ridge-kernel.js` | Operaciones numéricas deterministas de Ridge: escalado de características, vectorización, kernel, Cholesky, entrenamiento y predicción. Es puro y no accede al estado, al DOM ni a fuentes de datos. |
| `js/recommendations/repeated-validation-summary.js` | Resumen puro de dirección y rango mínimo–máximo de las métricas agregadas por repetición; no produce intervalos de confianza ni modifica el modelo. |
| `js/recommendations/evaluation.js` | Evaluación offline de nDCG@5 por modo sobre pliegues y candidatas comunes, además de diversidad de géneros en las listas actuales; no ajusta automáticamente el recomendador. |
| `js/recommendations/normalization-evaluation.js` | Experimento local, bajo demanda y emparejado que compara el denominador actual, una raíz de cobertura y un control sin penalización; informa MAE, estabilidad por pliegue y nDCG@5 sin cambiar el ranking activo. |
| `js/recommendations/ranking.js` | Puntúa y diversifica candidatas de catálogo local y el pool efímero de películas populares ya consultadas en TMDB; excluye la colección y no persiste candidatas remotas. |
| `js/diagnostics/recommendation-report.js` | Construye el informe JSON agregado v11 del Laboratorio, incluyendo el modo de fuente temporal elegido como agregado, métricas Ridge, comparación híbrida fija 50/50, calibración de normalización y validación repetida; no serializa fechas exactas, registros individuales ni accede al DOM, almacenamiento o red. |
| `js/catalog/csv-parser.js` | Parseo determinista de CSV/TSV con campos entrecomillados multilínea, comillas escapadas y reconciliación de metadatos repetidos por identidad. |
| `js/catalog/catalog-model.js` | Combinación de fuentes, identidad en el catálogo, búsqueda y estadísticas del perfil. |
| `js/collection/collection-model.js` | Derivación y filtrado de historial, pendientes, ocultos y estados relacionados con la colección. |
| `js/ui/presentation-utils.js` | Utilidades puras de presentación: fechas, formatos, enlaces externos y fragmentos HTML reutilizables. |
| `js/ui/page-views.js` | Composición y enrutamiento de pantallas; delega Progreso, Descubrir, Colección, Ajustes, la racha y el Laboratorio a fábricas de vistas especializadas. |
| `js/ui/progress-views.js` | Renderizador de Progreso: bienvenida inicial, métricas personales, géneros mejor valorados y actividad reciente; recibe la racha confirmada como dependencia de presentación. |
| `js/ui/catalog-views.js` | Tarjetas de película, filtros de catálogo local, recomendaciones presentadas en Descubrir, selector de modos y composición de resultados; delega los cálculos del ranking al motor. |
| `js/ui/settings-views.js` | Renderiza Apariencia, conexión TMDB, estado de protección del almacenamiento, importación/exportación y la página Ajustes; recibe el contexto y no contiene las acciones de persistencia. |
| `js/ui/collection-views.js` | Renderizadores de filas, tarjetas compactas, pósteres recientes, pestañas y listas de la Colección; conserva las mismas funciones públicas a través de `createPageViews(ctx)`. |
| `js/ui/lab-views.js` | Compone los paneles del Laboratorio y delega la validación Ridge y la evaluación temporal a submódulos. |
| `js/ui/lab-ridge-view.js` | Renderiza validación Ridge repetida, métricas MAE/nDCG, estabilidad y progreso; no ejecuta el modelo. |
| `js/ui/lab-temporal-view.js` | Renderiza evaluación walk-forward temporal, ventanas futuras, procedencia y proxy exploratorio de incorporación; no cambia fechas guardadas. |
| `js/ui/watch-streak-view.js` | Renderizador aislado de la racha personal: alinea cuadrículas mensuales, expone texto accesible y mantiene un solo mes abierto; recibe el estado y el escape HTML por inyección. |
| `js/ui/theme-controller.js` | Aplica y persiste la preferencia de tema oscuro/claro localmente, sin mezclarla con el perfil cinematográfico. |
| `js/ui/modal-views.js` | Fachada que compone cuatro vistas modales y mantiene su API pública estable. |
| `js/ui/utility-sheet-view.js` | Renderiza paneles auxiliares de información, orden y géneros mediante el contexto inyectado. |
| `js/ui/movie-detail-view.js` | Renderiza la ficha detallada de película sin ejecutar las acciones que la modifican. |
| `js/ui/person-detail-view.js` | Renderiza biografía y filmografía de personas con TMDB y la colección local. |
| `js/ui/rating-sheet-view.js` | Renderiza el editor numérico de puntuación de 1 a 10. |
| `js/ui/person-filmography.js` | Deduplica créditos por ID TMDB, filtra la colección por identidad y agrupa filmografías por año. |
| `js/app/movie-actions.js` | Acciones de dominio para valorar, borrar notas, marcar vistas, gestionar pendientes y ocultar películas. |
| `js/app/lab-actions.js` | Coordina los experimentos del Laboratorio, su progreso y cancelación, y la copia explícita del informe diagnóstico mediante dependencias inyectadas; no redefine el ranking ni envía datos. |
| `js/app/storage-protection-actions.js` | Coordina la inspección del almacenamiento y la solicitud explícita de persistencia, con guardas de concurrencia, avisos y repintado inyectados; no persiste datos personales ni accede al DOM directamente. |
| `js/import-export/actions.js` | Orquestación de las importaciones JSON/CSV, copias de seguridad, restauración y restablecimiento local. |
| `js/app/event-handlers.js` | Listeners globales de click, input, errores de imágenes y selección de archivos, conectados mediante un contexto explícito. |
| `js/tmdb/settings-actions.js` | Guardado, prueba y eliminación de credenciales TMDB sin mezclar acciones con el coordinador. |
| `js/ui/tmdb-views.js` | Renderizado de atribución, resultados de búsqueda y estado de sincronización de TMDB. |
| `js/tmdb/history-sync.js` | Limpieza de caché local y enriquecimiento del historial; marca créditos y palabras clave por separado, repara registros legacy con póster reciente y conserva identidad y fechas personales. |
| `js/tmdb/browser-actions.js` | Consultas TMDB para explorar el catálogo y completar características de películas de forma diferida. |
| `js/tmdb/movie-details.js` | Carga y persistencia de fichas de película, personas y metadatos relacionados. |
| `js/ui/modal-controller.js` | Estado de interacción para fichas, puntuaciones y paneles auxiliares. |
| `js/recommendations/ranking.js` | Orden y diversificación de recomendaciones, estadísticas por género y función pura `rankCandidates`, reutilizada por la evaluación offline. |
| `js/app/runtime.js` | Eventos de actividad, persistencia principal y notificaciones breves. |
| `js/app/lifecycle.js` | Navegación, inicialización del perfil local y coordinación del registro del service worker. |
| `js/app/pwa-update.js` | Detección de cambios de controlador PWA y aviso accesible para recargar sin interrumpir ni borrar datos personales. |
| `js/import-export/personal-data.js` | Reconocimiento y combinación de exportaciones personales; separa `addedAt` de `watchedAt` y marca la procedencia de fechas importadas explícitamente. |
| `js/tmdb/client.js` | Credenciales, peticiones HTTP, errores, caché de géneros y conversión de respuestas TMDB. |
| `styles.css` | Tokens, base y estructura general. |
| `styles/movie-cards.css` | Tarjetas y composición de películas. |
| `styles/dialogs-feedback.css` | Diálogos, hojas modales y avisos. |
| `styles/responsive.css` | Responsive inicial y movimiento reducido. |
| `styles/visual-refinements.css` | Refinamientos visuales posteriores. |
| `styles/collection.css` | Experiencia de colección. |
| `styles/accessibility.css` | Interacción accesible y estados de foco. |
| `styles/catalog.css` | Tarjetas poster-first de Descubrir. |
| `styles/collection-content.css` | Jerarquía del contenido de colección. |
| `styles/movie-details.css` | Ajustes de ficha y puntuaciones externas. |
| `styles/prisma-design-system.css` | Tokens neutros para el modo negro predeterminado y el modo claro, estados de interacción y movimiento reducido. |
| `assets/prisma.svg` | Identidad gráfica. |
| `manifest.webmanifest` | Metadatos PWA. |
| `sw.js` | Caché versionada y recuperación offline limitada. |

## Reglas de diseño

El código nuevo debe residir en un módulo con una responsabilidad concreta. El motor, los analizadores y las utilidades puras no deben consultar el DOM, escribir almacenamiento ni depender de estado de interfaz. Las dependencias cambiantes se inyectan como funciones. La capa de aplicación coordina efectos secundarios y conecta los módulos.

La extracción de responsabilidades de este expediente está completa: dominio, persistencia, modelos de catálogo y colección, recomendador, vistas de página y modales, eventos, acciones de usuario, importación/exportación, runtime, ciclo de vida e integración TMDB tienen módulos definidos e interfaces explícitas. `app.js` queda como raíz de composición y mantiene el estado compartido necesario para conectar esas piezas. Las pruebas deben seguir protegiendo esos límites; la funcionalidad nueva debe colocarse en el módulo que corresponda, no volver a concentrarse en la entrada.

## Estado y privacidad

El perfil personal continúa guardándose en el navegador mediante IndexedDB cuando existe, con fallback a localStorage. No hay sincronización de perfil con un servidor. La credencial opcional de TMDB se mantiene en el navegador. Ajustes consulta si el origen tiene almacenamiento persistente y puede solicitarlo solo tras una acción explícita; el navegador decide el resultado y exportar una copia sigue siendo importante porque borrar los datos del sitio puede eliminar el perfil. El informe de diagnóstico se calcula y copia bajo demanda, nunca se envía automáticamente, omite los registros individuales y avisa de que las etiquetas agregadas pueden revelar gustos.

No se deben incluir historiales personales, credenciales, copias privadas ni notas reales en el repositorio, especificaciones, logs o CI. Las pruebas utilizan datos sintéticos.

## Catálogo y recomendador

No existe un catálogo de muestra empaquetado. Los registros personales se normalizan por funciones de dominio compartidas; la colección empieza vacía y los resultados remotos de TMDB se mantienen como resultados de exploración hasta que la persona añade una película explícitamente. El motor recibe proveedores de valoraciones, búsqueda de películas, características y validación, lo que permite probar el perfil y la evaluación sin DOM ni almacenamiento. El Laboratorio compara de forma aislada la normalización de influencia y el informe JSON agregado v11 puede incluir únicamente sus métricas agregadas; la variante activa continúa usando el denominador actual. Las predicciones siguen limitadas de 1 a 10, dan mayor influencia a los géneros que a etiquetas aisladas y exponen cobertura/confianza según las señales disponibles. Los géneros se convierten en claves canónicas mediante el módulo común para que alias localizados o importados como “science fiction”, “sci-fi” y “Ciencia ficción” coincidan entre perfil y candidatas. La evaluación leave-one-out respeta IDs TMDB de remakes, pasa el año al resolver metadatos de entradas sin ID y compara MAE con la media del pliegue de entrenamiento; sigue siendo una métrica experimental. Si faltan tanto ID como año y hay homónimos, no se elige una ficha arbitraria.

## TMDB

TMDB es opcional y se consulta desde el navegador tras configurar una credencial. Las imágenes y metadatos pueden depender de recursos alojados por TMDB. No se realizan llamadas autenticadas a TMDB durante las pruebas ordinarias.

## GitHub Pages y caché

Los módulos usan rutas relativas para funcionar bajo el subdirectorio `/Prisma/`. El documento carga `app.js` como ES module. El service worker mantiene una caché identificada por versión, incluye la entrada y sus módulos locales, y borra versiones antiguas. Al modificar JS, hay que actualizar la URL versionada de la entrada, el inventario de recursos, el número de caché y la verificación Playwright.

## Restricciones

- Mantener el despliegue estático y evitar un proceso de compilación mientras los módulos nativos sean suficientes.
- No cambiar formatos personales ni algoritmo en un refactor de arquitectura.
- Todo límite modular importante debe estar protegido por pruebas automatizadas; las pruebas deben invocar APIs públicas, no extraer código por marcadores textuales.
