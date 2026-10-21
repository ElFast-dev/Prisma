# Diseño: candidatas temporales de TMDB para el recomendador

## Arquitectura
`js/tmdb/browser-actions.js` conserva un array efímero de películas populares consultadas en esta sesión. Solo las respuestas de `/movie/popular` alimentan ese array; `/search/movie` se mantiene como una búsqueda explícita independiente. La paginación añade elementos al pool popular, y una nueva carga de populares lo reinicia.

`js/recommendations/ranking.js` combina el catálogo local con el pool temporal y aplica la deduplicación ya existente antes de calcular predicciones. El catálogo local va primero para preservar los metadatos enriquecidos que ya posee; una película duplicada por ID TMDB aparece una sola vez. Se conservan las reglas actuales de exclusión y los mismos modos de ordenamiento.

## Estado y privacidad
Las candidatas remotas se guardan solo en memoria mientras está abierta la aplicación. No se escriben en IndexedDB/localStorage ni en el archivo de copia de seguridad. Las consultas de candidatas usan `/movie/popular`, sin notas, historial, IDs de favoritas ni otros datos personales. Al eliminar la credencial, también se vacía este pool.

## UI y compatibilidad
Cuando termina una consulta de populares, si Descubrir sigue visible, se vuelve a renderizar la aplicación para recalcular la lista recomendada y volver a pintar la exploración. Las búsquedas no reemplazan ni personalizan el pool de candidatas. La primera instalación sigue vacía: el pool no se solicita hasta entrar en Descubrir con TMDB configurado y sus resultados solo se mantienen en memoria.

## Riesgos y mitigaciones
- La consulta popular no garantiza gustos personales: por eso cada candidata se puntúa con el perfil existente y solo se muestran las mejores, sin alterar la evaluación.
- Las películas sin señales relevantes permanecen cerca de la media base conforme al motor actual; no se atribuyen explicaciones inventadas.
- La lista del proveedor puede contener películas que ya estén en colección; la exclusión se aplica de nuevo en la capa de ranking.
- No se modifica el historial ni se persisten candidatas al navegar o recargar.

## Verificación
Pruebas sintéticas deben demostrar que las películas TMDB participan en ranking tras cargarse, que los IDs duplicados se fusionan, que los remakes con IDs distintos se preservan, que las cuatro colecciones se excluyen y que el pool remoto no se guarda.
