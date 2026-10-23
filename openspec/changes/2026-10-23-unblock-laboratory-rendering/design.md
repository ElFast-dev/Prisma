# Diseño: renderizado cooperativo del Laboratorio

## Flujo

1. `renderApp()` genera e inserta una vista inicial ligera. `renderLab()` muestra encabezado, controles y estados pendientes sin calcular MAE, perfil ni ranking.
2. Después de insertar el HTML, el orquestador cede al navegador mediante dos cuadros de animación (con alternativa de temporizador en entornos sin `requestAnimationFrame`).
3. `createLabMetricsActions` calcula `summaryStats`, perfil, estadísticas por género, evaluación leave-one-out y ranking/diversidad en orden, midiendo cada operación. La clave de caché usa la revisión del estado, referencias de estado/catálogo/candidatas, fecha de modificación, recuentos y modo. `persistState` invalida la instantánea de forma explícita.
4. Las variantes asíncronas de las evaluaciones mantienen los cálculos y resultados existentes, pero procesan filas y pliegues con pausas de tareas reales entre lotes. Un predicado `shouldContinue` cancela de forma cooperativa el trabajo al cambiar de página o de datos.
5. La evaluación de diversidad recibe el perfil ya calculado, evitando tres reconstrucciones innecesarias. La acción del informe espera la instantánea existente y reutiliza sus métricas; no llama de nuevo a los evaluadores.
6. Los experimentos manuales de normalización, Ridge y temporal conservan resultados y umbrales, registran tiempos agregados y quedan invalidados al abandonar el Laboratorio.

## Instrumentación

Todos los eventos usan el prefijo `[Prisma performance]` y solo emiten nombre fijo de operación, duración en milisegundos, recuento de filas y estado. No serializan registros, títulos, identificadores, notas, características o mensajes de excepción. Se distinguen el coste de navegación/render, la función `renderLab`, la primera cesión tras insertar la vista y los tiempos individuales de cada evaluación, además del total de la tubería inicial.

## Compatibilidad y riesgos

- Se conservan las funciones síncronas existentes para evitar cambios en consumidores y pruebas actuales.
- Las funciones asíncronas devuelven `null` si una ejecución se invalida; el orquestador no presenta esos resultados como completos.
- La prueba Playwright escribe solo fixtures sintéticos en el IndexedDB aislado del contexto de prueba. Nunca importa una copia real ni accede al navegador personal.
- Todos los módulos cambiados deben tener URL versionada coordinada con `app.js` y `sw.js`; se incrementa el nombre de caché PWA.
- Los temporizadores miden trabajo de cliente local; la duración informada es descriptiva y no se toma como garantía de hardware específico.

## Verificación

- Comprobación de sintaxis de los módulos modificados.
- Pruebas de equivalencia síncrona/asíncrona, identidad y umbrales existentes.
- Pruebas de acciones del Laboratorio, informe agregado y caché PWA.
- Playwright: perfil vacío, 351 películas sintéticas, interacción durante los cálculos, navegación/cancelación, terminación controlada y copia del informe sin evaluaciones duplicadas.
- CI de calidad/SDD y Playwright en el mismo SHA; despliegue Pages con SHA coincidente con `main`.
