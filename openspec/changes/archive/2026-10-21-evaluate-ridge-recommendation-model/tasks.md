# Tareas: experimento Ridge en el Laboratorio

- [x] R1. Inspeccionar motor, pruebas, informe diagnóstico, eventos y caché PWA.
- [x] R2. Definir validación cruzada anidada y selección de alpha antes de implementar.
- [x] R3. Añadir módulo Ridge puro con solver numérico y pruebas sintéticas.
- [x] R4. Comparar Ridge y modelo aditivo en los mismos cinco pliegues externos.
- [x] R5. Añadir un control de ejecución explícita y resultados agregados en el Laboratorio.
- [x] R6. Incluir resultados Ridge en el informe diagnóstico solo si la prueba se ejecutó.
- [x] R7. Probar determinismo, identidad, muestra insuficiente, clipping, falta de fuga y privacidad.
- [x] R8. Actualizar especificaciones, arquitectura, validador SDD y caché PWA.
- [x] R9. Ejecutar pruebas de lógica, modularidad, caché y navegador.
- [x] R10. Fusionar, desplegar, verificar el sitio publicado y archivar el expediente.

## Criterios de aceptación

- Ridge utiliza regularización L2 positiva y un intercepto no penalizado.
- Alpha se escoge únicamente con pliegues internos del entrenamiento externo.
- Ambos modelos usan exactamente las mismas películas retenidas en la evaluación externa.
- No hay filas, títulos, IDs, fechas ni errores individuales en informes.
- No cambia la producción y no se persiste historial ni resultado del experimento.
- Menos de 30 valoraciones evaluables muestra estado no disponible.

## Evidencia de cierre

- PR #43 integrado en `main`: https://github.com/ElFast-dev/Prisma/pull/43
- Validación de la aplicación en el PR: https://github.com/ElFast-dev/Prisma/actions/runs/39630470508
- Calidad estática y SDD en el PR: https://github.com/ElFast-dev/Prisma/actions/runs/39630470515
- Playwright sobre el PR (desktop y móvil): https://github.com/ElFast-dev/Prisma/actions/runs/39630470793
- Validación de `main`: https://github.com/ElFast-dev/Prisma/actions/runs/39630741844
- Calidad/SDD de `main`: https://github.com/ElFast-dev/Prisma/actions/runs/39630742097
- Despliegue de GitHub Pages: https://github.com/ElFast-dev/Prisma/actions/runs/39630742124
- Playwright posterior al despliegue publicado: https://github.com/ElFast-dev/Prisma/actions/runs/39630809564

## Resultado y límites

Se añadió un experimento local de Ridge con cinco pliegues externos y selección de alpha mediante tres pliegues internos por entrenamiento. Las métricas Ridge y aditiva usan las mismas películas retenidas externas. Los tests automáticos usan datos sintéticos y no acceden al historial personal real; para conocer el resultado de las 348 valoraciones del perfil, hay que ejecutar el experimento desde el Laboratorio en el dispositivo del usuario.

El MAE y la diferencia son descriptivos, no prueban significación estadística ni garantizan satisfacción futura. Ridge permanece en modo diagnóstico y no altera las recomendaciones activas. El informe v2 incorpora únicamente métricas agregadas y recuentos de alpha seleccionados, no filas ni residuos por película.
