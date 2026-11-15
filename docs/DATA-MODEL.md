# Modelo de datos de Prisma

## Entidades

### Movie
Registro cinematográfico único. Contiene el identificador local, identificador TMDB, metadatos, rutas de imágenes y el contador interno de secuencia de visionados.

No contiene una valoración personal única.

### LibraryEntry
Una clasificación actual por película:
- status: watched o pending.
- isFavorite: atributo independiente.
- fechas de incorporación y actualización.

Una película puede estar en Pendientes aunque conserve visionados previos.

### Viewing
Experiencia independiente:
- identificador.
- película.
- número de secuencia.
- fecha local obligatoria.
- hora opcional.
- zona horaria opcional.
- calificación entera obligatoria de 1 a 10.
- comentario opcional.
- identificador de operación para idempotencia.

Las secuencias no se reutilizan después de eliminar experiencias.

### Collection y CollectionMovie
Una colección contiene películas mediante una tabla de relación. Una película puede aparecer en muchas colecciones, pero no dos veces en la misma.

### Profile y Preferences
Registros locales únicos para identidad y preferencias.

### Cachés
Los metadatos, disponibilidad y personas se almacenan por separado de los datos personales.

### SpectroSnapshot
Resultados derivados y versionados. No son la fuente de verdad y pueden regenerarse.

## Invariantes

- Una película local única.
- Una entrada de biblioteca por película.
- Muchos visionados por película.
- Calificación de 1–10 en cada visionado.
- Fechas futuras rechazadas.
- Vistas y Pendientes mutuamente excluyentes.
- Cambiar de estado no borra visionados.
- Favoritos es independiente del estado.
- El promedio es derivado, nunca reemplaza registros.
