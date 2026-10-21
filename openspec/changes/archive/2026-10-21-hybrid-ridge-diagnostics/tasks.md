# Tareas: evaluación del híbrido Ridge/aditivo

- [x] Añadir una mezcla 50/50 fija al cálculo de cada predicción externa de Ridge.
- [x] Agregar MAE y estabilidad de la mezcla para la validación primaria y las tres repeticiones.
- [x] Calcular nDCG@5 de la mezcla para los tres modos en los mismos pliegues.
- [x] Extender la serialización agregada del diagnóstico a v7 y conservar límites de privacidad.
- [x] Mostrar las métricas de la mezcla en el Laboratorio, distinguiendo la mezcla diagnóstica del ranking de producción.
- [x] Ampliar las pruebas del motor Ridge y del serializador para verificar campos y estabilidad agregada.
- [x] Actualizar versiones de módulo, entrada y caché PWA, junto con las aserciones de versionado, incluido el test del sistema visual que exige renovar la caché.
- [x] Ejecutar sintaxis, pruebas de recomendación, privacidad, SDD y Playwright en escritorio/móvil. CI en el SHA `782644734cb6748c8ed94884f7d46b7c7f52833f` concluyó correctamente: `Validate SDD and JavaScript syntax` y `screenshots` en verde.
- [x] Revisar el diff final: el recomendador activo permanece aditivo y el experimento temporal no informa métricas híbridas no calculadas.
- [x] Integrar la mejora en PR #60 (merge `71b9eac79f08d82c465de3f7bf905bec2224e224`), promover el requisito a la especificación permanente y archivar este expediente.
