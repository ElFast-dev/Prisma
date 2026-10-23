# Propuesta: no mostrar recomendaciones personalizadas con el perfil vacío

## Contexto

El ranking actual construye el perfil y puntúa candidatas locales y remotas. El motor devuelve un perfil con `count: 0` cuando no existen valoraciones válidas, pero `getRecommendations()` no detiene el ranking por ese motivo. Esto permite que el catálogo y las películas populares consultadas en TMDB aparezcan como si fueran recomendaciones personalizadas antes de que Prisma conozca los gustos de la persona.

## Objetivo

Mantener «Recomendadas para ti» vacío mientras el perfil no contenga ninguna valoración personal válida. La búsqueda y exploración de TMDB debe seguir funcionando de manera independiente.

## Alcance

- Añadir una guarda en el punto de entrada de recomendaciones personalizadas, usando el contador de valoraciones válidas del perfil.
- Conservar el ranking puro `rankCandidates()` para las evaluaciones offline y candidatas ya puntuadas.
- Añadir una prueba sintética que compruebe el perfil vacío y el primer perfil con valoraciones.
- Actualizar la especificación vigente y documentar la verificación.

## Fuera de alcance

- No modificar pesos, predicciones, métricas ni modos de ranking.
- No bloquear la búsqueda, el catálogo ni la consulta de películas de TMDB.
- No borrar ni modificar colecciones, valoraciones, fechas, ajustes o datos existentes.
- No persistir candidatas remotas ni alterar el formato de datos personales.
