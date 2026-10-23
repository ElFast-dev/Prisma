# Tareas completadas: Laboratorio no bloqueante

- [x] T1. Inspeccionar \`renderApp()\`, \`renderLab()\`, el motor leave-one-out, la evaluación del ranking y la diversidad.
- [x] T2. Reproducir el problema con 351 valoraciones y metadatos sintéticos enlazados en Playwright, mediante la navegación real de la aplicación.
- [x] T3. Registrar el tiempo hasta el encabezado en el commit previo y añadir medición por operación tras la corrección, sin datos personales en logs.
- [x] T4. Renderizar la vista inicial antes de iniciar el trabajo pesado.
- [x] T5. Añadir evaluaciones cooperativas asíncronas de MAE, ranking y normalización, manteniendo intactas las funciones síncronas y las fórmulas existentes.
- [x] T6. Reducir el lote de MAE a una valoración por cesión y exigir que el intervalo de latido principal sea inferior a 500 ms.
- [x] T7. Cachear y reutilizar el perfil/métricas, y no volver a ejecutar evaluaciones al copiar el informe.
- [x] T8. Invalidar tareas obsoletas al navegar o modificar estado/catálogo.
- [x] T9. Probar perfil vacío, 351 valoraciones, controles durante el cálculo, informe agregado, cancelación/reentrada y ausencia de cálculos duplicados.
- [x] T10. Comprobar equivalencia síncrona/asíncrona, sintaxis, modularidad, regresiones y coherencia de las URLs PWA.
- [x] T11. Integrar tras validaciones y verificar el SHA exacto de Quality/SDD, Playwright y GitHub Pages.
- [x] T12. Incorporar requisitos a la especificación vigente y archivar la propuesta.

## Evidencia

- PR #116: https://github.com/ElFast-dev/Prisma/pull/116.
- SHA final de \`main\` y Pages: \`8ab7bf76051d965fa8b1ccb411b728995dbdd061\`.
- Quality/SDD: https://github.com/ElFast-dev/Prisma/actions/runs/40011167941 — éxito, 344 artefactos requeridos, 105 especificaciones con requisitos y escenarios, 54 módulos verificados.
- Playwright: https://github.com/ElFast-dev/Prisma/actions/runs/40011216659 — éxito; 351 registros sintéticos, perfil vacío, estado final \`ready\`, reporte v11 con 351 entradas/cobertura 1, cancelación/reentrada y mismos contadores de MAE/ranking/diversidad/buildProfile antes y después de copiar.
- Publicación Pages: https://github.com/ElFast-dev/Prisma/actions/runs/40012463841 — éxito; el log dice \`Approved SHA is the current main head\`, \`Publication SHA still matches main\` y \`Created deployment for 8ab7bf76051d965fa8b1ccb411b728995dbdd061\`.

## Medición de reproducción

En la ejecución Playwright final con los mismos datos sintéticos, la versión previa tardó 15.384 ms desde navegación hasta encabezado y registró cuatro pulsos del heartbeat durante la espera. La versión corregida mostró el encabezado en 138 ms y \`renderLab()\` tardó 6,2 ms. El MAE tardó 17.052,6 ms, la validación de ranking 208,2 ms y la diversidad 86,2 ms; la tubería completa tardó 17.428,8 ms, con 502 pulsos del heartbeat y máximo intervalo de 72,3 ms.

Estos tiempos pertenecen al runner de CI y sirven como comparación, no como garantía universal de hardware.

## Límites de datos

Las pruebas utilizaron exclusivamente datos sintéticos. No se leyó ni modificó historial personal, valoraciones, catálogo, IDs TMDB, fechas, colecciones ni almacenamiento personal. No se cambiaron los pesos ni las recomendaciones de producción.
