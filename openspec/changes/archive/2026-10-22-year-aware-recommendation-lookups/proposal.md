# Propuesta: búsquedas del recomendador conscientes del año

## Motivación

La identidad de catálogo ya admite título, ID TMDB y año, pero varias rutas internas del motor y sus experimentos consultaban los metadatos con título e ID solamente. Cuando dos registros comparten título y faltan IDs en una valoración antigua, una búsqueda sin año puede quedar ambigua y el perfil pierde o asigna mal características cinematográficas.

## Alcance

- Pasar el año disponible a todas las búsquedas internas de películas realizadas durante el aprendizaje del perfil y la evaluación del modelo.
- Aplicar la misma resolución a nDCG, experimentos de normalización, Ridge y estadísticas de géneros.
- Añadir una regresión sintética con dos películas homónimas de años distintos y características diferentes.
- Invalidar correctamente las URLs versionadas de módulos y la caché PWA.

## Fuera del alcance

- Cambiar los pesos del modelo, el prior o la normalización de influencia.
- Resolver automáticamente registros que no tienen ID, año ni una correspondencia inequívoca.
- Añadir metadatos externos a historiales personales o enviar valoraciones a un servidor.

## Criterios de aceptación

- Cada nota con año disponible consulta los metadatos de ese año en entrenamiento y evaluación.
- Una nota de un remake no entrena las características de otro remake con el mismo título.
- Los IDs TMDB siguen siendo la identidad primaria y los registros ambiguos sin año no se eligen arbitrariamente.
- Las pruebas SDD/calidad y Playwright verifican el mismo SHA antes de cualquier fusión y despliegue.
