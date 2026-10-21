# Propuesta: ampliar las candidatas con resultados remotos de TMDB

## Contexto
El recomendador puntúa y reclasifica las películas del catálogo local, mientras que la consulta de películas populares de TMDB permanece en una lista de exploración separada. Cuando el catálogo personal contiene muchos títulos pero pocos descubrimientos nuevos, la lista personalizada puede quedarse sin candidatas nuevas o ser demasiado estrecha. El informe real de 348 valoraciones y 788 entradas del catálogo muestra que conviene mejorar primero la generación de candidatas y no ajustar aún los pesos del modelo.

## Objetivo
Usar resultados populares ya consultados a TMDB como una segunda fuente temporal de candidatas, puntuarlos con el mismo perfil local y los mismos tres modos existentes, y volver a renderizar las recomendaciones tras cargar resultados.

## Alcance
- Mantener los resultados remotos de popularidad en un conjunto temporal separado del catálogo personal y de los resultados de búsqueda.
- Combinar candidatas locales con películas populares de TMDB ya consultadas, eliminando duplicados por identidad TMDB y con fallback de título/año.
- Excluir valoradas, vistas, pendientes y ocultas antes de mostrar recomendaciones.
- Recalcular la sección de recomendaciones al concluir una carga o paginación de populares en Descubrir.
- Limpiar candidatas remotas al retirar la credencial TMDB.
- Añadir pruebas sintéticas para mezcla, deduplicación, exclusión, actualización y privacidad local.
- Actualizar especificaciones vigentes, arquitectura, caché PWA, versión de entrada y flujo de verificación.

## Fuera de alcance
- No añadir resultados de TMDB automáticamente a colección, historial, pendientes, ocultas o catálogo persistente.
- No enviar valoraciones o el perfil a TMDB; la generación usa la lista pública genérica de películas populares sin personalizar la consulta remota.
- No cambiar los pesos del modelo, su función de predicción, el ranking ni sus métricas.
- No consumir automáticamente endpoints personalizados de recomendaciones/similares basados en los títulos que más gustan.
