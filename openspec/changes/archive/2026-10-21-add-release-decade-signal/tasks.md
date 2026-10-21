# Tareas: señal de década

- [x] R1. Añadir la propuesta, el diseño y el delta SDD antes de modificar la lógica.
- [x] R2. Extraer década válida de los metadatos existentes y ponderarla por debajo de género y etiqueta.
- [x] R3. Añadir la evaluación leave-one-out por ablación con las mismas muestras y umbral mínimo de cinco años válidos.
- [x] R4. Mostrar el resultado de la ablación en Laboratorio sin presentar muestras insuficientes como una métrica.
- [x] R5. Añadir pruebas sintéticas para año, ausencia de metadatos, ponderación, efecto evaluado, identidad TMDB, muestra mínima y límites del MAE.
- [x] R6. Actualizar requisitos permanentes, documentación del producto, pruebas SDD y versión de caché PWA.
- [x] R7. Ejecutar y revisar correctamente todos los checks relevantes de GitHub Actions antes de archivar el expediente.

## Evidencia de verificación

- SDD, sintaxis y pruebas funcionales (incluidas características de década y fecha válida): correcto, [workflow 39541105744](https://github.com/ElFast-dev/Prisma/actions/runs/39541105744).
- Validación del despliegue/manifest: correcta, [workflow 39541105663](https://github.com/ElFast-dev/Prisma/actions/runs/39541105663).
- Flujos de navegador y capturas de escritorio/móvil: correctos, [workflow 39541105609](https://github.com/ElFast-dev/Prisma/actions/runs/39541105609).

## Cierre y límites

Las pruebas sintéticas comprueban la extracción de años, la ponderación y la ablación en escenarios controlados; no demuestran que la década mejore el gusto de una persona concreta. El MAE del Laboratorio mide error de predicción de notas, no la calidad completa del ranking. La señal no ajusta automáticamente sus pesos y solo se evalúa por separado con al menos cinco películas valoradas con año válido.