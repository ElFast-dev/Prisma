# Propuesta: explorar el límite inferior de alpha Ridge

## Motivación

Un diagnóstico agregado v14 reciente indica que la selección interna por MAE sigue favoreciendo el límite inferior de la rejilla extendida, mientras que la selección por ranking prefiere otro rango. El límite, por tanto, sigue sin resolverse; no se debe concluir que reducir alpha mejora el ranking ni seleccionar parámetros con los pliegues exteriores. Las cifras específicas del historial personal permanecen locales y no se registran en este expediente.

## Objetivo

Añadir una rejilla diagnóstica experimental que extienda el límite inferior, manteniendo todas las opciones positivas y suficientemente alejadas de la tolerancia numérica Cholesky. El Laboratorio solicitará explícitamente esta variante dentro de su batería automática de diagnóstico; la API Ridge conservará la rejilla histórica cuando no se solicite la opción extendida. El modelo y el ranking de producción no consumirán ni activarán estos resultados.

## Alcance

- Añadir una constante inmutable para la rejilla extendida, en el módulo ES de selección de alpha.
- Seleccionar alpha por MAE y por ranking únicamente con validación interna de cada entrenamiento exterior.
- Usar la misma rejilla extendida y las mismas particiones internas para ambos criterios; cuando se solicita escala relativa, derivar lambda de esa rejilla y calcular el alpha efectivo en cada entrenamiento correspondiente.
- Registrar la rejilla usada, los conteos completos de selección y si la elección del mínimo sigue dejando sin resolver el límite.
- Añadir pruebas de rejilla, anidamiento sin fuga, métricas exteriores intactas, cancelación/progreso y rendimiento del camino automático.
- Mantener SDD/OpenSpec, imports versionados y caché PWA sincronizados.

## Reglas no negociables

- `additive-content-baseline` continúa como único modelo de producción; este cambio no activa Ridge ni altera pesos/rutas activas.
- Ninguna nota o métrica del pliegue exterior selecciona alpha/lambda.
- Alpha sigue siendo estrictamente positivo; no se cambia la tolerancia Cholesky para acomodar valores inferiores.
- No se transmite historial personal ni se incorporan títulos, IDs, notas individuales o características personales al repositorio.
- Las repeticiones del mismo historial son comparaciones emparejadas descriptivas, no muestras independientes.

## Criterios de aceptación

1. La rejilla extendida es ordenada, determinista, contiene la rejilla histórica y explora por debajo de `0.00001` sin incluir cero.
2. El evaluador Ridge usa la rejilla histórica cuando no se solicita la opción extendida; la batería diagnóstica del Laboratorio solicita explícitamente la rejilla ampliada.
3. MAE y nDCG@5 seleccionan sus parámetros usando exclusivamente pliegues internos y se miden después en los pliegues exteriores emparejados.
4. Se conserva el contrato v14 con campos agregados y privacidad; las pruebas prueban límites, escala, cancelación y regresiones.
5. SDD/calidad y Playwright escritorio/móvil pasan antes de integrar. No se cambia el modelo activo.
