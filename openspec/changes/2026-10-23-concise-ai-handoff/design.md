# Diseño técnico

## Separación de responsabilidades
- `js/diagnostics/recommendation-report.js` sigue siendo el constructor del JSON integral con listas de campos permitidos.
- `js/diagnostics/recommendation-handoff.js` transforma ese objeto ya agregado en una ficha Markdown legible; no recibe acceso a datos individuales ni a la red.
- `js/app/lab-actions.js` administra ambos formatos y el portapapeles.
- `js/ui/lab-views.js` presenta como primaria la copia compacta y deja el JSON integral como acción secundaria.
- `js/app/event-handlers.js` enruta ambas acciones por separado.

## Formato del resumen
El orden es: contexto/repositorio y reglas invariables; estado de la batería y muestra; predicción de notas; Ridge e impacto en nDCG@5 por modo; selección de parámetros; evaluación temporal y cautelas; normalización; familias de señales y regularización por soporte; pool de candidatas si explica listas cortas; límites de interpretación y próxima tarea. Solo se presentan las secciones con datos disponibles, y una fase no disponible se etiqueta como tal.

Las métricas se redondean a una precisión legible. Los conteos de estabilidad pueden aparecer como victorias/empates/derrotas, pero no se copian arrays extensos de cada pliegue. El resumen tiene un límite de longitud para que siga siendo útil al pegarlo en otra conversación.

## Privacidad y seguridad
El resumen es determinista y se genera en el dispositivo. No incluye títulos, IDs TMDB, registros individuales, notas por película, fechas personales, comentarios ni etiquetas concretas de las características aprendidas. El JSON completo mantiene su opción de etiquetas separada y optativa. El formateador no hace solicitudes de red, no persiste información y no usa el portapapeles directamente.

## Compatibilidad y despliegue
Las acciones públicas existentes se conservan para quienes necesitan el JSON. Se añade un método específico para el resumen y otro para el JSON completo. Se actualizan los parámetros de versión de módulos, `index.html`, `sw.js` y las verificaciones de CI para que los clientes PWA no mezclen código antiguo y nuevo.

## Validación
Pruebas sintéticas verifican cifras clave, recomendaciones condicionadas por resultados, longitud máxima, datos confidenciales excluidos y estado del portapapeles. Las pruebas de versión comprueban que los módulos se importan y precargan con las URLs correctas. El flujo de producción y las reglas del recomendador deben permanecer sin cambios.
