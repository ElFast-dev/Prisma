# Propuesta: diagnóstico automático integral del Laboratorio

## Motivación
El Laboratorio ya calculaba métricas iniciales, mientras que normalización, Ridge y el análisis temporal dependían de acciones separadas. Esto fragmentaba el flujo, ocultaba el progreso global y exigía recopilar manualmente resultados para la auditoría matemática.

## Alcance
- Coordinar siete fases: cobertura, línea base, ranking, normalización, Ridge, tiempo y familias de características.
- Exponer estados finales explícitos, progreso real, duraciones y estimación basada en mediciones.
- Ejecutar los cálculos localmente en lotes cooperativos, cancelar resultados obsoletos y reutilizar caché.
- Entregar un único informe JSON agregado con privacidad por defecto.
- Documentar y probar perfiles vacíos, pequeños y sintéticos de al menos 351 películas.

## Fuera de alcance
- Cambiar el recomendador de producción, las valoraciones, el catálogo, las colecciones o las fechas almacenadas.
- Enviar datos del perfil a servicios remotos o incluir historial individual en el informe.
- Tratar fechas de incorporación a una lista como fechas reales de visionado.
- Convertir comparaciones descriptivas de un solo perfil en pruebas de significación estadística.

## Criterios de aceptación
1. La entrada al Laboratorio inicia automáticamente la batería completa.
2. Cada fase finaliza como completada, no disponible, cancelada o error; una fase no bloquea las independientes.
3. El progreso procede de unidades reales; la ETA se basa en mediciones y puede indicar que aún se está calculando.
4. El informe único no se habilita hasta que todas las fases alcanzan estado final y no transmite datos.
5. Las cuatro familias comparan exactamente la misma muestra retenida y pliegues, sin usar notas de prueba para entrenar.
6. La caché se reutiliza únicamente mientras la versión de los datos del perfil siga siendo válida.
7. CI verifica código, contrato SDD, privacidad y datos sintéticos; no importa valoraciones reales.
