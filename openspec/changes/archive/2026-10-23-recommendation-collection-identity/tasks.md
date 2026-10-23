# Tareas completadas: identidad contextual de las colecciones en recomendaciones

- [x] Inspeccionar las reglas actuales de identidad, colección y ranking.
- [x] Propagar el año fiable de la candidata a la comprobación de colección.
- [x] Añadir regresiones para filas heredadas sin ID TMDB y remakes de otro año.
- [x] Preservar prioridad del ID TMDB y la resolución conservadora de coincidencias heredadas.
- [x] Actualizar las especificaciones permanentes y el versionado PWA.
- [x] Revalidar ambas mejoras juntas: perfil vacío e identidad contextual por año.
- [x] Ejecutar quality/SDD y regresiones con la rama combinada.
- [x] Ejecutar Playwright sobre la misma revisión combinada comprobada por quality.
- [x] Integrar, verificar GitHub Pages sobre el SHA vigente de `main` y archivar el expediente.

## Criterios de aceptación

- El ID TMDB sigue siendo la identidad preferente cuando está disponible en ambos lados.
- Una candidata se excluye si corresponde a una película guardada aunque la fila heredada carezca de ID y título/año coincidan sin ambigüedad.
- Dos películas con el mismo título pero años fiables diferentes no se fusionan solo por compartir título.
- No se modifican valoraciones, fechas, pesos del modelo ni datos personales persistidos.

## Evidencia del release

- PR funcional: https://github.com/ElFast-dev/Prisma/pull/109.
- SHA de `main` validado y publicado: `b51ba1e2e737b26b984315944fe0dd6120d32bee`.
- Quality/SDD post-merge: https://github.com/ElFast-dev/Prisma/actions/runs/39909955218 (éxito).
- Playwright post-merge sobre el mismo SHA: https://github.com/ElFast-dev/Prisma/actions/runs/39909986757 (éxito).
- GitHub Pages: https://github.com/ElFast-dev/Prisma/actions/runs/39910147562 (éxito); se aprobó y desplegó exactamente `b51ba1e2e737b26b984315944fe0dd6120d32bee`.
- Las comprobaciones previas al merge sobre la revisión combinada también pasaron: quality/SDD https://github.com/ElFast-dev/Prisma/actions/runs/39909782744 y Playwright https://github.com/ElFast-dev/Prisma/actions/runs/39909782830.

