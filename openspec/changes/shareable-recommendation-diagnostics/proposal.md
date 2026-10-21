# Propuesta: compartir diagnósticos útiles del recomendador sin exportar el historial

## Contexto

El Laboratorio ya calcula MAE frente a la media, la ablación de década, nDCG@5 de tres modos y diversidad Jaccard. Estas métricas usan las valoraciones reales almacenadas en el dispositivo, pero actualmente no hay una forma compacta de copiarlas junto con la cobertura del perfil y un resumen del modelo para pedir una revisión técnica.

## Objetivo

Añadir una acción explícita en Laboratorio que copie un informe agregado, preparado a partir de los cálculos locales reales, que permita revisar qué experimento conviene hacer a continuación sin compartir la colección película por película.

## Alcance

- Crear un módulo puro para construir un JSON de diagnóstico versionado.
- Incluir versión del esquema, distribución agregada de notas, cobertura y tamaño del perfil, pesos de las señales, resumen limitado de características agregadas y resultados actuales de evaluación.
- Excluir títulos, IDs TMDB, filas individuales de valoración, fechas personales, emociones, notas libres, credenciales y copias de seguridad.
- Explicar que géneros y temas agregados siguen revelando parte de las preferencias.
- Copiar solo después de pulsar el botón; ofrecer un campo de texto de respaldo si el portapapeles falla.
- Añadir pruebas sintéticas de forma, privacidad, disponibilidad de métricas y fallback.
- Mantener las pruebas de CI completamente sintéticas.

## Fuera de alcance

No se envía historial a una API o servidor, no se guarda informe en el perfil, no se alteran los pesos del recomendador ni se convierten métricas offline en garantías de satisfacción. El informe describe el modelo actual; por sí solo no sustituye una evaluación comparativa futura de nuevos modelos.
