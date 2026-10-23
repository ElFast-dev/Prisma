# Corrección: abrir el Laboratorio sin bloquear la interfaz

## Problema

La vista del Laboratorio ejecutaba de forma síncrona la validación leave-one-out del modelo heurístico, la validación cruzada del ranking y el cálculo de diversidad antes de que `renderApp()` asignara el HTML a `#appRoot`. Con un historial grande, este trabajo impedía mostrar la pantalla y bloqueaba el hilo principal. La acción de copiar el diagnóstico también repetía varias de estas operaciones.

## Objetivo

Mostrar el Laboratorio y sus controles antes de ejecutar las métricas, conservar las fórmulas y umbrales existentes, permitir que el navegador procese otras tareas entre lotes, reutilizar el mismo resultado agregado al copiar el diagnóstico y descartar cálculos obsoletos.

## Alcance

- Separar el render inicial de las agregaciones y evaluaciones.
- Añadir variantes asíncronas cooperativas al MAE heurístico, al ranking y a la normalización experimental sin cambiar la versión síncrona que usan otras pruebas o consumidores.
- Cachear la instantánea calculada para el perfil y catálogo vigentes.
- Cancelar o invalidar trabajos al navegar fuera, cambiar datos o volver a ejecutar un experimento.
- Registrar duración, operación, recuento agregado y estado; nunca registrar títulos, IDs, puntuaciones individuales, notas personales ni excepciones que puedan contener esos valores.
- Añadir pruebas unitarias de equivalencia y una regresión Playwright con perfiles sintéticos vacío y de 351 películas.
- Versionar los recursos PWA y comprobar la versión de GitHub Pages.

## Fuera del alcance

- Cambiar los pesos, las características, los umbrales, los resultados matemáticos o el recomendador activo.
- Modificar el historial, catálogo o almacenamiento personal.
- Cambiar el flujo de publicación fuera de lo necesario para versionar y verificar la corrección.

## Criterios de aceptación

1. Al navegar al Laboratorio, el encabezado, los controles y los marcadores de estado se insertan en el DOM antes de iniciar las evaluaciones.
2. Con 351 películas sintéticas enlazadas, todas las evaluaciones iniciales terminan o se muestran como no disponibles con un estado controlado.
3. La cola de tareas del navegador sigue respondiendo durante los lotes.
4. Al cambiar de página o invalidarse el perfil, ningún resultado de una ejecución antigua reemplaza la vista actual.
5. Copiar el informe usa la instantánea calculada y no repite el MAE heurístico, el ranking ni la diversidad.
6. Para los mismos datos, el resultado asíncrono es equivalente al resultado síncrono y respeta los mismos mínimos.
7. El perfil vacío también completa el ciclo y mantiene MAE/nDCG no disponibles cuando corresponda.
8. Calidad, regresiones, Playwright y comprobaciones de versionado/caché pasan antes de integrar y publicar.
