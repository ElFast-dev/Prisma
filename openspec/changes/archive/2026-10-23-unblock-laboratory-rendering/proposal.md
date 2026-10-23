# Corrección completada: abrir el Laboratorio sin bloquear la interfaz

## Problema

La vista del Laboratorio ejecutaba de forma síncrona la validación leave-one-out del modelo heurístico, la validación cruzada del ranking y el cálculo de diversidad antes de que \`renderApp()\` asignara el HTML a \`#appRoot\`. Con un historial grande, este trabajo impedía mostrar la pantalla y bloqueaba el hilo principal. La acción de copiar el diagnóstico también repetía varias de estas operaciones.

## Objetivo

Mostrar el Laboratorio y sus controles antes de ejecutar las métricas, conservar las fórmulas y umbrales existentes, permitir que el navegador procese otras tareas entre lotes, reutilizar el mismo resultado agregado al copiar el diagnóstico y descartar cálculos obsoletos.

## Alcance implementado

- Separar el render inicial de las agregaciones y evaluaciones.
- Añadir variantes asíncronas cooperativas al MAE heurístico, al ranking y a la normalización experimental sin cambiar la versión síncrona que usan otros consumidores.
- Cachear la instantánea calculada para el perfil y catálogo vigentes.
- Cancelar o invalidar trabajos al navegar fuera o cambiar los datos.
- Registrar solo operación, duración, recuento agregado y estado; nunca títulos, IDs, puntuaciones individuales ni notas personales.
- Añadir pruebas de paridad síncrona/asíncrona y Playwright con perfil sintético vacío y uno de 351 valoraciones.
- Versionar los módulos y la caché PWA y verificar el SHA desplegado.

## Fuera del alcance preservado

- No se cambiaron pesos, características, umbrales, fórmulas ni recomendaciones activas.
- No se modificaron valoraciones, catálogo personal, IDs TMDB, fechas, colecciones, historial ni almacenamiento personal.
- No se inició el experimento de comparación de modelos.

## Criterios de aceptación

1. El encabezado, controles y estado del Laboratorio aparecen antes de iniciar las evaluaciones pesadas.
2. Las evaluaciones terminan o se presentan como no disponibles de forma controlada.
3. El hilo principal puede atender otras tareas durante los lotes.
4. Los resultados obsoletos se descartan al navegar o invalidar el perfil.
5. Copiar el informe reutiliza la instantánea y no repite las evaluaciones.
6. Los resultados asíncronos coinciden exactamente con las evaluaciones síncronas para las mismas entradas.
7. El perfil vacío completa el ciclo sin falsos resultados disponibles.
8. Quality/SDD, Playwright y Pages han validado el SHA integrado.

## Evidencia de cierre

- PR #116: https://github.com/ElFast-dev/Prisma/pull/116.
- SHA integrado y publicado: \`8ab7bf76051d965fa8b1ccb411b728995dbdd061\`.
- Quality/SDD posterior a la integración: https://github.com/ElFast-dev/Prisma/actions/runs/40011167941.
- Playwright y regresión de Laboratorio posterior a la integración: https://github.com/ElFast-dev/Prisma/actions/runs/40011216659.
- GitHub Pages, con doble validación del SHA contra \`main\`: https://github.com/ElFast-dev/Prisma/actions/runs/40012463841.
