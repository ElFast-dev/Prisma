# Diseño: evaluación temporal Ridge

## Fechas e identidad

La evaluación parte de las valoraciones válidas con características que ya usa Ridge. Para cada entrada, busca su `watchedAt` directamente o en el historial de películas vistas, resolviendo identidad con ID TMDB cuando existe y con la identidad normalizada actual como fallback. La fecha debe parsearse correctamente. `updatedAt`, `addedAt`, el año de estreno y fechas de otros eventos no son sustitutos aceptables. Los registros sin fecha se excluyen del cálculo, pero se contabilizan de forma agregada.

Se agrupan entradas por día UTC para que registros del mismo día nunca se separen entre entrenamiento y prueba. El día exacto nunca se incluye en el resultado compartible.

## Partición exterior walk-forward

Requiere al menos 100 valoraciones únicas con características y fecha válida y al menos 12 días distintos. Se ordenan los grupos de días, se reserva el 50 % inicial para calentamiento y se divide el resto en cinco ventanas futuras contiguas. Para cada ventana, el entrenamiento contiene solo días anteriores al comienzo de la ventana; después se incorporan al entrenamiento los días de ventanas de prueba ya terminadas. Cada entrada de la zona de prueba se evalúa una sola vez.

## Selección interior de alpha

Dentro del entrenamiento disponible para cada ventana exterior, se generan tres ventanas de validación temporal expansiva: cada bloque de validación va después de su propio entrenamiento. El alpha del grid existente se elige por MAE combinado en esas validaciones internas. Ninguna valoración de la ventana exterior futura se usa para seleccionar alpha o ajustar el perfil aditivo.

## Métricas y UI

Se agregan errores Ridge y aditivos sobre las mismas valoraciones futuras. nDCG@5 por modo ordena las películas valoradas dentro de cada ventana exterior y agrega DCG/IDCG por ventanas evaluables; la métrica permanece no disponible si la zona de prueba no alcanza los mínimos actuales de muestra o relevancia. El resumen por ventana solo expone su ordinal y contadores, alpha y errores agregados; no fechas ni identidades.

La ejecución se solicita desde el Laboratorio, informa progreso entre cinco ventanas y se invalida cuando cambian los datos personales. El cálculo temporal es distinto de la validación cruzada aleatoria existente.

## Informe, privacidad y compatibilidad

El informe pasa a `prisma-recommendation-diagnostics/v5` porque incorpora una sección agregada nueva de validación temporal. Nunca serializa las fechas, los nombres o IDs de película ni filas de predicción. Ridge sigue experimental. La nueva prueba no modifica el modelo ni los datos personales persistidos.

## Verificación

Probar fechas válidas/ausentes, unión por identidad, orden y agrupación cronológica, que todo entrenamiento precede a su prueba, selección interna sin fuga, consistencia determinista, progreso/cancelación, disponibilidad según mínimos, saneamiento del informe v5 y coherencia de caché PWA/Playwright.
