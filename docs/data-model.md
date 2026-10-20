# Modelo de datos observado

## Estado principal

La función de inicialización usa una estructura versionada con estos campos de nivel superior:

| Campo | Significado |
| --- | --- |
| `version` | Versión del estado normalizado; el código actual asigna el valor 2. |
| `rated` | Películas con una valoración válida. |
| `watched` | Películas marcadas como vistas. |
| `watchlist` | Películas pendientes. |
| `hidden` | Películas ocultas en la experiencia de descubrimiento. |
| `events` | Historial de eventos resumidos de la aplicación, limitado en el código actual. |
| `updatedAt` | Última actualización del perfil cuando se registra. |
| `importedAt` | Fecha de la última importación de historial personal reconocida. |

Los registros de valoración contienen al menos título y una nota numérica entre 1 y 10 para formar parte del estado normalizado. Pueden incluir año, identificadores, géneros, etiquetas, emociones, nota personal, fechas y procedencia. No todos los formatos importados contienen todos esos campos.

## Registro de película

El normalizador unifica variantes comunes de nombre de campos —por ejemplo, título, año, géneros, etiquetas, sinopsis, ruta de cartel e identificador de TMDB— en un registro de catálogo. Los metadatos ausentes no deben interpretarse como datos confirmados.

Los metadatos públicos incluyen voteAverage y voteCount cuando la fuente TMDB entrega esos campos. voteCount conserva el recuento de votos externo, no la cantidad de valoraciones personales. La ficha solo presenta una puntuación numérica como TMDB cuando la procedencia está confirmada; las búsquedas de otras fuentes se identifican como enlaces externos.

La aplicación tiene una identidad basada en identificadores de TMDB positivos cuando existen y usa un título normalizado como alternativa cuando faltan. Aun así, algunas rutas de importación agrupan o deduplican por título normalizado. Esto significa que la preservación de remakes y películas homónimas necesita pruebas específicas para cada origen de datos; no se debe asumir que cualquier columna CSV llamada id sea automáticamente un TMDB ID.

## Persistencia

- Base IndexedDB: `prisma-local-v1`.
- Almacén: `kv`.
- Claves lógicas principales: `state`, `catalogCustom` y `tmdbCredential`.
- Alternativa de localStorage: prefijo `prisma:` más la clave lógica.
- La credencial de TMDB se almacena separada del respaldo exportado.

Estos nombres describen el código observado en la fecha de referencia. Un cambio de claves, versión o forma del estado debe tratarse como una migración explícita si puede afectar datos existentes.

## Copias de seguridad

La exportación usa un objeto con `format: "prisma-backup"`, número de versión, fecha de exportación, estado y catálogo personalizado. No incluye la credencial TMDB. La restauración valida la marca del formato y la presencia del estado antes de sustituir los datos locales.

## Invariantes para futuros cambios

1. No descartar valoraciones válidas ni colecciones personales durante enriquecimientos de metadatos.
2. No sobrescribir una nota personal, emociones o fechas personales con valores vacíos de una fuente externa.
3. Preferir IDs fiables para emparejar películas y no fusionar dos IDs TMDB distintos.
4. Mantener formatos de respaldo reconocibles y documentar cualquier migración.
5. No emplear una copia de seguridad real en pruebas o CI; usar datos sintéticos.


## Descubrimiento y ficha

Descubrir deduplica registros por ID TMDB positivo y, si falta, por título normalizado y año disponible. La identidad mantiene separados los remakes con IDs TMDB diferentes. El catálogo local y los resultados de TMDB omiten películas ya vistas o valoradas; las recomendaciones omiten también las pendientes y ocultas. La ficha completa tiene scroll propio para mostrar sinopsis largas y secciones posteriores. La fecha del historial se presenta como MM/DD/YYYY sin hora.
