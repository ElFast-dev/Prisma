# Propuesta: normalizar fechas de visionado a Panamá

## Problema

El JSON conserva instantes UTC en `movies.cH[].a`. La aplicación interpreta actualmente ese valor como fecha de incorporación, mientras que la evaluación temporal usa fechas `watchedAt` y calcula los días mediante UTC. Esto desplaza algunos visionados al día equivocado de Panamá. Además, las marcas anteriores al reto diario se registraron retrospectivamente y no acreditan el día real del visionado.

## Cambio

- Centralizar el cálculo de día local en `America/Panama` sin reescribir timestamps originales.
- Reconocer la exportación Android v2 que contiene `Source Code` (TMDB 45612) con fecha local del 15 de enero de 2026.
- Importar como visionados confiables los registros de ese archivo desde el inicio confirmado del reto; marcar los anteriores como retrospectivos no verificados.
- Evitar que una reimportación reactive marcas heredadas `action-time` de fechas previas.
- Aplicar la zona horaria local tanto al texto de fecha visible como a la evaluación temporal y al diagnóstico agregado.
- Mantener SDD, pruebas de regresión, privacidad local y versionado de PWA.

## No objetivos

- No modificar el JSON de origen ni transformar el instante UTC guardado a una hora local persistida.
- No deducir fechas anteriores al reto.
- No cambiar el recomendador de producción ni activar Ridge para recomendaciones reales.
- No enviar fechas, títulos o identificadores personales por la red.
