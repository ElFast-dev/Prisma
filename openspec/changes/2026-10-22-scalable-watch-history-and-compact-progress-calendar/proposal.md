# Propuesta: historial escalable y calendario compacto de Progreso

## Problema

La importación del historial Android v2 solo asigna fechas de visionado fiables al tramo que coincide con la racha personal confirmada. Las películas anteriores a ese tramo pierden su fecha visible, aunque el archivo fuente conserva una marca explícita para cada registro de la colección vista. Esto hace que Prisma dependa indebidamente del reto de 280 días en vez de mantener un historial extensible.

En Progreso se dibujan simultáneamente los calendarios de enero a octubre. La sección consume demasiado espacio y hace difícil centrarse en un mes concreto. Además, los días al principio y al final del intervalo no deben desalinearse ni confundirse con días confirmados.

## Cambio propuesto

- Interpretar el campo de fecha de cada fila de `movies.cH` como `watchedAt` solo para el formato Android v2 reconocido, sin restringirlo a las 280 fechas del reto.
- Mantener la fecha y la confianza de la racha separadas: las películas fuera del intervalo también conservan sus fechas, pero no amplían la racha confirmada.
- No extrapolar esta regla a JSON desconocidos ni a las colecciones de pendientes u ocultos.
- Rediseñar Progreso como secciones mensuales plegables, con solo el mes más reciente abierto por defecto.
- Alinear cada número con el día de semana real y distinguir de forma tenue los días de contexto que quedan fuera del reto.
- Añadir pruebas de regresión, actualizar SDD y renovar los recursos de caché PWA.

## No objetivos

- No fabricar películas para completar días sin título conservado.
- No cambiar la duración confirmada del reto de 280 días.
- No usar fechas de valoración ni edición de notas como sustituto de un visionado.
- No transmitir el historial personal ni el JSON importado a servidores.
