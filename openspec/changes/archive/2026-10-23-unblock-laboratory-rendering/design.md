# Diseño completado: renderizado cooperativo del Laboratorio

## Flujo

1. \`renderApp()\` inserta una vista inicial ligera. \`renderLab()\` muestra encabezado, controles y estados pendientes sin calcular MAE, perfil ni ranking.
2. Después de insertar el HTML, el orquestador cede al navegador mediante dos cuadros de animación (con alternativa de temporizador).
3. \`createLabMetricsActions\` calcula \`summaryStats\`, perfil, estadísticas por género, evaluación leave-one-out y ranking/diversidad en orden y mide cada operación. La caché se invalida ante cambios de estado o catálogo.
4. Las variantes asíncronas mantienen cálculos, resultados y umbrales existentes, procesan filas/pliegues con cesiones reales al navegador y admiten cancelación cooperativa.
5. Diversidad reutiliza el perfil calculado. La acción de diagnóstico consume la instantánea en caché en vez de repetir MAE, ranking y diversidad.
6. Los experimentos manuales de normalización, Ridge y temporal conservan sus fórmulas y umbrales y se invalidan si se abandona el Laboratorio antes de terminar.

## Instrumentación de privacidad

Los eventos \`[Prisma performance]\` contienen nombre fijo de operación, duración en milisegundos, recuento agregado y estado. No serializan registros, títulos, identificadores, notas, características ni mensajes de excepción. Se distingue navegación/render, primer render de Laboratorio, primera cesión al navegador, cada evaluación y la tubería global.

## Compatibilidad y riesgos

- Se conservaron las funciones síncronas para no cambiar consumidores existentes.
- Las funciones asíncronas devuelven \`null\` si una ejecución se invalida.
- Playwright escribe fixtures sintéticos en IndexedDB aislado y no lee datos personales.
- Entrada, URLs de módulos y caché PWA se versionaron conjuntamente.
- Las duraciones son medidas del entorno de CI y no garantías de rendimiento en hardware específico.

## Verificación ejecutada

- Sintaxis de módulos y scripts modificados.
- Paridad exacta síncrona/asíncrona para MAE heurístico, ranking/diversidad y normalización.
- Regresiones de acciones, informe, versionado y precaché PWA.
- Playwright en el SHA integrado: escenario de 351 valoraciones, heartbeat del hilo principal, diagnóstico agregado, ausencia de cálculos duplicados, navegación/cancelación/reentrada y perfil vacío.
- La verificación final confirma Quality/SDD, Playwright y GitHub Pages sobre \`8ab7bf76051d965fa8b1ccb411b728995dbdd061\`.
