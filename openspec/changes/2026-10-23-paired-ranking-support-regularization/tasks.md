# Tareas: evaluación emparejada de ranking y regularización

- [x] S1. Revisar diagnóstico v12, evaluador de familias, Ridge anidado, informe v12 y los tests existentes.
- [x] S2. Definir protocolo emparejado, ausencia de fuga, privacidad y criterio de decisión en SDD antes del código.
- [x] S3. Implementar repetición 3x5 con particiones compartidas y resultados por threshold 7/9.
- [x] S4. Añadir comparadores de familia completos con MAE/nDCG@5 por modo y estabilidad por repetición.
- [x] S5. Añadir la rejilla de contracción de soporte y selección anidada sin quitar características de soporte uno.
- [x] S6. Ampliar la selección interna de alpha Ridge con candidatos inferiores a 0,1 y criterio de ranking.
- [x] S7. Explicar contadores del pool remoto/local/elegible/disponible y reproducir el shortfall de diversidad.
- [x] S8. Cambiar la privacidad compartible a featureLabelsIncluded=false por defecto y subir el esquema a v13.
- [x] S9. Añadir tests sintéticos para 351 registros, duplicados/remakes, particiones idénticas, ausencia de fuga, soporte y thresholds, alpha anidado, cancelación, progreso y privacidad.
- [x] S10. Ejecutar tests SDD/estáticos y Playwright; medir duración en el Laboratorio sintético y comprobar funcionamiento asíncrono.
- [ ] S11. Generar una comparación agregada local solo con datos presentes en el navegador; no inventar resultados del historial real si no está accesible a CI.

  **Pendiente de ejecución con el historial personal real:** la exportación JSON adjunta contiene valoraciones e identificadores, pero no el conjunto de características enriquecidas que utiliza el motor (géneros, etiquetas, sinopsis y créditos). CI valida solo perfiles sintéticos. La comparación personal no se considera completada hasta que el Laboratorio ejecute v13 en el navegador local y su informe agregado pueda revisarse.
- [x] S12. Revisar la salida, documentar limitaciones y recomendación sin activar variante en producción.
- [ ] S13. Integrar únicamente después de que CI complete; desplegar con gate aprobado y archivar el expediente tras la publicación.

## Criterios de aceptación

- Todos los comparadores de una repetición comparten los mismos índices exteriores.
- Las notas exteriores no se usan para seleccionar parámetros.
- Las identidades TMDB separan remakes con IDs distintos.
- Las dos definiciones de relevancia son explícitas y tienen estados no disponibles cuando no hay muestra suficiente.
- Los resultados por pliegue/repetición se etiquetan como medidas dependientes de un único historial.
- Las evaluaciones de lambda y alpha no afectan a la predicción activa.
- Los resultados compartibles están agregados y no incluyen etiquetas concretas salvo opt-in explícito.
- No se altera ningún registro, importación, colección ni preferencia personal.
