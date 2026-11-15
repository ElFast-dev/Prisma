# Importación de películas desde respaldos Android v2

Prisma acepta el respaldo Android de versión 2 como una fuente externa de migración. Este lector es independiente del formato nativo de copias Prisma.

## Datos incluidos

- movies.cH se incorpora a Vistas.
- movies.cW se incorpora a Pendientes.
- movies.rM se enlaza con películas de Vistas por su ID de Trakt y se transforma en un visionado calificado de Prisma.
- Solo se usa tmId cuando es un entero seguro mayor que cero. El ID interno de Prisma se forma con el ID TMDB.
- shows, episodios, temporadas, ratings de series y listas externas se ignoran.

## Fechas y calificaciones

El respaldo externo no ofrece una fecha independiente de visionado para cada película. Para los elementos de movies.cH, Prisma utiliza la fecha UTC del campo a y conserva la fecha del rating rA como fecha de creación/actualización del visionado. Se aceptan timestamps UTC con o sin milisegundos.

La calificación externa de 1 a 10 conserva su escala. Un rating sin película de Vistas importable se omite; no se crea una película ficticia para ratings huérfanos ni para IDs TMDB centinela.

## Fusión y duplicados

La importación combina películas por ID TMDB. Conserva metadatos locales si la película ya existe, así como favoritos, perfil, preferencias, colecciones y credencial TMDB. Una película ya presente en Vistas conserva sus visionados existentes; no se crea un visionado duplicado por volver a importar el mismo respaldo. Si una película externa está en Vistas y en Prisma solo estaba Pendiente, su estado pasa a Vistas.

El importador crea registros locales mínimos para películas nuevas usando el título y el ID TMDB del archivo. La ficha obtiene los metadatos cinematográficos completos desde TMDB cuando se abre con conexión y credencial configurada.

## Formato nativo de Prisma

La exportación y restauración nativas continúan usando exclusivamente el formato prisma-local-backup, versión 1. Restaurar una copia nativa reemplaza los datos incluidos en ella. Importar el formato Android externo realiza una fusión y no cambia el esquema ni el contenido del formato nativo.
