# Propuesta: identidad TMDB independiente del título visible

## Motivación

El ID TMDB identifica una película aun si su título cambia entre fuentes, traducciones o metadatos importados. La deduplicación estricta ya respeta esta regla, pero el buscador contextual filtraba primero por título y podía no encontrar el registro con el mismo ID cuando el texto difería.

## Alcance

- Buscar una coincidencia por ID TMDB positivo en el conjunto completo antes de evaluar título y año.
- Mantener el fallback conservador por título/año cuando no hay un ID coincidente.
- Añadir regresión sintética que compruebe títulos alternativos para el mismo ID.
- Invalidar la caché PWA y las URLs versionadas de la aplicación siguiendo las compuertas existentes.

## Fuera del alcance

- Reescribir títulos personales o metadatos importados.
- Cambiar la semántica del modelo de recomendaciones.
- Fusionar dos IDs TMDB positivos distintos.

## Criterios de aceptación

- Mismo ID TMDB y títulos diferentes se resuelve como la misma película.
- IDs TMDB distintos siguen siendo películas distintas, incluso con el mismo título.
- El fallback por título/año mantiene los registros ambiguos separados.
- Calidad, Playwright y despliegue usan y verifican el SHA que corresponda.
