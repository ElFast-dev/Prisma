# Integración cinematográfica con TMDB

## Alcance de la autorización específica

El propietario de Prisma ha facilitado una comunicación específica de TMDB que autoriza para Prisma el uso de metadatos, imágenes, almacenamiento en caché, análisis y aprendizaje con metadatos, disponibilidad de streaming y distribución pública gratuita sin monetización ni atribución adicional.

La evidencia original se conserva de forma privada y no debe subirse al repositorio.

La autorización específica no elimina los límites físicos de almacenamiento del dispositivo ni los límites operativos del servicio.

## Credenciales

Cada instalación configura su propia credencial. Nunca se incluirá una clave en el código, variables públicas de Vite, Git, respaldos ni distribución compilada.

Una credencial utilizada desde una SPA puede ser inspeccionada por quien controla el dispositivo. No es un secreto protegido por servidor.

## Cliente

Todas las peticiones pasan por src/infrastructure/tmdb/TmdbClient.ts.

El cliente recibe el token en tiempo de ejecución y utiliza el encabezado Bearer. No administra dónde se almacena el secreto.

## Endpoints previstos

- /search/movie
- /discover/movie
- /movie/{id}
- /movie/{id}/credits
- /movie/{id}/images
- /movie/{id}/recommendations
- /movie/{id}/watch/providers
- /person/{id}
- /configuration

## Imágenes

La URL se construye con la configuración de imágenes, un tamaño permitido y la ruta del archivo. Ver imageUrl.ts.

## Disponibilidad

La región inicial es Panamá (PA). Se distinguen streaming, alquiler y compra. Los resultados almacenados siempre conservan la fecha de última consulta.

## Resiliencia

Un error de TMDB no equivale a una película inexistente. Se reutiliza información local, se distinguen errores de autenticación, límites de solicitudes y fallos temporales, y se reintenta de forma controlada.

## Caché

Los intervalos de revalidación implementados son: búsquedas y tendencias 6 horas; detalles 30 días; créditos 90 días; recomendaciones 7 días; disponibilidad 24 horas; configuración de imágenes 30 días. Son decisiones internas de Prisma, no límites contractuales de TMDB. Los metadatos no se eliminan al vencer; se revalidan cuando vuelve a haber conexión. Las imágenes permanecen en Cache Storage hasta limpieza manual o presión de almacenamiento del navegador.

## No enviar datos personales

Las valoraciones, comentarios, fechas de visionado, listas privadas y perfil de Espectro no se enviarán a TMDB.


## Implementación inicial

La primera integración utiliza una credencial personal introducida desde Ajustes. Se guarda en localStorage del navegador, nunca en el repositorio ni en los respaldos. El cliente realiza solicitudes Bearer desde el navegador; esta credencial puede inspeccionarse en el dispositivo y no debe tratarse como secreto de servidor.

Las tendencias semanales y las búsquedas se consultan desde Descubrir. Los resultados estructurados se guardan en Dexie para poder reutilizarlos si la red falla. Las imágenes se almacenan en caché CacheFirst mediante el Service Worker, con un límite de entradas para administrar el espacio del dispositivo.

La configuración de GitHub Pages se realiza seleccionando GitHub Actions como fuente en Settings → Pages. El flujo deploy.yml construye dist y lo publica.


## Enriquecimiento de la Biblioteca

El enriquecimiento usa los identificadores TMDB que ya están guardados en la Biblioteca. Recupera detalles de una película por solicitud, reutiliza la caché de detalles de 30 días y persiste el resultado de cada elemento en appMetadata de IndexedDB. No descarga imágenes en tamaño original: guarda sus rutas de TMDB y deja que la caché limitada del Service Worker administre las imágenes solicitadas por la interfaz.

La cola procesa hasta 24 películas simultáneamente y separa inicialmente el inicio de cada solicitud al menos 35 milisegundos (ritmo objetivo máximo de unas 28 solicitudes por segundo). Mantiene margen frente al límite superior aproximado que publica TMDB; si recibe HTTP 429, aplica Retry-After como pausa global y duplica progresivamente el intervalo entre nuevas solicitudes para reducir la presión sobre el servicio. Los errores temporales se reintentan hasta tres veces; los 404 se registran como no encontrados y los errores de autenticación detienen el proceso. La cola pausa al perder conexión y puede reanudarse al volver a estar en línea o al reabrir Ajustes después de un cierre.

El proceso solo actualiza campos de metadatos en movies. No modifica libraryEntries, viewings, collections, profile, preferences ni la credencial TMDB. El progreso de enriquecimiento es estado operativo local y no forma parte de los respaldos personales de Prisma.


## Filtros de Descubrir

Descubrir consulta `/discover/movie` cuando hay criterios avanzados activos. Los filtros se envían a TMDB: género, duración mínima/máxima, rango de fechas de estreno, valoración mínima, número mínimo de votos, idioma original y orden. La búsqueda textual sin filtros continúa usando `/search/movie`; cuando hay criterios avanzados, el texto acota localmente los títulos devueltos por la búsqueda filtrada y permite cargar más páginas de forma manual.

Los criterios avanzados se normalizan antes de crear la petición y se incluyen en la clave de caché local. Los rangos invertidos se bloquean en la interfaz; los valores de duración y año se validan y acotan antes de enviarse. El orden predeterminado mantiene el catálogo de tendencias. Los filtros no cambian la Biblioteca ni guardan preferencias personales: solo afectan a la consulta actual de Descubrir.

La consulta utiliza los parámetros públicos de TMDB para `/discover/movie`, incluidos `with_runtime.gte`, `with_runtime.lte`, `primary_release_date.gte`, `primary_release_date.lte`, `vote_average.gte`, `vote_count.gte`, `with_genres` y `with_original_language`.
