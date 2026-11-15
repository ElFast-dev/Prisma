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

Los intervalos de revalidación serán decisiones internas de Prisma, no límites contractuales de TMDB. Los metadatos e imágenes no se eliminarán solo por superar una fecha de revalidación.

## No enviar datos personales

Las valoraciones, comentarios, fechas de visionado, listas privadas y perfil de Espectro no se enviarán a TMDB.


## Implementación inicial

La primera integración utiliza una credencial personal introducida desde Ajustes. Se guarda en localStorage del navegador, nunca en el repositorio ni en los respaldos. El cliente realiza solicitudes Bearer desde el navegador; esta credencial puede inspeccionarse en el dispositivo y no debe tratarse como secreto de servidor.

Las tendencias semanales y las búsquedas se consultan desde Descubrir. Los resultados estructurados se guardan en Dexie para poder reutilizarlos si la red falla. Las imágenes se almacenan en caché CacheFirst mediante el Service Worker, con un límite de entradas para administrar el espacio del dispositivo.

La configuración de GitHub Pages se realiza seleccionando GitHub Actions como fuente en Settings → Pages. El flujo deploy.yml construye dist y lo publica.
