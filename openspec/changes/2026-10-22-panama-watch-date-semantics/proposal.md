# Propuesta: normalizar fechas de visionado a Panamá

## Problema

El JSON conserva instantes UTC en `movies.cH[].a`. La aplicación interpreta actualmente ese valor como fecha de incorporación, mientras que la evaluación temporal usa fechas `watchedAt` y calcula los días mediante UTC. Esto desplaza algunos visionados al día equivocado de Panamá. Además, las fechas de todo el historial deben conservarse separadas del registro de reto: las marcas explícitas fuera de sus 280 días siguen siendo fechas de visionado válidas para sus películas, pero no amplían la racha.

## Cambio

- Centralizar el cálculo de día local en `America/Panama` sin reescribir timestamps originales.
- Reconocer la exportación Android v2 que contiene `Source Code` (TMDB 45612) con fecha local del 15 de enero de 2026.
- Importar las fechas explícitas de todas las filas de `movies.cH` de la exportación Android v2 reconocida; marcar como `streak-confirmed` solo los días dentro del reto y como `explicit-source` las fechas válidas exteriores al intervalo.
- Evitar que una reimportación reactive marcas heredadas `action-time` de fechas previas.
- Aplicar la zona horaria local tanto al texto de fecha visible como a la evaluación temporal y al diagnóstico agregado.
- Mantener SDD, pruebas de regresión, privacidad local y versionado de PWA.

## No objetivos

- No modificar el JSON de origen ni transformar el instante UTC guardado a una hora local persistida.
- No deducir fechas anteriores al reto.
- No cambiar el recomendador de producción ni activar Ridge para recomendaciones reales.
- No enviar fechas, títulos o identificadores personales por la red.
