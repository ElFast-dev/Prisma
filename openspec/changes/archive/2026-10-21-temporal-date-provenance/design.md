# Diseño: procedencia de fechas de visionado

## Semántica de importación

`addedAt` describe cuándo se añadió una entrada. `watchedAt` solo se establece desde `watchedAt` o `watched_at` explícitos. `raw.a` no es una fuente de fecha de visionado. Cuando existe un campo explícito, la normalización asigna `watchedAtSource: "imported-explicit"`.

Las acciones de Prisma que generan una marca de tiempo registran la fuente `action-time`, porque indican cuándo se hizo la acción, pero no prueban necesariamente el día real del visionado. Las fechas antiguas sin fuente se consideran `legacy-unknown` durante la evaluación, sin migrar silenciosamente los datos personales. Se reconocen como fechas explícitas `imported-explicit` y `user-confirmed`.

Al mezclar un historial importado explícito con un registro antiguo sin procedencia, el par `watchedAt`/`watchedAtSource` de la fecha explícita debe prevalecer como unidad, para no vincular una etiqueta nueva con un timestamp antiguo.

## Evaluación temporal

La evaluación conserva la posibilidad de calcular métricas con todas las marcas sintácticamente válidas, pero clasifica cada fila. Si existe una fecha explícita en cualquier registro de la misma identidad, prevalece sobre la fecha heredada sin fuente. Si solo hay una fecha heredada o de acción, se usa únicamente como timestamp exploratorio. Si no existe fecha válida, la fila se excluye.

Los agregados son `explicitDateCount`, `unverifiedDateCount` y `missingDateCount`. El estado es `explicit` solo si todas las fechas participantes provienen de campos explícitos o confirmados y `exploratory` si al menos una carece de procedencia fiable. El estado no certifica que la fuente externa haya fechado correctamente el visionado. Esto certifica la forma del dato, no la veracidad externa de la fecha importada.

## Interfaz e informe

El Laboratorio mostrará los tres recuentos y distinguirá los resultados totalmente explícitos de los exploratorios. El informe pasa a `prisma-recommendation-diagnostics/v6` y exporta únicamente agregados, nunca fechas, marcadores por fila ni identidades.

## Verificación

Probar que `raw.a` no crea `watchedAt`, que las fechas explícitas se etiquetan, que la mezcla no usa un timestamp antiguo con procedencia nueva, que las fechas explícitas prevalecen al enlazar identidades y que los agregados del informe v6 son privados.