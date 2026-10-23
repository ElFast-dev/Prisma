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
- [x] S10. Ejecutar tests SDD/estáticos y Playwright; medir duración en el Laboratorio sintético y comprobar funcionamiento asíncrono. En el commit desplegado `324ed1c7fe8a2c1cbbab51197dc9fdd6a8b4c8cd`, calidad 51/51 y UI 15/15. Con 351 registros sintéticos: pipeline completo 73.824 ms, fase de familias 20.056 ms, navegación al encabezado del Laboratorio 76 ms, primer render 5,3 ms, 6.974 ticks de respuesta y máximo intervalo de latido 66 ms. La fase temporal terminó como no disponible por ausencia de fechas fiables en la fixture sintética.
- [ ] S11. Generar una comparación agregada local solo con datos presentes en el navegador; no inventar resultados del historial real si no está accesible a CI.

  **Comprobación del archivo personal:** inspeccioné `Clasificaciones personales.json`. Contiene 351 filas de valoración con 351 IDs TMDB únicos y sus notas, pero no guarda las características enriquecidas (géneros, etiquetas, sinopsis, reparto ni equipo creativo). Por eso no permite reconstruir de forma válida los cuatro comparadores ni la contracción por soporte desde el archivo aislado. CI solo valida perfiles sintéticos. La comparación personal queda bloqueada hasta ejecutar v13 en el navegador/origen que sí dispone del catálogo TMDB enriquecido y revisar su informe agregado sin etiquetas concretas de características.
- [x] S12. Revisar la salida, documentar limitaciones y recomendación sin activar variante en producción.
- [x] S13. Integrar después de que CI completara; fusionado PR #120. Calidad 51/51, Playwright 15/15 y GitHub Pages desplegado correctamente en el commit `324ed1c7fe8a2c1cbbab51197dc9fdd6a8b4c8cd`.
- [ ] S14. Archivar el expediente de implementación. Se mantiene abierto mientras S11 requiere el informe agregado del perfil personal; no declarar ganador ni convertirlo en ajuste de producción antes de revisar ese informe.

## Criterios de aceptación

- Todos los comparadores de una repetición comparten los mismos índices exteriores.
- Las notas exteriores no se usan para seleccionar parámetros.
- Las identidades TMDB separan remakes con IDs distintos.
- Las dos definiciones de relevancia son explícitas y tienen estados no disponibles cuando no hay muestra suficiente.
- Los resultados por pliegue/repetición se etiquetan como medidas dependientes de un único historial.
- Las evaluaciones de lambda y alpha no afectan a la predicción activa.
- Los resultados compartibles están agregados y no incluyen etiquetas concretas salvo opt-in explícito.
- No se altera ningún registro, importación, colección ni preferencia personal.
