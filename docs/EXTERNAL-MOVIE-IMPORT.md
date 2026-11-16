# Importación de películas desde respaldos Android v2

Prisma acepta el respaldo Android de versión 2 como una fuente externa de migración. Este lector es independiente del formato nativo de copias Prisma.

## Datos incluidos

- movies.cH se incorpora como una experiencia en Historial y clasifica la película en Vistas.
- Una experiencia externa puede no tener calificación. Se conserva igual en Historial y se puede editar o eliminar.
- movies.cW se incorpora a Pendientes.
- movies.rM se enlaza con películas de Vistas por su ID de Trakt y se conserva como calificación de la experiencia.
- Solo se usa tmId cuando es un entero seguro mayor que cero. El ID interno de Prisma se forma con el ID TMDB.
- shows, episodios, temporadas, ratings de series y listas externas se ignoran.

## Fechas y calificaciones

Para calcular el día de una película vista, Prisma usa exclusivamente el instante UTC movies.cH[].a y lo convierte a la fecha calendario de la zona horaria del dispositivo. En Panamá se utiliza America/Panama. La conversión se hace con la zona horaria, no recortando los primeros diez caracteres del texto. Se aceptan timestamps UTC con y sin milisegundos.

El día de visionado no se obtiene de rA ni de movies.cW. Las calificaciones mantienen la escala de 1 a 10. Una película vista sin rating sigue siendo una experiencia completa; simplemente aparece como «Sin calificar» y no participa en los promedios ni en Espectro.

Un rating sin película de Vistas importable se omite; no se crea una película ficticia para ratings huérfanos ni para IDs TMDB centinela.

## Prioridad y conflictos

Antes de importar, el propietario elige una de dos políticas:

- **Conservar Prisma:** mantiene el estado Vistas/Pendientes y la calificación local cuando coinciden la película y la misma fecha de visionado. El archivo completa películas y experiencias que aún no existen.
- **Priorizar archivo JSON:** el estado Vistas/Pendientes del archivo prevalece. Cuando el registro externo coincide con una experiencia local del mismo día, también prevalece su calificación.

Las experiencias manuales de otras fechas no se eliminan ni se sobrescriben. Una experiencia de la misma fecha se enlaza al identificador externo para que las importaciones posteriores puedan actualizarla en lugar de duplicarla.

## Duplicados y reimportación

La importación combina películas por ID TMDB. Conserva metadatos locales si la película ya existe, así como favoritos, perfil, preferencias, colecciones y credencial TMDB.

Cada experiencia importada se identifica con el ID estable de Trakt. Reimportar el mismo respaldo actualiza esa experiencia en vez de crear otra. Las experiencias manuales de fechas distintas permanecen intactas.

Los registros externos antiguos que Prisma había creado con un identificador aleatorio se reconocen y se enlazan a la referencia estable cuando se vuelve a importar su película.

## Formato nativo de Prisma

La exportación y restauración nativas continúan usando exclusivamente el formato prisma-local-backup, versión 1. El esquema acepta que los registros más nuevos omitan una calificación o una clasificación explícita, y sigue leyendo las copias anteriores que sí contienen esos campos.

Restaurar una copia nativa reemplaza los datos incluidos en ella. Importar el formato Android externo realiza una fusión y no cambia el esquema ni el contenido del formato nativo.
