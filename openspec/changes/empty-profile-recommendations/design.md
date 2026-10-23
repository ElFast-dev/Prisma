# Diseño: recomendaciones solo después de la primera valoración válida

## Decisión

La comprobación se ubica en `createRecommendationRanking(ctx).getRecommendations()`, inmediatamente después de construir el perfil y antes de combinar o puntuar candidatas. Si `profile.count === 0`, devuelve una lista vacía.

## Justificación

- `js/recommendations/engine.js` devuelve `count` como número de valoraciones con una nota válida.
- El ranking es responsable de seleccionar recomendaciones personalizadas; el catálogo y las búsquedas TMDB permanecen en sus módulos.
- La guarda no se coloca en `rankCandidates()`, porque esa función pura también se utiliza para ordenar candidatas explícitas durante evaluaciones offline.
- La condición estricta `count === 0` evita cambiar el comportamiento de contextos de prueba antiguos que no declaren el contador; en producción el motor siempre lo proporciona.

## Compatibilidad y riesgos

No se cambia ningún esquema ni dato persistido. El perfil comienza a recomendar tan pronto como exista al menos una valoración válida, aunque la confianza siga siendo inicial y limitada. Una valoración sin metadatos puede habilitar el flujo, pero no inventa señales: el motor debe seguir mostrando la limitación de cobertura en sus explicaciones.

## Verificación

Prueba sintética con candidatas locales/remotas ficticias: perfil con cero valoraciones devuelve cero recomendaciones y no llama al predictor; con una valoración válida se permite puntuar; la función pura de ranking conserva su comportamiento.
