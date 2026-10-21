# Tareas: comparación del ranking Ridge

- [ ] RQ1. Registrar el protocolo SDD y sus umbrales.
- [ ] RQ2. Ampliar Ridge con nDCG@5 emparejado por modo y los mismos pliegues externos.
- [ ] RQ3. Garantizar que el ranker no recibe notas retenidas ni IDs TMDB.
- [ ] RQ4. Presentar resultados por modo en el Laboratorio y diagnóstico compartible.
- [ ] RQ5. Probar determinismo, umbrales, deltas y privacidad con datos sintéticos.
- [ ] RQ6. Actualizar esquema del informe, versionado/caché PWA y contratos automáticos.
- [ ] RQ7. Ejecutar CI, Playwright y comprobar despliegue; archivar solo con todos los checks verdes.

## Evidencia de cierre

- Continúan pasando las pruebas anteriores del MAE Ridge.
- El test Ridge verifica nDCG@5 de cinco pliegues y candidatas sin información personal.
- El informe contiene solamente métricas agregadas.
- SDD, calidad, validación, capturas y despliegue pasan.