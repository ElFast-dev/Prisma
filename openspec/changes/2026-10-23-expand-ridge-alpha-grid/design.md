# Diseño: rejilla Ridge ampliada y evaluación anidada

## Escala numérica y kernel
El kernel usa vectores de características ponderados (género=1, tema=0,35 y década=0,2), una matriz centrada y una factorización de Cholesky. El ajuste añade `alpha` a la diagonal y rechaza valores no finitos o menores/iguales a cero; Cholesky rechaza pivotes no finitos o <= 1e-12. Los candidatos 1e-5 y 3e-5 quedan por encima de esa tolerancia, pero la estabilidad se debe verificar con la suite real. No se introduce alpha=0 porque la matriz centrada puede ser singular.

Rejilla propuesta, ordenada y positiva:
`[0.00001, 0.00003, 0.0001, 0.0003, 0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1, 3, 10, 100]`.
La ampliación de 10 a 14 valores aumenta aproximadamente un 40 % los ajustes internos (14 × 3 frente a 10 × 3), además de los ajustes exteriores. El runner conserva la asincronía y las cesiones al navegador; se medirá su impacto en el Laboratorio antes de integrar.

## Selección anidada
En cada pliegue exterior, generar una sola división determinista de tres pliegues internos a partir exclusivamente de los índices de entrenamiento exteriores. Cada alpha se evalúa en esos mismos pliegues:
- MAE: media absoluta de errores de todas las observaciones internas retenidas; minimizar.
- Ranking: media de nDCG@5 calculable en los modos disponibles `balanced`, `affinity` y `variety`, con ganancia positiva solo para notas >=7. Los modos/ventanas sin DCG ideal positivo no cuentan como ceros. Mantener el mínimo de 50 observaciones de ranking y 10 relevantes, y un mínimo de dos pliegues internos válidos.
- En empates con tolerancia 1e-10, seleccionar el alpha mayor.
Ambas selecciones comparten matrices de índices pero conservan su ganador propio. La falta de ranking interno no impide evaluar MAE, pero sí debe dejar vacía la selección por ranking para ese pliegue exterior.

## Comparación exterior emparejada
Para cada repetición/pliegue, anotar solo índices de repetición/pliegue, alpha elegido por ambos criterios, MAE de la referencia aditiva, MAE de Ridge según MAE, MAE del alpha de ranking y nDCG@5 para referencia/Ridge-MAE/Ridge-ranking por modo. No almacenar IDs, títulos, notas individuales ni vectores en el informe. Los agregados calcularán medias, deltas, conteos de victoria/empate/derrota y cobertura real por modo.

El reporte deberá diferenciar el experimento de selección alpha (Ridge con alpha elegido) de la comparación de la variante Ridge con el modelo aditivo. No usar conteos de MAE-Ridge vs base para afirmar victorias en ranking alpha vs MAE alpha. La estabilidad entre repeticiones se resume descriptivamente y no se trata como 15 historias independientes.

## Modularidad
Mover la rejilla y las reglas puras de desempate/conteo a un módulo ES independiente, utilizado por el evaluador principal. Mantener el cálculo de pliegues, entrenamiento del kernel, métricas y orquestación en módulos separados. Si un criterio no tiene observaciones válidas, el helper devuelve selección no disponible, no una métrica sintética.

## Integración y privacidad
No cambiar `engine.js`, los pesos activos ni el ordenamiento de producción. Versionar las importaciones/activos diagnósticos que necesiten invalidar la caché. Los resultados se calculan localmente y permanecen en el informe agregado.
