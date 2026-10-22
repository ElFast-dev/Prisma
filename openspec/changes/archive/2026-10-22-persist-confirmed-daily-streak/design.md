# Diseño: libro local de días confirmados

## Modelo de estado

Añadir `confirmedWatchStreak` al estado local normalizado. El registro contiene `source: "user-confirmed"`, inicio, final, objetivo diario, total de días y momento de importación. La normalización acepta únicamente el intervalo confirmado de 280 días y la meta de una película al día. Al importar el JSON reconocido, el importador proporciona el registro; los perfiles nuevos y las importaciones no relacionadas no lo crean por defecto. La copia de seguridad ya serializa el estado completo, por lo que no requiere un archivo separado.

## Calendario de presentación

Un módulo de dominio puro construye una fila por día a partir del intervalo confirmado y puede asociar un título solo cuando existe una marca de visionado con procedencia fiable. La lista tiene siempre 280 filas aunque ninguna película esté asociada; un conjunto de varias películas en la misma fecha solo afecta al texto auxiliar y nunca al número de días. La vista Progreso agrupa las fechas en calendarios mensuales adaptables; las celdas sin título siguen mostrando el día confirmado y explican la ausencia sin generar nombres.

## Privacidad y compatibilidad

El libro de días se guarda en IndexedDB junto al resto del perfil y se incluye en el respaldo de Prisma. No requiere endpoint, petición de red ni sincronización. La importación se mantiene idempotente: volver a importar el JSON reconocido no duplica películas ni aumenta el intervalo.

## Verificación

Pruebas sintéticas verifican detección del archivo, estado vacío, restauración de respaldo, exactamente 280 fechas consecutivas, un marcador al tener varios títulos, marcador conservado sin título, zona horaria local y ausencia de filas ficticias de película.
