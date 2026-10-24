# Propuesta: contexto técnico compacto para la IA desarrolladora

## Motivación
El botón actual copia un JSON técnico muy extenso con métricas anidadas, estadísticas por pliegue y repetición. Aunque es útil para depuración detallada, dificulta pegar el contexto necesario en otra conversación y hace más probable que se pierdan las conclusiones y la siguiente tarea.

## Alcance
- Convertir la acción principal de copia del Laboratorio en un resumen Markdown compacto y accionable, preparado localmente a partir del diagnóstico agregado existente.
- Incluir reglas estables del proyecto, estado y tamaño de muestra, métricas decisivas, diferencias entre MAE y calidad del ranking, limitaciones de interpretación y siguientes pasos derivados de los datos disponibles.
- Excluir por defecto títulos, identificadores, notas y fechas individuales, nombres de señales concretas, listas repetidas de pliegues y estructuras internas redundantes.
- Mantener una acción secundaria para copiar el JSON técnico integral, con inclusión de etiquetas de características solo tras habilitación explícita.
- Probar contenido, límites de longitud, privacidad, acciones de interfaz, importaciones versionadas y precaché PWA.

## Fuera de alcance
- No alterar el motor de recomendaciones ni sus pesos.
- No subir diagnósticos, valoraciones o perfiles a un servidor.
- No resumir mediante un servicio de IA remoto: el formateo debe ser determinista, local y basado exclusivamente en el informe agregado.
- No eliminar la posibilidad de inspeccionar el JSON completo.

## Criterios de aceptación
1. La acción principal copia contexto Markdown listo para pegar y más corto que el JSON integral.
2. El resumen conserva los requisitos del proyecto, resultados clave disponibles, límites y una próxima tarea concreta sin presentar resultados no disponibles como ceros.
3. La generación y copia no hacen peticiones de red ni incluyen títulos, IDs, notas individuales, fechas personales o nombres individuales de características.
4. El JSON completo continúa disponible como acción avanzada independiente.
5. Las pruebas cubren estados incompletos/no disponibles, contenido sintético, privacidad, portapapeles, actualización de versiones y SDD.
