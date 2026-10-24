# Propuesta: ampliar y validar la selección de alpha Ridge

## Motivación
El diagnóstico de recomendaciones v13 indica que el criterio MAE seleccionó `alpha=0.001`, el mínimo de la rejilla, en los 15 pliegues exteriores de tres repeticiones. Ese resultado sugiere que la rejilla podría estar truncada, pero no demuestra que reducir alpha mejore la predicción ni el ranking fuera de muestra. La implementación actual ya compara selección interna por MAE y por nDCG@5 en su ruta asíncrona, aunque la rejilla sigue empezando en 0,001.

## Alcance
- Revisar kernel, selección anidada, tests, reporte diagnóstico, versionado de módulos y gates OpenSpec.
- Explorar una rejilla logarítmica ampliada por debajo de 0,001 y mantener alpha positivo.
- Seleccionar dos configuraciones independientes dentro de cada entrenamiento exterior: mínimo MAE y máximo nDCG@5 agregado entre modos disponibles.
- Registrar selección, MAE y métricas de ranking emparejadas por pliegue y repetición, con métricas no disponibles explícitas.
- Cuantificar estabilidad, victorias/empates/derrotas, cobertura de conteos y selección del límite inferior.
- Conservar ejecución asíncrona, cancelación cooperativa, progreso y render inicial ágil.

## Reglas no negociables
- El modelo aditivo actual y sus pesos seguirán siendo el único modelo de producción.
- Las notas del pliegue exterior se usarán solo para medir predicciones y ranking; jamás para seleccionar alpha.
- Ambos criterios compartirán los mismos pliegues internos y la misma rejilla dentro de cada pliegue exterior.
- El ranking interno usará relevancia >=7, nDCG@5 y los mínimos de muestra existentes; si no hay muestra válida suficiente, la selección por ranking será no disponible, no un cero artificial.
- Desempate determinista: alpha mayor ante diferencias dentro de tolerancia de 1e-10.
- Las tres repeticiones son particiones correlacionadas del mismo historial sintético/personal, no muestras independientes.
- No leer, alterar ni exportar registros personales desde CI. No usar exportaciones de listas sin calificaciones/features como sustituto del perfil enriquecido.

## Criterios de aceptación
1. Los resultados registran rejilla, conteos por criterio para todos los pliegues completados, métricas exteriores emparejadas y resultados separados por modo.
2. Se informa explícitamente si el menor alpha sigue seleccionado en la mayoría de pliegues.
3. El test sintético demuestra selección independiente, ausencia de fuga en la selección interna y particiones emparejadas.
4. Se validan SDD, Ridge/model evaluation, diagnóstico y capacidad de respuesta en escritorio/móvil; no se integra ni despliega una variante activa con gates obligatorios fallidos.
5. Los resultados son diagnósticos, no prueba estadística concluyente ni motivo automático para cambiar producción.
