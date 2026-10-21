# Tareas: procedencia de fechas temporales

- [ ] DP1. Corregir la importación: `raw.a` solo es fecha de añadido y `watchedAt` requiere un campo explícito.
- [ ] DP2. Etiquetar fechas importadas explícitas y fechas generadas por una acción; conservar como desconocidas las fechas heredadas sin fuente.
- [ ] DP3. Preferir fechas explícitas al resolver cada identidad y clasificar las filas sin procedencia como exploratorias.
- [ ] DP4. Añadir recuentos agregados de procedencia a la interfaz y al informe v6.
- [ ] DP5. Probar importación, mezcla, precedencia, recuentos y privacidad.
- [ ] DP6. Actualizar documentación, caché PWA, CI y contratos Playwright.
- [ ] DP7. Validar el PR, fusionar, comprobar el despliegue y archivar el expediente.

## Criterios de aceptación

- `raw.a` no puede por sí mismo crear `watchedAt`.
- Un timestamp heredado sin marcador no se trata como fecha explícita.
- Si una valoración tiene una fecha heredada y su historial una fecha explícita, prevalece la explícita.
- Los recuentos de procedencia suman las filas evaluables y no exponen fechas ni películas.
- Los resultados con timestamps de procedencia no verificable se etiquetan como exploratorios.
- No se migran silenciosamente los datos personales ni cambia el recomendador activo.
