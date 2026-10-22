# Propuesta: completar metadatos de películas ya guardadas

## Motivación

La nueva recomendación usa créditos y palabras clave, pero el historial importado puede tener carátulas y metadatos básicos recientes que se descargaron antes de añadir esas señales. Tratar esos registros como completamente actualizados impediría que el perfil aproveche los datos nuevos.

## Alcance

- Registrar por separado cuándo TMDB devuelve créditos completos y palabras clave.
- Enriquecer el historial antiguo cuando falte cualquiera de esos marcadores, aunque la carátula esté fresca.
- Evitar repetir solicitudes cuando ambas familias de metadatos están confirmadas y siguen dentro de la ventana de caché.
- Preservar notas, fechas personales, colecciones e identidad TMDB.
- Actualizar la caché de PWA y las pruebas de regresión.

## Criterios de aceptación

- Un registro legacy con carátula fresca pero sin marcadores de créditos/palabras clave entra en la cola.
- Un registro con los dos marcadores vigentes no entra repetidamente.
- Una fecha de metadatos vieja obliga a actualizar.
- El enriquecimiento no modifica nota, fecha de visionado ni identidad.
- Las pruebas de calidad y Playwright pasan antes de fusionar.