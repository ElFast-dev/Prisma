# Tareas: extraer el kernel numérico Ridge

- [x] RK1. Extraer escalado, vectorización, kernel, Cholesky, entrenamiento y predicción a `js/recommendations/ridge-kernel.js`.
- [x] RK2. Mantener la fábrica pública del experimento y todas las fórmulas; importar las rutinas numéricas desde el módulo puro.
- [x] RK3. Sincronizar URLs versionadas en app, ridge-evaluation, service worker y precaché.
- [x] RK4. Añadir una regresión con pesos, kernel, coeficientes y predicciones deterministas; añadir el módulo a las pruebas de arquitectura/caché.
- [x] RK5. Documentar la nueva responsabilidad y añadir el expediente SDD al validador.
- [x] RK6. Ejecutar calidad/SDD y la batería completa de regresiones Ridge, ranking, identidad, caché y arquitectura; corregir fallos.
- [x] RK7. Ejecutar Playwright sobre el mismo SHA aprobado por calidad.
- [x] RK8. Integrar y comprobar Pages sobre el SHA actual; archivar el expediente con evidencia.
## Evidencia de finalización

- Implementación integrada en `main`: `a1bf376436c4c2677a2eba8afb7da37f21fcc4de`.
- PR #103: https://github.com/ElFast-dev/Prisma/pull/103 (fusionado).
- Checks de PR #103 sobre el SHA probado `1425d4024a22c93d4684604f62c21786f0a71be9`: quality https://github.com/ElFast-dev/Prisma/actions/runs/39900148929; Playwright https://github.com/ElFast-dev/Prisma/actions/runs/39900148836.
- Release posterior a la integración, SHA `a1bf376436c4c2677a2eba8afb7da37f21fcc4de`: quality https://github.com/ElFast-dev/Prisma/actions/runs/39900358981; Playwright https://github.com/ElFast-dev/Prisma/actions/runs/39900379124; GitHub Pages https://github.com/ElFast-dev/Prisma/actions/runs/39900538529. Los tres finalizaron correctamente sobre el mismo SHA.
