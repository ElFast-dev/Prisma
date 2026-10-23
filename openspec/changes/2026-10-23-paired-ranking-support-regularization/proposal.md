# Propuesta: evaluación emparejada repetida y regularización por soporte

## Contexto

El diagnóstico local v12 informa 351 valoraciones enlazadas a metadatos y una representación de 8.125 características; el 72,49 % aparece en una sola observación. El experimento Ridge anterior mejoró MAE, pero no mejoró el nDCG@5 en los modos equilibrado y afín. Las familias completas superaron a «solo géneros» en ranking, aunque con peor MAE. Estos resultados son hipótesis de trabajo de una única historia personal, no garantías de comportamiento futuro.

## Objetivo

Ampliar la evaluación local para comparar familias de señales con validación cruzada repetida y emparejada; medir la contracción por soporte en varios valores de lambda; revisar la selección de alpha Ridge con criterios internos de MAE y ranking; y clarificar cobertura de candidatas y privacidad del informe compartible.

## Reglas no negociables

- No cambiar los pesos, las fórmulas, los candidatos ni el ranking que usa la recomendación activa.
- Mantener los experimentos como código de diagnóstico aislado, con ejecución asíncrona, progreso y cancelación.
- Usar tres repeticiones de cinco pliegues exteriores y las mismas particiones para todos los comparadores dentro de cada repetición.
- Mantener identidad canónica por TMDB; recurrir a título normalizado y año solo si falta ID, sin fusionar remakes con IDs TMDB distintos.
- Construir características, soportes y parámetros únicamente a partir del pliegue de entrenamiento. Las notas exteriores retenidas solo evalúan resultados.
- Si se seleccionan lambda o alpha, usar exclusivamente validaciones internas del entrenamiento exterior y comparar en los pliegues exteriores.
- Comparar cuatro familias: géneros; géneros+etiquetas; géneros+etiquetas+sinopsis; conjunto completo.
- Medir MAE y nDCG@5 en balanced, affinity y variety, con relevancia para notas >=7 y >=9. Informar por repetición y pliegue, diferencias emparejadas, victorias/empates/derrotas y estabilidad sin presentar los 15 pliegues como 15 perfiles independientes.
- Probar shrinkage de soporte con control lambda=0 y una rejilla declarada de lambdas; conservar señales de soporte uno y analizar efectos agregados por familia de señal.
- Expandir alpha Ridge a valores inferiores a 0,1 y comparar selección interna por MAE y por ranking con mínimos de muestra explícitos.
- Distinguir candidatas remotas, candidatas locales elegibles tras exclusiones de colección y resultados realmente disponibles. Investigar el tamaño de las listas de diversidad con trazas sintéticas.
- El diagnóstico compartible no incluirá etiquetas concretas de características por defecto. La inclusión de etiquetas seguirá siendo opt-in y requerirá acción deliberada.
- No seleccionar una variante para producción ni cambiar datos personales. No exponer títulos, IDs, notas individuales, predicciones por película ni errores por película en el informe.

## Fuera de alcance

- Activar regularización, alterar señales activas o desplegar una nueva política de ranking.
- Tratar las dos notas 10 como evidencia estadística suficiente para predicción de obras excepcionales.
- Inferir causalidad o significación estadística a partir de un único historial personal.
