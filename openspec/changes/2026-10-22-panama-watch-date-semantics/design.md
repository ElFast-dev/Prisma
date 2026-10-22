# Diseño: cronología del reto en America/Panama

## Semántica de fecha

La utilidad compartida `js/core/date-utils.js` convierte marcas timestamp a días calendario mediante `Intl.DateTimeFormat` y la zona explícita `America/Panama`. Los timestamps se mantienen en su formato original; las fechas sin hora (YYYY-MM-DD) conservan su día. La interfaz de fechas vistas mantiene el formato MM/DD/YYYY y no muestra hora.

## Identificación de la exportación

No se aplica la regla específica a cualquier JSON genérico. El importador identifica la exportación esperada por `platform=android`, `version=2`, estructura `movies.cH`, y una entrada `Source Code` con TMDB 45612 cuyo día local sea 2026-01-15. En esa exportación, las entradas con día local igual o posterior a esa fecha reciben `watchedAt` basado en el timestamp original y confianza `streak-confirmed`; las anteriores reciben `pre-streak-unverified` y no conservan un `watchedAt` inferido. `addedAt` continúa almacenando el valor original del campo `a`.

## Reimportación y cronología

El marcador de procedencia se combina con las entradas guardadas. Una entrada retrospectiva importada debe retirar timestamps de acción anteriores heredados, excepto cuando la persona tenga una fecha `user-confirmed`. En cambio, si una exportación reconocida aporta una fecha fiable `streak-confirmed` durante el reto, su timestamp original es la fuente de verdad y debe corregir una fecha local conflictiva que proceda de una versión anterior, incluida una marca local confirmada antes de reconciliar ese archivo. Las entradas `pre-streak-unverified` nunca reemplazan fechas confirmadas manualmente. El evaluador temporal agrupa todas las filas por el día panameño, no por el prefijo UTC de la cadena ISO. El proxy optativo no puede volver a admitir las filas con marcador `pre-streak-unverified`. La clasificación de días se basa en al menos una película ese día, de modo que dos películas en el mismo día no crean un día adicional.

## Informe, caché y privacidad

Los diagnósticos pasan al esquema v10 e incluyen la zona temporal aplicada (`America/Panama`) como un valor allowlisted. No incluyen timestamps ni títulos. Se renuevan las versiones de recursos de la aplicación y el shell PWA.

## Verificación

Se requieren pruebas para cambio de fecha cerca de medianoche UTC, entrada Source Code, preservación de la marca original, fecha retrospectiva, proxy, confirmación manual, 280 días consecutivos de calendario local, ausencia de fechas exactas en informes compartibles, versión de módulo y caché PWA.
