# Propuesta: extraer las acciones del Laboratorio

## Problema

app.js todavía contiene la orquestación de la validación Ridge repetida, la evaluación temporal walk-forward, la evaluación de normalización de influencia y la preparación/copia del informe de diagnóstico. Esta responsabilidad complica la raíz de composición y dificulta probar por separado los estados ocupados, el progreso, la cancelación y los fallos.

## Alcance

- Extraer las seis acciones del Laboratorio a js/app/lab-actions.js mediante una fábrica createLabActions(ctx).
- Mantener los nombres y el comportamiento de la API utilizada por las vistas y los eventos.
- Añadir una prueba de contrato para guardas, progreso, resultados fallidos, informe local y portapapeles.
- Actualizar la versión del módulo, la precaché PWA, las pruebas de arquitectura y la documentación SDD.

## Fuera de alcance

No cambiar el cálculo ni los pesos del recomendador, el protocolo de evaluación, los metadatos cinematográficos, los datos personales, los informes que ya genera el módulo de diagnóstico, ni el diseño visible del Laboratorio.
