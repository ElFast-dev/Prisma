# Propuesta: mostrar el intercambio con el modo Más afines

## Contexto

El Laboratorio compara nDCG@5 para Equilibrado, Más afines y Más variedad, además de medir por separado la diversidad Jaccard del catálogo actual. Los valores individuales son correctos, pero el esfuerzo por comparar modos obliga a calcular mentalmente la diferencia con la referencia de afinidad.

## Objetivo

Mostrar la diferencia absoluta de nDCG@5 respecto a Más afines junto al resultado de Equilibrado y Más variedad para facilitar la lectura del intercambio entre calidad del orden y diversidad.

## Alcance

- Usar Más afines como referencia explícita.
- Mostrar nDCG y diferencia con dos decimales para las variantes comparables.
- Indicar cuándo no hay referencia válida y evitar diferencias inventadas.
- Aclarar que el delta es descriptivo y no evidencia significación estadística o satisfacción.
- Actualizar pruebas, especificación permanente, documentación y versiones PWA según SDD.

## Fuera de alcance

No cambia el algoritmo, sus pesos, los conjuntos de prueba, las exclusiones ni las preferencias persistidas; tampoco califica automáticamente un modo como ganador.
