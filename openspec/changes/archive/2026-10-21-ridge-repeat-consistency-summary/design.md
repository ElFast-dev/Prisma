# Diseño: consistencia agregada entre repeticiones

## Cálculo

Un módulo puro, `js/recommendations/repeated-validation-summary.js`, recibe el resultado de validación repetida y resume los valores de cada repetición. Para MAE usa `baselineMae - ridgeMae`; para nDCG@5 usa `ridgeNdcg - baselineNdcg`. En ambos casos, un delta positivo favorece Ridge. La tolerancia de empate es `1e-10`, igual que los contadores existentes por pliegue.

Cada resumen informa repeticiones con métrica disponible, dirección favorable/empate/desfavorable y los valores mínimo y máximo observados. Si faltan resultados válidos, la métrica queda no disponible; no se sustituye por cero.

## Interfaz

El Laboratorio mostrará una sección breve de «Consistencia por repetición», diferenciada del resumen por pliegue. Los rangos se describen como variación observada entre repeticiones, no como intervalo estadístico. Se mantiene la advertencia existente sobre reutilizar el mismo historial personal.

## Compatibilidad, privacidad y límites

No cambia el recomendador activo ni las predicciones. No cambia el informe JSON v4, ya que contiene los agregados por repetición a partir de los cuales se deriva este resumen. El cálculo no recibe títulos, notas individuales ni fechas y no introduce persistencia o llamadas de red.

## Verificación

Probar el resumen con mejoras, empates y pérdidas; probar ausencia de datos; proteger su uso en la vista del Laboratorio; actualizar el versionado de módulos/caché y ejecutar CI y Playwright antes de archivar este cambio SDD.
