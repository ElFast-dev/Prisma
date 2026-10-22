# Diseño técnico: buscar primero por ID

## Resolución

1. Normalizar la colección de candidatos válidos, sin exigir que el título esté presente para una coincidencia por ID.
2. Si la entrada contiene un ID TMDB positivo, devolver la primera entrada con ese mismo ID antes de filtrar por título.
3. Si no hay una coincidencia por ID, evaluar el título normalizado, el año fiable y la ambigüedad de las identidades existentes con el fallback conservador actual.
4. No cambiar la función de igualdad estricta ni el merge por lote; ambas siguen impidiendo que IDs diferentes se fusionen.

## Compatibilidad y pruebas

No se reescriben registros persistidos. El cambio afecta únicamente a la resolución de coincidencias durante consultas y reconciliaciones. La prueba usa títulos sintéticos alternativos y un ID TMDB sintético.
