# Tareas

- [x] Inspeccionar la ruta de renderizado y demostrar llamadas síncronas a evaluación antes de reemplazar `#appRoot`.
- [x] Crear variantes cooperativas para MAE heurístico, ranking y normalización manteniendo las fórmulas síncronas intactas.
- [x] Añadir orquestación de métricas con medición de duración, caché e invalidación.
- [x] Retirar las operaciones pesadas de `renderLab()` y diferirlas hasta después del primer render.
- [x] Reutilizar la instantánea al copiar el diagnóstico y pasar el perfil existente al cálculo de diversidad.
- [x] Cancelar/inutilizar el trabajo manual y automático al navegar fuera del Laboratorio.
- [ ] Añadir pruebas de equivalencia asíncrona y regresión Playwright de 351 filas sintéticas/perfil vacío.
- [x] Añadir una medición Playwright del SHA previo a la corrección, sobre las mismas 351 filas sintéticas, para cuantificar el retraso antes de la inserción del encabezado.
- [ ] Actualizar las versiones de módulos, precaché y caché PWA.
- [ ] Ejecutar verificación SDD, sintaxis, regresiones y Playwright; registrar tiempos medidos antes/después donde la instrumentación permita compararlos.
- [ ] Archivar este expediente tras comprobar criterios y dejar CI y Pages verificados sobre el mismo SHA.
