# Propuesta: personalizar la mezcla de recomendaciones de Descubrir

## Estado
En implementación; pendiente de verificación antes del archivo.

## Motivación
La persona usuaria prefiere una combinación equilibrada que pueda personalizar y quiere que Descubrir muestre primero sugerencias personales, seguidas del catálogo. El ranking actual usa una ordenación heurística y limita la repetición de un género, pero no permite elegir si priorizar afinidad o variedad; tampoco persiste una preferencia local separada.

## Objetivo
Añadir tres enfoques pequeños y reversibles para controlar la mezcla, conservando recomendaciones al principio, exclusión de la colección, deduplicación por identidad y el perfil privado en el dispositivo.

## Alcance
- Añadir Equilibrado (predeterminado), Más afines y Más variedad a la sección superior de Descubrir.
- Guardar la selección en localStorage bajo una clave de preferencia independiente del perfil cinematográfico.
- Hacer que afinidad ordene por puntuación estimada y señales coincidentes, mientras variedad penaliza repeticiones de género y favorece géneros menos representados cuando la afinidad es comparable.
- Mantener un modo equilibrado que combina estimación, características nuevas y límites de concentración de género.
- Añadir pruebas de algoritmo, almacenamiento seguro, accesibilidad, exclusiones y coherencia de la caché PWA.

## Fuera del alcance
No se modifican las valoraciones ni el perfil, no se envían preferencias o historiales a servidores, no se conectan datos remotos adicionales y no se cambia la función de evaluación experimental.

## Aceptación
- La selección predeterminada es Equilibrado y sobrevive a recargas en el mismo navegador.
- Los modos disponibles producen ordenaciones acordes con su intención usando datos sintéticos.
- Todos los modos mantienen fuera las películas vistas, valoradas, pendientes, ocultas y las entradas solo de historial.
- Las recomendaciones permanecen antes de TMDB y del catálogo restante.
- CI comprueba módulos, SDD, algoritmos, accesibilidad básica y versiones de activos.
