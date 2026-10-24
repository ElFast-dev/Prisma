# Tareas de implementación y verificación

- [x] A1. Inspeccionar la rejilla, las rutas síncrona/asíncrona, el kernel, la comparación por ranking ya existente y los gates de CI.
- [x] A2. Documentar rejilla, mínimos, tolerancia de Cholesky, protocolos emparejados, prevención de fuga y regla de decisión antes de modificar código.
- [x] A3. Extraer la rejilla y selectores puros a un módulo ES independiente; actualizar versionado de importación/cache.
- [x] A4. Ampliar la rejilla y registrar resultados exteriores por pliegue y repetición para ambos criterios y la referencia.
- [x] A5. Añadir contadores completos por criterio, métricas nDCG@5 por modo, empates/victorias/derrotas y alerta del límite inferior.
- [x] A6. Añadir pruebas sintéticas de selección independiente, desempate, fuga, particiones emparejadas y contadores completos.
- [x] A7. Actualizar tests de rejilla exacta, contrato del informe, cancelación, progreso y comportamiento del Laboratorio.
- [x] A8. Ejecutar pruebas Ridge/model evaluation/diagnóstico y validadores SDD; corregir fallos sin cerrar expedientes ajenos pendientes.
- [x] A9. Ejecutar Playwright escritorio/móvil y medir render inicial/responsividad con perfiles sintéticos.
- [x] A10. Revisar el diff y confirmar que SDD/calidad y Playwright están en verde; el modelo aditivo activo y sus pesos no cambian.
- [ ] A11. Ejecutar y analizar el diagnóstico v14 con el historial personal enriquecido, en el navegador local, para obtener MAE/nDCG@5 y escala del kernel reales. Mantener Ridge en modo diagnóstico hasta contar con evidencia externa suficiente.

  **Reconciliación con v14:** el diagnóstico agregado proporcionado en esta conversación confirma que una mejora de MAE no basta para adoptar Ridge porque el ranking no mejora consistentemente frente al modelo aditivo activo. La escala de la diagonal centrada y los cocientes alpha/escala aún no están en el contrato v14 actual; se medirán mediante el expediente `2026-10-23-ridge-relative-alpha-scale`. No se copiarán métricas personales, etiquetas de preferencias ni registros al repositorio. Esta tarea permanece abierta hasta que el informe agregado se regenere localmente con el catálogo enriquecido y se revise el resultado emparejado.
