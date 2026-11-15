# Importación de películas desde respaldos Android v2

Prisma acepta el respaldo Android de versión 2 como una fuente externa de migración. Este lector es independiente del formato nativo de copias Prisma.

## Datos incluidos

- movies.cH se incorpora a Vistas.
- movies.cW se incorpora a Pendientes.
- movies.rM se enlaza con películas de Vistas por su ID de Trakt y se transforma en un visionado calificado de Prisma.
- Solo se usa tmId cuando es un entero seguro mayor que cero. El ID interno de Prisma se forma con el ID TMDB.
- shows, episodios, temporadas, ratings de series y listas externas se ignoran.

## Fechas, rachas y calificaciones

Para calcular el día de una película vista, Prisma usa exclusivamente el instante UTC movies.cH[].a y lo convierte a la fecha calendario de la zona horaria del dispositivo. En Panamá se utiliza America/Panama. La conversión se hace con la zona horaria, no recortando los primeros diez caracteres del texto. Se aceptan timestamps UTC con y sin milisegundos.

El día de visionado no se obtiene de rA ni de movies.cW. La racha cuenta días calendario distintos: dos o más películas el mismo día cuentan como un solo día y no interrumpen la racha. La racha actual se mantiene cuando la última actividad fue hoy o ayer. El cálculo normal no exige exactamente una película al día.

La calificación externa de 1 a 10 conserva su escala y se enlaza por ID de Trakt. Su rA se conserva como fecha de creación/actualización del registro de calificación, pero nunca determina el día de la racha. Un rating sin película de Vistas importable se omite; no se crea una película ficticia para ratings huérfanos ni para IDs TMDB centinela.

## Fusión y duplicados

La importación combina películas por ID TMDB. Conserva metadatos locales si la película ya existe, así como favoritos, perfil, preferencias, colecciones y credencial TMDB. Una película ya presente en Vistas conserva sus visionados existentes; no se crea un visionado duplicado por volver a importar el mismo respaldo.

Cuando se vuelve a importar un respaldo, Prisma también corrige el día local de los visionados que creó una importación externa anterior. La corrección solo toca visionados identificados como importados por Prisma; los visionados registrados manualmente no se alteran. Si una película externa está en Vistas y en Prisma solo estaba Pendiente, su estado pasa a Vistas.

El importador crea registros locales mínimos para películas nuevas usando el título y el ID TMDB del archivo. La ficha obtiene los metadatos cinematográficos completos desde TMDB cuando se abre con conexión y credencial configurada.

## Formato nativo de Prisma

La exportación y restauración nativas continúan usando exclusivamente el formato prisma-local-backup, versión 1. Restaurar una copia nativa reemplaza los datos incluidos en ella. Importar el formato Android externo realiza una fusión y no cambia el esquema ni el contenido del formato nativo.
