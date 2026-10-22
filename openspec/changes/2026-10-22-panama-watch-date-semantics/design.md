# Diseño: cronología del reto en America/Panama

## Semántica de fecha

La utilidad compartida `js/core/date-utils.js` convierte marcas timestamp a días calendario mediante `Intl.DateTimeFormat` y la zona explícita `America/Panama`. Los timestamps se mantienen en su formato original; las fechas sin hora (YYYY-MM-DD) conservan su día. La interfaz de fechas vistas mantiene el formato MM/DD/YYYY y no muestra hora.

## Identificación de la exportación

No se aplica la regla específica a cualquier JSON genérico. El importador identifica la exportación esperada por `platform=android`, `version=2`, estructura `movies.cH`, y una entrada `Source Code` con TMDB 45612 cuyo día local sea 2026-01-15. En esa exportación, cada fila válida de `movies.cH` recibe `watchedAt` basado en el timestamp original. Solo los días del 15 de enero al 21 de octubre de 2026 reciben confianza `streak-confirmed`; las fechas anteriores y posteriores reciben `explicit-source`, porque pertenecen al historial completo aunque no acrediten ni amplíen la racha. `addedAt` continúa almacenando el valor original del campo `a`. `addedAt` continúa almacenando el valor original del campo `a`.

## Reimportación y cronología

El marcador de procedencia se combina con las entradas guardadas. Una fecha explícita importada desde `movies.cH` debe reemplazar marcas heredadas de acción sin procedencia fiable; fuera del intervalo de la racha se mantiene una fecha confirmada manualmente, mientras que dentro del intervalo confirmado prevalece el timestamp original de la exportación reconocida. En cambio, si una exportación reconocida aporta una fecha fiable `streak-confirmed` durante el reto, su timestamp original es la fuente de verdad y debe corregir una fecha local conflictiva que proceda de una versión anterior, incluida una marca local confirmada antes de reconciliar ese archivo. Las entradas de historial con procedencia `explicit-source` nunca extienden ni modifican la racha; las entradas de la racha pueden corregir marcas conflictivas conforme a la prioridad declarada. El evaluador temporal agrupa todas las filas por el día panameño, no por el prefijo UTC de la cadena ISO. El proxy optativo no puede volver a admitir las filas con marcador `pre-streak-unverified`. La clasificación de días se basa en al menos una película ese día, de modo que dos películas en el mismo día no crean un día adicional.

## Informe, caché y privacidad

Los diagnósticos pasan al esquema v10 e incluyen la zona temporal aplicada (`America/Panama`) como un valor allowlisted. No incluyen timestamps ni títulos. Se renuevan las versiones de recursos de la aplicación y el shell PWA. La reconciliación de fechas vive en `js/import-export/actions.js`; toda modificación de ese módulo debe renovar tanto su query de importación en `app.js` como su entrada en `sw.js`. La URL obsoleta `core-20261020-1` impedía que algunos clientes con caché ejecutaran la reconciliación nueva, por lo que se sube a `core-20261022-2`, se renueva la entrada de aplicación y el shell PWA, y una prueba de versionado exige que la URL importada y la precargada coincidan.

## Verificación

Se requieren pruebas para cambio de fecha cerca de medianoche UTC, entrada Source Code, preservación de la marca original, fecha retrospectiva, proxy, confirmación manual, 280 días consecutivos de calendario local, ausencia de fechas exactas en informes compartibles, versión de módulo y caché PWA.
