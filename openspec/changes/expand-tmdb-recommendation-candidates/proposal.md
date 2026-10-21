# Propuesta: ampliar las candidatas del recomendador con TMDB

## Contexto
El informe diagnóstico del perfil real muestra 348 películas valoradas y metadatos completos, pero la lista actual de recomendaciones contiene solo tres películas con géneros. Al inspeccionar `js/recommendations/ranking.js`, se confirma que el motor solo puntúa `ctx.catalog`. Las consultas generales de TMDB viven en otra ruta y no alimentan al recomendador.

## Objetivo
Separar la generación de candidatas del perfil personal y del ranking para que Prisma pueda comparar un conjunto más amplio de películas de TMDB usando las preferencias locales.

## Alcance
- Crear un módulo de generación de candidatas con consultas generales de popularidad, tendencias semanales y mejor puntuación pública de TMDB.
- Combinar candidatas remotas con el catálogo ya existente, deduplicar por ID TMDB y puntuar en el dispositivo con el motor vigente.
- Excluir las películas que ya pertenecen al historial, pendientes u ocultas.
- Mantener el pool remoto solo en memoria, con caché temporal, acción para actualizar y estado comprensible ante fallos parciales.
- No iniciar consultas en una instalación nueva ni fuera de Descubrir; solo consultar cuando se dispone de una credencial TMDB y se abre Descubrir o se solicita actualizar.
- Mantener pruebas con respuestas sintéticas y SDD-first.

## Fuera de alcance
No alterar pesos del algoritmo, no usar credenciales de terceros, no transmitir valoraciones, IDs de película personal, géneros aprendidos o listas del usuario a TMDB; no guardar candidatas remotas en la colección ni modificar las recomendaciones automáticamente según popularidad sin pasar por el ranking personal.

## Criterio de éxito
Con respuestas sintéticas de varias fuentes, la lista puede aprovechar candidatas distintas al catálogo local, eliminar duplicados y excluir películas de la colección. El perfil personal sigue vacío en una instalación nueva, y un error de todas las fuentes no rompe Descubrir.
