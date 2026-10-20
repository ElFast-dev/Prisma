# Propuesta: respetar la identidad TMDB al ocultar películas del catálogo

## Estado

En preparación bajo SDD. La implementación y el cierre dependen de que la prueba de navegador reproduzca el caso de dos películas homónimas con IDs TMDB diferentes.

## Problema observado

La vista Descubrir ya conserva remakes con el mismo título cuando cada uno tiene un ID TMDB distinto. Sin embargo, el filtro del catálogo local excluye los elementos ocultos usando solo el título normalizado. Al ocultar un remake, puede desaparecer también el otro, aunque sea una película distinta. El recomendador ya filtra por identidad, así que ambas superficies no se comportan de forma coherente.

## Alcance

- Hacer que el catálogo local compruebe si está oculta la identidad de la película, usando la misma comparación estable existente.
- Añadir una prueba de navegador con dos películas sintéticas del mismo título y distintos IDs TMDB; ocultar una y comprobar que la otra sigue visible.
- Actualizar la especificación de catálogo tras verificar la convergencia.

## Fuera de alcance

- No cambiar la forma de almacenar la colección personal ni migrar datos existentes.
- No modificar los cálculos del recomendador, las valoraciones, ni los datos de TMDB.
- No garantizar la distinción de homónimos cuyos registros no tienen un ID TMDB fiable.
- No introducir dependencias de producción ni requerir credenciales TMDB para las pruebas.

## Criterios de aceptación

1. Ocultar la película con TMDB ID 990001 no excluye del catálogo la película con el mismo título y TMDB ID 990002.
2. La película oculta deja de mostrarse en el catálogo local y la otra conserva su identidad.
3. Una película oculta sin identidad TMDB sigue usando la política de coincidencia por título ya existente.
4. Los checks SDD, sintaxis, importación CSV y navegador pasan en el commit final.
5. Los datos se prueban con fixtures sintéticos; no se modifica información personal fuera del contexto desechable de Playwright.
