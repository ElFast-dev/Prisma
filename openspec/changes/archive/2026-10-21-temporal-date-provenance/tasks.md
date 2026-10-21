# Tareas: procedencia de fechas temporales

- [x] DP1. Corregir la importación: `raw.a` solo es fecha de añadido y `watchedAt` requiere un campo explícito.
- [x] DP2. Etiquetar fechas importadas explícitas y fechas generadas por una acción; conservar como desconocidas las fechas heredadas sin fuente.
- [x] DP3. Preferir fechas explícitas al resolver cada identidad y clasificar las filas sin procedencia como exploratorias.
- [x] DP4. Añadir recuentos agregados de procedencia a la interfaz y al informe v6.
- [x] DP5. Probar importación, mezcla, precedencia, recuentos y privacidad.
- [x] DP6. Actualizar documentación, caché PWA, CI y contratos Playwright.
- [x] DP7. Validar el PR, fusionar, comprobar el despliegue y archivar el expediente.

## Criterios de aceptación

- `raw.a` no puede por sí mismo crear `watchedAt`.
- Un timestamp heredado sin marcador no se trata como fecha explícita.
- Si una valoración tiene una fecha heredada y su historial una fecha explícita, prevalece la explícita.
- Los recuentos de procedencia suman las filas evaluables y no exponen fechas ni películas.
- Los resultados con timestamps de procedencia no verificable se etiquetan como exploratorios.
- No se migran silenciosamente los datos personales ni cambia el recomendador activo.

## Evidencia de cierre

- Implementación, pruebas y revisión: [PR #55](https://github.com/ElFast-dev/Prisma/pull/55).
- Validación del PR: [Validate Prisma](https://github.com/ElFast-dev/Prisma/actions/runs/39666811121).
- SDD y calidad estática del PR: [SDD and static quality](https://github.com/ElFast-dev/Prisma/actions/runs/39666811114).
- Playwright del código integrado: [Prisma UI screenshots](https://github.com/ElFast-dev/Prisma/actions/runs/39666490735).
- Validación de `main`: [Validate Prisma](https://github.com/ElFast-dev/Prisma/actions/runs/39666936950).
- SDD y calidad estática de `main`: [SDD and static quality](https://github.com/ElFast-dev/Prisma/actions/runs/39666937136).
- Despliegue de GitHub Pages: [Deploy Prisma to GitHub Pages](https://github.com/ElFast-dev/Prisma/actions/runs/39666936879).
- Verificación Playwright después de publicar: [Prisma UI screenshots](https://github.com/ElFast-dev/Prisma/actions/runs/39667006193).

## Resultado y límites

El importador ya no convierte la fecha de añadido `raw.a` en fecha de visionado. Solo trata `watchedAt` o `watched_at` explícitos como procedencia importada explícitamente; las fechas creadas al registrar acciones se identifican separadamente y los datos antiguos sin marcador se evalúan como exploratorios. Al enlazar el historial, una fecha explícita puede prevalecer sobre un timestamp heredado. La interfaz y el informe v6 exponen recuentos agregados de fechas explícitas, no verificadas y ausentes, sin fechas concretas ni identidades de películas.

El marcador de procedencia no certifica que una fuente externa haya fechado correctamente el visionado. Las métricas temporales v5 anteriores deben interpretarse como exploratorias hasta volver a ejecutar la evaluación con la nueva clasificación. Ridge sigue siendo experimental y el recomendador activo continúa siendo aditivo.
