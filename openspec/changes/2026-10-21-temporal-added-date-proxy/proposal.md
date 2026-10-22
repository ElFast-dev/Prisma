# Propuesta: habilitar proxy temporal explícito de fecha de incorporación

## Problema

El JSON del usuario contiene cientos de películas en `movies.cH` con `a` (fecha asociada a la incorporación a la colección), pero no contiene `watchedAt`. El importador preserva correctamente `a` como `addedAt` y no lo convierte en fecha de visionado. Por eso la evaluación temporal walk-forward no dispone de una muestra suficiente, aunque las películas sí estén importadas y tengan metadatos.

## Objetivo

Permitir que la persona elija explícitamente usar la fecha de incorporación a la lista de vistas como *proxy exploratorio* solo en la evaluación temporal. La fuente y su incertidumbre deben ser visibles. La opción debe estar desactivada por defecto.

## Alcance

- Mantener `watchedAt` como campo de fecha de visionado, con su procedencia existente.
- Etiquetar separadamente la fecha `addedAt` de las entradas importadas desde la lista de vistas.
- Añadir un control temporal en el Laboratorio para activar/desactivar el proxy.
- Al activarse, permitir usar solo fechas `addedAt` procedentes de `imported-collection` cuando no haya una fecha explícita mejor, y contarlas como no verificadas.
- Informar en resultados y en el diagnóstico v9 qué modo de fecha se usó.
- No alterar las fechas guardadas ni las recomendaciones de producción.

## Criterios de aceptación

1. El modo por defecto solo usa `watchedAt` válido.
2. El proxy de `addedAt` se usa únicamente tras una acción explícita.
3. Las fechas proxy nunca se etiquetan como visionados explícitos.
4. No se cambia ni se crea `watchedAt` al usar el proxy.
5. El informe comparte únicamente recuentos y métricas agregadas, sin fechas o identidades individuales.
6. Las pruebas cubren el modo por defecto, el opt-in, la procedencia, la privacidad y el versionado PWA.
