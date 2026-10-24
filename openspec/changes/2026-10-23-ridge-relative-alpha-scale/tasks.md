# Tareas: escala relativa Ridge

- [x] R1. Inspeccionar kernel, evaluador, selector de alpha, tests, contrato diagnóstico v14 y expediente anterior de OpenSpec.
- [x] R2. Definir la escala primaria como media de la diagonal del kernel centrado y especificar la transformación relativa y sus límites de fuga en el diseño OpenSpec.
- [ ] R3. Añadir funciones puras para medir la escala y convertir alpha/lambda, con manejo explícito de escala degenerada.
- [ ] R4. Ampliar el evaluador anidado para comparar selección absoluta y relativa por MAE y ranking sobre las mismas particiones.
- [ ] R5. Medir escalas, cocientes efectivos, selección de límites, errores numéricos, cobertura y deltas exteriores en las tres repeticiones.
- [ ] R6. Actualizar el contrato v14, su test de informe y la representación del Laboratorio si se añaden campos visibles.
- [ ] R7. Añadir pruebas sintéticas de escala, invariancia de la transformación, anidamiento sin fuga, particiones emparejadas y determinismo.
- [ ] R8. Probar valores límite, singularidad/Cholesky, valores no finitos, cancelación cooperativa y progreso asíncrono.
- [ ] R9. Ejecutar test Ridge, evaluación de modelos, contrato de diagnóstico, arquitectura modular y validadores SDD.
- [ ] R10. Ejecutar Playwright en escritorio y móvil y medir responsividad/coste incremental.
- [ ] R11. Revisar el diff y confirmar que no cambia ningún peso ni ruta del recomendador activo; no cerrar ni desplegar con gates pendientes.
- [ ] R12. Conciliar la tarea A11 del expediente `2026-10-23-expand-ridge-alpha-grid` con el diagnóstico agregado v14 y documentar cualquier información que solo pueda producirse en el navegador personal local.
- [ ] R13. Emitir decisión técnica basada en resultados: adoptar la normalización solo si mejora de forma consistente el ranking emparejado; en otro caso dejarla como experimento descartado y mantener el método actual.
